
import React, { useState } from 'react';
import { Timesheet, Project, TimesheetStatus, User, TimeOffRequest, TimeOffStatus, Role } from '../types';
import { CheckCircle, XCircle, Clock, Calendar, User as UserIcon, Paperclip, Users, Save } from 'lucide-react';
import { DashboardStats } from './DashboardStats';
import { storageService } from '../services/storage';

interface AdminViewProps {
  timesheets: Timesheet[];
  projects: Project[];
  users: User[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onUpdateUser: (user: User) => void; // Callback to update user data
}

export const AdminView: React.FC<AdminViewProps> = ({ timesheets, projects, users, onApprove, onReject, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'approvals' | 'timeoff' | 'team'>('dashboard');
  
  // Local state to track updates immediately
  const [localRequests, setLocalRequests] = useState<TimeOffRequest[]>([]);

  // Load time off requests on mount or tab switch
  React.useEffect(() => {
     if (activeTab === 'timeoff') {
         storageService.loadAllData().then(data => {
             setLocalRequests(data.timeOffRequests || []);
         });
     }
  }, [activeTab]);

  const pendingTimesheets = timesheets.filter(t => t.status === 'SUBMITTED');
  const pendingTimeOff = localRequests.filter(r => r.status === TimeOffStatus.PENDING);

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';
  const getUserAvatar = (id: string) => users.find(u => u.id === id)?.avatar || '';

  const handleTimeOffAction = async (request: TimeOffRequest, status: TimeOffStatus) => {
      const updated = { ...request, status };
      setLocalRequests(prev => prev.map(r => r.id === request.id ? updated : r));
      await storageService.saveTimeOffRequest(updated);
  };

  const handleRoleChange = (userId: string, newRole: Role) => {
      const user = users.find(u => u.id === userId);
      if (user) {
          onUpdateUser({ ...user, role: newRole });
      }
  };

  const handleManagerChange = (userId: string, managerId: string) => {
      const user = users.find(u => u.id === userId);
      if (user) {
          onUpdateUser({ ...user, managerId: managerId === 'none' ? undefined : managerId });
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 border-b border-gray-200 overflow-x-auto">
            <button 
                onClick={() => setActiveTab('dashboard')}
                className={`pb-2 px-1 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'dashboard' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Dashboard
            </button>
            <button 
                onClick={() => setActiveTab('approvals')}
                className={`pb-2 px-1 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'approvals' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Timesheet Approvals
                {pendingTimesheets.length > 0 && (
                    <span className="bg-red-100 text-red-600 text-xs py-0.5 px-2 rounded-full">{pendingTimesheets.length}</span>
                )}
            </button>
            <button 
                onClick={() => setActiveTab('timeoff')}
                className={`pb-2 px-1 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'timeoff' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Time Off Requests
                {pendingTimeOff.length > 0 && (
                    <span className="bg-yellow-100 text-yellow-700 text-xs py-0.5 px-2 rounded-full">{pendingTimeOff.length}</span>
                )}
            </button>
            <button 
                onClick={() => setActiveTab('team')}
                className={`pb-2 px-1 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'team' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Team Management
            </button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="animate-in fade-in duration-500">
          <DashboardStats timesheets={timesheets} projects={projects} />
        </div>
      )}

      {activeTab === 'approvals' && (
        <div className="animate-in fade-in duration-500">
          {pendingTimesheets.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                <div className="mx-auto w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-gray-900 font-medium">All timesheets reviewed!</h3>
            </div>
          ) : (
            <div className="grid gap-4">
                {pendingTimesheets.map(ts => (
                    <div key={ts.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                         <div className="flex items-center gap-4">
                             <img src={getUserAvatar(ts.userId)} alt="" className="w-12 h-12 rounded-full bg-gray-200" />
                             <div>
                                 <h4 className="font-semibold text-gray-900">{getUserName(ts.userId)}</h4>
                                 <p className="text-sm text-gray-500 flex items-center gap-2">
                                     <Clock className="w-3 h-3" /> Week of {ts.weekStartDate}
                                 </p>
                             </div>
                         </div>
                         <div className="flex items-center gap-6">
                             <div className="text-right">
                                 <p className="text-2xl font-bold text-gray-900">{ts.totalHours}</p>
                                 <p className="text-xs text-gray-500 uppercase font-semibold">Total Hours</p>
                             </div>
                             <div className="flex gap-2">
                                 <button 
                                    onClick={() => onReject(ts.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Reject">
                                     <XCircle className="w-6 h-6" />
                                 </button>
                                 <button 
                                    onClick={() => onApprove(ts.id)}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors" title="Approve">
                                     <CheckCircle className="w-6 h-6" />
                                 </button>
                             </div>
                         </div>
                    </div>
                ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'timeoff' && (
          <div className="animate-in fade-in duration-500">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Pending Requests</h3>
              {pendingTimeOff.length === 0 ? (
                 <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                    <div className="mx-auto w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
                        <Calendar className="w-6 h-6 text-green-500" />
                    </div>
                    <h3 className="text-gray-900 font-medium">No pending time off requests.</h3>
                </div>
              ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                      {pendingTimeOff.map(req => (
                          <div key={req.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                              <div className={`absolute top-0 left-0 w-1 h-full ${req.type === 'Sick Leave' ? 'bg-red-400' : 'bg-green-400'}`}></div>
                              <div className="flex justify-between items-start mb-3 pl-2">
                                  <div className="flex items-center gap-3">
                                      <div className="bg-gray-100 p-2 rounded-full">
                                          <UserIcon className="w-5 h-5 text-gray-600" />
                                      </div>
                                      <div>
                                          <h4 className="font-bold text-gray-900">{getUserName(req.userId)}</h4>
                                          <span className="text-xs text-gray-500">{req.type}</span>
                                      </div>
                                  </div>
                                  <div className="flex gap-1">
                                      <button onClick={() => handleTimeOffAction(req, TimeOffStatus.REJECTED)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><XCircle className="w-5 h-5"/></button>
                                      <button onClick={() => handleTimeOffAction(req, TimeOffStatus.APPROVED)} className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"><CheckCircle className="w-5 h-5"/></button>
                                  </div>
                              </div>
                              <div className="pl-2 space-y-2">
                                  <div className="flex justify-between text-sm bg-gray-50 p-2 rounded border border-gray-100">
                                      <div>
                                          <p className="text-xs text-gray-400 uppercase font-bold">From</p>
                                          <p className="font-medium text-gray-900">{req.startDate}</p>
                                          <p className="text-xs text-gray-500">{req.startTime || '09:00'}</p>
                                      </div>
                                      <div className="text-right">
                                          <p className="text-xs text-gray-400 uppercase font-bold">To</p>
                                          <p className="font-medium text-gray-900">{req.endDate}</p>
                                          <p className="text-xs text-gray-500">{req.endTime || '17:00'}</p>
                                      </div>
                                  </div>
                                  {req.reason && (
                                      <p className="text-xs text-gray-600 italic border-l-2 border-gray-200 pl-2">
                                          "{req.reason}"
                                      </p>
                                  )}
                                  {req.attachment && (
                                     <a 
                                        href={req.attachment} 
                                        download={req.attachmentName || 'evidence'}
                                        className="flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-800 hover:underline mt-1 pl-1"
                                     >
                                        <Paperclip className="w-3 h-3" />
                                        View Attached Evidence
                                     </a>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {activeTab === 'team' && (
          <div className="animate-in fade-in duration-500 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-800">Organization & Team Hierarchy</h3>
             </div>
             <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                     <thead>
                         <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
                             <th className="p-4">Employee</th>
                             <th className="p-4">Role</th>
                             <th className="p-4">Reports To (Manager)</th>
                             <th className="p-4 text-right">Status</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                         {users.map(user => (
                             <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                 <td className="p-4">
                                     <div className="flex items-center gap-3">
                                         <img src={user.avatar} className="w-9 h-9 rounded-full bg-gray-200" alt="" />
                                         <div>
                                             <div className="font-semibold text-gray-900">{user.name}</div>
                                             <div className="text-xs text-gray-500">{user.email}</div>
                                         </div>
                                     </div>
                                 </td>
                                 <td className="p-4">
                                     <select 
                                        value={user.role} 
                                        onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                                        className="border border-gray-200 rounded-md text-xs py-1 px-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                     >
                                         <option value={Role.EMPLOYEE}>Employee</option>
                                         <option value={Role.ADMIN}>Admin</option>
                                     </select>
                                 </td>
                                 <td className="p-4">
                                     <select 
                                        value={user.managerId || 'none'}
                                        onChange={(e) => handleManagerChange(user.id, e.target.value)}
                                        className="border border-gray-200 rounded-md text-xs py-1 px-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none w-full max-w-[200px]"
                                     >
                                         <option value="none">-- No Manager --</option>
                                         {users.filter(u => u.id !== user.id).map(possibleManager => (
                                             <option key={possibleManager.id} value={possibleManager.id}>
                                                 {possibleManager.name}
                                             </option>
                                         ))}
                                     </select>
                                 </td>
                                 <td className="p-4 text-right">
                                     <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                         Active
                                     </span>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
          </div>
      )}
    </div>
  );
};
