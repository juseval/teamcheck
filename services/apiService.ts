
import { Employee, AttendanceLogEntry, ActivityStatus, CalendarEvent, PayrollChangeType, WorkSchedule, Company, MapItem } from '../types';
import { db, auth, isFirebaseEnabled } from './firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/storage';
import { initialEmployees } from '../data/initialData';

// --- MOCK DATA & STATE (For Demo Mode) ---
let mockEmployees: Employee[] = [...initialEmployees];
let mockAttendanceLog: AttendanceLogEntry[] = [];
let mockActivityStatuses: ActivityStatus[] = [
    { id: '1', name: 'Break', color: '#AE8F60', companyId: 'mock_company_id' },
    { id: '2', name: 'Lunch', color: '#10B981', companyId: 'mock_company_id' },
    { id: '3', name: 'Training', color: '#3B82F6', companyId: 'mock_company_id' },
    { id: '4', name: 'Meeting', color: '#8B5CF6', companyId: 'mock_company_id' }
];
let mockWorkSchedules: WorkSchedule[] = [
    { id: '1', name: 'Morning Shift', startTime: '08:00', endTime: '16:00', days: [1, 2, 3, 4, 5], companyId: 'mock_company_id' },
    { id: '2', name: 'Evening Shift', startTime: '16:00', endTime: '00:00', days: [1, 2, 3, 4, 5], companyId: 'mock_company_id' }
];
let mockPayrollChangeTypes: PayrollChangeType[] = [
    { id: '1', name: 'Vacation', color: '#10B981', isExclusive: true, adminOnly: false, companyId: 'mock_company_id' },
    { id: '2', name: 'Sick Leave', color: '#EF4444', isExclusive: true, adminOnly: false, companyId: 'mock_company_id' },
    { id: '3', name: 'Remote Work', color: '#3B82F6', isExclusive: false, adminOnly: false, companyId: 'mock_company_id' }
];
let mockCalendarEvents: CalendarEvent[] = [];

