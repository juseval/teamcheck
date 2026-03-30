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
  idType?: string;
  idNumber?: string;
}

export interface Employee {
  id: string;
  uid?: string;
  companyId: string;
  /** Todas las empresas a las que pertenece este usuario (usado para masters multi-empresa) */
  companyIds?: string[];
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
  /** Tipo de documento de identidad */
  idType?: string;
  /** Número de documento de identidad */
  idNumber?: string;

  // ── Screencast settings (configurados por admin) ──
  /** Modo de captura: off, intervalo fijo, o video continuo */
  screenshotMode?: 'off' | '3min' | '9min' | '15min' | '30min' | 'video';
  /** Difuminar capturas para privacidad */
  screenshotBlur?: boolean;
  /** Permitir al colaborador borrar sus propias capturas */
  canDeleteScreencasts?: boolean;
  /** Minutos de inactividad antes de detener capturas (0 = sin límite) */
  autoTimeoutMinutes?: number;
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
  /** Indica que el registro fue creado manualmente por un admin/master */
  isManual?: boolean;
  /** UID del admin que creó el registro manual */
  createdBy?: string;
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
  createdAt?: number;
}

export interface PayrollChangeType {
  id: string;
  companyId?: string;
  name: string;
  color: string;
  requiereAprobacion?: boolean;
  soloAdmin?: boolean;
  yearlyQuota?: number;
  semesterQuota?: number;
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

// ─── IDLE / PRODUCTIVITY ──────────────────────────────────────────────────────
export interface IdleLogEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  companyId: string;
  /** epoch ms — cuando comenzó la inactividad */
  idleStartedAt: number;
  /** epoch ms — cuando el usuario volvió a ser activo */
  resumedAt?: number;
  durationSeconds?: number;
  /** umbral aleatorio (3-15 min) usado en ese ciclo */
  thresholdMinutes: number;
  createdAt: number;
}