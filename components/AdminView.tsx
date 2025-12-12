
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Timesheet, Project, TimesheetStatus, User, TimeOffRequest, TimeOffStatus, Role } from '../types';
import { CheckCircle, XCircle, Clock, Calendar, User as UserIcon, Paperclip, Users, Save, ChevronLeft, ChevronRight, Lock, Network, List, FileBarChart, Download, Eye, X, Edit2, Building, Phone, MapPin, Smartphone } from 'lucide-react';
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
  onUpdateUser: (user: User) => void; // Callback to update user data
}

// Recursive Org Chart Component
const OrgChartNode: React.FC<{ user: User; allUsers: User[] }> = ({ user, allUsers }) => {
    const directReports = allUsers.filter(u => u.managerId === user.id);

    return (
        <div className="flex flex-col items-center">
            {/* Card */}
            <div className="flex flex-col items-center p-3 bg-white border border-gray-200 rounded-xl shadow-sm w-48 relative z-10 hover:shadow-md hover:border-indigo-300 transition-all cursor-default group shrink-0">
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                    <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover bg-gray-100" 
                    />
                    <div className="absolute -bottom-1 -right-1 bg-gray-100 rounded-full p-0.5 border border-white">
                        <UserIcon className="w-3 h-3 text-gray-600" />
                    </div>
                </div>
                <span className="font-bold text-sm text-gray-900 mt-2 truncate w-full text-center" title={user.name}>
                    {user.name}
                </span>
                <span className="text-xs text-gray-500 truncate w-full text-center mb-1">
                    {user.role}
                </span>
                <div className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                    {directReports.length} Reports
                </div>
            </div>

            {/* Children Container */}
            {directReports.length > 0 && (
                <div className="flex flex-col items-center animate-in fade-in duration-300">
                    {/* Vertical Line Down from Parent */}
                    <div className="h-8 w-px bg-gray-300"></div>
                    
                    {/* Horizontal Connector Wrapper */}
                    <div className="flex relative items-start gap-8">
                         {/* This creates the branching lines */}
                        {directReports.map((child, index) => {
                            const isFirst = index === 0;
                            const isLast = index === directReports.length - 1;
                            const isOnly = directReports.length === 1;

                            return (
                                <div key={child.id} className="flex flex-col items-center relative">
                                     {/* Horizontal Line Segment */}
                                     {/* We use absolute positioning to draw lines to the left/right of the center line */}
                                     
                                     {!isOnly && (
                                         <>
                                            {/* Line to the left (if not first) */}
                                            <div className={`absolute top-0 right-[50%] h-px bg-gray-300 ${isFirst ? 'w-0' : 'w-[calc(50%+1rem)]'}`}></div>
                                            {/* Line to the right (if not last) */}
                                            <div className={`absolute top-0 left-[50%] h-px bg-gray-300 ${isLast ? 'w-0' : 'w-[calc(50%+1rem)]'}`}></div>
                                         </>
                                     )}

                                     {/* Vertical Line Down to Child */}
                                     <div className="h-8 w-px bg-gray-300"></div>
                                     
                                     <OrgChartNode user={child} allUsers={allUsers} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Edit Modal Sub-Component to handle internal state like Phones/Address ---
const EditUserModal: React.FC<{ 
    user: User; 
    onClose: () => void; 
    onSave: (e: React.FormEvent<HTMLFormElement>) => void;
}> = ({ user, onClose, onSave }) => {
    
    // Helper to parse phone
    const parsePhoneNumber = (phone: string | undefined) => {
      if (!phone) return { code: '+61', number: '' };
      const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
      const match = sortedCodes.find(c => phone.startsWith(c.code));
      if (match) {
        return { code: match.code, number: phone.slice(match.code.length).trim() };
      }
      return { code: '+61', number: phone };
    };

    const initialWork = parsePhoneNumber(user.workPhone);
    const initialPersonal = parsePhoneNumber(user.personalPhone);

    const [workPhoneCode, setWorkPhoneCode] = useState(initialWork.code);
    const [personalPhoneCode, setPersonalPhoneCode] = useState(initialPersonal.code);
    
    // Address logic - Direct mapping
    const [street, setStreet] = useState(user.street || '');
    const [city, setCity] = useState(user.city || '');
    const [state, setState] = useState(user.state || '');
    const [zip, setZip] = useState(user.zip || '');
    const [country, setCountry] = useState(user.country || '');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                    <h3 className="font-bold text-gray-800">Edit User Details</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="overflow-y-auto p-6">
                  <form onSubmit={onSave} className="space-y-4">
                      {/* Hidden inputs to pass phone codes to the parent onSave handler via FormData */}
                      <input type="hidden" name="workPhoneCode" value={workPhoneCode} />
                      <input type="hidden" name="personalPhoneCode" value={personalPhoneCode} />

                      <div className="flex justify-center mb-4">
                          <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-full border-4 border-gray-100 object-cover" />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                          <input 
                              name="name"
                              type="text" 
                              defaultValue={user.name}
                              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              required
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                          <input 
                              name="email"
                              type="email" 
                              defaultValue={user.email}
                              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              required
                          />
                          <p className="text-[10px] text-orange-500 mt-1 italic">
                              Note: Changing email here updates the contact profile. Login credentials must be updated separately by the user or system admin.
                          </p>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Department</label>
                          <div className="relative">
                             <Building className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                             <input 
                                 name="department"
                                 type="text" 
                                 defaultValue={user.department}
                                 placeholder="e.g. Sales"
                                 className="w-full pl-9 p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                             />
                          </div>
                      </div>

                      {/* Phone Fields */}
                      <div className="grid grid-cols-1 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Work Phone</label>
                              <div className="flex gap-2">
                                <div className="relative w-[110px]">
                                    <select 
                                        value={workPhoneCode}
                                        onChange={(e) => setWorkPhoneCode(e.target.value)}
                                        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white text-gray-900"
                                    >
                                        {COUNTRY_CODES.map(c => (
                                            <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="relative flex-1">
                                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                    <input 
                                        name="workPhoneNumber"
                                        type="tel" 
                                        defaultValue={initialWork.number}
                                        className="w-full pl-9 p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mobile Phone</label>
                              <div className="flex gap-2">
                                <div className="relative w-[110px]">
                                    <select 
                                        value={personalPhoneCode}
                                        onChange={(e) => setPersonalPhoneCode(e.target.value)}
                                        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white text-gray-900"
                                    >
                                        {COUNTRY_CODES.map(c => (
                                            <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="relative flex-1">
                                    <Smartphone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                    <input 
                                        name="personalPhoneNumber"
                                        type="tel" 
                                        defaultValue={initialPersonal.number}
                                        className="w-full pl-9 p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                              </div>
                          </div>
                      </div>

                      {/* Manual Address Fields */}
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Address
                        </label>
                        <div className="space-y-3">
                            <div>
                                <input
                                    name="street"
                                    type="text"
                                    placeholder="Street Address"
                                    value={street}
                                    onChange={(e) => setStreet(e.target.value)}
                                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    name="city"
                                    type="text"
                                    placeholder="City"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                                />
                                <input
                                    name="state"
                                    type="text"
                                    placeholder="State / Province"
                                    value={state}
                                    onChange={(e) => setState(e.target.value)}
                                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    name="zip"
                                    type="text"
                                    placeholder="Zip / Postal Code"
                                    value={zip}
                                    onChange={(e) => setZip(e.target.value)}
                                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                                />
                                <input
                                    name="country"
                                    type="text"
                                    placeholder="Country"
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                                />
                            </div>
                        </div>
                      </div>

                      <div className="pt-2">
                           <button 
                              type="submit" 
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center justify-center gap-2"
                          >
                              <Save className="w-4 h-4" /> Save Changes
                          </button>
                      </div>
                  </form>
                </div>
            </div>
        </div>
    );
};

export const AdminView: React.FC<AdminViewProps> = ({ currentUser, timesheets, projects, users, onApprove, onReject, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'approvals' | 'timeoff' | 'history' | 'team' | 'calendar'>('dashboard');
  
  // Local state to track updates immediately
  const [localRequests, setLocalRequests] = useState<TimeOffRequest[]>([]);

  // Team View State
  const [teamViewMode, setTeamViewMode] = useState<'list' | 'chart'>('list');
  const [editingUser, setEditingUser] = useState<User | null>(null); // For Admin User Edit Modal

  // Team Calendar State
  const [teamCalendarDate, setTeamCalendarDate] = useState(new Date());

  // Reports State
  const [reportUser, setReportUser] = useState<string>(currentUser.id);
  const [reportStartDate, setReportStartDate] = useState(() => {
     const d = new Date();
     d.setMonth(d.getMonth() - 1); // Default to last month
     return d.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [viewingTimesheet, setViewingTimesheet] = useState<Timesheet | null>(null);

  // Load time off requests on mount or tab switch (for Time Off list OR Calendar)
  useEffect(() => {
     if (activeTab === 'timeoff' || activeTab === 'calendar') {
         storageService.loadAllData().then(data => {
             setLocalRequests(data.timeOffRequests || []);
         });
     }
  }, [activeTab]);

  // --- Filtering Logic ---
  // Identify direct reports
  const myDirectReports = useMemo(() => users.filter(u => u.managerId === currentUser.id), [users, currentUser]);
  const isGlobalAdmin = currentUser.role === Role.ADMIN;
  
  // Available users for reports: Admin sees all, Managers see self + direct reports
  const availableReportUsers = useMemo(() => {
     if (isGlobalAdmin) return users;
     return [currentUser, ...myDirectReports];
  }, [isGlobalAdmin, users, currentUser, myDirectReports]);

  // Filter timesheets for Reports Tab
  const reportTimesheets = useMemo(() => {
      return timesheets.filter(t => 
          t.userId === reportUser && 
          t.weekStartDate >= reportStartDate && 
          t.weekStartDate <= reportEndDate
      ).sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
  }, [timesheets, reportUser, reportStartDate, reportEndDate]);


  // For Dashboard: Managers see their team, Admins see all (or filtered if desired, here Admins see all for overview)
  // For Approvals: STRICTLY filtered to direct reports as per requirements
  
  const pendingTimesheets = timesheets.filter(t => 
    t.status === 'SUBMITTED' && 
    users.find(u => u.id === t.userId)?.managerId === currentUser.id
  );

  const pendingTimeOff = localRequests.filter(r => 
    r.status === TimeOffStatus.PENDING && 
    users.find(u => u.id === r.userId)?.managerId === currentUser.id
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
  
  const handleUserEditSave = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!editingUser) return;
      
      const formData = new FormData(e.currentTarget);
      const name = formData.get('name') as string;
      const email = formData.get('email') as string;
      
      const department = formData.get('department') as string;
      
      // Reconstruct phones
      const workCode = formData.get('workPhoneCode') as string;
      const workNumber = formData.get('workPhoneNumber') as string;
      const workPhone = workNumber ? `${workCode} ${workNumber}` : '';

      const personalCode = formData.get('personalPhoneCode') as string;
      const personalNumber = formData.get('personalPhoneNumber') as string;
      const personalPhone = personalNumber ? `${personalCode} ${personalNumber}` : '';

      // Address fields from inputs
      const street = formData.get('street') as string;
      const city = formData.get('city') as string;
      const state = formData.get('state') as string;
      const zip = formData.get('zip') as string;
      const country = formData.get('country') as string;
      
      if (name && email) {
          onUpdateUser({ 
            ...editingUser, 
            name, 
            email,
            department,
            workPhone,
            personalPhone,
            street,
            city,
            state,
            zip,
            country
          });
          setEditingUser(null);
      }
  };

  // --- Report Export ---
  const handleExportPDF = () => {
      const doc = new jsPDF();
      const user = users.find(u => u.id === reportUser);
      
      // Header
      doc.setFontSize(18);
      doc.setTextColor(67, 56, 202); // Indigo-700
      doc.text("Timesheet History", 14, 20);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Employee: ${user?.name || 'Unknown'} (${user?.email})`, 14, 30);
      doc.text(`Period: ${reportStartDate} to ${reportEndDate}`, 14, 36);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 42);

      let yPos = 55;

      // Loop through weeks
      reportTimesheets.forEach(ts => {
          doc.setFontSize(12);
          doc.setTextColor(0);
          doc.setFont("helvetica", "bold");
          doc.text(`Week of ${ts.weekStartDate}`, 14, yPos);
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(`Status: ${ts.status} | Total Hours: ${(ts.totalHours || 0).toFixed(2)}`, 14, yPos + 6);
          
          yPos += 10;

          // Prepare table data
          const tableBody = ts.entries.map(e => {
             const proj = projects.find(p => p.id === e.projectId);
             return [
                 proj?.name || 'Unknown Project',
                 e.billingStatus,
                 ...e.hours.map(h => (h || 0) > 0 ? (h || 0).toFixed(2) : '-'),
                 e.hours.reduce((a, b) => a + (b || 0), 0).toFixed(2)
             ];
          });

          autoTable(doc, {
              startY: yPos,
              head: [['Project', 'Billing', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Total']],
              body: tableBody,
              theme: 'grid',
              headStyles: { fillColor: [67, 56, 202] },
              styles: { fontSize: 8 },
              margin: { left: 14 }
          });

          // @ts-ignore
          yPos = doc.lastAutoTable.finalY + 15;

          // New page check
          if (yPos > 250) {
              doc.addPage();
              yPos = 20;
          }
      });
      
      // Footer Summary
      const totalPeriodHours = reportTimesheets.reduce((acc, t) => acc + (t.totalHours || 0), 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Grand Total Hours for Period: ${totalPeriodHours.toFixed(2)}`, 14, yPos);

      doc.save(`Timesheet_History_${user?.name.replace(/\s+/g, '_')}_${reportStartDate}.pdf`);
  };

  // --- Calendar Helpers ---
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const calYear = teamCalendarDate.getFullYear();
  const calMonth = teamCalendarDate.getMonth();
  const calDaysInMonth = getDaysInMonth(calYear, calMonth);
  const calFirstDay = getFirstDayOfMonth(calYear, calMonth);
  const calBlanks = Array(calFirstDay).fill(null);
  const calDays = Array.from({ length: calDaysInMonth }, (_, i) => i + 1);
  const calCells = [...calBlanks, ...calDays];

  const changeTeamMonth = (offset: number) => {
      setTeamCalendarDate(new Date(calYear, calMonth + offset, 1));
  };

  const checkOverlap = (a: TimeOffRequest, b: TimeOffRequest) => {
    return a.startDate <= b.endDate && a.endDate >= b.startDate;
  };

  // Layout Logic (Memoized) to slot multiple users nicely
  const calendarLayoutMap = useMemo(() => {
    const visibleRequests = isGlobalAdmin 
        ? localRequests 
        : localRequests.filter(r => myDirectReports.some(u => u.id === r.userId) || r.userId === currentUser.id);

    const sorted = [...visibleRequests].sort((a, b) => {
        if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
        if (a.status !== b.status) return a.status === TimeOffStatus.APPROVED ? -1 : 1;
        return 0;
    });

    const slots = new Map<string, number>();
    const occupied: { req: TimeOffRequest, slot: number }[] = [];

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

    return slots;
  }, [localRequests, isGlobalAdmin, myDirectReports, currentUser.id]);

  const getTeamRequestsForDate = (day: number) => {
    const currentStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const visibleRequests = isGlobalAdmin 
        ? localRequests 
        : localRequests.filter(r => myDirectReports.some(u => u.id === r.userId) || r.userId === currentUser.id);

    return visibleRequests.filter(r => 
        currentStr >= r.startDate && 
        currentStr <= r.endDate &&
        r.status !== TimeOffStatus.REJECTED
    );
  };

  const getBarStyle = (req: TimeOffRequest, day: number) => {
    const currentStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isStart = req.startDate === currentStr;
    const isEnd = req.endDate === currentStr;
    const isPending = req.status === TimeOffStatus.PENDING;
    const isSick = req.type === 'Sick Leave';

    let baseClasses = "h-5 mb-1 text-[10px] flex items-center px-1 cursor-default transition-all relative z-10 overflow-hidden whitespace-nowrap ";
    
    if (isStart) baseClasses += "rounded-l-sm ml-1 ";
    else baseClasses += "ml-[-1px] border-l-0 "; 
    
    if (isEnd) baseClasses += "rounded-r-sm mr-1 ";
    else baseClasses += "mr-[-1px] border-r-0 "; 

    if (isSick) return baseClasses + "bg-red-100 text-red-800 border border-red-200";
    if (isPending) return baseClasses + "bg-yellow-50 text-yellow-800 border border-yellow-200 dashed-border";
    
    return baseClasses + "bg-green-100 text-green-800 border border-green-200";
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 border-b border-gray-200 overflow-x-auto w-full">
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
                Approvals
                {pendingTimesheets.length > 0 && (
                    <span className="bg-red-100 text-red-600 text-xs py-0.5 px-2 rounded-full">{pendingTimesheets.length}</span>
                )}
            </button>
            <button 
                onClick={() => setActiveTab('timeoff')}
                className={`pb-2 px-1 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'timeoff' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Requests
                {pendingTimeOff.length > 0 && (
                    <span className="bg-yellow-100 text-yellow-700 text-xs py-0.5 px-2 rounded-full">{pendingTimeOff.length}</span>
                )}
            </button>
            <button 
                onClick={() => setActiveTab('history')}
                className={`pb-2 px-1 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'history' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                History
            </button>
            <button 
                onClick={() => setActiveTab('calendar')}
                className={`pb-2 px-1 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'calendar' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Team Calendar
            </button>
            {isGlobalAdmin && (
                <button 
                    onClick={() => setActiveTab('team')}
                    className={`pb-2 px-1 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'team' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Team Mgmt
                </button>
            )}
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="animate-in fade-in duration-500">
           <DashboardStats timesheets={timesheets} projects={projects} />
           
           {!isGlobalAdmin && myDirectReports.length === 0 && (
               <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 text-sm mt-4">
                   You are not listed as a manager for any active employees, so you will not see any pending approvals here.
               </div>
           )}
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
                <p className="text-gray-500 text-sm mt-1">You have no pending approvals from your direct reports.</p>
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
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Pending Requests</h3>
                {!isGlobalAdmin && <span className="text-xs text-gray-500">Visible: Direct Reports Only</span>}
              </div>
              
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

      {/* --- REPORTS / HISTORY TAB --- */}
      {activeTab === 'history' && (
         <div className="animate-in fade-in duration-500 space-y-4">
             {/* Report Filters */}
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-end">
                 <div className="flex-1 w-full">
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select User</label>
                     <select 
                        value={reportUser}
                        onChange={(e) => setReportUser(e.target.value)}
                        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                     >
                         {availableReportUsers.map(u => (
                             <option key={u.id} value={u.id}>{u.name} {u.id === currentUser.id ? '(You)' : ''}</option>
                         ))}
                     </select>
                 </div>
                 <div className="w-full md:w-auto">
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">From Week</label>
                     <input 
                        type="date" 
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                        className="p-2 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                     />
                 </div>
                 <div className="w-full md:w-auto">
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To Week</label>
                     <input 
                        type="date" 
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                        className="p-2 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                     />
                 </div>
                 <button 
                    onClick={handleExportPDF}
                    disabled={reportTimesheets.length === 0}
                    className="w-full md:w-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                 >
                     <Download className="w-4 h-4" /> Export PDF
                 </button>
             </div>

             {/* Report Results */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                 <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <FileBarChart className="w-5 h-5 text-indigo-600" /> Timesheet History
                    </h3>
                    <div className="text-sm text-gray-500">
                        Found <span className="font-bold text-gray-900">{reportTimesheets.length}</span> records
                    </div>
                 </div>

                 {reportTimesheets.length === 0 ? (
                     <div className="p-8 text-center text-gray-500">
                         No timesheets found for the selected user in this period.
                     </div>
                 ) : (
                     <table className="w-full text-left text-sm">
                         <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
                             <tr>
                                 <th className="p-4">Week Starting</th>
                                 <th className="p-4">Status</th>
                                 <th className="p-4 text-right">Total Hours</th>
                                 <th className="p-4 text-center">Actions</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                             {reportTimesheets.map(ts => (
                                 <tr key={ts.id} className="hover:bg-gray-50 transition-colors">
                                     <td className="p-4 font-medium text-gray-900">{ts.weekStartDate}</td>
                                     <td className="p-4">
                                         <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                             ts.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                             ts.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                             'bg-blue-100 text-blue-700'
                                         }`}>
                                             {ts.status}
                                         </span>
                                     </td>
                                     <td className="p-4 text-right font-bold">{(ts.totalHours || 0).toFixed(2)}</td>
                                     <td className="p-4 text-center">
                                         <button 
                                            onClick={() => setViewingTimesheet(ts)}
                                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" 
                                            title="View Details"
                                         >
                                             <Eye className="w-4 h-4" />
                                         </button>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                         <tfoot className="bg-gray-50 border-t border-gray-200 font-bold">
                             <tr>
                                 <td colSpan={2} className="p-4 text-right uppercase text-xs text-gray-500">Period Total</td>
                                 <td className="p-4 text-right text-indigo-700">
                                     {reportTimesheets.reduce((acc, t) => acc + (t.totalHours || 0), 0).toFixed(2)}
                                 </td>
                                 <td></td>
                             </tr>
                         </tfoot>
                     </table>
                 )}
             </div>
         </div>
      )}
      
      {/* View Timesheet Modal */}
      {viewingTimesheet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <div>
                          <h3 className="font-bold text-gray-800">Timesheet Details</h3>
                          <p className="text-xs text-gray-500">Week of {viewingTimesheet.weekStartDate} • {viewingTimesheet.status}</p>
                      </div>
                      <button onClick={() => setViewingTimesheet(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                          <X className="w-5 h-5 text-gray-500" />
                      </button>
                  </div>
                  <div className="flex-1 overflow-auto bg-gray-100 p-4">
                      {/* We use TimesheetEditor in ReadOnly mode */}
                      <TimesheetEditor 
                          timesheet={viewingTimesheet}
                          projects={projects}
                          tasks={[]} 
                          weekStartDate={viewingTimesheet.weekStartDate}
                          onSave={() => {}}
                          onSubmit={() => {}}
                          onWeekChange={() => {}}
                          onCopyPrevious={() => {}}
                          readOnly={true}
                      />
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'team' && isGlobalAdmin && (
          <div className="animate-in fade-in duration-500 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
             <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-gray-800">Organization & Team Hierarchy</h3>
                </div>
                <div className="flex bg-gray-200 p-0.5 rounded-lg border border-gray-300">
                    <button 
                        onClick={() => setTeamViewMode('list')}
                        className={`p-1.5 rounded-md flex items-center gap-2 text-xs font-medium transition-all ${teamViewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <List className="w-4 h-4" /> List
                    </button>
                    <button 
                        onClick={() => setTeamViewMode('chart')}
                        className={`p-1.5 rounded-md flex items-center gap-2 text-xs font-medium transition-all ${teamViewMode === 'chart' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Network className="w-4 h-4" /> Chart
                    </button>
                </div>
             </div>
             
             {teamViewMode === 'list' ? (
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
                            <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                                <th className="p-4">Employee</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Reports To (Manager)</th>
                                <th className="p-4 text-center">Actions</th>
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
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => setEditingUser(user)}
                                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                            title="Edit User Details"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             ) : (
                <div className="overflow-auto flex-1 bg-gray-50/50 p-8 flex justify-center items-start min-w-full">
                    {/* Filter to find 'Roots' (users who are not managed by anyone in the list) */}
                    <div className="flex gap-16">
                        {users.filter(u => !u.managerId || !users.find(m => m.id === u.managerId)).map(rootUser => (
                            <OrgChartNode key={rootUser.id} user={rootUser} allUsers={users} />
                        ))}
                        {users.filter(u => !u.managerId || !users.find(m => m.id === u.managerId)).length === 0 && (
                            <div className="text-gray-400 italic text-sm">No hierarchy data found. Assign managers in the List view.</div>
                        )}
                    </div>
                </div>
             )}
          </div>
      )}

      {/* Admin Edit User Modal */}
      {editingUser && (
        <EditUserModal 
            user={editingUser} 
            onClose={() => setEditingUser(null)} 
            onSave={handleUserEditSave} 
        />
      )}
    </div>
  );
};
