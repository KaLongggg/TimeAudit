import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Timesheet, Project } from '../types';

interface DashboardStatsProps {
  timesheets: Timesheet[];
  projects: Project[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const DashboardStats: React.FC<DashboardStatsProps> = ({ timesheets, projects }) => {
  // Aggregate data for charts
  const hoursByProject = projects.map(p => {
    let hours = 0;
    timesheets.forEach(ts => {
      ts.entries.forEach(e => {
        if (e.projectId === p.id) {
          hours += e.hours.reduce((a, b) => a + b, 0);
        }
      });
    });
    return { name: p.name, hours };
  }).filter(d => d.hours > 0);

  const statusData = [
    { name: 'Submitted', value: timesheets.filter(t => t.status === 'SUBMITTED').length },
    { name: 'Approved', value: timesheets.filter(t => t.status === 'APPROVED').length },
    { name: 'Rejected', value: timesheets.filter(t => t.status === 'REJECTED').length },
    { name: 'Draft', value: timesheets.filter(t => t.status === 'DRAFT').length },
  ].filter(d => d.value > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Hours by Project</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hoursByProject} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
              <Tooltip />
              <Bar dataKey="hours" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Timesheet Status</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-2">
            {statusData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                    <span className="text-xs text-gray-600">{entry.name}</span>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
