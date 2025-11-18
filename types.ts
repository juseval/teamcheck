
export type EmployeeStatus = string;

export interface Employee {
  id: string;
  uid?: string; // UID from Firebase Authentication
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
}

export type AttendanceAction = string;

export interface AttendanceLogEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  action: AttendanceAction;
  timestamp: number;
}

export interface TimeEntry {
  id: string;
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
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: TaskStatus;
  assigneeId?: string;
  progress: number;
  color: string;
}

export interface CalendarEvent {
  id: string;
  employeeId: string;
  type: string; // 'Vacation', 'Family Day', etc.
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface PayrollChangeType {
  id: string;
  name: string;
  color: string;
}

export interface WorkSchedule {
  id: string;
  name: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  days: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}
