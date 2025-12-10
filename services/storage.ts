import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc,
  query
} from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig';
import { Project, Task, Timesheet, User } from '../types';
import { MOCK_PROJECTS, MOCK_TASKS, MOCK_TIMESHEETS, MOCK_USERS } from '../constants';

// Initialize Firebase only if configured
let db: any = null;
if (isFirebaseConfigured()) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("🔥 Firebase initialized successfully");
  } catch (e) {
    console.error("Firebase init failed:", e);
  }
}

// --- Storage Keys for LocalStorage ---
const LS_KEYS = {
  PROJECTS: 'repli_projects',
  TASKS: 'repli_tasks',
  TIMESHEETS: 'repli_timesheets',
  USERS: 'repli_users'
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
  
  isCloudEnabled: () => isFirebaseConfigured() && db !== null,

  // --- INITIAL LOAD ---
  loadAllData: async () => {
    // If Firebase is configured, try to fetch from it
    if (storageService.isCloudEnabled()) {
      try {
        const [projects, tasks, timesheets] = await Promise.all([
          getDocs(collection(db, 'projects')),
          getDocs(collection(db, 'tasks')),
          getDocs(collection(db, 'timesheets'))
        ]);

        const projectData = projects.docs.map(d => d.data() as Project);
        const taskData = tasks.docs.map(d => d.data() as Task);
        const timesheetData = timesheets.docs.map(d => d.data() as Timesheet);

        // If DB is empty, seed it with mock data? No, let's just return empty arrays or mocks if strictly empty
        // For better UX, if completely empty, we might want to return defaults, but let's assume real DB usage
        
        return {
          projects: projectData.length ? projectData : MOCK_PROJECTS,
          tasks: taskData.length ? taskData : MOCK_TASKS,
          timesheets: timesheetData.length ? timesheetData : MOCK_TIMESHEETS,
          users: MOCK_USERS // Users typically managed via Auth, keeping mock for now
        };
      } catch (error) {
        console.error("Error loading from Firebase:", error);
        alert("Failed to load from Cloud DB. Falling back to local storage.");
      }
    }

    // Fallback to LocalStorage
    return {
      projects: loadFromLS<Project[]>(LS_KEYS.PROJECTS, MOCK_PROJECTS),
      tasks: loadFromLS<Task[]>(LS_KEYS.TASKS, MOCK_TASKS),
      timesheets: loadFromLS<Timesheet[]>(LS_KEYS.TIMESHEETS, MOCK_TIMESHEETS),
      users: MOCK_USERS
    };
  },

  // --- PROJECTS ---
  saveProject: async (project: Project) => {
    // 1. Local
    const projects = loadFromLS<Project[]>(LS_KEYS.PROJECTS, MOCK_PROJECTS);
    const updated = projects.some(p => p.id === project.id) 
      ? projects.map(p => p.id === project.id ? project : p)
      : [...projects, project];
    saveToLS(LS_KEYS.PROJECTS, updated);

    // 2. Cloud
    if (storageService.isCloudEnabled()) {
      await setDoc(doc(db, 'projects', project.id), project);
    }
  },

  deleteProject: async (projectId: string) => {
    // 1. Local
    const projects = loadFromLS<Project[]>(LS_KEYS.PROJECTS, MOCK_PROJECTS);
    saveToLS(LS_KEYS.PROJECTS, projects.filter(p => p.id !== projectId));

    // 2. Cloud
    if (storageService.isCloudEnabled()) {
      await deleteDoc(doc(db, 'projects', projectId));
    }
  },

  // --- TASKS ---
  saveTask: async (task: Task) => {
    // 1. Local
    const tasks = loadFromLS<Task[]>(LS_KEYS.TASKS, MOCK_TASKS);
    const updated = tasks.some(t => t.id === task.id)
      ? tasks.map(t => t.id === task.id ? task : t)
      : [...tasks, task];
    saveToLS(LS_KEYS.TASKS, updated);

    // 2. Cloud
    if (storageService.isCloudEnabled()) {
      await setDoc(doc(db, 'tasks', task.id), task);
    }
  },

  deleteTask: async (taskId: string) => {
    const tasks = loadFromLS<Task[]>(LS_KEYS.TASKS, MOCK_TASKS);
    saveToLS(LS_KEYS.TASKS, tasks.filter(t => t.id !== taskId));

    if (storageService.isCloudEnabled()) {
      await deleteDoc(doc(db, 'tasks', taskId));
    }
  },

  // --- TIMESHEETS ---
  saveTimesheet: async (timesheet: Timesheet) => {
    // 1. Local
    const sheets = loadFromLS<Timesheet[]>(LS_KEYS.TIMESHEETS, MOCK_TIMESHEETS);
    const updated = sheets.some(t => t.id === timesheet.id)
      ? sheets.map(t => t.id === timesheet.id ? timesheet : t)
      : [...sheets, timesheet];
    saveToLS(LS_KEYS.TIMESHEETS, updated);

    // 2. Cloud
    if (storageService.isCloudEnabled()) {
      await setDoc(doc(db, 'timesheets', timesheet.id), timesheet);
    }
  }
};