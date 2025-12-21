
import React, { useState, useMemo, useEffect } from 'react';
import { Timesheet, Project, User, TimeOffRequest, TimeOffStatus, Role, Department, Team } from '../types';
import { CheckCircle, XCircle, Clock, Calendar, User as UserIcon, Paperclip, Users, Save, ChevronLeft, ChevronRight, Network, List, FileBarChart, Download, Eye, X, Edit2, Building, Phone, MapPin, Smartphone, Unlock, Plus, Trash2, Globe, Database, Award, GitBranch, Briefcase } from 'lucide-react';
import { DashboardStats } from './DashboardStats';
import { storageService } from '../services/storage';
import { TimesheetEditor } from './TimesheetEditor';
import { COUNTRY_CODES } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AdminViewProps {
  currentUser: User;
  timesheets: Timesheet[];
  projects: Project[];
  users: User[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onUpdateUser: (user: User) => void;
  onReopen?: (id: string) => void;
}

// --- Structural Hierarchy Graph Node ---
const StructuralNode: React.FC<{ 
    title: string; 
    subtitle?: string; 
    icon: React.ReactNode; 
    lead?: User; 
    count?: number; 
    colorClass?: string;
    children?: React.ReactNode;
}> = ({ title, subtitle, icon, lead, count, colorClass = "bg-white", children }) => {
    return (
        <div className="flex flex-col items-center">
            <div className={`flex flex-col p-4 ${colorClass} border border-gray-200 rounded-xl shadow-sm w-56 relative z-10 hover:shadow-md transition-all`}>
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-gray-50 rounded-lg text-indigo-600">
                        {icon}
                    </div>
                    <div className="overflow-hidden">
                        <h4 className="font-bold text-sm text-gray-900 truncate" title={title}>{title}</h4>
                        {subtitle && <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider truncate">{subtitle}</p>}
                    </div>
                </div>
                
                {lead ? (
                    <div className="flex items-center gap-2 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100/50 mb-2">
                        <img src={lead.avatar} className="w-6 h-6 rounded-full border border-white shadow-sm" alt={lead.name} />
                        <div className="overflow-hidden">
                            <p className="text-[10px] font-bold text-indigo-900 truncate">{lead.name}</p>
                            <p className="text-[8px] text-indigo-500 uppercase">Lead</p>
                        </div>
                    </div>
                ) : (
                    <div className="p-2 border border-dashed border-gray-200 rounded-lg mb-2 flex items-center justify-center">
                        <span className="text-[10px] text-gray-400 italic">No Lead Assigned</span>
                    </div>
                )}

                {count !== undefined && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <Users className="w-3 h-3" />
                        <span>{count} Member{count !== 1 ? 's' : ''}</span>
                    </div>
                )}
            </div>
            
            {children && (
                <div className="flex flex-col items-center">
                    <div className="h-8 w-px bg-gray-300"></div>
                    <div className="flex relative items-start gap-8">
                        {React.Children.map(children, (child, index) => {
                            const count = React.Children.count(children);
                            const isFirst = index === 0;
                            const isLast = index === count - 1;
                            const isOnly = count === 1;
                            return (
                                <div className="flex flex-col items-center relative">
                                    {!isOnly && (
                                        <>
                                            <div className={`absolute top-0 right-[50%] h-px bg-gray-300 ${isFirst ? 'w-0' : 'w-[calc(50%+1rem)]'}`}></div>
                                            <div className={`absolute top-0 left-[50%] h-px bg-gray-300 ${isLast ? 'w-0' : 'w-[calc(50%+1rem)]'}`}></div>
                                        </>
                                    )}
                                    <div className="h-8 w-px bg-gray-300"></div>
                                    {child}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Recursive Org Chart (User-based) ---
const OrgChartNode: React.FC<{ user: User; allUsers: User[]; visitedIds?: Set<string> }> = ({ user, allUsers, visitedIds = new Set() }) => {
    if (visitedIds.has(user.id)) {
        return (
            <div className="flex flex-col items-center p-2 bg-red-50 border border-red-200 rounded-lg shadow-sm w-48 relative z-10 opacity-80">
                <div className="flex items-center gap-1 text-red-600 mb-1">
                    <Network className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Loop Detected</span>
                </div>
                <div className="flex items-center gap-2 w-full justify-center opacity-50">
                    <img src={user.avatar} className="w-6 h-6 rounded-full grayscale" />
                    <span className="text-xs text-gray-500 truncate max-w-[100px]">{user.name}</span>
                </div>
            </div>
        );
    }

    const nextVisitedIds = new Set(visitedIds);
    nextVisitedIds.add(user.id);
    const directReports = allUsers.filter(u => u.managerId === user.id);
    
    return (
        <div className="flex flex-col items-center">
            <div className="flex flex-col items-center p-3 bg-white border border-gray-200 rounded-xl shadow-sm w-48 relative z-10 hover:shadow-md hover:border-indigo-300 transition-all cursor-default group shrink-0">
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                    <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover bg-gray-100" />
                    <div className="absolute -bottom-1 -right-1 bg-gray-100 rounded-full p-0.5 border border-white">
                        <UserIcon className="w-3 h-3 text-gray-600" />
                    </div>
                </div>
                <span className="font-bold text-sm text-gray-900 mt-2 truncate w-full text-center" title={user.name}>{user.name}</span>
                <span className="text-xs text-gray-500 truncate w-full text-center mb-1">{user.role}</span>
                <div className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">{directReports.length} Reports</div>
            </div>
            {directReports.length > 0 && (
                <div className="flex flex-col items-center animate-in fade-in duration-300">
                    <div className="h-8 w-px bg-gray-300"></div>
                    <div className="flex relative items-start gap-8">
                        {directReports.map((child, index) => {
                            const isFirst = index === 0;
                            const isLast = index === directReports.length - 1;
                            const isOnly = directReports.length === 1;
                            return (
                                <div key={child.id} className="flex flex-col items-center relative">
                                     {!isOnly && (<><div className={`absolute top-0 right-[50%] h-px bg-gray-300 ${isFirst ? 'w-0' : 'w-[calc(50%+1rem)]'}`}></div><div className={`absolute top-0 left-[50%] h-px bg-gray-300 ${isLast ? 'w-0' : 'w-[calc(50%+1rem)]'}`}></div></>)}
                                     <div className="h-8 w-px bg-gray-300"></div>
                                     <OrgChartNode user={child} allUsers={allUsers} visitedIds={nextVisitedIds} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Edit User Modal ---
const EditUserModal: React.FC<{ user: User; onClose: () => void; onSave: (e: React.FormEvent<HTMLFormElement>) => void; }> = ({ user, onClose, onSave }) => {
    const parsePhoneNumber = (phone: string | undefined) => {
      if (!phone) return { code: '+61', number: '' };
      const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
      const match = sortedCodes.find(c => phone.startsWith(c.code));
      if (match) return { code: match.code, number: phone.slice(match.code.length).trim() };
      return { code: '+61', number: phone };
    };
    const [workPhoneCode, setWorkPhoneCode] = useState(parsePhoneNumber(user.workPhone).code);
    const [personalPhoneCode, setPersonalPhoneCode] = useState(parsePhoneNumber(user.personalPhone).code);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                    <h3 className="font-bold text-gray-800">Edit User Details</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div className="overflow-y-auto p-6">
                  <form onSubmit={onSave} className="space-y-4">
                      <input type="hidden" name="workPhoneCode" value={workPhoneCode} />
                      <input type="hidden" name="personalPhoneCode" value={personalPhoneCode} />
                      <div className="flex justify-center mb-4"><img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-full border-4 border-gray-100 object-cover" /></div>
                      <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label><input name="name" type="text" defaultValue={user.name} className="w-full p-2 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white" required /></div>
                      <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label><input name="email" type="email" defaultValue={user.email} className="w-full p-2 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white" required /></div>
                      <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dept</label><input name="department" type="text" defaultValue={user.department} className="w-full p-2 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white" /></div>
                      <div className="grid grid-cols-1 gap-4">
                          <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Work Phone</label><div className="flex gap-2"><div className="relative w-[110px]"><select value={workPhoneCode} onChange={(e) => setWorkPhoneCode(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded-lg appearance-none bg-white text-gray-900">{COUNTRY_CODES.map(c => (<option key={c.code} value={c.code}>{c.flag} {c.code}</option>))}</select></div><div className="relative flex-1"><input name="workPhoneNumber" type="tel" defaultValue={parsePhoneNumber(user.workPhone).number} className="w-full p-2 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white" /></div></div></div>
                          <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mobile Phone</label><div className="flex gap-2"><div className="relative w-[110px]"><select value={personalPhoneCode} onChange={(e) => setPersonalPhoneCode(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded-lg appearance-none bg-white text-gray-900">{COUNTRY_CODES.map(c => (<option key={c.code} value={c.code}>{c.flag} {c.code}</option>))}</select></div><div className="relative flex-1"><input name="personalPhoneNumber" type="tel" defaultValue={parsePhoneNumber(user.personalPhone).number} className="w-full p-2 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white" /></div></div></div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-3">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
                          <input name="street" placeholder="Street" defaultValue={user.street} className="w-full p-2 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white" />
                          <div className="grid grid-cols-2 gap-3"><input name="city" placeholder="City" defaultValue={user.city} className="w-full p-2 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white" /><input name="state" placeholder="State" defaultValue={user.state} className="w-full p-2 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white" /></div>
                          <div className="grid grid-cols-2 gap-3"><input name="zip" placeholder="Zip" defaultValue={user.zip} className="w-full p-2 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white" /><input name="country" placeholder="Country" defaultValue={user.country} className="w-full p-2 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white" /></div>
                      </div>
                      <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Save</button>
                  </form>
                </div>
            </div>
        </div>
    );
};

export const AdminView: React.FC<AdminViewProps> = ({ currentUser, timesheets, projects, users, onApprove, onReject, onUpdateUser, onReopen }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'approvals' | 'timeoff' | 'history' | 'team' | 'org' | 'calendar'>('dashboard');
  
  const [localRequests, setLocalRequests] = useState<TimeOffRequest[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  
  const [teamViewMode, setTeamViewMode] = useState<'list' | 'chart'>('list');
  const [orgViewMode, setOrgViewMode] = useState<'management' | 'graph'>('management');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [newDeptName, setNewDeptName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  const [teamCalendarDate, setTeamCalendarDate] = useState(new Date());

  const [reportUser, setReportUser] = useState<string>(currentUser.id);
  const [reportStartDate, setReportStartDate] = useState(() => {
     const d = new Date();
     d.setMonth(d.getMonth() - 1);
     return d.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [viewingTimesheet, setViewingTimesheet] = useState<Timesheet | null>(null);

  useEffect(() => {
     const loadData = async () => {
         const data = await storageService.loadAllData();
         setLocalRequests(data.timeOffRequests || []);
         setDepartments(data.departments || []);
         setTeams(data.teams || []);
     };
     loadData();
  }, [activeTab]);

  const isGlobalAdmin = currentUser.role === Role.ADMIN;
  
  const managedUserIds = useMemo(() => {
      const ids = new Set<string>();
      users.filter(u => u.managerId === currentUser.id).forEach(u => ids.add(u.id));
      const myTeams = teams.filter(t => t.managerId === currentUser.id);
      myTeams.forEach(t => {
          users.filter(u => u.teamIds?.includes(t.id)).forEach(u => ids.add(u.id));
      });
      const myDepts = departments.filter(d => d.managerId === currentUser.id);
      myDepts.forEach(d => {
          const deptTeams = teams.filter(t => t.departmentId === d.id);
          deptTeams.forEach(t => {
               users.filter(u => u.teamIds?.includes(t.id)).forEach(u => ids.add(u.id));
          });
      });
      return ids;
  }, [users, teams, departments, currentUser]);

  const availableReportUsers = useMemo(() => {
     if (isGlobalAdmin) return users;
     return [currentUser, ...users.filter(u => managedUserIds.has(u.id))];
  }, [isGlobalAdmin, users, currentUser, managedUserIds]);

  const reportTimesheets = useMemo(() => {
      return timesheets.filter(t => 
          t.userId === reportUser && 
          t.weekStartDate >= reportStartDate && 
          t.weekStartDate <= reportEndDate
      ).sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
  }, [timesheets, reportUser, reportStartDate, reportEndDate]);

  const pendingTimesheets = timesheets.filter(t => 
    t.status === 'SUBMITTED' && 
    (isGlobalAdmin || managedUserIds.has(t.userId))
  );

  const pendingTimeOff = localRequests.filter(r => 
    r.status === TimeOffStatus.PENDING && 
    (isGlobalAdmin || managedUserIds.has(r.userId))
  );

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';
  const getUserAvatar = (id: string) => users.find(u => u.id === id)?.avatar || '';

  const handleTimeOffAction = async (request: TimeOffRequest, status: TimeOffStatus) => {
      const updated = { ...request, status };
      setLocalRequests(prev => prev.map(r => r.id === request.id ? updated : r));
      await storageService.saveTimeOffRequest(updated);
  };

  const handleRoleChange = (userId: string, newRole: Role) => {
      const user = users.find(u => u.id === userId);
      if (user) onUpdateUser({ ...user, role: newRole });
  };

  const handleManagerChange = (userId: string, managerId: string) => {
      const user = users.find(u => u.id === userId);
      if (user) onUpdateUser({ ...user, managerId: managerId === 'none' ? undefined : managerId });
  };

  const handleTeamAssignment = (userId: string, teamId: string, action: 'add' | 'remove') => {
      const user = users.find(u => u.id === userId);
      if (!user) return;
      const currentTeams = user.teamIds || [];
      let newTeams = action === 'add' ? [...currentTeams, teamId] : currentTeams.filter(id => id !== teamId);
      newTeams = [...new Set(newTeams)];
      onUpdateUser({ ...user, teamIds: newTeams });
  };

  const handleAddDept = async () => {
      if (!newDeptName) return;
      const newDept: Department = { id: crypto.randomUUID(), name: newDeptName };
      setDepartments(prev => [...prev, newDept]);
      await storageService.saveDepartment(newDept);
      setNewDeptName('');
  };
  
  const handleDeleteDept = async (id: string) => {
      if(!confirm("Delete department? This will delete all teams inside it.")) return;
      setDepartments(prev => prev.filter(d => d.id !== id));
      setTeams(prev => prev.filter(t => t.departmentId !== id)); 
      await storageService.deleteDepartment(id);
  };

  const handleDeptLeadChange = async (deptId: string, managerId: string) => {
      const updatedDepts = departments.map(d => d.id === deptId ? { ...d, managerId: managerId === 'none' ? undefined : managerId } : d);
      setDepartments(updatedDepts);
      const target = updatedDepts.find(d => d.id === deptId);
      if (target) await storageService.saveDepartment(target);
  };

  const handleAddTeam = async () => {
      if (!newTeamName || !selectedDeptId) return;
      const newTeam: Team = { id: crypto.randomUUID(), name: newTeamName, departmentId: selectedDeptId };
      setTeams(prev => [...prev, newTeam]);
      await storageService.saveTeam(newTeam);
      setNewTeamName('');
  };
  
  const handleDeleteTeam = async (id: string) => {
      if(!confirm("Delete team?")) return;
      setTeams(prev => prev.filter(t => t.id !== id));
      await storageService.deleteTeam(id);
  };

  const handleTeamLeadChange = async (teamId: string, managerId: string) => {
      const updatedTeams = teams.map(t => t.id === teamId ? { ...t, managerId: managerId === 'none' ? undefined : managerId } : t);
      setTeams(updatedTeams);
      const target = updatedTeams.find(t => t.id === teamId);
      if (target) await storageService.saveTeam(target);
  };

  const handleExportCSV = () => {
      const user = users.find(u => u.id === reportUser);
      let csv = 'Week,Status,Project,Task,Billing,Mon,Tue,Wed,Thu,Fri,Sat,Sun,Total\n';
      reportTimesheets.forEach(ts => {
          ts.entries.forEach(e => {
              const proj = projects.find(p => p.id === e.projectId)?.name || 'Unknown';
              const line = [
                  ts.weekStartDate,
                  ts.status,
                  `"${proj}"`,
                  `"Task"`, 
                  e.billingStatus,
                  ...e.hours.map(h => (h||0).toFixed(2)),
                  e.hours.reduce((a,b)=>a+b,0).toFixed(2)
              ].join(',');
              csv += line + '\n';
          });
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Timesheet_Export_${user?.name || 'User'}_${reportStartDate}.csv`;
      a.click();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const user = users.find(u => u.id === reportUser);
    doc.setFontSize(18);
    doc.text(`Timesheet Report`, 14, 20);
    doc.setFontSize(10);
    doc.text(`User: ${user?.name || 'Unknown'}`, 14, 30);
    doc.text(`Period: ${reportStartDate} to ${reportEndDate}`, 14, 35);
    const tableData: any[][] = [];
    reportTimesheets.forEach(ts => {
      ts.entries.forEach(e => {
        const proj = projects.find(p => p.id === e.projectId)?.name || 'Unknown';
        tableData.push([
          ts.weekStartDate,
          ts.status,
          proj,
          'Task',
          e.billingStatus,
          e.hours.reduce((a, b) => a + (b || 0), 0).toFixed(2)
        ]);
      });
    });
    autoTable(doc, {
      startY: 40,
      head: [['Week', 'Status', 'Project', 'Task', 'Billing', 'Total Hours']],
      body: tableData,
    });
    doc.save(`Timesheet_Report_${user?.name || 'User'}_${reportStartDate}.pdf`);
  };

  const handleUserEditSave = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!editingUser) return;
      const formData = new FormData(e.currentTarget);
      const updates: any = {};
      updates.name = formData.get('name') as string;
      updates.email = formData.get('email') as string;
      updates.department = formData.get('department') as string;
      updates.workPhone = (formData.get('workPhoneCode') as string) + ' ' + (formData.get('workPhoneNumber') as string);
      updates.personalPhone = (formData.get('personalPhoneCode') as string) + ' ' + (formData.get('personalPhoneNumber') as string);
      updates.street = formData.get('street') as string;
      updates.city = formData.get('city') as string;
      updates.state = formData.get('state') as string;
      updates.zip = formData.get('zip') as string;
      updates.country = formData.get('country') as string;
      onUpdateUser({ ...editingUser, ...updates });
      setEditingUser(null);
  };

  const handleSeedData = async () => {
    if (!confirm("Generate dummy data (Users, Departments, Teams)?\n\nThis will insert data into your configured database (Supabase or Local).")) return;
    
    const dId = crypto.randomUUID();
    const tId = crypto.randomUUID();
    const mgrId = crypto.randomUUID();
    const u1Id = crypto.randomUUID();
    const u2Id = crypto.randomUUID();
    
    const mgr: User = {
        id: mgrId,
        name: 'Buzz Lightyear',
        email: 'buzz@starcommand.com',
        role: Role.MANAGER,
        avatar: 'https://ui-avatars.com/api/?name=Buzz+Lightyear&background=0ea5e9&color=fff',
        department: 'Space Operations',
        workPhone: '+1 555 0001',
        teamIds: [tId]
    };
    
    // Create Department & Team with assigned Lead
    const dept: Department = { id: dId, name: 'Space Operations', managerId: mgrId };
    const team: Team = { id: tId, name: 'Alpha Squadron', departmentId: dId, managerId: mgrId };
    
    await storageService.saveDepartment(dept);
    await storageService.saveTeam(team);
    
    const u1: User = {
        id: u1Id,
        name: 'Woody Pride',
        email: 'woody@roundup.com',
        role: Role.EMPLOYEE,
        avatar: 'https://ui-avatars.com/api/?name=Woody+Pride&background=f59e0b&color=fff',
        department: 'Space Operations',
        managerId: mgrId,
        teamIds: [tId]
    };
    
    const u2: User = {
        id: u2Id,
        name: 'Jessie Yodeling',
        email: 'jessie@roundup.com',
        role: Role.EMPLOYEE,
        avatar: 'https://ui-avatars.com/api/?name=Jessie+Yodeling&background=ef4444&color=fff',
        department: 'Space Operations',
        managerId: mgrId,
        teamIds: [tId]
    };

    await storageService.saveUser(mgr);
    await storageService.saveUser(u1);
    await storageService.saveUser(u2);
    
    alert("Dummy data generated successfully! The page will now reload.");
    window.location.reload();
  };
  
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();
  const changeMonth = (offset: number) => setTeamCalendarDate(new Date(teamCalendarDate.getFullYear(), teamCalendarDate.getMonth() + offset, 1));
  const calYear = teamCalendarDate.getFullYear();
  const calMonth = teamCalendarDate.getMonth();
  const calCells = [...Array(getFirstDayOfMonth(calYear, calMonth)).fill(null), ...Array.from({length: getDaysInMonth(calYear, calMonth)}, (_, i) => i + 1)];

  const calendarLayoutMap = useMemo(() => {
    const visibleRequests = localRequests.filter(r => {
        if (r.status === TimeOffStatus.REJECTED) return false;
        return isGlobalAdmin || managedUserIds.has(r.userId) || r.userId === currentUser.id;
    });

    const sorted = [...visibleRequests].sort((a, b) => {
        if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
        return b.endDate.localeCompare(a.endDate);
    });

    const slots = new Map<string, number>();
    const occupied: { req: TimeOffRequest, slot: number }[] = [];

    const checkOverlap = (a: TimeOffRequest, b: TimeOffRequest) => {
        return a.startDate <= b.endDate && a.endDate >= b.startDate;
    };

    sorted.forEach(req => {
        let slot = 0;
        while (true) {
            const isTaken = occupied.some(occ => occ.slot === slot && checkOverlap(occ.req, req));
            if (!isTaken) break;
            slot++;
        }
        occupied.push({ req, slot });
        slots.set(req.id, slot);
    });

    return { slots, visibleRequests };
  }, [localRequests, isGlobalAdmin, managedUserIds, currentUser.id]);

  const getTeamRequestsForDate = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarLayoutMap.visibleRequests.filter(req => req.startDate <= dateStr && req.endDate >= dateStr);
  };

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4 border-b border-gray-200 overflow-x-auto w-full">
            {['dashboard', 'approvals', 'timeoff', 'history', 'calendar'].map(tab => (
                <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`pb-2 px-1 text-sm font-medium transition-colors capitalize whitespace-nowrap ${activeTab === tab ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    {tab}
                    {tab === 'approvals' && pendingTimesheets.length > 0 && <span className="ml-2 bg-red-100 text-red-600 text-xs py-0.5 px-2 rounded-full">{pendingTimesheets.length}</span>}
                    {tab === 'timeoff' && pendingTimeOff.length > 0 && <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs py-0.5 px-2 rounded-full">{pendingTimeOff.length}</span>}
                </button>
            ))}
            {isGlobalAdmin && (
                <>
                    <button onClick={() => setActiveTab('team')} className={`pb-2 px-1 text-sm font-medium ${activeTab === 'team' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}>User Mgmt</button>
                    <button onClick={() => setActiveTab('org')} className={`pb-2 px-1 text-sm font-medium ${activeTab === 'org' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}>Departments & Teams</button>
                </>
            )}
        </div>
      </div>

      {activeTab === 'dashboard' && <DashboardStats timesheets={timesheets} projects={projects} />}

      {/* Approvals */}
      {activeTab === 'approvals' && (
        <div className="animate-in fade-in duration-500">
          {pendingTimesheets.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed text-gray-500">All timesheets reviewed!</div>
          ) : (
            <div className="grid gap-4">
                {pendingTimesheets.map(ts => (
                    <div key={ts.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                         <div className="flex items-center gap-4 cursor-pointer" onClick={() => setViewingTimesheet(ts)}>
                             <img src={getUserAvatar(ts.userId)} className="w-12 h-12 rounded-full bg-gray-200" />
                             <div><h4 className="font-semibold text-gray-900">{getUserName(ts.userId)}</h4><p className="text-sm text-gray-500 flex items-center gap-2"><Clock className="w-3 h-3" /> Week of {ts.weekStartDate}</p></div>
                         </div>
                         <div className="flex items-center gap-6">
                             <div className="text-right"><p className="text-2xl font-bold text-gray-900">{ts.totalHours}</p><p className="text-xs text-gray-500 uppercase font-semibold">Total Hours</p></div>
                             <div className="flex gap-2">
                                 <button onClick={() => onReject(ts.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-full" title="Reject"><XCircle className="w-6 h-6" /></button>
                                 <button onClick={() => onApprove(ts.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-full" title="Approve"><CheckCircle className="w-6 h-6" /></button>
                             </div>
                         </div>
                    </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Time Off */}
      {activeTab === 'timeoff' && (
          <div className="animate-in fade-in duration-500 grid gap-4 md:grid-cols-2">
              {pendingTimeOff.length === 0 && <div className="col-span-2 text-center py-12 text-gray-500">No pending requests.</div>}
              {pendingTimeOff.map(req => (
                  <div key={req.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-1 h-full ${req.type === 'Sick Leave' ? 'bg-red-400' : 'bg-green-400'}`}></div>
                      <div className="flex justify-between items-start mb-3 pl-2">
                          <div className="flex items-center gap-3"><div className="bg-gray-100 p-2 rounded-full"><UserIcon className="w-5 h-5 text-gray-600" /></div><div><h4 className="font-bold text-gray-900">{getUserName(req.userId)}</h4><span className="text-xs text-gray-500">{req.type}</span></div></div>
                          <div className="flex gap-1"><button onClick={() => handleTimeOffAction(req, TimeOffStatus.REJECTED)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><XCircle className="w-5 h-5"/></button><button onClick={() => handleTimeOffAction(req, TimeOffStatus.APPROVED)} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><CheckCircle className="w-5 h-5"/></button></div>
                      </div>
                      <div className="pl-2 space-y-2 text-sm text-gray-600">
                          <p>From <b>{req.startDate}</b> To <b>{req.endDate}</b></p>
                          <p className="italic">"{req.reason}"</p>
                          {req.attachment && <a href={req.attachment} download={req.attachmentName || 'evidence'} className="text-indigo-600 flex items-center gap-1 text-xs"><Paperclip className="w-3 h-3"/> Evidence</a>}
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* History / Reports */}
      {activeTab === 'history' && (
         <div className="animate-in fade-in duration-500 space-y-4">
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-end">
                 {/* Fixed: Correctly referencing event target in onChange handler */}
                 <div className="flex-1 w-full"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">User</label><select value={reportUser} onChange={(e) => setReportUser(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded-lg">{availableReportUsers.map(u => (<option key={u.id} value={u.id}>{u.name} {u.id === currentUser.id ? '(You)' : ''}</option>))}</select></div>
                 <div className="w-full md:w-auto"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">From</label><input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="p-2 text-sm border border-gray-300 rounded-lg" /></div>
                 <div className="w-full md:w-auto"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">To</label><input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="p-2 text-sm border border-gray-300 rounded-lg" /></div>
                 <div className="flex gap-2">
                    <button onClick={handleExportCSV} disabled={reportTimesheets.length === 0} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs font-medium flex items-center gap-1"><Download className="w-3 h-3" /> CSV</button>
                    <button onClick={handleExportPDF} disabled={reportTimesheets.length === 0} className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-xs font-medium flex items-center gap-1"><Download className="w-3 h-3" /> PDF</button>
                 </div>
             </div>
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                 <table className="w-full text-left text-sm">
                     <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200"><tr><th className="p-4">Week</th><th className="p-4">Status</th><th className="p-4 text-right">Hours</th><th className="p-4 text-center">Actions</th></tr></thead>
                     <tbody className="divide-y divide-gray-100">
                         {reportTimesheets.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-500">No records found.</td></tr>}
                         {reportTimesheets.map(ts => (
                             <tr key={ts.id} className="hover:bg-gray-50">
                                 <td className="p-4 font-medium">{ts.weekStartDate}</td>
                                 <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-medium bg-gray-100`}>{ts.status}</span></td>
                                 <td className="p-4 text-right font-bold">{(ts.totalHours || 0).toFixed(2)}</td>
                                 <td className="p-4 text-center flex justify-center gap-2">
                                     <button onClick={() => setViewingTimesheet(ts)} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded"><Eye className="w-4 h-4" /></button>
                                     {onReopen && (ts.status === 'SUBMITTED' || ts.status === 'APPROVED') && (
                                        <button onClick={() => onReopen(ts.id)} className="text-orange-600 hover:bg-orange-50 p-1.5 rounded" title="Reopen"><Unlock className="w-4 h-4" /></button>
                                     )}
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
         </div>
      )}

      {/* Org Structure (Admin Only) */}
      {activeTab === 'org' && isGlobalAdmin && (
          <div className="animate-in fade-in duration-500 space-y-6">
              {/* Controls */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                      <button onClick={() => setOrgViewMode('management')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${orgViewMode === 'management' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                          <Network className="w-4 h-4" /> Management
                      </button>
                      <button onClick={() => setOrgViewMode('graph')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${orgViewMode === 'graph' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                          <GitBranch className="w-4 h-4" /> Structural Graph
                      </button>
                  </div>
              </div>

              {orgViewMode === 'management' ? (
                <>
                  <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Building className="w-4 h-4 text-indigo-500" /> New Department</h3>
                          <div className="flex gap-2">
                              <input type="text" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} placeholder="e.g. Finance" className="flex-1 p-2 text-sm border border-gray-300 rounded-lg" />
                              <button onClick={handleAddDept} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700">Add</button>
                          </div>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-indigo-500" /> New Team</h3>
                          <div className="flex gap-2 mb-2">
                              <select value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)} className="w-1/2 p-2 text-sm border border-gray-300 rounded-lg">
                                  <option value="">Select Dept</option>
                                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                              </select>
                              <input type="text" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Team Name" className="flex-1 p-2 text-sm border border-gray-300 rounded-lg" />
                          </div>
                          <button onClick={handleAddTeam} disabled={!selectedDeptId} className="w-full bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">Create Team</button>
                      </div>
                  </div>

                  <div className="space-y-6">
                      {departments.map(dept => {
                          const deptHead = users.find(u => u.id === dept.managerId);
                          return (
                            <div key={dept.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-gray-50 p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                                            <Building className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 leading-tight">{dept.name}</h3>
                                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Department</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <div className="flex flex-col w-full sm:w-48">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase mb-0.5 ml-1">Dept Head</label>
                                            <select 
                                                value={dept.managerId || 'none'} 
                                                onChange={e => handleDeptLeadChange(dept.id, e.target.value)} 
                                                className="w-full p-1.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-900"
                                            >
                                                <option value="none">Assign Lead...</option>
                                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                            </select>
                                        </div>
                                        <button onClick={() => handleDeleteDept(dept.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50/30">
                                    {teams.filter(t => t.departmentId === dept.id).map(team => {
                                        const teamLead = users.find(u => u.id === team.managerId);
                                        const memberCount = users.filter(u => u.teamIds?.includes(team.id)).length;
                                        return (
                                            <div key={team.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-all group shadow-sm">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h4 className="font-bold text-sm text-gray-800 group-hover:text-indigo-600 transition-colors">{team.name}</h4>
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{memberCount} Members</span>
                                                    </div>
                                                    <button onClick={() => handleDeleteTeam(team.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-gray-600 uppercase block ml-0.5">Team Lead</label>
                                                    <select 
                                                        value={team.managerId || 'none'} 
                                                        onChange={e => handleTeamLeadChange(team.id, e.target.value)} 
                                                        className="w-full p-1.5 text-[11px] border border-gray-200 rounded-lg bg-gray-50 group-hover:bg-white text-gray-800"
                                                    >
                                                        <option value="none">No Lead Assigned</option>
                                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {teams.filter(t => t.departmentId === dept.id).length === 0 && (
                                        <div className="col-span-full py-8 border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400">
                                            <Users className="w-6 h-6 mb-2 opacity-30" />
                                            <p className="text-xs italic">No teams in this department</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                          );
                      })}
                      {departments.length === 0 && <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-100 text-gray-400">No departments defined yet.</div>}
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-8 overflow-x-auto">
                    <div className="flex justify-center min-w-max">
                        <StructuralNode 
                            title="TimeAudit Corp" 
                            subtitle="Company Root" 
                            icon={<Briefcase className="w-6 h-6" />}
                            colorClass="bg-indigo-900 text-white border-indigo-800"
                        >
                            {departments.map(dept => {
                                const deptHead = users.find(u => u.id === dept.managerId);
                                const memberCount = users.filter(u => u.department === dept.name).length;
                                return (
                                    <StructuralNode 
                                        key={dept.id}
                                        title={dept.name} 
                                        subtitle="Department"
                                        icon={<Building className="w-4 h-4" />}
                                        lead={deptHead}
                                        count={memberCount}
                                        colorClass="bg-white border-indigo-100"
                                    >
                                        {teams.filter(t => t.departmentId === dept.id).map(team => {
                                            const teamLead = users.find(u => u.id === team.managerId);
                                            const teamMemberCount = users.filter(u => u.teamIds?.includes(team.id)).length;
                                            return (
                                                <StructuralNode 
                                                    key={team.id}
                                                    title={team.name} 
                                                    subtitle="Team"
                                                    icon={<Users className="w-3 h-3" />}
                                                    lead={teamLead}
                                                    count={teamMemberCount}
                                                    colorClass="bg-gray-50 border-gray-200"
                                                />
                                            );
                                        })}
                                    </StructuralNode>
                                );
                            })}
                        </StructuralNode>
                    </div>
                </div>
              )}
          </div>
      )}

      {/* User Mgmt (Admin Only) */}
      {activeTab === 'team' && isGlobalAdmin && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between">
                  <h3 className="font-bold text-gray-800">Users</h3>
                  <div className="flex bg-gray-200 p-0.5 rounded-lg items-center">
                      <button onClick={handleSeedData} className="px-2 py-1 text-xs rounded hover:bg-white/50 mr-1 flex items-center gap-1 text-gray-600" title="Create Dummy Data"><Database className="w-3 h-3"/> Seed</button>
                      <button onClick={() => setTeamViewMode('list')} className={`px-2 py-1 text-xs rounded ${teamViewMode === 'list' ? 'bg-white shadow' : ''}`}>List</button>
                      <button onClick={() => setTeamViewMode('chart')} className={`px-2 py-1 text-xs rounded ${teamViewMode === 'chart' ? 'bg-white shadow' : ''}`}>Chart</button>
                  </div>
              </div>
              {teamViewMode === 'list' ? (
                  <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">Manager</th><th className="p-3">Teams</th><th className="p-3"></th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                          {users.map(u => (
                              <tr key={u.id}>
                                  <td className="p-3 font-medium text-gray-900">{u.name}</td>
                                  <td className="p-3">
                                      <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value as Role)} className="border rounded text-xs p-1">
                                          <option value={Role.EMPLOYEE}>Employee</option>
                                          <option value={Role.MANAGER}>Manager</option>
                                          <option value={Role.ADMIN}>Admin</option>
                                      </select>
                                  </td>
                                  <td className="p-3">
                                      <select value={u.managerId || 'none'} onChange={e => handleManagerChange(u.id, e.target.value)} className="border rounded text-xs p-1 max-w-[120px]">
                                          <option value="none">None</option>
                                          {users.filter(m => m.id !== u.id).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                      </select>
                                  </td>
                                  <td className="p-3">
                                      <div className="flex flex-wrap gap-1">
                                          {(u.teamIds || []).map(tid => {
                                              const t = teams.find(tm => tm.id === tid);
                                              return t ? <span key={tid} className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">{t.name} <button onClick={() => handleTeamAssignment(u.id, tid, 'remove')} className="hover:text-red-500">×</button></span> : null;
                                          })}
                                          <select onChange={e => { if(e.target.value) handleTeamAssignment(u.id, e.target.value, 'add'); e.target.value=''; }} className="border rounded text-[10px] p-0.5 w-4 opacity-50 hover:opacity-100 hover:w-24 transition-all">
                                              <option value="">+</option>
                                              {teams.filter(t => !u.teamIds?.includes(t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                          </select>
                                      </div>
                                  </td>
                                  <td className="p-3"><button onClick={() => setEditingUser(u)}><Edit2 className="w-4 h-4 text-gray-400 hover:text-indigo-600" /></button></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              ) : (
                  <div className="p-8 overflow-auto flex justify-center"><OrgChartNode user={users.find(u => !u.managerId) || users[0]} allUsers={users} /></div>
              )}
          </div>
      )}

      {/* Calendar */}
      {activeTab === 'calendar' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b flex justify-between">
                  <button onClick={() => changeMonth(-1)}><ChevronLeft /></button>
                  <span className="font-bold">{teamCalendarDate.toLocaleDateString('en-US', {month:'long', year:'numeric'})}</span>
                  <button onClick={() => changeMonth(1)}><ChevronRight /></button>
              </div>
              <div className="grid grid-cols-7 text-center text-xs text-gray-400 py-2 border-b bg-gray-50">{['S','M','T','W','T','F','S'].map(d=><div key={d}>{d}</div>)}</div>
              <div className="grid grid-cols-7 border-collapse">
                  {calCells.map((day, i) => {
                      const dateStr = day ? `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                      const dayRequests = day ? calendarLayoutMap.visibleRequests.filter(req => req.startDate <= dateStr && req.endDate >= dateStr) : [];
                      const slots: (TimeOffRequest | null)[] = [];
                      if (dayRequests.length > 0) {
                          const maxSlot = Math.max(...dayRequests.map(r => calendarLayoutMap.slots.get(r.id) ?? 0));
                          for (let s = 0; s <= maxSlot; s++) {
                              slots[s] = dayRequests.find(r => calendarLayoutMap.slots.get(r.id) === s) || null;
                          }
                      }
                      const isToday = day && new Date().toDateString() === new Date(calYear, calMonth, day).toDateString();

                      return (
                          <div key={i} className={`min-h-[100px] border-b border-r border-gray-100 p-0 relative ${!day ? 'bg-gray-50/30' : ''}`}>
                              {day && (
                                  <>
                                      <div className="p-1 text-right">
                                          <span className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-gray-700'}`}>{day}</span>
                                      </div>
                                      <div className="flex flex-col w-full"> 
                                          {slots.map((req, slotIndex) => {
                                              if (!req) return <div key={`empty-${slotIndex}`} className="h-5 mb-1"></div>;
                                              const isStart = req.startDate === dateStr;
                                              const isEnd = req.endDate === dateStr;
                                              let className = "h-5 mb-1 text-[10px] flex items-center px-1 truncate cursor-default relative z-10 ";
                                              if (req.type === 'Sick Leave') className += "bg-red-100 text-red-800 border-y border-red-200 ";
                                              else className += "bg-green-100 text-green-800 border-y border-green-200 ";
                                              if (isStart) className += "rounded-l border-l ml-1 ";
                                              else className += "border-l-0 -ml-[1px] ";
                                              if (isEnd) className += "rounded-r border-r mr-1 ";
                                              else className += "border-r-0 -mr-[1px] ";
                                              const u = users.find(usr => usr.id === req.userId);
                                              const isColStart = i % 7 === 0;
                                              return (
                                                  <div key={req.id} className={className} title={`${u?.name} - ${req.type}`}>
                                                      {(isStart || isColStart) && <span className="font-medium truncate">{u?.name}</span>}
                                                  </div>
                                              )
                                          })}
                                      </div>
                                  </>
                              )}
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* Modals */}
      {viewingTimesheet && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white w-full max-w-5xl h-[90vh] rounded-xl flex flex-col"><div className="p-4 border-b flex justify-between font-bold"><span>Timesheet Review</span><button onClick={()=>setViewingTimesheet(null)}><X/></button></div><div className="flex-1 overflow-auto p-4"><TimesheetEditor timesheet={viewingTimesheet} projects={projects} tasks={[]} weekStartDate={viewingTimesheet.weekStartDate} onSave={()=>{}} onSubmit={()=>{}} onWeekChange={()=>{}} onCopyPrevious={()=>{}} readOnly /></div></div></div>}
      {editingUser && <EditUserModal user={editingUser} onClose={()=>setEditingUser(null)} onSave={handleUserEditSave} />}
    </div>
  );
};