// Initial Map Layout based on "Sale Strategy" image
let mockMapItems: MapItem[] = [
    // Entrance Wall
    { id: 'w1', type: 'wall', x: 5, y: 15, width: 2, height: 40, rotation: 0, companyId: 'mock_company_id' },
    // Entrance Camera
    { id: 'cam1', type: 'camera', x: 8, y: 25, rotation: 45, companyId: 'mock_company_id' },
    
    // -- Left Cluster (Sales Strategy) --
    { id: 'd1', type: 'desk', x: 12, y: 35, label: '1', companyId: 'mock_company_id' },
    { id: 'd2', type: 'desk', x: 18, y: 35, label: '2', companyId: 'mock_company_id' },
    { id: 'd3', type: 'desk', x: 12, y: 48, label: '3', companyId: 'mock_company_id' },
    { id: 'd4', type: 'desk', x: 18, y: 48, label: '4', companyId: 'mock_company_id' },
    { id: 'd5', type: 'desk', x: 12, y: 65, label: '5', companyId: 'mock_company_id' },
    { id: 'd6', type: 'desk', x: 18, y: 65, label: '6', companyId: 'mock_company_id' },
    { id: 'd7', type: 'desk', x: 12, y: 78, label: '7', companyId: 'mock_company_id' },
    { id: 'd8', type: 'desk', x: 18, y: 78, label: '8', companyId: 'mock_company_id' },

    // -- Top Lockers & Kitchen Area --
    { id: 'l1', type: 'locker', x: 25, y: 10, rotation: 0, companyId: 'mock_company_id' },
    { id: 'l2', type: 'locker', x: 30, y: 10, rotation: 0, companyId: 'mock_company_id' },
    { id: 'mt1', type: 'meeting_table', x: 35, y: 25, label: 'Kitchen', companyId: 'mock_company_id' },

    // -- Middle Cluster --
    { id: 'd9', type: 'desk', x: 30, y: 35, label: '9', companyId: 'mock_company_id' },
    { id: 'd10', type: 'desk', x: 36, y: 35, label: '10', companyId: 'mock_company_id' },
    { id: 'd11', type: 'desk', x: 30, y: 48, label: '11', companyId: 'mock_company_id' },
    { id: 'd12', type: 'desk', x: 36, y: 48, label: '12', companyId: 'mock_company_id' },

    // -- Center Islands (Yellow/Orange) --
    { id: 'd13', type: 'desk', x: 45, y: 35, label: '13', companyId: 'mock_company_id' },
    { id: 'd14', type: 'desk', x: 51, y: 35, label: '14', companyId: 'mock_company_id' },
    { id: 'd15', type: 'desk', x: 45, y: 48, label: '15', companyId: 'mock_company_id' },
    { id: 'd16', type: 'desk', x: 51, y: 48, label: '16', companyId: 'mock_company_id' },

    // -- Right Cluster --
    { id: 'd17', type: 'desk', x: 65, y: 35, label: '17', companyId: 'mock_company_id' },
    { id: 'd18', type: 'desk', x: 71, y: 35, label: '18', companyId: 'mock_company_id' },
    { id: 'd19', type: 'desk', x: 65, y: 48, label: '19', companyId: 'mock_company_id' },
    { id: 'd20', type: 'desk', x: 71, y: 48, label: '20', companyId: 'mock_company_id' },

    // -- Bottom Right Cluster --
    { id: 'd21', type: 'desk', x: 65, y: 65, label: '21', companyId: 'mock_company_id' },
    { id: 'd22', type: 'desk', x: 71, y: 65, label: '22', companyId: 'mock_company_id' },
    { id: 'd23', type: 'desk', x: 65, y: 78, label: '23', companyId: 'mock_company_id' },
    { id: 'd24', type: 'desk', x: 71, y: 78, label: '24', companyId: 'mock_company_id' },

    // -- Far Right Offices --
    { id: 'w2', type: 'wall', x: 80, y: 10, width: 2, height: 80, rotation: 0, companyId: 'mock_company_id' },
    { id: 'rl1', type: 'room_label', x: 90, y: 15, label: 'Storage', companyId: 'mock_company_id' },
    { id: 'rl2', type: 'room_label', x: 90, y: 35, label: 'Sebastian', companyId: 'mock_company_id' },
    { id: 'rl3', type: 'room_label', x: 90, y: 55, label: 'Lemus', companyId: 'mock_company_id' },
    
    // Some decorations
    { id: 'p1', type: 'plant', x: 5, y: 5, companyId: 'mock_company_id' },
    { id: 'p2', type: 'plant', x: 75, y: 5, companyId: 'mock_company_id' },
];

