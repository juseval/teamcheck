import * as React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Employee, AttendanceLogEntry, ActivityStatus, WorkSchedule, 
  CalendarEvent, PayrollChangeType, TimesheetEntry, AttendanceAction, Task, Company
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
  updateTimesheetEntry, sendPasswordResetEmail, updateAttendanceLogEntry,
  getCompanyDetails
} from './services/apiService';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { auth, isFirebaseEnabled } from './services/firebase';

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: any;
};

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public props: ErrorBoundaryProps;
  public state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  public static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: any, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 text-center">
          <h1 className="text-4xl font-bold text-red-600 mb-4">¡Ups! Algo salió mal</h1>
          <p className="text-bokara-grey/60 mb-8 max-w-md">La aplicación encontró un error inesperado. Por favor, intenta recargar la página.</p>
          <pre className="bg-gray-100 p-4 rounded-lg text-xs text-left overflow-auto max-w-full mb-8">{this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()} className="bg-lucius-lime text-bokara-grey font-bold py-3 px-8 rounded-xl shadow-lg">Recargar Aplicación</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
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
import SeatingPage from './pages/SeatingPage';
import ActivityLogPage from './pages/ActivityLogPage';

// Components
import Header from './components/Header';
import SideNav from './components/SideNav';
import AddEmployeeModal from './components/AddEmployeeModal';
import EditEmployeeModal from './components/EditEmployeeModal';
import EditTimeModal from './components/EditTimeModal';
import EditTimesheetEntryModal from './components/EditTimesheetEntryModal';
import AddEventModal from './components/AddEventModal';
import EditEventModal from './components/EditEventModal';
import EditActivityLogEntryModal from './components/EditActivityLogEntryModal';
import ConfirmationModal from './components/ConfirmationModal';

