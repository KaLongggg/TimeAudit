
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Project, Task, Timesheet, User, TimeOffRequest } from '../types';
import { MOCK_PROJECTS, MOCK_TASKS, MOCK_TIMESHEETS, MOCK_USERS } from '../constants';

// --- Storage Keys for LocalStorage ---
const LS_KEYS = {
  PROJECTS: 'repli_projects',
  TASKS: 'repli_tasks',
  TIMESHEETS: 'repli_timesheets',
  USERS: 'repli_users',
  TIMEOFF: 'repli_timeoff'
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
        
        const [projectsRes, tasksRes, timesheetsRes, usersRes, timeOffRes] = await Promise.all([
          supabase.from('projects').select('*'),
          supabase.from('tasks').select('*'),
          supabase.from('timesheets').select('*'),
          supabase.from('users').select('*'),
          supabase.from('time_off_requests').select('*')
        ]);

        if (projectsRes.error) throw projectsRes.error;
        if (tasksRes.error) throw tasksRes.error;
        if (timesheetsRes.error) throw timesheetsRes.error;
        // timeOffRes.error might happen if table doesn't exist yet, handle gracefully

        // MAP DB (snake_case) -> APP (camelCase)
        
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
        
        const userData = (usersRes.data || []).map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            avatar: u.avatar,
            managerId: u.manager_id // Map DB column
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

        return {
          projects: projectData.length ? projectData : MOCK_PROJECTS,
          tasks: taskData.length ? taskData : MOCK_TASKS,
          timesheets: timesheetData.length ? timesheetData : MOCK_TIMESHEETS,
          users: userData && userData.length > 0 ? userData : MOCK_USERS,
          timeOffRequests: timeOffData
        };
      } catch (error) {
        console.error("Error loading from Supabase:", error);
        alert("Failed to load from Supabase. Check console for table schema errors or API keys. Falling back to local storage.");
      }
    }

    // Fallback to LocalStorage
    return {
      projects: loadFromLS<Project[]>(LS_KEYS.PROJECTS, MOCK_PROJECTS),
      tasks: loadFromLS<Task[]>(LS_KEYS.TASKS, MOCK_TASKS),
      timesheets: loadFromLS<Timesheet[]>(LS_KEYS.TIMESHEETS, MOCK_TIMESHEETS),
      users: MOCK_USERS, 
      timeOffRequests: loadFromLS<TimeOffRequest[]>(LS_KEYS.TIMEOFF, [])
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
     if (storageService.isCloudEnabled()) {
         await supabase.from('users').upsert({
             id: user.id,
             name: user.name,
             email: user.email,
             role: user.role,
             avatar: user.avatar,
             manager_id: user.managerId
         });
     }
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
    // 1. Local
    const requests = loadFromLS<TimeOffRequest[]>(LS_KEYS.TIMEOFF, []);
    const updated = requests.some(r => r.id === request.id)
      ? requests.map(r => r.id === request.id ? request : r)
      : [...requests, request];
    saveToLS(LS_KEYS.TIMEOFF, updated);

    // 2. Cloud
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
  }
};
