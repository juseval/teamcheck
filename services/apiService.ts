// src/services/apiService.ts
import { Employee, AttendanceLogEntry, ActivityStatus, Task, CalendarEvent, PayrollChangeType, WorkSchedule } from '../types';
import { db, isFirebaseEnabled } from './firebase';
import { initialEmployees } from '../data/initialData';

// Validación de email
const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Validación de dominio corporativo
const ALLOWED_DOMAINS = ['tuempresa.com', 'micompania.co']; // CAMBIA ESTOS DOMINIOS

const isValidCorporateEmail = (email: string): boolean => {
    const domain = email.split('@')[1]?.toLowerCase();
    return ALLOWED_DOMAINS.includes(domain);
};

// --- MOCK API IMPLEMENTATION ---
const createMockApi = () => {
    let mockEmployees: Employee[] = JSON.parse(JSON.stringify(initialEmployees));
    let mockAttendanceLog: AttendanceLogEntry[] = [];
    let mockActivityStatuses: ActivityStatus[] = [
        { id: '1', name: 'Break', color: '#AE8F60' },
        { id: '2', name: 'Training', color: '#3B82F6' },
        { id: '3', name: 'Meeting', color: '#8B5CF6' },
    ];
    let mockPayrollChangeTypes: PayrollChangeType[] = [
        { id: '1', name: 'Vacation', color: '#10B981' },
        { id: '2', name: 'Sick Day', color: '#F59E0B' },
        { id: '3', name: 'Family Day', color: '#EF4444' },
    ];
    let mockWorkSchedules: WorkSchedule[] = [
        { id: '1', name: 'Morning Shift', startTime: '07:00', endTime: '15:00', days: [1,2,3,4,5] },
        { id: '2', name: 'Afternoon Shift', startTime: '15:00', endTime: '23:00', days: [1,2,3,4,5] },
    ];
    let mockTasks: Task[] = [];
    let mockCalendarEvents: CalendarEvent[] = [];
    
    const getNextId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
        loginWithEmail: async (email: string): Promise<{ success: boolean, user?: Employee }> => {
            const user = mockEmployees.find(e => e.email === email);
            if (user) {
                return Promise.resolve({ success: true, user });
            }
            return Promise.resolve({ success: false });
        },
        streamEmployees: (
            callback: (employees: Employee[]) => void,
            errorCallback?: (error: Error) => void
        ): (() => void) => {
            callback([...mockEmployees]);
            return () => {};
        },
        streamAttendanceLog: (
            callback: (log: AttendanceLogEntry[]) => void,
            errorCallback?: (error: Error) => void
        ): (() => void) => {
            callback([...mockAttendanceLog]);
            return () => {};
        },
        getEmployees: async (): Promise<Employee[]> => Promise.resolve([...mockEmployees]),
        addEmployee: async (employeeData: Omit<Employee, 'id' | 'status' | 'lastClockInTime' | 'currentStatusStartTime'>): Promise<Employee> => {
            if (!employeeData.email || !employeeData.name) {
                throw new Error("El nombre y el correo son obligatorios");
            }
            if (!isValidEmail(employeeData.email)) {
                throw new Error("Formato de correo inválido");
            }
            if (!isValidCorporateEmail(employeeData.email)) {
                throw new Error(`Solo se permiten correos corporativos (${ALLOWED_DOMAINS.join(', ')})`);
            }
            
            const newEmployee: Employee = {
                ...employeeData,
                id: getNextId('employee'),
                status: 'Clocked Out',
                lastClockInTime: null,
                currentStatusStartTime: null,
            };
            mockEmployees.push(newEmployee);
            return Promise.resolve(newEmployee);
        },
        removeEmployee: async (employeeId: string): Promise<{ success: boolean }> => {
            mockEmployees = mockEmployees.filter(emp => emp.id !== employeeId);
            return Promise.resolve({ success: true });
        },
        updateEmployeeStatus: async (employeeToUpdate: Employee): Promise<Employee> => {
            const index = mockEmployees.findIndex(emp => emp.id === employeeToUpdate.id);
            if (index !== -1) {
                mockEmployees[index] = { ...mockEmployees[index], ...employeeToUpdate };
                return Promise.resolve(mockEmployees[index]);
            }
            throw new Error("Employee not found");
        },
        updateEmployeeDetails: async (employeeToUpdate: Employee): Promise<Employee> => {
            const index = mockEmployees.findIndex(emp => emp.id === employeeToUpdate.id);
            if (index !== -1) {
                mockEmployees[index] = { ...mockEmployees[index], ...employeeToUpdate };
                return Promise.resolve(mockEmployees[index]);
            }
            throw new Error("Employee not found");
        },
        getAttendanceLog: async (): Promise<AttendanceLogEntry[]> => Promise.resolve([...mockAttendanceLog]),
        addAttendanceLogEntry: async (logEntry: Omit<AttendanceLogEntry, 'id'>): Promise<AttendanceLogEntry> => {
            const newLog: AttendanceLogEntry = {
                ...logEntry,
                id: getNextId('log'),
            };
            mockAttendanceLog.push(newLog);
            return Promise.resolve(newLog);
        },
        updateAttendanceLogEntry: async (logId: string, updates: { action: string, timestamp: number }): Promise<AttendanceLogEntry> => {
            const index = mockAttendanceLog.findIndex(log => log.id === logId);
            if (index !== -1) {
                mockAttendanceLog[index] = { ...mockAttendanceLog[index], ...updates };
                return Promise.resolve(mockAttendanceLog[index]);
            }
            throw new Error("Log entry not found");
        },
        updateEmployeeCurrentSession: async (employeeId: string, newStartTime: number): Promise<{ updatedEmployee: Employee, updatedLog: AttendanceLogEntry }> => {
            const employee = mockEmployees.find(e => e.id === employeeId);
            if (!employee || !employee.currentStatusStartTime) throw new Error("Employee or session not found");

            const originalStartTime = employee.currentStatusStartTime;
            const log = mockAttendanceLog.find(l => l.employeeId === employeeId && l.timestamp === originalStartTime);
            if (!log) throw new Error("Log entry for session not found");

            employee.currentStatusStartTime = newStartTime;
            if (employee.lastClockInTime === originalStartTime) {
                employee.lastClockInTime = newStartTime;
            }
            log.timestamp = newStartTime;

            return Promise.resolve({ updatedEmployee: { ...employee }, updatedLog: { ...log } });
        },
        updateTimesheetEntry: async (employeeId: string, startLogId: string, endLogId: string, newStartTime: number, newEndTime: number): Promise<{ updatedLogs: AttendanceLogEntry[] }> => {
            const startLog = mockAttendanceLog.find(l => l.id === startLogId);
            const endLog = mockAttendanceLog.find(l => l.id === endLogId);

            if (!startLog || !endLog) throw new Error("Log entries not found");
            
            if (startLog.employeeId !== employeeId || endLog.employeeId !== employeeId) {
                throw new Error("Los registros no pertenecen al empleado especificado");
            }

            startLog.timestamp = newStartTime;
            endLog.timestamp = newEndTime;

            return Promise.resolve({ updatedLogs: [{ ...startLog }, { ...endLog }] });
        },
        getActivityStatuses: async (): Promise<ActivityStatus[]> => Promise.resolve([...mockActivityStatuses]),
        addActivityStatus: async (name: string, color: string): Promise<ActivityStatus> => {
            const newStatus = { id: getNextId('status'), name, color };
            mockActivityStatuses.push(newStatus);
            return Promise.resolve(newStatus);
        },
        removeActivityStatus: async (id: string): Promise<{ success: boolean }> => {
            mockActivityStatuses = mockActivityStatuses.filter(s => s.id !== id);
            return Promise.resolve({ success: true });
        },
        getPayrollChangeTypes: async (): Promise<PayrollChangeType[]> => Promise.resolve([...mockPayrollChangeTypes]),
        addPayrollChangeType: async (name: string, color: string): Promise<PayrollChangeType> => {
            const newType = { id: getNextId('payroll'), name, color };
            mockPayrollChangeTypes.push(newType);
            return Promise.resolve(newType);
        },
        updatePayrollChangeType: async (id: string, updates: Partial<Omit<PayrollChangeType, 'id'>>): Promise<PayrollChangeType> => {
            const index = mockPayrollChangeTypes.findIndex(t => t.id === id);
            if (index !== -1) {
                mockPayrollChangeTypes[index] = { ...mockPayrollChangeTypes[index], ...updates };
                return Promise.resolve(mockPayrollChangeTypes[index]);
            }
            throw new Error("Payroll change type not found");
        },
        removePayrollChangeType: async (id: string): Promise<{ success: boolean }> => {
            mockPayrollChangeTypes = mockPayrollChangeTypes.filter(t => t.id !== id);
            return Promise.resolve({ success: true });
        },
        getWorkSchedules: async (): Promise<WorkSchedule[]> => Promise.resolve([...mockWorkSchedules]),
        addWorkSchedule: async (scheduleData: Omit<WorkSchedule, 'id'>): Promise<WorkSchedule> => {
            const newSchedule: WorkSchedule = { ...scheduleData, id: getNextId('schedule') };
            mockWorkSchedules.push(newSchedule);
            return Promise.resolve(newSchedule);
        },
        updateWorkSchedule: async (id: string, updates: Partial<Omit<WorkSchedule, 'id'>>): Promise<WorkSchedule> => {
            const index = mockWorkSchedules.findIndex(s => s.id === id);
            if (index !== -1) {
                mockWorkSchedules[index] = { ...mockWorkSchedules[index], ...updates };
                return Promise.resolve(mockWorkSchedules[index]);
            }
            throw new Error("Work schedule not found");
        },
        removeWorkSchedule: async (id: string): Promise<{ success: boolean }> => {
            mockWorkSchedules = mockWorkSchedules.filter(s => s.id !== id);
            return Promise.resolve({ success: true });
        },
        getTasks: async (): Promise<Task[]> => Promise.resolve([...mockTasks]),
        addTask: async (taskData: Omit<Task, 'id'>): Promise<Task> => {
            const newTask: Task = { ...taskData, id: getNextId('task') };
            mockTasks.push(newTask);
            return Promise.resolve(newTask);
        },
        getCalendarEvents: async (): Promise<CalendarEvent[]> => Promise.resolve([...mockCalendarEvents]),
        addCalendarEvent: async (eventData: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> => {
            const newEvent: CalendarEvent = { ...eventData, id: getNextId('event') };
            mockCalendarEvents.push(newEvent);
            return Promise.resolve(newEvent);
        },
        updateCalendarEvent: async (eventData: CalendarEvent): Promise<CalendarEvent> => {
            const index = mockCalendarEvents.findIndex(e => e.id === eventData.id);
            if (index !== -1) {
                mockCalendarEvents[index] = { ...mockCalendarEvents[index], ...eventData };
                return Promise.resolve(mockCalendarEvents[index]);
            }
            throw new Error("Calendar event not found");
        },
        removeCalendarEvent: async (eventId: string): Promise<{ success: boolean }> => {
            mockCalendarEvents = mockCalendarEvents.filter(e => e.id !== eventId);
            return Promise.resolve({ success: true });
        },
    };
};

