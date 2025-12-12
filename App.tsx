
import React, { useState, useEffect } from 'react';
import { 
  MOCK_USERS // Keep for fallback if needed
} from './constants';
import { 
  User, 
  Role, 
  Project, 
  Task, 
  Timesheet, 
  TimesheetStatus,
  TimeEntry,
  TimeOffRequest
} from './types';
import { TimesheetEditor } from './components/TimesheetEditor';
import { AdminView } from './components/AdminView';
import { ProjectManager } from './components/ProjectManager';
import { TimeOffView } from './components/TimeOffView';
import { storageService } from './services/storage';
import { Login } from './components/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { 
  Clock, 
  LayoutDashboard, 
  LogOut, 
  CalendarDays,
  Menu,
  Briefcase,
  Wifi,
  WifiOff,
  Loader2,
  Plane
} from 'lucide-react';

// Helper to manipulate YYYY-MM-DD strings safely using UTC to avoid timezone issues
const addDays = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Construct UTC date to avoid DST/Timezone issues
  const date = new Date(Date.UTC(y, m - 1, d)); 
  date.setUTCDate(date.getUTCDate() + days);
  
  return date.toISOString().split('T')[0];
};

// Helper to get the current week's Monday based on Local System Time
const getSystemCurrentWeekStart = (): string => {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday
  // Calculate difference to get to Monday
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');
  
  return `${y}-${m}-${d}`;
};

