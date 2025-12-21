
import React, { useState, useEffect, useRef } from 'react';
import { TimeEntry, Project, Task, Timesheet, TimesheetStatus } from '../types';
import { WEEK_DAYS } from '../constants';
import { Plus, Save, Send, Copy, Calendar, ChevronLeft, ChevronRight, MinusCircle, Coffee, AlertTriangle, LayoutGrid, List, History, X } from 'lucide-react';

interface TimesheetEditorProps {
  timesheet: Timesheet;
  projects: Project[];
  tasks: Task[];
  weekStartDate: string;
  onSave: (timesheet: Timesheet) => void;
  onSubmit: (timesheet: Timesheet) => void;
  onWeekChange: (direction: 'prev' | 'next' | 'current', date?: string) => void;
  onCopyPrevious: () => void;
  readOnly?: boolean; // New prop for report view
}

export const TimesheetEditor: React.FC<TimesheetEditorProps> = ({
  timesheet,
  projects,
  tasks,
  weekStartDate,
  onSave,
  onSubmit,
  onWeekChange,
  onCopyPrevious,
  readOnly = false
}) => {
  const [entries, setEntries] = useState<TimeEntry[]>(timesheet.entries);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
  const [showHistory, setShowHistory] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEntries(timesheet.entries);
    setValidationError(null);
  }, [timesheet]);

  // --- Logic Helpers ---

  const getWeekDates = (startStr: string) => {
    const [y, m, d] = startStr.split('-').map(Number);
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
    return entries.reduce((acc, entry) => acc + entry.hours.reduce((a, b) => a + (b || 0), 0), 0);
  };

  const isTaskAccessible = (task: Task | undefined) => {
      if (!task) return false;
      if (!task.assignedUserIds || task.assignedUserIds.length === 0) return true;
      return task.assignedUserIds.includes(timesheet.userId);
  };

  // --- Actions ---

  const handleAddEntryForDay = (dayIndex: number, type: 'work' | 'break' = 'work') => {
    const defaultProject = projects[0]?.id || '';
    const availableTasks = tasks.filter(t => t.projectId === defaultProject && isTaskAccessible(t));
    const breakTask = tasks.find(t => (t.name.toLowerCase().includes('meal') || t.name.toLowerCase().includes('break')) && isTaskAccessible(t));

    const defaultTask = type === 'break' 
        ? (breakTask?.id || '')
        : (availableTasks[0]?.id || '');
    
    const defaultBilling = type === 'break' ? 'Non Billable' : 'Billable';

    const newEntry: TimeEntry = {
      id: Math.random().toString(36).substr(2, 9),
      projectId: type === 'break' && defaultTask ? (tasks.find(t => t.id === defaultTask)?.projectId || defaultProject) : defaultProject,
      taskId: defaultTask,
      hours: [0, 0, 0, 0, 0, 0, 0],
      dailyTimes: Array(7).fill({ start: '', end: '' }),
      notes: type === 'break' ? 'Break' : '',
      billingStatus: defaultBilling,
    };
    
    if (viewMode === 'detail') {
      if (type === 'break') {
          newEntry.dailyTimes[dayIndex] = { start: '12:00', end: '13:00' };
          newEntry.hours[dayIndex] = 1.00;
      } else {
          newEntry.dailyTimes[dayIndex] = { start: '09:00', end: '17:00' };
          newEntry.hours[dayIndex] = 8.00;
      }
    }

    setEntries([...entries, newEntry]);
    setValidationError(null);
  };

  const handleAddRow = () => {
    const defaultProject = projects[0]?.id || '';
    const availableTasks = tasks.filter(t => t.projectId === defaultProject && isTaskAccessible(t));
    
    const newEntry: TimeEntry = {
      id: Math.random().toString(36).substr(2, 9),
      projectId: defaultProject,
      taskId: availableTasks[0]?.id || '',
      hours: [0, 0, 0, 0, 0, 0, 0],
      dailyTimes: Array(7).fill({ start: '', end: '' }),
      notes: '',
      billingStatus: 'Billable',
    };
    setEntries([...entries, newEntry]);
  };

  const handleDeleteEntry = (entryId: string) => {
    setEntries(prev => prev.filter(e => e.id !== entryId));
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
    }).filter(e => e.hours.some(h => h > 0))); 
    setValidationError(null);
  };

  const updateEntry = (id: string, field: keyof TimeEntry, value: any) => {
    setEntries(entries.map(e => {
      if (e.id === id) {
        if (field === 'projectId') {
            const firstTask = tasks.find(t => t.projectId === value && isTaskAccessible(t));
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

  const updateHoursDirectly = (id: string, dayIndex: number, value: string) => {
    const numVal = parseFloat(value);
    setEntries(entries.map(e => {
        if (e.id === id) {
            const newHours = [...e.hours];
            newHours[dayIndex] = isNaN(numVal) ? 0 : numVal;
            
            // Clear start/end time if entering duration directly to avoid conflicts
            const newDailyTimes = [...e.dailyTimes];
            newDailyTimes[dayIndex] = { start: '', end: '' };
            
            return { ...e, hours: newHours, dailyTimes: newDailyTimes };
        }
        return e;
    }));
  };

  // --- Validation Logic ---

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const validateOverlaps = (): string | null => {
    // Only validate overlaps if we have start/end times
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const dailyIntervals: { start: number; end: number; taskName: string; entryId: string }[] = [];

        entries.forEach(entry => {
            const time = entry.dailyTimes[dayIndex];
            if (time.start && time.end && entry.hours[dayIndex] > 0) {
                const taskName = tasks.find(t => t.id === entry.taskId)?.name || 'Unknown Task';
                dailyIntervals.push({
                    start: timeToMinutes(time.start),
                    end: timeToMinutes(time.end),
                    taskName,
                    entryId: entry.id
                });
            }
        });

        dailyIntervals.sort((a, b) => a.start - b.start);

        for (let i = 0; i < dailyIntervals.length - 1; i++) {
            const current = dailyIntervals[i];
            const next = dailyIntervals[i + 1];
            if (next.start < current.end) {
                return `Time Conflict on ${WEEK_DAYS[dayIndex]}: "${current.taskName}" overlaps with "${next.taskName}".`;
            }
        }
    }
    return null;
  };

  const validateNotes = (): string | null => {
    for (const entry of entries) {
      // Check if entry has any time logged in any day
      const hasTime = entry.hours.some(h => h > 0);
      if (hasTime && (!entry.notes || !entry.notes.trim())) {
         const taskName = tasks.find(t => t.id === entry.taskId)?.name || 'Unknown Task';
         return `Comments are required for task "${taskName}".`;
      }
    }
    return null;
  };

  const handleSaveLocal = () => {
    onSave({ ...timesheet, entries, totalHours: calculateTotal() });
  };

  const handleSubmitLocal = () => {
    // 1. Check overlaps
    let error = validateOverlaps();
    if (error) {
        setValidationError(error);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    // 2. Check notes
    error = validateNotes();
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
      if (readOnly) return; 
      try {
          dateInputRef.current?.showPicker();
      } catch (err) {
          dateInputRef.current?.click();
      }
  };

  const isReadOnly = readOnly || timesheet.status === TimesheetStatus.SUBMITTED || timesheet.status === TimesheetStatus.APPROVED;

  // Render Helpers
  const getEntriesForDay = (dayIndex: number) => {
    return entries.filter(e => e.hours[dayIndex] > 0 || (e.dailyTimes[dayIndex].start && e.dailyTimes[dayIndex].end));
  };

  const getDayTotal = (dayIndex: number) => {
    return entries.reduce((acc, e) => acc + (e.hours[dayIndex] || 0), 0);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full relative">
      {/* Top Bar */}
      <div className="p-4 border-b border-gray-200 bg-white flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-20 shadow-sm">
         <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="flex items-stretch bg-gray-50 border border-gray-200 rounded-lg p-0.5 relative group flex-1 md:flex-none">
                <button 
                    onClick={() => onWeekChange('prev')} 
                    disabled={readOnly && !onWeekChange} 
                    className="p-1.5 hover:bg-white rounded shadow-sm text-gray-600 transition-all z-20 relative flex items-center justify-center disabled:opacity-50"
                >
                    <ChevronLeft className="w-5 h-5"/>
                </button>
                
                <div 
                    className={`relative group flex-1 min-w-[200px] flex items-center justify-center ${readOnly ? '' : 'cursor-pointer'}`}
                    onClick={openDatePicker}
                >
                    <input 
                        ref={dateInputRef}
                        type="date"
                        value={weekStartDate}
                        onChange={handleDatePick}
                        disabled={readOnly}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30 date-input-full disabled:cursor-default"
                    />
                    <div className={`px-4 py-1.5 flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 w-full ${readOnly ? '' : 'group-hover:text-indigo-600'} transition-colors select-none`}>
                        <Calendar className={`w-4 h-4 mb-0.5 ${readOnly ? 'text-gray-400' : 'text-indigo-500'}`} />
                        <span>
                            {new Date(weekDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                            {' - '} 
                            {new Date(weekDates[6]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>
                </div>

                <button 
                    onClick={() => onWeekChange('next')} 
                    disabled={readOnly && !onWeekChange}
                    className="p-1.5 hover:bg-white rounded shadow-sm text-gray-600 transition-all z-20 relative flex items-center justify-center disabled:opacity-50"
                >
                    <ChevronRight className="w-5 h-5"/>
                </button>
             </div>
             
             <div className="hidden md:flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md flex items-center gap-1 text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <LayoutGrid className="w-4 h-4" /> Grid
                </button>
                <button 
                  onClick={() => setViewMode('detail')}
                  className={`p-1.5 rounded-md flex items-center gap-1 text-xs font-bold transition-all ${viewMode === 'detail' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <List className="w-4 h-4" /> Detail
                </button>
             </div>

             <div className="flex items-center gap-2">
                 <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border whitespace-nowrap ${
                    timesheet.status === TimesheetStatus.APPROVED ? 'bg-green-50 text-green-700 border-green-200' : 
                    timesheet.status === TimesheetStatus.SUBMITTED ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    timesheet.status === TimesheetStatus.REJECTED ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-gray-100 text-gray-600 border-gray-200'
                 }`}>
                    {timesheet.status}
                 </span>
                 <button 
                    onClick={() => setShowHistory(true)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                    title="View History"
                 >
                    <History className="w-4 h-4" />
                 </button>
             </div>
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

      {validationError && (
          <div className="bg-red-50 border-b border-red-200 p-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-700 font-medium">{validationError}</p>
              <button onClick={() => setValidationError(null)} className="ml-auto text-red-400 hover:text-red-600 font-bold">✕</button>
          </div>
      )}

      {/* --- GRID VIEW --- */}
      {viewMode === 'grid' && (
        <div className="flex-1 overflow-auto bg-gray-50 p-4">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm min-w-[800px]">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 text-xs text-gray-500 uppercase font-bold border-b border-gray-200">
                            <th className="p-3 w-64 border-r border-gray-100">Project / Task</th>
                            <th className="p-3 w-24">Billing</th>
                            {WEEK_DAYS.map((day, i) => (
                                <th key={day} className={`p-3 text-center ${i % 2 === 0 ? 'bg-gray-50' : 'bg-gray-50/50'}`}>
                                    <div className="flex flex-col">
                                        <span>{day}</span>
                                        <span className="text-[10px] font-normal text-gray-400">
                                            {weekDates[i].getDate()}
                                        </span>
                                    </div>
                                </th>
                            ))}
                            <th className="p-3 text-center font-extrabold w-16">Total</th>
                            <th className="p-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {entries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-indigo-50 transition-colors duration-200 group">
                                <td className="p-2 border-r border-gray-100 align-top">
                                    <div className="space-y-2">
                                        <select
                                            disabled={isReadOnly}
                                            value={entry.projectId}
                                            onChange={(e) => updateEntry(entry.id, 'projectId', e.target.value)}
                                            className="w-full text-xs font-bold text-gray-800 bg-transparent border-none p-0 focus:ring-0 cursor-pointer truncate"
                                        >
                                            <option value="" disabled>Select Project</option>
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id}>{p.clientName} - {p.name}</option>
                                            ))}
                                        </select>
                                        <select 
                                            disabled={isReadOnly}
                                            value={entry.taskId}
                                            onChange={(e) => updateEntry(entry.id, 'taskId', e.target.value)}
                                            className="w-full text-xs text-gray-500 bg-transparent border-b border-gray-200 pb-1 focus:ring-0 focus:border-indigo-500 cursor-pointer truncate"
                                        >
                                            <option value="" disabled>Select Task</option>
                                            {tasks.filter(t => t.projectId === entry.projectId && isTaskAccessible(t)).map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                            {entry.taskId && !isTaskAccessible(tasks.find(t=>t.id === entry.taskId)) && (
                                                <option value={entry.taskId}>{tasks.find(t=>t.id === entry.taskId)?.name || 'Unknown'}</option>
                                            )}
                                        </select>
                                        <input 
                                            disabled={isReadOnly}
                                            type="text"
                                            placeholder="Comments..."
                                            value={entry.notes}
                                            onChange={(e) => updateEntry(entry.id, 'notes', e.target.value)}
                                            className="w-full text-[10px] text-gray-400 bg-transparent border-none p-0 focus:ring-0 placeholder-gray-300"
                                        />
                                    </div>
                                </td>
                                <td className="p-2 align-top">
                                     <select 
                                        disabled={isReadOnly}
                                        value={entry.billingStatus}
                                        onChange={(e) => updateEntry(entry.id, 'billingStatus', e.target.value)}
                                        className="w-full text-[10px] border border-gray-200 rounded p-1 text-gray-500"
                                    >
                                        <option value="Billable">Bill</option>
                                        <option value="Non Billable">No Bill</option>
                                    </select>
                                </td>
                                {entry.hours.map((h, i) => (
                                    <td key={i} className={`p-2 align-top text-center ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                                        <input
                                            disabled={isReadOnly}
                                            type="number"
                                            min="0"
                                            max="24"
                                            step="0.25"
                                            value={h || ''}
                                            onChange={(e) => updateHoursDirectly(entry.id, i, e.target.value)}
                                            className={`w-12 text-center text-sm border-gray-200 rounded shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                                                h > 0 ? 'font-bold text-gray-900 bg-white' : 'text-gray-400 bg-gray-50'
                                            }`}
                                        />
                                    </td>
                                ))}
                                <td className="p-2 text-center align-top font-bold text-gray-800">
                                    {entry.hours.reduce((a,b) => a+(b||0), 0).toFixed(2)}
                                </td>
                                <td className="p-2 text-center align-middle">
                                    {!isReadOnly && (
                                        <button 
                                            onClick={() => handleDeleteEntry(entry.id)}
                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <MinusCircle className="w-5 h-5" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {!isReadOnly && (
                            <tr>
                                <td colSpan={11} className="p-3 bg-gray-50 border-t border-gray-200">
                                    <button 
                                        onClick={handleAddRow}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" /> ADD ROW
                                    </button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200 font-bold text-xs text-gray-700">
                        <tr>
                            <td className="p-3 text-right" colSpan={2}>DAILY TOTALS</td>
                            {Array.from({length: 7}).map((_, i) => (
                                <td key={i} className="p-3 text-center">
                                    {getDayTotal(i).toFixed(2)}
                                </td>
                            ))}
                            <td className="p-3 text-center text-indigo-700 text-sm">
                                {calculateTotal().toFixed(2)}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
      )}

      {/* --- DETAIL VIEW --- */}
      {viewMode === 'detail' && (
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
                                            
                                            <div className="flex items-center gap-3 min-w-[240px]">
                                                <div className="flex items-center bg-gray-900 border border-gray-700 rounded-md shadow-sm overflow-hidden w-48">
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
                                                    <div className="bg-gray-900 px-2 text-gray-500 text-xs font-bold">-</div>
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
                                                    {(entry.hours[dayIndex] || 0).toFixed(2)}
                                                </span>
                                            </div>

                                            <div className="flex-1 w-full">
                                                {isBreak ? (
                                                    <div className="flex items-center gap-2 py-1.5 px-3 bg-orange-50 text-orange-800 rounded-md border border-orange-200 w-fit shadow-sm">
                                                        <Coffee className="w-4 h-4" />
                                                        <span className="text-sm font-semibold">Break / Meal</span>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 w-full">
                                                        <div className="md:col-span-3">
                                                            <select 
                                                                disabled={isReadOnly}
                                                                value={entry.taskId}
                                                                onChange={(e) => updateEntry(entry.id, 'taskId', e.target.value)}
                                                                className="w-full text-sm border-none bg-transparent font-medium text-gray-800 focus:ring-0 cursor-pointer hover:bg-gray-100 rounded px-2 py-1 -ml-2 truncate"
                                                            >
                                                                {tasks.filter(t => t.projectId === entry.projectId && isTaskAccessible(t)).map(t => (
                                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                                ))}
                                                                {entry.taskId && !isTaskAccessible(tasks.find(t=>t.id === entry.taskId)) && (
                                                                    <option value={entry.taskId}>{tasks.find(t=>t.id === entry.taskId)?.name || 'Unknown'}</option>
                                                                )}
                                                                <option value="" disabled>Select Activity</option>
                                                            </select>
                                                        </div>

                                                        <div className="md:col-span-4">
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

                                                        <div className="md:col-span-2">
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

                                                        <div className="md:col-span-3">
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

                                            {!isReadOnly && (
                                                <div className="flex items-center gap-2 pt-1 md:pt-0">
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
        </div>
      )}

      {/* --- HISTORY MODAL --- */}
      {showHistory && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <History className="w-5 h-5 text-indigo-600" /> Audit Trail / History
                      </h3>
                      <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
                      {timesheet.history && timesheet.history.length > 0 ? (
                          timesheet.history.slice().reverse().map((item, index) => (
                              <div key={index} className="flex gap-3 relative pb-4 last:pb-0">
                                  {index !== (timesheet.history?.length || 0) - 1 && (
                                      <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-100"></div>
                                  )}
                                  <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                                      item.action === 'APPROVED' ? 'bg-green-50 text-green-600 border-green-200' :
                                      item.action === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-200' :
                                      item.action === 'SUBMITTED' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                      'bg-gray-50 text-gray-600 border-gray-200'
                                  }`}>
                                      {item.action[0]}
                                  </div>
                                  <div className="flex-1">
                                      <div className="flex justify-between items-start">
                                          <p className="text-sm font-semibold text-gray-800">{item.action}</p>
                                          <p className="text-xs text-gray-400 whitespace-nowrap">{new Date(item.timestamp).toLocaleString()}</p>
                                      </div>
                                      <p className="text-xs text-gray-500">by {item.actorName}</p>
                                      {item.note && (
                                          <div className="mt-1 p-2 bg-gray-50 rounded text-xs text-gray-600 italic border-l-2 border-gray-300">
                                              "{item.note}"
                                          </div>
                                      )}
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="text-center py-8 text-gray-400 text-sm">
                              No history recorded for this timesheet.
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
