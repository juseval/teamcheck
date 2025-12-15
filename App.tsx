
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Employee, AttendanceLogEntry, ActivityStatus, WorkSchedule, 
  CalendarEvent, PayrollChangeType, TimesheetEntry, AttendanceAction, Task
} from './types';
import { 
  loginWithEmailAndPassword, registerWithEmailAndPassword, logout, 
  getEmployeeProfile, streamEmployees, streamAttendanceLog, 
  getActivityStatuses, getWorkSchedules, getPayrollChangeTypes, getCalendarEvents,
  addEmployee, updateEmployeeDetails, removeEmployee, 
  updateEmployeeStatus, addAttendanceLogEntry, updateEmployeeCurrentSession,
  addWorkSchedule, updateWorkSchedule, removeWorkSchedule,
  addActivityStatus, removeActivityStatus,
  addPayrollChangeType, updatePayrollChangeType, removePayrollChangeType,
  addCalendarEvent, updateCalendarEvent, removeCalendarEvent,
  updateTimesheetEntry, sendPasswordResetEmail
} from './services/apiService';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { auth } from './services/firebase';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import TrackerPage from './pages/TrackerPage';
import TimesheetPage from './pages/TimesheetPage';
import EmployeesPage from './pages/EmployeesPage';
import SchedulePage from './pages/SchedulePage';
import TicketingPage from './pages/TicketingPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import CalendarPage from './pages/CalendarPage';
import ChangePasswordPage from './pages/ChangePasswordPage';

// Components
import Header from './components/Header';
import SideNav from './components/SideNav';
import AddEmployeeModal from './components/AddEmployeeModal';
import EditEmployeeModal from './components/EditEmployeeModal';
import EditTimeModal from './components/EditTimeModal';
import EditTimesheetEntryModal from './components/EditTimesheetEntryModal';
import AddEventModal from './components/AddEventModal';
import EditEventModal from './components/EditEventModal';
import LateArrivalsWidget from './components/LateArrivalsWidget';
import ConfirmationModal from './components/ConfirmationModal';

