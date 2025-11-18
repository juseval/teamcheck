
import { Employee, AttendanceLogEntry, ActivityStatus, Task, CalendarEvent, PayrollChangeType, WorkSchedule } from '../types';
import { db, auth, isFirebaseEnabled } from './firebase';
import { initialEmployees } from '../data/initialData';

// Helper to generate IDs
const getNextId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// --- MOCK API IMPLEMENTATION ---
const createMockApi = () => {
  // Helper to load data from local storage or use default
  const loadFromStorage = <T,>(key: string, fallback: T): T => {
      try {
          const saved = localStorage.getItem(key);
          return saved ? JSON.parse(saved) : fallback;
      } catch (e) {
          console.error(`Failed to load ${key} from localStorage`, e);
          return fallback;
      }
  };

  // Helper to save data to local storage
  const saveToStorage = (key: string, data: any) => {
      try {
          localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
          console.error(`Failed to save ${key} to localStorage`, e);
      }
  };

  // Initialize state from storage, ensuring data integrity
  // Cast e to 'any' to avoid TS errors when checking for uid on legacy data
  let mockEmployees: Employee[] = loadFromStorage<any[]>('tc_db_employees', JSON.parse(JSON.stringify(initialEmployees))).map((e: any) => ({
      ...e,
      uid: e.uid || getNextId('user') // Ensure uid exists on load for legacy data
  }));
  
  let mockAttendanceLog: AttendanceLogEntry[] = loadFromStorage('tc_db_logs', []);
  let mockActivityStatuses: ActivityStatus[] = loadFromStorage('tc_db_statuses', [
    { id: '1', name: 'Break', color: '#AE8F60' },
    { id: '2', name: 'Training', color: '#3B82F6' },
  ]);
  let mockPayrollChangeTypes: PayrollChangeType[] = loadFromStorage('tc_db_payroll', [
    { id: '1', name: 'Vacation', color: '#10B981' },
    { id: '2', name: 'Sick Day', color: '#F59E0B' },
  ]);
  let mockWorkSchedules: WorkSchedule[] = loadFromStorage('tc_db_schedules', [
    { id: '1', name: 'Morning Shift', startTime: '08:00', endTime: '16:00', days: [1,2,3,4,5] },
  ]);
  let mockTasks: Task[] = loadFromStorage('tc_db_tasks', []);
  let mockCalendarEvents: CalendarEvent[] = loadFromStorage('tc_db_events', []);

  // Implement mock auth functions
  let mockCurrentUser: { uid: string, email: string } | null = null;
  
  return {
    registerWithEmailAndPassword: async (fullName: string, email: string, password: string): Promise<Employee> => {
        if (mockEmployees.some(e => e.email === email)) {
            throw new Error("Email already in use.");
        }
        const newUserUid = getNextId('user');
        const newEmployee: Employee = {
            id: getNextId('employee'),
            uid: newUserUid,
            name: fullName,
            email,
            phone: '',
            location: 'Main Office',
            role: 'employee',
            status: 'Clocked Out',
            lastClockInTime: null,
            currentStatusStartTime: null,
            workScheduleId: null,
        };
        mockEmployees.push(newEmployee);
        saveToStorage('tc_db_employees', mockEmployees);
        return Promise.resolve(newEmployee);
    },
    loginWithEmailAndPassword: async (email: string, password: string): Promise<Employee> => {
        if (!email || !password) throw new Error("El correo y la contraseña son obligatorios.");
        const user = mockEmployees.find(e => e.email === email);
        if (user) {
            // In mock, any password is fine as long as not empty logic is handled by UI
            mockCurrentUser = { uid: user.uid || 'mock-uid', email: user.email };
            return Promise.resolve(user);
        }
        throw new Error("Invalid credentials.");
    },
    logout: async (): Promise<void> => {
        mockCurrentUser = null;
        return Promise.resolve();
    },
    getEmployeeProfile: async (uid: string): Promise<Employee | null> => {
        const user = mockEmployees.find(e => e.uid === uid);
        return Promise.resolve(user || null);
    },
    streamEmployees: (callback: (employees: Employee[]) => void): (() => void) => {
        callback([...mockEmployees]);
        return () => {};
    },
    addEmployee: async (employeeData: Omit<Employee, 'id' | 'status' | 'lastClockInTime' | 'currentStatusStartTime' | 'uid'>): Promise<Employee> => {
        const newEmployee: Employee = {
            ...employeeData,
            id: getNextId('employee'),
            uid: getNextId('user'),
            status: 'Clocked Out',
            lastClockInTime: null,
            currentStatusStartTime: null,
        };
        mockEmployees.push(newEmployee);
        saveToStorage('tc_db_employees', mockEmployees);
        return Promise.resolve(newEmployee);
    },
    streamAttendanceLog: (callback: (log: AttendanceLogEntry[]) => void): (() => void) => {
      callback([...mockAttendanceLog]);
      return () => {};
    },
    getEmployees: async (): Promise<Employee[]> => {
      return Promise.resolve([...mockEmployees]);
    },
    removeEmployee: async (employeeId: string): Promise<{ success: boolean }> => {
      mockEmployees = mockEmployees.filter(e => e.id !== employeeId);
      saveToStorage('tc_db_employees', mockEmployees);
      return Promise.resolve({ success: true });
    },
    updateEmployeeStatus: async (employeeToUpdate: Employee): Promise<Employee> => {
      const index = mockEmployees.findIndex(e => e.id === employeeToUpdate.id);
      if (index > -1) {
        mockEmployees[index] = employeeToUpdate;
        saveToStorage('tc_db_employees', mockEmployees);
      }
      return Promise.resolve(employeeToUpdate);
    },
    updateEmployeeDetails: async (employeeToUpdate: Employee): Promise<Employee> => {
      const index = mockEmployees.findIndex(e => e.id === employeeToUpdate.id);
      if (index > -1) {
        mockEmployees[index] = employeeToUpdate;
        saveToStorage('tc_db_employees', mockEmployees);
      }
      return Promise.resolve(employeeToUpdate);
    },
    addAttendanceLogEntry: async (logEntry: Omit<AttendanceLogEntry, 'id'>): Promise<AttendanceLogEntry> => {
      const newLog: AttendanceLogEntry = { ...logEntry, id: getNextId('log') };
      mockAttendanceLog.push(newLog);
      saveToStorage('tc_db_logs', mockAttendanceLog);
      return Promise.resolve(newLog);
    },
    updateAttendanceLogEntry: async (logId: string, updates: { action: string, timestamp: number }): Promise<AttendanceLogEntry> => {
      const log = mockAttendanceLog.find(l => l.id === logId);
      if (!log) throw new Error("Log not found");
      Object.assign(log, updates);
      saveToStorage('tc_db_logs', mockAttendanceLog);
      return Promise.resolve(log);
    },
    updateEmployeeCurrentSession: async (employeeId: string, newStartTime: number): Promise<{ updatedEmployee: Employee, updatedLog: AttendanceLogEntry }> => {
      const employee = mockEmployees.find(e => e.id === employeeId);
      if (!employee) throw new Error("Employee not found");
      const originalStartTime = employee.currentStatusStartTime;
      if (!originalStartTime) throw new Error("Employee has no active session");
      
      const log = mockAttendanceLog.find(l => l.employeeId === employeeId && l.timestamp === originalStartTime);
      if (!log) throw new Error("Log entry not found");

      employee.currentStatusStartTime = newStartTime;
      if (employee.lastClockInTime === originalStartTime) {
        employee.lastClockInTime = newStartTime;
      }
      log.timestamp = newStartTime;

      saveToStorage('tc_db_employees', mockEmployees);
      saveToStorage('tc_db_logs', mockAttendanceLog);

      return Promise.resolve({ updatedEmployee: employee, updatedLog: log });
    },
    updateTimesheetEntry: async (employeeId: string, startLogId: string, endLogId: string, newStartTime: number, newEndTime: number): Promise<{ updatedLogs: AttendanceLogEntry[] }> => {
        const startLog = mockAttendanceLog.find(l => l.id === startLogId);
        const endLog = mockAttendanceLog.find(l => l.id === endLogId);
        if (!startLog || !endLog) throw new Error("Log entries not found");
        startLog.timestamp = newStartTime;
        endLog.timestamp = newEndTime;
        saveToStorage('tc_db_logs', mockAttendanceLog);
        return Promise.resolve({ updatedLogs: [startLog, endLog] });
    },
    getActivityStatuses: async (): Promise<ActivityStatus[]> => Promise.resolve(mockActivityStatuses),
    addActivityStatus: async (name: string, color: string): Promise<ActivityStatus> => {
        const newStatus = { id: getNextId('status'), name, color };
        mockActivityStatuses.push(newStatus);
        saveToStorage('tc_db_statuses', mockActivityStatuses);
        return Promise.resolve(newStatus);
    },
    removeActivityStatus: async (id: string): Promise<{ success: boolean }> => {
        mockActivityStatuses = mockActivityStatuses.filter(s => s.id !== id);
        saveToStorage('tc_db_statuses', mockActivityStatuses);
        return Promise.resolve({ success: true });
    },
    getPayrollChangeTypes: async (): Promise<PayrollChangeType[]> => Promise.resolve(mockPayrollChangeTypes),
    addPayrollChangeType: async (name: string, color: string): Promise<PayrollChangeType> => {
        const newType = { id: getNextId('payroll'), name, color };
        mockPayrollChangeTypes.push(newType);
        saveToStorage('tc_db_payroll', mockPayrollChangeTypes);
        return Promise.resolve(newType);
    },
    updatePayrollChangeType: async (id: string, updates: Partial<Omit<PayrollChangeType, 'id'>>): Promise<PayrollChangeType> => {
        const type = mockPayrollChangeTypes.find(t => t.id === id);
        if (!type) throw new Error("Payroll change type not found");
        Object.assign(type, updates);
        saveToStorage('tc_db_payroll', mockPayrollChangeTypes);
        return Promise.resolve(type);
    },
    removePayrollChangeType: async (id: string): Promise<{ success: boolean }> => {
        mockPayrollChangeTypes = mockPayrollChangeTypes.filter(t => t.id !== id);
        saveToStorage('tc_db_payroll', mockPayrollChangeTypes);
        return Promise.resolve({ success: true });
    },
    getWorkSchedules: async (): Promise<WorkSchedule[]> => Promise.resolve(mockWorkSchedules),
    addWorkSchedule: async (scheduleData: Omit<WorkSchedule, 'id'>): Promise<WorkSchedule> => {
        const newSchedule = { ...scheduleData, id: getNextId('schedule') };
        mockWorkSchedules.push(newSchedule);
        saveToStorage('tc_db_schedules', mockWorkSchedules);
        return Promise.resolve(newSchedule);
    },
    updateWorkSchedule: async (id: string, updates: Partial<Omit<WorkSchedule, 'id'>>): Promise<WorkSchedule> => {
        const schedule = mockWorkSchedules.find(s => s.id === id);
        if (!schedule) throw new Error("Work schedule not found");
        Object.assign(schedule, updates);
        saveToStorage('tc_db_schedules', mockWorkSchedules);
        return Promise.resolve(schedule);
    },
    removeWorkSchedule: async (id: string): Promise<{ success: boolean }> => {
        mockWorkSchedules = mockWorkSchedules.filter(s => s.id !== id);
        saveToStorage('tc_db_schedules', mockWorkSchedules);
        return Promise.resolve({ success: true });
    },
    getTasks: async (): Promise<Task[]> => Promise.resolve(mockTasks),
    addTask: async (taskData: Omit<Task, 'id'>): Promise<Task> => {
        const newTask = { ...taskData, id: getNextId('task') };
        mockTasks.push(newTask);
        saveToStorage('tc_db_tasks', mockTasks);
        return Promise.resolve(newTask);
    },
    getCalendarEvents: async (): Promise<CalendarEvent[]> => Promise.resolve(mockCalendarEvents),
    addCalendarEvent: async (eventData: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> => {
        const newEvent = { ...eventData, id: getNextId('event') };
        mockCalendarEvents.push(newEvent);
        saveToStorage('tc_db_events', mockCalendarEvents);
        return Promise.resolve(newEvent);
    },
    updateCalendarEvent: async (eventData: CalendarEvent): Promise<CalendarEvent> => {
        const index = mockCalendarEvents.findIndex(e => e.id === eventData.id);
        if (index > -1) {
            mockCalendarEvents[index] = eventData;
            saveToStorage('tc_db_events', mockCalendarEvents);
        }
        return Promise.resolve(eventData);
    },
    removeCalendarEvent: async (eventId: string): Promise<{ success: boolean }> => {
        mockCalendarEvents = mockCalendarEvents.filter(e => e.id !== eventId);
        saveToStorage('tc_db_events', mockCalendarEvents);
        return Promise.resolve({ success: true });
    },
  };
};

// --- REAL API IMPLEMENTATION ---
const createRealApi = () => {
    const getDb = () => {
        if (!db) throw new Error("Firestore is not initialized.");
        return db;
    }
    const getAuth = () => {
        if (!auth) throw new Error("Firebase Auth is not initialized.");
        return auth;
    }

    return {
        registerWithEmailAndPassword: async (fullName: string, email: string, password: string): Promise<Employee> => {
            if (!password) throw new Error("Se requiere una contraseña.");
            
            const userCredential = await getAuth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            if (!user) throw new Error("Failed to create auth user.");

            const employeeData: Employee = {
                id: user.uid,
                uid: user.uid,
                name: fullName,
                email: email,
                phone: '',
                location: 'Main Office',
                role: 'employee',
                status: 'Clocked Out',
                lastClockInTime: null,
                currentStatusStartTime: null,
                workScheduleId: null,
            };

            await getDb().collection('employees').doc(user.uid).set(employeeData);
            return employeeData;
        },

        loginWithEmailAndPassword: async (email: string, password: string): Promise<Employee> => {
            if (!email || !password) throw new Error("El correo y la contraseña son obligatorios.");
            
            const userCredential = await getAuth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            if (!user) throw new Error("Login failed, user not found in auth.");

            const profile = await getEmployeeProfile(user.uid);
            if (!profile) {
                // Do not sign out immediately here to avoid race conditions, let App.tsx handle profile logic
                throw new Error("No employee profile found for this user.");
            }
            return profile;
        },

        logout: async (): Promise<void> => {
            await getAuth().signOut();
        },
        
        getEmployeeProfile: async (uid: string): Promise<Employee | null> => {
            const userDoc = await getDb().collection('employees').doc(uid).get();
            if (!userDoc.exists) return null;
            return { ...(userDoc.data() as Omit<Employee, 'id'>), id: userDoc.id };
        },

        streamEmployees: (callback: (employees: Employee[]) => void): (() => void) => {
            const q = getDb().collection('employees');
            return q.onSnapshot((querySnapshot) => {
                const employees = querySnapshot.docs.map(doc => ({ ...(doc.data() as Omit<Employee, 'id'>), id: doc.id }));
                callback(employees);
            });
        },
        streamAttendanceLog: (callback: (log: AttendanceLogEntry[]) => void): (() => void) => {
            const q = getDb().collection('attendanceLog');
            return q.onSnapshot((querySnapshot) => {
                const log = querySnapshot.docs.map(doc => ({ ...(doc.data() as Omit<AttendanceLogEntry, 'id'>), id: doc.id }));
                callback(log);
            });
        },
        getEmployees: async (): Promise<Employee[]> => {
            const snapshot = await getDb().collection('employees').get();
            return snapshot.docs.map(doc => ({ ...(doc.data() as Omit<Employee, 'id'>), id: doc.id }));
        },
        addEmployee: async (employeeData: Omit<Employee, 'id' | 'status' | 'lastClockInTime' | 'currentStatusStartTime' | 'uid'>): Promise<Employee> => {
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
            
            batch.update(startLogRef, { timestamp: newStartTime });
            batch.update(endLogRef, { timestamp: newEndTime });
            await batch.commit();
            
            return { 
                updatedLogs: [
                    { ...(startLogDoc.data() as Omit<AttendanceLogEntry, 'id'>), id: startLogDoc.id, timestamp: newStartTime },
                    { ...(endLogDoc.data() as Omit<AttendanceLogEntry, 'id'>), id: endLogDoc.id, timestamp: newEndTime },
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

type ApiInterface = ReturnType<typeof createMockApi>;
const api: ApiInterface = isFirebaseEnabled ? createRealApi() : createMockApi();

export const {
    registerWithEmailAndPassword,
    loginWithEmailAndPassword,
    logout,
    getEmployeeProfile,
    streamEmployees,
    streamAttendanceLog,
    getEmployees,
    addEmployee,
    removeEmployee,
    updateEmployeeStatus,
    updateEmployeeDetails,
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
