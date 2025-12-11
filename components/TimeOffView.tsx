
import React, { useState } from 'react';
import { TimeOffRequest, TimeOffStatus } from '../types';
import { ChevronLeft, ChevronRight, Plus, Calendar, X, Clock, AlertCircle } from 'lucide-react';

interface TimeOffViewProps {
  userId: string;
  requests: TimeOffRequest[];
  onCreate: (request: TimeOffRequest) => void;
}

export const TimeOffView: React.FC<TimeOffViewProps> = ({ userId, requests, onCreate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null);
  
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

  // --- Request Handling ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate) return;

    const newRequest: TimeOffRequest = {
      id: crypto.randomUUID ? crypto.randomUUID() : `tr-${Date.now()}`,
      userId,
      startDate: formData.startDate,
      endDate: formData.endDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      type: formData.type as any,
      reason: formData.reason,
      status: TimeOffStatus.PENDING
    };

    onCreate(newRequest);
    setIsModalOpen(false);
    setFormData({ startDate: '', endDate: '', startTime: '09:00', endTime: '17:00', type: 'Annual Leave', reason: '' });
  };

  const getRequestsForDate = (day: number) => {
    const currentStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return requests.filter(r => 
        r.userId === userId && 
        currentStr >= r.startDate && 
        currentStr <= r.endDate
    );
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
    
    // Spanning Logic: 
    // Start date gets left radius and margin
    // End date gets right radius and margin
    // Middle dates get no radius and negative margins to overlap visually
    
    if (isStart) baseClasses += "rounded-l-md ml-1 ";
    else baseClasses += "ml-[-1px] border-l-0 "; // Connect to previous
    
    if (isEnd) baseClasses += "rounded-r-md mr-1 ";
    else baseClasses += "mr-[-1px] border-r-0 "; // Connect to next

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
                // Ensure we have at least 5 rows logic if needed, but flex wrap is standard
                // We use borders on cells for the grid lines
                const reqs = day ? getRequestsForDate(day) : [];
                const currentStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                const isToday = day && new Date().toDateString() === new Date(year, month, day).toDateString();

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
                                    {reqs.map(req => {
                                        const isStart = req.startDate === currentStr;
                                        return (
                                            <div 
                                                key={req.id} 
                                                onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); }}
                                                className={getBarStyle(req, day)}
                                                title={`${req.type}: ${req.reason || 'No reason'}`}
                                            >
                                                {/* Only show text on start date or if it's the beginning of the week row (simplified to start date for now) */}
                                                {isStart && (
                                                    <span className="font-bold truncate pl-1">
                                                        {req.type === 'Annual Leave' ? 'Annual Leave' : req.type}
                                                    </span>
                                                )}
                                                {!isStart && <span className="opacity-0">.</span>} {/* Spacer */}
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
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800">Request Time Off</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
                            <input 
                                type="date" 
                                required
                                className="w-full p-2 text-sm border border-gray-300 rounded-lg"
                                value={formData.startDate}
                                onChange={e => setFormData({...formData, startDate: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
                            <input 
                                type="date" 
                                required
                                className="w-full p-2 text-sm border border-gray-300 rounded-lg"
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
                                className="w-full p-2 text-sm border border-gray-300 rounded-lg"
                                value={formData.startTime}
                                onChange={e => setFormData({...formData, startTime: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Time</label>
                            <input 
                                type="time" 
                                className="w-full p-2 text-sm border border-gray-300 rounded-lg"
                                value={formData.endTime}
                                onChange={e => setFormData({...formData, endTime: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Leave Type</label>
                        <select 
                            className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white"
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
                            rows={3}
                            className="w-full p-2 text-sm border border-gray-300 rounded-lg"
                            placeholder="Brief details..."
                            value={formData.reason}
                            onChange={e => setFormData({...formData, reason: e.target.value})}
                        />
                    </div>

                    <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-colors mt-2">
                        Submit Request
                    </button>
                </form>
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
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
