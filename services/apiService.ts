
import { Employee, AttendanceLogEntry, ActivityStatus, CalendarEvent, PayrollChangeType, WorkSchedule, Company } from '../types';
import { db, auth, isFirebaseEnabled } from './firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/storage';
import { initialEmployees } from '../data/initialData';

// --- HELPER to get current user's company ID (Mock or Real) ---
const getCurrentUserCompanyId = async (): Promise<string | null> => {
    if (!isFirebaseEnabled) return 'mock_company_id';
    
    const user = auth?.currentUser;
    if (!user) return null;
    
    try {
        const doc = await db?.collection('employees').doc(user.uid).get();
        return doc?.data()?.companyId || null;
    } catch {
        return null;
    }
};

// --- REAL API IMPLEMENTATION ---
const createRealApi = () => {
    if (!db || !auth) throw new Error("Firebase not initialized");

    const getCompanyId = async (): Promise<string> => {
        const cid = await getCurrentUserCompanyId();
        if (!cid) throw new Error("No company ID found for user");
        return cid;
    };

    return {
        joinCompany: async (inviteCode: string): Promise<boolean> => {
            const user = auth!.currentUser;
            if (!user) throw new Error("Must be logged in");
            
            // Validate company exists
            const companyDoc = await db!.collection('companies').doc(inviteCode).get();
            if (!companyDoc.exists) throw new Error("Company not found");

            // Update user profile
            await db!.collection('employees').doc(user.uid).update({
                companyId: inviteCode,
                role: 'employee', // Reset role to employee when joining new company
                workScheduleId: null // Reset schedule
            });
            return true;
        },
        migrateLegacyData: async (): Promise<number> => { return 0; },
        getCompanyDetails: async (companyId: string): Promise<Company | null> => {
            const doc = await db!.collection('companies').doc(companyId).get();
            return doc.exists ? { id: doc.id, ...doc.data() } as Company : null;
        },
        registerWithEmailAndPassword: async (fullName: string, email: string, password: string, companyName: string, inviteCode?: string): Promise<Employee> => {
            const userCredential = await auth!.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            if (!user) throw new Error("Registration failed");

            await user.sendEmailVerification();

            let companyId = inviteCode;
            let role: 'admin' | 'employee' = inviteCode ? 'employee' : 'admin';

            // Create Company if new
            if (!companyId) {
                const companyRef = db!.collection('companies').doc();
                companyId = companyRef.id;
                await companyRef.set({
                    id: companyId,
                    name: companyName,
                    ownerId: user.uid,
                    createdAt: Date.now()
                });
                
                // Create default statuses for new company
                const defaultStatuses = [
                    { name: 'Break', color: '#AE8F60' },
                    { name: 'Training', color: '#3B82F6' },
                    { name: 'Lunch', color: '#10B981' }
                ];
                const batch = db!.batch();
                defaultStatuses.forEach(s => {
                    const ref = db!.collection('activityStatuses').doc();
                    batch.set(ref, { ...s, companyId, id: ref.id });
                });
                await batch.commit();
            }

            const newEmployee: Employee = {
                id: user.uid,
                uid: user.uid,
                companyId: companyId!,
                name: fullName,
                email,
                phone: '',
                location: 'Oficina Principal',
                role,
                status: 'Clocked Out',
                lastClockInTime: null,
                currentStatusStartTime: null,
                workScheduleId: null
            };

            await db!.collection('employees').doc(user.uid).set(newEmployee);
            return newEmployee;
        },
        loginWithEmailAndPassword: async (email: string, password: string): Promise<Employee> => {
            const userCredential = await auth!.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            if (!user) throw new Error("Login failed");

            const doc = await db!.collection('employees').doc(user.uid).get();
            if (!doc.exists) {
                // If auth exists but no firestore doc (rare inconsistency), create basic doc? 
                // Or throw error. Let's throw for now.
                throw new Error("User profile not found.");
            }
            return { id: doc.id, ...doc.data() } as Employee;
        },
        logout: async () => {
            await auth!.signOut();
        },
        sendPasswordResetEmail: async (email: string) => {
            await auth!.sendPasswordResetEmail(email);
        },
        verifyPasswordResetCode: async (oobCode: string): Promise<string> => {
            // BYPASS FOR DEMO
            if (oobCode === 'demo_code') return 'usuario_demo@ejemplo.com';
            return await auth!.verifyPasswordResetCode(oobCode);
        },
        confirmPasswordReset: async (oobCode: string, newPassword: string) => {
            // BYPASS FOR DEMO
            if (oobCode === 'demo_code') {
                // In a real demo, we might update the current user's password if logged in, 
                // but since reset usually happens logged out, we just simulate success.
                return Promise.resolve(); 
            }
            await auth!.confirmPasswordReset(oobCode, newPassword);
        },
        verifyEmail: async (oobCode: string) => {
            await auth!.applyActionCode(oobCode);
        },
        changePassword: async (password: string) => {
            const user = auth!.currentUser;
            if (!user) throw new Error("No user logged in");
            await user.updatePassword(password);
        },
        getEmployeeProfile: async (uid: string): Promise<Employee | null> => {
            const doc = await db!.collection('employees').doc(uid).get();
            return doc.exists ? { id: doc.id, ...doc.data() } as Employee : null;
        },
        streamEmployees: (callback: (employees: Employee[]) => void) => {
            // Only stream employees for the current user's company
            // We need the companyId first. This is tricky inside a pure stream function 
            // if we don't pass companyId. 
            // Workaround: Listen to auth state to get company, then stream.
            // For simplicity in this structure, we'll assume the component handles the wait for auth
            // or we do a one-time fetch of companyId then subscribe.
            
            const user = auth!.currentUser;
            if (!user) return () => {};

            // We need to fetch the user's companyId first to filter
            let unsubscribe = () => {};
            
            db!.collection('employees').doc(user.uid).get().then(doc => {
                if(doc.exists) {
                    const companyId = doc.data()?.companyId;
                    if(companyId) {
                        unsubscribe = db!.collection('employees')
                            .where('companyId', '==', companyId)
                            .onSnapshot(snapshot => {
                                const emps = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
                                callback(emps);
                            });
                    }
                }
            });

            return () => unsubscribe();
        },
        addEmployee: async (employeeData: Omit<Employee, 'id' | 'status' | 'lastClockInTime' | 'currentStatusStartTime' | 'uid'>) => {
            // Admin adds an employee. 
            // In Firebase Auth, we can't easily create a user without logging them in (unless using Admin SDK).
            // Workaround: Create a "Shadow" employee document. The actual user must register themselves 
            // and we link them via email or an invite code logic. 
            // For this app's "Add Employee" modal, we'll creates a placeholder doc.
            
            // If companyId is not passed in data, try to get from current user
            let companyId = employeeData.companyId;
            if (!companyId) {
                companyId = await getCompanyId();
            }

            const newRef = db!.collection('employees').doc(); // Auto ID
            const newEmployee = {
                ...employeeData,
                id: newRef.id, // Use doc ID as ID
                uid: newRef.id, // Placeholder UID matches Doc ID until real register
                companyId,
                status: 'Clocked Out',
                lastClockInTime: null,
                currentStatusStartTime: null
            };
            await newRef.set(newEmployee);
            return newEmployee as Employee;
        },
        streamAttendanceLog: (callback: (log: AttendanceLogEntry[]) => void) => {
            const user = auth!.currentUser;
            if (!user) return () => {};

            let unsubscribe = () => {};
            db!.collection('employees').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    const companyId = doc.data()?.companyId;
                    if (companyId) {
                        unsubscribe = db!.collection('attendanceLog')
                            .where('companyId', '==', companyId)
                            .orderBy('timestamp', 'desc')
                            .limit(500) // Safety limit
                            .onSnapshot(snapshot => {
                                const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceLogEntry));
                                callback(logs);
                            });
                    }
                }
            });
            return () => unsubscribe();
        },
        getEmployees: async (): Promise<Employee[]> => {
            const cid = await getCompanyId();
            const snapshot = await db!.collection('employees').where('companyId', '==', cid).get();
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
        },
        removeEmployee: async (employeeId: string) => {
            await db!.collection('employees').doc(employeeId).delete();
            return { success: true };
        },
        updateEmployeeStatus: async (employeeToUpdate: Employee) => {
            await db!.collection('employees').doc(employeeToUpdate.id).update({
                status: employeeToUpdate.status,
                lastClockInTime: employeeToUpdate.lastClockInTime,
                currentStatusStartTime: employeeToUpdate.currentStatusStartTime
            });
            return employeeToUpdate;
        },
        updateEmployeeDetails: async (employeeToUpdate: Employee) => {
            // Exclude fields that shouldn't be overwritten blindly if passed incorrectly
            const { id, ...data } = employeeToUpdate;
            await db!.collection('employees').doc(id).update(data);
            return employeeToUpdate;
        },
        uploadProfilePicture: async (userId: string, file: File): Promise<string> => {
            const storageRef = firebase.storage().ref();
            const fileRef = storageRef.child(`avatars/${userId}/${file.name}`);
            await fileRef.put(file);
            const url = await fileRef.getDownloadURL();
            
            await db!.collection('employees').doc(userId).update({ avatarUrl: url });
            return url;
        },
        addAttendanceLogEntry: async (logEntry: Omit<AttendanceLogEntry, 'id'>) => {
            const ref = db!.collection('attendanceLog').doc();
            const newLog = { ...logEntry, id: ref.id };
            await ref.set(newLog);
            return newLog;
        },
        updateAttendanceLogEntry: async (logId: string, updates: { action: string, timestamp: number }) => {
            await db!.collection('attendanceLog').doc(logId).update(updates);
            const doc = await db!.collection('attendanceLog').doc(logId).get();
            return { id: doc.id, ...doc.data() } as AttendanceLogEntry;
        },
        updateEmployeeCurrentSession: async (employeeId: string, newStartTime: number) => {
            const employeeRef = db!.collection('employees').doc(employeeId);
            const empDoc = await employeeRef.get();
            if (!empDoc.exists) throw new Error("Employee not found");
            
            const employee = empDoc.data() as Employee;
            const originalStartTime = employee.currentStatusStartTime;
            
            if (!originalStartTime) throw new Error("No active session");

            // Find matching log
            const logsQuery = await db!.collection('attendanceLog')
                .where('employeeId', '==', employeeId)
                .where('timestamp', '==', originalStartTime)
                .limit(1)
                .get();
            
            if (logsQuery.empty) throw new Error("Log not found");
            const logDoc = logsQuery.docs[0];

            const batch = db!.batch();
            
            batch.update(employeeRef, {
                currentStatusStartTime: newStartTime,
                lastClockInTime: employee.lastClockInTime === originalStartTime ? newStartTime : employee.lastClockInTime
            });
            batch.update(logDoc.ref, { timestamp: newStartTime });
            
            await batch.commit();
            
            const updatedEmp = (await employeeRef.get()).data() as Employee;
            const updatedLog = (await logDoc.ref.get()).data() as AttendanceLogEntry;
            
            return { updatedEmployee: updatedEmp, updatedLog };
        },
        // Config & Settings
        getActivityStatuses: async () => {
            const cid = await getCompanyId();
            const snap = await db!.collection('activityStatuses').where('companyId', '==', cid).get();
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityStatus));
        },
        addActivityStatus: async (name, color) => {
            const cid = await getCompanyId();
            const ref = db!.collection('activityStatuses').doc();
            await ref.set({ id: ref.id, companyId: cid, name, color });
        },
        removeActivityStatus: async (id) => {
            await db!.collection('activityStatuses').doc(id).delete();
        },
        getWorkSchedules: async () => {
            const cid = await getCompanyId();
            const snap = await db!.collection('workSchedules').where('companyId', '==', cid).get();
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkSchedule));
        },
        addWorkSchedule: async (schedule) => {
            const cid = await getCompanyId();
            const ref = db!.collection('workSchedules').doc();
            await ref.set({ ...schedule, id: ref.id, companyId: cid });
        },
        updateWorkSchedule: async (id, updates) => {
            await db!.collection('workSchedules').doc(id).update(updates);
        },
        removeWorkSchedule: async (id) => {
            await db!.collection('workSchedules').doc(id).delete();
        },
        getPayrollChangeTypes: async () => {
            const cid = await getCompanyId();
            const snap = await db!.collection('payrollChangeTypes').where('companyId', '==', cid).get();
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as PayrollChangeType));
        },
        addPayrollChangeType: async (name, color, isExclusive, adminOnly) => {
            const cid = await getCompanyId();
            const ref = db!.collection('payrollChangeTypes').doc();
            await ref.set({ id: ref.id, companyId: cid, name, color, isExclusive, adminOnly });
        },
        updatePayrollChangeType: async (id, updates) => {
            await db!.collection('payrollChangeTypes').doc(id).update(updates);
        },
        removePayrollChangeType: async (id) => {
            await db!.collection('payrollChangeTypes').doc(id).delete();
        },
        getCalendarEvents: async () => {
            const cid = await getCompanyId();
            const snap = await db!.collection('calendarEvents').where('companyId', '==', cid).get();
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent));
        },
        addCalendarEvent: async (event) => {
            const cid = await getCompanyId();
            const ref = db!.collection('calendarEvents').doc();
            await ref.set({ ...event, id: ref.id, companyId: cid });
        },
        updateCalendarEvent: async (event) => {
            await db!.collection('calendarEvents').doc(event.id).update(event);
        },
        removeCalendarEvent: async (id) => {
            await db!.collection('calendarEvents').doc(id).delete();
        },
        updateTimesheetEntry: async (employeeId, startLogId, endLogId, newStartTime, newEndTime) => {
            const batch = db!.batch();
            const startRef = db!.collection('attendanceLog').doc(startLogId);
            const endRef = db!.collection('attendanceLog').doc(endLogId);
            
            batch.update(startRef, { timestamp: newStartTime });
            batch.update(endRef, { timestamp: newEndTime });
            
            await batch.commit();
        }
    };
};

