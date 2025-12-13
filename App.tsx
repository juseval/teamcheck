
import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import TrackerPage from './pages/TrackerPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import CalendarPage from './pages/CalendarPage';
import MessagesPage from './pages/MessagesPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import EmployeesPage from './pages/EmployeesPage';
import SchedulePage from './pages/SchedulePage';
import TicketingPage from './pages/TicketingPage';
import SettingsPage from './pages/SettingsPage';
import ChronoLogPage from './pages/ChronoLogPage';
import TimesheetPage from './pages/TimesheetPage';
import AddEmployeeModal from './components/AddEmployeeModal';
import EditEmployeeModal from './components/EditEmployeeModal';
import ConfirmationModal from './components/ConfirmationModal';
import SideNav from './components/SideNav';
import ChatWidget from './components/ChatWidget';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import AddTaskModal from './components/AddTaskModal';
import AddEventModal from './components/AddEventModal';
import EditEventModal from './components/EditEventModal';
import EditTimeModal from './components/EditTimeModal';
import EditTimesheetEntryModal from './components/EditTimesheetEntryModal';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import * as api from './services/apiService';
import { auth, isFirebaseEnabled } from './services/firebase';
import { Employee, AttendanceLogEntry, EmployeeStatus, AttendanceAction, User, TimeEntry, ActivityStatus, Task, TaskStatus, CalendarEvent, PayrollChangeType, WorkSchedule, TimesheetEntry } from './types';