// --- MAIN CONTENT COMPONENT (To separate Auth Logic) ---
const DashboardContent: React.FC = () => {
  const { user, signOut } = useAuth();
  
  // Global State
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); // For Admin View
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  
  // Navigation & View State
  const [currentView, setCurrentView] = useState<'timesheet' | 'admin' | 'projects' | 'timeoff'>('timesheet');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Date State for Timesheet View - Initialize with System Time
  const [currentWeekStart, setCurrentWeekStart] = useState(getSystemCurrentWeekStart());

  // Load Data
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      const data = await storageService.loadAllData();
      setProjects(data.projects);
      setTasks(data.tasks);
      setTimesheets(data.timesheets);
      setAllUsers(data.users);
      setTimeOffRequests(data.timeOffRequests || []);
      setLoading(false);
    };
    initData();
  }, []);

  // Ensure current user has a timesheet draft
  useEffect(() => {
    if (!loading && user) {
        // Find existing or create new for the selected week
        const existing = timesheets.find(t => t.userId === user.id && t.weekStartDate === currentWeekStart);
        
        if (!existing) {
            const newSheet: Timesheet = {
                id: `ts-${Date.now()}`,
                userId: user.id,
                weekStartDate: currentWeekStart,
                status: TimesheetStatus.DRAFT,
                entries: [],
                totalHours: 0
            };
            // Optimistic update
            setTimesheets(prev => [...prev, newSheet]);
            // Save to DB
            storageService.saveTimesheet(newSheet);
        }
    }
  }, [user, timesheets, currentWeekStart, loading]);

  const handleSaveTimesheet = (updated: Timesheet) => {
    setTimesheets(prev => prev.map(t => t.id === updated.id ? updated : t));
    storageService.saveTimesheet(updated);
  };

  const handleSubmitTimesheet = (updated: Timesheet) => {
    const final = { ...updated, status: TimesheetStatus.SUBMITTED };
    setTimesheets(prev => prev.map(t => t.id === final.id ? final : t));
    storageService.saveTimesheet(final);
    alert("Timesheet submitted for approval!");
  };

  const handleApprove = (id: string) => {
    const sheet = timesheets.find(t => t.id === id);
    if (sheet) {
      const updated = { ...sheet, status: TimesheetStatus.APPROVED };
      setTimesheets(prev => prev.map(t => t.id === id ? updated : t));
      storageService.saveTimesheet(updated);
    }
  };

  const handleReject = (id: string) => {
    const sheet = timesheets.find(t => t.id === id);
    if (sheet) {
      const updated = { ...sheet, status: TimesheetStatus.REJECTED };
      setTimesheets(prev => prev.map(t => t.id === id ? updated : t));
      storageService.saveTimesheet(updated);
    }
  };

  const handleUpdateUser = (updatedUser: User) => {
      setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      storageService.saveUser(updatedUser);
  };

  const handleWeekChange = (direction: 'prev' | 'next' | 'current', date?: string) => {
    if (direction === 'current' && date) {
      const [y, m, d] = date.split('-').map(Number);
      const selected = new Date(Date.UTC(y, m - 1, d));
      const day = selected.getUTCDay(); // 0 is Sunday
      const diff = selected.getUTCDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(selected);
      monday.setUTCDate(diff);
      setCurrentWeekStart(monday.toISOString().split('T')[0]);
    } else {
      const daysToAdd = direction === 'next' ? 7 : -7;
      setCurrentWeekStart(prev => addDays(prev, daysToAdd));
    }
  };

  const handleCopyPrevious = () => {
    if (!user) return;
    try {
      const previousSheets = timesheets
        .filter(t => t.userId === user.id && t.weekStartDate < currentWeekStart)
        .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));

      if (previousSheets.length === 0) {
        alert("No previous timesheets found to copy from.");
        return;
      }

      const sourceSheet = previousSheets[0];
      if (!sourceSheet.entries || sourceSheet.entries.length === 0) {
           alert("Previous timesheet found but it is empty.");
           return;
      }

      const currentSheet = timesheets.find(t => t.userId === user.id && t.weekStartDate === currentWeekStart);
      if (!currentSheet) {
         alert("Target timesheet not found. Please refresh.");
         return;
      }

      const clonedEntries = JSON.parse(JSON.stringify(sourceSheet.entries)) as TimeEntry[];
      const newEntries = clonedEntries.map(e => ({
        ...e,
        id: Math.random().toString(36).substr(2, 9),
      }));
      
      const updatedSheet = {
        ...currentSheet,
        entries: [...(currentSheet.entries || []), ...newEntries],
        totalHours: (currentSheet.totalHours || 0) + (sourceSheet.totalHours || 0)
      };
      
      setTimesheets(prev => prev.map(t => t.id === updatedSheet.id ? updatedSheet : t));
      storageService.saveTimesheet(updatedSheet);
      alert(`Successfully copied entries from week of ${sourceSheet.weekStartDate}.`); 

    } catch (error) {
      console.error("Copy failed", error);
      alert("Error copying timesheet.");
    }
  };

  // CRUD Handlers
  const handleAddProject = (projectData: Omit<Project, 'id'>) => {
    const newProject: Project = { ...projectData, id: `p-${Date.now()}` };
    setProjects(prev => [...prev, newProject]);
    storageService.saveProject(newProject);
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    storageService.saveProject(updatedProject);
  };

  const handleDeleteProject = (id: string) => {
    if (confirm('Delete project?')) {
      setProjects(prev => prev.filter(p => p.id !== id));
      setTasks(prev => prev.filter(t => t.projectId !== id));
      storageService.deleteProject(id);
      tasks.filter(t => t.projectId === id).forEach(t => storageService.deleteTask(t.id));
    }
  };

  const handleTaskAction = (action: 'add' | 'delete' | 'update', taskData: any) => {
    if (action === 'add') {
      const newTask: Task = { 
          id: `t-${Date.now()}`, 
          name: taskData.name, 
          projectId: taskData.projectId,
          assignedUserIds: [] // Default public
      };
      setTasks(prev => [...prev, newTask]);
      storageService.saveTask(newTask);
    } else if (action === 'delete') {
      setTasks(prev => prev.filter(t => t.id !== taskData.id));
      storageService.deleteTask(taskData.id);
    } else if (action === 'update') {
        setTasks(prev => prev.map(t => t.id === taskData.id ? taskData : t));
        storageService.saveTask(taskData);
    }
  };

  // Time Off Handlers
  const handleCreateTimeOff = (request: TimeOffRequest) => {
    setTimeOffRequests(prev => [...prev, request]);
    storageService.saveTimeOffRequest(request);
  };

  if (loading || !user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 text-indigo-600 gap-4">
        <Loader2 className="w-10 h-10 animate-spin" />
        <p className="font-medium animate-pulse">Loading Workspace...</p>
      </div>
    );
  }

  // Determine Active Timesheet
  const activeTimesheet = timesheets.find(t => t.userId === user.id && t.weekStartDate === currentWeekStart);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-indigo-900 text-white p-4 flex justify-between items-center shadow-md z-20 sticky top-0">
          <div className="flex items-center gap-2 font-bold text-lg">
              <Clock className="w-6 h-6 text-indigo-300" /> TimeAudit
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Menu className="w-6 h-6" />
          </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-indigo-900 text-white transform transition-transform duration-300 ease-in-out shadow-xl
        md:relative md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-indigo-800 hidden md:flex items-center gap-3">
           <div className="bg-indigo-700 p-2 rounded-lg">
             <Clock className="w-6 h-6 text-white" />
           </div>
           <span className="font-bold text-xl tracking-tight">TimeAudit</span>
        </div>

        <div className="p-6">
            <div className="flex items-center gap-3 mb-8 bg-indigo-800/50 p-3 rounded-xl border border-indigo-700">
                <img src={user.avatar || 'https://ui-avatars.com/api/?background=random'} alt="User" className="w-10 h-10 rounded-full border-2 border-indigo-500" />
                <div className="overflow-hidden">
                    <p className="font-medium text-sm truncate">{user.name}</p>
                    <p className="text-xs text-indigo-300 capitalize">{user.role.toLowerCase()}</p>
                </div>
            </div>

            <nav className="space-y-1">
                {user.role === Role.ADMIN && (
                    <button 
                        onClick={() => { setCurrentView('admin'); setMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${currentView === 'admin' ? 'bg-indigo-700 text-white' : 'text-indigo-300 hover:bg-indigo-800 hover:text-white'}`}
                    >
                        <LayoutDashboard className="w-5 h-5" /> Admin Dashboard
                    </button>
                )}
                
                <button 
                    onClick={() => { setCurrentView('timesheet'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${currentView === 'timesheet' ? 'bg-indigo-700 text-white' : 'text-indigo-300 hover:bg-indigo-800 hover:text-white'}`}
                >
                    <CalendarDays className="w-5 h-5" /> My Timesheets
                </button>

                <button 
                    onClick={() => { setCurrentView('timeoff'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${currentView === 'timeoff' ? 'bg-indigo-700 text-white' : 'text-indigo-300 hover:bg-indigo-800 hover:text-white'}`}
                >
                    <Plane className="w-5 h-5" /> Time Off
                </button>

                {user.role === Role.ADMIN && (
                    <button 
                        onClick={() => { setCurrentView('projects'); setMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${currentView === 'projects' ? 'bg-indigo-700 text-white' : 'text-indigo-300 hover:bg-indigo-800 hover:text-white'}`}
                    >
                        <Briefcase className="w-5 h-5" /> Projects
                    </button>
                )}
            </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-indigo-950 border-t border-indigo-900">
            <div className="mb-4 flex items-center gap-2 justify-center">
              {storageService.isCloudEnabled() ? (
                <span className="flex items-center gap-1.5 text-[10px] text-green-300 bg-green-900/30 px-2 py-1 rounded-full border border-green-800">
                  <Wifi className="w-3 h-3" /> Cloud Synced
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[10px] text-orange-300 bg-orange-900/30 px-2 py-1 rounded-full border border-orange-800">
                  <WifiOff className="w-3 h-3" /> Local Storage
                </span>
              )}
            </div>

            <button onClick={signOut} className="flex items-center gap-2 mt-2 text-xs text-red-300 hover:text-red-200 w-full justify-center bg-indigo-900/50 py-2 rounded">
                <LogOut className="w-4 h-4" /> Sign Out
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-0 md:p-6 overflow-hidden flex flex-col h-screen">
        <header className="mb-4 px-4 pt-4 md:px-0 md:pt-0 flex justify-between items-center shrink-0">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    {currentView === 'admin' && 'Administration'}
                    {currentView === 'timesheet' && 'My Timesheets'}
                    {currentView === 'projects' && 'Project Management'}
                    {currentView === 'timeoff' && 'Time Off Requests'}
                </h1>
            </div>
        </header>

        <div className="flex-1 overflow-hidden">
            {currentView === 'timesheet' && activeTimesheet && (
                <TimesheetEditor 
                    timesheet={activeTimesheet}
                    projects={projects}
                    tasks={tasks}
                    weekStartDate={currentWeekStart}
                    onSave={handleSaveTimesheet}
                    onSubmit={handleSubmitTimesheet}
                    onWeekChange={handleWeekChange}
                    onCopyPrevious={handleCopyPrevious}
                />
            )}

            {currentView === 'admin' && (
                <div className="h-full overflow-y-auto pr-2">
                    <AdminView 
                        timesheets={timesheets}
                        projects={projects}
                        users={allUsers}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onUpdateUser={handleUpdateUser}
                    />
                </div>
            )}

            {currentView === 'projects' && (
                 <div className="h-full overflow-y-auto pr-2">
                    <ProjectManager 
                        projects={projects}
                        tasks={tasks}
                        users={allUsers}
                        onAdd={handleAddProject}
                        onUpdate={handleUpdateProject}
                        onDelete={handleDeleteProject}
                        onTaskAction={handleTaskAction}
                    />
                </div>
            )}

            {currentView === 'timeoff' && (
                 <div className="h-full overflow-y-auto pr-2">
                    <TimeOffView 
                        userId={user.id}
                        requests={timeOffRequests}
                        onCreate={handleCreateTimeOff}
                    />
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

// --- APP WRAPPER FOR AUTH PROVIDER ---
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  );
};

// --- AUTH WRAPPER TO DECIDE VIEW ---
const AuthWrapper: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
     return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 text-indigo-600 gap-4">
            <Loader2 className="w-10 h-10 animate-spin" />
        </div>
     );
  }

  if (!user) {
    return <Login />;
  }

  return <DashboardContent />;
};

export default App;
