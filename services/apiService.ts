
import { Employee, AttendanceLogEntry, ActivityStatus, CalendarEvent, PayrollChangeType, WorkSchedule, Company, MapItem, Invitation } from '../types';
import { db, auth, isFirebaseEnabled } from './firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/storage';
import { initialEmployees } from '../data/initialData';

// Helper para limpiar undefined de objetos antes de enviar a Firebase
const cleanObject = (obj: any) => {
    const newObj = { ...obj };
    Object.keys(newObj).forEach(key => {
        if (newObj[key] === undefined) delete newObj[key];
    });
    return newObj;
};

// --- MOCK DATA & API ---
const createMockApi = () => ({
    resendVerificationEmail: async (email: string) => true,
    verifyEmailWithToken: async (oobCode: string) => true,
    joinCompany: async (inviteCode: string) => {},
    createCompany: async (name: string) => {},
    getCompanyDetails: async (companyId: string) => null,
    registerWithEmailAndPassword: async (fullName: string, email: string) => ({ name: fullName, email, emailVerified: true } as any),
    loginWithEmailAndPassword: async (email: string, pass: string) => { return initialEmployees[0]; },
    logout: async () => {},
    sendPasswordResetEmail: async (email: string) => {},
    verifyPasswordResetCode: async (code: string) => 'test@example.com',
    confirmPasswordReset: async (code: string, pass: string) => {},
    getEmployeeProfile: async (uid: string) => null,
    streamEmployees: (callback: any) => () => {},
    streamAttendanceLog: (callback: any) => () => {},
    addAttendanceLogEntry: async (entry: any) => entry,
    updateEmployeeStatus: async (e: any) => e,
    updateAttendanceLogEntry: async (id: string, updates: any) => ({id, ...updates}),
    getActivityStatuses: async () => [],
    getWorkSchedules: async () => [],
    getPayrollChangeTypes: async () => [],
    getCalendarEvents: async () => [],
    getMapItems: async () => [],
    updateEmployeeDetails: async (e: any) => e,
    addEmployee: async (e: any) => e,
    removeEmployee: async (id: string) => {},
    updateEmployeeCurrentSession: async (id: string, time: number) => {},
    addWorkSchedule: async (s: any) => s,
    updateWorkSchedule: async (id: string, u: any) => {},
    removeWorkSchedule: async (id: string) => {},
    addActivityStatus: async (n: string, c: string) => {},
    removeActivityStatus: async (id: string) => {},
    addPayrollChangeType: async (n: string, c: string, e: boolean, a: boolean, q?: number) => {},
    updatePayrollChangeType: async (id: string, u: any) => {},
    removePayrollChangeType: async (id: string) => {},
    addCalendarEvent: async (e: any) => e,
    updateCalendarEvent: async (e: any) => e,
    removeCalendarEvent: async (id: string) => {},
    updateTimesheetEntry: async (eid: string, sid: string, endid: string, s: number, end: number) => {},
    uploadProfilePicture: async (id: string, file: File) => '',
    changePassword: async (pass: string) => {},
    saveMapItems: async (items: any[]) => {},
    updateEmployeeSeat: async (eid: string, sid: string | null) => {},
    getPendingInvitation: async (email: string) => null,
    acceptInvitation: async (invitationId: string) => {}
});

