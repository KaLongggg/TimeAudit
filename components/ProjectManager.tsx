
import React, { useState, useEffect, useMemo } from 'react';
import { Project, Task, User, Department, Team, Company } from '../types';
import { Plus, Edit2, Trash2, X, Briefcase, Search, Users, Building, GitBranch, ChevronDown, ChevronRight, Check, ListTodo, AlertCircle, Network, Layers, UserCheck, ShieldAlert, UserPlus, Home, UserMinus } from 'lucide-react';
import { PROJECT_COLORS } from '../constants';
import { storageService } from '../services/storage';

interface ProjectManagerProps {
  projects: Project[];
  tasks: Task[];
  users?: User[];
  companyId: string;
  forcedTab?: 'projects' | 'org';
  onAdd: (project: Omit<Project, 'id' | 'companyId'>) => void;
  onUpdate: (project: Project) => void;
  onDelete: (id: string) => void;
  onTaskAction: (action: 'add' | 'delete' | 'update', taskData: any) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({ projects, tasks, users = [], companyId, forcedTab, onAdd, onUpdate, onDelete, onTaskAction }) => {
  const [activeTab, setActiveTab] = useState<'projects' | 'org'>(forcedTab || 'projects');
  const [orgSubTab, setOrgSubTab] = useState<'management' | 'hierarchy'>('management');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Project, 'id' | 'companyId'>>({ name: '', clientName: '', color: PROJECT_COLORS[0] });
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  
  // Update local activeTab if forcedTab changes
  useEffect(() => {
    if (forcedTab) {
        setActiveTab(forcedTab);
    }
  }, [forcedTab]);

  // Org State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [companyName, setCompanyName] = useState('My Company');
  const [newDeptName, setNewDeptName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [orgError, setOrgError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrg = async () => {
      const data = await storageService.loadAllData(companyId);
      setDepartments(data.departments);
      setTeams(data.teams);
      const company = data.companies.find(c => c.id === companyId);
      if (company) setCompanyName(company.name);
    };
    loadOrg();
  }, [companyId, activeTab]);

  const handleOpenModal = (project?: Project) => {
    if (project) {
      setEditingId(project.id);
      setFormData({ name: project.name, clientName: project.clientName, color: project.color });
    } else {
      setEditingId(null);
      setFormData({ name: '', clientName: '', color: PROJECT_COLORS[0] });
    }
    setIsModalOpen(true);
  };

  const handleAddTask = (e: React.FormEvent, projectId: string) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;
    onTaskAction('add', { name: newTaskName, projectId });
    setNewTaskName('');
  };

  const handleToggleAssignment = (task: Task, id: string, type: 'user' | 'dept' | 'team', action: 'add' | 'remove') => {
    const field = type === 'user' ? 'assignedUserIds' : type === 'dept' ? 'assignedDepartmentIds' : 'assignedTeamIds';
    const currentIds = task[field] || [];
    
    let newIds: string[];
    if (action === 'add') {
      newIds = Array.from(new Set([...currentIds, id]));
    } else {
      newIds = currentIds.filter(x => x !== id);
    }
    
    onTaskAction('update', { ...task, [field]: newIds });
  };

  const handleAddDept = async () => {
    if (!newDeptName) return;
    setOrgError(null);
    const newDept: Department = { id: crypto.randomUUID(), name: newDeptName, managerIds: [], companyId };
    
    const result = await storageService.saveDepartment(newDept);
    if (result.error) {
        setOrgError(result.error.code === '42501' 
            ? "Access Denied: You do not have permission to create departments." 
            : `Failed to save: ${result.error.message}`);
    } else {
        setDepartments([...departments, newDept]);
        setNewDeptName('');
    }
  };

  const handleAddTeam = async () => {
    if (!newTeamName || !selectedDeptId) return;
    setOrgError(null);
    const newTeam: Team = { id: crypto.randomUUID(), name: newTeamName, departmentId: selectedDeptId, managerIds: [], companyId };
    
    const result = await storageService.saveTeam(newTeam);
    if (result.error) {
        setOrgError(result.error.code === '42501' 
            ? "Access Denied: You do not have permission to create teams." 
            : `Failed to save: ${result.error.message}`);
    } else {
        setTeams([...teams, newTeam]);
        setNewTeamName('');
    }
  };

