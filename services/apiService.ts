
import { Employee, AttendanceLogEntry, ActivityStatus, CalendarEvent, PayrollChangeType, WorkSchedule, Company, MapItem } from '../types';
import { db, auth, isFirebaseEnabled } from './firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/storage';
import { initialEmployees } from '../data/initialData';

// --- MOCK DATA & API (Para modo demo) ---
let mockEmployees: Employee[] = [...initialEmployees];
const createMockApi = () => ({
    resendVerificationEmail: async (email: string) => true,
    verifyEmailWithToken: async (oobCode: string) => true,
    joinCompany: async (inviteCode: string) => {},
    getCompanyDetails: async (companyId: string) => null,
    registerWithEmailAndPassword: async (fullName: string, email: string) => ({ name: fullName, email, emailVerified: false } as any),
    loginWithEmailAndPassword: async (email: string, pass: string) => { throw new Error("Modo Demo: Verifica tu email."); },
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
    updateEmployeeSeat: async (eid: string, sid: string | null) => {}
});

const createRealApi = () => {
    if (!db || !auth) throw new Error("Firebase not initialized");

    return {
        // --- NUEVA LÓGICA DE VERIFICACIÓN REAL (FIREBASE NATIVE) ---

        resendVerificationEmail: async (email: string) => {
            const user = auth!.currentUser;
            if (user) {
                await user.sendEmailVerification();
                return true;
            }
            throw new Error("No se pudo identificar la sesión actual. Por favor intenta iniciar sesión de nuevo.");
        },

        verifyEmailWithToken: async (oobCode: string) => {
            await auth!.applyActionCode(oobCode);
            const user = auth!.currentUser;
            if (user) {
                await db!.collection('employees').doc(user.uid).update({ emailVerified: true });
            }
            return true;
        },

        registerWithEmailAndPassword: async (fullName: string, email: string, password: string, companyName: string, inviteCode?: string) => {
            const userCredential = await auth!.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            if (!user) throw new Error("Error en registro");
            
            await user.sendEmailVerification();

            let finalCompanyId = "";
            if (!inviteCode) {
                const code = Math.random().toString(36).substring(2, 5).toUpperCase() + "-" + Math.floor(100 + Math.random() * 900);
                const companyRef = db!.collection('companies').doc();
                finalCompanyId = companyRef.id;
                await companyRef.set({ id: finalCompanyId, name: companyName, inviteCode: code, ownerId: user.uid, createdAt: Date.now() });
            } else {
                const compQuery = await db!.collection('companies').where('inviteCode', '==', inviteCode.toUpperCase()).limit(1).get();
                if (compQuery.empty) throw new Error("Código de equipo inválido.");
                finalCompanyId = compQuery.docs[0].id;
            }

            const newEmployee: Employee = { 
                id: user.uid, 
                uid: user.uid, 
                companyId: finalCompanyId, 
                name: fullName, 
                email, 
                phone: '', 
                location: '', 
                role: inviteCode ? 'employee' : 'admin', 
                status: 'Clocked Out', 
                lastClockInTime: null, 
                currentStatusStartTime: null,
                emailVerified: false
            };
            
            await db!.collection('employees').doc(user.uid).set(newEmployee);
            return newEmployee;
        },

        loginWithEmailAndPassword: async (email: string, password: string) => {
            const cred = await auth!.signInWithEmailAndPassword(email, password);
            const user = cred.user;

            // REQUISITO: Bloquear si el correo no ha sido verificado en Firebase Auth
            if (user && !user.emailVerified) {
                // Sincronizamos flag en DB
                await db!.collection('employees').doc(user.uid).update({ emailVerified: false });
                throw new Error("VERIFY_REQUIRED: Tu correo no ha sido verificado.");
            }

            const doc = await db!.collection('employees').doc(user!.uid).get();
            return { id: doc.id, ...doc.data() } as Employee;
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
            const doc = await db!.collection('employees').doc(auth!.currentUser!.uid).get();
            const s = await db!.collection('activityStatuses').where('companyId', '==', doc.data()?.companyId).get();
            return s.docs.map(d => ({ id: d.id, ...d.data() } as ActivityStatus));
        },
        getWorkSchedules: async () => {
            const doc = await db!.collection('employees').doc(auth!.currentUser!.uid).get();
            const s = await db!.collection('workSchedules').where('companyId', '==', doc.data()?.companyId).get();
            return s.docs.map(d => ({ id: d.id, ...d.data() } as WorkSchedule));
        },
        getPayrollChangeTypes: async () => {
            const doc = await db!.collection('employees').doc(auth!.currentUser!.uid).get();
            const s = await db!.collection('payrollChangeTypes').where('companyId', '==', doc.data()?.companyId).get();
            return s.docs.map(d => ({ id: d.id, ...d.data() } as PayrollChangeType));
        },
        getCalendarEvents: async () => {
            const doc = await db!.collection('employees').doc(auth!.currentUser!.uid).get();
            const s = await db!.collection('calendarEvents').where('companyId', '==', doc.data()?.companyId).get();
            return s.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent));
        },
        getMapItems: async () => {
            const doc = await db!.collection('employees').doc(auth!.currentUser!.uid).get();
            const s = await db!.collection('mapItems').where('companyId', '==', doc.data()?.companyId).get();
            return s.docs.map(d => ({ id: d.id, ...d.data() } as MapItem));
        },
        updateEmployeeDetails: async (e: Employee) => {
            const { id, ...data } = e;
            await db!.collection('employees').doc(id).update(data);
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
            await db!.collection('employees').doc(user.uid).update({ companyId });
        },
        updateAttendanceLogEntry: async (id: string, updates: Partial<AttendanceLogEntry>) => {
            await db!.collection('attendanceLog').doc(id).update(updates);
        },
        addEmployee: async (employeeData: any) => {
            const ref = db!.collection('employees').doc();
            const newEmp = { ...employeeData, id: ref.id, status: 'Clocked Out', lastClockInTime: null, currentStatusStartTime: null };
            await ref.set(newEmp);
            return newEmp;
        },
        removeEmployee: async (id: string) => {
            await db!.collection('employees').doc(id).delete();
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
        }
    };
};

const api = isFirebaseEnabled ? createRealApi() : createMockApi();

export const {
    resendVerificationEmail, verifyEmailWithToken, joinCompany, getCompanyDetails, registerWithEmailAndPassword, loginWithEmailAndPassword, logout, sendPasswordResetEmail, verifyPasswordResetCode, confirmPasswordReset, getEmployeeProfile, streamEmployees, streamAttendanceLog, updateEmployeeStatus, updateAttendanceLogEntry, getActivityStatuses, getWorkSchedules, getPayrollChangeTypes, getCalendarEvents, getMapItems, updateEmployeeDetails, addEmployee, removeEmployee, addAttendanceLogEntry, updateEmployeeCurrentSession, addWorkSchedule, updateWorkSchedule, removeWorkSchedule, addActivityStatus, removeActivityStatus, addPayrollChangeType, updatePayrollChangeType, removePayrollChangeType, addCalendarEvent, updateCalendarEvent, removeCalendarEvent, updateTimesheetEntry, uploadProfilePicture, changePassword, saveMapItems, updateEmployeeSeat
} = api;
