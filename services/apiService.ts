import { Employee, AttendanceLogEntry, ActivityStatus, Task, CalendarEvent, PayrollChangeType, WorkSchedule } from '../types.ts';

// --- In-memory "database" ---
let employees: Employee[] = [
  { id: 1, name: 'Johnny Cash', email: 'j.cash@example.com', phone: '111-222-3333', location: 'Main Office', role: 'employee', status: 'After Call Work', lastClockInTime: Date.now() - 2 * 60 * 60 * 1000, currentStatusStartTime: Date.now() - (27 * 60 + 25) * 1000, workScheduleId: 'schedule-1' },
  { id: 2, name: 'Daniel Cartmell', email: 'd.cartmell@example.com', phone: '222-333-4444', location: 'Remote', role: 'employee', status: 'Meeting', lastClockInTime: Date.now() - 3 * 60 * 60 * 1000, currentStatusStartTime: Date.now() - (35 * 60 + 45) * 1000, workScheduleId: 'schedule-1' },
  { id: 3, name: 'Waylon Jennings', email: 'w.jennings@example.com', phone: '333-444-5555', location: 'Main Office', role: 'employee', status: 'Team Meeting', lastClockInTime: Date.now() - 4 * 60 * 60 * 1000, currentStatusStartTime: Date.now() - (66 * 60 + 45) * 1000, workScheduleId: 'schedule-2' },
  { id: 4, name: 'Willie Nelson', email: 'w.nelson@example.com', phone: '444-555-6666', location: 'Field Office', role: 'employee', status: 'Team Meeting', lastClockInTime: Date.now() - 5 * 60 * 60 * 1000, currentStatusStartTime: Date.now() - (73 * 60 + 25) * 1000, workScheduleId: 'schedule-2' },
  { id: 5, name: 'Danielle O\'Keeffe', email: 'd.okeeffe@example.com', phone: '555-666-7777', location: 'Main Office', role: 'employee', status: 'Working', lastClockInTime: Date.now() - 2 * 60 * 60 * 1000, currentStatusStartTime: Date.now() - (119 * 60 + 20) * 1000, workScheduleId: 'schedule-1' },
  { id: 6, name: 'Ryan Ignacio', email: 'r.ignacio@example.com', phone: '666-777-8888', location: 'Remote', role: 'employee', status: 'Not Ready', lastClockInTime: Date.now() - 1 * 60 * 60 * 1000, currentStatusStartTime: Date.now() - (47 * 60 + 15) * 1000, workScheduleId: 'schedule-1' },
  { id: 7, name: 'Michael Stockton', email: 'm.stockton@example.com', phone: '777-888-9999', location: 'Main Office', role: 'employee', status: 'On Call', lastClockInTime: Date.now() - 3 * 60 * 60 * 1000, currentStatusStartTime: Date.now() - (34 * 60 + 20) * 1000, workScheduleId: 'schedule-2' },
  { id: 8, name: 'Charlie Miller', email: 'c.miller@example.com', phone: '888-999-0000', location: 'Main Office', role: 'employee', status: 'Break', lastClockInTime: Date.now() - 4 * 60 * 60 * 1000, currentStatusStartTime: Date.now() - (6 * 60 + 35) * 1000, workScheduleId: 'schedule-2' },
  { id: 9, name: 'Juan Sebastian', email: 'j.sebastian@example.com', phone: '999-000-1111', location: 'Main Office', role: 'admin', status: 'Clocked Out', lastClockInTime: null, currentStatusStartTime: null, workScheduleId: 'schedule-1' },
];

let attendanceLog: AttendanceLogEntry[] = [];

let activityStatuses: ActivityStatus[] = [
  { id: 'break', name: 'Break', color: '#AE8F60' },
  { id: 'training', name: 'Training', color: '#5D9B9B' },
  { id: 'feedback', name: 'Feedback', color: '#9B5D9B' },
  { id: 'active-pause', name: 'Active Pause', color: '#5D9B6E' },
  // New statuses for Agent State dashboard
  { id: 'acw', name: 'After Call Work', color: '#60A5FA' },
  { id: 'meeting', name: 'Meeting', color: '#A78BFA' },
  { id: 'team-meeting', name: 'Team Meeting', color: '#8b5cf6' },
  { id: 'on-call', name: 'On Call', color: '#FACC15' },
  { id: 'not-ready', name: 'Not Ready', color: '#F87171' },
];