const AppContent: React.FC = () => {
    // --- Auth State ---
  const [authInitialized, setAuthInitialized] = useState(false);
  const [authPage, setAuthPage] = useState<'home' | 'login' | 'register'>('home');
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isOfflineMode] = useState(!isFirebaseEnabled);
  const [resetParams, setResetParams] = useState<{ oobCode: string } | null>(null);
  const { addNotification } = useNotification();

  const [currentPage, setCurrentPage] = useState('tracker');
  const [attendanceLog, setAttendanceLog] = useState<AttendanceLogEntry[]>([]);
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activityStatuses, setActivityStatuses] = useState<ActivityStatus[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [payrollChangeTypes, setPayrollChangeTypes] = useState<PayrollChangeType[]>([]);
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  
  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [taskStatusForModal, setTaskStatusForModal] = useState<TaskStatus | null>(null);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
  const [isEditTimeModalOpen, setIsEditTimeModalOpen] = useState(false);
  const [employeeToEditTime, setEmployeeToEditTime] = useState<Employee | null>(null);
  const [isEditTimesheetModalOpen, setIsEditTimesheetModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<TimesheetEntry | null>(null);


  // Generic Confirmation Modal State
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [loggedInUser, setLoggedInUser] = useState<Employee | null>(null);
  const isAuthenticated = !!loggedInUser;
  // Use ID for effect dependencies to avoid object reference flicker
  const currentUserId = loggedInUser?.id;

  // --- Auth & Data Management ---
  useEffect(() => {
    // Check for password reset URL params
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    
    if (mode === 'resetPassword' && oobCode) {
        setResetParams({ oobCode });
        // Clean URL to avoid re-triggering on refresh if we wanted, but keeping it helps state persistence in simple implementation
    }

    if (auth) {
        return auth.onAuthStateChanged(async (user) => {
            if (user) {
                const profile = await api.getEmployeeProfile(user.uid);
                if (profile) {
                    setLoggedInUser(profile);
                } else {
                    addNotification("Could not find employee profile. Logging out.", 'error');
                    await api.logout();
                }
            } else {
                setLoggedInUser(null);
                // Clear all data on logout
                setEmployees([]);
                setAttendanceLog([]);
            }
            if (!authInitialized) setAuthInitialized(true);
        });
    } else {
        // Handle offline mode or Firebase not initialized
        if (!authInitialized) setAuthInitialized(true);
    }
  }, [authInitialized, addNotification]);
  
  useEffect(() => {
    if (isAuthenticated && currentUserId) {
        let unsubscribeEmployees = () => {};
        let unsubscribeLogs = () => {};

        const initializeAppData = async () => {
            setIsDataLoading(true);

            // Setup real-time listeners
            unsubscribeEmployees = api.streamEmployees((employeesData) => {
                setEmployees(employeesData);
                // Keep the loggedInUser's data fresh if an admin makes changes to their profile.
                setLoggedInUser(currentLoggedInUser => {
                    if (currentLoggedInUser) {
                        const updatedUserData = employeesData.find(e => e.id === currentLoggedInUser.id);
                        return updatedUserData || null;
                    }
                    return null;
                });
            });
            
            unsubscribeLogs = api.streamAttendanceLog(setAttendanceLog);

            // Fetch other static data
            try {
                const [statusesData, tasksData, eventsData, payrollTypesData, schedulesData] = await Promise.all([
                    api.getActivityStatuses(),
                    api.getTasks(),
                    api.getCalendarEvents(),
                    api.getPayrollChangeTypes(),
                    api.getWorkSchedules(),
                ]);
                setActivityStatuses(statusesData);
                setTasks(tasksData);
                setCalendarEvents(eventsData);
                setPayrollChangeTypes(payrollTypesData);
                setWorkSchedules(schedulesData);
            } catch (error) {
                console.error("Failed to fetch static data:", error);
                 addNotification("Failed to load app settings. Check console.", 'error');
            } finally {
                setIsDataLoading(false);
            }
        };

        initializeAppData();
        
        return () => {
            unsubscribeEmployees();
            unsubscribeLogs();
        };
    } else {
        setIsDataLoading(false);
    }
}, [isAuthenticated, currentUserId, addNotification]);


  // Robustly determine role, handling potential case sensitivity issues from data
  const userRole: 'admin' | 'employee' = (loggedInUser?.role && loggedInUser.role.toLowerCase() === 'admin') ? 'admin' : 'employee';

  // --- Auth Handlers ---
  const handleLogin = async (credentials: { email: string; password: string; }) => {
    try {
        const userProfile = await api.loginWithEmailAndPassword(credentials.email, credentials.password);
        
        // In offline/mock mode, auth.onAuthStateChanged does not fire.
        // We must manually set the logged in user here.
        if (!auth) {
            setLoggedInUser(userProfile);
        }

        // Navigate based on role (using the fresh profile role)
        const role = (userProfile.role && userProfile.role.toLowerCase() === 'admin') ? 'admin' : 'employee';
        setCurrentPage(role === 'admin' ? 'dashboard' : 'tracker');
    } catch (error: any) {
        console.error("Login failed in App.tsx", error);
        addNotification(error.message || "Invalid credentials. Please try again.", 'error');
        throw error;
    }
  };
  
  const handleRegister = async (data: { fullName: string; email: string; password: string; }) => {
    try {
        await api.registerWithEmailAndPassword(data.fullName, data.email, data.password);
        // On success, onAuthStateChanged will eventually log the user in.
        // The register page will navigate to the login page.
    } catch (error: any) {
        console.error("Registration failed in App.tsx", error);
        addNotification(error.message || 'Registration failed. The email might be in use.', 'error');
        throw error; // Re-throw to be caught in RegisterPage for UI feedback
    }
  };

  const handleLogout = async () => {
    try {
        await api.logout();
        if (!auth) {
            setLoggedInUser(null);
        }
        setAuthPage('home');
        setCurrentPage('tracker'); // Reset to default page
    } catch (error: any) {
        addNotification(error.message || 'Logout failed.', 'error');
    }
  };

  const handleForgotPassword = async (email: string) => {
      try {
          await api.sendPasswordResetEmail(email);
          if (isOfflineMode) {
             addNotification(`[Modo Demo] Simulación: Correo enviado a ${email}`, 'success');
          } else {
             addNotification(`Se enviaron instrucciones a ${email}. Revise su carpeta de Spam.`, 'success');
          }
      } catch (error: any) {
          console.error("Password reset failed:", error);
          addNotification(error.message || "Error al enviar el correo. Verifique su conexión.", 'error');
      }
  };

  // ... rest of the component handlers ...
  const userForProfile: User = {
    name: loggedInUser?.name || 'Loading...',
    messages: 0,
  };

  const handleNavigation = (page: string) => {
    const allowedPagesForEmployee = ['tracker', 'chronolog', 'profile', 'calendar', 'messages', 'password', 'ticketing'];
    if (userRole === 'employee' && !allowedPagesForEmployee.includes(page)) {
      setCurrentPage('tracker');
    } else {
      setCurrentPage(page);
    }
  };
  
  const timeEntriesForChronoLog = useMemo((): TimeEntry[] => {
    const currentUser = userRole === 'admin' ? (employees.length > 0 ? employees[0] : null) : loggedInUser;
    if (!currentUser) return [];

    const userLog = attendanceLog
      .filter(log => log.employeeId === currentUser.id)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    const entries: TimeEntry[] = [];
    let lastLog: AttendanceLogEntry | null = null;

    for (const currentLog of userLog) {
      if (lastLog) {
        const duration = Math.round((currentLog.timestamp - lastLog.timestamp) / 1000);
        if (duration > 0) {
            let activity = 'Working'; // Default activity
            if (lastLog.action.startsWith('Start ')) {
                activity = lastLog.action.substring(6);
            }
            
            entries.push({
                id: lastLog.id,
                activity: activity,
                startTime: lastLog.timestamp,
                endTime: currentLog.timestamp,
                duration: duration
            });
        }
      }

      if (currentLog.action === 'Clock Out') {
        lastLog = null; // Session ends
      } else {
        lastLog = currentLog; // Start of a new interval
      }
    }
    
    return entries.reverse(); // Show most recent first
  }, [attendanceLog, loggedInUser, userRole, employees]);

  const handleAddEmployee = async (employeeData: Omit<Employee, 'id' | 'status' | 'lastClockInTime' | 'currentStatusStartTime' | 'uid'>) => {
    await api.addEmployee(employeeData);
    setIsAddModalOpen(false);
  };
  
  const handleUpdateEmployee = async (employeeData: Employee) => {
    await api.updateEmployeeDetails(employeeData);
    setIsEditModalOpen(false);
    setEmployeeToEdit(null);
  };

  const openEditEmployeeModal = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      setEmployeeToEdit(employee);
      setIsEditModalOpen(true);
    }
  };
  
  const handleCloseConfirmation = () => {
    setConfirmation({ ...confirmation, isOpen: false });
  };

  const promptRemoveEmployee = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee && employee.status !== 'Clocked Out') {
      addNotification("Cannot remove an employee who has not clocked out.", 'error');
      return;
    }
    if (employee) {
       setConfirmation({
        isOpen: true,
        title: 'Confirm Removal',
        message: `Are you sure you want to remove ${employee.name}? This action cannot be undone.`,
        onConfirm: () => handleConfirmRemoveEmployee(employee.id),
      });
    }
  };

  const handleConfirmRemoveEmployee = async (employeeId: string) => {
    await api.removeEmployee(employeeId);
    handleCloseConfirmation();
  };
  
  const handleEmployeeAction = async (employeeId: string, action: AttendanceAction) => {
    const now = Date.now();
    let newStatus: EmployeeStatus = 'Clocked Out';

    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    if (action.startsWith('Start ')) {
        newStatus = action.substring(6); // e.g., "Start Break" -> "Break"
    } else if (action.startsWith('End ')) {
        newStatus = 'Working';
    } else if (action === 'Clock In') {
        newStatus = 'Working';
    } else if (action === 'Clock Out') {
        newStatus = 'Clocked Out';
    }
    
    const updatedEmpData = { ...employee, status: newStatus, currentStatusStartTime: now };
    if (action === 'Clock In') {
        updatedEmpData.lastClockInTime = now;
    }
    if (action === 'Clock Out') {
        updatedEmpData.lastClockInTime = null;
        updatedEmpData.currentStatusStartTime = null;
    }
    
    await Promise.all([
      api.updateEmployeeStatus(updatedEmpData),
      api.addAttendanceLogEntry({
        employeeId,
        employeeName: employee.name,
        action: action,
        timestamp: now,
      })
    ]);
  };
  
  const openEditTimeModal = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee && employee.status !== 'Clocked Out') {
        setEmployeeToEditTime(employee);
        setIsEditTimeModalOpen(true);
    }
  };

  const handleUpdateTime = async (employeeId: string, newStartTime: number) => {
      try {
          await api.updateEmployeeCurrentSession(employeeId, newStartTime);
          setIsEditTimeModalOpen(false);
          setEmployeeToEditTime(null);
      } catch (error) {
          console.error("Failed to update time entry:", error);
          addNotification("Error: Could not update the session time.", 'error');
      }
  };

  const openEditTimesheetModal = (entry: TimesheetEntry) => {
    setEntryToEdit(entry);
    setIsEditTimesheetModalOpen(true);
  };
  
  const handleUpdateTimesheetEntry = async (startLogId: string, endLogId: string, newStartTime: number, newEndTime: number) => {
    if (!entryToEdit) return;
    try {
      await api.updateTimesheetEntry(entryToEdit.employeeId, startLogId, endLogId, newStartTime, newEndTime);
      setIsEditTimesheetModalOpen(false);
      setEntryToEdit(null);

    } catch (error: any) {
        console.error("Failed to update timesheet entry:", error);
        addNotification(`Error: ${error.message}`, 'error');
    }
  };


  const handleAddStatus = async (name: string, color: string) => {
      const newStatus = await api.addActivityStatus(name, color);
      setActivityStatuses(prev => [...prev, newStatus]);
  }

  const handleRemoveStatus = async (id: string) => {
      await api.removeActivityStatus(id);
      setActivityStatuses(prev => prev.filter(status => status.id !== id));
  }
  
  const handleAddPayrollChangeType = async (name: string, color: string, isExclusive: boolean, adminOnly: boolean) => {
    const newType = await api.addPayrollChangeType(name, color, isExclusive, adminOnly);
    setPayrollChangeTypes(prev => [...prev, newType]);
  };

  const handleUpdatePayrollChangeType = async (id: string, updates: Partial<Omit<PayrollChangeType, 'id'>>) => {
    const updatedType = await api.updatePayrollChangeType(id, updates);
    setPayrollChangeTypes(prev => prev.map(t => t.id === id ? updatedType : t));
  };

  const handleRemovePayrollChangeType = async (id: string) => {
      await api.removePayrollChangeType(id);
      setPayrollChangeTypes(prev => prev.filter(type => type.id !== id));
  };

  const handleAddWorkSchedule = async (scheduleData: Omit<WorkSchedule, 'id'>) => {
    const newSchedule = await api.addWorkSchedule(scheduleData);
    setWorkSchedules(prev => [...prev, newSchedule]);
  };

  const handleUpdateWorkSchedule = async (id: string, updates: Partial<Omit<WorkSchedule, 'id'>>) => {
    const updatedSchedule = await api.updateWorkSchedule(id, updates);
    setWorkSchedules(prev => prev.map(s => s.id === id ? updatedSchedule : s));
  };

  const handleRemoveWorkSchedule = async (id: string) => {
    await api.removeWorkSchedule(id);
    setWorkSchedules(prev => prev.filter(s => s.id !== id));
  };
  
  const openAddTaskModal = (status: TaskStatus) => {
    setTaskStatusForModal(status);
    setIsAddTaskModalOpen(true);
  };

  const handleAddTask = async (taskData: Omit<Task, 'id'>) => {
    const newTask = await api.addTask(taskData);
    setTasks(prev => [...prev, newTask]);
    setIsAddTaskModalOpen(false);
    setTaskStatusForModal(null);
  };
  
  const handleAddEvent = async (eventData: Omit<CalendarEvent, 'id'>) => {
    const employeeName = employees.find(e => e.id === eventData.employeeId)?.name || 'This employee';
    const newEventStart = new Date(eventData.startDate + 'T00:00:00').getTime();
    const newEventEnd = new Date(eventData.endDate + 'T23:59:59').getTime();
    
    const hasConflict = calendarEvents.some(event => {
        if (event.employeeId !== eventData.employeeId) return false;
        if (event.status === 'rejected') return false; 
        
        const existingStart = new Date(event.startDate + 'T00:00:00').getTime();
        const existingEnd = new Date(event.endDate + 'T23:59:59').getTime();
        return newEventStart <= existingEnd && newEventEnd >= existingStart;
    });

    if (hasConflict) {
        addNotification(`${employeeName} already has a calendar event during this time.`, 'error');
        return;
    }

    const newEvent = await api.addCalendarEvent(eventData);
    setCalendarEvents(prev => [...prev, newEvent]);
    setIsAddEventModalOpen(false);
  };

  const handleAddRequest = async (requestData: Omit<CalendarEvent, 'id' | 'status'>) => {
      const newEvent = await api.addCalendarEvent({
          ...requestData,
          status: 'pending' // Requests start as pending
      });
      setCalendarEvents(prev => [...prev, newEvent]);
      addNotification("Solicitud enviada exitosamente. Pendiente de aprobación.", 'success');
  };
  
  const handleUpdateCalendarEvent = async (eventData: CalendarEvent) => {
    const updatedEvent = await api.updateCalendarEvent(eventData);
    setCalendarEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    setIsEditEventModalOpen(false);
    setEventToEdit(null);
  };
  
  const handleUpdateEventStatus = async (event: CalendarEvent, status: 'approved' | 'rejected') => {
      const updatedEvent = { ...event, status };
      await api.updateCalendarEvent(updatedEvent);
      setCalendarEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
      addNotification(`Solicitud ${status === 'approved' ? 'aprobada' : 'rechazada'}.`, 'success');
  };

  const openEditCalendarEventModal = (event: CalendarEvent) => {
    setEventToEdit(event);
    setIsEditEventModalOpen(true);
  };
  
  const promptRemoveCalendarEvent = (event: CalendarEvent) => {
    const employeeName = employees.find(e => e.id === event.employeeId)?.name || 'unknown employee';
    setConfirmation({
        isOpen: true,
        title: 'Confirm Event Deletion',
        message: `Are you sure you want to delete the event "${event.type}" for ${employeeName} from ${event.startDate} to ${event.endDate}?`,
        onConfirm: () => handleConfirmRemoveCalendarEvent(event.id),
    });
  };

  const handleConfirmRemoveCalendarEvent = async (eventId: string) => {
    await api.removeCalendarEvent(eventId);
    setCalendarEvents(prev => prev.filter(e => e.id !== eventId));
    handleCloseConfirmation();
  };

  const renderPage = () => {
    const employeeDataForPage = userRole === 'employee' ? employees.filter(e => e.id === loggedInUser?.id) : employees;
    
    const allowedPagesForEmployee = ['tracker', 'chronolog', 'profile', 'calendar', 'messages', 'password', 'ticketing'];
    let pageToRender = currentPage;
    if (userRole === 'employee' && !allowedPagesForEmployee.includes(currentPage)) {
        pageToRender = 'tracker';
    }

    switch (pageToRender) {
      case 'tracker':
        return <TrackerPage 
          employees={employeeDataForPage}
          attendanceLog={attendanceLog}
          onEmployeeAction={handleEmployeeAction}
          onAddEmployee={() => setIsAddModalOpen(true)}
          onRemoveEmployee={promptRemoveEmployee}
          onEditTime={openEditTimeModal}
          userRole={userRole}
          activityStatuses={activityStatuses}
          workSchedules={workSchedules}
        />;
      case 'dashboard':
        return <DashboardPage 
                  attendanceLog={attendanceLog} 
                  employees={employees}
                  onEmployeeAction={handleEmployeeAction}
                  activityStatuses={activityStatuses}
                  workSchedules={workSchedules}
                  calendarEvents={calendarEvents}
                />;
       case 'timesheet':
        return <TimesheetPage 
            employees={employees} 
            attendanceLog={attendanceLog} 
            activityStatuses={activityStatuses} 
            onEditEntry={openEditTimesheetModal}
        />;
      case 'chronolog':
        return <ChronoLogPage timeEntries={timeEntriesForChronoLog} />;
      case 'employees':
        return <EmployeesPage 
            employees={employees}
            onAddEmployee={() => setIsAddModalOpen(true)}
            onEditEmployee={openEditEmployeeModal}
            onRemoveEmployee={promptRemoveEmployee}
            workSchedules={workSchedules}
        />;
      case 'schedule':
        return <SchedulePage 
                  events={calendarEvents} 
                  employees={employees}
                  payrollChangeTypes={payrollChangeTypes}
                  onAddEvent={() => setIsAddEventModalOpen(true)}
                  onEditEvent={openEditCalendarEventModal}
                  onRemoveEvent={promptRemoveCalendarEvent}
                  onUpdateEventStatus={handleUpdateEventStatus}
                />;
      case 'ticketing':
        return loggedInUser ? (
            <TicketingPage 
                events={calendarEvents}
                currentUser={loggedInUser}
                payrollChangeTypes={payrollChangeTypes}
                onAddRequest={handleAddRequest}
            />
        ) : null;
      case 'settings':
        return <SettingsPage 
                    statuses={activityStatuses} 
                    onAddStatus={handleAddStatus} 
                    onRemoveStatus={handleRemoveStatus}
                    payrollChangeTypes={payrollChangeTypes}
                    onAddPayrollChangeType={handleAddPayrollChangeType}
                    onUpdatePayrollChangeType={handleUpdatePayrollChangeType}
                    onRemovePayrollChangeType={handleRemovePayrollChangeType}
                    workSchedules={workSchedules}
                    onAddWorkSchedule={handleAddWorkSchedule}
                    onUpdateWorkSchedule={handleUpdateWorkSchedule}
                    onRemoveWorkSchedule={handleRemoveWorkSchedule}
                />;
      case 'profile':
        return <ProfilePage />;
      case 'calendar':
        return <CalendarPage />;
      case 'messages':
        return <MessagesPage />;
      case 'password':
        return <ChangePasswordPage />;
      default:
        return <TrackerPage 
          employees={employeeDataForPage}
          attendanceLog={attendanceLog}
          onEmployeeAction={handleEmployeeAction}
          onAddEmployee={() => setIsAddModalOpen(true)}
          onRemoveEmployee={promptRemoveEmployee}
          onEditTime={openEditTimeModal}
          userRole={userRole}
          activityStatuses={activityStatuses}
          workSchedules={workSchedules}
        />;
    }
  };

  // --- Early Returns for Loading/Reset Password ---

  if (resetParams) {
      return (
        <ResetPasswordPage 
            oobCode={resetParams.oobCode} 
            onNavigateToLogin={() => {
                setResetParams(null);
                setAuthPage('login');
                // Remove query params from URL without refreshing
                window.history.replaceState({}, document.title, window.location.pathname);
            }} 
        />
      );
  }

  if (!authInitialized || (isAuthenticated && isDataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bright-white">
        <div className="text-center flex flex-col items-center gap-4">
            <h2 className="text-2xl font-semibold text-bokara-grey">Loading your workspace...</h2>
            <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-lucius-lime animate-pulse delay-75"></div>
                <div className="w-4 h-4 rounded-full bg-lucius-lime animate-pulse delay-150"></div>
                <div className="w-4 h-4 rounded-full bg-lucius-lime animate-pulse delay-300"></div>
            </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authPage === 'login') {
      return <LoginPage 
                onLogin={handleLogin} 
                onNavigateToRegister={() => setAuthPage('register')} 
                onNavigateToHome={() => setAuthPage('home')} 
                onForgotPassword={handleForgotPassword}
             />;
    }
    if (authPage === 'register') {
      return <RegisterPage onRegister={handleRegister} onNavigateToLogin={() => setAuthPage('login')} onNavigateToHome={() => setAuthPage('home')} />;
    }
    return <HomePage onNavigateToLogin={() => setAuthPage('login')} onNavigateToRegister={() => setAuthPage('register')} />;
  }

  return (
    <div className="bg-bright-white h-screen w-full flex overflow-hidden text-bokara-grey font-sans">
      {/* SideNav is fixed height now due to parent h-screen */}
      <SideNav currentPage={currentPage} onNavigate={handleNavigation} userRole={userRole} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header 
          currentPage={currentPage} 
          onNavigate={handleNavigation}
          user={userForProfile}
          userRole={userRole}
          onLogout={handleLogout}
        />
        
        {isOfflineMode && (
          <div className="bg-amber-100 border-b-2 border-amber-300 text-amber-800 text-center p-2 text-sm font-semibold flex-shrink-0 z-10">
              Running in offline mode. Data is mocked and will not be saved.
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {renderPage()}
        </main>
      </div>

      <AddEmployeeModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddEmployee={handleAddEmployee}
        workSchedules={workSchedules}
      />
       <EditEmployeeModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEmployeeToEdit(null);
        }}
        onUpdateEmployee={handleUpdateEmployee}
        employeeToEdit={employeeToEdit}
        workSchedules={workSchedules}
      />
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => {
            setIsAddTaskModalOpen(false);
            setTaskStatusForModal(null);
        }}
        onAddTask={handleAddTask}
        employees={employees}
        initialStatus={taskStatusForModal}
      />
      <AddEventModal
        isOpen={isAddEventModalOpen}
        onClose={() => setIsAddEventModalOpen(false)}
        onAddEvent={handleAddEvent}
        employees={employees}
        payrollChangeTypes={payrollChangeTypes}
      />
       <EditEventModal
        isOpen={isEditEventModalOpen}
        onClose={() => {
            setIsEditEventModalOpen(false);
            setEventToEdit(null);
        }}
        onUpdateEvent={handleUpdateCalendarEvent}
        eventToEdit={eventToEdit}
        employees={employees}
        payrollChangeTypes={payrollChangeTypes}
      />
      <EditTimeModal
        isOpen={isEditTimeModalOpen}
        onClose={() => {
            setIsEditTimeModalOpen(false);
            setEmployeeToEditTime(null);
        }}
        onSave={handleUpdateTime}
        employee={employeeToEditTime}
      />
       <EditTimesheetEntryModal
        isOpen={isEditTimesheetModalOpen}
        onClose={() => {
            setIsEditTimesheetModalOpen(false);
            setEntryToEdit(null);
        }}
        onSave={handleUpdateTimesheetEntry}
        entry={entryToEdit}
      />
      <ConfirmationModal
        isOpen={confirmation.isOpen}
        onClose={handleCloseConfirmation}
        onConfirm={confirmation.onConfirm}
        title={confirmation.title}
        message={confirmation.message}
      />
      <ChatWidget 
        employees={employees} 
        currentUser={userForProfile} 
        userRole={userRole}
      />
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
