import * as React from 'react';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Employee, AttendanceLogEntry, ActivityStatus, WorkSchedule, 
  CalendarEvent, PayrollChangeType, TimesheetEntry, AttendanceAction, Company, IdleLogEntry
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
  getCompanyDetails, getUserCompanies, switchCompany,
  getNotificationRecipients, getEmailConfig,
  addIdleLogEntry, updateIdleLogEntry, streamIdleLog,
} from './services/apiService';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { auth } from './services/firebase';
import { NewLogEntryData } from './components/AttendanceLog';
import { useIdleDetection } from './hooks/useIdleDetection';
import { IdleEvent } from './components/IdleAlertToast';
import { useElectron, isElectron } from './hooks/useElectron';
import { uploadScreenshot, enforceRetentionPolicy } from './services/screenshotService';

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
import ProductivityPage from './pages/ProductivityPage';
import ScreencastsPage from './pages/screencastspage';

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
import IdleAlertToast from './components/IdleAlertToast';
import UpdateToast from './components/UpdateToast';

// --- Error Boundary ---
type ErrorBoundaryProps = { children: React.ReactNode };
type ErrorBoundaryState = { hasError: boolean; error: any };

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) { super(props); this.state = { hasError: false, error: null }; }
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

type PageErrorBoundaryState = { hasError: boolean };
class PageErrorBoundary extends React.Component<{ children: React.ReactNode; onReset?: () => void }, PageErrorBoundaryState> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any) { console.error('[PageErrorBoundary]', error); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
          <p className="text-red-500 font-bold">Ocurrió un error en esta sección.</p>
          <button onClick={() => { this.setState({ hasError: false }); this.props.onReset?.(); }} className="px-4 py-2 bg-lucius-lime text-bokara-grey font-bold rounded-lg text-sm">Reintentar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Main App Content ---
const AppContent: React.FC = () => {
  const { addNotification } = useNotification();

  const [user, setUser]                   = useState<Employee | null>(null);
  const [loading, setLoading]             = useState(true);
  const [currentPage, setCurrentPage]     = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('inviteCode')) return 'register';
    if (params.get('mode') === 'resetPassword') return 'reset-password';
    if (params.get('mode') === 'verifyEmail') return 'verify-email';
    return 'home';
  });

  const [isSidebarOpen, setIsSidebarOpen]         = useState(false);
  const [employees, setEmployees]                 = useState<Employee[]>([]);
  const [attendanceLog, setAttendanceLog]         = useState<AttendanceLogEntry[]>([]);
  const [activityStatuses, setActivityStatuses]   = useState<ActivityStatus[]>([]);
  const [workSchedules, setWorkSchedules]         = useState<WorkSchedule[]>([]);
  const [payrollChangeTypes, setPayrollChangeTypes] = useState<PayrollChangeType[]>([]);
  const [calendarEvents, setCalendarEvents]       = useState<CalendarEvent[]>([]);
  const [company, setCompany]                     = useState<Company | null>(null);
  const [idleLog, setIdleLog]                     = useState<IdleLogEntry[]>([]);
  const [userCompanies, setUserCompanies]         = useState<Company[]>([]);

  // ── Idle tracking refs ──
  const idleAlertTriggerRef   = useRef<((event: IdleEvent) => void) | null>(null);
  const currentIdleEntryRef   = useRef<string | null>(null);
  const idleLogRef            = useRef<IdleLogEntry[]>([]);
  useEffect(() => { idleLogRef.current = idleLog; }, [idleLog]);

  // Modals
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen]         = useState(false);
  const [isEditEmployeeModalOpen, setIsEditEmployeeModalOpen]       = useState(false);
  const [employeeToEdit, setEmployeeToEdit]                         = useState<Employee | null>(null);
  const [isEditTimeModalOpen, setIsEditTimeModalOpen]               = useState(false);
  const [employeeForTimeEdit, setEmployeeForTimeEdit]               = useState<Employee | null>(null);
  const [isEditTimesheetModalOpen, setIsEditTimesheetModalOpen]     = useState(false);
  const [timesheetEntryToEdit, setTimesheetEntryToEdit]             = useState<TimesheetEntry | null>(null);
  const [isAddEventModalOpen, setIsAddEventModalOpen]               = useState(false);
  const [isEditEventModalOpen, setIsEditEventModalOpen]             = useState(false);
  const [eventToEdit, setEventToEdit]                               = useState<CalendarEvent | null>(null);
  const [isEditActivityLogEntryModalOpen, setIsEditActivityLogEntryModalOpen] = useState(false);
  const [logEntryToEdit, setLogEntryToEdit]                         = useState<AttendanceLogEntry | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen]                 = useState(false);
  const [confirmConfig, setConfirmConfig]                           = useState<{ title: string; message: string; onConfirm: () => void }>({ title: '', message: '', onConfirm: () => {} });

  const [actionCode, setActionCode]       = useState<string | null>(null);
  const urlInviteCode                     = useRef<string | null>(new URLSearchParams(window.location.search).get('inviteCode'));
  const hasInitializedAuth                = useRef(false);
  const currentPageRef                    = useRef(currentPage);
  const unsubEmployeesRef                 = useRef<() => void>(() => {});
  const unsubLogRef                       = useRef<() => void>(() => {});
  const unsubIdleLogRef                   = useRef<() => void>(() => {});

  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  const refreshUserProfile = async () => {
    if (user?.id) {
      const profile = await getEmployeeProfile(user.id);
      if (profile) setUser({ ...profile, role: (profile.role || 'employee').toLowerCase() as 'master' | 'admin' | 'employee' });
    }
  };

  const loadCompanyData = async (companyId: string) => {
    const [statuses, schedules, payrollTypes, events, companyDetails, companies] = await Promise.all([
      getActivityStatuses(), getWorkSchedules(), getPayrollChangeTypes(),
      getCalendarEvents(), getCompanyDetails(companyId), getUserCompanies(),
    ]);
    setActivityStatuses(statuses);
    setWorkSchedules(schedules);
    setPayrollChangeTypes(payrollTypes);
    setCalendarEvents(events);
    setCompany(companyDetails);
    setUserCompanies(companies);
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
            setUser({ id: firebaseUser.uid, uid: firebaseUser.uid, companyId: '', name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Colaborador', email: firebaseUser.email || '', phone: '', location: '', role: 'employee', status: 'Clocked Out', lastClockInTime: null, currentStatusStartTime: null, emailVerified: firebaseUser.emailVerified });
            setCurrentPage('onboarding');
          }
        } catch (error) { console.error("Error fetching profile", error); }
      } else {
        setUser(null);
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode'); const oobCode = params.get('oobCode');
        if (mode === 'resetPassword' && oobCode) { setActionCode(oobCode); setCurrentPage('reset-password'); }
        else if (mode === 'verifyEmail' && oobCode) { setActionCode(oobCode); setCurrentPage('verify-email'); }
        else if (!['register'].includes(currentPageRef.current)) { setCurrentPage('home'); }
      }
      hasInitializedAuth.current = true;
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Cargar datos cuando cambia companyId
  useEffect(() => {
    if (!user?.companyId) return;
    loadCompanyData(user.companyId).catch(e => console.error(e));
    unsubEmployeesRef.current();
    unsubLogRef.current();
    unsubIdleLogRef.current();
    unsubEmployeesRef.current = streamEmployees(setEmployees);
    unsubLogRef.current       = streamAttendanceLog(setAttendanceLog);
    unsubIdleLogRef.current   = streamIdleLog((entries) => {
      setIdleLog(entries);
      const currentUser = auth?.currentUser;
      if (currentUser) {
        const openEntry = entries.find(e => e.employeeId === currentUser.uid && !e.resumedAt);
        if (openEntry && !currentIdleEntryRef.current) {
          currentIdleEntryRef.current = openEntry.id;
        }
      }
    });
    return () => {
      unsubEmployeesRef.current();
      unsubLogRef.current();
      unsubIdleLogRef.current();
    };
  }, [user?.companyId]);

  // ── Idle detection handlers ────────────────────────────────────────────────
  const handleIdleDetected = useCallback(async (event: IdleEvent) => {
    try {
      const entry = await addIdleLogEntry({
        employeeId: event.employeeId, employeeName: event.employeeName,
        companyId: event.companyId, idleStartedAt: event.idleStartedAt,
        thresholdMinutes: event.thresholdMinutes,
      });
      currentIdleEntryRef.current = entry.id;
    } catch (e) { console.warn('[IdleDetection] addIdleLogEntry failed:', e); }
  }, []);

  const handleUserReturned = useCallback(async () => {
    if (!currentIdleEntryRef.current) return;
    const entryId = currentIdleEntryRef.current;
    currentIdleEntryRef.current = null;
    const resumedAt = Date.now();
    const entry = idleLogRef.current.find(e => e.id === entryId);
    const durationSeconds = entry ? Math.floor((resumedAt - entry.idleStartedAt) / 1000) : undefined;
    try {
      await updateIdleLogEntry(entryId, { resumedAt, durationSeconds });
    } catch (e) { console.warn('[IdleDetection] updateIdleLogEntry failed:', e); }
  }, []);

  const closeOrphanIdleEntries = useCallback(async (employeeId: string) => {
    const orphans = idleLogRef.current.filter(e => e.employeeId === employeeId && !e.resumedAt);
    if (orphans.length === 0) return;
    const resumedAt = Date.now();
    await Promise.all(orphans.map(entry =>
      updateIdleLogEntry(entry.id, {
        resumedAt,
        durationSeconds: Math.floor((resumedAt - entry.idleStartedAt) / 1000),
      }).catch(e => console.warn('[IdleDetection] closeOrphan failed:', e))
    ));
    currentIdleEntryRef.current = null;
  }, []);

  const returnListenersAttachedRef = useRef(false);
  useEffect(() => {
    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart'];
    const handler = () => {
      if (currentIdleEntryRef.current) {
        handleUserReturned();
        returnListenersAttachedRef.current = false;
      }
    };
    const interval = setInterval(() => {
      if (currentIdleEntryRef.current && !returnListenersAttachedRef.current) {
        returnListenersAttachedRef.current = true;
        events.forEach(e => window.addEventListener(e, handler, { once: true, passive: true }));
      } else if (!currentIdleEntryRef.current && returnListenersAttachedRef.current) {
        returnListenersAttachedRef.current = false;
        events.forEach(e => window.removeEventListener(e, handler));
      }
    }, 500);
    return () => {
      clearInterval(interval);
      events.forEach(e => window.removeEventListener(e, handler));
      returnListenersAttachedRef.current = false;
    };
  }, [handleUserReturned]);

  useEffect(() => {
    if (!user?.id) return;
    if (user.status !== 'Working') closeOrphanIdleEntries(user.id);
  }, [user?.status, user?.id, closeOrphanIdleEntries]);

  useIdleDetection({
    employeeId:    user?.id        ?? '',
    employeeName:  user?.name      ?? '',
    companyId:     user?.companyId ?? '',
    currentStatus: user?.status    ?? 'Clocked Out',
    onIdleDetected: handleIdleDetected,
    onIdleStopped:  handleUserReturned,
    onIdleAlert: (event: IdleEvent) => {
      if (user?.role === 'admin' || user?.role === 'master') {
        idleAlertTriggerRef.current?.(event);
      }
    },
  });

  // ── Electron integration ───────────────────────────────────────────────────
  useElectron({
    employeeId:     user?.id        ?? '',
    companyId:      user?.companyId ?? '',
    employeeName:   user?.name      ?? '',
    isWorking:      user?.status === 'Working',
    screenshotMode: user?.screenshotMode ?? '3min',
    onIdleDetected: handleIdleDetected,
    onUserReturned: handleUserReturned,
    onClockOutRequired: () => {
      if (user) handleEmployeeAction(user.id, 'Clock Out');
    },
    onScreenshot: async ({ data, employeeId, companyId }) => {
      try {
        await uploadScreenshot(data, employeeId, user?.name ?? '', companyId);
      } catch (err) {
        console.error('[App] Error subiendo screenshot:', err);
      }
    },
  });

  // ── Bell notifications ──
  const bellNotifications = useMemo((): BellNotification[] => {
    if (user?.role !== 'admin' && user?.role !== 'master') return [];
    const ticketNotifs: BellNotification[] = calendarEvents
      .filter(e => e.status === 'pending')
      .map(e => {
        const empName = employees.find(emp => emp.id === e.employeeId)?.name || 'Colaborador';
        return { id: `ticket-${e.id}`, type: 'ticket_pending' as const, title: empName, subtitle: `${e.type} · ${e.startDate}${e.startDate !== e.endDate ? ` → ${e.endDate}` : ''}`, timestamp: Date.now(), navigateTo: 'ticketing' };
      });
    const correctionNotifs: BellNotification[] = attendanceLog
      .filter(entry => entry.correctionRequest && entry.correctionStatus === 'pending')
      .map(entry => ({ id: `correction-${entry.id}`, type: 'correction_request' as const, title: entry.employeeName, subtitle: (entry as any).correctionRequest as string, timestamp: entry.timestamp, navigateTo: 'tracker' }));
    return [...ticketNotifs, ...correctionNotifs].sort((a, b) => b.timestamp - a.timestamp);
  }, [calendarEvents, attendanceLog, employees, user?.role]);

  const handleBellNotificationClick = (notif: BellNotification) => {
    setCurrentPage(notif.navigateTo);
    if (notif.type === 'correction_request') {
      const entryId = notif.id.replace('correction-', '');
      const entry = attendanceLog.find(e => e.id === entryId);
      if (entry) { setLogEntryToEdit(entry); setIsEditActivityLogEntryModalOpen(true); }
    }
  };

  const handleSwitchCompany = async (newCompanyId: string) => {
    if (!user || newCompanyId === user.companyId) return;
    try {
      await switchCompany(newCompanyId);
      setUser(prev => prev ? { ...prev, companyId: newCompanyId } : prev);
      setCurrentPage('tracker');
      addNotification('Empresa cambiada correctamente', 'success');
    } catch (error: any) { addNotification(error.message || 'Error al cambiar empresa', 'error'); }
  };

  const handleCreateNewCompany = () => { setCurrentPage('onboarding'); };

  const sendTicketNotification = async (req: any) => {
    try {
      const [recipients, emailConfig] = await Promise.all([getNotificationRecipients(), getEmailConfig()]);
      if (!emailConfig || !recipients.length) return;
      const serviceId  = emailConfig.serviceId  || emailConfig.service_id;
      const templateId = emailConfig.templateId || emailConfig.template_id;
      const publicKey  = emailConfig.publicKey  || emailConfig.public_key || emailConfig.userId || emailConfig.user_id;
      if (!serviceId || !templateId || !publicKey) return;
      const empName = employees.find(e => e.id === req.employeeId)?.name || user?.name || 'Colaborador';
      const dateRange = req.startDate === req.endDate ? req.startDate : `${req.startDate} → ${req.endDate}`;
      await Promise.all(recipients.map((toEmail: string) =>
        fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service_id: serviceId, template_id: templateId, user_id: publicKey, template_params: { recipient_email: toEmail, user_name: empName, request_type: req.type || 'Solicitud', request_dates: dateRange, request_notes: req.notes || '', message: `${empName} ha enviado una nueva solicitud de ${req.type || 'tiquete'} para el período ${dateRange}.` } }),
        })
      ));
    } catch (e) { console.warn('[EmailJS] Error:', e); }
  };

  // Handlers
  const handleLogin = async (creds: { email: string; password: string; rememberMe?: boolean }) => {
    try {
      const loggedUser = await loginWithEmailAndPassword(creds.email, creds.password, creds.rememberMe ?? false);
      setUser(loggedUser);
      setCurrentPage(loggedUser.companyId ? 'tracker' : 'onboarding');
      addNotification(`¡Bienvenido, ${loggedUser.name}!`, 'success');
    } catch (error: any) { addNotification(error.message || 'Error al entrar', 'error'); throw error; }
  };

  const handleRegister = async (data: { fullName: string; email: string; password: string }) => {
    try {
      await registerWithEmailAndPassword(data.fullName, data.email, data.password);
      addNotification('Registro exitoso.', 'success');
    } catch (error: any) {
      if (!error.message?.includes('auth/email-already-in-use')) addNotification(error.message || 'Error al registrar', 'error');
      throw error;
    }
  };

  const handleLogout = async () => {
    await handleUserReturned();
    await logout();
    setUser(null);
    setCurrentPage('home');
    addNotification('Sesión cerrada', 'success');
  };

  const handleForgotPassword = async (email: string) => {
    try { await sendPasswordResetEmail(email); addNotification('Correo enviado.', 'success'); }
    catch (error: any) { addNotification(error.message || 'Error al enviar.', 'error'); throw error; }
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
      if (action === 'Clock In') {
        updates.lastClockInTime = timestamp;
        updates.accumulatedWorkSeconds = 0;
        updates.workSessionStartTime = timestamp;
        if (isElectron && user) enforceRetentionPolicy(user.companyId);
      } else if (action.startsWith('Start ')) {
        const prevStart = employee.workSessionStartTime ?? employee.lastClockInTime ?? employee.currentStatusStartTime ?? timestamp;
        updates.accumulatedWorkSeconds = (employee.accumulatedWorkSeconds ?? 0) + Math.max(0, Math.floor((timestamp - prevStart) / 1000));
        updates.workSessionStartTime = null;
      } else if (action.startsWith('End ')) {
        updates.workSessionStartTime = timestamp;
        updates.accumulatedWorkSeconds = employee.accumulatedWorkSeconds ?? 0;
      } else if (action === 'Clock Out') {
        updates.accumulatedWorkSeconds = null;
        updates.workSessionStartTime = null;
      }
      await updateEmployeeStatus({ ...employee, ...updates });
      if (user && employeeId === user.id) {
        setUser(prev => prev ? { ...prev, ...updates } : prev);
        if (action === 'Clock Out') {
          await handleUserReturned();
          await closeOrphanIdleEntries(user.id);
        }
      }
      addNotification(`${action} registrado`, 'success');
    } catch (error) { addNotification('Error al actualizar estado', 'error'); }
  };

  const handleCreateEntry = async (data: NewLogEntryData) => {
    try {
      const timestamp = new Date(`${data.date}T${data.time}:00`).getTime();
      if (isNaN(timestamp)) throw new Error('Fecha u hora inválida.');
      await addAttendanceLogEntry({ employeeId: data.employeeId, companyId: user?.companyId || '', employeeName: data.employeeName, action: data.action, timestamp, isManual: true, createdBy: user?.id || '' });
      addNotification(`Registro manual creado para ${data.employeeName}`, 'success');
    } catch (error: any) { addNotification(error.message || 'Error al crear el registro.', 'error'); throw error; }
  };

  const handleUpdateLogEntry = async (logId: string, updates: Partial<AttendanceLogEntry>) => {
    try {
      await updateAttendanceLogEntry(logId, updates);
      const logEntry = attendanceLog.find(e => e.id === logId);
      if (logEntry && logEntry.action === 'Clock In' && updates.timestamp) {
        const emp = employees.find(e => e.id === logEntry.employeeId);
        if (emp) await updateEmployeeStatus({ ...emp, lastClockInTime: updates.timestamp, workSessionStartTime: updates.timestamp, accumulatedWorkSeconds: emp.accumulatedWorkSeconds ?? 0 } as any);
      }
      setIsEditActivityLogEntryModalOpen(false);
      addNotification('Registro actualizado.', 'success');
    } catch (error) { addNotification('Error al actualizar.', 'error'); }
  };

  const promptConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmConfig({ title, message, onConfirm: () => { onConfirm(); setIsConfirmModalOpen(false); } });
    setIsConfirmModalOpen(true);
  };

  const handleRemoveLogEntry = (entry: AttendanceLogEntry) => {
    promptConfirm('Eliminar Registro', `¿Eliminar el registro de ${entry.employeeName} (${entry.action})?`, async () => {
      try { await removeAttendanceLogEntry(entry.id); addNotification('Registro eliminado.', 'success'); }
      catch { addNotification('Error al eliminar.', 'error'); }
    });
  };

  const trackerEmployees = useMemo(() => {
    if (!user) return [];
    if (user.role === 'employee') return employees.filter(e => e.id === user.id);
    return employees;
  }, [employees, user]);

  const isAdminOrMaster = user?.role === 'admin' || user?.role === 'master';

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-bright-white gap-4">
      <div className="flex space-x-2">
        <div className="w-4 h-4 rounded-full bg-lucius-lime animate-bounce [animation-delay:-0.3s]" />
        <div className="w-4 h-4 rounded-full bg-lucius-lime animate-bounce [animation-delay:-0.15s]" />
        <div className="w-4 h-4 rounded-full bg-lucius-lime animate-bounce" />
      </div>
      <p className="font-bold animate-pulse text-lucius-lime">Iniciando TeamCheck...</p>
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
        initialInviteCode={urlInviteCode.current || undefined}
        allowCreateAdditional={user.role === 'master' && !!user.companyId}
        onComplete={async () => {
          setTimeout(async () => {
            await refreshUserProfile();
            const companies = await getUserCompanies();
            setUserCompanies(companies);
            setCurrentPage('tracker');
          }, 1000);
        }}
        onCancel={user.companyId ? () => setCurrentPage('tracker') : undefined}
      />
    );
  }

  return (
    <div className="flex h-screen bg-bright-white overflow-hidden font-sans text-bokara-grey">
      <SideNav currentPage={currentPage} onNavigate={setCurrentPage} userRole={user.role} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header
          currentPage={currentPage} onNavigate={setCurrentPage} user={user} userRole={user.role}
          onLogout={handleLogout} onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          notifications={bellNotifications} onNotificationClick={handleBellNotificationClick}
          onQuickAction={handleEmployeeAction} userCompanies={userCompanies} activeCompany={company}
          onSwitchCompany={user.role === 'master' ? handleSwitchCompany : undefined}
          onCreateNewCompany={user.role === 'master' ? handleCreateNewCompany : undefined}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-whisper-white/30 p-4 sm:p-6 lg:p-8 scroll-smooth">

          {currentPage === 'tracker' && (
            <PageErrorBoundary>
              <TrackerPage employees={trackerEmployees} attendanceLog={attendanceLog} onEmployeeAction={handleEmployeeAction} onAddEmployee={() => setIsAddEmployeeModalOpen(true)} onRemoveEmployee={(id) => promptConfirm('Eliminar Colaborador', '¿Estás seguro?', () => removeEmployee(id))} onEditTime={(id) => { const emp = employees.find(e => e.id === id); if (emp) { setEmployeeForTimeEdit(emp); setIsEditTimeModalOpen(true); } }} userRole={user.role} activityStatuses={activityStatuses} workSchedules={workSchedules} onEditEntry={(entry) => { setLogEntryToEdit(entry); setIsEditActivityLogEntryModalOpen(true); }} onRemoveEntry={handleRemoveLogEntry} onCreateEntry={isAdminOrMaster ? handleCreateEntry : undefined} />
            </PageErrorBoundary>
          )}

          {currentPage === 'dashboard' && isAdminOrMaster && (
            <PageErrorBoundary>
              <DashboardPage attendanceLog={attendanceLog} employees={employees} onEmployeeAction={handleEmployeeAction} activityStatuses={activityStatuses} workSchedules={workSchedules} calendarEvents={calendarEvents} payrollChangeTypes={payrollChangeTypes} inviteCode={company?.inviteCode} />
            </PageErrorBoundary>
          )}

          {currentPage === 'timesheet' && isAdminOrMaster && (
            <PageErrorBoundary>
              <TimesheetPage employees={employees} attendanceLog={attendanceLog} activityStatuses={activityStatuses} onEditEntry={(entry) => { setTimesheetEntryToEdit(entry); setIsEditTimesheetModalOpen(true); }} onCreateEntry={handleCreateEntry} />
            </PageErrorBoundary>
          )}

          {currentPage === 'employees' && isAdminOrMaster && (
            <PageErrorBoundary>
              <EmployeesPage employees={employees} onAddEmployee={() => setIsAddEmployeeModalOpen(true)} onEditEmployee={(id) => { const emp = employees.find(e => e.id === id); if (emp) { setEmployeeToEdit(emp); setIsEditEmployeeModalOpen(true); } }} onRemoveEmployee={(id) => promptConfirm('Eliminar Colaborador', '¿Estás seguro?', () => removeEmployee(id))} workSchedules={workSchedules} currentUser={user} inviteCode={company?.inviteCode} />
            </PageErrorBoundary>
          )}

          {currentPage === 'schedule' && (
            <PageErrorBoundary>
              <SchedulePage events={calendarEvents} employees={employees} payrollChangeTypes={payrollChangeTypes} onAddEvent={() => setIsAddEventModalOpen(true)} onEditEvent={(event) => { setEventToEdit(event); setIsEditEventModalOpen(true); }} onRemoveEvent={(event) => promptConfirm('Eliminar Evento', '¿Estás seguro?', async () => { try { await removeCalendarEvent(event.id); setCalendarEvents(prev => prev.filter(e => e.id !== event.id)); addNotification('Evento eliminado', 'success'); } catch { addNotification('Error al eliminar', 'error'); } })} onUpdateEventStatus={async (event, status) => { try { await updateCalendarEvent({ ...event, status }); setCalendarEvents(prev => prev.map(e => e.id === event.id ? { ...e, status } : e)); } catch { addNotification('Error al actualizar estado', 'error'); } }} onBulkImport={async (eventsToCreate) => { const created: CalendarEvent[] = []; for (const ev of eventsToCreate) { const saved = await addCalendarEvent(ev); created.push(saved); } setCalendarEvents(prev => [...prev, ...created]); }} />
            </PageErrorBoundary>
          )}

          {currentPage === 'seating' && (
            <PageErrorBoundary>
              <SeatingPage employees={employees} activityStatuses={activityStatuses} currentUserRole={user.role} />
            </PageErrorBoundary>
          )}

          {currentPage === 'ticketing' && (
            <PageErrorBoundary>
              <TicketingPage events={calendarEvents} currentUser={user} employees={employees} payrollChangeTypes={payrollChangeTypes} onAddRequest={async (req) => { try { const saved = await addCalendarEvent({ ...req, status: 'pending' }); setCalendarEvents(prev => [...prev, saved]); addNotification('Solicitud enviada', 'success'); sendTicketNotification(req); } catch { addNotification('Error al enviar', 'error'); } }} onUpdateRequest={async (evt) => { try { await updateCalendarEvent(evt); setCalendarEvents(prev => prev.map(e => e.id === evt.id ? evt : e)); addNotification('Solicitud actualizada', 'success'); } catch { addNotification('Error al actualizar', 'error'); } }} onRemoveRequest={(evt) => promptConfirm('Borrar Solicitud', '¿Seguro?', async () => { try { await removeCalendarEvent(evt.id); setCalendarEvents(prev => prev.filter(e => e.id !== evt.id)); addNotification('Solicitud borrada', 'success'); } catch { addNotification('Error al borrar', 'error'); } })} onUpdateEventStatus={async (event, status) => { try { await updateCalendarEvent({ ...event, status }); setCalendarEvents(prev => prev.map(e => e.id === event.id ? { ...e, status } : e)); } catch { addNotification('Error al actualizar estado', 'error'); } }} onBulkImport={async (eventsToCreate) => { const created: CalendarEvent[] = []; for (const ev of eventsToCreate) { const saved = await addCalendarEvent(ev); created.push(saved); } setCalendarEvents(prev => [...prev, ...created]); }} />
            </PageErrorBoundary>
          )}

          {currentPage === 'settings' && isAdminOrMaster && (
            <PageErrorBoundary>
              <SettingsPage statuses={activityStatuses} onAddStatus={async (n, c) => { try { const saved = await addActivityStatus(n, c) as ActivityStatus; if (saved) setActivityStatuses(prev => [...prev, saved]); } catch { addNotification('Error al guardar estado', 'error'); } }} onRemoveStatus={async (id) => { try { await removeActivityStatus(id); setActivityStatuses(prev => prev.filter(s => s.id !== id)); } catch { addNotification('Error al eliminar estado', 'error'); } }} payrollChangeTypes={payrollChangeTypes} onAddPayrollChangeType={async (n, c, e, a, quota, semQuota) => { try { const saved = await addPayrollChangeType(n, c, e, a, quota, semQuota) as PayrollChangeType; if (saved) setPayrollChangeTypes(prev => [...prev, saved]); } catch { addNotification('Error al agregar tipo', 'error'); } }} onUpdatePayrollChangeType={async (id, u) => { try { await updatePayrollChangeType(id, u); setPayrollChangeTypes(prev => prev.map(t => t.id === id ? { ...t, ...u } : t)); } catch { addNotification('Error al actualizar tipo', 'error'); } }} onRemovePayrollChangeType={async (id) => { try { await removePayrollChangeType(id); setPayrollChangeTypes(prev => prev.filter(t => t.id !== id)); } catch { addNotification('Error al eliminar tipo', 'error'); } }} workSchedules={workSchedules} onAddWorkSchedule={async (s) => { try { const saved = await addWorkSchedule(s); setWorkSchedules(prev => [...prev, saved]); } catch { addNotification('Error al agregar horario', 'error'); } }} onUpdateWorkSchedule={async (id, u) => { try { await updateWorkSchedule(id, u); setWorkSchedules(prev => prev.map(s => s.id === id ? { ...s, ...u } : s)); } catch { addNotification('Error al actualizar horario', 'error'); } }} onRemoveWorkSchedule={async (id) => { try { await removeWorkSchedule(id); setWorkSchedules(prev => prev.filter(s => s.id !== id)); } catch { addNotification('Error al eliminar horario', 'error'); } }} companyId={user.companyId} inviteCode={company?.inviteCode} companyName={company?.name} currentUserRole={user.role} onCompanyRenamed={(newName) => setCompany(prev => prev ? { ...prev, name: newName } : prev)} />
            </PageErrorBoundary>
          )}

          {currentPage === 'productivity' && isAdminOrMaster && (
            <PageErrorBoundary>
              <ProductivityPage employees={employees} idleLog={idleLog} attendanceLog={attendanceLog} currentUserRole={user.role} />
            </PageErrorBoundary>
          )}

          {currentPage === 'screencasts' && isAdminOrMaster && (
            <PageErrorBoundary>
              <ScreencastsPage employees={employees} companyId={user.companyId} currentUserRole={user.role} currentUser={user} />
            </PageErrorBoundary>
          )}

          {currentPage === 'profile'  && <ProfilePage user={user} onUpdateProfile={refreshUserProfile} />}
          {currentPage === 'calendar' && <CalendarPage events={calendarEvents} currentUser={user} payrollChangeTypes={payrollChangeTypes} />}
          {currentPage === 'password' && <ChangePasswordPage />}

        </main>

        <AddEmployeeModal isOpen={isAddEmployeeModalOpen} onClose={() => setIsAddEmployeeModalOpen(false)} workSchedules={workSchedules} inviteCode={company?.inviteCode} companyName={company?.name} onAddEmployee={async (data) => { try { await addEmployee({ ...data, companyId: user.companyId }); addNotification('Colaborador añadido', 'success'); } catch (e: any) { addNotification(e.message || 'Error', 'error'); throw e; } }} />
        <EditEmployeeModal isOpen={isEditEmployeeModalOpen} onClose={() => setIsEditEmployeeModalOpen(false)} employeeToEdit={employeeToEdit} workSchedules={workSchedules} currentUserRole={user.role} onUpdateEmployee={async (emp) => { try { await updateEmployeeDetails(emp); setIsEditEmployeeModalOpen(false); addNotification('Colaborador actualizado', 'success'); } catch { addNotification('Error', 'error'); } }} />
        <EditTimeModal isOpen={isEditTimeModalOpen} onClose={() => setIsEditTimeModalOpen(false)} employee={employeeForTimeEdit} onSave={async (id, time) => { try { await updateEmployeeCurrentSession(id, time); setIsEditTimeModalOpen(false); addNotification('Hora actualizada', 'success'); } catch { addNotification('Error', 'error'); } }} />
        <EditTimesheetEntryModal isOpen={isEditTimesheetModalOpen} onClose={() => setIsEditTimesheetModalOpen(false)} entry={timesheetEntryToEdit} onSave={async (sid, eid, start, end) => { try { await updateTimesheetEntry(timesheetEntryToEdit!.employeeId, String(sid), String(eid), Number(start), Number(end)); setIsEditTimesheetModalOpen(false); addNotification('Entrada actualizada', 'success'); } catch { addNotification('Error', 'error'); } }} />
        <AddEventModal isOpen={isAddEventModalOpen} onClose={() => setIsAddEventModalOpen(false)} employees={employees} payrollChangeTypes={payrollChangeTypes} onAddEvent={async (data) => { try { const saved = await addCalendarEvent({ ...data }); setCalendarEvents(prev => [...prev, saved]); setIsAddEventModalOpen(false); addNotification('Evento añadido', 'success'); } catch { addNotification('Error', 'error'); } }} />
        <EditEventModal isOpen={isEditEventModalOpen} onClose={() => setIsEditEventModalOpen(false)} eventToEdit={eventToEdit} employees={employees} payrollChangeTypes={payrollChangeTypes} onUpdateEvent={async (data) => { try { await updateCalendarEvent(data); setCalendarEvents(prev => prev.map(e => e.id === data.id ? data : e)); setIsEditEventModalOpen(false); addNotification('Evento actualizado', 'success'); } catch { addNotification('Error', 'error'); } }} />
        <EditActivityLogEntryModal isOpen={isEditActivityLogEntryModalOpen} onClose={() => setIsEditActivityLogEntryModalOpen(false)} entry={logEntryToEdit} activityStatuses={activityStatuses} onSave={handleUpdateLogEntry} />
        <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title={confirmConfig.title} message={confirmConfig.message} onConfirm={confirmConfig.onConfirm} />

        {isAdminOrMaster && (
          <IdleAlertToast
            registerTrigger={(fn) => { idleAlertTriggerRef.current = fn; }}
            onViewProductivity={() => setCurrentPage('productivity')}
          />
        )}

        <UpdateToast />
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