const AppContent: React.FC = () => {
  const { addNotification } = useNotification();
  
  const [user, setUser] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('inviteCode')) return 'register';
      if (params.get('mode') === 'resetPassword') return 'reset-password';
      if (params.get('mode') === 'verifyEmail') return 'verify-email';
      return 'home';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceLog, setAttendanceLog] = useState<AttendanceLogEntry[]>([]);
  const [activityStatuses, setActivityStatuses] = useState<ActivityStatus[]>([]);
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [payrollChangeTypes, setPayrollChangeTypes] = useState<PayrollChangeType[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [company, setCompany] = useState<Company | null>(null);

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
  const [isEditActivityLogEntryModalOpen, setIsEditActivityLogEntryModalOpen] = useState(false);
  const [logEntryToEdit, setLogEntryToEdit] = useState<AttendanceLogEntry | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void }>({
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    if (user) {
      console.log("TeamCheck State:", { 
        currentPage, 
        user: user.email, 
        companyId: user.companyId, 
        role: user.role 
      });
    }
  }, [currentPage, user]);

  const [actionCode, setActionCode] = useState<string | null>(null);
  const [urlInviteCode, setUrlInviteCode] = useState<string | null>(() => {
      const params = new URLSearchParams(window.location.search);
      return params.get('inviteCode');
  });
  const hasInitializedAuth = useRef(false);
  const currentPageRef = useRef(currentPage);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const refreshUserProfile = async () => {
    if (user?.id) {
        const profile = await getEmployeeProfile(user.id);
        if (profile) {
            const normalizedUser = { ...profile, role: (profile.role || 'employee').toLowerCase() as 'master' | 'admin' | 'employee' };
            setUser(normalizedUser);
        }
    }
  };

  useEffect(() => {
    if (!auth) { setLoading(false); return; }

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
          try {
            const profile = await getEmployeeProfile(firebaseUser.uid);
            if (profile) {
              const normalizedUser = { ...profile, role: (profile.role || 'employee').toLowerCase() as 'master' | 'admin' | 'employee' };
              setUser(normalizedUser);
              if (!hasInitializedAuth.current && !['reset-password', 'verify-email'].includes(currentPageRef.current)) {
                  if (!profile.companyId) {
                    setCurrentPage('onboarding');
                  } else {
                    setCurrentPage('tracker');
                  }
              }
            } else {
                const fallbackUser: Employee = {
                    id: firebaseUser.uid,
                    uid: firebaseUser.uid,
                    companyId: '',
                    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Colaborador',
                    email: firebaseUser.email || '',
                    phone: '',
                    location: '',
                    role: 'employee',
                    status: 'Clocked Out',
                    lastClockInTime: null,
                    currentStatusStartTime: null,
                    emailVerified: firebaseUser.emailVerified
                };
                setUser(fallbackUser);
                setCurrentPage('onboarding');
            }
          } catch (error) { console.error("Error fetching profile", error); }
      } else {
        setUser(null);
        const current = currentPageRef.current;
        if (!['reset-password', 'verify-email', 'register'].includes(current)) { setCurrentPage('home'); }
      }
      hasInitializedAuth.current = true;
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !user.companyId) return;
    Promise.all([
        getActivityStatuses(), 
        getWorkSchedules(), 
        getPayrollChangeTypes(), 
        getCalendarEvents(),
        getCompanyDetails(user.companyId)
    ]).then(([statuses, schedules, payrollTypes, events, companyDetails]) => {
      setActivityStatuses(statuses); 
      setWorkSchedules(schedules); 
      setPayrollChangeTypes(payrollTypes); 
      setCalendarEvents(events);
      setCompany(companyDetails);
    }).catch(e => console.error(e));
    const unsubEmployees = streamEmployees(setEmployees);
    const unsubLog = streamAttendanceLog(setAttendanceLog);
    return () => { unsubEmployees(); unsubLog(); };
  }, [user]);

  const handleLogin = async (creds: {email: string, password: string}) => {
    try {
      const loggedUser = await loginWithEmailAndPassword(creds.email, creds.password);
      setUser(loggedUser);
      if (!loggedUser.companyId) {
          setCurrentPage('onboarding');
      } else {
          setCurrentPage('tracker');
      }
      addNotification(`¡Bienvenido, ${loggedUser.name}!`, 'success');
    } catch (error: any) { 
        addNotification(error.message || 'Error al entrar', 'error');
        throw error; 
    }
  };

  const handleRegister = async (data: { fullName: string; email: string; password: string }) => {
     try {
       await registerWithEmailAndPassword(data.fullName, data.email, data.password);
       addNotification('Registro exitoso.', 'success');
     } catch (error: any) { 
        if (!error.message?.includes('auth/email-already-in-use') && error.code !== 'auth/email-already-in-use') {
            addNotification(error.message || 'Error al registrar', 'error');
        }
        throw error; 
     }
  };

  const handleLogout = async () => { await logout(); setUser(null); setCurrentPage('home'); addNotification('Sesión cerrada', 'success'); };

  const handleForgotPassword = async (email: string) => {
      try { await sendPasswordResetEmail(email); addNotification('Correo enviado.', 'success'); } catch (error: any) { addNotification(error.message || 'Error al enviar.', 'error'); throw error; }
  };

  const handleEmployeeAction = async (employeeId: string, action: AttendanceAction) => {
      try {
          const employee = employees.find(e => e.id === employeeId);
          if (!employee) return;
          const timestamp = Date.now();
          await addAttendanceLogEntry({ employeeId, companyId: user?.companyId || '', employeeName: employee.name, action, timestamp });
          let newStatus = employee.status;
          if (action === 'Clock In') newStatus = 'Working';
          else if (action === 'Clock Out') newStatus = 'Clocked Out';
          else if (action.startsWith('Start ')) newStatus = action.substring(6);
          else if (action.startsWith('End ')) newStatus = 'Working';
          const updates: any = { status: newStatus, currentStatusStartTime: newStatus === 'Clocked Out' ? null : timestamp };
          if (action === 'Clock In') { updates.lastClockInTime = timestamp; }
          await updateEmployeeStatus({ ...employee, ...updates });
          addNotification(`${action} registrado`, 'success');
      } catch (error) { addNotification('Error al actualizar estado', 'error'); }
  };

  const handleUpdateLogEntry = async (logId: string, updates: Partial<AttendanceLogEntry>) => {
      try { await updateAttendanceLogEntry(logId, updates); setIsEditActivityLogEntryModalOpen(false); addNotification('Registro actualizado.', 'success'); } catch (error) { addNotification('Error al actualizar.', 'error'); }
  };

  const promptConfirm = (title: string, message: string, onConfirm: () => void) => {
      setConfirmConfig({ title, message, onConfirm: () => { onConfirm(); setIsConfirmModalOpen(false); }});
      setIsConfirmModalOpen(true);
  };

  const trackerEmployees = useMemo(() => {
      if (!user) return [];
      if (user.role === 'employee') return employees.filter(e => e.id === user.id);
      return employees;
  }, [employees, user]);

  const isAdminOrMaster = user?.role === 'admin' || user?.role === 'master';

  if (loading) return (
      <div className="flex flex-col items-center justify-center h-screen bg-bright-white text-lucius-lime gap-4">
          <div className="flex space-x-2">
            <div className="w-4 h-4 rounded-full bg-lucius-lime animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-4 h-4 rounded-full bg-lucius-lime animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-4 h-4 rounded-full bg-lucius-lime animate-bounce"></div>
          </div>
          <p className="font-bold animate-pulse">Iniciando TeamCheck...</p>
      </div>
  );

  if (currentPage === 'home') return <HomePage onLogin={handleLogin} onRegister={handleRegister} onForgotPassword={handleForgotPassword} />;
  if (currentPage === 'login') return <LoginPage onLogin={handleLogin} onNavigateToRegister={() => setCurrentPage('register')} onNavigateToHome={() => setCurrentPage('home')} onForgotPassword={handleForgotPassword} />;
  if (currentPage === 'register') return <RegisterPage onRegister={handleRegister} onNavigateToLogin={() => setCurrentPage('login')} onNavigateToHome={() => setCurrentPage('home')} />;
  if (currentPage === 'reset-password' && actionCode) return <ResetPasswordPage oobCode={actionCode} onNavigateToLogin={() => setCurrentPage('login')} />;
  if (currentPage === 'verify-email' && actionCode) return <EmailVerificationPage oobCode={actionCode} onNavigateToLogin={() => setCurrentPage('login')} />;

  if (!user) return <HomePage onLogin={handleLogin} onRegister={handleRegister} onForgotPassword={handleForgotPassword} />;

  if (currentPage === 'onboarding' || !user.companyId) {
    return (
      <OnboardingPage 
        user={user} 
        onLogout={handleLogout} 
        initialInviteCode={urlInviteCode || undefined} 
        onComplete={async () => {
          try {
            await new Promise(r => setTimeout(r, 800));
            const refreshedProfile = await getEmployeeProfile(user.id);
            if (refreshedProfile && refreshedProfile.companyId) {
              const normalizedUser = { 
                ...refreshedProfile, 
                role: (refreshedProfile.role || 'employee').toLowerCase() as 'master' | 'admin' | 'employee' 
              };
              setUser(normalizedUser);
              setCurrentPage('tracker');
            } else {
              setUser(prev => prev ? { ...prev, companyId: 'pending' } : null);
              setCurrentPage('tracker');
              setTimeout(refreshUserProfile, 2000);
            }
          } catch (e) {
            console.error("Error in onComplete:", e);
            setCurrentPage('tracker');
          }
        }} 
      />
    );
  }

  return (
    <div className="flex h-screen bg-bright-white overflow-hidden font-sans text-bokara-grey">
      <SideNav currentPage={currentPage} onNavigate={setCurrentPage} userRole={user.role} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header currentPage={currentPage} onNavigate={setCurrentPage} user={user} userRole={user.role} onLogout={handleLogout} onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} notifications={[]} onNotificationClick={() => {}} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-whisper-white/30 p-4 sm:p-6 lg:p-8 scroll-smooth">
          {currentPage === 'tracker' && <TrackerPage employees={trackerEmployees} attendanceLog={attendanceLog} onEmployeeAction={handleEmployeeAction} onAddEmployee={() => setIsAddEmployeeModalOpen(true)} onRemoveEmployee={(id) => promptConfirm('Eliminar Colaborador', '¿Estás seguro?', () => removeEmployee(id))} onEditTime={(id) => { const emp = employees.find(e => e.id === id); if (emp) { setEmployeeForTimeEdit(emp); setIsEditTimeModalOpen(true); }}} userRole={user.role} activityStatuses={activityStatuses} workSchedules={workSchedules} onEditEntry={(entry) => { setLogEntryToEdit(entry); setIsEditActivityLogEntryModalOpen(true); }} />}
          {currentPage === 'dashboard' && isAdminOrMaster && <DashboardPage attendanceLog={attendanceLog} employees={employees} onEmployeeAction={handleEmployeeAction} activityStatuses={activityStatuses} workSchedules={workSchedules} calendarEvents={calendarEvents} inviteCode={company?.inviteCode} />}
          {currentPage === 'timesheet' && isAdminOrMaster && <TimesheetPage employees={employees} attendanceLog={attendanceLog} activityStatuses={activityStatuses} onEditEntry={(entry) => { setTimesheetEntryToEdit(entry); setIsEditTimesheetModalOpen(true); }} />}
          {currentPage === 'employees' && isAdminOrMaster && <EmployeesPage employees={employees} onAddEmployee={() => setIsAddEmployeeModalOpen(true)} onEditEmployee={(id) => { const emp = employees.find(e => e.id === id); if (emp) { setEmployeeToEdit(emp); setIsEditEmployeeModalOpen(true); }}} onRemoveEmployee={(id) => promptConfirm('Eliminar Colaborador', '¿Estás seguro?', () => removeEmployee(id))} workSchedules={workSchedules} currentUser={user} inviteCode={company?.inviteCode} />}
          {currentPage === 'schedule' && isAdminOrMaster && <SchedulePage events={calendarEvents} employees={employees} payrollChangeTypes={payrollChangeTypes} onAddEvent={() => setIsAddEventModalOpen(true)} onEditEvent={(event) => { setEventToEdit(event); setIsEditEventModalOpen(true); }} onRemoveEvent={(event) => promptConfirm('Eliminar Evento', '¿Estás seguro?', () => removeCalendarEvent(event.id))} onUpdateEventStatus={async (event, status) => { await updateCalendarEvent({ ...event, status }); setCalendarEvents(prev => prev.map(e => e.id === event.id ? { ...e, status } : e)); }} />}
          {currentPage === 'seating' && <SeatingPage employees={employees} activityStatuses={activityStatuses} currentUserRole={user.role} />}
          {currentPage === 'ticketing' && <TicketingPage events={calendarEvents} currentUser={user} employees={employees} payrollChangeTypes={payrollChangeTypes} onAddRequest={async (req) => { try { await addCalendarEvent({ ...req, status: 'pending' }); addNotification('Solicitud enviada', 'success'); const updatedEvents = await getCalendarEvents(); setCalendarEvents(updatedEvents); } catch(e) { addNotification('Error al enviar', 'error'); }}} onUpdateRequest={async (evt) => { try { await updateCalendarEvent(evt); addNotification('Solicitud actualizada', 'success'); const updatedEvents = await getCalendarEvents(); setCalendarEvents(updatedEvents); } catch(e) { addNotification('Error al actualizar', 'error'); }}} onRemoveRequest={(evt) => promptConfirm('Borrar Solicitud', '¿Seguro?', async () => { try { await removeCalendarEvent(evt.id); addNotification('Solicitud borrada', 'success'); const updatedEvents = await getCalendarEvents(); setCalendarEvents(updatedEvents); } catch(e) { addNotification('Error al borrar', 'error'); }})} />}

          {/* ── FIX: onAddPayrollChangeType ahora recibe los 5 parámetros correctamente ── */}
          {currentPage === 'settings' && isAdminOrMaster && (
            <SettingsPage
              statuses={activityStatuses}
              onAddStatus={async (n, c) => {
                await addActivityStatus(n, c);
                setActivityStatuses(await getActivityStatuses());
              }}
              onRemoveStatus={async (id) => {
                await removeActivityStatus(id);
                setActivityStatuses(await getActivityStatuses());
              }}
              payrollChangeTypes={payrollChangeTypes}
              onAddPayrollChangeType={async (n, c, e, a, quota) => {
                await addPayrollChangeType(n, c, e, a, quota);
                setPayrollChangeTypes(await getPayrollChangeTypes());
              }}
              onUpdatePayrollChangeType={async (id, u) => {
                await updatePayrollChangeType(id, u);
                setPayrollChangeTypes(await getPayrollChangeTypes());
              }}
              onRemovePayrollChangeType={async (id) => {
                await removePayrollChangeType(id);
                setPayrollChangeTypes(await getPayrollChangeTypes());
              }}
              workSchedules={workSchedules}
              onAddWorkSchedule={async (s) => {
                await addWorkSchedule(s);
                setWorkSchedules(await getWorkSchedules());
              }}
              onUpdateWorkSchedule={async (id, u) => {
                await updateWorkSchedule(id, u);
                setWorkSchedules(await getWorkSchedules());
              }}
              onRemoveWorkSchedule={async (id) => {
                await removeWorkSchedule(id);
                setWorkSchedules(await getWorkSchedules());
              }}
              companyId={user.companyId}
              inviteCode={company?.inviteCode}
            />
          )}

          {currentPage === 'profile' && <ProfilePage user={user} onUpdateProfile={refreshUserProfile} />}
          {currentPage === 'calendar' && <CalendarPage events={calendarEvents} currentUser={user} payrollChangeTypes={payrollChangeTypes} />}
          {currentPage === 'password' && <ChangePasswordPage />}
        </main>

        {/* ── MODALES ── */}
        <AddEmployeeModal
          isOpen={isAddEmployeeModalOpen}
          onClose={() => setIsAddEmployeeModalOpen(false)}
          workSchedules={workSchedules}
          inviteCode={company?.inviteCode}
          companyName={company?.name}
          onAddEmployee={async (data) => {
            try {
              await addEmployee({ ...data, companyId: user.companyId });
              addNotification('Colaborador añadido', 'success');
            } catch (e: any) {
              addNotification(e.message || 'Error al añadir colaborador', 'error');
              throw e;
            }
          }}
        />
        <EditEmployeeModal isOpen={isEditEmployeeModalOpen} onClose={() => setIsEditEmployeeModalOpen(false)} employeeToEdit={employeeToEdit} workSchedules={workSchedules} onUpdateEmployee={async (emp) => { try { await updateEmployeeDetails(emp); setIsEditEmployeeModalOpen(false); addNotification('Colaborador actualizado', 'success'); } catch(e) { addNotification('Error', 'error'); } }} />
        <EditTimeModal isOpen={isEditTimeModalOpen} onClose={() => setIsEditTimeModalOpen(false)} employee={employeeForTimeEdit} onSave={async (id, time) => { try { await updateEmployeeCurrentSession(id, time); setIsEditTimeModalOpen(false); addNotification('Hora actualizada', 'success'); } catch(e) { addNotification('Error', 'error'); } }} />
        <EditTimesheetEntryModal isOpen={isEditTimesheetModalOpen} onClose={() => setIsEditTimesheetModalOpen(false)} entry={timesheetEntryToEdit} onSave={async (sid, eid, start, end) => { try { await updateTimesheetEntry(timesheetEntryToEdit!.employeeId, sid, eid, start, end); setIsEditTimesheetModalOpen(false); addNotification('Entrada actualizada', 'success'); } catch(e) { addNotification('Error', 'error'); } }} />
        <AddEventModal isOpen={isAddEventModalOpen} onClose={() => setIsAddEventModalOpen(false)} employees={employees} payrollChangeTypes={payrollChangeTypes} onAddEvent={async (data) => { try { await addCalendarEvent({ ...data }); setIsAddEventModalOpen(false); addNotification('Evento añadido', 'success'); const evs = await getCalendarEvents(); setCalendarEvents(evs); } catch(e) { addNotification('Error', 'error'); } }} />
        <EditEventModal isOpen={isEditEventModalOpen} onClose={() => setIsEditEventModalOpen(false)} eventToEdit={eventToEdit} employees={employees} payrollChangeTypes={payrollChangeTypes} onUpdateEvent={async (data) => { try { await updateCalendarEvent(data); setIsEditEventModalOpen(false); addNotification('Evento actualizado', 'success'); const evs = await getCalendarEvents(); setCalendarEvents(evs); } catch(e) { addNotification('Error', 'error'); } }} />
        <EditActivityLogEntryModal isOpen={isEditActivityLogEntryModalOpen} onClose={() => setIsEditActivityLogEntryModalOpen(false)} entry={logEntryToEdit} activityStatuses={activityStatuses} onSave={handleUpdateLogEntry} />
        <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title={confirmConfig.title} message={confirmConfig.message} onConfirm={confirmConfig.onConfirm} />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </ErrorBoundary>
  );
};

export default App;