let payrollChangeTypes: PayrollChangeType[] = [
    { id: 'sick', name: 'Sick', color: '#F59E0B' },
    { id: 'vacation', name: 'Vacation', color: '#10B981' },
    { id: 'family-day', name: 'Family Day', color: '#3B82F6' },
    { id: 'dia-no-remunerado', name: 'Dia No Remunerado', color: '#6B7280' },
    { id: 'ooo', name: 'O.O.O.', color: '#EF4444' },
    { id: 'no-show', name: 'No Show', color: '#000000' },
    { id: 'suspended', name: 'Suspended', color: '#4B0082' },
    { id: 'paternity-leave', name: 'Paternity Leave', color: '#8B5CF6' },
    { id: 'reserve-holiday', name: 'Reserve Holiday', color: '#06B6D4' },
    { id: 'graduation-day', name: 'Graduation Day', color: '#D946EF' },
    { id: 'visa', name: 'Visa', color: '#65A30D' },
    { id: 'moving-day', name: 'Moving Day', color: '#EA580C' },
    { id: 'birthday-half-day', name: 'Birthday Half-Day', color: '#FBBF24' },
    { id: 'pet-half-day', name: 'Pet Half-Day', color: '#22C55E' },
    { id: 'friend-half-day', name: 'Friend Half-Day', color: '#EC4899' },
    { id: 'halloween-half-day', name: 'Halloween Half-Day', color: '#F97316' },
    { id: 'medical', name: 'Medical', color: '#0EA5E9' },
];

let workSchedules: WorkSchedule[] = [
    { id: 'schedule-1', name: 'Horario A', startTime: '07:00', endTime: '15:00', days: [1, 2, 3, 4, 5] },
    { id: 'schedule-2', name: 'Horario B', startTime: '15:00', endTime: '23:00', days: [1, 2, 3, 4, 5] },
    { id: 'schedule-3', name: 'Horario C (Noche)', startTime: '23:00', endTime: '07:00', days: [1, 2, 3, 4, 5] },
];

let tasks: Task[] = [
    { id: 1, name: 'Design new dashboard layout', startDate: '2025-08-04', endDate: '2025-08-11', status: 'In Progress', assigneeId: 1, progress: 60, color: '#3B82F6' },
    { id: 2, name: 'Develop API for timesheets', startDate: '2025-08-08', endDate: '2025-08-18', status: 'In Progress', assigneeId: 2, progress: 40, color: '#F59E0B' },
    { id: 3, name: 'Client demo preparation', startDate: '2025-08-15', endDate: '2025-08-19', status: 'In Progress', assigneeId: 3, progress: 20, color: '#10B981' },
    { id: 4, name: 'Initial project planning', startDate: '2025-08-01', endDate: '2025-08-05', status: 'Complete', assigneeId: 1, progress: 100, color: '#6B7280'},
    { id: 5, name: 'User testing for new feature', startDate: '2025-08-20', endDate: '2025-08-25', status: 'To-do', assigneeId: 4, progress: 0, color: '#8B5CF6' },
    { id: 6, name: 'Fix login page bug', startDate: '2025-08-06', endDate: '2025-08-07', status: 'Complete', assigneeId: 2, progress: 100, color: '#6B7280' },
];

const today = new Date();
const year = today.getFullYear();
const month = today.getMonth() + 1; // getMonth() is 0-indexed
const monthStr = month.toString().padStart(2, '0');

let calendarEvents: CalendarEvent[] = [
  // Sample data for the current month
  { id: 1, employeeId: 1, type: 'Vacation', startDate: `${year}-${monthStr}-05`, endDate: `${year}-${monthStr}-07` },
  { id: 2, employeeId: 2, type: 'Sick', startDate: `${year}-${monthStr}-10`, endDate: `${year}-${monthStr}-10` },
  { id: 3, employeeId: 3, type: 'Visa', startDate: `${year}-${monthStr}-15`, endDate: `${year}-${monthStr}-20` },
  { id: 4, employeeId: 4, type: 'Birthday Half-Day', startDate: `${year}-${monthStr}-02`, endDate: `${year}-${monthStr}-02` },
  { id: 6, employeeId: 6, type: 'Medical', startDate: `${year}-${monthStr}-22`, endDate: `${year}-${monthStr}-22` },
  { id: 7, employeeId: 7, type: 'Family Day', startDate: `${year}-${monthStr}-12`, endDate: `${year}-${monthStr}-12` },
];


