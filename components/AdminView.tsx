
import React, { useState, useMemo, useEffect } from 'react';
import { Timesheet, Project, Task, User, TimeOffRequest, TimeOffStatus, Role, Department, Team } from '../types';
import { CheckCircle, XCircle, Clock, Calendar, User as UserIcon, Paperclip, Users, Save, ChevronLeft, ChevronRight, Network, List, FileBarChart, Download, Eye, X, Edit2, Building, Phone, MapPin, Smartphone, Unlock, Plus, Trash2, Globe, Award, GitBranch, Briefcase, Mail, UserPlus, Check } from 'lucide-react';
import { DashboardStats } from './DashboardStats';
import { storageService } from '../services/storage';
import { TimesheetEditor } from './TimesheetEditor';
import { COUNTRY_CODES } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AdminViewProps {
  currentUser: User;
  activeRole: Role;
  timesheets: Timesheet[];
  projects: Project[];
  tasks: Task[];
  users: User[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onUpdateUser: (user: User) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ currentUser, activeRole, timesheets, projects, tasks, users, onApprove, onReject, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'approvals' | 'timeoff' | 'history' | 'team' | 'calendar'>('dashboard');
  
  const [localRequests, setLocalRequests] = useState<TimeOffRequest[]>([]);
  const [localDepts, setLocalDepts] = useState<Department[]>([]);
  const [localTeams, setLocalTeams] = useState<Team[]>([]);
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
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
         setLocalDepts(data.departments || []);
         setLocalTeams(data.teams || []);
     };
     loadData();
  }, [activeTab]);

  const isGlobalAdmin = activeRole === Role.ADMIN;
  
  const managedUserIds = useMemo(() => {
      const ids = new Set<string>();
      const addReportsRecursively = (managerId: string) => {
          users.filter(u => u.managerId === managerId).forEach(u => {
              if (!ids.has(u.id)) {
                  ids.add(u.id);
                  addReportsRecursively(u.id);
              }
          });
      };
      addReportsRecursively(currentUser.id);
      return ids;
  }, [users, currentUser.id]);

  const managedTimesheets = useMemo(() => {
      return timesheets.filter(t => t.userId === currentUser.id || managedUserIds.has(t.userId));
  }, [timesheets, currentUser.id, managedUserIds]);

  const availableReportUsers = useMemo(() => {
     return [currentUser, ...users.filter(u => managedUserIds.has(u.id))];
  }, [users, currentUser, managedUserIds]);

  const reportTimesheets = useMemo(() => {
      return timesheets.filter(t => 
          t.userId === reportUser && 
          t.weekStartDate >= reportStartDate && 
          t.weekStartDate <= reportEndDate
      ).sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
  }, [timesheets, reportUser, reportStartDate, reportEndDate]);

  const pendingTimesheets = timesheets.filter(t => 
    t.status === 'SUBMITTED' && t.userId !== currentUser.id && managedUserIds.has(t.userId)
  );

  const pendingTimeOff = localRequests.filter(r => 
    r.status === TimeOffStatus.PENDING && r.userId !== currentUser.id && managedUserIds.has(r.userId)
  );

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';
  const getUserAvatar = (id: string) => users.find(u => u.id === id)?.avatar || '';

  const handleTimeOffAction = async (request: TimeOffRequest, status: TimeOffStatus) => {
      const updated = { ...request, status };
      setLocalRequests(prev => prev.map(r => r.id === request.id ? updated : r));
      await storageService.saveTimeOffRequest(updated);
  };

  const handleExportCSV = () => {
      const user = users.find(u => u.id === reportUser);
      let csv = 'Week,Status,Project,Task,Billing,Mon,Tue,Wed,Thu,Fri,Sat,Sun,Total\n';
      reportTimesheets.forEach(ts => {
          ts.entries.forEach(e => {
              const proj = projects.find(p => p.id === e.projectId)?.name || 'Unknown';
              const line = [ts.weekStartDate, ts.status, `"${proj}"`, `"Task"`, e.billingStatus, ...e.hours.map(h => (h||0).toFixed(2)), e.hours.reduce((a,b)=>a+b,0).toFixed(2)].join(',');
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

  const calendarLayoutMap = useMemo(() => {
    const visibleRequests = localRequests.filter(r => r.status !== TimeOffStatus.REJECTED && (managedUserIds.has(r.userId) || r.userId === currentUser.id));
    const sorted = [...visibleRequests].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const slots = new Map<string, number>();
    const occupied: { req: TimeOffRequest, slot: number }[] = [];
    const checkOverlap = (a: TimeOffRequest, b: TimeOffRequest) => a.startDate <= b.endDate && a.endDate >= b.startDate;
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
  }, [localRequests, managedUserIds, currentUser.id]);

  const changeMonth = (offset: number) => setTeamCalendarDate(new Date(teamCalendarDate.getFullYear(), teamCalendarDate.getMonth() + offset, 1));
  const calYear = teamCalendarDate.getFullYear();
  const calMonth = teamCalendarDate.getMonth();
  const calCells = [...Array(new Date(calYear, calMonth, 1).getDay()).fill(null), ...Array.from({length: new Date(calYear, calMonth + 1, 0).getDate()}, (_, i) => i + 1)];

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto w-full">
          {['dashboard', 'approvals', 'timeoff', 'history', 'calendar'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={`pb-2 px-1 text-sm font-medium transition-colors capitalize whitespace-nowrap ${activeTab === tab ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  {tab}
                  {tab === 'approvals' && pendingTimesheets.length > 0 && <span className="ml-2 bg-red-100 text-red-600 text-xs py-0.5 px-2 rounded-full">{pendingTimesheets.length}</span>}
                  {tab === 'timeoff' && pendingTimeOff.length > 0 && <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs py-0.5 px-2 rounded-full">{pendingTimeOff.length}</span>}
              </button>
          ))}
          {isGlobalAdmin && <button onClick={() => setActiveTab('team')} className={`pb-2 px-1 text-sm font-medium transition-colors ${activeTab === 'team' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>User Mgmt</button>}
      </div>

      {activeTab === 'dashboard' && <DashboardStats timesheets={managedTimesheets} projects={projects} />}

      {activeTab === 'approvals' && (
        <div className="animate-in fade-in duration-500">
          {pendingTimesheets.length === 0 ? <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed text-gray-500"><Users className="w-8 h-8 mx-auto mb-3 opacity-20" /><p>No reports currently have pending timesheets.</p></div> : 
            <div className="grid gap-4">{pendingTimesheets.map(ts => (
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
                ))}</div>}
        </div>
      )}

      {activeTab === 'timeoff' && (
          <div className="animate-in fade-in duration-500 grid gap-4 md:grid-cols-2">
              {pendingTimeOff.length === 0 ? <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-dashed border-gray-200 text-gray-500"><Calendar className="w-8 h-8 mx-auto mb-3 opacity-20" /><p>No pending leave requests from your chain.</p></div> : 
              pendingTimeOff.map(req => (
                  <div key={req.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-1 h-full ${req.type === 'Sick Leave' ? 'bg-red-400' : 'bg-green-400'}`}></div>
                      <div className="flex justify-between items-start mb-3 pl-2">
                          <div className="flex items-center gap-3"><div className="bg-gray-100 p-2 rounded-full"><UserIcon className="w-5 h-5 text-gray-600" /></div><div><h4 className="font-bold text-gray-900">{getUserName(req.userId)}</h4><span className="text-xs text-gray-500">{req.type}</span></div></div>
                          <div className="flex gap-1"><button onClick={() => handleTimeOffAction(req, TimeOffStatus.REJECTED)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><XCircle className="w-5 h-5"/></button><button onClick={() => handleTimeOffAction(req, TimeOffStatus.APPROVED)} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><CheckCircle className="w-5 h-5"/></button></div>
                      </div>
                      <div className="pl-2 space-y-2 text-sm text-gray-600">
                          <p>From <b>{req.startDate}</b> To <b>{req.endDate}</b></p>
                          <p className="italic">"{req.reason}"</p>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {activeTab === 'history' && (
         <div className="animate-in fade-in duration-500 space-y-4">
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-end">
                 <div className="flex-1 w-full"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">User</label><select value={reportUser} onChange={(e) => setReportUser(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded-lg">{availableReportUsers.map(u => (<option key={u.id} value={u.id}>{u.name} {u.id === currentUser.id ? '(You)' : ''}</option>))}</select></div>
                 <div className="flex gap-2">
                    <button onClick={handleExportCSV} disabled={reportTimesheets.length === 0} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs font-medium flex items-center gap-1"><Download className="w-3 h-3" /> CSV</button>
                 </div>
             </div>
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                 <table className="w-full text-left text-sm">
                     <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200"><tr><th className="p-4">Week</th><th className="p-4">Status</th><th className="p-4 text-right">Hours</th><th className="p-4 text-center">Actions</th></tr></thead>
                     <tbody className="divide-y divide-gray-100">
                         {reportTimesheets.map(ts => (
                             <tr key={ts.id} className="hover:bg-gray-50">
                                 <td className="p-4 font-medium text-gray-900">{ts.weekStartDate}</td>
                                 <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700`}>{ts.status}</span></td>
                                 <td className="p-4 text-right font-bold text-gray-900">{(ts.totalHours || 0).toFixed(2)}</td>
                                 <td className="p-4 text-center"><button onClick={() => setViewingTimesheet(ts)} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded"><Eye className="w-4 h-4" /></button></td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
         </div>
      )}

      {activeTab === 'calendar' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b flex justify-between items-center"><button onClick={() => changeMonth(-1)}><ChevronLeft /></button><span className="font-bold">{teamCalendarDate.toLocaleDateString('en-US', {month:'long', year:'numeric'})}</span><button onClick={() => changeMonth(1)}><ChevronRight /></button></div>
              <div className="grid grid-cols-7 text-center text-xs text-gray-400 py-2 border-b bg-gray-50">{['S','M','T','W','T','F','S'].map(d=><div key={d}>{d}</div>)}</div>
              <div className="grid grid-cols-7 border-collapse">
                  {calCells.map((day, i) => {
                      const dateStr = day ? `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                      const dayRequests = day ? calendarLayoutMap.visibleRequests.filter(req => req.startDate <= dateStr && req.endDate >= dateStr) : [];
                      return (
                          <div key={i} className={`min-h-[80px] border-b border-r border-gray-100 p-1 ${!day ? 'bg-gray-50/30' : 'bg-white'}`}>
                              {day && <div className="text-right text-xs font-bold text-gray-400">{day}</div>}
                              {dayRequests.map(req => (<div key={req.id} className={`text-[10px] truncate mb-1 px-1 rounded ${req.type === 'Sick Leave' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{getUserName(req.userId)}</div>))}
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {activeTab === 'team' && isGlobalAdmin && (
          <div className="animate-in fade-in duration-500 space-y-4">
              <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-800">User Management</h3>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5" /> Invite User
                    </button>
                  </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
                          <tr>
                              <th className="p-4">User</th>
                              <th className="p-4">Contact</th>
                              <th className="p-4">Dept / Teams</th>
                              <th className="p-4">Manager</th>
                              <th className="p-4 text-center">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {users.map(u => (
                              <tr key={u.id} className="hover:bg-gray-50 group">
                                  <td className="p-4">
                                      <div className="flex items-center gap-3">
                                          <img src={u.avatar} className="w-8 h-8 rounded-full border border-gray-200 bg-gray-50" />
                                          <div className="overflow-hidden">
                                              <p className="font-bold text-gray-900 truncate">{u.name}</p>
                                              <p className="text-[10px] text-gray-500 truncate">{u.email}</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="p-4">
                                      <div className="text-[10px] space-y-1">
                                          <div className="flex items-center gap-1.5 text-gray-600"><Phone className="w-3 h-3" /> {u.workPhone || '--'}</div>
                                          <div className="flex items-center gap-1.5 text-gray-600"><Smartphone className="w-3 h-3" /> {u.personalPhone || '--'}</div>
                                      </div>
                                  </td>
                                  <td className="p-4">
                                      <div className="space-y-1">
                                          <p className="text-xs font-bold text-gray-700">
                                              {localDepts.find(d => d.id === u.departmentId)?.name || u.department || <span className="text-gray-300 italic">No Dept</span>}
                                          </p>
                                          <div className="flex flex-wrap gap-1">
                                              {(u.teamIds || []).map(tid => {
                                                  const t = localTeams.find(x => x.id === tid);
                                                  return t ? (
                                                      <span key={tid} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-bold border border-indigo-100">
                                                          {t.name}
                                                      </span>
                                                  ) : null;
                                              })}
                                          </div>
                                      </div>
                                  </td>
                                  <td className="p-4">
                                      {u.managerId ? (
                                          <div className="flex items-center gap-2">
                                              <img src={getUserAvatar(u.managerId)} className="w-5 h-5 rounded-full" />
                                              <span className="text-xs text-gray-700">{getUserName(u.managerId)}</span>
                                          </div>
                                      ) : <span className="text-xs text-gray-400 italic">None</span>}
                                  </td>
                                  <td className="p-4 text-center">
                                      <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => setEditingUser(u)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"><Edit2 className="w-4 h-4" /></button>
                                          <button className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <div className="flex items-center gap-3">
                          <img src={editingUser.avatar} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                          <div>
                              <h3 className="font-bold text-gray-800">Edit User Assignments</h3>
                              <p className="text-[10px] text-gray-500 font-medium">{editingUser.email}</p>
                          </div>
                      </div>
                      <button onClick={() => setEditingUser(null)} className="p-1 bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="p-6 space-y-6">
                      <div className="space-y-4">
                          <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Department</label>
                              <select 
                                  value={editingUser.departmentId || ''} 
                                  onChange={e => setEditingUser({...editingUser, departmentId: e.target.value, department: localDepts.find(d => d.id === e.target.value)?.name || ''})}
                                  className="w-full text-sm font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                              >
                                  <option value="">None (Standalone)</option>
                                  {localDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                              </select>
                          </div>

                          <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Teams</label>
                              <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
                                  {(editingUser.teamIds || []).map(tid => {
                                      const t = localTeams.find(x => x.id === tid);
                                      return t ? (
                                          <div key={tid} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full border border-indigo-100 text-[10px] font-black animate-in zoom-in-90">
                                              <span>{t.name}</span>
                                              <button onClick={() => setEditingUser({...editingUser, teamIds: (editingUser.teamIds || []).filter(x => x !== tid)})} className="hover:text-red-500">
                                                  <X className="w-3 h-3" />
                                              </button>
                                          </div>
                                      ) : null;
                                  })}
                              </div>
                              <select 
                                  className="w-full text-sm font-bold text-indigo-600 bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 transition-all outline-none cursor-pointer"
                                  onChange={e => {
                                      if(e.target.value && !(editingUser.teamIds || []).includes(e.target.value)) {
                                          setEditingUser({...editingUser, teamIds: [...(editingUser.teamIds || []), e.target.value]});
                                      }
                                      e.target.value = "";
                                  }}
                              >
                                  <option value="">+ Add to Team...</option>
                                  {localTeams
                                    .filter(t => !editingUser.departmentId || t.departmentId === editingUser.departmentId)
                                    .filter(t => !(editingUser.teamIds || []).includes(t.id))
                                    .map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                                  }
                              </select>
                          </div>

                          <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Reporting Manager</label>
                              <select 
                                  value={editingUser.managerId || ''} 
                                  onChange={e => setEditingUser({...editingUser, managerId: e.target.value})}
                                  className="w-full text-sm font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                              >
                                  <option value="">None (Top Level)</option>
                                  {users.filter(u => u.id !== editingUser.id).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                              </select>
                          </div>
                      </div>
                      
                      <button 
                          onClick={async () => {
                              await onUpdateUser(editingUser);
                              setEditingUser(null);
                          }}
                          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                      >
                          <Save className="w-4 h-4" /> Save User Assignments
                      </button>
                  </div>
              </div>
          </div>
      )}

      {viewingTimesheet && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-white shadow-sm">
              <span className="text-gray-900 font-bold">Timesheet Review</span>
              <button onClick={() => setViewingTimesheet(null)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              <TimesheetEditor user={users.find(u => u.id === viewingTimesheet.userId) || currentUser} timesheet={viewingTimesheet} projects={projects} tasks={tasks} weekStartDate={viewingTimesheet.weekStartDate} onSave={() => {}} onSubmit={() => {}} onWeekChange={() => {}} onCopyPrevious={() => {}} readOnly />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