// --- MOCK API IMPLEMENTATION ---
const createMockApi = () => {
  // ... mock data initialization ...
  let mockEmployees: Employee[] = JSON.parse(JSON.stringify(initialEmployees));
  mockEmployees.forEach(e => e.companyId = 'mock_company_id');

  let mockCompanies: Company[] = [
      { id: 'mock_company_id', name: 'Demo Company Inc.', ownerId: '1', createdAt: Date.now() }
  ];

  let mockAttendanceLog: AttendanceLogEntry[] = [];
  let mockActivityStatuses: ActivityStatus[] = [
    { id: '1', name: 'Break', color: '#AE8F60', companyId: 'mock_company_id' },
    { id: '2', name: 'Training', color: '#3B82F6', companyId: 'mock_company_id' },
  ];
  let mockPayrollChangeTypes: PayrollChangeType[] = [
    { id: '1', name: 'Vacation', color: '#10B981', isExclusive: false, adminOnly: false, companyId: 'mock_company_id' },
    { id: '2', name: 'Sick', color: '#3B82F6', isExclusive: false, adminOnly: true, companyId: 'mock_company_id' },
    { id: '3', name: 'Family Day', color: '#F59E0B', isExclusive: true, adminOnly: false, companyId: 'mock_company_id' },
  ];
  let mockWorkSchedules: WorkSchedule[] = [
    { id: '1', name: 'Morning Shift', startTime: '08:00', endTime: '16:00', days: [1,2,3,4,5], companyId: 'mock_company_id' },
  ];
  let mockCalendarEvents: CalendarEvent[] = [];

  let mockCurrentUser: { uid: string, email: string } | null = null;
  
  const getNextId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Internal helper to simulate listeners
  const listeners: { employees: Function[], logs: Function[] } = { employees: [], logs: [] };
  const notifyListeners = () => {
      listeners.employees.forEach(cb => cb([...mockEmployees]));
      listeners.logs.forEach(cb => cb([...mockAttendanceLog]));
  };

  return {
    joinCompany: async (inviteCode: string): Promise<boolean> => {
        return Promise.resolve(true);
    },
    migrateLegacyData: async (): Promise<number> => {
        return Promise.resolve(0);
    },
    getCompanyDetails: async (companyId: string): Promise<Company | null> => {
        return Promise.resolve(mockCompanies.find(c => c.id === companyId) || null);
    },
    registerWithEmailAndPassword: async (fullName: string, email: string, password: string, companyName: string, inviteCode?: string): Promise<Employee> => {
        if (mockEmployees.some(e => e.email === email && e.uid && !e.uid.startsWith('manual_'))) {
            throw new Error("Email already in use.");
        }
        
        let companyId = inviteCode;
        let role: 'admin' | 'employee';

        if (inviteCode) {
            role = 'employee';
            companyId = inviteCode;
        } else {
            role = 'admin';
            companyId = getNextId('company');
            mockCompanies.push({
                id: companyId,
                name: companyName,
                ownerId: getNextId('user_placeholder'),
                createdAt: Date.now()
            });
        }

        const newUser = {
            uid: getNextId('user'),
            name: fullName,
            email,
        };
        
        const newEmployee: Employee = {
            ...newUser,
            id: getNextId('employee'),
            companyId: companyId!,
            phone: '',
            location: 'Main Office',
            role: role,
            status: 'Clocked Out',
            lastClockInTime: null,
            currentStatusStartTime: null,
            workScheduleId: null,
        };
        mockEmployees.push(newEmployee);
        notifyListeners();
        return Promise.resolve(newEmployee);
    },
    loginWithEmailAndPassword: async (email: string, password: string): Promise<Employee> => {
        if (!email || !password) throw new Error("Email and password are required.");
        
        const user = mockEmployees.find(e => e.email === email);
        if (user) {
            mockCurrentUser = { uid: user.uid!, email: user.email };
            return Promise.resolve(user);
        }
        throw new Error("Invalid credentials.");
    },
    logout: async (): Promise<void> => {
        mockCurrentUser = null;
        return Promise.resolve();
    },
    sendPasswordResetEmail: async (email: string): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return Promise.resolve();
    },
    verifyPasswordResetCode: async (oobCode: string): Promise<string> => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return "usuario_demo@ejemplo.com";
    },
    confirmPasswordReset: async (oobCode: string, newPassword: string): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return Promise.resolve();
    },
    verifyEmail: async (oobCode: string): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return Promise.resolve();
    },
    changePassword: async (password: string): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return Promise.resolve();
    },
    getEmployeeProfile: async (uid: string): Promise<Employee | null> => {
        const user = mockEmployees.find(e => e.uid === uid);
        return Promise.resolve(user || null);
    },
    streamEmployees: (callback: (employees: Employee[]) => void): (() => void) => {
        listeners.employees.push(callback);
        callback([...mockEmployees]);
        return () => {
            listeners.employees = listeners.employees.filter(cb => cb !== callback);
        };
    },
    addEmployee: async (employeeData: Omit<Employee, 'id' | 'status' | 'lastClockInTime' | 'currentStatusStartTime' | 'uid'>): Promise<Employee> => {
        const newEmployee: Employee = {
            ...employeeData,
            id: getNextId('employee'),
            uid: `manual_${Date.now()}`,
            status: 'Clocked Out',
            lastClockInTime: null,
            currentStatusStartTime: null,
        };
        mockEmployees.push(newEmployee);
        notifyListeners();
        return Promise.resolve(newEmployee);
    },
    streamAttendanceLog: (callback: (log: AttendanceLogEntry[]) => void): (() => void) => {
      listeners.logs.push(callback);
      callback([...mockAttendanceLog]);
      return () => {
          listeners.logs = listeners.logs.filter(cb => cb !== callback);
      };
    },
    getEmployees: async (): Promise<Employee[]> => {
      return Promise.resolve([...mockEmployees]);
    },
    removeEmployee: async (employeeId: string): Promise<{ success: boolean }> => {
      mockEmployees = mockEmployees.filter(e => e.id !== employeeId);
      notifyListeners();
      return Promise.resolve({ success: true });
    },
    updateEmployeeStatus: async (employeeToUpdate: Employee): Promise<Employee> => {
      const index = mockEmployees.findIndex(e => e.id === employeeToUpdate.id);
      if (index > -1) {
        mockEmployees[index] = employeeToUpdate;
        notifyListeners();
      }
      return Promise.resolve(employeeToUpdate);
    },
    updateEmployeeDetails: async (employeeToUpdate: Employee): Promise<Employee> => {
      const index = mockEmployees.findIndex(e => e.id === employeeToUpdate.id);
      if (index > -1) {
        mockEmployees[index] = employeeToUpdate;
        notifyListeners();
      }
      return Promise.resolve(employeeToUpdate);
    },
    uploadProfilePicture: async (userId: string, file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result as string;
                const emp = mockEmployees.find(e => e.id === userId);
                if (emp) {
                    emp.avatarUrl = base64;
                    notifyListeners();
                }
                resolve(base64);
            };
            reader.readAsDataURL(file);
        });
    },
    addAttendanceLogEntry: async (logEntry: Omit<AttendanceLogEntry, 'id'>): Promise<AttendanceLogEntry> => {
      const newLog: AttendanceLogEntry = { ...logEntry, id: getNextId('log') };
      mockAttendanceLog.push(newLog);
      notifyListeners();
      return Promise.resolve(newLog);
    },
    updateAttendanceLogEntry: async (logId: string, updates: { action: string, timestamp: number }): Promise<AttendanceLogEntry> => {
      const log = mockAttendanceLog.find(l => l.id === logId);
      if (!log) throw new Error("Log not found");
      Object.assign(log, updates);
      notifyListeners();
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
      notifyListeners();
      
      return Promise.resolve({ updatedEmployee: employee, updatedLog: log });
    },
    // Config
    getActivityStatuses: async (): Promise<ActivityStatus[]> => Promise.resolve(mockActivityStatuses),
    addActivityStatus: async (name: string, color: string): Promise<void> => {
        mockActivityStatuses.push({ id: getNextId('status'), name, color, companyId: 'mock_company_id' });
        return Promise.resolve();
    },
    removeActivityStatus: async (id: string): Promise<void> => {
        mockActivityStatuses = mockActivityStatuses.filter(s => s.id !== id);
        return Promise.resolve();
    },
    getWorkSchedules: async (): Promise<WorkSchedule[]> => Promise.resolve(mockWorkSchedules),
    addWorkSchedule: async (schedule: Omit<WorkSchedule, 'id' | 'companyId'>): Promise<void> => {
        mockWorkSchedules.push({ ...schedule, id: getNextId('schedule'), companyId: 'mock_company_id' });
        return Promise.resolve();
    },
    updateWorkSchedule: async (id: string, updates: Partial<WorkSchedule>): Promise<void> => {
        const idx = mockWorkSchedules.findIndex(s => s.id === id);
        if (idx > -1) mockWorkSchedules[idx] = { ...mockWorkSchedules[idx], ...updates };
        return Promise.resolve();
    },
    removeWorkSchedule: async (id: string): Promise<void> => {
        mockWorkSchedules = mockWorkSchedules.filter(s => s.id !== id);
        return Promise.resolve();
    },
    getPayrollChangeTypes: async (): Promise<PayrollChangeType[]> => Promise.resolve(mockPayrollChangeTypes),
    addPayrollChangeType: async (name: string, color: string, isExclusive: boolean, adminOnly: boolean): Promise<void> => {
        mockPayrollChangeTypes.push({ id: getNextId('payroll'), name, color, isExclusive, adminOnly, companyId: 'mock_company_id' });
        return Promise.resolve();
    },
    updatePayrollChangeType: async (id: string, updates: Partial<PayrollChangeType>): Promise<void> => {
        const idx = mockPayrollChangeTypes.findIndex(p => p.id === id);
        if (idx > -1) mockPayrollChangeTypes[idx] = { ...mockPayrollChangeTypes[idx], ...updates };
        return Promise.resolve();
    },
    removePayrollChangeType: async (id: string): Promise<void> => {
        mockPayrollChangeTypes = mockPayrollChangeTypes.filter(p => p.id !== id);
        return Promise.resolve();
    },
    // Calendar
    getCalendarEvents: async (): Promise<CalendarEvent[]> => Promise.resolve(mockCalendarEvents),
    addCalendarEvent: async (event: Omit<CalendarEvent, 'id' | 'companyId'>): Promise<void> => {
        mockCalendarEvents.push({ ...event, id: getNextId('event'), companyId: 'mock_company_id' });
        return Promise.resolve();
    },
    updateCalendarEvent: async (event: CalendarEvent): Promise<void> => {
        const idx = mockCalendarEvents.findIndex(e => e.id === event.id);
        if (idx > -1) mockCalendarEvents[idx] = event;
        return Promise.resolve();
    },
    removeCalendarEvent: async (id: string): Promise<void> => {
        mockCalendarEvents = mockCalendarEvents.filter(e => e.id !== id);
        return Promise.resolve();
    },
    // Timesheet
    updateTimesheetEntry: async (employeeId: string, startLogId: string, endLogId: string, newStartTime: number, newEndTime: number): Promise<void> => {
        const startLog = mockAttendanceLog.find(l => l.id === startLogId);
        const endLog = mockAttendanceLog.find(l => l.id === endLogId);
        if (startLog) startLog.timestamp = newStartTime;
        if (endLog) endLog.timestamp = newEndTime;
        
        notifyListeners();
        return Promise.resolve();
    }
  };
};

const api = isFirebaseEnabled ? createRealApi() : createMockApi();

// Exporting individual functions for App.tsx usage
export const {
    joinCompany,
    migrateLegacyData,
    getCompanyDetails,
    registerWithEmailAndPassword,
    loginWithEmailAndPassword,
    logout,
    sendPasswordResetEmail,
    verifyPasswordResetCode,
    confirmPasswordReset,
    verifyEmail,
    changePassword,
    getEmployeeProfile,
    streamEmployees,
    addEmployee,
    streamAttendanceLog,
    getEmployees,
    removeEmployee,
    updateEmployeeStatus,
    updateEmployeeDetails,
    uploadProfilePicture,
    addAttendanceLogEntry,
    updateAttendanceLogEntry,
    updateEmployeeCurrentSession,
    getActivityStatuses,
    addActivityStatus,
    removeActivityStatus,
    getWorkSchedules,
    addWorkSchedule,
    updateWorkSchedule,
    removeWorkSchedule,
    getPayrollChangeTypes,
    addPayrollChangeType,
    updatePayrollChangeType,
    removePayrollChangeType,
    getCalendarEvents,
    addCalendarEvent,
    updateCalendarEvent,
    removeCalendarEvent,
    updateTimesheetEntry
} = api;