// --- API Simulation ---
const simulateNetworkDelay = (delay: number = 500) => new Promise(res => setTimeout(res, delay));

// In a real app, this would hit a /login endpoint and return a user/token
export const login = async (email: string, password: string): Promise<{ success: boolean }> => {
  await simulateNetworkDelay();
  if (email === 'demo@teamcheck.com' && password === 'password123') {
    return { success: true };
  }
  return { success: false };
}

export const getEmployees = async (): Promise<Employee[]> => {
  await simulateNetworkDelay();
  // Return a deep copy to prevent direct mutation of the "database"
  return JSON.parse(JSON.stringify(employees));
};

export const getAttendanceLog = async (): Promise<AttendanceLogEntry[]> => {
    await simulateNetworkDelay(200);
    return JSON.parse(JSON.stringify(attendanceLog));
}

export const addEmployee = async (employeeData: Omit<Employee, 'id' | 'status' | 'lastClockInTime' | 'currentStatusStartTime'>): Promise<Employee> => {
  await simulateNetworkDelay();
  const newEmployee: Employee = {
    ...employeeData,
    id: Date.now(),
    status: 'Clocked Out',
    lastClockInTime: null,
    currentStatusStartTime: null,
  };
  employees = [...employees, newEmployee];
  return newEmployee;
};

export const removeEmployee = async (employeeId: number): Promise<{ success: boolean }> => {
    await simulateNetworkDelay();
    const initialLength = employees.length;
    employees = employees.filter(emp => emp.id !== employeeId);
    return { success: employees.length < initialLength };
}

export const updateEmployeeStatus = async (employeeToUpdate: Employee): Promise<Employee> => {
    await simulateNetworkDelay(100);
    employees = employees.map(emp => emp.id === employeeToUpdate.id ? employeeToUpdate : emp);
    return employeeToUpdate;
}

export const updateEmployeeDetails = async (employeeToUpdate: Employee): Promise<Employee> => {
    await simulateNetworkDelay(300);
    employees = employees.map(emp => emp.id === employeeToUpdate.id ? {...emp, ...employeeToUpdate} : emp);
    // Return a copy of the updated employee
    return JSON.parse(JSON.stringify(employees.find(e => e.id === employeeToUpdate.id)));
}

export const addAttendanceLogEntry = async (logEntry: Omit<AttendanceLogEntry, 'id' | 'timestamp'> & { timestamp: number }): Promise<AttendanceLogEntry> => {
    await simulateNetworkDelay(100);
    const newLogEntry: AttendanceLogEntry = {
        ...logEntry,
        id: logEntry.timestamp, // Use timestamp for ID for consistency
    };
    attendanceLog = [newLogEntry, ...attendanceLog];
    return newLogEntry;
}

export const updateAttendanceLogEntry = async (logId: number, updates: { action: string, timestamp: number }): Promise<AttendanceLogEntry> => {
    await simulateNetworkDelay(300);
    
    const logIndex = attendanceLog.findIndex(log => log.id === logId);
    if (logIndex === -1) {
        throw new Error("Log entry not found.");
    }

    const updatedLog = {
        ...attendanceLog[logIndex],
        ...updates
    };

    // Replace the old log with the updated one
    attendanceLog[logIndex] = updatedLog;

    return JSON.parse(JSON.stringify(updatedLog));
};

