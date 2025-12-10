import React, { useState } from 'react';
import { Timesheet, Project, TimesheetStatus, User } from '../types';
import { CheckCircle, XCircle, Clock, BrainCircuit, Loader2 } from 'lucide-react';
import { DashboardStats } from './DashboardStats';
import { analyzeTeamProductivity } from '../services/geminiService';

interface AdminViewProps {
  timesheets: Timesheet[];
  projects: Project[];
  users: User[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ timesheets, projects, users, onApprove, onReject }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'approvals'>('dashboard');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const pendingTimesheets = timesheets.filter(t => t.status === 'SUBMITTED');

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';
  const getUserAvatar = (id: string) => users.find(u => u.id === id)?.avatar || '';

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeTeamProductivity(timesheets, projects);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 border-b border-gray-200">
            <button 
                onClick={() => setActiveTab('dashboard')}
                className={`pb-2 px-1 text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Dashboard
            </button>
            <button 
                onClick={() => setActiveTab('approvals')}
                className={`pb-2 px-1 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'approvals' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Approvals
                {pendingTimesheets.length > 0 && (
                    <span className="bg-red-100 text-red-600 text-xs py-0.5 px-2 rounded-full">{pendingTimesheets.length}</span>
                )}
            </button>
        </div>
        {activeTab === 'dashboard' && (
             <button 
             onClick={handleRunAnalysis}
             className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg shadow-sm transition-all"
           >
             {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
             AI Team Insight
           </button>
        )}
      </div>

      {activeTab === 'dashboard' && (
        <div className="animate-in fade-in duration-500">
           {aiAnalysis && (
            <div className="mb-6 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-indigo-900 font-bold flex items-center gap-2">
                        <BrainCircuit className="w-5 h-5" /> Team Productivity Analysis
                    </h3>
                    <button onClick={() => setAiAnalysis(null)} className="text-gray-400 hover:text-gray-600">×</button>
                </div>
                <div className="prose prose-sm prose-indigo max-w-none text-gray-700">
                    <pre className="whitespace-pre-wrap font-sans text-sm">{aiAnalysis}</pre>
                </div>
            </div>
          )}
          
          <DashboardStats timesheets={timesheets} projects={projects} />

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-800">Recent Activity</h3>
             </div>
             <div className="divide-y divide-gray-100">
                 {timesheets.slice(0, 5).map(ts => (
                     <div key={ts.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                         <div className="flex items-center gap-3">
                             <img src={getUserAvatar(ts.userId)} alt="" className="w-8 h-8 rounded-full bg-gray-200" />
                             <div>
                                 <p className="text-sm font-medium text-gray-900">{getUserName(ts.userId)}</p>
                                 <p className="text-xs text-gray-500">Week of {ts.weekStartDate}</p>
                             </div>
                         </div>
                         <div className="flex items-center gap-4">
                             <span className="text-sm font-mono font-medium">{ts.totalHours} hrs</span>
                             <span className={`px-2 py-1 text-xs rounded-full font-medium
                                ${ts.status === TimesheetStatus.APPROVED ? 'bg-green-100 text-green-700' : 
                                  ts.status === TimesheetStatus.REJECTED ? 'bg-red-100 text-red-700' :
                                  ts.status === TimesheetStatus.SUBMITTED ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {ts.status}
                             </span>
                         </div>
                     </div>
                 ))}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'approvals' && (
        <div className="animate-in fade-in duration-500">
          {pendingTimesheets.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                <div className="mx-auto w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-gray-900 font-medium">All caught up!</h3>
                <p className="text-gray-500 text-sm mt-1">No pending timesheets to approve.</p>
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
                         {/* Expanded details could go here, but kept simple for this demo */}
                    </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
