
// ... keep imports as they are ...
import { Employee, AttendanceLogEntry, ActivityStatus, Task, CalendarEvent, PayrollChangeType, WorkSchedule, Company } from '../types';
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

// --- MOCK API IMPLEMENTATION ---
const createMockApi = () => {
  // ... existing mock data ...
  let mockEmployees: Employee[] = JSON.parse(JSON.stringify(initialEmployees));
  // Assign a mock company ID to initial employees
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
  let mockTasks: Task[] = [];
  let mockCalendarEvents: CalendarEvent[] = [];

  // Implement mock auth functions
  let mockCurrentUser: { uid: string, email: string } | null = null;
  
  const getNextId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return {
    joinCompany: async (inviteCode: string): Promise<boolean> => {
        // Just mock it
        return Promise.resolve(true);
    },
    migrateLegacyData: async (): Promise<number> => {
        // Mock implementation: just pretend we updated things
        return Promise.resolve(0);
    },
    getCompanyDetails: async (companyId: string): Promise<Company | null> => {
        return Promise.resolve(mockCompanies.find(c => c.id === companyId) || null);
    },
    registerWithEmailAndPassword: async (fullName: string, email: string, password: string, companyName: string, inviteCode?: string): Promise<Employee> => {
        if (mockEmployees.some(e => e.email === email)) {
            throw new Error("Email already in use.");
        }
        
        let companyId = inviteCode;
        let role: 'admin' | 'employee';

        if (inviteCode) {
            // Case 1: Joining an existing company via Invite Link -> Role is EMPLOYEE
            role = 'employee';
            companyId = inviteCode;
        } else {
            // Case 2: Creating a new company -> Role is ADMIN
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
        mockCurrentUser = { uid: newUser.uid, email: newUser.email }; // Auto login
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!email.includes('@')) throw new Error("Invalid email address.");
        console.log(`[Mock API] Password reset email sent to: ${email}`);
        return Promise.resolve();
    },
    verifyPasswordResetCode: async (oobCode: string): Promise<string> => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (oobCode === 'invalid') throw new Error('Invalid code');
        return "mockuser@example.com";
    },
    confirmPasswordReset: async (oobCode: string, newPassword: string): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`[Mock API] Password reset confirmed for code ${oobCode}. New password: ${newPassword}`);
        return Promise.resolve();
    },
    changePassword: async (password: string): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`[Mock API] Password changed to: ${password}`);
        return Promise.resolve();
    },
    getEmployeeProfile: async (uid: string): Promise<Employee | null> => {
        const user = mockEmployees.find(e => e.uid === uid);
        return Promise.resolve(user || null);
    },
    streamEmployees: (callback: (employees: Employee[]) => void): (() => void) => {
        const currentUser = mockEmployees.find(e => e.uid === mockCurrentUser?.uid);
        if (currentUser) {
             callback(mockEmployees.filter(e => e.companyId === currentUser.companyId));
        } else {
             callback(mockEmployees);
        }
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
        return Promise.resolve(newEmployee);
    },
    streamAttendanceLog: (callback: (log: AttendanceLogEntry[]) => void): (() => void) => {
      const currentUser = mockEmployees.find(e => e.uid === mockCurrentUser?.uid);
      if (currentUser) {
          callback(mockAttendanceLog.filter(l => l.companyId === currentUser.companyId));
      } else {
          callback(mockAttendanceLog);
      }
      return () => {};
    },
    getEmployees: async (): Promise<Employee[]> => {
      return Promise.resolve([...mockEmployees]);
    },
    removeEmployee: async (employeeId: string): Promise<{ success: boolean }> => {
      mockEmployees = mockEmployees.filter(e => e.id !== employeeId);
      return Promise.resolve({ success: true });
    },
    updateEmployeeStatus: async (employeeToUpdate: Employee): Promise<Employee> => {
      const index = mockEmployees.findIndex(e => e.id === employeeToUpdate.id);
      if (index > -1) {
        mockEmployees[index] = employeeToUpdate;
      }
      return Promise.resolve(employeeToUpdate);
    },
    updateEmployeeDetails: async (employeeToUpdate: Employee): Promise<Employee> => {
      const index = mockEmployees.findIndex(e => e.id === employeeToUpdate.id);
      if (index > -1) {
        mockEmployees[index] = employeeToUpdate;
      }
      return Promise.resolve(employeeToUpdate);
    },
    uploadProfilePicture: async (userId: string, file: File): Promise<string> => {
        // Mock implementation: Convert to base64 to display locally
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64 = reader.result as string;
                // Update mock data
                const emp = mockEmployees.find(e => e.id === userId);
                if (emp) emp.avatarUrl = base64;
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    },
    addAttendanceLogEntry: async (logEntry: Omit<AttendanceLogEntry, 'id'>): Promise<AttendanceLogEntry> => {
      const newLog: AttendanceLogEntry = { ...logEntry, id: getNextId('log') };
      mockAttendanceLog.push(newLog);
      return Promise.resolve(newLog);
    },
    updateAttendanceLogEntry: async (logId: string, updates: { action: string, timestamp: number }): Promise<AttendanceLogEntry> => {
      const log = mockAttendanceLog.find(l => l.id === logId);
      if (!log) throw new Error("Log not found");
      Object.assign(log, updates);
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

      return Promise.resolve({ updatedEmployee: employee, updatedLog: log });
    },
    updateTimesheetEntry: async (employeeId: string, startLogId: string, endLogId: string, newStartTime: number, newEndTime: number): Promise<{ updatedLogs: AttendanceLogEntry[] }> => {
        const startLog = mockAttendanceLog.find(l => l.id === startLogId);
        const endLog = mockAttendanceLog.find(l => l.id === endLogId);
        if (!startLog || !endLog) throw new Error("Log entries not found");
        startLog.timestamp = newStartTime;
        endLog.timestamp = newEndTime;
        return Promise.resolve({ updatedLogs: [startLog, endLog] });
    },
    getActivityStatuses: async (): Promise<ActivityStatus[]> => Promise.resolve(mockActivityStatuses),
    addActivityStatus: async (name: string, color: string): Promise<ActivityStatus> => {
        const currentUser = mockEmployees.find(e => e.uid === mockCurrentUser?.uid);
        const newStatus = { id: getNextId('status'), name, color, companyId: currentUser?.companyId || 'mock_company_id' };
        mockActivityStatuses.push(newStatus);
        return Promise.resolve(newStatus);
    },
    removeActivityStatus: async (id: string): Promise<{ success: boolean }> => {
        mockActivityStatuses = mockActivityStatuses.filter(s => s.id !== id);
        return Promise.resolve({ success: true });
    },
    getPayrollChangeTypes: async (): Promise<PayrollChangeType[]> => Promise.resolve(mockPayrollChangeTypes),
    addPayrollChangeType: async (name: string, color: string, isExclusive: boolean, adminOnly: boolean): Promise<PayrollChangeType> => {
        const currentUser = mockEmployees.find(e => e.uid === mockCurrentUser?.uid);
        const newType = { id: getNextId('payroll'), name, color, isExclusive, adminOnly, companyId: currentUser?.companyId || 'mock_company_id' };
        mockPayrollChangeTypes.push(newType);
        return Promise.resolve(newType);
    },
    updatePayrollChangeType: async (id: string, updates: Partial<Omit<PayrollChangeType, 'id'>>): Promise<PayrollChangeType> => {
        const type = mockPayrollChangeTypes.find(t => t.id === id);
        if (!type) throw new Error("Payroll change type not found");
        Object.assign(type, updates);
        return Promise.resolve(type);
    },
    removePayrollChangeType: async (id: string): Promise<{ success: boolean }> => {
        mockPayrollChangeTypes = mockPayrollChangeTypes.filter(t => t.id !== id);
        return Promise.resolve({ success: true });
    },
    getWorkSchedules: async (): Promise<WorkSchedule[]> => Promise.resolve(mockWorkSchedules),
    addWorkSchedule: async (scheduleData: Omit<WorkSchedule, 'id' | 'companyId'>): Promise<WorkSchedule> => {
        const currentUser = mockEmployees.find(e => e.uid === mockCurrentUser?.uid);
        const newSchedule = { ...scheduleData, id: getNextId('schedule'), companyId: currentUser?.companyId || 'mock_company_id' };
        mockWorkSchedules.push(newSchedule);
        return Promise.resolve(newSchedule);
    },
    updateWorkSchedule: async (id: string, updates: Partial<Omit<WorkSchedule, 'id'>>): Promise<WorkSchedule> => {
        const schedule = mockWorkSchedules.find(s => s.id === id);
        if (!schedule) throw new Error("Work schedule not found");
        Object.assign(schedule, updates);
        return Promise.resolve(schedule);
    },
    removeWorkSchedule: async (id: string): Promise<{ success: boolean }> => {
        mockWorkSchedules = mockWorkSchedules.filter(s => s.id !== id);
        return Promise.resolve({ success: true });
    },
    getTasks: async (): Promise<Task[]> => Promise.resolve(mockTasks),
    addTask: async (taskData: Omit<Task, 'id' | 'companyId'>): Promise<Task> => {
        const currentUser = mockEmployees.find(e => e.uid === mockCurrentUser?.uid);
        const newTask = { ...taskData, id: getNextId('task'), companyId: currentUser?.companyId || 'mock_company_id' };
        mockTasks.push(newTask);
        return Promise.resolve(newTask);
    },
    getCalendarEvents: async (): Promise<CalendarEvent[]> => Promise.resolve(mockCalendarEvents),
    addCalendarEvent: async (eventData: Omit<CalendarEvent, 'id' | 'status' | 'companyId'> & { status?: 'pending' | 'approved' | 'rejected' }): Promise<CalendarEvent> => {
        const currentUser = mockEmployees.find(e => e.uid === mockCurrentUser?.uid);
        const newEvent: CalendarEvent = { 
            ...eventData, 
            id: getNextId('event'),
            status: eventData.status || 'approved',
            companyId: currentUser?.companyId || 'mock_company_id'
        };
        mockCalendarEvents.push(newEvent);
        return Promise.resolve(newEvent);
    },
    updateCalendarEvent: async (eventData: CalendarEvent): Promise<CalendarEvent> => {
        const index = mockCalendarEvents.findIndex(e => e.id === eventData.id);
        if (index > -1) {
            mockCalendarEvents[index] = eventData;
        }
        return Promise.resolve(eventData);
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
        if (!db) throw new Error("Firestore is not initialized.");
        return db;
    }
    const getAuth = () => {
        if (!auth) throw new Error("Firebase Auth is not initialized.");
        return auth;
    }

    return {
        // ... (auth methods)
        joinCompany: async (inviteCode: string): Promise<boolean> => {
            const user = getAuth().currentUser;
            if (!user) throw new Error("Debes iniciar sesión.");

            // Basic parsing: remove potential URL parts
            let companyId = inviteCode.trim();
            if (companyId.includes('inviteCode=')) {
                companyId = companyId.split('inviteCode=')[1].split('&')[0];
            }

            // 1. Verify Company Exists
            const companyDoc = await getDb().collection('companies').doc(companyId).get();
            if (!companyDoc.exists) {
                throw new Error("El código de invitación no es válido.");
            }

            // 2. Update Employee Profile
            // We reset workSchedule and status because they are specific to the old company
            await getDb().collection('employees').doc(user.uid).update({
                companyId: companyId,
                workScheduleId: null, 
                status: 'Clocked Out',
                lastClockInTime: null,
                currentStatusStartTime: null,
                role: 'employee' // Force to employee role when joining via code
            });

            return true;
        },
        migrateLegacyData: async (): Promise<number> => {
            const companyId = await getCurrentUserCompanyId();
            if (!companyId) throw new Error("No active company found for the current user.");

            const collections = [
                'employees',
                'attendanceLog',
                'activityStatuses',
                'workSchedules',
                'payrollChangeTypes',
                'calendarEvents',
                'tasks',
                'companies' // Usually doesn't need it, but good for completeness if custom logic exists
            ];

            let totalUpdated = 0;
            const batch = getDb().batch();
            let opCount = 0;
            const COMMIT_THRESHOLD = 450; // Firestore batch limit is 500

            // Helper to commit and reset batch
            const checkCommit = async () => {
                if (opCount >= COMMIT_THRESHOLD) {
                    await batch.commit();
                    opCount = 0;
                    // Reset batch is not directly possible, we just commit. 
                    // To do truly massive updates, we need to create a new batch object, 
                    // but for this scope, let's assume we commit chunks.
                    // However, `batch` object is single-use. 
                    // Simplified strategy: We will fetch and update individually for safety in this specific "migration tool" context
                    // or use Promise.all which is easier for the "frontend script" nature of this.
                }
            };

            // Using Promise.all for simplicity and to avoid complex batch management in this snippet
            // Fetch all docs from all collections that MISS companyId
            // Note: Firestore queries for "missing field" are not direct.
            // We fetch all and check locally.
            
            for (const colName of collections) {
                const snapshot = await getDb().collection(colName).get();
                const updates = [];
                
                for (const doc of snapshot.docs) {
                    const data = doc.data();
                    if (!data.companyId) {
                        updates.push(doc.ref.update({ companyId }));
                        totalUpdated++;
                    }
                }
                await Promise.all(updates);
            }

            return totalUpdated;
        },
        getCompanyDetails: async (companyId: string): Promise<Company | null> => {
            const doc = await getDb().collection('companies').doc(companyId).get();
            if (doc.exists) {
                return { ...(doc.data() as Omit<Company, 'id'>), id: doc.id };
            }
            return null;
        },
        registerWithEmailAndPassword: async (fullName: string, email: string, password: string, companyName: string, inviteCode?: string): Promise<Employee> => {
            const userCredential = await getAuth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            if (!user) throw new Error("Failed to create auth user.");

            let companyId = inviteCode;
            let role: 'admin' | 'employee';

            if (inviteCode) {
                // Case 1: Joining an existing company via Invite Link -> Role is EMPLOYEE
                role = 'employee';
                companyId = inviteCode;
            } else {
                // Case 2: Creating a new company -> Role is ADMIN
                role = 'admin';
                const companyData = {
                    name: companyName,
                    ownerId: user.uid,
                    createdAt: Date.now()
                };
                const companyRef = await getDb().collection('companies').add(companyData);
                companyId = companyRef.id;
                
                // Create default data for the NEW company
                const batch = getDb().batch();
                const statusRef = getDb().collection('activityStatuses').doc();
                batch.set(statusRef, { name: 'Break', color: '#AE8F60', companyId });
                await batch.commit();
            }

            // 2. Create the Employee Document
            const employeeData = {
                uid: user.uid,
                companyId: companyId,
                name: fullName,
                email: email,
                phone: '',
                location: 'Main Office',
                role: role, // Explicitly set role
                status: 'Clocked Out',
                lastClockInTime: null,
                currentStatusStartTime: null,
                workScheduleId: null,
            };

            await getDb().collection('employees').doc(user.uid).set(employeeData);
            
            return { ...employeeData, id: user.uid };
        },
        
        // ... all other methods remain the same as previous (login, logout, data streams, etc.)
        loginWithEmailAndPassword: async (email: string, password: string): Promise<Employee> => {
            if (!email || !password) {
                throw new Error("Cannot login: Email and password must be provided.");
            }
            const userCredential = await getAuth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            if (!user) throw new Error("Login failed, user not found in auth.");

            const profile = await getEmployeeProfile(user.uid);
            
            if (!profile) {
                // Handle legacy users or errors
                console.warn("User authenticated but no Firestore profile found.");
                throw new Error("User profile not found.");
            }
            
            return profile;
        },

        logout: async (): Promise<void> => {
            await getAuth().signOut();
        },

        sendPasswordResetEmail: async (email: string): Promise<void> => {
            await getAuth().sendPasswordResetEmail(email);
        },

        verifyPasswordResetCode: async (oobCode: string): Promise<string> => {
            return await getAuth().verifyPasswordResetCode(oobCode);
        },

        confirmPasswordReset: async (oobCode: string, newPassword: string): Promise<void> => {
            return await getAuth().confirmPasswordReset(oobCode, newPassword);
        },

        changePassword: async (password: string): Promise<void> => {
            const user = getAuth().currentUser;
            if (user) {
                await user.updatePassword(password);
            } else {
                throw new Error("No user currently logged in.");
            }
        },
        
        // ... (data methods)
        getEmployeeProfile: async (uid: string): Promise<Employee | null> => {
            const userDoc = await getDb().collection('employees').doc(uid).get();
            if (!userDoc.exists) return null;
            return { ...(userDoc.data() as Omit<Employee, 'id'>), id: userDoc.id };
        },

        streamEmployees: (callback: (employees: Employee[]) => void): (() => void) => {
            const user = getAuth().currentUser;
            if (!user) return () => {};

            getDb().collection('employees').doc(user.uid).get().then(doc => {
                const companyId = doc.data()?.companyId;
                if (!companyId) return;

                const q = getDb().collection('employees').where('companyId', '==', companyId);
                return q.onSnapshot((querySnapshot) => {
                    const employees = querySnapshot.docs.map(doc => ({ ...(doc.data() as Omit<Employee, 'id'>), id: doc.id }));
                    callback(employees);
                });
            });
            return () => {}; 
        },
        streamAttendanceLog: (callback: (log: AttendanceLogEntry[]) => void): (() => void) => {
             const user = getAuth().currentUser;
            if (!user) return () => {};

            getDb().collection('employees').doc(user.uid).get().then(doc => {
                const companyId = doc.data()?.companyId;
                if (!companyId) return;

                const q = getDb().collection('attendanceLog').where('companyId', '==', companyId);
                return q.onSnapshot((querySnapshot) => {
                    const log = querySnapshot.docs.map(doc => ({ ...(doc.data() as Omit<AttendanceLogEntry, 'id'>), id: doc.id }));
                    callback(log);
                });
            });
            return () => {};
        },
        getEmployees: async (): Promise<Employee[]> => {
            const companyId = await getCurrentUserCompanyId();
            if (!companyId) return [];
            const snapshot = await getDb().collection('employees').where('companyId', '==', companyId).get();
            return snapshot.docs.map(doc => ({ ...(doc.data() as Omit<Employee, 'id'>), id: doc.id }));
        },
        addEmployee: async (employeeData: Omit<Employee, 'id' | 'status' | 'lastClockInTime' | 'currentStatusStartTime' | 'uid'>): Promise<Employee> => {
             const newEmployeeData = {
              ...employeeData,
              uid: `manual_${Date.now()}`, // Placeholder
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
        uploadProfilePicture: async (userId: string, file: File): Promise<string> => {
            const storage = firebase.storage();
            const storageRef = storage.ref();
            const fileExtension = file.name.split('.').pop();
            const fileName = `profile_${Date.now()}.${fileExtension}`;
            const profileRef = storageRef.child(`avatars/${userId}/${fileName}`);
            
            await profileRef.put(file);
            const downloadUrl = await profileRef.getDownloadURL();
            
            // Update the user's profile with the new avatar URL
            await getDb().collection('employees').doc(userId).update({
                avatarUrl: downloadUrl
            });
            
            return downloadUrl;
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
            const companyId = await getCurrentUserCompanyId();
            if (!companyId) return [];
            const snapshot = await getDb().collection('activityStatuses').where('companyId', '==', companyId).get();
            return snapshot.docs.map(doc => ({ ...(doc.data() as Omit<ActivityStatus, 'id'>), id: doc.id }));
        },
        addActivityStatus: async (name: string, color: string): Promise<ActivityStatus> => {
            const companyId = await getCurrentUserCompanyId();
            if (!companyId) throw new Error("No company context");
            const docRef = await getDb().collection('activityStatuses').add({ name, color, companyId });
            return { id: docRef.id, name, color, companyId };
        },
        removeActivityStatus: async (id: string): Promise<{ success: boolean }> => {
            await getDb().collection('activityStatuses').doc(id).delete();
            return { success: true };
        },
        getPayrollChangeTypes: async (): Promise<PayrollChangeType[]> => {
            const companyId = await getCurrentUserCompanyId();
            if (!companyId) return [];
            const snapshot = await getDb().collection('payrollChangeTypes').where('companyId', '==', companyId).get();
            return snapshot.docs.map(doc => ({ ...(doc.data() as Omit<PayrollChangeType, 'id'>), id: doc.id }));
        },
        addPayrollChangeType: async (name: string, color: string, isExclusive: boolean, adminOnly: boolean): Promise<PayrollChangeType> => {
            const companyId = await getCurrentUserCompanyId();
            if (!companyId) throw new Error("No company context");
            const docRef = await getDb().collection('payrollChangeTypes').add({ name, color, isExclusive, adminOnly, companyId });
            return { id: docRef.id, name, color, isExclusive, adminOnly, companyId };
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
        // ... (Work schedule, tasks, calendar events methods unchanged)
        getWorkSchedules: async (): Promise<WorkSchedule[]> => {
            const companyId = await getCurrentUserCompanyId();
            if (!companyId) return [];
            const snapshot = await getDb().collection('workSchedules').where('companyId', '==', companyId).get();
            return snapshot.docs.map(doc => ({ ...(doc.data() as Omit<WorkSchedule, 'id'>), id: doc.id }));
        },
        addWorkSchedule: async (scheduleData: Omit<WorkSchedule, 'id' | 'companyId'>): Promise<WorkSchedule> => {
            const companyId = await getCurrentUserCompanyId();
            if (!companyId) throw new Error("No company context");
            const docWithCompany = { ...scheduleData, companyId };
            const docRef = await getDb().collection('workSchedules').add(docWithCompany);
            return { ...docWithCompany, id: docRef.id };
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
            const companyId = await getCurrentUserCompanyId();
            if (!companyId) return [];
            const snapshot = await getDb().collection('tasks').where('companyId', '==', companyId).get();
            return snapshot.docs.map(doc => ({ ...(doc.data() as Omit<Task, 'id'>), id: doc.id }));
        },
        addTask: async (taskData: Omit<Task, 'id' | 'companyId'>): Promise<Task> => {
            const companyId = await getCurrentUserCompanyId();
            if (!companyId) throw new Error("No company context");
            const docWithCompany = { ...taskData, companyId };
            const docRef = await getDb().collection('tasks').add(docWithCompany);
            return { ...docWithCompany, id: docRef.id };
        },
        getCalendarEvents: async (): Promise<CalendarEvent[]> => {
            const companyId = await getCurrentUserCompanyId();
            if (!companyId) return [];
            const snapshot = await getDb().collection('calendarEvents').where('companyId', '==', companyId).get();
            return snapshot.docs.map(doc => ({ 
                ...(doc.data() as Omit<CalendarEvent, 'id'>), 
                id: doc.id,
                status: (doc.data() as any).status || 'approved'
            }));
        },
        addCalendarEvent: async (eventData: Omit<CalendarEvent, 'id' | 'status' | 'companyId'> & { status?: 'pending' | 'approved' | 'rejected' }): Promise<CalendarEvent> => {
            const user = getAuth().currentUser;
            if (!user) throw new Error("User not authenticated");

            const doc = await getDb().collection('employees').doc(user.uid).get();
            const companyId = doc.data()?.companyId;
            
            if (!companyId) throw new Error("Company context missing for user");

            const eventWithStatus = {
                ...eventData,
                status: eventData.status || 'approved',
                companyId: companyId
            };
            const docRef = await getDb().collection('calendarEvents').add(eventWithStatus);
            return { ...eventWithStatus, id: docRef.id };
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

const mockApi = createMockApi();
const realApi = isFirebaseEnabled ? createRealApi() : ({} as ReturnType<typeof createRealApi>);

export const {
    joinCompany,
    migrateLegacyData,
    getCompanyDetails,
    registerWithEmailAndPassword,
    loginWithEmailAndPassword,
    logout,
    sendPasswordResetEmail,
    changePassword,
    verifyPasswordResetCode,
    confirmPasswordReset,
    getEmployeeProfile,
    streamEmployees,
    streamAttendanceLog,
    getEmployees,
    addEmployee,
    removeEmployee,
    updateEmployeeStatus,
    updateEmployeeDetails,
    uploadProfilePicture,
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
} = isFirebaseEnabled ? realApi : mockApi;
