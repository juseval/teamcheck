
export type EmployeeStatus = string;

export interface Company {
  id: string;
  name: string;
  ownerId: string;
  createdAt: number;
}

export interface Employee {
  id: string;
  uid?: string; // UID from Firebase Authentication
  companyId: string; // Link to the company
  name: string;
  email: string;
  phone: string;
  location: string;
  role: 'admin' | 'employee';
  status: EmployeeStatus;
  lastClockInTime: number | null;
  currentStatusStartTime: number | null;
  avatarUrl?: string; // Optional field for a profile picture
  workScheduleId?: string | null;
  messages?: number;
}

export type AttendanceAction = string;

export interface AttendanceLogEntry {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  action: AttendanceAction;
  timestamp: number;
}

export interface TimeEntry {
  id: string;
  companyId: string;
  activity: string;
  startTime: number;
  endTime: number;
  duration: number; // in seconds
}

export interface User {
  name: string;
  avatarUrl?: string;
  messages: number;
}

export interface Message {
  id: number;
  sender: string;
  text: string;
  timestamp: string;
  isCurrentUser: boolean;
}

export interface ActivityStatus {
  id:string;
  companyId?: string; // Optional for default system statuses
  name: string;
  color: string;
}

export interface TimesheetEntry {
  key: string;
  employeeId: string;
  employeeName: string;
  date: string;
  dayOfWeek: string;
  type: string;
  timeIn: number;
  timeOut: number;
  duration: number; // in seconds
  color?: string;
  startLogId: string;
  endLogId: string;
}

export type TaskStatus = 'To-do' | 'In Progress' | 'Complete';

export interface Task {
  id: string;
  companyId: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: TaskStatus;
  assigneeId?: string;
  progress: number;
  color: string;
}

export type EventStatus = 'pending' | 'approved' | 'rejected';

export interface CalendarEvent {
  id: string;
  companyId: string;
  employeeId: string;
  type: string; // 'Vacation', 'Family Day', etc.
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: EventStatus;
}

export interface PayrollChangeType {
  id: string;
  companyId?: string;
  name: string;
  color: string;
  isExclusive?: boolean; // If true, only one person can have this approved per day
  adminOnly?: boolean;   // If true, employees cannot request this type
}

export interface WorkSchedule {
  id: string;
  companyId: string;
  name: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  days: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}