// --- REAL API IMPLEMENTATION ---
const createRealApi = () => {
    const getDb = () => {
        if (!db) {
            throw new Error("Firestore is not initialized.");
        }
        return db;
    };

    return {
        loginWithEmail: async (email: string): Promise<{ success: boolean, user?: Employee }> => {
            try {
                const q = getDb().collection('employees').where("email", "==", email).limit(1);
                const querySnapshot = await q.get();

                if (querySnapshot.empty) {
                    console.warn(`Login failed: No user found with email ${email}`);
                    return { success: false };
                }
                
                const userDoc = querySnapshot.docs[0];
                const user = { ...(userDoc.data() as Omit<Employee, 'id'>), id: userDoc.id };
                return { success: true, user: user };
            } catch (error) {
                console.error("Error querying database during login:", error);
                throw error;
            }
        },
        streamEmployees: (
            callback: (employees: Employee[]) => void,
            errorCallback?: (error: Error) => void
        ): (() => void) => {
            const q = getDb().collection('employees');
            const unsubscribe = q.onSnapshot(
                (querySnapshot) => {
                    const employees = querySnapshot.docs.map(doc => ({ 
                        ...(doc.data() as Omit<Employee, 'id'>), 
                        id: doc.id 
                    }));
                    callback(employees);
                },
                (error) => {
                    console.error("Error in employees stream:", error);
                    if (errorCallback) errorCallback(error);
                }
            );
            return unsubscribe;
        },
        streamAttendanceLog: (
            callback: (log: AttendanceLogEntry[]) => void,
            errorCallback?: (error: Error) => void
        ): (() => void) => {
            const q = getDb().collection('attendanceLog');
            const unsubscribe = q.onSnapshot(
                (querySnapshot) => {
                    const log = querySnapshot.docs.map(doc => ({ 
                        ...(doc.data() as Omit<AttendanceLogEntry, 'id'>), 
                        id: doc.id 
                    }));
                    callback(log);
                },
                (error) => {
                    console.error("Error in attendance log stream:", error);
                    if (errorCallback) errorCallback(error);
                }
            );
            return unsubscribe;
        },
        getEmployees: async (): Promise<Employee[]> => {
            const snapshot = await getDb().collection('employees').get();
            return snapshot.docs.map(doc => ({ ...(doc.data() as Omit<Employee, 'id'>), id: doc.id }));
        },
        addEmployee: async (employeeData: Omit<Employee, 'id' | 'status' | 'lastClockInTime' | 'currentStatusStartTime'>): Promise<Employee> => {
            if (!employeeData.email || !employeeData.name) {
                throw new Error("El nombre y el correo son obligatorios");
            }
            if (!isValidEmail(employeeData.email)) {
                throw new Error("Formato de correo inválido");
            }
            if (!isValidCorporateEmail(employeeData.email)) {
                throw new Error(`Solo se permiten correos corporativos (${ALLOWED_DOMAINS.join(', ')})`);
            }
            
            const newEmployeeData = {
                ...employeeData,
                status: 'Clocked Out',
                lastClockInTime: null,
                currentStatusStartTime: null,
            };
            const docRef = await getDb().collection('employees').add(newEmployeeData);
            return { ...newEmployeeData, id: docRef.id };
        },
        removeEmployee: async (employeeId: string): Promise<{ success: boolean }> => {
            await getDb().collection('employees').doc(employeeId).delete();
            return { success: true };
        },
        updateEmployeeStatus: async (employeeToUpdate: Employee): Promise<Employee> => {
            const { id, ...data } = employeeToUpdate;
            await getDb().collection('employees').doc(id).update(data);
            return employeeToUpdate;
        },
        updateEmployeeDetails: async (employeeToUpdate: Employee): Promise<Employee> => {
            const { id, ...data } = employeeToUpdate;
            await getDb().collection('employees').doc(id).update(data);
            return employeeToUpdate;
        },
        getAttendanceLog: async (): Promise<AttendanceLogEntry[]> => {
            const snapshot = await getDb().collection('attendanceLog').get();
            return snapshot.docs.map(doc => ({ ...(doc.data() as Omit<AttendanceLogEntry, 'id'>), id: doc.id }));
        },
        addAttendanceLogEntry: async (logEntry: Omit<AttendanceLogEntry, 'id'>): Promise<AttendanceLogEntry> => {
            const docRef = await getDb().collection('attendanceLog').add(logEntry);
            return { ...logEntry, id: docRef.id };
        },
        updateAttendanceLogEntry: async (logId: string, updates: { action: string, timestamp: number }): Promise<AttendanceLogEntry> => {
            const logRef = getDb().collection('attendanceLog').doc(logId);
            await logRef.update(updates);
            const updatedDoc = await logRef.get();
            return { ...(updatedDoc.data() as Omit<AttendanceLogEntry, 'id'>), id: logId };
        },
        updateEmployeeCurrentSession: async (employeeId: string, newStartTime: number): Promise<{ updatedEmployee: Employee, updatedLog: AttendanceLogEntry }> => {
            const employeeRef = getDb().collection('employees').doc(employeeId);
            const employeeDoc = await employeeRef.get();
            if (!employeeDoc.exists) throw new Error("Employee not found");
            const employee = { ...(employeeDoc.data() as Omit<Employee, 'id'>), id: employeeDoc.id };
            
            if (!employee.currentStatusStartTime) throw new Error("Employee has no active session");
            const originalStartTime = employee.currentStatusStartTime;

            const logQuery = getDb().collection('attendanceLog').where("employeeId", "==", employeeId).where("timestamp", "==", originalStartTime);
            const logSnapshot = await logQuery.get();
            if (logSnapshot.empty) throw new Error("Log entry for current session not found");

            const logDoc = logSnapshot.docs[0];
            const logRef = getDb().collection('attendanceLog').doc(logDoc.id);

            const updatedEmployeeData: Partial<Employee> = { currentStatusStartTime: newStartTime };
            if (employee.lastClockInTime === originalStartTime) {
                updatedEmployeeData.lastClockInTime = newStartTime;
            }
            
            const batch = getDb().batch();
            batch.update(logRef, { timestamp: newStartTime });
            batch.update(employeeRef, updatedEmployeeData);
            await batch.commit();

            return {
                updatedEmployee: { ...employee, ...updatedEmployeeData },
                updatedLog: { ...(logDoc.data() as Omit<AttendanceLogEntry, 'id'>), timestamp: newStartTime, id: logDoc.id }
            };
        },
        updateTimesheetEntry: async (employeeId: string, startLogId: string, endLogId: string, newStartTime: number, newEndTime: number): Promise<{ updatedLogs: AttendanceLogEntry[] }> => {
            const batch = getDb().batch();
            const startLogRef = getDb().collection('attendanceLog').doc(startLogId);
            const endLogRef = getDb().collection('attendanceLog').doc(endLogId);

            const startLogDoc = await startLogRef.get();
            const endLogDoc = await endLogRef.get();

            if (!startLogDoc.exists || !endLogDoc.exists) throw new Error("Log entries not found");
            
            const startData = startLogDoc.data() as AttendanceLogEntry;
            const endData = endLogDoc.data() as AttendanceLogEntry;
            
            if (startData.employeeId !== employeeId || endData.employeeId !== employeeId) {
                throw new Error("Los registros no pertenecen al empleado especificado");
            }
            
            batch.update(startLogRef, { timestamp: newStartTime });
            batch.update(endLogRef, { timestamp: newEndTime });
            await batch.commit();
            
            return { 
                updatedLogs: [
                    { ...startData, id: startLogDoc.id, timestamp: newStartTime },
                    { ...endData, id: endLogDoc.id, timestamp: newEndTime },
                ]
            };
        },
        getActivityStatuses: async (): Promise<ActivityStatus[]> => {
            const snapshot = await getDb().collection('activityStatuses').get();
            return snapshot.docs.map(doc => ({ ...(doc.data() as Omit<ActivityStatus, 'id'>), id: doc.id }));
        },
        addActivityStatus: async (name: string, color: string): Promise<ActivityStatus> => {
            const docRef = await getDb().collection('activityStatuses').add({ name, color });
            return { id: docRef.id, name, color };
        },
        removeActivityStatus: async (id: string): Promise<{ success: boolean }> => {
            await getDb().collection('activityStatuses').doc(id).delete();
            return { success: true };
        },
        getPayrollChangeTypes: async (): Promise<PayrollChangeType[]> => {
            const snapshot = await getDb().collection('payrollChangeTypes').get();
            return snapshot.docs.map(doc => ({ ...(doc.data() as Omit<PayrollChangeType, 'id'>), id: doc.id }));
        },
        addPayrollChangeType: async (name: string, color: string): Promise<PayrollChangeType> => {
            const docRef = await getDb().collection('payrollChangeTypes').add({ name, color });
            return { id: docRef.id, name, color };
        },
        updatePayrollChangeType: async (id: string, updates: Partial<Omit<PayrollChangeType, 'id'>>): Promise<PayrollChangeType> => {
            const typeRef = getDb().collection('payrollChangeTypes').doc(id);
            await typeRef.update(updates);
            const updatedDoc = await typeRef.get();
            return { ...(updatedDoc.data() as Omit<PayrollChangeType, 'id'>), id } as PayrollChangeType;
        },
        removePayrollChangeType: async (id: string): Promise<{ success: boolean }> => {
            await getDb().collection('payrollChangeTypes').doc(id).delete();
            return { success: true };
        },
        getWorkSchedules: async (): Promise<WorkSchedule[]> => {
            const snapshot = await getDb().collection('workSchedules').get();
            return snapshot.docs.map(doc => ({ ...(doc.data() as Omit<WorkSchedule, 'id'>), id: doc.id }));
        },
        addWorkSchedule: async (scheduleData: Omit<WorkSchedule, 'id'>): Promise<WorkSchedule> => {
            const docRef = await getDb().collection('workSchedules').add(scheduleData);
            return { ...scheduleData, id: docRef.id };
        },
        updateWorkSchedule: async (id: string, updates: Partial<Omit<WorkSchedule, 'id'>>): Promise<WorkSchedule> => {
            const scheduleRef = getDb().collection('workSchedules').doc(id);
            await scheduleRef.update(updates);
            const updatedDoc = await scheduleRef.get();
            return { ...(updatedDoc.data() as Omit<WorkSchedule, 'id'>), id } as WorkSchedule;
        },
        removeWorkSchedule: async (id: string): Promise<{ success: boolean }> => {
            await getDb().collection('workSchedules').doc(id).delete();
            return { success: true };
        },
        getTasks: async (): Promise<Task[]> => {
            const snapshot = await getDb().collection('tasks').get();
            return snapshot.docs.map(doc => ({ ...(doc.data() as Omit<Task, 'id'>), id: doc.id }));
        },
        addTask: async (taskData: Omit<Task, 'id'>): Promise<Task> => {
            const docRef = await getDb().collection('tasks').add(taskData);
            return { ...taskData, id: docRef.id };
        },
        getCalendarEvents: async (): Promise<CalendarEvent[]> => {
            const snapshot = await getDb().collection('calendarEvents').get();
            return snapshot.docs.map(doc => ({ ...(doc.data() as Omit<CalendarEvent, 'id'>), id: doc.id }));
        },
        addCalendarEvent: async (eventData: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> => {
            const docRef = await getDb().collection('calendarEvents').add(eventData);
            return { ...eventData, id: docRef.id };
        },
        updateCalendarEvent: async (eventData: CalendarEvent): Promise<CalendarEvent> => {
            const { id, ...data } = eventData;
            await getDb().collection('calendarEvents').doc(id).update(data);
            return eventData;
        },
        removeCalendarEvent: async (eventId: string): Promise<{ success: boolean }> => {
            await getDb().collection('calendarEvents').doc(eventId).delete();
            return { success: true };
        },
    };
};

const api = isFirebaseEnabled ? createRealApi() : createMockApi();

export const {
    loginWithEmail,
    streamEmployees,
    streamAttendanceLog,
    getEmployees,
    addEmployee,
    removeEmployee,
    updateEmployeeStatus,
    updateEmployeeDetails,
    getAttendanceLog,
    addAttendanceLogEntry,
    updateAttendanceLogEntry,
    updateEmployeeCurrentSession,
    updateTimesheetEntry,
    getActivityStatuses,
    addActivityStatus,
    removeActivityStatus,
    getPayrollChangeTypes,
    addPayrollChangeType,
    updatePayrollChangeType,
    removePayrollChangeType,
    getWorkSchedules,
    addWorkSchedule,
    updateWorkSchedule,
    removeWorkSchedule,
    getTasks,
    addTask,
    getCalendarEvents,
    addCalendarEvent,
    updateCalendarEvent,
    removeCalendarEvent,
} = api;