const AppContent: React.FC = () => {
  const { addNotification } = useNotification();
  
  const [user, setUser] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize currentPage based on URL params immediately to prevent Auth race conditions
  const [currentPage, setCurrentPage] = useState(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('inviteCode')) return 'register';
      if (params.get('mode') === 'resetPassword') return 'reset-password';
      return 'home';
  });

  // Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceLog, setAttendanceLog] = useState<AttendanceLogEntry[]>([]);
  const [activityStatuses, setActivityStatuses] = useState<ActivityStatus[]>([]);
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [payrollChangeTypes, setPayrollChangeTypes] = useState<PayrollChangeType[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // Modal States
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isEditEmployeeModalOpen, setIsEditEmployeeModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  
  const [isEditTimeModalOpen, setIsEditTimeModalOpen] = useState(false);
  const [employeeForTimeEdit, setEmployeeForTimeEdit] = useState<Employee | null>(null);

  const [isEditTimesheetModalOpen, setIsEditTimesheetModalOpen] = useState(false);
  const [timesheetEntryToEdit, setTimesheetEntryToEdit] = useState<TimesheetEntry | null>(null);

  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void }>({
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // URL Params for Reset Password
  const [resetCode, setResetCode] = useState<string | null>(null);
  
  // Ref to track if auth has initialized to prevent redirect loops
  const hasInitializedAuth = useRef(false);
  const currentPageRef = useRef(currentPage);

  // Update ref when currentPage changes
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    
    // inviteCode logic is now handled in useState initialization, 
    // but we still need to capture reset password code
    if (mode === 'resetPassword' && oobCode) {
      setResetCode(oobCode);
    }
  }, []);

  // Auth Listener
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getEmployeeProfile(firebaseUser.uid);
          if (profile) {
            // Normalize role to lowercase to ensure consistency
            const normalizedUser = {
                ...profile,
                role: (profile.role || 'employee').toLowerCase() as 'admin' | 'employee'
            };
            setUser(normalizedUser);
            // Only redirect to tracker on the very first load/auth check
            // and ONLY if we aren't in a special flow like password reset
            if (!hasInitializedAuth.current && currentPageRef.current !== 'reset-password') {
                setCurrentPage('tracker');
            }
          }
        } catch (error) {
          console.error("Error fetching profile", error);
        }
      } else {
        setUser(null);
        // Redirect to home on logout, unless on public pages
        const current = currentPageRef.current;
        if (current !== 'reset-password' && current !== 'register') {
            setCurrentPage('home');
        }
      }
      hasInitializedAuth.current = true;
      setLoading(false);
    });
    return () => unsubscribe();
  }, []); // Empty dependency array to run only once on mount

  // Data Fetching
  useEffect(() => {
    if (!user) return;

    // Load static data
    Promise.all([
      getActivityStatuses(),
      getWorkSchedules(),
      getPayrollChangeTypes(),
      getCalendarEvents(),
    ]).then(([statuses, schedules, payrollTypes, events]) => {
      setActivityStatuses(statuses);
      setWorkSchedules(schedules);
      setPayrollChangeTypes(payrollTypes);
      setCalendarEvents(events);
    }).catch(console.error);

    // Stream dynamic data
    const unsubEmployees = streamEmployees(setEmployees);
    const unsubLog = streamAttendanceLog(setAttendanceLog);

    return () => {
      unsubEmployees();
      unsubLog();
    };
  }, [user]);

  // --- Actions ---

  const handleLogin = async (creds: {email: string, password: string}) => {
    try {
      const loggedUser = await loginWithEmailAndPassword(creds.email, creds.password);
      // Normalize role immediately on login
      const normalizedUser = {
          ...loggedUser,
          role: (loggedUser.role || 'employee').toLowerCase() as 'admin' | 'employee'
      };
      setUser(normalizedUser);
      setCurrentPage('tracker');
      addNotification(`Welcome back, ${loggedUser.name}!`, 'success');
    } catch (error: any) {
      addNotification(error.message || 'Login failed', 'error');
      throw error; // Re-throw so HomePage can handle loading state
    }
  };

  const handleRegister = async (data: { fullName: string; email: string; password: string; companyName: string; inviteCode?: string }) => {
     try {
       await registerWithEmailAndPassword(data.fullName, data.email, data.password, data.companyName, data.inviteCode);
       // Note: inviteCode is passed if available
       addNotification('Registro exitoso. Bienvenido.', 'success');
       // Auto login handled by auth listener usually, or we can force navigate if needed
     } catch (error: any) {
       addNotification(error.message || 'Registration failed', 'error');
       throw error;
     }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setCurrentPage('home');
    addNotification('Logged out successfully', 'success');
  };

  const handleForgotPassword = async (email: string) => {
      try {
          await sendPasswordResetEmail(email);
          addNotification('Password reset email sent.', 'success');
      } catch (error: any) {
          addNotification(error.message || 'Failed to send reset email.', 'error');
          throw error;
      }
  };

  const handleEmployeeAction = async (employeeId: string, action: AttendanceAction) => {
      try {
          const employee = employees.find(e => e.id === employeeId);
          if (!employee) return;

          const timestamp = Date.now();
          
          await addAttendanceLogEntry({
              employeeId,
              companyId: user?.companyId || '', // Pass the current user's companyId
              employeeName: employee.name,
              action,
              timestamp
          });

          let newStatus = employee.status;
          if (action === 'Clock In') newStatus = 'Working';
          else if (action === 'Clock Out') newStatus = 'Clocked Out';
          else if (action.startsWith('Start ')) newStatus = action.substring(6);
          else if (action.startsWith('End ')) newStatus = 'Working';

          const updates: any = {
              status: newStatus,
              currentStatusStartTime: newStatus === 'Clocked Out' ? null : timestamp
          };
          if (action === 'Clock In') {
              updates.lastClockInTime = timestamp;
          }

          await updateEmployeeStatus({ ...employee, ...updates });
          addNotification(`${action} recorded for ${employee.name}`, 'success');
      } catch (error) {
          console.error(error);
          addNotification('Failed to update status', 'error');
      }
  };

  const promptConfirm = (title: string, message: string, onConfirm: () => void) => {
      setConfirmConfig({ title, message, onConfirm: () => {
          onConfirm();
          setIsConfirmModalOpen(false);
      }});
      setIsConfirmModalOpen(true);
  };

  const trackerEmployees = useMemo(() => {
      if (!user) return [];
      if (user.role === 'employee') {
          return employees.filter(e => e.id === user.id);
      }
      // If admin, return all employees
      return employees;
  }, [employees, user]);

  if (loading) return <div className="flex items-center justify-center h-screen bg-bright-white text-lucius-lime">Loading...</div>;

  if (currentPage === 'home') return (
    <HomePage 
        onLogin={handleLogin} 
        onRegister={handleRegister} 
        onForgotPassword={handleForgotPassword}
    />
  );
  
  if (currentPage === 'login') return <LoginPage onLogin={handleLogin} onNavigateToRegister={() => setCurrentPage('register')} onNavigateToHome={() => setCurrentPage('home')} onForgotPassword={handleForgotPassword} />;
  if (currentPage === 'register') return <RegisterPage onRegister={handleRegister} onNavigateToLogin={() => setCurrentPage('login')} onNavigateToHome={() => setCurrentPage('home')} />;
  if (currentPage === 'reset-password' && resetCode) return <ResetPasswordPage oobCode={resetCode} onNavigateToLogin={() => setCurrentPage('login')} />;

  if (!user) return (
    <HomePage 
        onLogin={handleLogin} 
        onRegister={handleRegister} 
        onForgotPassword={handleForgotPassword}
    />
  );

  return (
    <div className="flex h-screen bg-bright-white overflow-hidden font-sans text-bokara-grey">
      <SideNav currentPage={currentPage} onNavigate={setCurrentPage} userRole={user.role} />
      
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header currentPage={currentPage} onNavigate={setCurrentPage} user={user} userRole={user.role} onLogout={handleLogout} />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-whisper-white/30 p-4 sm:p-6 lg:p-8 scroll-smooth">
          {currentPage === 'tracker' && (
            <TrackerPage 
                employees={trackerEmployees} 
                attendanceLog={attendanceLog} 
                onEmployeeAction={handleEmployeeAction}
                onAddEmployee={() => setIsAddEmployeeModalOpen(true)}
                onRemoveEmployee={(id) => promptConfirm('Remove Employee', 'Are you sure?', () => removeEmployee(id))}
                onEditTime={(id) => {
                    const emp = employees.find(e => e.id === id);
                    if (emp) { setEmployeeForTimeEdit(emp); setIsEditTimeModalOpen(true); }
                }}
                userRole={user.role}
                activityStatuses={activityStatuses}
                workSchedules={workSchedules}
            />
          )}
          
          {currentPage === 'dashboard' && user.role === 'admin' && (
             <DashboardPage 
                attendanceLog={attendanceLog}
                employees={employees}
                onEmployeeAction={handleEmployeeAction}
                activityStatuses={activityStatuses}
                workSchedules={workSchedules}
                calendarEvents={calendarEvents}
             />
          )}

          {currentPage === 'timesheet' && user.role === 'admin' && (
              <TimesheetPage 
                 employees={employees}
                 attendanceLog={attendanceLog}
                 activityStatuses={activityStatuses}
                 onEditEntry={(entry) => { setTimesheetEntryToEdit(entry); setIsEditTimesheetModalOpen(true); }}
              />
          )}

          {currentPage === 'employees' && user.role === 'admin' && (
              <EmployeesPage 
                 employees={employees}
                 onAddEmployee={() => setIsAddEmployeeModalOpen(true)}
                 onEditEmployee={(id) => {
                     const emp = employees.find(e => e.id === id);
                     if (emp) { setEmployeeToEdit(emp); setIsEditEmployeeModalOpen(true); }
                 }}
                 onRemoveEmployee={(id) => promptConfirm('Remove Employee', 'Are you sure?', () => removeEmployee(id))}
                 workSchedules={workSchedules}
                 currentUser={user}
              />
          )}

          {currentPage === 'schedule' && user.role === 'admin' && (
              <SchedulePage 
                  events={calendarEvents}
                  employees={employees}
                  payrollChangeTypes={payrollChangeTypes}
                  onAddEvent={() => setIsAddEventModalOpen(true)}
                  onEditEvent={(event) => { setEventToEdit(event); setIsEditEventModalOpen(true); }}
                  onRemoveEvent={(event) => promptConfirm('Remove Event', 'Are you sure?', () => removeCalendarEvent(event.id))}
                  onUpdateEventStatus={async (event, status) => {
                      await updateCalendarEvent({ ...event, status });
                      setCalendarEvents(prev => prev.map(e => e.id === event.id ? { ...e, status } : e));
                  }}
              />
          )}

          {currentPage === 'ticketing' && (
             <TicketingPage 
                 events={calendarEvents}
                 currentUser={user}
                 employees={employees}
                 payrollChangeTypes={payrollChangeTypes}
                 onAddRequest={async (req) => {
                     try {
                         // FIX: Removed explicit companyId as it is handled by the service
                         await addCalendarEvent({ ...req, status: 'pending' });
                         addNotification('Request submitted', 'success');
                         const updatedEvents = await getCalendarEvents(); 
                         setCalendarEvents(updatedEvents);
                     } catch(e) { addNotification('Failed to submit request', 'error'); }
                 }}
                 onUpdateRequest={async (evt) => {
                     try {
                         await updateCalendarEvent(evt);
                         addNotification('Request updated', 'success');
                         const updatedEvents = await getCalendarEvents();
                         setCalendarEvents(updatedEvents);
                     } catch(e) { addNotification('Failed to update request', 'error'); }
                 }}
                 onRemoveRequest={(evt) => promptConfirm('Delete Request', 'Are you sure you want to delete this request?', async () => {
                     try {
                        await removeCalendarEvent(evt.id);
                        addNotification('Request deleted', 'success');
                        const updatedEvents = await getCalendarEvents();
                        setCalendarEvents(updatedEvents);
                     } catch(e) {
                        addNotification('Failed to delete request', 'error');
                     }
                 })}
             />
          )}

          {currentPage === 'settings' && user.role === 'admin' && (
              <SettingsPage 
                 statuses={activityStatuses}
                 onAddStatus={async (n, c) => { await addActivityStatus(n,c); setActivityStatuses(await getActivityStatuses()); }}
                 onRemoveStatus={async (id) => { await removeActivityStatus(id); setActivityStatuses(await getActivityStatuses()); }}
                 payrollChangeTypes={payrollChangeTypes}
                 onAddPayrollChangeType={async (n,c,e,a) => { await addPayrollChangeType(n,c,e,a); setPayrollChangeTypes(await getPayrollChangeTypes()); }}
                 onUpdatePayrollChangeType={async (id, u) => { await updatePayrollChangeType(id, u); setPayrollChangeTypes(await getPayrollChangeTypes()); }}
                 onRemovePayrollChangeType={async (id) => { await removePayrollChangeType(id); setPayrollChangeTypes(await getPayrollChangeTypes()); }}
                 workSchedules={workSchedules}
                 onAddWorkSchedule={async (s) => { await addWorkSchedule(s); setWorkSchedules(await getWorkSchedules()); }}
                 onUpdateWorkSchedule={async (id, u) => { await updateWorkSchedule(id, u); setWorkSchedules(await getWorkSchedules()); }}
                 onRemoveWorkSchedule={async (id) => { await removeWorkSchedule(id); setWorkSchedules(await getWorkSchedules()); }}
              />
          )}

          {currentPage === 'profile' && <ProfilePage user={user} />}
          {currentPage === 'calendar' && (
            <CalendarPage 
                events={calendarEvents} 
                currentUser={user} 
                payrollChangeTypes={payrollChangeTypes}
            />
          )}
          {currentPage === 'password' && <ChangePasswordPage />}

        </main>
        
        {user.role === 'admin' && <LateArrivalsWidget employees={employees} attendanceLog={attendanceLog} workSchedules={workSchedules} />}
        
        {/* Modals */}
        <AddEmployeeModal isOpen={isAddEmployeeModalOpen} onClose={() => setIsAddEmployeeModalOpen(false)} workSchedules={workSchedules} onAddEmployee={async (data) => {
            try { 
                // Inject companyId from current admin user
                await addEmployee({ ...data, companyId: user.companyId }); 
                setIsAddEmployeeModalOpen(false); 
                addNotification('Employee added', 'success'); 
            } catch(e) { addNotification('Failed', 'error'); }
        }} />
        
        <EditEmployeeModal isOpen={isEditEmployeeModalOpen} onClose={() => setIsEditEmployeeModalOpen(false)} employeeToEdit={employeeToEdit} workSchedules={workSchedules} onUpdateEmployee={async (emp) => {
            try { await updateEmployeeDetails(emp); setIsEditEmployeeModalOpen(false); addNotification('Employee updated', 'success'); } catch(e) { addNotification('Failed', 'error'); }
        }} />

        <EditTimeModal isOpen={isEditTimeModalOpen} onClose={() => setIsEditTimeModalOpen(false)} employee={employeeForTimeEdit} onSave={async (id, time) => {
             try { await updateEmployeeCurrentSession(id, time); setIsEditTimeModalOpen(false); addNotification('Time updated', 'success'); } catch(e) { addNotification('Failed', 'error'); }
        }} />

        <EditTimesheetEntryModal isOpen={isEditTimesheetModalOpen} onClose={() => setIsEditTimesheetModalOpen(false)} entry={timesheetEntryToEdit} onSave={async (sid, eid, start, end) => {
            try { await updateTimesheetEntry(timesheetEntryToEdit!.employeeId, sid, eid, start, end); setIsEditTimesheetModalOpen(false); addNotification('Entry updated', 'success'); } catch(e) { addNotification('Failed', 'error'); }
        }} />

        <AddEventModal isOpen={isAddEventModalOpen} onClose={() => setIsAddEventModalOpen(false)} employees={employees} payrollChangeTypes={payrollChangeTypes} onAddEvent={async (data) => {
             try { 
                 // FIX: Removed explicit companyId as it is handled by the service
                 await addCalendarEvent({ ...data }); 
                 setIsAddEventModalOpen(false); 
                 addNotification('Event added', 'success'); 
                 const evs = await getCalendarEvents(); 
                 setCalendarEvents(evs); 
            } catch(e) { addNotification('Failed', 'error'); }
        }} />
        
        <EditEventModal isOpen={isEditEventModalOpen} onClose={() => setIsEditEventModalOpen(false)} eventToEdit={eventToEdit} employees={employees} payrollChangeTypes={payrollChangeTypes} onUpdateEvent={async (data) => {
             try { await updateCalendarEvent(data); setIsEditEventModalOpen(false); addNotification('Event updated', 'success'); const evs = await getCalendarEvents(); setCalendarEvents(evs); } catch(e) { addNotification('Failed', 'error'); }
        }} />
        
        <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title={confirmConfig.title} message={confirmConfig.message} onConfirm={confirmConfig.onConfirm} />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
};

export default App;
