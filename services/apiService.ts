
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
let mockMapItems: MapItem[] = [];

const getNextId = (prefix: string = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

let employeeListeners: ((employees: Employee[]) => void)[] = [];
let logListeners: ((log: AttendanceLogEntry[]) => void)[] = [];

const notifyListeners = () => {
    employeeListeners.forEach(l => l([...mockEmployees]));
    logListeners.forEach(l => l([...mockAttendanceLog]));
};

const getCurrentUserCompanyId = async (): Promise<string | null> => {
    if (!isFirebaseEnabled) return 'mock_company_id';
    const user = auth?.currentUser;
    if (!user) return null;
    try {
        const doc = await db?.collection('employees').doc(user.uid).get();
        return doc?.data()?.companyId || null;
    } catch { return null; }
};

const createMockApi = () => ({
    joinCompany: async () => true,
    migrateLegacyData: async () => 0,
    getCompanyDetails: async () => null,
    registerWithEmailAndPassword: async (fullName: string, email: string) => {
        const newEmp: Employee = { id: getNextId('emp'), uid: getNextId('uid'), companyId: 'mock_company_id', name: fullName, email, phone: '', location: '', role: 'admin', status: 'Clocked Out', lastClockInTime: null, currentStatusStartTime: null };
        mockEmployees.push(newEmp);
        notifyListeners();
        return newEmp;
    },
    loginWithEmailAndPassword: async () => mockEmployees[0],
    logout: async () => {},
    sendPasswordResetEmail: async () => {},
    verifyPasswordResetCode: async () => 'demo@example.com',
    confirmPasswordReset: async () => {},
    verifyEmail: async () => {},
    changePassword: async () => {},
    getEmployeeProfile: async () => mockEmployees[0],
    streamEmployees: (callback: any) => {
        employeeListeners.push(callback);
        callback([...mockEmployees]);
        return () => { employeeListeners = employeeListeners.filter(l => l !== callback); };
    },
    addEmployee: async (data: any) => {
        const newEmp = { ...data, id: getNextId('emp'), status: 'Clocked Out', lastClockInTime: null, currentStatusStartTime: null };
        mockEmployees.push(newEmp);
        notifyListeners();
        return newEmp;
    },
    streamAttendanceLog: (callback: any) => {
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
    updateEmployeeSeat: async (employeeId: string, seatId: string | null) => {
        const idx = mockEmployees.findIndex(e => e.id === employeeId);
        if (idx > -1) mockEmployees[idx].seatId = seatId;
        notifyListeners();
    },
    uploadProfilePicture: async () => 'https://via.placeholder.com/150',
    addAttendanceLogEntry: async (entry: any) => {
        const newEntry = { ...entry, id: getNextId('log') };
        mockAttendanceLog.unshift(newEntry);
        notifyListeners();
        return newEntry;
    },
    updateAttendanceLogEntry: async (id: string, updates: any) => {
        const idx = mockAttendanceLog.findIndex(l => l.id === id);
        if (idx > -1) mockAttendanceLog[idx] = { ...mockAttendanceLog[idx], ...updates };
        notifyListeners();
        return mockAttendanceLog[idx];
    },
    updateEmployeeCurrentSession: async (id: string, time: number) => {
        const emp = mockEmployees.find(e => e.id === id);
        if (emp) emp.currentStatusStartTime = time;
        notifyListeners();
        return { updatedEmployee: emp, updatedLog: null };
    },
    getActivityStatuses: async () => mockActivityStatuses,
    addActivityStatus: async (name: string, color: string) => mockActivityStatuses.push({ id: getNextId('status'), name, color }),
    removeActivityStatus: async (id: string) => mockActivityStatuses = mockActivityStatuses.filter(s => s.id !== id),
    getWorkSchedules: async () => mockWorkSchedules,
    addWorkSchedule: async (s: any) => mockWorkSchedules.push({ ...s, id: getNextId('schedule') }),
    updateWorkSchedule: async (id: string, u: any) => { const idx = mockWorkSchedules.findIndex(s => s.id === id); if(idx>-1) mockWorkSchedules[idx]={...mockWorkSchedules[idx],...u}; },
    removeWorkSchedule: async (id: string) => mockWorkSchedules = mockWorkSchedules.filter(s => s.id !== id),
    getPayrollChangeTypes: async () => mockPayrollChangeTypes,
    addPayrollChangeType: async (n: string, c: string, e: boolean, a: boolean) => mockPayrollChangeTypes.push({ id: getNextId('p'), name: n, color: c, isExclusive: e, adminOnly: a }),
    updatePayrollChangeType: async (id: string, u: any) => { const idx = mockPayrollChangeTypes.findIndex(p => p.id === id); if(idx>-1) mockPayrollChangeTypes[idx]={...mockPayrollChangeTypes[idx],...u}; },
    removePayrollChangeType: async (id: string) => mockPayrollChangeTypes = mockPayrollChangeTypes.filter(p => p.id !== id),
    getCalendarEvents: async () => mockCalendarEvents,
    addCalendarEvent: async (e: any) => mockCalendarEvents.push({ ...e, id: getNextId('ev') }),
    updateCalendarEvent: async (e: any) => { const idx = mockCalendarEvents.findIndex(x => x.id === e.id); if(idx>-1) mockCalendarEvents[idx]=e; },
    removeCalendarEvent: async (id: string) => mockCalendarEvents = mockCalendarEvents.filter(e => e.id !== id),
    updateTimesheetEntry: async () => {},
    getMapItems: async () => mockMapItems,
    saveMapItems: async (items: MapItem[]) => { mockMapItems = items; return true; }
});

const createRealApi = () => {
    if (!db || !auth) throw new Error("Firebase not initialized");

    const getCompanyId = async (): Promise<string> => {
        const cid = await getCurrentUserCompanyId();
        if (!cid) throw new Error("No company ID found");
        return cid;
    };

    return {
        joinCompany: async (inviteCode: string) => {
            const user = auth!.currentUser;
            if (!user) throw new Error("Not logged in");
            await db!.collection('employees').doc(user.uid).update({ companyId: inviteCode, role: 'employee' });
            return true;
        },
        migrateLegacyData: async () => 0,
        getCompanyDetails: async (companyId: string) => {
            const doc = await db!.collection('companies').doc(companyId).get();
            return doc.exists ? { id: doc.id, ...doc.data() } as Company : null;
        },
        registerWithEmailAndPassword: async (fullName: string, email: string, password: string, companyName: string, inviteCode?: string) => {
            const userCredential = await auth!.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            if (!user) throw new Error("Failed");
            let companyId = inviteCode;
            if (!companyId) {
                const companyRef = db!.collection('companies').doc();
                companyId = companyRef.id;
                await companyRef.set({ id: companyId, name: companyName, ownerId: user.uid, createdAt: Date.now() });
            }
            const newEmployee: Employee = { id: user.uid, uid: user.uid, companyId: companyId!, name: fullName, email, phone: '', location: '', role: inviteCode ? 'employee' : 'admin', status: 'Clocked Out', lastClockInTime: null, currentStatusStartTime: null };
            await db!.collection('employees').doc(user.uid).set(newEmployee);
            return newEmployee;
        },
        loginWithEmailAndPassword: async (email: string, password: string) => {
            const cred = await auth!.signInWithEmailAndPassword(email, password);
            const doc = await db!.collection('employees').doc(cred.user!.uid).get();
            return { id: doc.id, ...doc.data() } as Employee;
        },
        logout: async () => await auth!.signOut(),
        sendPasswordResetEmail: async (email: string) => await auth!.sendPasswordResetEmail(email),
        verifyPasswordResetCode: async (code: string) => await auth!.verifyPasswordResetCode(code),
        confirmPasswordReset: async (code: string, pass: string) => await auth!.confirmPasswordReset(code, pass),
        verifyEmail: async (code: string) => await auth!.applyActionCode(code),
        changePassword: async (pass: string) => await auth!.currentUser!.updatePassword(pass),
        getEmployeeProfile: async (uid: string) => {
            const doc = await db!.collection('employees').doc(uid).get();
            return doc.exists ? { id: doc.id, ...doc.data() } as Employee : null;
        },
        streamEmployees: (callback: any) => {
            const user = auth!.currentUser;
            if (!user) return () => {};
            let unsub = () => {};
            db!.collection('employees').doc(user.uid).get().then(doc => {
                const cid = doc.data()?.companyId;
                if (cid) unsub = db!.collection('employees').where('companyId', '==', cid).onSnapshot(s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))));
            });
            return () => unsub();
        },
        addEmployee: async (data: any) => {
            const cid = data.companyId || await getCompanyId();
            const ref = db!.collection('employees').doc();
            const emp = { ...data, id: ref.id, uid: ref.id, companyId: cid, status: 'Clocked Out', lastClockInTime: null, currentStatusStartTime: null };
            await ref.set(emp);
            return emp as Employee;
        },
        streamAttendanceLog: (callback: any) => {
            const user = auth!.currentUser;
            if (!user) return () => {};
            let unsub = () => {};
            db!.collection('employees').doc(user.uid).get().then(doc => {
                const cid = doc.data()?.companyId;
                // FIX: Remove orderBy to prevent index error, sort in client
                if (cid) unsub = db!.collection('attendanceLog').where('companyId', '==', cid).limit(500).onSnapshot(s => {
                    const logs = s.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceLogEntry));
                    callback(logs.sort((a, b) => b.timestamp - a.timestamp));
                });
            });
            return () => unsub();
        },
        getEmployees: async () => {
            const cid = await getCompanyId();
            const s = await db!.collection('employees').where('companyId', '==', cid).get();
            return s.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
        },
        removeEmployee: async (id: string) => { await db!.collection('employees').doc(id).delete(); return { success: true }; },
        updateEmployeeStatus: async (e: Employee) => {
            await db!.collection('employees').doc(e.id).update({ status: e.status, lastClockInTime: e.lastClockInTime, currentStatusStartTime: e.currentStatusStartTime });
            return e;
        },
        updateEmployeeDetails: async (e: Employee) => {
            const { id, ...data } = e;
            await db!.collection('employees').doc(id).update(data);
            return e;
        },
        updateEmployeeSeat: async (employeeId: string, seatId: string | null) => {
            await db!.collection('employees').doc(employeeId).update({ seatId });
        },
        uploadProfilePicture: async (userId: string, file: File) => {
            const ref = firebase.storage().ref().child(`avatars/${userId}/${file.name}`);
            await ref.put(file);
            const url = await ref.getDownloadURL();
            await db!.collection('employees').doc(userId).update({ avatarUrl: url });
            return url;
        },
        addAttendanceLogEntry: async (entry: any) => {
            const ref = db!.collection('attendanceLog').doc();
            const log = { ...entry, id: ref.id };
            await ref.set(log);
            return log;
        },
        updateAttendanceLogEntry: async (id: string, updates: any) => {
            await db!.collection('attendanceLog').doc(id).update(updates);
            const d = await db!.collection('attendanceLog').doc(id).get();
            return { id: d.id, ...d.data() } as AttendanceLogEntry;
        },
        updateEmployeeCurrentSession: async (id: string, time: number) => {
            const ref = db!.collection('employees').doc(id);
            const d = await ref.get();
            const start = d.data()?.currentStatusStartTime;
            if (!start) throw new Error("No session");
            const logs = await db!.collection('attendanceLog').where('employeeId', '==', id).where('timestamp', '==', start).limit(1).get();
            if (logs.empty) throw new Error("Log not found");
            const batch = db!.batch();
            batch.update(ref, { currentStatusStartTime: time });
            batch.update(logs.docs[0].ref, { timestamp: time });
            await batch.commit();
            return { updatedEmployee: null, updatedLog: null };
        },
        getActivityStatuses: async () => {
            const cid = await getCompanyId();
            const s = await db!.collection('activityStatuses').where('companyId', '==', cid).get();
            return s.docs.map(d => ({ id: d.id, ...d.data() } as ActivityStatus));
        },
        addActivityStatus: async (n: string, c: string) => {
            const cid = await getCompanyId();
            await db!.collection('activityStatuses').add({ name: n, color: c, companyId: cid });
        },
        removeActivityStatus: async (id: string) => await db!.collection('activityStatuses').doc(id).delete(),
        getWorkSchedules: async () => {
            const cid = await getCompanyId();
            const s = await db!.collection('workSchedules').where('companyId', '==', cid).get();
            return s.docs.map(d => ({ id: d.id, ...d.data() } as WorkSchedule));
        },
        addWorkSchedule: async (data: any) => {
            const cid = await getCompanyId();
            await db!.collection('workSchedules').add({ ...data, companyId: cid });
        },
        updateWorkSchedule: async (id: string, u: any) => await db!.collection('workSchedules').doc(id).update(u),
        removeWorkSchedule: async (id: string) => await db!.collection('workSchedules').doc(id).delete(),
        getPayrollChangeTypes: async () => {
            const cid = await getCompanyId();
            const s = await db!.collection('payrollChangeTypes').where('companyId', '==', cid).get();
            return s.docs.map(d => ({ id: d.id, ...d.data() } as PayrollChangeType));
        },
        addPayrollChangeType: async (n, c, e, a) => {
            const cid = await getCompanyId();
            await db!.collection('payrollChangeTypes').add({ name: n, color: c, isExclusive: e, adminOnly: a, companyId: cid });
        },
        updatePayrollChangeType: async (id, u) => await db!.collection('payrollChangeTypes').doc(id).update(u),
        removePayrollChangeType: async (id) => await db!.collection('payrollChangeTypes').doc(id).delete(),
        getCalendarEvents: async () => {
            const cid = await getCompanyId();
            const s = await db!.collection('calendarEvents').where('companyId', '==', cid).get();
            return s.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent));
        },
        addCalendarEvent: async (data) => {
            const cid = await getCompanyId();
            await db!.collection('calendarEvents').add({ ...data, companyId: cid });
        },
        updateCalendarEvent: async (e) => await db!.collection('calendarEvents').doc(e.id).update(e),
        removeCalendarEvent: async (id) => await db!.collection('calendarEvents').doc(id).delete(),
        updateTimesheetEntry: async (eid, sid, eid2, s, end) => {
            const batch = db!.batch();
            batch.update(db!.collection('attendanceLog').doc(sid), { timestamp: s });
            batch.update(db!.collection('attendanceLog').doc(eid2), { timestamp: end });
            await batch.commit();
        },
        getMapItems: async () => {
            const cid = await getCompanyId();
            const s = await db!.collection('mapItems').where('companyId', '==', cid).get();
            return s.docs.map(d => ({ id: d.id, ...d.data() } as MapItem));
        },
        saveMapItems: async (items: MapItem[]) => {
            const cid = await getCompanyId();
            const batch = db!.batch();
            const existing = await db!.collection('mapItems').where('companyId', '==', cid).get();
            existing.forEach(d => batch.delete(d.ref));
            items.forEach(i => {
                const ref = db!.collection('mapItems').doc(i.id);
                batch.set(ref, { ...i, companyId: cid });
            });
            await batch.commit();
            return true;
        }
    };
};

const api = isFirebaseEnabled ? createRealApi() : createMockApi();

export const {
    joinCompany, migrateLegacyData, getCompanyDetails, registerWithEmailAndPassword, loginWithEmailAndPassword, logout, sendPasswordResetEmail, verifyPasswordResetCode, confirmPasswordReset, verifyEmail, changePassword, getEmployeeProfile, streamEmployees, addEmployee, streamAttendanceLog, getEmployees, removeEmployee, updateEmployeeStatus, updateEmployeeDetails, updateEmployeeSeat, uploadProfilePicture, addAttendanceLogEntry, updateAttendanceLogEntry, updateEmployeeCurrentSession, getActivityStatuses, addActivityStatus, removeActivityStatus, getWorkSchedules, addWorkSchedule, updateWorkSchedule, removeWorkSchedule, getPayrollChangeTypes, addPayrollChangeType, updatePayrollChangeType, removePayrollChangeType, getCalendarEvents, addCalendarEvent, updateCalendarEvent, removeCalendarEvent, updateTimesheetEntry, getMapItems, saveMapItems
} = api;