export const updateEmployeeCurrentSession = async (employeeId: number, newStartTime: number): Promise<{ updatedEmployee: Employee, updatedLog: AttendanceLogEntry }> => {
  await simulateNetworkDelay(200);

  const employeeIndex = employees.findIndex(emp => emp.id === employeeId);
  if (employeeIndex === -1) throw new Error("Employee not found");
  
  const employee = employees[employeeIndex];
  if (!employee.currentStatusStartTime) throw new Error("Employee has no active session");
  
  const originalStartTime = employee.currentStatusStartTime;

  // Find the corresponding log entry
  const logIndex = attendanceLog.findIndex(log => log.employeeId === employeeId && log.timestamp === originalStartTime);
  if (logIndex === -1) throw new Error("Log entry for current session not found");

  // Update the log entry
  const updatedLog = { ...attendanceLog[logIndex], timestamp: newStartTime };
  attendanceLog[logIndex] = updatedLog;

  // Update the employee record
  const updatedEmployee = { ...employee, currentStatusStartTime: newStartTime };
  
  // If the edited entry was the initial clock-in, update that time too
  if (employee.lastClockInTime === originalStartTime) {
    updatedEmployee.lastClockInTime = newStartTime;
  }
  
  employees[employeeIndex] = updatedEmployee;

  return { 
    updatedEmployee: JSON.parse(JSON.stringify(updatedEmployee)),
    updatedLog: JSON.parse(JSON.stringify(updatedLog)),
  };
};

export const updateTimesheetEntry = async (
  employeeId: number,
  startLogId: number,
  endLogId: number,
  newStartTime: number,
  newEndTime: number
): Promise<{ updatedLogs: AttendanceLogEntry[] }> => {
    await simulateNetworkDelay(300);
    
    // --- Validation: Check for overlaps ---
    const date = new Date(newStartTime);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const dayEnd = new Date(dayStart).setHours(23, 59, 59, 999);

    const otherLogsOnSameDay = attendanceLog.filter(log => 
        log.employeeId === employeeId &&
        log.id !== startLogId && 
        log.id !== endLogId &&
        log.timestamp >= dayStart &&
        log.timestamp <= dayEnd
    );

    for (const log of otherLogsOnSameDay) {
        // Check if another log point falls within the new time range
        if (log.timestamp > newStartTime && log.timestamp < newEndTime) {
            throw new Error(`Edición fallida: El nuevo rango de tiempo (${new Date(newStartTime).toLocaleTimeString()} - ${new Date(newEndTime).toLocaleTimeString()}) se solapa con una entrada existente a las ${new Date(log.timestamp).toLocaleTimeString()}.`);
        }
    }

    let updatedLogs: AttendanceLogEntry[] = [];
    
    const startLogIndex = attendanceLog.findIndex(log => log.id === startLogId);
    const endLogIndex = attendanceLog.findIndex(log => log.id === endLogId);

    if (startLogIndex === -1 || endLogIndex === -1) {
        throw new Error("No se encontraron las entradas de registro originales.");
    }

    // Update the timestamps
    const updatedStartLog = { ...attendanceLog[startLogIndex], timestamp: newStartTime };
    const updatedEndLog = { ...attendanceLog[endLogIndex], timestamp: newEndTime };

    attendanceLog[startLogIndex] = updatedStartLog;
    attendanceLog[endLogIndex] = updatedEndLog;
    
    updatedLogs.push(updatedStartLog, updatedEndLog);

    return { updatedLogs: JSON.parse(JSON.stringify(updatedLogs)) };
};

// --- Activity Status API ---
export const getActivityStatuses = async (): Promise<ActivityStatus[]> => {
  await simulateNetworkDelay(100);
  return JSON.parse(JSON.stringify(activityStatuses));
};

export const addActivityStatus = async (name: string, color: string): Promise<ActivityStatus> => {
  await simulateNetworkDelay(200);
  const newStatus: ActivityStatus = {
    id: name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
    name,
    color,
  };
  activityStatuses = [...activityStatuses, newStatus];
  return newStatus;
};

export const removeActivityStatus = async (id: string): Promise<{ success: boolean }> => {
  await simulateNetworkDelay(200);
  const initialLength = activityStatuses.length;
  activityStatuses = activityStatuses.filter(status => status.id !== id);
  return { success: activityStatuses.length < initialLength };
};

// --- Payroll Change Types API ---
export const getPayrollChangeTypes = async (): Promise<PayrollChangeType[]> => {
    await simulateNetworkDelay(100);
    return JSON.parse(JSON.stringify(payrollChangeTypes));
};

