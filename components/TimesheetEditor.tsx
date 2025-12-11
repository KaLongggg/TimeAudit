
import React, { useState, useEffect, useRef } from 'react';
import { TimeEntry, Project, Task, Timesheet, TimesheetStatus } from '../types';
import { WEEK_DAYS } from '../constants';
import { Plus, Save, Send, Copy, Calendar, ChevronLeft, ChevronRight, Star, MinusCircle, Coffee, AlertTriangle } from 'lucide-react';

interface TimesheetEditorProps {
  timesheet: Timesheet;
  projects: Project[];
  tasks: Task[];
  weekStartDate: string;
  onSave: (timesheet: Timesheet) => void;
  onSubmit: (timesheet: Timesheet) => void;
  onWeekChange: (direction: 'prev' | 'next' | 'current', date?: string) => void;
  onCopyPrevious: () => void;
}

export const TimesheetEditor: React.FC<TimesheetEditorProps> = ({
  timesheet,
  projects,
  tasks,
  weekStartDate,
  onSave,
  onSubmit,
  onWeekChange,
  onCopyPrevious
}) => {
  const [entries, setEntries] = useState<TimeEntry[]>(timesheet.entries);
  const [validationError, setValidationError] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEntries(timesheet.entries);
    setValidationError(null); // Clear errors when loading a new sheet
  }, [timesheet]);

  // --- Logic Helpers ---

  const getWeekDates = (startStr: string) => {
    // startStr is YYYY-MM-DD
    const [y, m, d] = startStr.split('-').map(Number);
    // Use UTC to avoid timezone shifts
    const start = new Date(Date.UTC(y, m - 1, d));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      return d;
    });
  };

  const weekDates = getWeekDates(weekStartDate);

  const calculateHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    let duration = (endH * 60 + endM) - (startH * 60 + startM);
    if (duration < 0) duration += 24 * 60; 
    
    return Number((duration / 60).toFixed(2));
  };

  const calculateTotal = () => {
    return entries.reduce((acc, entry) => acc + entry.hours.reduce((a, b) => a + b, 0), 0);
  };

  const handleAddEntryForDay = (dayIndex: number, type: 'work' | 'break' = 'work') => {
    // Create a new entry specifically for this day
    const defaultProject = projects[0]?.id || '';
    const defaultTask = type === 'break' 
        ? (tasks.find(t => t.name.toLowerCase().includes('meal') || t.name.toLowerCase().includes('break'))?.id || '')
        : (tasks.filter(t => t.projectId === defaultProject)[0]?.id || '');
    
    const defaultBilling = type === 'break' ? 'Non Billable' : 'Billable';

    const newEntry: TimeEntry = {
      id: Math.random().toString(36).substr(2, 9),
      projectId: type === 'break' && defaultTask ? (tasks.find(t => t.id === defaultTask)?.projectId || defaultProject) : defaultProject,
      taskId: defaultTask,
      hours: [0, 0, 0, 0, 0, 0, 0],
      dailyTimes: Array(7).fill({ start: '', end: '' }),
      notes: type === 'break' ? 'Break' : '',
      billingStatus: defaultBilling,
      starred: false
    };
    
    // Initialize time for user convenience
    if (type === 'break') {
        newEntry.dailyTimes[dayIndex] = { start: '12:00', end: '13:00' };
        newEntry.hours[dayIndex] = 1.00;
    } else {
        newEntry.dailyTimes[dayIndex] = { start: '09:00', end: '17:00' };
        newEntry.hours[dayIndex] = 8.00;
    }

    setEntries([...entries, newEntry]);
    setValidationError(null);
  };

  const handleDeleteEntryDay = (entryId: string, dayIndex: number) => {
    setEntries(prev => prev.map(e => {
        if (e.id === entryId) {
            const newDailyTimes = [...e.dailyTimes];
            newDailyTimes[dayIndex] = { start: '', end: '' };
            const newHours = [...e.hours];
            newHours[dayIndex] = 0;
            return { ...e, dailyTimes: newDailyTimes, hours: newHours };
        }
        return e;
    }).filter(e => e.hours.some(h => h > 0))); // Remove empty entries
    setValidationError(null);
  };

  const updateEntry = (id: string, field: keyof TimeEntry, value: any) => {
    setEntries(entries.map(e => {
      if (e.id === id) {
        if (field === 'projectId') {
            const firstTask = tasks.find(t => t.projectId === value);
            return { ...e, [field]: value, taskId: firstTask?.id || '' };
        }
        return { ...e, [field]: value };
      }
      return e;
    }));
    setValidationError(null);
  };

  const updateTime = (id: string, dayIndex: number, type: 'start' | 'end', value: string) => {
    setEntries(entries.map(e => {
      if (e.id === id) {
        const newDailyTimes = [...e.dailyTimes];
        newDailyTimes[dayIndex] = { ...newDailyTimes[dayIndex], [type]: value };
        
        const dayHours = calculateHours(newDailyTimes[dayIndex].start, newDailyTimes[dayIndex].end);
        const newHours = [...e.hours];
        newHours[dayIndex] = dayHours;

        return { ...e, dailyTimes: newDailyTimes, hours: newHours };
      }
      return e;
    }));
    setValidationError(null);
  };

  // --- Validation Logic ---

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const validateOverlaps = (): string | null => {
    // Check each day individually
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const dailyIntervals: { start: number; end: number; taskName: string; entryId: string }[] = [];

        // Collect all time ranges for this day
        entries.forEach(entry => {
            const time = entry.dailyTimes[dayIndex];
            if (time.start && time.end && entry.hours[dayIndex] > 0) {
                const taskName = tasks.find(t => t.id === entry.taskId)?.name || 
                                 (entry.notes === 'Break' ? 'Break' : 'Unknown Task');
                
                dailyIntervals.push({
                    start: timeToMinutes(time.start),
                    end: timeToMinutes(time.end),
                    taskName,
                    entryId: entry.id
                });
            }
        });

        // Sort by start time
        dailyIntervals.sort((a, b) => a.start - b.start);

        // Check for overlaps
        for (let i = 0; i < dailyIntervals.length - 1; i++) {
            const current = dailyIntervals[i];
            const next = dailyIntervals[i + 1];

            // If next start is before current end
            if (next.start < current.end) {
                return `Time Conflict on ${WEEK_DAYS[dayIndex]}: "${current.taskName}" overlaps with "${next.taskName}". Please fix the times.`;
            }
        }
    }
    return null;
  };

  const handleSaveLocal = () => {
    onSave({ ...timesheet, entries, totalHours: calculateTotal() });
  };

  const handleSubmitLocal = () => {
    const error = validateOverlaps();
    if (error) {
        setValidationError(error);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }
    onSubmit({ ...timesheet, entries, totalHours: calculateTotal(), status: TimesheetStatus.SUBMITTED });
  };

  const handleDatePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.value) {
        onWeekChange('current', e.target.value);
    }
  };

  const openDatePicker = () => {
      try {
          dateInputRef.current?.showPicker();
      } catch (err) {
          // Fallback for browsers not supporting showPicker
          dateInputRef.current?.click();
      }
  };

  const isReadOnly = timesheet.status === TimesheetStatus.SUBMITTED || timesheet.status === TimesheetStatus.APPROVED;

  // Render Logic
  const getEntriesForDay = (dayIndex: number) => {
    return entries.filter(e => e.hours[dayIndex] > 0 || (e.dailyTimes[dayIndex].start && e.dailyTimes[dayIndex].end));
  };

  const getDayTotal = (dayIndex: number) => {
    return entries.reduce((acc, e) => acc + (e.hours[dayIndex] || 0), 0);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* Top Bar */}
      <div className="p-4 border-b border-gray-200 bg-white flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-20 shadow-sm">
         <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="flex items-stretch bg-gray-50 border border-gray-200 rounded-lg p-0.5 relative group flex-1 md:flex-none">
                <button onClick={() => onWeekChange('prev')} className="p-1.5 hover:bg-white rounded shadow-sm text-gray-600 transition-all z-20 relative flex items-center justify-center"><ChevronLeft className="w-5 h-5"/></button>
                
                {/* Calendar Trigger - Input Overlay Method */}
                <div 
                    className="relative group flex-1 min-w-[200px] flex items-center justify-center cursor-pointer"
                    onClick={openDatePicker}
                >
                    <input 
                        ref={dateInputRef}
                        type="date"
                        value={weekStartDate}
                        onChange={handleDatePick}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30 date-input-full"
                        aria-label="Select date"
                        style={{ display: 'block' }}
                    />
                    
                    <div className="px-4 py-1.5 flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 w-full group-hover:text-indigo-600 transition-colors select-none">
                        <Calendar className="w-4 h-4 text-indigo-500 mb-0.5" />
                        <span>
                            {new Date(weekDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                            {' - '} 
                            {new Date(weekDates[6]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>
                </div>

                <button onClick={() => onWeekChange('next')} className="p-1.5 hover:bg-white rounded shadow-sm text-gray-600 transition-all z-20 relative flex items-center justify-center"><ChevronRight className="w-5 h-5"/></button>
             </div>
             <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border whitespace-nowrap ${
                timesheet.status === TimesheetStatus.APPROVED ? 'bg-green-50 text-green-700 border-green-200' : 
                timesheet.status === TimesheetStatus.SUBMITTED ? 'bg-blue-50 text-blue-700 border-blue-200' :
                'bg-gray-100 text-gray-600 border-gray-200'
             }`}>
                {timesheet.status}
             </span>
         </div>

         <div className="flex gap-2 w-full md:w-auto justify-end">
           {!isReadOnly && (
             <>
               <button onClick={onCopyPrevious} className="btn-secondary flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium active:bg-gray-200 transition-colors whitespace-nowrap">
                 <Copy className="w-4 h-4" /> <span className="hidden sm:inline">Copy Last Week</span>
               </button>
               <button onClick={handleSaveLocal} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium">
                 <Save className="w-4 h-4" /> Save
               </button>
               <button onClick={handleSubmitLocal} className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-sm">
                 <Send className="w-4 h-4" /> Submit
               </button>
             </>
           )}
         </div>
      </div>

      {/* Error Banner */}
      {validationError && (
          <div className="bg-red-50 border-b border-red-200 p-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-700 font-medium">{validationError}</p>
              <button onClick={() => setValidationError(null)} className="ml-auto text-red-400 hover:text-red-600 font-bold">✕</button>
          </div>
      )}

      {/* Main List View */}
      <div className="flex-1 overflow-y-auto bg-gray-100 p-4 space-y-4">
        {weekDates.map((date, dayIndex) => {
            const dayEntries = getEntriesForDay(dayIndex);
            const isToday = new Date().toDateString() === date.toDateString();
            const total = getDayTotal(dayIndex);
            
            return (
                <div key={dayIndex} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    {/* Day Header */}
                    <div className={`px-4 py-2 border-b border-gray-200 flex justify-between items-center ${isToday ? 'bg-indigo-50' : 'bg-blue-50/50'}`}>
                        <div className="flex items-center gap-2">
                             <span className="font-bold text-gray-800 text-sm w-8">{WEEK_DAYS[dayIndex]}</span>
                             <span className="text-sm text-gray-600 font-medium">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div className="font-bold text-gray-800 text-sm">
                             {total > 0 ? `${total.toFixed(2)}` : ''}
                        </div>
                    </div>

                    {/* Entries List */}
                    <div className="divide-y divide-gray-100">
                        {dayEntries.map((entry) => {
                            const isBreak = entry.notes === 'Break' || tasks.find(t => t.id === entry.taskId)?.name === 'Meal';
                            const startTime = entry.dailyTimes[dayIndex].start;
                            const endTime = entry.dailyTimes[dayIndex].end;
                            
                            return (
                                <div key={entry.id + dayIndex} className="p-3 md:p-4 hover:bg-gray-50 transition-colors group">
                                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                                        
                                        {/* Styled Time Component - Clean Capsule Look */}
                                        <div className="flex items-center gap-3 min-w-[240px]">
                                            <div className="flex items-center bg-gray-900 border border-gray-700 rounded-md shadow-sm overflow-hidden w-48">
                                                {/* Start Time */}
                                                <div className="px-2 py-1.5 bg-gray-800 border-r border-gray-700 flex-1 relative">
                                                    <input 
                                                        disabled={isReadOnly}
                                                        type="time" 
                                                        value={startTime} 
                                                        onChange={(e) => updateTime(entry.id, dayIndex, 'start', e.target.value)}
                                                        className="bg-transparent text-white text-xs font-mono focus:outline-none w-full text-center appearance-none"
                                                        style={{ colorScheme: 'dark' }}
                                                    />
                                                </div>

                                                {/* Separator */}
                                                <div className="bg-gray-900 px-2 text-gray-500 text-xs font-bold">-</div>

                                                {/* End Time */}
                                                <div className="px-2 py-1.5 bg-gray-800 border-l border-gray-700 flex-1 relative">
                                                    <input 
                                                        disabled={isReadOnly}
                                                        type="time" 
                                                        value={endTime} 
                                                        onChange={(e) => updateTime(entry.id, dayIndex, 'end', e.target.value)}
                                                        className="bg-transparent text-white text-xs font-mono focus:outline-none w-full text-center appearance-none"
                                                        style={{ colorScheme: 'dark' }}
                                                    />
                                                </div>
                                            </div>

                                            <span className="text-sm font-bold text-gray-800 w-10 text-right font-mono">
                                                {entry.hours[dayIndex].toFixed(2)}
                                            </span>
                                        </div>

                                        {/* Task & Project Details OR Break Label */}
                                        <div className="flex-1 w-full">
                                            {isBreak ? (
                                                <div className="flex items-center gap-2 py-1.5 px-3 bg-orange-50 text-orange-800 rounded-md border border-orange-200 w-fit shadow-sm">
                                                    <Coffee className="w-4 h-4" />
                                                    <span className="text-sm font-semibold">Break / Meal</span>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 w-full">
                                                    {/* Task Selector */}
                                                    <div className="md:col-span-3">
                                                        <label className="text-[10px] text-gray-400 font-bold uppercase block md:hidden mb-1">Activity</label>
                                                        <select 
                                                            disabled={isReadOnly}
                                                            value={entry.taskId}
                                                            onChange={(e) => updateEntry(entry.id, 'taskId', e.target.value)}
                                                            className="w-full text-sm border-none bg-transparent font-medium text-gray-800 focus:ring-0 cursor-pointer hover:bg-gray-100 rounded px-2 py-1 -ml-2 truncate"
                                                        >
                                                            {tasks.filter(t => t.projectId === entry.projectId).map(t => (
                                                                <option key={t.id} value={t.id}>{t.name}</option>
                                                            ))}
                                                            <option value="" disabled>Select Activity</option>
                                                        </select>
                                                    </div>

                                                    {/* Project Selector */}
                                                    <div className="md:col-span-4">
                                                        <label className="text-[10px] text-gray-400 font-bold uppercase block md:hidden mb-1">Project</label>
                                                        <div className="flex flex-col">
                                                            <select
                                                                disabled={isReadOnly}
                                                                value={entry.projectId}
                                                                onChange={(e) => updateEntry(entry.id, 'projectId', e.target.value)}
                                                                className="text-xs text-gray-500 border-none bg-transparent focus:ring-0 p-0 cursor-pointer hover:text-indigo-600 truncate"
                                                            >
                                                                {projects.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.clientName} - {p.name}</option>
                                                                ))}
                                                            </select>
                                                            <div className="text-sm font-semibold text-gray-800 truncate">
                                                                {projects.find(p => p.id === entry.projectId)?.name || 'Select Project'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Billing Status */}
                                                    <div className="md:col-span-2">
                                                        <label className="text-[10px] text-gray-400 font-bold uppercase block md:hidden mb-1">Billing</label>
                                                        <select 
                                                            disabled={isReadOnly}
                                                            value={entry.billingStatus || 'Billable'}
                                                            onChange={(e) => updateEntry(entry.id, 'billingStatus', e.target.value)}
                                                            className="w-full text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 bg-white hover:border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                                        >
                                                            <option value="Billable">Billable</option>
                                                            <option value="Non Billable">Non Billable</option>
                                                        </select>
                                                    </div>

                                                    {/* Notes */}
                                                    <div className="md:col-span-3">
                                                        <label className="text-[10px] text-gray-400 font-bold uppercase block md:hidden mb-1">Comments</label>
                                                        <input 
                                                            disabled={isReadOnly}
                                                            type="text" 
                                                            placeholder="Enter comments..."
                                                            value={entry.notes}
                                                            onChange={(e) => updateEntry(entry.id, 'notes', e.target.value)}
                                                            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        {!isReadOnly && (
                                            <div className="flex items-center gap-2 pt-1 md:pt-0">
                                                {!isBreak && (
                                                    <button 
                                                        onClick={() => updateEntry(entry.id, 'starred', !entry.starred)}
                                                        className={`${entry.starred ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                                                        title={entry.starred ? "Unstar" : "Star this entry"}
                                                    >
                                                        <Star className={`w-4 h-4 ${entry.starred ? 'fill-yellow-500' : ''}`} />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleDeleteEntryDay(entry.id, dayIndex)}
                                                    className="text-gray-400 hover:text-red-500"
                                                    title="Remove entry"
                                                >
                                                    <MinusCircle className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer Actions */}
                    {!isReadOnly && (
                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-4">
                            <button 
                                onClick={() => handleAddEntryForDay(dayIndex, 'work')}
                                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 uppercase tracking-wide"
                            >
                                <Plus className="w-3 h-3" /> Work Time
                            </button>
                            <button 
                                onClick={() => handleAddEntryForDay(dayIndex, 'break')}
                                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 uppercase tracking-wide"
                            >
                                <Plus className="w-3 h-3" /> Break Time
                            </button>
                        </div>
                    )}
                </div>
            );
        })}
        
        {/* Weekly Total Footer */}
        <div className="flex justify-end p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
             <div className="text-right">
                 <span className="text-sm text-gray-500 uppercase font-bold mr-4">Weekly Total</span>
                 <span className="text-2xl font-bold text-indigo-600">{calculateTotal().toFixed(2)}</span>
             </div>
        </div>
      </div>
    </div>
  );
};
