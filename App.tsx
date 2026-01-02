
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Role, Project, Task, Timesheet, TimesheetStatus, TimeOffRequest, TimesheetHistoryItem, Company } from './types';
import { TimesheetEditor } from './components/TimesheetEditor';
import { AdminView } from './components/AdminView';
import { ProjectManager } from './components/ProjectManager';
import { TimeOffView } from './components/TimeOffView';
import { ProfileEditor } from './components/ProfileEditor';
import { storageService } from './services/storage';
import { Login } from './components/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Clock, LogOut, CalendarDays, Menu, Briefcase, Loader2, Plane, Users, ChevronDown, Building2, LayoutGrid, Check, Settings2, Building, GitBranch } from 'lucide-react';

const addDays = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d)); 
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
};

const getSystemCurrentWeekStart = (): string => {
  const now = new Date();
  const day = now.getDay(); 
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
};

const CompanySelector = ({ companies, selectedId, onSelect }: { companies: Company[], selectedId: string, onSelect: (id: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedCompany = companies.find(c => c.id === selectedId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 bg-indigo-800/40 hover:bg-indigo-800/60 transition-all p-3 rounded-xl border border-indigo-700/50 group"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="bg-indigo-600 p-2 rounded-lg shrink-0 shadow-inner ring-1 ring-white/10 group-hover:scale-110 transition-transform">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div className="text-left overflow-hidden">
            <p className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Workspace</p>
            <p className="text-sm font-bold text-white truncate leading-tight">{selectedCompany?.name || 'Select Workspace'}</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-indigo-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden py-1 animate-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-2 border-b border-gray-50 mb-1">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Available Companies</p>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {companies.map(c => (
              <button
                key={c.id}
                onClick={() => { onSelect(c.id); setIsOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors hover:bg-indigo-50 group ${selectedId === c.id ? 'bg-indigo-50/50' : ''}`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`p-1.5 rounded-lg transition-colors ${selectedId === c.id ? 'bg-indigo-600' : 'bg-gray-100 group-hover:bg-indigo-200'}`}>
                    <Building2 className={`w-3.5 h-3.5 ${selectedId === c.id ? 'text-white' : 'text-gray-400 group-hover:text-indigo-600'}`} />
                  </div>
                  <span className={`font-semibold truncate ${selectedId === c.id ? 'text-indigo-900' : 'text-gray-600'}`}>{c.name}</span>
                </div>
                {selectedId === c.id && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardContent: React.FC = () => {
  const { user, signOut, updateLocalUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); 
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  
  const [currentView, setCurrentView] = useState<'timesheet' | 'admin' | 'projects' | 'organisation' | 'timeoff'>('timesheet');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(getSystemCurrentWeekStart());

  // Derive current role for active workspace
  const activeRole = useMemo(() => {
    return user?.companies?.find(c => c.company_id === selectedCompanyId)?.role || Role.EMPLOYEE;
  }, [user, selectedCompanyId]);

  useEffect(() => {
    const initCompanies = async () => {
      const data = await storageService.loadAllData();
      setCompanies(data.companies || []);
      if (data.companies?.length > 0) setSelectedCompanyId(data.companies[0].id);
    };
    initCompanies();
  }, []);

  useEffect(() => {
    if (!selectedCompanyId) return;
    const loadCompanyData = async () => {
      setLoading(true);
      const data = await storageService.loadAllData(selectedCompanyId);
      setProjects(data.projects);
      setTasks(data.tasks);
      setTimesheets(data.timesheets);
      setAllUsers(data.users);
      setTimeOffRequests(data.timeOffRequests || []);
      setLoading(false);
    };
    loadCompanyData();
  }, [selectedCompanyId]);

  useEffect(() => {
    if (!loading && user && selectedCompanyId) {
        const existing = timesheets.find(t => t.userId === user.id && t.weekStartDate === currentWeekStart && t.companyId === selectedCompanyId);
        if (!existing) {
            const newSheet: Timesheet = {
                id: `ts-${Date.now()}`, userId: user.id, companyId: selectedCompanyId, weekStartDate: currentWeekStart, status: TimesheetStatus.DRAFT, entries: [], totalHours: 0,
                history: [{ timestamp: new Date().toISOString(), action: 'CREATED', actorName: user.name, note: 'Auto-created' }]
            };
            setTimesheets(prev => [...prev, newSheet]);
            storageService.saveTimesheet(newSheet);
        }
    }
  }, [user, timesheets, currentWeekStart, loading, selectedCompanyId]);

  const addHistoryEntry = (sheet: Timesheet, action: TimesheetHistoryItem['action'], actorName: string, note?: string): Timesheet => {
      return { ...sheet, history: [...(sheet.history || []), { timestamp: new Date().toISOString(), action, actorName, note }] };
  };

  const handleSaveTimesheet = (updated: Timesheet) => {
    setTimesheets(prev => prev.map(t => t.id === updated.id ? updated : t));
    storageService.saveTimesheet(updated);
  };

  const handleSubmitTimesheet = (updated: Timesheet) => {
    let final = { ...updated, status: TimesheetStatus.SUBMITTED };
    if (user) final = addHistoryEntry(final, 'SUBMITTED', user.name, 'Submitted for approval');
    setTimesheets(prev => prev.map(t => t.id === final.id ? final : t));
    storageService.saveTimesheet(final);
  };

  const handleApprove = (id: string) => {
    const sheet = timesheets.find(t => t.id === id);
    if (sheet && user) {
      let updated = { ...sheet, status: TimesheetStatus.APPROVED };
      updated = addHistoryEntry(updated, 'APPROVED', user.name);
      setTimesheets(prev => prev.map(t => t.id === id ? updated : t));
      storageService.saveTimesheet(updated);
    }
  };

  const handleReject = (id: string) => {
    const sheet = timesheets.find(t => t.id === id);
    if (sheet && user) {
      let updated = { ...sheet, status: TimesheetStatus.REJECTED };
      updated = addHistoryEntry(updated, 'REJECTED', user.name);
      setTimesheets(prev => prev.map(t => t.id === id ? updated : t));
      storageService.saveTimesheet(updated);
    }
  };

  const handleReopen = (id: string) => {
      if(!confirm("Are you sure you want to reopen this timesheet? It will return to DRAFT status.")) return;
      const sheet = timesheets.find(t => t.id === id);
      if (sheet && user) {
          let updated = { ...sheet, status: TimesheetStatus.DRAFT };
          updated = addHistoryEntry(updated, 'REOPENED', user.name, 'Reopened for editing');
          setTimesheets(prev => prev.map(t => t.id === id ? updated : t));
          storageService.saveTimesheet(updated);
      }
  };

  const handleUpdateUser = async (u: User) => {
      setAllUsers(prev => prev.map(old => old.id === u.id ? u : old));
      await storageService.saveUser(u);
  };

  const handleWeekChange = (direction: 'prev' | 'next' | 'current', date?: string) => {
    if (direction === 'current' && date) {
      const [y, m, d] = date.split('-').map(Number);
      const selected = new Date(Date.UTC(y, m - 1, d));
      const day = selected.getUTCDay(); 
      const diff = selected.getUTCDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(selected); monday.setUTCDate(diff);
      setCurrentWeekStart(monday.toISOString().split('T')[0]);
    } else {
      setCurrentWeekStart(prev => addDays(prev, direction === 'next' ? 7 : -7));
    }
  };

  const handleCopyPrevious = () => {
    const previous = timesheets.filter(t => t.userId === user?.id && t.weekStartDate < currentWeekStart && t.companyId === selectedCompanyId).sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))[0];
    const current = timesheets.find(t => t.userId === user?.id && t.weekStartDate === currentWeekStart && t.companyId === selectedCompanyId);
    if (!previous || !current) return alert("Nothing to copy.");
    const newEntries = JSON.parse(JSON.stringify(previous.entries)).map((e: any) => ({ ...e, id: Math.random().toString(36).substr(2, 9) }));
    const updated = { ...current, entries: [...(current.entries || []), ...newEntries], totalHours: current.totalHours + previous.totalHours };
    setTimesheets(prev => prev.map(t => t.id === updated.id ? updated : t));
    storageService.saveTimesheet(updated);
  };

  const handleTaskAction = async (action: 'add' | 'delete' | 'update', data: any) => {
    if (action === 'add') {
      const t: Task = { 
        id: `t-${Date.now()}`, 
        name: data.name, 
        projectId: data.projectId, 
        companyId: selectedCompanyId, 
        assignedUserIds: [],
        assignedDepartmentIds: [],
        assignedTeamIds: []
      };
      setTasks(prev => [...prev, t]);
      await storageService.saveTask(t);
    } else if (action === 'delete') {
      setTasks(prev => prev.filter(t => t.id !== data.id));
      await storageService.deleteTask(data.id);
    } else if (action === 'update') {
      setTasks(prev => prev.map(t => t.id === data.id ? data : t));
      await storageService.saveTask(data);
    }
  };

  const canAccessSetup = activeRole === Role.ADMIN || activeRole === Role.MANAGER;
  const canAccessTeamDashboard = activeRole === Role.ADMIN || activeRole === Role.MANAGER;

  if (!user) return null;

  const activeTimesheet = timesheets.find(t => t.userId === user.id && t.weekStartDate === currentWeekStart && t.companyId === selectedCompanyId);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      <div className="md:hidden bg-indigo-900 text-white p-4 flex justify-between items-center z-20 sticky top-0">
          <div className="flex items-center gap-2 font-bold text-lg"><Clock className="w-6 h-6 text-indigo-300" /> TimeAudit</div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><Menu className="w-6 h-6" /></button>
      </div>

      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-indigo-900 text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-indigo-800 space-y-4">
           <div className="flex items-center gap-3">
             <div className="bg-indigo-700 p-2 rounded-lg shadow-lg ring-1 ring-white/10"><Clock className="w-6 h-6 text-white" /></div>
             <span className="font-bold text-xl tracking-tight">TimeAudit</span>
           </div>
           
           <CompanySelector 
             companies={companies} 
             selectedId={selectedCompanyId} 
             onSelect={setSelectedCompanyId} 
           />
        </div>

        <div className="p-6">
            <div onClick={() => setIsProfileEditorOpen(true)} className="flex items-center gap-3 mb-8 bg-indigo-800/30 p-3 rounded-xl border border-indigo-700/50 cursor-pointer hover:bg-indigo-800/50 transition-colors group">
                <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-indigo-500/50 object-cover bg-gray-100 group-hover:border-indigo-400 transition-all" />
                <div className="overflow-hidden">
                    <p className="font-bold text-sm truncate text-white">{user.name}</p>
                    <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{activeRole}</p>
                </div>
            </div>

            <nav className="space-y-1">
                {canAccessTeamDashboard && (
                    <button onClick={() => { setCurrentView('admin'); setMobileMenuOpen(false); }} className={`w-full flex items-center justify-start gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${currentView === 'admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/20' : 'text-indigo-300 hover:bg-indigo-800/50 hover:text-white'}`}>
                        <LayoutGrid className="w-5 h-5" /> Team Dashboard
                    </button>
                )}
                <button onClick={() => { setCurrentView('timesheet'); setMobileMenuOpen(false); }} className={`w-full flex items-center justify-start gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${currentView === 'timesheet' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/20' : 'text-indigo-300 hover:bg-indigo-800/50 hover:text-white'}`}>
                    <CalendarDays className="w-5 h-5" /> My Timesheets
                </button>
                <button onClick={() => { setCurrentView('timeoff'); setMobileMenuOpen(false); }} className={`w-full flex items-center justify-start gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${currentView === 'timeoff' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/20' : 'text-indigo-300 hover:bg-indigo-800/50 hover:text-white'}`}>
                    <Plane className="w-5 h-5" /> Time Off Requests
                </button>
                {canAccessSetup && (
                    <>
                        <button onClick={() => { setCurrentView('projects'); setMobileMenuOpen(false); }} className={`w-full flex items-center justify-start gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${currentView === 'projects' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/20' : 'text-indigo-300 hover:bg-indigo-800/50 hover:text-white'}`}>
                            <Briefcase className="w-5 h-5" /> Projects
                        </button>
                        <button onClick={() => { setCurrentView('organisation'); setMobileMenuOpen(false); }} className={`w-full flex items-center justify-start gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${currentView === 'organisation' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/20' : 'text-indigo-300 hover:bg-indigo-800/50 hover:text-white'}`}>
                            <GitBranch className="w-5 h-5" /> Organisation
                        </button>
                    </>
                )}
            </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-indigo-950/50 border-t border-indigo-900/50">
            <button onClick={signOut} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 w-full justify-center bg-red-400/5 py-2 rounded-lg transition-colors"><LogOut className="w-3.5 h-3.5" /> Sign Out</button>
        </div>
      </aside>

      <main className="flex-1 p-0 md:p-6 overflow-hidden flex flex-col h-screen">
        <header className="mb-4 px-4 pt-4 md:px-0 md:pt-0 shrink-0">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                {currentView === 'admin' ? 'Team Dashboard' : 
                 currentView === 'projects' ? 'Projects' :
                 currentView === 'organisation' ? 'Organisation' :
                 currentView.replace('timesheet', 'My Timesheets').replace('timeoff', 'Time Off')}
            </h1>
        </header>

        <div className="flex-1 overflow-hidden">
            {currentView === 'timesheet' && activeTimesheet && <TimesheetEditor user={user} timesheet={activeTimesheet} projects={projects} tasks={tasks} weekStartDate={currentWeekStart} onSave={handleSaveTimesheet} onSubmit={handleSubmitTimesheet} onWeekChange={handleWeekChange} onCopyPrevious={handleCopyPrevious} onReopen={handleReopen} />}
            {currentView === 'admin' && <div className="h-full overflow-y-auto pr-2"><AdminView currentUser={user} activeRole={activeRole} timesheets={timesheets} projects={projects} tasks={tasks} users={allUsers} onApprove={handleApprove} onReject={handleReject} onUpdateUser={handleUpdateUser} /></div>}
            {currentView === 'projects' && <div className="h-full overflow-y-auto pr-2"><ProjectManager forcedTab="projects" projects={projects} tasks={tasks} users={allUsers} companyId={selectedCompanyId} onAdd={async p => { const newP = {...p, id: `p-${Date.now()}`, companyId: selectedCompanyId}; setProjects(prev => [...prev, newP]); await storageService.saveProject(newP); }} onUpdate={async p => { setProjects(prev => prev.map(o => o.id === p.id ? p : o)); await storageService.saveProject(p); }} onDelete={async id => { if(confirm('Delete?')) { setProjects(prev => prev.filter(p => p.id !== id)); await storageService.deleteProject(id); }} } onTaskAction={handleTaskAction} /></div>}
            {currentView === 'organisation' && <div className="h-full overflow-y-auto pr-2"><ProjectManager forcedTab="org" projects={projects} tasks={tasks} users={allUsers} companyId={selectedCompanyId} onAdd={async p => { const newP = {...p, id: `p-${Date.now()}`, companyId: selectedCompanyId}; setProjects(prev => [...prev, newP]); await storageService.saveProject(newP); }} onUpdate={async p => { setProjects(prev => prev.map(o => o.id === p.id ? p : o)); await storageService.saveProject(p); }} onDelete={async id => { if(confirm('Delete?')) { setProjects(prev => prev.filter(p => p.id !== id)); await storageService.deleteProject(id); }} } onTaskAction={handleTaskAction} /></div>}
            {currentView === 'timeoff' && <div className="h-full overflow-y-auto pr-2"><TimeOffView userId={user.id} requests={timeOffRequests} onCreate={async r => { const full = {...r, companyId: selectedCompanyId} as TimeOffRequest; setTimeOffRequests(prev => [...prev, full]); await storageService.saveTimeOffRequest(full); }} /></div>}
        </div>
      </main>

      {isProfileEditorOpen && <ProfileEditor user={user} onSave={async u => { await storageService.saveUser(u); updateLocalUser(u); }} onClose={() => setIsProfileEditorOpen(false)} />}
    </div>
  );
};

const App: React.FC = () => <AuthProvider><AuthWrapper /></AuthProvider>;
const AuthWrapper: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 text-indigo-600 animate-spin" /></div>;
  if (!user) return <Login />;
  return <DashboardContent />;
};
export default App;
