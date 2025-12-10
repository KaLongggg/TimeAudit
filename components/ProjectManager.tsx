import React, { useState } from 'react';
import { Project, Task } from '../types';
import { Plus, Edit2, Trash2, X, Briefcase, Search, FolderKanban, ListTodo } from 'lucide-react';
import { PROJECT_COLORS } from '../constants';

interface ProjectManagerProps {
  projects: Project[];
  tasks: Task[];
  onAdd: (project: Omit<Project, 'id'>) => void;
  onUpdate: (project: Project) => void;
  onDelete: (id: string) => void;
  onTaskAction: (action: 'add' | 'delete', taskData: any) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  projects,
  tasks,
  onAdd,
  onUpdate,
  onDelete,
  onTaskAction
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Project, 'id'>>({
    name: '',
    clientName: '',
    color: PROJECT_COLORS[0]
  });
  const [newTaskName, setNewTaskName] = useState('');

  const handleOpenModal = (project?: Project) => {
    if (project) {
      setEditingId(project.id);
      setFormData({
        name: project.name,
        clientName: project.clientName,
        color: project.color
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        clientName: '',
        color: PROJECT_COLORS[0]
      });
    }
    setNewTaskName('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.clientName) return;

    if (editingId) {
      onUpdate({ ...formData, id: editingId });
    } else {
      onAdd(formData);
    }
    handleCloseModal();
  };

  const handleAddTask = () => {
    if (!newTaskName.trim() || !editingId) return;
    onTaskAction('add', { name: newTaskName, projectId: editingId });
    setNewTaskName('');
  };

  const filteredProjects = projects.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchesProject = p.name.toLowerCase().includes(term) || 
                           p.clientName.toLowerCase().includes(term);
    
    // Check if any associated task matches the search term
    const hasMatchingTask = tasks
      .filter(t => t.projectId === p.id)
      .some(t => t.name.toLowerCase().includes(term));

    return matchesProject || hasMatchingTask;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
             <Briefcase className="w-6 h-6 text-indigo-600" /> Projects
           </h2>
           <p className="text-gray-500 text-sm mt-1">Manage client projects and billing codes.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search projects, clients, or tasks..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Projects Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
                <th className="p-4 w-16">Color</th>
                <th className="p-4">Project Name</th>
                <th className="p-4">Client</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <FolderKanban className="w-8 h-8 text-gray-300" />
                        <p>No projects found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr key={project.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className={`w-6 h-6 rounded-full ${project.color} shadow-sm border border-white ring-1 ring-gray-100`}></div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-800">{project.name}</span>
                        <span className="text-xs text-gray-400">
                            {tasks.filter(t => t.projectId === project.id).length} tasks linked
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-md">{project.clientName}</span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenModal(project)}
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDelete(project.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="font-bold text-gray-800">
                {editingId ? 'Edit Project & Tasks' : 'New Project'}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-6">
                <form id="projectForm" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                    <input 
                    autoFocus
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g. Website Redesign"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                    <input 
                    type="text" 
                    required
                    value={formData.clientName}
                    onChange={e => setFormData({...formData, clientName: e.target.value})}
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g. Acme Corp"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Color</label>
                    <div className="flex flex-wrap gap-2">
                    {PROJECT_COLORS.map(color => (
                        <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({...formData, color})}
                        className={`w-8 h-8 rounded-full ${color} transition-all ${
                            formData.color === color 
                            ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110 shadow-md' 
                            : 'hover:scale-105 hover:shadow-sm opacity-80 hover:opacity-100'
                        }`}
                        aria-label="Select color"
                        />
                    ))}
                    </div>
                </div>
                </form>

                {/* Task Management Section (Only visible when editing existing project) */}
                {editingId && (
                    <div className="pt-4 border-t border-gray-100">
                        <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                            <ListTodo className="w-4 h-4 text-indigo-600" /> Manage Tasks
                        </h4>
                        
                        <div className="flex gap-2 mb-3">
                            <input 
                                type="text"
                                value={newTaskName}
                                onChange={e => setNewTaskName(e.target.value)}
                                placeholder="New task name..."
                                className="flex-1 p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <button 
                                type="button"
                                onClick={handleAddTask}
                                className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-medium text-sm transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {tasks.filter(t => t.projectId === editingId).map(task => (
                                <div key={task.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md border border-gray-100 group">
                                    <span className="text-sm text-gray-700">{task.name}</span>
                                    <button 
                                        type="button"
                                        onClick={() => onTaskAction('delete', task)}
                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {tasks.filter(t => t.projectId === editingId).length === 0 && (
                                <p className="text-xs text-gray-400 italic text-center py-2">No tasks defined for this project.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 shrink-0">
                <button 
                    type="button" 
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
                <button 
                    type="submit" 
                    form="projectForm"
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
                >
                    {editingId ? 'Save Changes' : 'Create Project'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};