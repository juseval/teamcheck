export type EmployeeStatus = string;

export interface Company {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  createdAt: number;
}

export interface Invitation {
  id: string;
  email: string;
  companyId: string;
  companyName: string;
  role: 'master' | 'admin' | 'employee';
  status: 'pending' | 'accepted';
  invitedBy: string;
  createdAt: number;
  hireDate?: number;
  terminationDate?: number;
  manualVacationAdjustment?: number;
  phone?: string;
  location?: string;
  workScheduleId?: string | null;
}

export interface Employee {
  id: string;
  uid?: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  role: 'master' | 'admin' | 'employee';
  status: EmployeeStatus;
  lastClockInTime: number | null;
  currentStatusStartTime: number | null;
  /** Segundos de trabajo acumulados en la sesión actual (excluye breaks/actividades) */
  accumulatedWorkSeconds?: number;
  /** Timestamp de cuando empezó el tramo Working actual (se resetea en cada Start/End Activity) */
  workSessionStartTime?: number | null;
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
  emailVerified: boolean;
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
  correctionSuggestedTime?: string;
  correctionSuggestedAction?: string;
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
  id: string;
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
  createdAt?: number;   // timestamp ms — orden de llegada
}

export interface PayrollChangeType {
  id: string;
  companyId?: string;
  name: string;
  color: string;

  // ── Nombres nuevos (Settings y TicketingPage usan estos) ──

  /**
   * "Requiere Aprobación"
   * true  → el colaborador solicita y el admin aprueba antes de que cuente en la tabla anual.
   * false → el admin lo registra directamente y cuenta de inmediato.
   */
  requiereAprobacion?: boolean;

  /**
   * "Solo Admin"
   * true  → solo el admin puede registrar esta novedad.
   * false → el colaborador puede verla y solicitarla.
   */
  soloAdmin?: boolean;

  /**
   * Cupo máximo por AÑO COMPLETO (días/usos).
   */
  yearlyQuota?: number;

  /**
   * Cupo máximo por SEMESTRE.
   * Activa las ventanas semestrales de solicitud para colaboradores:
   *  - S1 (Ene–Jun): ventana del 1 Dic al 31 May
   *  - S2 (Jul–Dic): ventana del 1 Jun al 30 Nov
   * Admins y master siempre pueden registrar sin restricción de ventana.
   */
  semesterQuota?: number;

  // ── Aliases de compatibilidad (otros componentes que aún usan los nombres viejos) ──
  /** @deprecated usa `requiereAprobacion` */
  isExclusive?: boolean;
  /** @deprecated usa `soloAdmin` */
  adminOnly?: boolean;
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