
// Update MOCK_USERS to match the User interface in types.ts (remove role property)
import { Project, Role, Task, Timesheet, User } from "./types";

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Alice Johnson',
    email: 'alice@company.com',
    avatar: 'https://picsum.photos/seed/alice/200/200',
    department: 'Engineering',
    workPhone: '+1 5550101',
    street: '123 Tech Lane',
    city: 'San Francisco',
    state: 'CA',
    zip: '94107',
    country: 'USA'
  },
  {
    id: 'u2',
    name: 'Bob Smith',
    email: 'bob@company.com',
    avatar: 'https://picsum.photos/seed/bob/200/200',
    department: 'Management',
    workPhone: '+1 5550102'
  },
  {
    id: 'u3',
    name: 'Charlie Davis',
    email: 'charlie@company.com',
    avatar: 'https://picsum.photos/seed/charlie/200/200',
    department: 'Design',
    personalPhone: '+61 45559999'
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

export const COUNTRY_CODES = [
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
];