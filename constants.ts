import { Project, Role, Task, Timesheet, TimesheetStatus, User } from "./types";

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Alice Johnson',
    email: 'alice@company.com',
    role: Role.EMPLOYEE,
    avatar: 'https://picsum.photos/seed/alice/200/200'
  },
  {
    id: 'u2',
    name: 'Bob Smith',
    email: 'bob@company.com',
    role: Role.ADMIN,
    avatar: 'https://picsum.photos/seed/bob/200/200'
  },
  {
    id: 'u3',
    name: 'Charlie Davis',
    email: 'charlie@company.com',
    role: Role.EMPLOYEE,
    avatar: 'https://picsum.photos/seed/charlie/200/200'
  }
];

export const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'Website Redesign', clientName: 'Acme Corp', color: 'bg-blue-500' },
  { id: 'p2', name: 'Mobile App Dev', clientName: 'Beta Inc', color: 'bg-green-500' },
  { id: 'p3', name: 'Cloud Migration', clientName: 'Gamma Global', color: 'bg-purple-500' },
  { id: 'p4', name: 'Internal Audit', clientName: 'Internal', color: 'bg-gray-500' },
];

export const MOCK_TASKS: Task[] = [
  { id: 't1', name: 'Frontend Development', projectId: 'p1' },
  { id: 't2', name: 'Backend API', projectId: 'p1' },
  { id: 't3', name: 'UI/UX Design', projectId: 'p2' },
  { id: 't4', name: 'Testing', projectId: 'p2' },
  { id: 't5', name: 'Infrastructure Setup', projectId: 'p3' },
  { id: 't6', name: 'Meeting', projectId: 'p4' },
  { id: 't7', name: 'Meal', projectId: 'p4' }, // Added for Break Time
];

// Helper to create empty daily times
const emptyDay = { start: '', end: '' };
const fullWeekEmpty = Array(7).fill(emptyDay);

export const MOCK_TIMESHEETS: Timesheet[] = [
  {
    id: 'ts-prev',
    userId: 'u1',
    weekStartDate: '2023-10-16', // Previous week relative to 2023-10-23
    status: TimesheetStatus.SUBMITTED,
    totalHours: 40,
    entries: [
      { 
        id: 'e-prev-1', 
        projectId: 'p1', 
        taskId: 't1', 
        hours: [8, 8, 8, 8, 8, 0, 0], 
        dailyTimes: [
          { start: '09:00', end: '17:00' },
          { start: '09:00', end: '17:00' },
          { start: '09:00', end: '17:00' },
          { start: '09:00', end: '17:00' },
          { start: '09:00', end: '17:00' },
          { start: '', end: '' },
          { start: '', end: '' }
        ],
        notes: 'Initial Setup',
        billingStatus: 'Billable'
      },
    ]
  },
  {
    id: 'ts1',
    userId: 'u1',
    weekStartDate: '2023-10-23',
    status: TimesheetStatus.SUBMITTED,
    totalHours: 40,
    entries: [
      { 
        id: 'e1', 
        projectId: 'p1', 
        taskId: 't1', 
        hours: [8, 8, 8, 8, 8, 0, 0], 
        dailyTimes: [
          { start: '09:00', end: '17:00' },
          { start: '09:00', end: '17:00' },
          { start: '09:00', end: '17:00' },
          { start: '09:00', end: '17:00' },
          { start: '09:00', end: '17:00' },
          { start: '', end: '' },
          { start: '', end: '' }
        ],
        notes: 'Component library implementation',
        billingStatus: 'Billable'
      },
    ]
  },
  {
    id: 'ts2',
    userId: 'u3',
    weekStartDate: '2023-10-23',
    status: TimesheetStatus.APPROVED,
    totalHours: 38,
    entries: [
      { 
        id: 'e2', 
        projectId: 'p2', 
        taskId: 't3', 
        hours: [7, 7, 6, 8, 8, 0, 0], 
        dailyTimes: [
            { start: '09:00', end: '16:00' },
            { start: '09:00', end: '16:00' },
            { start: '09:00', end: '15:00' },
            { start: '09:00', end: '17:00' },
            { start: '09:00', end: '17:00' },
            { start: '', end: '' },
            { start: '', end: '' }
        ],
        notes: 'Figma mockups',
        billingStatus: 'Billable'
      },
      { 
        id: 'e3', 
        projectId: 'p4', 
        taskId: 't6', 
        hours: [1, 1, 0, 0, 0, 0, 0], 
        dailyTimes: [
            { start: '16:00', end: '17:00' },
            { start: '16:00', end: '17:00' },
            { start: '', end: '' },
            { start: '', end: '' },
            { start: '', end: '' },
            { start: '', end: '' },
            { start: '', end: '' }
        ],
        notes: 'Team sync',
        billingStatus: 'Non Billable'
      },
    ]
  }
];

export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const PROJECT_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 
  'bg-red-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-500',
  'bg-orange-500', 'bg-teal-500', 'bg-cyan-500', 'bg-rose-500'
];