  const handleToggleDeptLead = async (deptId: string, userId: string) => {
      const dept = departments.find(d => d.id === deptId);
      if (!dept) return;
      const currentLeads = dept.managerIds || [];
      const newLeads = currentLeads.includes(userId) 
        ? currentLeads.filter(id => id !== userId) 
        : [...currentLeads, userId];
      
      const updated = { ...dept, managerIds: newLeads };
      setDepartments(departments.map(d => d.id === deptId ? updated : d));
      await storageService.saveDepartment(updated);
  };

  const handleToggleTeamLead = async (teamId: string, userId: string) => {
      const team = teams.find(t => t.id === teamId);
      if (!team) return;
      const currentLeads = team.managerIds || [];
      const newLeads = currentLeads.includes(userId) 
        ? currentLeads.filter(id => id !== userId) 
        : [...currentLeads, userId];
      
      const updated = { ...team, managerIds: newLeads };
      setTeams(teams.map(t => t.id === teamId ? updated : t));
      await storageService.saveTeam(updated);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      {/* Tab Switcher - only visible if not forced tab or optionally kept for sub-nav */}
      {!forcedTab && (
        <div className="flex gap-4 border-b border-gray-200 shrink-0">
            <button onClick={() => setActiveTab('projects')} className={`pb-2 px-1 text-sm font-medium flex items-center gap-2 ${activeTab === 'projects' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}>
                <Briefcase className="w-4 h-4" /> Projects & Tasks
            </button>
            <button onClick={() => setActiveTab('org')} className={`pb-2 px-1 text-sm font-medium flex items-center gap-2 ${activeTab === 'org' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}>
                <GitBranch className="w-4 h-4" /> Org Structure
            </button>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {activeTab === 'projects' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="relative max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="text" placeholder="Search projects..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition-all">+ New Project</button>
            </div>

            <div className="space-y-4">
                {projects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => {
                    const isExpanded = expandedProjectId === p.id;
                    const projectTasks = tasks.filter(t => t.projectId === p.id);
                    
                    return (
                        <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300">
                            <div className={`p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 group ${isExpanded ? 'bg-indigo-50/30' : ''}`} onClick={() => setExpandedProjectId(isExpanded ? null : p.id)}>
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="flex items-center text-gray-400 group-hover:text-indigo-500 transition-colors">
                                        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                    </div>
                                    <div className={`w-3 h-3 rounded-full ${p.color} ring-4 ring-white shadow-sm`}></div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{p.name}</h3>
                                        <p className="text-xs text-gray-500">{p.clientName} • {projectTasks.length} tasks</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); handleOpenModal(p); }} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); onDelete(p.id); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="border-t border-gray-100 bg-white p-4 animate-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-4">
                                        {projectTasks.map(task => (
                                            <div key={task.id} className="p-4 bg-gray-50/50 rounded-xl border border-gray-200">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <Check className="w-5 h-5 text-indigo-500" />
                                                        <span className="font-black text-gray-900 text-base">{task.name}</span>
                                                    </div>
                                                    <button onClick={() => onTaskAction('delete', task)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    {/* Assigned Users Section */}
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Individual Users</label>
                                                        <div className="flex flex-wrap gap-2 min-h-[36px]">
                                                            {(task.assignedUserIds || []).map(uid => {
                                                                const u = users.find(x => x.id === uid);
                                                                return u ? (
                                                                    <div key={uid} className="flex items-center gap-2 bg-white px-2 py-1 rounded-full border border-gray-200 shadow-sm text-xs font-semibold text-gray-700 animate-in zoom-in-90">
                                                                        <img src={u.avatar} className="w-4 h-4 rounded-full" />
                                                                        <span className="truncate max-w-[80px]">{u.name.split(' ')[0]}</span>
                                                                        <button onClick={() => handleToggleAssignment(task, uid, 'user', 'remove')} className="hover:text-red-500 transition-colors">
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                ) : null;
                                                            })}
                                                        </div>
                                                        <div className="relative">
                                                            <select 
                                                                className="w-full text-xs font-bold text-indigo-600 bg-white border border-gray-200 rounded-lg py-2 px-3 appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
                                                                onChange={(e) => { if(e.target.value) handleToggleAssignment(task, e.target.value, 'user', 'add'); e.target.value=""; }}
                                                            >
                                                                <option value="">+ Add User...</option>
                                                                {users.filter(u => !(task.assignedUserIds || []).includes(u.id)).map(u => (
                                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                                ))}
                                                            </select>
                                                            <UserPlus className="w-3.5 h-3.5 text-indigo-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                        </div>
                                                    </div>

                                                    {/* Assigned Depts Section */}
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Departments</label>
                                                        <div className="flex flex-wrap gap-2 min-h-[36px]">
                                                            {(task.assignedDepartmentIds || []).map(did => {
                                                                const dept = departments.find(x => x.id === did);
                                                                return dept ? (
                                                                    <div key={did} className="flex items-center gap-2 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100 shadow-sm text-xs font-bold text-indigo-700 animate-in zoom-in-90">
                                                                        <Building className="w-3 h-3" />
                                                                        <span className="truncate max-w-[100px]">{dept.name}</span>
                                                                        <button onClick={() => handleToggleAssignment(task, did, 'dept', 'remove')} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                                                                    </div>
                                                                ) : null;
                                                            })}
                                                        </div>
                                                        <div className="relative">
                                                            <select 
                                                                className="w-full text-xs font-bold text-indigo-600 bg-white border border-gray-200 rounded-lg py-2 px-3 appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
                                                                onChange={(e) => { if(e.target.value) handleToggleAssignment(task, e.target.value, 'dept', 'add'); e.target.value=""; }}
                                                            >
                                                                <option value="">+ Add Dept...</option>
                                                                {departments.filter(d => !(task.assignedDepartmentIds || []).includes(d.id)).map(d => (
                                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                                ))}
                                                            </select>
                                                            <Plus className="w-3.5 h-3.5 text-indigo-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                        </div>
                                                    </div>

                                                    {/* Assigned Teams Section */}
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Teams</label>
                                                        <div className="flex flex-wrap gap-2 min-h-[36px]">
                                                            {(task.assignedTeamIds || []).map(tid => {
                                                                const team = teams.find(x => x.id === tid);
                                                                return team ? (
                                                                    <div key={tid} className="flex items-center gap-2 bg-green-50 px-2 py-1 rounded-full border border-green-100 shadow-sm text-xs font-bold text-green-700 animate-in zoom-in-90">
                                                                        <Users className="w-3 h-3" />
                                                                        <span className="truncate max-w-[100px]">{team.name}</span>
                                                                        <button onClick={() => handleToggleAssignment(task, tid, 'team', 'remove')} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                                                                    </div>
                                                                ) : null;
                                                            })}
                                                        </div>
                                                        <div className="relative">
                                                            <select 
                                                                className="w-full text-xs font-bold text-indigo-600 bg-white border border-gray-200 rounded-lg py-2 px-3 appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
                                                                onChange={(e) => { if(e.target.value) handleToggleAssignment(task, e.target.value, 'team', 'add'); e.target.value=""; }}
                                                            >
                                                                <option value="">+ Add Team...</option>
                                                                {teams.filter(t => !(task.assignedTeamIds || []).includes(t.id)).map(t => (
                                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                                ))}
                                                            </select>
                                                            <Plus className="w-3.5 h-3.5 text-indigo-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        <form onSubmit={(e) => handleAddTask(e, p.id)} className="flex gap-2 p-2 bg-indigo-50/50 rounded-xl border border-indigo-100 border-dashed">
                                            <input type="text" placeholder="Add new task..." value={newTaskName} onChange={e => setNewTaskName(e.target.value)} className="flex-1 text-sm bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500" />
                                            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm">Add Task</button>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
                  <button onClick={() => setOrgSubTab('management')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${orgSubTab === 'management' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      <Layers className="w-3.5 h-3.5 inline mr-1" /> Management
                  </button>
                  <button onClick={() => setOrgSubTab('hierarchy')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${orgSubTab === 'hierarchy' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      <Network className="w-3.5 h-3.5 inline mr-1" /> Hierarchy Tree
                  </button>
              </div>

              {orgSubTab === 'management' ? (
                  <div className="space-y-8 pb-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[500px]">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Building className="w-4 h-4 text-indigo-500" /> Departments</h3>
                            <div className="flex gap-2 mb-6">
                                <input type="text" placeholder="Dept Name" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} className="flex-1 p-2 text-sm border border-gray-300 rounded-lg" />
                                <button onClick={handleAddDept} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">Add</button>
                            </div>
                            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                                {departments.map(d => (
                                    <div key={d.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-gray-800">{d.name}</span>
                                            <button onClick={async () => { if(confirm('Delete?')) { await storageService.deleteDepartment(d.id); setDepartments(departments.filter(x => x.id !== d.id)); } }} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4"/></button>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Department Leads</label>
                                            <div className="flex flex-wrap gap-2">
                                                {(d.managerIds || []).map(mid => {
                                                    const u = users.find(x => x.id === mid);
                                                    return u ? (
                                                        <div key={mid} className="flex items-center gap-1 bg-white border border-gray-200 rounded-full pl-1 pr-2 py-0.5 text-[10px] font-medium text-gray-700 shadow-sm">
                                                            <img src={u.avatar} className="w-4 h-4 rounded-full" />
                                                            <span>{u.name}</span>
                                                            <button onClick={() => handleToggleDeptLead(d.id, mid)} className="text-gray-400 hover:text-red-500 ml-0.5">×</button>
                                                        </div>
                                                    ) : null;
                                                })}
                                                <select className="text-[10px] bg-indigo-50 text-indigo-600 border-none rounded-full px-2 py-0.5 font-bold cursor-pointer" onChange={(e) => { if(e.target.value) handleToggleDeptLead(d.id, e.target.value); e.target.value = ""; }}>
                                                    <option value="">+ Add Lead</option>
                                                    {users.filter(u => !(d.managerIds || []).includes(u.id)).map(u => (
                                                        <option key={u.id} value={u.id}>{u.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[500px]">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-indigo-500" /> Teams</h3>
                            <div className="space-y-3 mb-6">
                                <select value={selectedDeptId} onChange={e => setSelectedDeptId(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white">
                                    <option value="">Select Department</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                                <div className="flex gap-2">
                                    <input type="text" placeholder="Team Name" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} className="flex-1 p-2 text-sm border border-gray-300 rounded-lg" />
                                    <button onClick={handleAddTeam} disabled={!selectedDeptId} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">Add</button>
                                </div>
                            </div>
                            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                                {teams.map(t => (
                                    <div key={t.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="text-sm font-bold text-gray-800">{t.name}</span>
                                                <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">{departments.find(d => d.id === t.departmentId)?.name}</p>
                                            </div>
                                            <button onClick={async () => { if(confirm('Delete?')) { await storageService.deleteTeam(t.id); setTeams(teams.filter(x => x.id !== t.id)); } }} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4"/></button>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Team Leads</label>
                                            <div className="flex flex-wrap gap-2">
                                                {(t.managerIds || []).map(mid => {
                                                    const u = users.find(x => x.id === mid);
                                                    return u ? (
                                                        <div key={mid} className="flex items-center gap-1 bg-white border border-gray-200 rounded-full pl-1 pr-2 py-0.5 text-[10px] font-medium text-gray-700 shadow-sm">
                                                            <img src={u.avatar} className="w-4 h-4 rounded-full" />
                                                            <span>{u.name}</span>
                                                            <button onClick={() => handleToggleTeamLead(t.id, mid)} className="text-gray-400 hover:text-red-500 ml-0.5">×</button>
                                                        </div>
                                                    ) : null;
                                                })}
                                                <select className="text-[10px] bg-indigo-50 text-indigo-600 border-none rounded-full px-2 py-0.5 font-bold cursor-pointer" onChange={(e) => { if(e.target.value) handleToggleTeamLead(t.id, e.target.value); e.target.value = ""; }}>
                                                    <option value="">+ Add Lead</option>
                                                    {users.filter(u => !(t.managerIds || []).includes(u.id)).map(u => (
                                                        <option key={u.id} value={u.id}>{u.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                  </div>
              ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 animate-in slide-in-from-bottom-4 duration-500 overflow-auto min-h-[700px]">
                      <div className="flex flex-col items-center">
                          {/* ROOT: COMPANY */}
                          <div className="flex flex-col items-center shrink-0">
                              <div className="bg-indigo-900 text-white px-10 py-5 rounded-2xl shadow-xl flex items-center gap-4 border-4 border-indigo-100 relative z-10">
                                  <Building className="w-7 h-7 text-indigo-300" />
                                  <span className="text-xl font-black tracking-tighter uppercase">{companyName}</span>
                              </div>
                              <div className="w-0.5 h-16 bg-gray-300 block -mt-1"></div>
                          </div>

                          {/* DEPARTMENTS CONTAINER */}
                          <div className="flex gap-16 justify-center items-start pt-0 -mt-0.5">
                              {departments.map((dept, dIdx) => {
                                  const deptTeams = teams.filter(t => t.departmentId === dept.id);
                                  return (
                                      <div key={dept.id} className="flex flex-col items-center relative">
                                          {/* Horizontal Header Connector */}
                                          {departments.length > 1 && (
                                              <div className="absolute top-0 left-0 right-0 flex justify-center -mt-px">
                                                  {dIdx === 0 ? (
                                                      <div className="w-1/2 h-0.5 bg-gray-300 absolute right-0"></div>
                                                  ) : dIdx === departments.length - 1 ? (
                                                      <div className="w-1/2 h-0.5 bg-gray-300 absolute left-0"></div>
                                                  ) : (
                                                      <div className="w-full h-0.5 bg-gray-300"></div>
                                                  )}
                                              </div>
                                          )}

                                          <div className="w-0.5 h-10 bg-gray-300 block"></div>
                                          
                                          {/* DEPT NODE */}
                                          <div className="bg-white border-2 border-indigo-200 p-5 rounded-2xl shadow-lg min-w-[240px] text-center relative z-10 hover:border-indigo-600 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                                              <h4 className="font-black text-gray-900 text-base mb-4 uppercase tracking-tighter border-b border-indigo-50 pb-2">{dept.name}</h4>
                                              <div className="flex flex-wrap justify-center gap-2">
                                                  {(dept.managerIds || []).map(mid => {
                                                      const u = users.find(x => x.id === mid);
                                                      return u ? (
                                                          <div key={mid} className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 group/lead">
                                                              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-black shadow-sm">
                                                                  {u.name.split(' ').map(n=>n[0]).join('')}
                                                              </div>
                                                              <span className="text-xs font-bold text-indigo-900 whitespace-nowrap">{u.name}</span>
                                                          </div>
                                                      ) : null;
                                                  })}
                                              </div>
                                          </div>

                                          {/* VERTICAL CONNECTOR TO TEAMS */}
                                          {deptTeams.length > 0 && <div className="w-0.5 h-10 bg-gray-300 block"></div>}

                                          {/* TEAMS GRID */}
                                          <div className="flex gap-6 justify-center items-start pt-0 -mt-0.5">
                                              {deptTeams.map((team, tIdx) => (
                                                  <div key={team.id} className="flex flex-col items-center relative">
                                                      {/* Nested Horizontal Connector */}
                                                      {deptTeams.length > 1 && (
                                                          <div className="absolute top-0 left-0 right-0 flex justify-center -mt-px">
                                                              {tIdx === 0 ? (
                                                                  <div className="absolute right-0 w-1/2 h-0.5 bg-gray-300"></div>
                                                              ) : tIdx === deptTeams.length - 1 ? (
                                                                  <div className="absolute left-0 w-1/2 h-0.5 bg-gray-300"></div>
                                                              ) : (
                                                                  <div className="w-full h-0.5 bg-gray-300"></div>
                                                              )}
                                                          </div>
                                                      )}
                                                      
                                                      <div className="w-0.5 h-10 bg-gray-300 block"></div>
                                                      <div className="bg-gray-100 border-2 border-white p-4 rounded-xl shadow-md min-w-[180px] text-center hover:bg-white hover:border-indigo-200 transition-all duration-300 hover:shadow-xl">
                                                          <h5 className="font-black text-gray-800 text-xs mb-3">{team.name}</h5>
                                                          <div className="flex flex-wrap justify-center gap-1.5">
                                                              {(team.managerIds || []).map(mid => {
                                                                  const u = users.find(x => x.id === mid);
                                                                  return u ? (
                                                                      <div key={mid} className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center text-[9px] text-white font-black border-2 border-white shadow-md" title={u.name}>
                                                                          {u.name.split(' ').map(n=>n[0]).join('')}
                                                                      </div>
                                                                  ) : null;
                                                              })}
                                                          </div>
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  </div>
              )}
          </div>
        )}
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                      <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                          <Briefcase className="w-5 h-5 text-indigo-600" />
                          {editingId ? 'Edit Project' : 'New Project'}
                      </h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-1 rounded-full transition-all">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  <form onSubmit={e => { e.preventDefault(); editingId ? onUpdate({ ...formData, id: editingId, companyId }) : onAdd(formData); setIsModalOpen(false); }} className="space-y-6">
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Project Name</label>
                              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" required placeholder="e.g. Website Redesign" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Client Name</label>
                              <input type="text" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" required placeholder="e.g. Acme Corp" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Label Color</label>
                              <div className="flex flex-wrap gap-3">
                                  {PROJECT_COLORS.map(color => (
                                      <button
                                          key={color}
                                          type="button"
                                          onClick={() => setFormData({...formData, color})}
                                          className={`w-8 h-8 rounded-full ${color} transition-all transform hover:scale-110 shadow-sm ${formData.color === color ? 'ring-offset-2 ring-2 ring-indigo-500 scale-110' : 'opacity-70 hover:opacity-100'}`}
                                      />
                                  ))}
                              </div>
                          </div>
                      </div>
                      <div className="pt-4">
                        <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]">
                            {editingId ? 'Update Project' : 'Create Project'}
                        </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
