import * as React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Employee, AttendanceLogEntry, ActivityStatus, WorkSchedule, 
  CalendarEvent, PayrollChangeType, TimesheetEntry, AttendanceAction, Company
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
  updateTimesheetEntry, sendPasswordResetEmail, updateAttendanceLogEntry, removeAttendanceLogEntry,
  getCompanyDetails,
  getNotificationRecipients,
  getEmailConfig
} from './services/apiService';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { auth } from './services/firebase';

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

// Components
import Header, { BellNotification } from './components/Header';
import SideNav from './components/SideNav';
import AddEmployeeModal from './components/AddEmployeeModal';
import EditEmployeeModal from './components/EditEmployeeModal';
import EditTimeModal from './components/EditTimeModal';
import EditTimesheetEntryModal from './components/EditTimesheetEntryModal';
import AddEventModal from './components/AddEventModal';
import EditEventModal from './components/EditEventModal';
import EditActivityLogEntryModal from './components/EditActivityLogEntryModal';
import ConfirmationModal from './components/ConfirmationModal';

// --- Error Boundary ---
type ErrorBoundaryProps = { children: React.ReactNode };
type ErrorBoundaryState = { hasError: boolean; error: any };

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, errorInfo: React.ErrorInfo) { console.error("ErrorBoundary caught an error", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 text-center">
          <h1 className="text-4xl font-bold text-red-600 mb-4">¡Ups! Algo salió mal</h1>
          <p className="text-gray-600 mb-8 max-w-md">La aplicación encontró un error inesperado.</p>
          <button onClick={() => window.location.reload()} className="bg-lucius-lime text-bokara-grey font-bold py-3 px-8 rounded-xl shadow-lg">Recargar Aplicación</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Main App Content ---
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

  // Modals
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
    title: '', message: '', onConfirm: () => {},
  });

  const [actionCode, setActionCode] = useState<string | null>(null);
  const urlInviteCode = useRef<string | null>(new URLSearchParams(window.location.search).get('inviteCode'));
  const hasInitializedAuth = useRef(false);
  const currentPageRef = useRef(currentPage);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  const refreshUserProfile = async () => {
    if (user?.id) {
      const profile = await getEmployeeProfile(user.id);
      if (profile) {
        setUser({ ...profile, role: (profile.role || 'employee').toLowerCase() as 'master' | 'admin' | 'employee' });
      }
    }
  };

  // Auth listener
  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getEmployeeProfile(firebaseUser.uid);
          if (profile) {
            setUser({ ...profile, role: (profile.role || 'employee').toLowerCase() as 'master' | 'admin' | 'employee' });
            if (!hasInitializedAuth.current && !['reset-password', 'verify-email'].includes(currentPageRef.current)) {
              setCurrentPage(profile.companyId ? 'tracker' : 'onboarding');
            }
          } else {
            setUser({
              id: firebaseUser.uid, uid: firebaseUser.uid, companyId: '',
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Colaborador',
              email: firebaseUser.email || '', phone: '', location: '',
              role: 'employee', status: 'Clocked Out',
              lastClockInTime: null, currentStatusStartTime: null,
              emailVerified: firebaseUser.emailVerified,
            });
            setCurrentPage('onboarding');
          }
        } catch (error) { console.error("Error fetching profile", error); }
      } else {
        setUser(null);
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        const oobCode = params.get('oobCode');
        if (mode === 'resetPassword' && oobCode) {
          setActionCode(oobCode);
          setCurrentPage('reset-password');
        } else if (mode === 'verifyEmail' && oobCode) {
          setActionCode(oobCode);
          setCurrentPage('verify-email');
        } else if (!['register'].includes(currentPageRef.current)) {
          setCurrentPage('home');
        }
      }
      hasInitializedAuth.current = true;
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load company data
  useEffect(() => {
    if (!user?.companyId) return;
    Promise.all([
      getActivityStatuses(),
      getWorkSchedules(),
      getPayrollChangeTypes(),
      getCalendarEvents(),
      getCompanyDetails(user.companyId),
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

  // ── Notificaciones de la campana (solo admins/masters) ──
  // Fuente 1: tiquetes con status 'pending'
  // Fuente 2: entradas del log con correctionRequest
  const bellNotifications = useMemo((): BellNotification[] => {
    const isAdminOrMaster = user?.role === 'admin' || user?.role === 'master';
    if (!isAdminOrMaster) return [];

    // Tiquetes pendientes → navegar a 'ticketing'
    const ticketNotifs: BellNotification[] = calendarEvents
      .filter(e => e.status === 'pending')
      .map(e => {
        const empName = employees.find(emp => emp.id === e.employeeId)?.name || 'Colaborador';
        return {
          id: `ticket-${e.id}`,
          type: 'ticket_pending' as const,
          title: empName,
          subtitle: `${e.type} · ${e.startDate}${e.startDate !== e.endDate ? ` → ${e.endDate}` : ''}`,
          timestamp: Date.now(),
          navigateTo: 'ticketing',
        };
      });

    // Solicitudes de corrección de hora → navegar a 'tracker' y abrir modal
    const correctionNotifs: BellNotification[] = attendanceLog
      .filter(entry => entry.correctionRequest && entry.correctionStatus === 'pending')
      .map(entry => ({
        id: `correction-${entry.id}`,
        type: 'correction_request' as const,
        title: entry.employeeName,
        subtitle: (entry as any).correctionRequest as string,
        timestamp: entry.timestamp,
        navigateTo: 'tracker',
      }));

    return [...ticketNotifs, ...correctionNotifs]
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [calendarEvents, attendanceLog, employees, user?.role]);

  // Click en notificación → navegar + abrir modal si aplica
  const handleBellNotificationClick = (notif: BellNotification) => {
    setCurrentPage(notif.navigateTo);
    if (notif.type === 'correction_request') {
      const entryId = notif.id.replace('correction-', '');
      const entry = attendanceLog.find(e => e.id === entryId);
      if (entry) {
        setLogEntryToEdit(entry);
        setIsEditActivityLogEntryModalOpen(true);
      }
    }
  };

  // ── Email automático al crear un tiquete ──
  const sendTicketNotification = async (req: any) => {
    try {
      const [recipients, emailConfig] = await Promise.all([
        getNotificationRecipients(),
        getEmailConfig(),
      ]);
      console.log('[EmailJS] recipients:', recipients);
      console.log('[EmailJS] emailConfig:', emailConfig);
      if (!emailConfig || !recipients.length) {
        console.warn('[EmailJS] Sin config o sin destinatarios');
        return;
      }
      // Soportar tanto camelCase como snake_case por si Settings guarda diferente
      const serviceId = emailConfig.serviceId || emailConfig.service_id;
      const templateId = emailConfig.templateId || emailConfig.template_id;
      const publicKey = emailConfig.publicKey || emailConfig.public_key || emailConfig.userId || emailConfig.user_id;
      console.log('[EmailJS] serviceId:', serviceId, '| templateId:', templateId, '| publicKey:', publicKey);
      if (!serviceId || !templateId || !publicKey) {
        console.warn('[EmailJS] Faltan credenciales');
        return;
      }

      const empName = employees.find(e => e.id === req.employeeId)?.name || user?.name || 'Colaborador';
      const dateRange = req.startDate === req.endDate
        ? req.startDate
        : `${req.startDate} → ${req.endDate}`;

      const results = await Promise.all(recipients.map((toEmail: string) =>
        fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: serviceId,
            template_id: templateId,
            user_id: publicKey,
            template_params: {
              recipient_email: toEmail,
              user_name: empName,
              request_type: req.type || 'Solicitud',
              request_dates: dateRange,
              request_notes: req.notes || '',
              message: `${empName} ha enviado una nueva solicitud de ${req.type || 'tiquete'} para el período ${dateRange}.`,
            },
          }),
        }).then(async r => {
          const text = await r.text();
          console.log(`[EmailJS] → ${toEmail}: status=${r.status} body=${text}`);
          return { toEmail, status: r.status, body: text };
        })
      ));
      console.log('[EmailJS] Resultados:', results);
    } catch (e) {
      console.warn('[EmailJS] Error:', e);
    }
  };

  // Handlers
  const handleLogin = async (creds: { email: string; password: string; rememberMe?: boolean }) => {
    try {
      const loggedUser = await loginWithEmailAndPassword(creds.email, creds.password, creds.rememberMe ?? false);
      setUser(loggedUser);
      setCurrentPage(loggedUser.companyId ? 'tracker' : 'onboarding');
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
      if (!error.message?.includes('auth/email-already-in-use')) {
        addNotification(error.message || 'Error al registrar', 'error');
      }
      throw error;
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setCurrentPage('home');
    addNotification('Sesión cerrada', 'success');
  };

  const handleForgotPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(email);
      addNotification('Correo enviado.', 'success');
    } catch (error: any) {
      addNotification(error.message || 'Error al enviar.', 'error');
      throw error;
    }
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
      if (action === 'Clock In') updates.lastClockInTime = timestamp;
      await updateEmployeeStatus({ ...employee, ...updates });
      // Actualizar estado del usuario actual para reflejar cambio en el Header
      if (user && employeeId === user.id) setUser(prev => prev ? { ...prev, ...updates } : prev);
      addNotification(`${action} registrado`, 'success');
    } catch (error) { addNotification('Error al actualizar estado', 'error'); }
  };

  const handleUpdateLogEntry = async (logId: string, updates: Partial<AttendanceLogEntry>) => {
    try {
      await updateAttendanceLogEntry(logId, updates);
      setIsEditActivityLogEntryModalOpen(false);
      addNotification('Registro actualizado.', 'success');
    } catch (error) { addNotification('Error al actualizar.', 'error'); }
  };

  const promptConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmConfig({ title, message, onConfirm: () => { onConfirm(); setIsConfirmModalOpen(false); } });
    setIsConfirmModalOpen(true);
  };

  const handleRemoveLogEntry = (entry: AttendanceLogEntry) => {
    promptConfirm(
      'Eliminar Registro',
      `¿Eliminar el registro de ${entry.employeeName} (${entry.action})?`,
      async () => {
        try {
          await removeAttendanceLogEntry(entry.id);
          addNotification('Registro eliminado.', 'success');
        } catch { addNotification('Error al eliminar.', 'error'); }
      }
    );
  };


  const trackerEmployees = useMemo(() => {
    if (!user) return [];
    if (user.role === 'employee') return employees.filter(e => e.id === user.id);
    return employees;
  }, [employees, user]);

  const isAdminOrMaster = user?.role === 'admin' || user?.role === 'master';

  // ── Loading ──
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-bright-white gap-4">
      <div className="flex space-x-2">
        <div className="w-4 h-4 rounded-full bg-lucius-lime animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-4 h-4 rounded-full bg-lucius-lime animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-4 h-4 rounded-full bg-lucius-lime animate-bounce"></div>
      </div>
      <p className="font-bold animate-pulse text-lucius-lime">Iniciando TeamCheck...</p>
    </div>
  );

  // ── Public pages ──
  if (currentPage === 'home') return <HomePage onLogin={handleLogin} onRegister={handleRegister} onForgotPassword={handleForgotPassword} />;
  if (currentPage === 'login') return <LoginPage onLogin={handleLogin} onNavigateToRegister={() => setCurrentPage('register')} onNavigateToHome={() => setCurrentPage('home')} onForgotPassword={handleForgotPassword} />;
  if (currentPage === 'register') return <RegisterPage onRegister={handleRegister} onNavigateToLogin={() => setCurrentPage('login')} onNavigateToHome={() => setCurrentPage('home')} />;
  if (currentPage === 'reset-password' && actionCode) return <ResetPasswordPage oobCode={actionCode} onNavigateToLogin={() => setCurrentPage('login')} />;
  if (currentPage === 'verify-email' && actionCode) return <EmailVerificationPage oobCode={actionCode} onNavigateToLogin={() => setCurrentPage('login')} />;
  if (!user) return <HomePage onLogin={handleLogin} onRegister={handleRegister} onForgotPassword={handleForgotPassword} />;

  // ── Onboarding ──
  if (currentPage === 'onboarding' || !user.companyId) {
    return (
      <OnboardingPage
        user={user}
        onLogout={handleLogout}
        initialInviteCode={urlInviteCode.current || undefined}
        onComplete={async () => {
          setTimeout(async () => {
            await refreshUserProfile();
            setCurrentPage('tracker');
          }, 1000);
        }}
      />
    );
  }

  // ── Main shell ──
  return (
    <div className="flex h-screen bg-bright-white overflow-hidden font-sans text-bokara-grey">
      <SideNav currentPage={currentPage} onNavigate={setCurrentPage} userRole={user.role} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden relative">

        <Header
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          user={user}
          userRole={user.role}
          onLogout={handleLogout}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          notifications={bellNotifications}
          onNotificationClick={handleBellNotificationClick}
          onQuickAction={handleEmployeeAction}
        />

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-whisper-white/30 p-4 sm:p-6 lg:p-8 scroll-smooth">

          {/* TRACKER */}
          {currentPage === 'tracker' && (
            <TrackerPage
              employees={trackerEmployees}
              attendanceLog={attendanceLog}
              onEmployeeAction={handleEmployeeAction}
              onAddEmployee={() => setIsAddEmployeeModalOpen(true)}
              onRemoveEmployee={(id) => promptConfirm('Eliminar Colaborador', '¿Estás seguro?', () => removeEmployee(id))}
              onEditTime={(id) => { const emp = employees.find(e => e.id === id); if (emp) { setEmployeeForTimeEdit(emp); setIsEditTimeModalOpen(true); } }}
              userRole={user.role}
              activityStatuses={activityStatuses}
              workSchedules={workSchedules}
              onEditEntry={(entry) => { setLogEntryToEdit(entry); setIsEditActivityLogEntryModalOpen(true); }}
              onRemoveEntry={handleRemoveLogEntry}
            />
          )}

          {/* DASHBOARD */}
          {currentPage === 'dashboard' && isAdminOrMaster && (
            <DashboardPage attendanceLog={attendanceLog} employees={employees} onEmployeeAction={handleEmployeeAction} activityStatuses={activityStatuses} workSchedules={workSchedules} calendarEvents={calendarEvents} inviteCode={company?.inviteCode} />
          )}

          {/* TIMESHEET */}
          {currentPage === 'timesheet' && isAdminOrMaster && (
            <TimesheetPage employees={employees} attendanceLog={attendanceLog} activityStatuses={activityStatuses} onEditEntry={(entry) => { setTimesheetEntryToEdit(entry); setIsEditTimesheetModalOpen(true); }} />
          )}

          {/* EMPLOYEES */}
          {currentPage === 'employees' && isAdminOrMaster && (
            <EmployeesPage
              employees={employees}
              onAddEmployee={() => setIsAddEmployeeModalOpen(true)}
              onEditEmployee={(id) => { const emp = employees.find(e => e.id === id); if (emp) { setEmployeeToEdit(emp); setIsEditEmployeeModalOpen(true); } }}
              onRemoveEmployee={(id) => promptConfirm('Eliminar Colaborador', '¿Estás seguro?', () => removeEmployee(id))}
              workSchedules={workSchedules}
              currentUser={user}
              inviteCode={company?.inviteCode}
            />
          )}

          {/* SCHEDULE */}
          {currentPage === 'schedule' && (
            <SchedulePage
              events={calendarEvents}
              employees={employees}
              payrollChangeTypes={payrollChangeTypes}
              onAddEvent={() => setIsAddEventModalOpen(true)}
              onEditEvent={(event) => { setEventToEdit(event); setIsEditEventModalOpen(true); }}
              onRemoveEvent={(event) => promptConfirm(
                'Eliminar Evento', '¿Estás seguro?',
                async () => {
                  try {
                    await removeCalendarEvent(event.id);
                    setCalendarEvents(await getCalendarEvents());
                    addNotification('Evento eliminado', 'success');
                  } catch { addNotification('Error al eliminar', 'error'); }
                }
              )}
              onUpdateEventStatus={async (event, status) => {
                await updateCalendarEvent({ ...event, status });
                setCalendarEvents(prev => prev.map(e => e.id === event.id ? { ...e, status } : e));
              }}
            />
          )}

          {/* SEATING */}
          {currentPage === 'seating' && (
            <SeatingPage employees={employees} activityStatuses={activityStatuses} currentUserRole={user.role} />
          )}

          {/* TICKETING */}
          {currentPage === 'ticketing' && (
            <TicketingPage
              events={calendarEvents}
              currentUser={user}
              employees={employees}
              payrollChangeTypes={payrollChangeTypes}
              onAddRequest={async (req) => {
                try {
                  await addCalendarEvent({ ...req, status: 'pending' });
                  addNotification('Solicitud enviada', 'success');
                  setCalendarEvents(await getCalendarEvents());
                  // ── Notificar por email a los destinatarios RRHH ──
                  sendTicketNotification(req);
                } catch { addNotification('Error al enviar', 'error'); }
              }}
              onUpdateRequest={async (evt) => {
                try {
                  await updateCalendarEvent(evt);
                  addNotification('Solicitud actualizada', 'success');
                  setCalendarEvents(await getCalendarEvents());
                } catch { addNotification('Error al actualizar', 'error'); }
              }}
              onRemoveRequest={(evt) => promptConfirm('Borrar Solicitud', '¿Seguro?', async () => {
                try {
                  await removeCalendarEvent(evt.id);
                  addNotification('Solicitud borrada', 'success');
                  setCalendarEvents(await getCalendarEvents());
                } catch { addNotification('Error al borrar', 'error'); }
              })}
              onUpdateEventStatus={async (event, status) => {
                try {
                  await updateCalendarEvent({ ...event, status });
                  setCalendarEvents(await getCalendarEvents());
                } catch { addNotification('Error al actualizar estado', 'error'); }
              }}
            />
          )}

          {/* SETTINGS */}
          {currentPage === 'settings' && isAdminOrMaster && (
            <SettingsPage
              statuses={activityStatuses}
              onAddStatus={async (n, c) => { await addActivityStatus(n, c); setActivityStatuses(await getActivityStatuses()); }}
              onRemoveStatus={async (id) => { await removeActivityStatus(id); setActivityStatuses(await getActivityStatuses()); }}
              payrollChangeTypes={payrollChangeTypes}
              onAddPayrollChangeType={async (n, c, e, a, quota) => { await addPayrollChangeType(n, c, e, a, quota); setPayrollChangeTypes(await getPayrollChangeTypes()); }}
              onUpdatePayrollChangeType={async (id, u) => { await updatePayrollChangeType(id, u); setPayrollChangeTypes(await getPayrollChangeTypes()); }}
              onRemovePayrollChangeType={async (id) => { await removePayrollChangeType(id); setPayrollChangeTypes(await getPayrollChangeTypes()); }}
              workSchedules={workSchedules}
              onAddWorkSchedule={async (s) => { await addWorkSchedule(s); setWorkSchedules(await getWorkSchedules()); }}
              onUpdateWorkSchedule={async (id, u) => { await updateWorkSchedule(id, u); setWorkSchedules(await getWorkSchedules()); }}
              onRemoveWorkSchedule={async (id) => { await removeWorkSchedule(id); setWorkSchedules(await getWorkSchedules()); }}
              companyId={user.companyId}
              inviteCode={company?.inviteCode}
            />
          )}

          {/* PROFILE */}
          {currentPage === 'profile' && <ProfilePage user={user} onUpdateProfile={refreshUserProfile} />}

          {/* CALENDAR */}
          {currentPage === 'calendar' && <CalendarPage events={calendarEvents} currentUser={user} payrollChangeTypes={payrollChangeTypes} />}

          {/* CHANGE PASSWORD */}
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
            try { await addEmployee({ ...data, companyId: user.companyId }); addNotification('Colaborador añadido', 'success'); }
            catch (e: any) { addNotification(e.message || 'Error', 'error'); throw e; }
          }}
        />

        <EditEmployeeModal
          isOpen={isEditEmployeeModalOpen}
          onClose={() => setIsEditEmployeeModalOpen(false)}
          employeeToEdit={employeeToEdit}
          workSchedules={workSchedules}
          onUpdateEmployee={async (emp) => {
            try { await updateEmployeeDetails(emp); setIsEditEmployeeModalOpen(false); addNotification('Colaborador actualizado', 'success'); }
            catch { addNotification('Error', 'error'); }
          }}
        />

        <EditTimeModal
          isOpen={isEditTimeModalOpen}
          onClose={() => setIsEditTimeModalOpen(false)}
          employee={employeeForTimeEdit}
          onSave={async (id, time) => {
            try { await updateEmployeeCurrentSession(id, time); setIsEditTimeModalOpen(false); addNotification('Hora actualizada', 'success'); }
            catch { addNotification('Error', 'error'); }
          }}
        />

        <EditTimesheetEntryModal
          isOpen={isEditTimesheetModalOpen}
          onClose={() => setIsEditTimesheetModalOpen(false)}
          entry={timesheetEntryToEdit}
          onSave={async (sid, eid, start, end) => {
            try {
              await updateTimesheetEntry(
                timesheetEntryToEdit!.employeeId,
                String(sid), String(eid), Number(start), Number(end),
              );
              setIsEditTimesheetModalOpen(false);
              addNotification('Entrada actualizada', 'success');
            } catch { addNotification('Error', 'error'); }
          }}
        />

        <AddEventModal
          isOpen={isAddEventModalOpen}
          onClose={() => setIsAddEventModalOpen(false)}
          employees={employees}
          payrollChangeTypes={payrollChangeTypes}
          onAddEvent={async (data) => {
            try { await addCalendarEvent({ ...data }); setIsAddEventModalOpen(false); addNotification('Evento añadido', 'success'); setCalendarEvents(await getCalendarEvents()); }
            catch { addNotification('Error', 'error'); }
          }}
        />

        <EditEventModal
          isOpen={isEditEventModalOpen}
          onClose={() => setIsEditEventModalOpen(false)}
          eventToEdit={eventToEdit}
          employees={employees}
          payrollChangeTypes={payrollChangeTypes}
          onUpdateEvent={async (data) => {
            try { await updateCalendarEvent(data); setIsEditEventModalOpen(false); addNotification('Evento actualizado', 'success'); setCalendarEvents(await getCalendarEvents()); }
            catch { addNotification('Error', 'error'); }
          }}
        />

        <EditActivityLogEntryModal
          isOpen={isEditActivityLogEntryModalOpen}
          onClose={() => setIsEditActivityLogEntryModalOpen(false)}
          entry={logEntryToEdit}
          activityStatuses={activityStatuses}
          onSave={handleUpdateLogEntry}
        />

        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          title={confirmConfig.title}
          message={confirmConfig.message}
          onConfirm={confirmConfig.onConfirm}
        />
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  </ErrorBoundary>
);

export default App;