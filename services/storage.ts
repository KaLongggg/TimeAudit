
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Project, Task, Timesheet, User, TimeOffRequest, Department, Team, Company, Role } from '../types';

const LS_KEYS = {
  PROJECTS: 'repli_projects',
  TASKS: 'repli_tasks',
  TIMESHEETS: 'repli_timesheets',
  USERS: 'repli_users',
  TIMEOFF: 'repli_timeoff',
  DEPARTMENTS: 'repli_departments',
  TEAMS: 'repli_teams',
  COMPANIES: 'repli_companies'
};

const loadFromLS = <T>(key: string, defaultVal: T): T => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultVal;
};

const saveToLS = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const isValidUUID = (id: string | undefined): boolean => {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export const storageService = {
  isCloudEnabled: () => isSupabaseConfigured(),

  loadAllData: async (companyId?: string) => {
    if (storageService.isCloudEnabled()) {
      try {
        const query = companyId ? (q: any) => q.eq('company_id', companyId) : (q: any) => q;
        const [projectsRes, tasksRes, timesheetsRes, usersRes, rolesRes, timeOffRes, deptRes, teamRes, companiesRes] = await Promise.all([
          query(supabase.from('projects').select('*')),
          query(supabase.from('tasks').select('*')),
          query(supabase.from('timesheets').select('*')),
          supabase.from('users').select('*'),
          supabase.from('user_company_roles').select('*'),
          query(supabase.from('time_off_requests').select('*')),
          query(supabase.from('departments').select('*')),
          query(supabase.from('teams').select('*')),
          supabase.from('companies').select('*')
        ]);

        const projectData = (projectsRes.data || []).map((p: any) => ({
            id: p.id, name: p.name, clientName: p.client_name || p.clientName, color: p.color, companyId: p.company_id
        })) as Project[];

        const taskData = (tasksRes.data || []).map((t: any) => ({
            id: t.id, 
            name: t.name, 
            projectId: t.project_id || t.projectId, 
            companyId: t.company_id, 
            assignedUserIds: t.assigned_user_ids || [],
            assignedDepartmentIds: t.assigned_department_ids || [],
            assignedTeamIds: t.assigned_team_ids || []
        })) as Task[];
        
        const timesheetData = (timesheetsRes.data || []).map((t: any) => ({
            id: t.id, userId: t.user_id || t.userId, companyId: t.company_id, weekStartDate: t.week_start_date || t.weekStartDate, status: t.status, entries: t.entries, totalHours: t.total_hours || t.totalHours
        })) as Timesheet[];
        
        const rolesMap: Record<string, {company_id: string, role: Role}[]> = {};
        (rolesRes.data || []).forEach((r: any) => {
           if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
           rolesMap[r.user_id].push({ company_id: r.company_id, role: r.role as Role });
        });

        const userData = (usersRes.data || []).map((u: any) => ({
            id: u.id, name: u.name, email: u.email, avatar: u.avatar, managerId: u.manager_id, companies: rolesMap[u.id] || []
        })) as User[];
        
        const timeOffData = (timeOffRes.data || []).map((row: any) => ({
           id: row.id, userId: row.user_id, companyId: row.company_id, startDate: row.start_date, endDate: row.end_date, startTime: row.start_time, endTime: row.end_time, type: row.type, reason: row.reason, status: row.status, attachment: row.attachment, attachment_name: row.attachment_name
        })) as TimeOffRequest[];

        const departments = (deptRes.data || []).map((d: any) => ({
            id: d.id, name: d.name, managerIds: d.manager_ids || (d.manager_id ? [d.manager_id] : []), companyId: d.company_id
        })) as Department[];

        const teams = (teamRes.data || []).map((t: any) => ({
            id: t.id, name: t.name, departmentId: t.department_id, managerIds: t.manager_ids || (t.manager_id ? [t.manager_id] : []), companyId: t.company_id
        })) as Team[];

        const companies = (companiesRes.data || []).map((c: any) => ({
          id: c.id, name: c.name, logo_url: c.logo_url
        })) as Company[];

        return { projects: projectData, tasks: taskData, timesheets: timesheetData, users: userData, timeOffRequests: timeOffData, departments, teams, companies };
      } catch (error) { console.error("Cloud load error:", JSON.stringify(error, null, 2)); }
    }

    return {
      projects: companyId ? loadFromLS<Project[]>(LS_KEYS.PROJECTS, []).filter(p => p.companyId === companyId) : [],
      tasks: companyId ? loadFromLS<Task[]>(LS_KEYS.TASKS, []).filter(t => t.companyId === companyId) : [],
      timesheets: companyId ? loadFromLS<Timesheet[]>(LS_KEYS.TIMESHEETS, []).filter(ts => ts.companyId === companyId) : [],
      users: loadFromLS<User[]>(LS_KEYS.USERS, []), 
      timeOffRequests: companyId ? loadFromLS<TimeOffRequest[]>(LS_KEYS.TIMEOFF, []).filter(to => to.companyId === companyId) : [],
      departments: companyId ? loadFromLS<Department[]>(LS_KEYS.DEPARTMENTS, []).filter(d => d.companyId === companyId) : [],
      teams: companyId ? loadFromLS<Team[]>(LS_KEYS.TEAMS, []).filter(t => t.companyId === companyId) : [],
      companies: loadFromLS<Company[]>(LS_KEYS.COMPANIES, [{ id: '00000000-0000-0000-0000-000000000001', name: 'Default Co' }])
    };
  },

  saveTimesheet: async (timesheet: Timesheet) => {
    const sheets = loadFromLS<Timesheet[]>(LS_KEYS.TIMESHEETS, []);
    const updated = sheets.some(t => t.id === timesheet.id) ? sheets.map(t => t.id === timesheet.id ? timesheet : t) : [...sheets, timesheet];
    saveToLS(LS_KEYS.TIMESHEETS, updated);
    if (storageService.isCloudEnabled()) {
      const { error } = await supabase.from('timesheets').upsert({
          id: timesheet.id, user_id: timesheet.userId, company_id: timesheet.companyId, week_start_date: timesheet.weekStartDate, status: timesheet.status, entries: timesheet.entries, total_hours: timesheet.totalHours
      });
      if (error) console.error("Cloud timesheet save error:", JSON.stringify(error, null, 2));
      return { error };
    }
    return { error: null };
  },

  saveTimeOffRequest: async (request: TimeOffRequest) => {
    const requests = loadFromLS<TimeOffRequest[]>(LS_KEYS.TIMEOFF, []);
    const updated = requests.some(r => r.id === request.id) ? requests.map(r => r.id === request.id ? request : r) : [...requests, request];
    saveToLS(LS_KEYS.TIMEOFF, updated);
    if (storageService.isCloudEnabled()) {
        const { error } = await supabase.from('time_off_requests').upsert({
            id: request.id, user_id: request.userId, company_id: request.companyId, start_date: request.startDate, end_date: request.endDate,
            start_time: request.startTime, end_time: request.endTime, type: request.type, reason: request.reason, status: request.status,
            attachment: request.attachment, attachment_name: request.attachmentName
        });
        if (error) console.error("Cloud time-off save error:", JSON.stringify(error, null, 2));
        return { error };
    }
    return { error: null };
  },

  saveProject: async (p: Project) => {
    const projects = loadFromLS<Project[]>(LS_KEYS.PROJECTS, []);
    const updated = projects.some(x => x.id === p.id) ? projects.map(x => x.id === p.id ? p : x) : [...projects, p];
    saveToLS(LS_KEYS.PROJECTS, updated);
    if (storageService.isCloudEnabled()) {
        const { error } = await supabase.from('projects').upsert({ id: p.id, name: p.name, client_name: p.clientName, color: p.color, company_id: p.companyId });
        if (error) console.error("Cloud project save error:", JSON.stringify(error, null, 2));
        return { error };
    }
    return { error: null };
  },

  deleteProject: async (id: string) => {
    const projects = loadFromLS<Project[]>(LS_KEYS.PROJECTS, []);
    saveToLS(LS_KEYS.PROJECTS, projects.filter(p => p.id !== id));
    if (storageService.isCloudEnabled()) {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) console.error("Cloud project delete error:", JSON.stringify(error, null, 2));
      return { error };
    }
    return { error: null };
  },

  saveTask: async (t: Task) => {
    const tasks = loadFromLS<Task[]>(LS_KEYS.TASKS, []);
    const updated = tasks.some(x => x.id === t.id) ? tasks.map(x => x.id === t.id ? t : x) : [...tasks, t];
    saveToLS(LS_KEYS.TASKS, updated);
    if (storageService.isCloudEnabled()) {
      const { error } = await supabase.from('tasks').upsert({ 
        id: t.id, 
        name: t.name, 
        project_id: t.projectId, 
        company_id: t.companyId, 
        assigned_user_ids: t.assignedUserIds || [],
        assigned_department_ids: t.assignedDepartmentIds || [],
        assigned_team_ids: t.assignedTeamIds || []
      });
      if (error) console.error("Cloud task save error:", JSON.stringify(error, null, 2));
      return { error };
    }
    return { error: null };
  },

  deleteTask: async (taskId: string) => {
    const tasks = loadFromLS<Task[]>(LS_KEYS.TASKS, []);
    saveToLS(LS_KEYS.TASKS, tasks.filter(t => t.id !== taskId));
    if (storageService.isCloudEnabled()) {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) console.error("Cloud task delete error:", JSON.stringify(error, null, 2));
      return { error };
    }
    return { error: null };
  },

  saveDepartment: async (d: Department) => {
    const depts = loadFromLS<Department[]>(LS_KEYS.DEPARTMENTS, []);
    const updated = depts.some(x => x.id === d.id) ? depts.map(x => x.id === d.id ? d : x) : [...depts, d];
    
    if (storageService.isCloudEnabled()) {
        const payload: any = {
            name: d.name,
            manager_ids: (d.managerIds || []).filter(isValidUUID),
            company_id: isValidUUID(d.companyId) ? d.companyId : null
        };
        if (isValidUUID(d.id)) { payload.id = d.id; }

        const { error } = await supabase.from('departments').upsert(payload);
        if (error) {
            console.error("Cloud department save error:", JSON.stringify(error, null, 2));
            return { error };
        }
    }
    saveToLS(LS_KEYS.DEPARTMENTS, updated);
    return { error: null };
  },

  deleteDepartment: async (id: string) => {
    const depts = loadFromLS<Department[]>(LS_KEYS.DEPARTMENTS, []);
    saveToLS(LS_KEYS.DEPARTMENTS, depts.filter(d => d.id !== id));
    if (storageService.isCloudEnabled()) {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) console.error("Cloud department delete error:", JSON.stringify(error, null, 2));
      return { error };
    }
    return { error: null };
  },

  saveTeam: async (t: Team) => {
    const teams = loadFromLS<Team[]>(LS_KEYS.TEAMS, []);
    const updated = teams.some(x => x.id === t.id) ? teams.map(x => x.id === t.id ? t : x) : [...teams, t];

    if (storageService.isCloudEnabled()) {
        const payload: any = {
            name: t.name,
            department_id: isValidUUID(t.departmentId) ? t.departmentId : null,
            manager_ids: (t.managerIds || []).filter(isValidUUID),
            company_id: isValidUUID(t.companyId) ? t.companyId : null
        };
        if (isValidUUID(t.id)) { payload.id = t.id; }

        const { error } = await supabase.from('teams').upsert(payload);
        if (error) {
            console.error("Cloud team save error:", JSON.stringify(error, null, 2));
            return { error };
        }
    }
    saveToLS(LS_KEYS.TEAMS, updated);
    return { error: null };
  },

  deleteTeam: async (id: string) => {
    const teams = loadFromLS<Team[]>(LS_KEYS.TEAMS, []);
    saveToLS(LS_KEYS.TEAMS, teams.filter(t => t.id !== id));
    if (storageService.isCloudEnabled()) {
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) console.error("Cloud team delete error:", JSON.stringify(error, null, 2));
      return { error };
    }
    return { error: null };
  },

  saveUser: async (u: User) => {
    const users = loadFromLS<User[]>(LS_KEYS.USERS, []);
    const updated = users.some(x => x.id === u.id) ? users.map(x => x.id === u.id ? u : x) : [...users, u];
    saveToLS(LS_KEYS.USERS, updated);
    if (storageService.isCloudEnabled()) {
      const { error } = await supabase.from('users').upsert({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        manager_id: isValidUUID(u.managerId) ? u.managerId : null,
        department: u.department || null,
        work_phone: u.workPhone || null,
        personal_phone: u.personalPhone || null,
        street: u.street || null,
        city: u.city || null,
        state: u.state || null,
        zip: u.zip || null,
        country: u.country || null
      });
      if (error) console.error("Cloud user save error:", JSON.stringify(error, null, 2));
      return { error };
    }
    return { error: null };
  }
};
