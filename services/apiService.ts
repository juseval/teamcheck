import { Employee, AttendanceLogEntry, ActivityStatus, CalendarEvent, PayrollChangeType, WorkSchedule, Company, MapItem } from '../types';
import { db, auth, isFirebaseEnabled } from './firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/storage';
import { initialEmployees } from '../data/initialData';

// --- HELPERS DE SEGURIDAD ---

// Genera un token aleatorio seguro (64 caracteres hex)
const generateSecureToken = () => {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
};

// Hashea el token usando SHA-256 para almacenamiento seguro
const hashToken = async (token: string) => {
    const msgUint8 = new TextEncoder().encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// --- MOCK DATA & API ---
let mockEmployees: Employee[] = [...initialEmployees];
let mockAttendanceLog: AttendanceLogEntry[] = [];
const getNextId = (prefix: string = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// FIX: Extended mock API to match real API interface and resolve missing member errors.
const createMockApi = () => ({
    resendVerificationEmail: async (email: string) => true,
    verifyEmail: async (token: string) => true,
    verifyEmailWithToken: async (token: string) => true,
    joinCompany: async (code: string) => {},
    getCompanyDetails: async (id: string) => null,
    registerWithEmailAndPassword: async (fullName: string, email: string) => {
        console.log("Mock: Generando token para", email);
        return { name: fullName, email, emailVerified: false } as any;
    },
    loginWithEmailAndPassword: async () => { throw new Error("Verifica tu email primero."); },
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

// FIX: Implemented missing Firebase logic for real API including CRUD operations and company management.
const createRealApi = () => {
    if (!db || !auth) throw new Error("Firebase not initialized");

    const getCompanyId = async () => {
        const doc = await db!.collection('employees').doc(auth!.currentUser!.uid).get();
        return doc.data()?.companyId;
    };

    return {
        resendVerificationEmail: async (email: string) => {
            const userQuery = await db!.collection('employees').where('email', '==', email).limit(1).get();
            if (userQuery.empty) throw new Error("Usuario no encontrado.");
            const userId = userQuery.docs[0].id;
            
            const batch = db!.batch();
            const prevTokens = await db!.collection('verification_tokens').where('userId', '==', userId).where('used', '==', false).get();
            prevTokens.forEach(t => batch.update(t.ref, { used: true }));

            const rawToken = generateSecureToken();
            const tokenHash = await hashToken(rawToken);
            
            const tokenRef = db!.collection('verification_tokens').doc();
            batch.set(tokenRef, {
                userId: userId,
                tokenHash: tokenHash,
                expiresAt: Date.now() + (24 * 60 * 60 * 1000),
                used: false
            });

            await batch.commit();
            console.log(`[EMAIL SIMULATOR] Para: ${email} -> Link: ${window.location.origin}/verify-email?token=${rawToken}`);
            return true;
        },

        verifyEmail: async (rawToken: string) => {
            const tokenHash = await hashToken(rawToken);
            const tokenQuery = await db!.collection('verification_tokens')
                .where('tokenHash', '==', tokenHash)
                .where('used', '==', false)
                .limit(1).get();

            if (tokenQuery.empty) throw new Error("El enlace de verificación es inválido o ya fue utilizado.");

            const tokenData = tokenQuery.docs[0].data();
            if (Date.now() > tokenData.expiresAt) throw new Error("El enlace ha expirado.");

            const batch = db!.batch();
            batch.update(tokenQuery.docs[0].ref, { used: true });
            batch.update(db!.collection('employees').doc(tokenData.userId), { emailVerified: true });
            
            await batch.commit();
            return true;
        },

        verifyEmailWithToken: async (rawToken: string) => {
             const tokenHash = await hashToken(rawToken);
             const tokenQuery = await db!.collection('verification_tokens')
                 .where('tokenHash', '==', tokenHash)
                 .where('used', '==', false)
                 .limit(1).get();
 
             if (tokenQuery.empty) throw new Error("El enlace de verificación es inválido o ya fue utilizado.");
 
             const tokenData = tokenQuery.docs[0].data();
             if (Date.now() > tokenData.expiresAt) throw new Error("El enlace ha expirado.");
 
             const batch = db!.batch();
             batch.update(tokenQuery.docs[0].ref, { used: true });
             batch.update(db!.collection('employees').doc(tokenData.userId), { emailVerified: true });
             
             await batch.commit();
             return true;
        },

        registerWithEmailAndPassword: async (fullName: string, email: string, password: string, companyName: string, inviteCode?: string) => {
            const userCredential = await auth!.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            if (!user) throw new Error("Registration failed");
            
            let finalCompanyId = "";
            if (!inviteCode) {
                const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                const numbers = "0123456789";
                let code = "";
                for (let i = 0; i < 3; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
                code += "-";
                for (let i = 0; i < 3; i++) code += numbers.charAt(Math.floor(Math.random() * numbers.length));

                const companyRef = db!.collection('companies').doc();
                finalCompanyId = companyRef.id;
                await companyRef.set({ id: finalCompanyId, name: companyName, inviteCode: code, ownerId: user.uid, createdAt: Date.now() });
            } else {
                const compQuery = await db!.collection('companies').where('inviteCode', '==', inviteCode.toUpperCase()).limit(1).get();
                if (compQuery.empty) throw new Error("Código de invitación inválido.");
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

            const rawToken = generateSecureToken();
            const tokenHash = await hashToken(rawToken);
            await db!.collection('verification_tokens').add({
                userId: user.uid,
                tokenHash: tokenHash,
                expiresAt: Date.now() + (24 * 60 * 60 * 1000),
                used: false
            });

            console.log(`[EMAIL SIMULATOR] Verificación para ${email}: ${window.location.origin}/verify-email?token=${rawToken}`);

            return newEmployee;
        },

        loginWithEmailAndPassword: async (email: string, password: string) => {
            const cred = await auth!.signInWithEmailAndPassword(email, password);
            const doc = await db!.collection('employees').doc(cred.user!.uid).get();
            const data = doc.data() as Employee;

            if (!data.emailVerified) {
                await auth!.signOut();
                throw new Error("Tu correo no ha sido verificado. Por favor revisa tu bandeja de entrada.");
            }

            return { id: doc.id, ...data };
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
        addAttendanceLogEntry: async (entry: any) => {
            const ref = db!.collection('attendanceLog').doc();
            const log = { ...entry, id: ref.id };
            await ref.set(log);
            return log;
        },
        updateEmployeeStatus: async (e: Employee) => {
            await db!.collection('employees').doc(e.id).update({ status: e.status, lastClockInTime: e.lastClockInTime, currentStatusStartTime: e.currentStatusStartTime });
            return e;
        },
        updateAttendanceLogEntry: async (id: string, updates: any) => {
            await db!.collection('attendanceLog').doc(id).update(updates);
            const d = await db!.collection('attendanceLog').doc(id).get();
            return { id: d.id, ...d.data() } as AttendanceLogEntry;
        },
        getActivityStatuses: async () => {
            const cid = await getCompanyId();
            const s = await db!.collection('activityStatuses').where('companyId', '==', cid).get();
            return s.docs.map(d => ({ id: d.id, ...d.data() } as ActivityStatus));
        },
        getWorkSchedules: async () => {
            const cid = await getCompanyId();
            const s = await db!.collection('workSchedules').where('companyId', '==', cid).get();
            return s.docs.map(d => ({ id: d.id, ...d.data() } as WorkSchedule));
        },
        getPayrollChangeTypes: async () => {
            const cid = await getCompanyId();
            const s = await db!.collection('payrollChangeTypes').where('companyId', '==', cid).get();
            return s.docs.map(d => ({ id: d.id, ...d.data() } as PayrollChangeType));
        },
        getCalendarEvents: async () => {
            const cid = await getCompanyId();
            const s = await db!.collection('calendarEvents').where('companyId', '==', cid).get();
            return s.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent));
        },
        getMapItems: async () => {
            const cid = await getCompanyId();
            const s = await db!.collection('mapItems').where('companyId', '==', cid).get();
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
        addEmployee: async (data: any) => {
            const ref = db!.collection('employees').doc();
            const employee = { ...data, id: ref.id, status: 'Clocked Out', lastClockInTime: null, currentStatusStartTime: null, emailVerified: true };
            await ref.set(employee);
            return employee;
        },
        removeEmployee: async (id: string) => {
            await db!.collection('employees').doc(id).delete();
        },
        updateEmployeeCurrentSession: async (id: string, time: number) => {
            await db!.collection('employees').doc(id).update({ currentStatusStartTime: time });
        },
        addWorkSchedule: async (schedule: any) => {
            const cid = await getCompanyId();
            const ref = await db!.collection('workSchedules').add({ ...schedule, companyId: cid });
            return { id: ref.id, ...schedule, companyId: cid };
        },
        updateWorkSchedule: async (id: string, updates: any) => {
            await db!.collection('workSchedules').doc(id).update(updates);
        },
        removeWorkSchedule: async (id: string) => {
            await db!.collection('workSchedules').doc(id).delete();
        },
        addActivityStatus: async (name: string, color: string) => {
            const cid = await getCompanyId();
            await db!.collection('activityStatuses').add({ name, color, companyId: cid });
        },
        removeActivityStatus: async (id: string) => {
            await db!.collection('activityStatuses').doc(id).delete();
        },
        addPayrollChangeType: async (name: string, color: string, isExclusive: boolean, adminOnly: boolean, yearlyQuota?: number) => {
            const cid = await getCompanyId();
            await db!.collection('payrollChangeTypes').add({ name, color, isExclusive, adminOnly, yearlyQuota, companyId: cid });
        },
        updatePayrollChangeType: async (id: string, updates: Partial<PayrollChangeType>) => {
            await db!.collection('payrollChangeTypes').doc(id).update(updates);
        },
        removePayrollChangeType: async (id: string) => {
            await db!.collection('payrollChangeTypes').doc(id).delete();
        },
        addCalendarEvent: async (event: any) => {
            const cid = await getCompanyId();
            const ref = await db!.collection('calendarEvents').add({ ...event, companyId: cid });
            return { id: ref.id, ...event, companyId: cid };
        },
        updateCalendarEvent: async (event: any) => {
            const { id, ...data } = event;
            await db!.collection('calendarEvents').doc(id).update(data);
        },
        removeCalendarEvent: async (id: string) => {
            await db!.collection('calendarEvents').doc(id).delete();
        },
        updateTimesheetEntry: async (employeeId: string, startLogId: string, endLogId: string, start: number, end: number) => {
            await db!.collection('attendanceLog').doc(startLogId).update({ timestamp: start });
            await db!.collection('attendanceLog').doc(endLogId).update({ timestamp: end });
        },
        uploadProfilePicture: async (id: string, file: File) => {
            return ""; // Placeholder for storage implementation
        },
        changePassword: async (password: string) => {
            await auth!.currentUser!.updatePassword(password);
        },
        joinCompany: async (inviteCode: string) => {
            const compQuery = await db!.collection('companies').where('inviteCode', '==', inviteCode.toUpperCase()).limit(1).get();
            if (compQuery.empty) throw new Error("Código de invitación inválido.");
            const companyId = compQuery.docs[0].id;
            await db!.collection('employees').doc(auth!.currentUser!.uid).update({ companyId });
        },
        saveMapItems: async (items: MapItem[]) => {
            const cid = await getCompanyId();
            const batch = db!.batch();
            const existing = await db!.collection('mapItems').where('companyId', '==', cid).get();
            existing.forEach(doc => batch.delete(doc.ref));
            items.forEach(item => {
                const ref = db!.collection('mapItems').doc();
                batch.set(ref, { ...item, companyId: cid });
            });
            await batch.commit();
        },
        updateEmployeeSeat: async (employeeId: string, seatId: string | null) => {
            await db!.collection('employees').doc(employeeId).update({ seatId });
        }
    };
};

const api = isFirebaseEnabled ? createRealApi() : createMockApi();

// FIX: Updated destructuring export to include all newly implemented API methods used throughout the application.
export const {
    resendVerificationEmail, verifyEmail, verifyEmailWithToken, joinCompany, getCompanyDetails, registerWithEmailAndPassword, loginWithEmailAndPassword, logout, sendPasswordResetEmail, verifyPasswordResetCode, confirmPasswordReset, getEmployeeProfile, streamEmployees, streamAttendanceLog, updateEmployeeStatus, updateAttendanceLogEntry, getActivityStatuses, getWorkSchedules, getPayrollChangeTypes, getCalendarEvents, getMapItems, updateEmployeeDetails, addEmployee, removeEmployee, addAttendanceLogEntry, updateEmployeeCurrentSession, addWorkSchedule, updateWorkSchedule, removeWorkSchedule, addActivityStatus, removeActivityStatus, addPayrollChangeType, updatePayrollChangeType, removePayrollChangeType, addCalendarEvent, updateCalendarEvent, removeCalendarEvent, updateTimesheetEntry, uploadProfilePicture, changePassword, saveMapItems, updateEmployeeSeat
} = api;