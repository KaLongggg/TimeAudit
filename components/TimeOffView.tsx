
import React, { useState, useRef, useMemo } from 'react';
import { TimeOffRequest, TimeOffStatus } from '../types';
import { ChevronLeft, ChevronRight, Plus, Calendar, X, Clock, AlertCircle, UploadCloud, FileText, Trash2, Paperclip } from 'lucide-react';

interface TimeOffViewProps {
  userId: string;
  requests: TimeOffRequest[];
  // Fix: The parent App.tsx handleCreateTimeOff expects Omit<TimeOffRequest, 'companyId'>
  onCreate: (request: Omit<TimeOffRequest, 'companyId'>) => void;
}

export const TimeOffView: React.FC<TimeOffViewProps> = ({ userId, requests, onCreate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null);
  
  // File Upload State
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '17:00',
    type: 'Annual Leave',
    reason: ''
  });

  // --- Calendar Logic ---
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay(); // 0 = Sunday
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  // Create grid cells
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const calendarCells = [...blanks, ...days];

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

  // Filter requests to strictly show only the user's own data for this view
  const myRequests = useMemo(() => {
    return requests.filter(r => r.userId === userId);
  }, [requests, userId]);

  // --- Layout & Slotting Logic ---
  const checkOverlap = (a: TimeOffRequest, b: TimeOffRequest) => {
    return a.startDate <= b.endDate && a.endDate >= b.startDate;
  };

  const layoutMap = useMemo(() => {
    // ONLY slot the user's own requests to ensure privacy
    const sorted = [...myRequests].sort((a, b) => {
        if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
        const durA = new Date(a.endDate).getTime() - new Date(a.startDate).getTime();
        const durB = new Date(b.endDate).getTime() - new Date(b.startDate).getTime();
        return durB - durA; // Descending duration
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
  }, [myRequests]);


  // --- File Handling ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
  };

  // --- Request Handling ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate) return;

    let attachmentStr = undefined;
    if (selectedFile) {
        try {
            attachmentStr = await convertFileToBase64(selectedFile);
        } catch (err) {
            alert("Failed to process file attachment.");
            return;
        }
    }

    // Fix: Using Omit<TimeOffRequest, 'companyId'> because companyId is added in App.tsx
    const newRequest: Omit<TimeOffRequest, 'companyId'> = {
      id: crypto.randomUUID ? crypto.randomUUID() : `tr-${Date.now()}`,
      userId,
      startDate: formData.startDate,
      endDate: formData.endDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      type: formData.type as any,
      reason: formData.reason,
      status: TimeOffStatus.PENDING,
      attachment: attachmentStr,
      attachmentName: selectedFile?.name
    };

    onCreate(newRequest);
    setIsModalOpen(false);
    setFormData({ startDate: '', endDate: '', startTime: '09:00', endTime: '17:00', type: 'Annual Leave', reason: '' });
    setSelectedFile(null);
  };

  const getRequestsForDate = (day: number) => {
    const currentStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return myRequests.filter(r => currentStr >= r.startDate && currentStr <= r.endDate);
  };

  // --- Styling Helpers ---
  const getBarStyle = (req: TimeOffRequest, day: number) => {
    const currentStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isStart = req.startDate === currentStr;
    const isEnd = req.endDate === currentStr;
    const isPending = req.status === TimeOffStatus.PENDING;
    const isRejected = req.status === TimeOffStatus.REJECTED;
    const isSick = req.type === 'Sick Leave';

    let baseClasses = "h-6 mb-1 text-[10px] flex items-center px-2 cursor-pointer transition-all relative z-10 hover:brightness-95 overflow-hidden whitespace-nowrap ";
    
    if (isStart) baseClasses += "rounded-l-md ml-1 ";
    else baseClasses += "ml-[-1px] border-l-0 "; 
    
    if (isEnd) baseClasses += "rounded-r-md mr-1 ";
    else baseClasses += "mr-[-1px] border-r-0 "; 

    if (isRejected) return baseClasses + "bg-gray-200 text-gray-500 line-through";
    if (isSick) return baseClasses + "bg-red-100 text-red-800 border border-red-200";
    if (isPending) return baseClasses + "bg-yellow-50 text-yellow-800 border border-yellow-200 dashed-border";
    
    return baseClasses + "bg-green-100 text-green-800 border border-green-200";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 flex flex-col min-h-full pb-8">
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
           <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
             <Calendar className="w-6 h-6 text-indigo-600" /> Time Off Management
           </h2>
           <p className="text-gray-500 text-sm mt-1">Book leave and view your schedule.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Request Time Off
        </button>
      </div>

      {/* Main Calendar Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
        {/* Navigation */}
        <div className="p-4 flex items-center justify-between border-b border-gray-200 bg-gray-50">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-lg transition-colors text-gray-600">
                <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-800">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-lg transition-colors text-gray-600">
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {day}
                </div>
            ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-0 border-collapse">
            {calendarCells.map((day, index) => {
                const reqs = day ? getRequestsForDate(day) : [];
                const currentStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                const isToday = day && new Date().toDateString() === new Date(year, month, day).toDateString();

                // Build Slots for Rendering
                const daySlots: (TimeOffRequest | null)[] = [];
                if (reqs.length > 0) {
                    const maxSlot = Math.max(...reqs.map(r => layoutMap.get(r.id) ?? 0));
                    for (let i = 0; i <= maxSlot; i++) {
                        daySlots[i] = reqs.find(r => layoutMap.get(r.id) === i) || null;
                    }
                }

                return (
                    <div 
                        key={index} 
                        className={`min-h-[120px] p-0 border-b border-r border-gray-100 relative ${!day ? 'bg-gray-50/30' : 'bg-white'}`}
                    >
                        {day && (
                            <>
                                <div className="p-2 text-right">
                                    <span className={`text-sm font-medium inline-flex items-center justify-center w-7 h-7 rounded-full ${
                                        isToday 
                                        ? 'bg-indigo-600 text-white' 
                                        : 'text-gray-700'
                                    }`}>
                                        {day}
                                    </span>
                                </div>
                                <div className="flex flex-col mt-1 relative">
                                    {daySlots.map((req, slotIdx) => {
                                        if (!req) {
                                            return <div key={`empty-${slotIdx}`} className="h-6 mb-1"></div>;
                                        }

                                        const isStart = req.startDate === currentStr;
                                        return (
                                            <div 
                                                key={req.id} 
                                                onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); }}
                                                className={getBarStyle(req, day)}
                                                title={`${req.type}: ${req.reason || 'No reason'}`}
                                            >
                                                {isStart && (
                                                    <span className="font-bold truncate pl-1 flex items-center gap-1">
                                                        {req.type === 'Annual Leave' ? 'Annual Leave' : req.type}
                                                        {req.attachment && <Paperclip className="w-2 h-2 text-gray-600" />}
                                                    </span>
                                                )}
                                                {!isStart && <span className="opacity-0">.</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                );
            })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-6 text-xs text-gray-500 px-2">
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div> 
                <span>Approved Annual Leave</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div> 
                <span>Sick Leave</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 border-dashed rounded"></div> 
                <span>Pending Approval</span>
            </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                    <h3 className="font-bold text-gray-800">Request Time Off</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
                              <input 
                                  type="date" 
                                  required
                                  style={{ colorScheme: 'dark' }}
                                  className="w-full p-2 text-sm border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                  value={formData.startDate}
                                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
                              <input 
                                  type="date" 
                                  required
                                  style={{ colorScheme: 'dark' }}
                                  className="w-full p-2 text-sm border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                  value={formData.endDate}
                                  onChange={e => setFormData({...formData, endDate: e.target.value})}
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Time</label>
                              <input 
                                  type="time" 
                                  style={{ colorScheme: 'dark' }}
                                  className="w-full p-2 text-sm border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                  value={formData.startTime}
                                  onChange={e => setFormData({...formData, startTime: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Time</label>
                              <input 
                                  type="time" 
                                  style={{ colorScheme: 'dark' }}
                                  className="w-full p-2 text-sm border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                  value={formData.endTime}
                                  onChange={e => setFormData({...formData, endTime: e.target.value})}
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Leave Type</label>
                          <select 
                              className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900"
                              value={formData.type}
                              onChange={e => setFormData({...formData, type: e.target.value})}
                          >
                              <option value="Annual Leave">Annual Leave</option>
                              <option value="Sick Leave">Sick Leave</option>
                              <option value="Other">Other</option>
                          </select>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reason</label>
                          <textarea 
                              rows={2}
                              className="w-full p-2 text-sm border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Brief details..."
                              value={formData.reason}
                              onChange={e => setFormData({...formData, reason: e.target.value})}
                          />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Attachment (Medical Cert / Evidence)</label>
                        <div 
                          className={`border-2 border-dashed rounded-lg p-4 transition-all text-center cursor-pointer ${
                            dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                          }`}
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                        >
                           <input 
                              ref={fileInputRef}
                              type="file" 
                              className="hidden" 
                              onChange={handleFileChange}
                              accept="image/*,.pdf"
                           />
                           
                           {selectedFile ? (
                              <div className="flex items-center justify-center gap-2 text-indigo-700">
                                <FileText className="w-5 h-5" />
                                <span className="text-sm font-medium truncate max-w-[180px]">{selectedFile.name}</span>
                                <button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                                  className="p-1 hover:bg-indigo-100 rounded-full text-indigo-400 hover:text-red-500"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                           ) : (
                              <div className="flex flex-col items-center gap-1 text-gray-500">
                                <UploadCloud className="w-6 h-6 mb-1 text-gray-400" />
                                <span className="text-sm font-medium">Click to upload or drag & drop</span>
                                <span className="text-xs text-gray-400">PDF, PNG, JPG up to 5MB</span>
                              </div>
                           )}
                        </div>
                      </div>

                      <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-colors mt-2">
                          Submit Request
                      </button>
                  </form>
                </div>
            </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                 <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Request Details</h3>
                    <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${selectedRequest.type === 'Sick Leave' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {selectedRequest.type === 'Sick Leave' ? <AlertCircle className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900">{selectedRequest.type}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                selectedRequest.status === TimeOffStatus.APPROVED ? 'bg-green-100 text-green-700' : 
                                selectedRequest.status === TimeOffStatus.REJECTED ? 'bg-gray-100 text-gray-600' :
                                'bg-yellow-100 text-yellow-700'
                            }`}>
                                {selectedRequest.status}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-gray-100">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">From</p>
                            <p className="text-sm font-medium text-gray-900">{selectedRequest.startDate}</p>
                            <p className="text-xs text-gray-400">{selectedRequest.startTime || '09:00'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">To</p>
                            <p className="text-sm font-medium text-gray-900">{selectedRequest.endDate}</p>
                            <p className="text-xs text-gray-400">{selectedRequest.endTime || '17:00'}</p>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Reason</p>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            {selectedRequest.reason || 'No reason provided.'}
                        </p>
                    </div>

                    {selectedRequest.attachment && (
                        <div>
                           <p className="text-xs text-gray-500 uppercase font-bold mb-1">Attachment</p>
                           <a 
                             href={selectedRequest.attachment} 
                             download={selectedRequest.attachmentName || 'evidence'}
                             className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 hover:bg-indigo-100 transition-colors group"
                           >
                              <Paperclip className="w-4 h-4" />
                              <span className="text-sm font-medium underline decoration-indigo-300 group-hover:decoration-indigo-700">
                                {selectedRequest.attachmentName || 'View Attachment'}
                              </span>
                           </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