// Helper for mock IDs
const getNextId = (prefix: string = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Mock listeners
let employeeListeners: ((employees: Employee[]) => void)[] = [];
let logListeners: ((log: AttendanceLogEntry[]) => void)[] = [];

const notifyListeners = () => {
    employeeListeners.forEach(l => l([...mockEmployees]));
    logListeners.forEach(l => l([...mockAttendanceLog]));
};

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

// --- MOCK API IMPLEMENTATION ---
const createMockApi = () => ({
    joinCompany: async (inviteCode: string): Promise<boolean> => {
        console.log(`[Mock] Joining company ${inviteCode}`);
        return true;
    },
    migrateLegacyData: async (): Promise<number> => 0,
    getCompanyDetails: async (companyId: string): Promise<Company | null> => {
        if (companyId === 'mock_company_id') return { id: 'mock_company_id', name: 'Demo Company', ownerId: '1', createdAt: Date.now() };
        return null;
    },
    registerWithEmailAndPassword: async (fullName: string, email: string, password: string, companyName: string, inviteCode?: string): Promise<Employee> => {
        const newEmp: Employee = {
            id: getNextId('emp'),
            uid: getNextId('uid'),
            companyId: inviteCode || 'mock_company_id',
            name: fullName,
            email,
            phone: '',
            location: 'Oficina Principal',
            role: inviteCode ? 'employee' : 'admin',
            status: 'Clocked Out',
            lastClockInTime: null,
            currentStatusStartTime: null,
            workScheduleId: null,
            seatId: null
        };
        mockEmployees.push(newEmp);
        notifyListeners();
        return newEmp;
    },
    loginWithEmailAndPassword: async (email: string, password: string): Promise<Employee> => {
        const user = mockEmployees.find(e => e.email === email);
        if (user) return user;
        // If not found in mock data, return default admin for demo
        return mockEmployees[0];
    },
    logout: async () => {},
    sendPasswordResetEmail: async (email: string) => {},
    verifyPasswordResetCode: async (oobCode: string) => 'demo@example.com',
    confirmPasswordReset: async (oobCode: string, newPassword: string) => {},
    verifyEmail: async (oobCode: string) => {},
    changePassword: async (password: string) => {},
    getEmployeeProfile: async (uid: string): Promise<Employee | null> => {
        return mockEmployees.find(e => e.uid === uid || e.id === uid) || mockEmployees[0];
    },
    streamEmployees: (callback: (employees: Employee[]) => void) => {
        employeeListeners.push(callback);
        callback([...mockEmployees]);
        return () => { employeeListeners = employeeListeners.filter(l => l !== callback); };
    },
    addEmployee: async (employeeData: any) => {
        const newEmp = { ...employeeData, id: getNextId('emp'), status: 'Clocked Out', lastClockInTime: null, currentStatusStartTime: null };
        mockEmployees.push(newEmp);
        notifyListeners();
        return newEmp;
    },
    streamAttendanceLog: (callback: (log: AttendanceLogEntry[]) => void) => {
        logListeners.push(callback);
        callback([...mockAttendanceLog]);
        return () => { logListeners = logListeners.filter(l => l !== callback); };
    },
    getEmployees: async () => [...mockEmployees],
    removeEmployee: async (id: string) => {
        mockEmployees = mockEmployees.filter(e => e.id !== id);
        notifyListeners();
        return { success: true };
    },
    updateEmployeeStatus: async (employee: Employee) => {
        const idx = mockEmployees.findIndex(e => e.id === employee.id);
        if (idx > -1) mockEmployees[idx] = employee;
        notifyListeners();
        return employee;
    },
    updateEmployeeDetails: async (employee: Employee) => {
        const idx = mockEmployees.findIndex(e => e.id === employee.id);
        if (idx > -1) mockEmployees[idx] = employee;
        notifyListeners();
        return employee;
    },
    // New function for Seating Chart
    updateEmployeeSeat: async (employeeId: string, seatId: string | null) => {
        const idx = mockEmployees.findIndex(e => e.id === employeeId);
        if (idx > -1) {
            // Remove seat from any other employee if seatId is not null (unique seats)
            if (seatId) {
                const prevOwnerIdx = mockEmployees.findIndex(e => e.seatId === seatId && e.id !== employeeId);
                if (prevOwnerIdx > -1) mockEmployees[prevOwnerIdx].seatId = null;
            }
            mockEmployees[idx].seatId = seatId;
            notifyListeners();
        }
        return Promise.resolve();
    },
    uploadProfilePicture: async (userId: string, file: File) => {
        return URL.createObjectURL(file);
    },
    addAttendanceLogEntry: async (entry: any) => {
        const newEntry = { ...entry, id: getNextId('log') };
        mockAttendanceLog.unshift(newEntry); // Prepend
        notifyListeners();
        return newEntry;
    },
    updateAttendanceLogEntry: async (id: string, updates: any) => {
        const idx = mockAttendanceLog.findIndex(l => l.id === id);
        if (idx > -1) mockAttendanceLog[idx] = { ...mockAttendanceLog[idx], ...updates };
        notifyListeners();
        return mockAttendanceLog[idx];
    },
    updateEmployeeCurrentSession: async (id: string, newStartTime: number) => {
        // Mock implementation for editing session time
        const emp = mockEmployees.find(e => e.id === id);
        if (emp && emp.currentStatusStartTime) {
            const oldTime = emp.currentStatusStartTime;
            emp.currentStatusStartTime = newStartTime;
            if (emp.lastClockInTime === oldTime) emp.lastClockInTime = newStartTime;
            
            // Find corresponding log
            const log = mockAttendanceLog.find(l => l.employeeId === id && l.timestamp === oldTime);
            if (log) log.timestamp = newStartTime;
            
            notifyListeners();
        }
        return { updatedEmployee: emp, updatedLog: null };
    },
    // Config
    getActivityStatuses: async () => mockActivityStatuses,
    addActivityStatus: async (name: string, color: string) => {
        mockActivityStatuses.push({ id: getNextId('status'), name, color, companyId: 'mock_company_id' });
    },
    removeActivityStatus: async (id: string) => {
        mockActivityStatuses = mockActivityStatuses.filter(s => s.id !== id);
    },
    getWorkSchedules: async () => mockWorkSchedules,
    addWorkSchedule: async (schedule: any) => {
        mockWorkSchedules.push({ ...schedule, id: getNextId('schedule'), companyId: 'mock_company_id' });
    },
    updateWorkSchedule: async (id: string, updates: any) => {
        const idx = mockWorkSchedules.findIndex(s => s.id === id);
        if (idx > -1) mockWorkSchedules[idx] = { ...mockWorkSchedules[idx], ...updates };
    },
    removeWorkSchedule: async (id: string) => {
        mockWorkSchedules = mockWorkSchedules.filter(s => s.id !== id);
    },
    getPayrollChangeTypes: async () => mockPayrollChangeTypes,
    addPayrollChangeType: async (name: string, color: string, isExclusive: boolean, adminOnly: boolean) => {
        mockPayrollChangeTypes.push({ id: getNextId('payroll'), name, color, isExclusive, adminOnly, companyId: 'mock_company_id' });
    },
    updatePayrollChangeType: async (id: string, updates: any) => {
        const idx = mockPayrollChangeTypes.findIndex(p => p.id === id);
        if (idx > -1) mockPayrollChangeTypes[idx] = { ...mockPayrollChangeTypes[idx], ...updates };
    },
    removePayrollChangeType: async (id: string) => {
        mockPayrollChangeTypes = mockPayrollChangeTypes.filter(p => p.id !== id);
    },
    // Calendar
    getCalendarEvents: async () => mockCalendarEvents,
    addCalendarEvent: async (event: any) => {
        mockCalendarEvents.push({ ...event, id: getNextId('event'), companyId: 'mock_company_id' });
    },
    updateCalendarEvent: async (event: any) => {
        const idx = mockCalendarEvents.findIndex(e => e.id === event.id);
        if (idx > -1) mockCalendarEvents[idx] = event;
    },
    removeCalendarEvent: async (id: string) => {
        mockCalendarEvents = mockCalendarEvents.filter(e => e.id !== id);
    },
    // Timesheet
    updateTimesheetEntry: async (employeeId: string, startLogId: string, endLogId: string, newStartTime: number, newEndTime: number) => {
        const startLog = mockAttendanceLog.find(l => l.id === startLogId);
        const endLog = mockAttendanceLog.find(l => l.id === endLogId);
        if (startLog) startLog.timestamp = newStartTime;
        if (endLog) endLog.timestamp = newEndTime;
        notifyListeners();
    },
    // Map Logic
    getMapItems: async () => mockMapItems,
    saveMapItems: async (items: MapItem[]) => {
        mockMapItems = items;
        return true;
    }
});

// --- REAL API IMPLEMENTATION ---
const createRealApi = () => {
    if (!db || !auth) throw new Error("Firebase not initialized");

    const getCompanyId = async (): Promise<string> => {
        const cid = await getCurrentUserCompanyId();
        if (!cid) throw new Error("No company ID found for user");
        return cid;
    };

    return {
        // ... (Existing Real API Methods) ...
        joinCompany: async (inviteCode: string): Promise<boolean> => {
            const user = auth!.currentUser;
            if (!user) throw new Error("Must be logged in");
            
            const companyDoc = await db!.collection('companies').doc(inviteCode).get();
            if (!companyDoc.exists) throw new Error("Company not found");

            await db!.collection('employees').doc(user.uid).update({
                companyId: inviteCode,
                role: 'employee',
                workScheduleId: null
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
            let existingPlaceholderId: string | null = null;
            let existingData: Partial<Employee> = {};

            if (!companyId) {
                const companyRef = db!.collection('companies').doc();
                companyId = companyRef.id;
                await companyRef.set({
                    id: companyId,
                    name: companyName,
                    ownerId: user.uid,
                    createdAt: Date.now()
                });
                
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
            } else {
                const placeholderQuery = await db!.collection('employees')
                    .where('companyId', '==', companyId)
                    .where('email', '==', email)
                    .limit(1)
                    .get();
                
                if (!placeholderQuery.empty) {
                    const doc = placeholderQuery.docs[0];
                    existingPlaceholderId = doc.id;
                    existingData = doc.data() as Partial<Employee>;
                }
            }

            const newEmployee: Employee = {
                id: user.uid,
                uid: user.uid,
                companyId: companyId!,
                name: fullName,
                email,
                phone: existingData.phone || '',
                location: existingData.location || 'Oficina Principal',
                role: existingData.role || role,
                status: existingData.status || 'Clocked Out',
                lastClockInTime: existingData.lastClockInTime || null,
                currentStatusStartTime: existingData.currentStatusStartTime || null,
                workScheduleId: existingData.workScheduleId || null,
                seatId: existingData.seatId || null
            };

            const batch = db!.batch();
            const newUserRef = db!.collection('employees').doc(user.uid);
            batch.set(newUserRef, newEmployee);

            if (existingPlaceholderId && existingPlaceholderId !== user.uid) {
                batch.delete(db!.collection('employees').doc(existingPlaceholderId));
                const logs = await db!.collection('attendanceLog').where('employeeId', '==', existingPlaceholderId).get();
                logs.forEach(logDoc => batch.update(logDoc.ref, { employeeId: user.uid }));
                const events = await db!.collection('calendarEvents').where('employeeId', '==', existingPlaceholderId).get();
                events.forEach(evtDoc => batch.update(evtDoc.ref, { employeeId: user.uid }));
            }

            await batch.commit();
            return newEmployee;
        },
        loginWithEmailAndPassword: async (email: string, password: string): Promise<Employee> => {
            const userCredential = await auth!.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            if (!user) throw new Error("Login failed");

            const doc = await db!.collection('employees').doc(user.uid).get();
            if (!doc.exists) throw new Error("User profile not found.");
            return { id: doc.id, ...doc.data() } as Employee;
        },
        logout: async () => { await auth!.signOut(); },
        sendPasswordResetEmail: async (email: string) => { await auth!.sendPasswordResetEmail(email); },
        verifyPasswordResetCode: async (oobCode: string) => {
            if (oobCode === 'demo_code') return 'usuario_demo@ejemplo.com';
            return await auth!.verifyPasswordResetCode(oobCode);
        },
        confirmPasswordReset: async (oobCode: string, newPassword: string) => {
            if (oobCode === 'demo_code') return Promise.resolve();
            await auth!.confirmPasswordReset(oobCode, newPassword);
        },
        verifyEmail: async (oobCode: string) => { await auth!.applyActionCode(oobCode); },
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
            const user = auth!.currentUser;
            if (!user) return () => {};
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
            let companyId = employeeData.companyId;
            if (!companyId) companyId = await getCompanyId();
            const newRef = db!.collection('employees').doc();
            const newEmployee = {
                ...employeeData,
                id: newRef.id,
                uid: newRef.id,
                companyId,
                status: 'Clocked Out',
                lastClockInTime: null,
                currentStatusStartTime: null,
                seatId: null
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
                            .limit(500)
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
            const { id, ...data } = employeeToUpdate;
            await db!.collection('employees').doc(id).update(data);
            return employeeToUpdate;
        },
        updateEmployeeSeat: async (employeeId: string, seatId: string | null) => {
            const batch = db!.batch();
            if (seatId) {
                const cid = await getCompanyId();
                const snapshot = await db!.collection('employees')
                    .where('companyId', '==', cid)
                    .where('seatId', '==', seatId)
                    .get();
                snapshot.forEach(doc => {
                    if (doc.id !== employeeId) batch.update(doc.ref, { seatId: null });
                });
            }
            const empRef = db!.collection('employees').doc(employeeId);
            batch.update(empRef, { seatId });
            await batch.commit();
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
        getActivityStatuses: async () => {
            const cid = await getCompanyId();
            const snapshot = await db!.collection('activityStatuses').where('companyId', '==', cid).get();
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ActivityStatus));
        },
        addActivityStatus: async (name, color) => {
            const cid = await getCompanyId();
            await db!.collection('activityStatuses').add({ name, color, companyId: cid });
        },
        removeActivityStatus: async (id) => { await db!.collection('activityStatuses').doc(id).delete(); },
        getWorkSchedules: async () => {
            const cid = await getCompanyId();
            const snapshot = await db!.collection('workSchedules').where('companyId', '==', cid).get();
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WorkSchedule));
        },
        addWorkSchedule: async (schedule) => {
            const cid = await getCompanyId();
            await db!.collection('workSchedules').add({ ...schedule, companyId: cid });
        },
        updateWorkSchedule: async (id, updates) => { await db!.collection('workSchedules').doc(id).update(updates); },
        removeWorkSchedule: async (id) => { await db!.collection('workSchedules').doc(id).delete(); },
        getPayrollChangeTypes: async () => {
            const cid = await getCompanyId();
            const snapshot = await db!.collection('payrollChangeTypes').where('companyId', '==', cid).get();
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PayrollChangeType));
        },
        addPayrollChangeType: async (name, color, isExclusive, adminOnly) => {
            const cid = await getCompanyId();
            await db!.collection('payrollChangeTypes').add({ name, color, isExclusive, adminOnly, companyId: cid });
        },
        updatePayrollChangeType: async (id, updates) => { await db!.collection('payrollChangeTypes').doc(id).update(updates); },
        removePayrollChangeType: async (id) => { await db!.collection('payrollChangeTypes').doc(id).delete(); },
        getCalendarEvents: async () => {
            const cid = await getCompanyId();
            const snapshot = await db!.collection('calendarEvents').where('companyId', '==', cid).get();
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent));
        },
        addCalendarEvent: async (event) => {
            const cid = await getCompanyId();
            await db!.collection('calendarEvents').add({ ...event, companyId: cid });
        },
        updateCalendarEvent: async (event) => { await db!.collection('calendarEvents').doc(event.id).update(event); },
        removeCalendarEvent: async (id) => { await db!.collection('calendarEvents').doc(id).delete(); },
        updateTimesheetEntry: async (employeeId, startLogId, endLogId, newStartTime, newEndTime) => {
            const batch = db!.batch();
            const startLogRef = db!.collection('attendanceLog').doc(startLogId);
            batch.update(startLogRef, { timestamp: newStartTime });
            const endLogRef = db!.collection('attendanceLog').doc(endLogId);
            batch.update(endLogRef, { timestamp: newEndTime });
            await batch.commit();
        },
        // Map Logic (Real)
        getMapItems: async () => {
            const cid = await getCompanyId();
            const snapshot = await db!.collection('mapItems').where('companyId', '==', cid).get();
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MapItem));
        },
        saveMapItems: async (items: MapItem[]) => {
            const cid = await getCompanyId();
            const batch = db!.batch();
            
            // Delete existing map items for this company to handle removals
            // In a production app, we would diff the lists to only add/update/remove what changed
            const existing = await db!.collection('mapItems').where('companyId', '==', cid).get();
            existing.forEach(doc => batch.delete(doc.ref));
            
            items.forEach(item => {
                // CRITICAL FIX: Use the item's existing ID for the doc ID to preserve seat assignments.
                // If it's a new item (temp ID or no ID), Firestore will just use that string or we could gen a new one if needed,
                // but preserving 'id' is key for the seat mapping.
                const ref = db!.collection('mapItems').doc(item.id);
                batch.set(ref, { ...item, companyId: cid, id: item.id }); 
            });
            
            await batch.commit();
            return true;
        }
    };
};

const api = isFirebaseEnabled ? createRealApi() : createMockApi();

// Exporting individual functions
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
    updateEmployeeSeat,
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
    updateTimesheetEntry,
    getMapItems, // NEW
    saveMapItems // NEW
} = api;
