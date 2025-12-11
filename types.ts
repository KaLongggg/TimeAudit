
export enum Role {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE'
}

export enum TimesheetStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum TimeOffStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
}

export interface Task {
  id: string;
  name: string;
  projectId: string;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  color: string;
}

export interface DayTime {
  start: string;
  end: string;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  projectId: string;
  hours: number[]; // Derived from dailyTimes for backward compatibility and calculations
  dailyTimes: DayTime[]; // Array of 7 {start, end} objects
  notes: string; 
  billingStatus: 'Billable' | 'Non Billable';
  starred?: boolean;
}

export interface Timesheet {
  id: string;
  userId: string;
  weekStartDate: string; // ISO Date YYYY-MM-DD
  status: TimesheetStatus;
  entries: TimeEntry[];
  totalHours: number;
}

export interface TimeOffRequest {
  id: string;
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string;   // HH:MM
  type: 'Annual Leave' | 'Sick Leave' | 'Other';
  reason: string;
  status: TimeOffStatus;
}
