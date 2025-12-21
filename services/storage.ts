
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Project, Task, Timesheet, User, TimeOffRequest, Department, Team } from '../types';
import { MOCK_PROJECTS, MOCK_TASKS, MOCK_TIMESHEETS, MOCK_USERS } from '../constants';

// --- Storage Keys for LocalStorage ---
const LS_KEYS = {
  PROJECTS: 'repli_projects',
  TASKS: 'repli_tasks',
  TIMESHEETS: 'repli_timesheets',
  USERS: 'repli_users',
  TIMEOFF: 'repli_timeoff',
  DEPARTMENTS: 'repli_departments',
  TEAMS: 'repli_teams'
};

// --- Generic Helpers ---

const loadFromLS = <T>(key: string, defaultVal: T): T => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultVal;
};

const saveToLS = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- Service ---

export const storageService = {
  
  isCloudEnabled: () => isSupabaseConfigured(),

  // --- INITIAL LOAD ---
  loadAllData: async () => {
    // If Supabase is configured, try to fetch from it
    if (storageService.isCloudEnabled()) {
      try {
        console.log("⚡ Connecting to Supabase...");
        
        const [projectsRes, tasksRes, timesheetsRes, usersRes, timeOffRes, deptRes, teamRes, userTeamsRes] = await Promise.all([
          supabase.from('projects').select('*'),
          supabase.from('tasks').select('*'),
          supabase.from('timesheets').select('*'),
          supabase.from('users').select('*'),
          supabase.from('time_off_requests').select('*'),
          supabase.from('departments').select('*'),
          supabase.from('teams').select('*'),
          supabase.from('user_teams').select('*')
        ]);

        if (projectsRes.error) throw projectsRes.error;
        if (tasksRes.error) throw tasksRes.error;
        if (timesheetsRes.error) throw timesheetsRes.error;
        
        const projectData = (projectsRes.data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            clientName: p.client_name || p.clientName,
            color: p.color
        })) as Project[];

        const taskData = (tasksRes.data || []).map((t: any) => ({
            id: t.id,
            name: t.name,
            projectId: t.project_id || t.projectId, 
            assignedUserIds: t.assigned_user_ids || t.assignedUserIds
        })) as Task[];
        
        const timesheetData = (timesheetsRes.data || []).map((t: any) => ({
            id: t.id,
            userId: t.user_id || t.userId,
            weekStartDate: t.week_start_date || t.weekStartDate,
            status: t.status,
            entries: t.entries,
            totalHours: t.total_hours || t.totalHours
        })) as Timesheet[];
        
        // Process User Teams Map
        const userTeamsMap: Record<string, string[]> = {};
        (userTeamsRes.data || []).forEach((row: any) => {
           if (!userTeamsMap[row.user_id]) userTeamsMap[row.user_id] = [];
           userTeamsMap[row.user_id].push(row.team_id);
        });

        const userData = (usersRes.data || []).map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            avatar: u.avatar,
            managerId: u.manager_id,
            teamIds: userTeamsMap[u.id] || [], // Hydrate teams
            department: u.department,
            workPhone: u.work_phone,
            personalPhone: u.personal_phone,
            street: u.street,
            city: u.city,
            state: u.state,
            zip: u.zip,
            country: u.country
        })) as User[];
        
        const timeOffData = (timeOffRes.data || []).map((row: any) => ({
           id: row.id,
           userId: row.user_id,
           startDate: row.start_date,
           endDate: row.end_date,
           startTime: row.start_time,
           endTime: row.end_time,
           type: row.type,
           reason: row.reason,
           status: row.status,
           attachment: row.attachment,
           attachmentName: row.attachment_name
        })) as TimeOffRequest[];

        const departments = (deptRes.data || []).map((d: any) => ({
            id: d.id,
            name: d.name,
            managerId: d.manager_id
        })) as Department[];

        const teams = (teamRes.data || []).map((t: any) => ({
            id: t.id,
            name: t.name,
            departmentId: t.department_id,
            managerId: t.manager_id
        })) as Team[];

        return {
          projects: projectData.length ? projectData : MOCK_PROJECTS,
          tasks: taskData.length ? taskData : MOCK_TASKS,
          timesheets: timesheetData.length ? timesheetData : MOCK_TIMESHEETS,
          users: userData && userData.length > 0 ? userData : MOCK_USERS,
          timeOffRequests: timeOffData,
          departments,
          teams
        };
      } catch (error) {
        console.error("Error loading from Supabase:", error);
      }
    }

    // Fallback to LocalStorage
    return {
      projects: loadFromLS<Project[]>(LS_KEYS.PROJECTS, MOCK_PROJECTS),
      tasks: loadFromLS<Task[]>(LS_KEYS.TASKS, MOCK_TASKS),
      timesheets: loadFromLS<Timesheet[]>(LS_KEYS.TIMESHEETS, MOCK_TIMESHEETS),
      users: loadFromLS<User[]>(LS_KEYS.USERS, MOCK_USERS), 
      timeOffRequests: loadFromLS<TimeOffRequest[]>(LS_KEYS.TIMEOFF, []),
      departments: loadFromLS<Department[]>(LS_KEYS.DEPARTMENTS, []),
      teams: loadFromLS<Team[]>(LS_KEYS.TEAMS, [])
    };
  },

  // --- PROJECTS ---
  saveProject: async (project: Project) => {
    const projects = loadFromLS<Project[]>(LS_KEYS.PROJECTS, MOCK_PROJECTS);
    const updated = projects.some(p => p.id === project.id) 
      ? projects.map(p => p.id === project.id ? project : p)
      : [...projects, project];
    saveToLS(LS_KEYS.PROJECTS, updated);

    if (storageService.isCloudEnabled()) {
      await supabase.from('projects').upsert({
          id: project.id,
          name: project.name,
          client_name: project.clientName,
          color: project.color
      });
    }
  },

  deleteProject: async (projectId: string) => {
    const projects = loadFromLS<Project[]>(LS_KEYS.PROJECTS, MOCK_PROJECTS);
    saveToLS(LS_KEYS.PROJECTS, projects.filter(p => p.id !== projectId));

    if (storageService.isCloudEnabled()) {
      await supabase.from('projects').delete().eq('id', projectId);
    }
  },

  // --- TASKS ---
  saveTask: async (task: Task) => {
    const tasks = loadFromLS<Task[]>(LS_KEYS.TASKS, MOCK_TASKS);
    const updated = tasks.some(t => t.id === task.id)
      ? tasks.map(t => t.id === task.id ? task : t)
      : [...tasks, task];
    saveToLS(LS_KEYS.TASKS, updated);

    if (storageService.isCloudEnabled()) {
      await supabase.from('tasks').upsert({
          id: task.id,
          name: task.name,
          project_id: task.projectId,
          assigned_user_ids: task.assignedUserIds
      });
    }
  },

  deleteTask: async (taskId: string) => {
    const tasks = loadFromLS<Task[]>(LS_KEYS.TASKS, MOCK_TASKS);
    saveToLS(LS_KEYS.TASKS, tasks.filter(t => t.id !== taskId));

    if (storageService.isCloudEnabled()) {
      await supabase.from('tasks').delete().eq('id', taskId);
    }
  },

  // --- USERS ---
  saveUser: async (user: User) => {
     // Local Storage
     const users = loadFromLS<User[]>(LS_KEYS.USERS, MOCK_USERS);
     const updated = users.some(u => u.id === user.id)
       ? users.map(u => u.id === user.id ? user : u)
       : [...users, user];
     saveToLS(LS_KEYS.USERS, updated);

     if (storageService.isCloudEnabled()) {
         // Update basic profile
         const { error } = await supabase.from('users').upsert({
             id: user.id,
             name: user.name,
             email: user.email,
             role: user.role,
             avatar: user.avatar,
             manager_id: user.managerId || null,
             department: user.department || null,
             work_phone: user.workPhone || null,
             personal_phone: user.personalPhone || null,
             street: user.street || null,
             city: user.city || null,
             state: user.state || null,
             zip: user.zip || null,
             country: user.country || null
         });

         if (error) return error;

         // Sync User Teams (Delete old, insert new)
         await supabase.from('user_teams').delete().eq('user_id', user.id);
         if (user.teamIds && user.teamIds.length > 0) {
            const teamRows = user.teamIds.map(tid => ({ user_id: user.id, team_id: tid }));
            await supabase.from('user_teams').insert(teamRows);
         }
     }
     return null;
  },

  // --- TIMESHEETS ---
  saveTimesheet: async (timesheet: Timesheet) => {
    const sheets = loadFromLS<Timesheet[]>(LS_KEYS.TIMESHEETS, MOCK_TIMESHEETS);
    const updated = sheets.some(t => t.id === timesheet.id)
      ? sheets.map(t => t.id === timesheet.id ? timesheet : t)
      : [...sheets, timesheet];
    saveToLS(LS_KEYS.TIMESHEETS, updated);

    if (storageService.isCloudEnabled()) {
      await supabase.from('timesheets').upsert({
          id: timesheet.id,
          user_id: timesheet.userId,
          week_start_date: timesheet.weekStartDate,
          status: timesheet.status,
          entries: timesheet.entries,
          total_hours: timesheet.totalHours
      });
    }
  },

  // --- TIME OFF ---
  saveTimeOffRequest: async (request: TimeOffRequest) => {
    const requests = loadFromLS<TimeOffRequest[]>(LS_KEYS.TIMEOFF, []);
    const updated = requests.some(r => r.id === request.id)
      ? requests.map(r => r.id === request.id ? request : r)
      : [...requests, request];
    saveToLS(LS_KEYS.TIMEOFF, updated);

    if (storageService.isCloudEnabled()) {
        await supabase.from('time_off_requests').upsert({
            id: request.id,
            user_id: request.userId,
            start_date: request.startDate,
            end_date: request.endDate,
            start_time: request.startTime,
            end_time: request.endTime,
            type: request.type,
            reason: request.reason,
            status: request.status,
            attachment: request.attachment,
            attachment_name: request.attachmentName
        });
    }
  },

  // --- DEPARTMENTS & TEAMS (New) ---
  saveDepartment: async (dept: Department) => {
      const depts = loadFromLS<Department[]>(LS_KEYS.DEPARTMENTS, []);
      const updated = depts.some(d => d.id === dept.id) ? depts.map(d => d.id === dept.id ? dept : d) : [...depts, dept];
      saveToLS(LS_KEYS.DEPARTMENTS, updated);
      
      if (storageService.isCloudEnabled()) {
          const { error } = await supabase.from('departments').upsert({ 
              id: dept.id, 
              name: dept.name, 
              manager_id: dept.managerId || null
          });
          if (error) console.error("Supabase Error saveDepartment:", error);
      }
  },
  
  deleteDepartment: async (id: string) => {
      const depts = loadFromLS<Department[]>(LS_KEYS.DEPARTMENTS, []);
      saveToLS(LS_KEYS.DEPARTMENTS, depts.filter(d => d.id !== id));
      if (storageService.isCloudEnabled()) {
          const { error } = await supabase.from('departments').delete().eq('id', id);
          if (error) console.error("Supabase Error deleteDepartment:", error);
      }
  },

  saveTeam: async (team: Team) => {
      const teams = loadFromLS<Team[]>(LS_KEYS.TEAMS, []);
      const updated = teams.some(t => t.id === team.id) ? teams.map(t => t.id === team.id ? team : t) : [...teams, team];
      saveToLS(LS_KEYS.TEAMS, updated);

      if (storageService.isCloudEnabled()) {
          const { error } = await supabase.from('teams').upsert({ 
              id: team.id, 
              name: team.name, 
              department_id: team.departmentId, 
              manager_id: team.managerId || null 
          });
          if (error) console.error("Supabase Error saveTeam:", error);
      }
  },

  deleteTeam: async (id: string) => {
      const teams = loadFromLS<Team[]>(LS_KEYS.TEAMS, []);
      saveToLS(LS_KEYS.TEAMS, teams.filter(t => t.id !== id));
      if (storageService.isCloudEnabled()) {
          const { error } = await supabase.from('teams').delete().eq('id', id);
          if (error) console.error("Supabase Error deleteTeam:", error);
      }
  }
};
