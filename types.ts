
export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
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

export interface Company {
  id: string;
  name: string;
  logo_url?: string;
}

export interface UserCompanyRole {
  company_id: string;
  role: Role;
}

export interface Department {
  id: string;
  name: string;
  managerIds?: string[];
  companyId: string;
}

export interface Team {
  id: string;
  name: string;
  departmentId: string;
  managerIds?: string[];
  companyId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  managerId?: string; 
  teamIds?: string[]; // Multiple teams supported
  departmentId?: string; // Linked to Department ID
  department?: string; // Display name (Legacy support)
  workPhone?: string;
  personalPhone?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  companies?: UserCompanyRole[]; // Linked companies and roles
}

export interface Task {
  id: string;
  name: string;
  projectId: string;
  companyId: string;
  assignedUserIds?: string[];
  assignedDepartmentIds?: string[];
  assignedTeamIds?: string[];
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  color: string;
  companyId: string;
}

export interface DayTime {
  start: string;
  end: string;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  projectId: string;
  hours: number[]; 
  dailyTimes: DayTime[];
  notes: string; 
  billingStatus: 'Billable' | 'Non Billable';
}

export interface TimesheetHistoryItem {
  timestamp: string; 
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REOPENED' | 'CREATED';
  actorName: string;
  note?: string;
}

export interface Timesheet {
  id: string;
  userId: string;
  companyId: string;
  weekStartDate: string; 
  status: TimesheetStatus;
  entries: TimeEntry[];
  totalHours: number;
  history?: TimesheetHistoryItem[];
}

export interface TimeOffRequest {
  id: string;
  userId: string;
  companyId: string;
  startDate: string;
  endDate: string;  
  startTime?: string;
  endTime?: string;  
  type: 'Annual Leave' | 'Sick Leave' | 'Other';
  reason: string;
  status: TimeOffStatus;
  attachment?: string;
  attachmentName?: string;
}
