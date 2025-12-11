import { Project, Role, Task, Timesheet, User } from "./types";

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

export const MOCK_PROJECTS: Project[] = [];

export const MOCK_TASKS: Task[] = [];

export const MOCK_TIMESHEETS: Timesheet[] = [];

export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const PROJECT_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 
  'bg-red-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-500',
  'bg-orange-500', 'bg-teal-500', 'bg-cyan-500', 'bg-rose-500'
];