export const addPayrollChangeType = async (name: string, color: string): Promise<PayrollChangeType> => {
    await simulateNetworkDelay(200);
    const newType: PayrollChangeType = {
        id: name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
        name,
        color,
    };
    payrollChangeTypes = [...payrollChangeTypes, newType];
    return newType;
};

export const updatePayrollChangeType = async (id: string, updates: Partial<Omit<PayrollChangeType, 'id'>>): Promise<PayrollChangeType> => {
    await simulateNetworkDelay(100);
    let updatedType: PayrollChangeType | undefined;
    payrollChangeTypes = payrollChangeTypes.map(type => {
        if (type.id === id) {
            updatedType = { ...type, ...updates };
            return updatedType;
        }
        return type;
    });
    if (!updatedType) throw new Error("Type not found");
    return updatedType;
}

export const removePayrollChangeType = async (id: string): Promise<{ success: boolean }> => {
    await simulateNetworkDelay(200);
    const initialLength = payrollChangeTypes.length;
    payrollChangeTypes = payrollChangeTypes.filter(type => type.id !== id);
    return { success: payrollChangeTypes.length < initialLength };
};

// --- Work Schedules API ---
export const getWorkSchedules = async (): Promise<WorkSchedule[]> => {
    await simulateNetworkDelay(100);
    return JSON.parse(JSON.stringify(workSchedules));
};

export const addWorkSchedule = async (scheduleData: Omit<WorkSchedule, 'id'>): Promise<WorkSchedule> => {
    await simulateNetworkDelay(200);
    const newSchedule: WorkSchedule = {
        ...scheduleData,
        id: `schedule-${Date.now()}`,
    };
    workSchedules = [...workSchedules, newSchedule];
    return newSchedule;
};

export const updateWorkSchedule = async (id: string, updates: Partial<Omit<WorkSchedule, 'id'>>): Promise<WorkSchedule> => {
    await simulateNetworkDelay(100);
    let updatedSchedule: WorkSchedule | undefined;
    workSchedules = workSchedules.map(schedule => {
        if (schedule.id === id) {
            updatedSchedule = { ...schedule, ...updates };
            return updatedSchedule;
        }
        return schedule;
    });
    if (!updatedSchedule) throw new Error("Schedule not found");
    return updatedSchedule;
};

export const removeWorkSchedule = async (id: string): Promise<{ success: boolean }> => {
    await simulateNetworkDelay(200);
    const initialLength = workSchedules.length;
    workSchedules = workSchedules.filter(schedule => schedule.id !== id);
    return { success: workSchedules.length < initialLength };
};


// --- Tasks API for Schedule Page ---
export const getTasks = async (): Promise<Task[]> => {
  await simulateNetworkDelay(300);
  return JSON.parse(JSON.stringify(tasks));
};

export const addTask = async (taskData: Omit<Task, 'id'>): Promise<Task> => {
    await simulateNetworkDelay(200);
    const newTask: Task = {
        ...taskData,
        id: Date.now(),
    };
    tasks = [...tasks, newTask];
    return newTask;
}

// --- Calendar Events API ---
export const getCalendarEvents = async (): Promise<CalendarEvent[]> => {
  await simulateNetworkDelay(200);
  return JSON.parse(JSON.stringify(calendarEvents));
};

export const addCalendarEvent = async (eventData: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> => {
    await simulateNetworkDelay(200);
    const newEvent: CalendarEvent = {
        ...eventData,
        id: Date.now(),
    };
    calendarEvents = [...calendarEvents, newEvent];
    return newEvent;
};

export const updateCalendarEvent = async (eventData: CalendarEvent): Promise<CalendarEvent> => {
    await simulateNetworkDelay(200);
    calendarEvents = calendarEvents.map(e => e.id === eventData.id ? eventData : e);
    return eventData;
};

export const removeCalendarEvent = async (eventId: number): Promise<{ success: boolean }> => {
    await simulateNetworkDelay(200);
    const initialLength = calendarEvents.length;
    calendarEvents = calendarEvents.filter(e => e.id !== eventId);
    return { success: calendarEvents.length < initialLength };
};