const createRealApi = () => {
    if (!db || !auth) throw new Error("Firebase not initialized");

    return {
        resendVerificationEmail: async (email: string) => true,
        verifyEmailWithToken: async (oobCode: string) => true,
        registerWithEmailAndPassword: async (fullName: string, email: string, password: string) => {
            const userCredential = await auth!.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            if (!user) throw new Error("Error en registro");
            const newEmployee: Employee = { 
                id: user.uid, uid: user.uid, companyId: '', name: fullName, email, phone: '', location: '', 
                role: 'employee', status: 'Clocked Out', lastClockInTime: null, currentStatusStartTime: null, emailVerified: true 
            };
            await db!.collection('employees').doc(user.uid).set(newEmployee);
            return newEmployee;
        },
        createCompany: async (name: string) => {
            const user = auth!.currentUser;
            if (!user) throw new Error("No autenticado");
            const code = Math.random().toString(36).substring(2, 5).toUpperCase() + "-" + Math.floor(100 + Math.random() * 900);
            const companyRef = db!.collection('companies').doc();
            const finalCompanyId = companyRef.id;
            await companyRef.set({ id: finalCompanyId, name: name, inviteCode: code, ownerId: user.uid, createdAt: Date.now() });
            await db!.collection('employees').doc(user.uid).set({ 
                id: user.uid, uid: user.uid, companyId: finalCompanyId, role: 'admin', 
                name: user.displayName || user.email?.split('@')[0] || 'Admin', 
                email: user.email || '', status: 'Clocked Out', lastClockInTime: null, currentStatusStartTime: null, emailVerified: true, phone: '', location: '' 
            }, { merge: true });
        },
        loginWithEmailAndPassword: async (email: string, password: string) => {
            const cred = await auth!.signInWithEmailAndPassword(email, password);
            const user = cred.user;
            if (!user) throw new Error("Authentication failed");
            const doc = await db!.collection('employees').doc(user.uid).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() } as Employee;
            } else {
                return {
                    id: user.uid,
                    uid: user.uid,
                    companyId: '',
                    name: user.displayName || email.split('@')[0],
                    email: user.email || email,
                    phone: '',
                    location: '',
                    role: 'employee',
                    status: 'Clocked Out',
                    lastClockInTime: null,
                    currentStatusStartTime: null,
                    emailVerified: user.emailVerified
                } as Employee;
            }
        },
        logout: async () => await auth!.signOut(),
        sendPasswordResetEmail: async (email: string) => await auth!.sendPasswordResetEmail(email),
        verifyPasswordResetCode: async (code: string) => await auth!.verifyPasswordResetCode(code),
        confirmPasswordReset: async (code: string, pass: string) => await auth!.confirmPasswordReset(code, pass),
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
        streamAttendanceLog: (callback: any) => {
            const user = auth!.currentUser;
            if (!user) return () => {};
            let unsub = () => {};
            db!.collection('employees').doc(user.uid).get().then(doc => {
                const cid = doc.data()?.companyId;
                if (cid) unsub = db!.collection('attendanceLog').where('companyId', '==', cid).limit(500).onSnapshot(s => {
                    const logs = s.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceLogEntry));
                    callback(logs.sort((a, b) => b.timestamp - a.timestamp));
                });
            });
            return () => unsub();
        },
        updateEmployeeStatus: async (e: Employee) => {
            await db!.collection('employees').doc(e.id).update({ status: e.status, lastClockInTime: e.lastClockInTime, currentStatusStartTime: e.currentStatusStartTime });
            return e;
        },
        addAttendanceLogEntry: async (entry: any) => {
            const ref = db!.collection('attendanceLog').doc();
            const log = { ...entry, id: ref.id };
            await ref.set(log);
            return log;
        },
        getActivityStatuses: async () => {
            const user = auth!.currentUser;
            if (!user) return [];
            const doc = await db!.collection('employees').doc(user.uid).get();
            const cid = doc.data()?.companyId;
            if (!cid) return [];
            const s = await db!.collection('activityStatuses').where('companyId', '==', cid).get();
            return s.docs.map(d => ({ id: d.id, ...d.data() } as ActivityStatus));
        },
        getWorkSchedules: async () => {
            const user = auth!.currentUser;
            if (!user) return [];
            const doc = await db!.collection('employees').doc(user.uid).get();
            const cid = doc.data()?.companyId;
            if (!cid) return [];
            const s = await db!.collection('workSchedules').where('companyId', '==', cid).get();
            return s.docs.map(d => ({ id: d.id, ...d.data() } as WorkSchedule));
        },
        getPayrollChangeTypes: async () => {
            const user = auth!.currentUser;
            if (!user) return [];
            const doc = await db!.collection('employees').doc(user.uid).get();
            const cid = doc.data()?.companyId;
            if (!cid) return [];
            const s = await db!.collection('payrollChangeTypes').where('companyId', '==', cid).get();
            return s.docs.map(d => ({ id: d.id, ...d.data() } as PayrollChangeType));
        },
        getCalendarEvents: async () => {
            const user = auth!.currentUser;
            if (!user) return [];
            const doc = await db!.collection('employees').doc(user.uid).get();
            const cid = doc.data()?.companyId;
            if (!cid) return [];
            const s = await db!.collection('calendarEvents').where('companyId', '==', cid).get();
            return s.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent));
        },
        getMapItems: async () => {
            const user = auth!.currentUser;
            if (!user) return [];
            const doc = await db!.collection('employees').doc(user.uid).get();
            const cid = doc.data()?.companyId;
            if (!cid) return [];
            const s = await db!.collection('mapItems').where('companyId', '==', cid).get();
            return s.docs.map(d => ({ id: d.id, ...d.data() } as MapItem));
        },
        updateEmployeeDetails: async (e: Employee) => {
            const { id, ...data } = e;
            await db!.collection('employees').doc(id).update(cleanObject(data));
            return e;
        },
        getCompanyDetails: async (companyId: string) => {
            const doc = await db!.collection('companies').doc(companyId).get();
            return doc.exists ? { id: doc.id, ...doc.data() } as Company : null;
        },
        joinCompany: async (inviteCode: string) => {
            const user = auth!.currentUser;
            if (!user) throw new Error("Not logged in");
            const compQuery = await db!.collection('companies').where('inviteCode', '==', inviteCode.toUpperCase()).limit(1).get();
            if (compQuery.empty) throw new Error("Código de equipo inválido.");
            const companyId = compQuery.docs[0].id;
            await db!.collection('employees').doc(user.uid).set({ companyId }, { merge: true });
        },
        updateAttendanceLogEntry: async (id: string, updates: Partial<AttendanceLogEntry>) => {
            await db!.collection('attendanceLog').doc(id).update(updates);
        },
        addEmployee: async (employeeData: any) => {
            const user = auth!.currentUser;
            if (!user) throw new Error("No autenticado");
            const adminDoc = await db!.collection('employees').doc(user.uid).get();
            const companyId = adminDoc.data()?.companyId;
            const compDoc = await db!.collection('companies').doc(companyId).get();
            const companyName = compDoc.data()?.name || "Tu Empresa";
            const invRef = db!.collection('invitations').doc();
            const invitation = cleanObject({
                id: invRef.id, email: employeeData.email, companyId: companyId, companyName: companyName,
                role: employeeData.role || 'employee', status: 'pending', invitedBy: user.uid, createdAt: Date.now(),
                hireDate: employeeData.hireDate, terminationDate: employeeData.terminationDate,
                manualVacationAdjustment: employeeData.manualVacationAdjustment, phone: employeeData.phone,
                location: employeeData.location, workScheduleId: employeeData.workScheduleId
            });
            const empRef = db!.collection('employees').doc();
            const newEmp = cleanObject({ ...employeeData, id: empRef.id, companyId: companyId, status: 'Clocked Out', lastClockInTime: null, currentStatusStartTime: null, emailVerified: false });
            await Promise.all([invRef.set(invitation), empRef.set(newEmp)]);
            return newEmp;
        },
        removeEmployee: async (id: string) => {
            const empDoc = await db!.collection('employees').doc(id).get();
            if (!empDoc.exists) return;
            const empData = empDoc.data();
            const email = empData?.email;
            const companyId = empData?.companyId;
            await db!.collection('employees').doc(id).delete();
            if (email && companyId) {
                const invQuery = await db!.collection('invitations').where('email', '==', email).where('companyId', '==', companyId).get();
                const batch = db!.batch();
                invQuery.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
        },
        updateEmployeeCurrentSession: async (id: string, time: number) => {
            await db!.collection('employees').doc(id).update({ currentStatusStartTime: time });
        },
        addWorkSchedule: async (schedule: any) => {
            const user = auth!.currentUser;
            const doc = await db!.collection('employees').doc(user!.uid).get();
            const companyId = doc.data()?.companyId;
            const ref = db!.collection('workSchedules').doc();
            const newSchedule = { ...schedule, id: ref.id, companyId };
            await ref.set(newSchedule);
            return newSchedule;
        },
        updateWorkSchedule: async (id: string, updates: any) => {
            await db!.collection('workSchedules').doc(id).update(updates);
        },
        removeWorkSchedule: async (id: string) => {
            await db!.collection('workSchedules').doc(id).delete();
        },
        addActivityStatus: async (name: string, color: string) => {
            const user = auth!.currentUser;
            const doc = await db!.collection('employees').doc(user!.uid).get();
            const companyId = doc.data()?.companyId;
            const ref = db!.collection('activityStatuses').doc();
            await ref.set({ id: ref.id, name, color, companyId });
        },
        removeActivityStatus: async (id: string) => {
            await db!.collection('activityStatuses').doc(id).delete();
        },
        addPayrollChangeType: async (name: string, color: string, isExclusive: boolean, adminOnly: boolean, yearlyQuota?: number) => {
            const user = auth!.currentUser;
            const doc = await db!.collection('employees').doc(user!.uid).get();
            const companyId = doc.data()?.companyId;
            const ref = db!.collection('payrollChangeTypes').doc();
            await ref.set({ id: ref.id, name, color, isExclusive, adminOnly, yearlyQuota, companyId });
        },
        updatePayrollChangeType: async (id: string, updates: any) => {
            await db!.collection('payrollChangeTypes').doc(id).update(updates);
        },
        removePayrollChangeType: async (id: string) => {
            await db!.collection('payrollChangeTypes').doc(id).delete();
        },
        addCalendarEvent: async (eventData: any) => {
            const user = auth!.currentUser;
            const doc = await db!.collection('employees').doc(user!.uid).get();
            const companyId = doc.data()?.companyId;
            const ref = db!.collection('calendarEvents').doc();
            const event = { ...eventData, id: ref.id, companyId };
            await ref.set(event);
            return event;
        },
        updateCalendarEvent: async (event: any) => {
            const { id, ...data } = event;
            await db!.collection('calendarEvents').doc(id).update(data);
            return event;
        },
        removeCalendarEvent: async (id: string) => {
            await db!.collection('calendarEvents').doc(id).delete();
        },
        updateTimesheetEntry: async (employeeId: string, startLogId: string, endLogId: string, startTime: number, endTime: number) => {
            await db!.collection('attendanceLog').doc(startLogId).update({ timestamp: startTime });
            await db!.collection('attendanceLog').doc(endLogId).update({ timestamp: endTime });
        },
        uploadProfilePicture: async (employeeId: string, file: File) => {
            const storageRef = firebase.storage().ref();
            const fileRef = storageRef.child(`avatars/${employeeId}_${Date.now()}`);
            await fileRef.put(file);
            const downloadUrl = await fileRef.getDownloadURL();
            await db!.collection('employees').doc(employeeId).update({ avatarUrl: downloadUrl });
            return downloadUrl;
        },
        changePassword: async (newPassword: string) => {
            const user = auth!.currentUser;
            if (user) await user.updatePassword(newPassword);
        },
        saveMapItems: async (items: any[]) => {
            const user = auth!.currentUser;
            const doc = await db!.collection('employees').doc(user!.uid).get();
            const companyId = doc.data()?.companyId;
            const batch = db!.batch();
            const existing = await db!.collection('mapItems').where('companyId', '==', companyId).get();
            existing.forEach(d => batch.delete(d.ref));
            items.forEach(item => {
                const ref = db!.collection('mapItems').doc();
                batch.set(ref, { ...item, id: ref.id, companyId });
            });
            await batch.commit();
        },
        updateEmployeeSeat: async (employeeId: string, seatId: string | null) => {
            await db!.collection('employees').doc(employeeId).update({ seatId });
        },
        getPendingInvitation: async (email: string) => {
            const q = await db!.collection('invitations').where('email', '==', email).where('status', '==', 'pending').limit(1).get();
            if (q.empty) return null;
            return { id: q.docs[0].id, ...q.docs[0].data() } as Invitation;
        },
        acceptInvitation: async (invitationId: string) => {
            const user = auth!.currentUser;
            if (!user) throw new Error("No session");
            const invDoc = await db!.collection('invitations').doc(invitationId).get();
            if (!invDoc.exists) throw new Error("Invitation not found");
            const data = invDoc.data() as Invitation;
            await db!.collection('employees').doc(user.uid).set(cleanObject({ 
                id: user.uid, uid: user.uid, email: user.email, name: user.displayName || user.email?.split('@')[0] || 'Colaborador',
                companyId: data.companyId, role: data.role || 'employee', hireDate: data.hireDate,
                terminationDate: data.terminationDate, manualVacationAdjustment: data.manualVacationAdjustment,
                phone: data.phone, location: data.location, workScheduleId: data.workScheduleId,
                status: 'Clocked Out', lastClockInTime: null, currentStatusStartTime: null, emailVerified: user.emailVerified
            }));
            await db!.collection('invitations').doc(invitationId).update({ status: 'accepted' });
            const empsQuery = await db!.collection('employees').where('email', '==', data.email).get();
            for (const doc of empsQuery.docs) { if (doc.id !== user.uid) await doc.ref.delete(); }
        }
    };
};

const api = isFirebaseEnabled ? createRealApi() : createMockApi();

export const {
    resendVerificationEmail, verifyEmailWithToken, joinCompany, createCompany, getCompanyDetails, registerWithEmailAndPassword, loginWithEmailAndPassword, logout, sendPasswordResetEmail, verifyPasswordResetCode, confirmPasswordReset, getEmployeeProfile, streamEmployees, streamAttendanceLog, updateEmployeeStatus, updateAttendanceLogEntry, getActivityStatuses, getWorkSchedules, getPayrollChangeTypes, getCalendarEvents, getMapItems, updateEmployeeDetails, addEmployee, removeEmployee, addAttendanceLogEntry, updateEmployeeCurrentSession, addWorkSchedule, updateWorkSchedule, removeWorkSchedule, addActivityStatus, removeActivityStatus, addPayrollChangeType, updatePayrollChangeType, removePayrollChangeType, addCalendarEvent, updateCalendarEvent, removeCalendarEvent, updateTimesheetEntry, uploadProfilePicture, changePassword, saveMapItems, updateEmployeeSeat, getPendingInvitation, acceptInvitation
} = api;
