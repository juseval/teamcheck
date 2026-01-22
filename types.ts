
export type EmployeeStatus = string;

export interface Company {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string; // Added to interface for consistency
  createdAt: number;
}

export interface Employee {
  id: string;
  uid?: string; 
  companyId: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  role: 'admin' | 'employee';
  status: EmployeeStatus;
  lastClockInTime: number | null;
  currentStatusStartTime: number | null;
  avatarUrl?: string;
  workScheduleId?: string | null;
  seatId?: string | null;
  messages?: number;
  hireDate?: number;
  terminationDate?: number;
  manualVacationAdjustment?: number;
  allowMobileClockIn?: boolean;
  autoClockOut24h?: boolean;
  blockEarlyClockIn?: boolean;
  emailVerified: boolean; // Requisito de seguridad
}

export type AttendanceAction = string;

export interface AttendanceLogEntry {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  action: AttendanceAction;
  timestamp: number;
  correctionRequest?: string;
  correctionStatus?: 'pending' | 'approved' | 'rejected';
  adminResponse?: string;
  isAutoLog?: boolean;
}

export interface TimeEntry {
  id: string;
  companyId: string;
  activity: string;
  startTime: number;
  endTime: number;
  duration: number;
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
  companyId?: string;
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
  duration: number;
  color?: string;
  startLogId: string;
  endLogId: string;
}

export type TaskStatus = 'To-do' | 'In Progress' | 'Complete';

export interface Task {
  id: string;
  companyId: string;
  name: string;
  startDate: string;
  endDate: string;
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
  type: string;
  startDate: string;
  endDate: string;
  status: EventStatus;
}

export interface PayrollChangeType {
  id: string;
  companyId?: string;
  name: string;
  color: string;
  isExclusive?: boolean;
  adminOnly?: boolean;
  yearlyQuota?: number;
}

export interface WorkSchedule {
  id: string;
  companyId: string;
  name: string;
  startTime: string;
  endTime: string;
  days: number[];
}

export type MapItemType = 'desk' | 'locker' | 'wall' | 'plant' | 'meeting_table' | 'camera' | 'room_label' | 'custom_shape';

export interface MapItem {
  id: string;
  companyId?: string;
  type: MapItemType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  label?: string;
  color?: string;
  shape?: 'circle' | 'rectangle';
  shapeVariant?: 'rectangle' | 'circle';
}
