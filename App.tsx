import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header.tsx';
import TrackerPage from './pages/TrackerPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import CalendarPage from './pages/CalendarPage.tsx';
import MessagesPage from './pages/MessagesPage.tsx';
import ChangePasswordPage from './pages/ChangePasswordPage.tsx';
import EmployeesPage from './pages/EmployeesPage.tsx';
import SchedulePage from './pages/SchedulePage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import ChronoLogPage from './pages/ChronoLogPage.tsx';
import TimesheetPage from './pages/TimesheetPage.tsx';
import ActivityLogPage from './pages/ActivityLogPage.tsx';
import AddEmployeeModal from './components/AddEmployeeModal.tsx';
import EditEmployeeModal from './components/EditEmployeeModal.tsx';
import ConfirmationModal from './components/ConfirmationModal.tsx';
import SideNav from './components/SideNav.tsx';
import ChatWidget from './components/ChatWidget.tsx';
import LoginPage from './pages/LoginPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';
import HomePage from './pages/HomePage.tsx';
import AddTaskModal from './components/AddTaskModal.tsx';
import AddEventModal from './components/AddEventModal.tsx';
import EditEventModal from './components/EditEventModal.tsx';
import EditTimeModal from './components/EditTimeModal.tsx';
import EditTimesheetEntryModal from './components/EditTimesheetEntryModal.tsx';
import EditActivityLogEntryModal from './components/EditActivityLogEntryModal.tsx';
import * as api from './services/apiService.ts';
import { Employee, AttendanceLogEntry, EmployeeStatus, AttendanceAction, User, TimeEntry, ActivityStatus, Task, TaskStatus, CalendarEvent, PayrollChangeType, WorkSchedule, TimesheetEntry } from './types.ts';

const App: React.FC = () => {
  // --- Auth State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authPage, setAuthPage] = useState<'home' | 'login' | 'register'>('home');
  const [isLoading, setIsLoading] = useState(true);

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
  const [isEditLogEntryModalOpen, setIsEditLogEntryModalOpen] = useState(false);
  const [logEntryToEdit, setLogEntryToEdit] = useState<AttendanceLogEntry | null>(null);


  // Generic Confirmation Modal State
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [userRole, setUserRole] = useState<'admin' | 'employee'>('admin');
  const [loggedInUser, setLoggedInUser] = useState<Employee | null>(null);

  // --- Data Fetching ---
  useEffect(() => {
    // Simulate checking auth status on page load
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const [employeesData, logData, statusesData, tasksData, eventsData, payrollTypesData, schedulesData] = await Promise.all([
            api.getEmployees(),
            api.getAttendanceLog(),
            api.getActivityStatuses(),
            api.getTasks(),
            api.getCalendarEvents(),
            api.getPayrollChangeTypes(),
            api.getWorkSchedules(),
          ]);
          setEmployees(employeesData);
          setAttendanceLog(logData);
          setActivityStatuses(statusesData);
          setTasks(tasksData);
          setCalendarEvents(eventsData);
          setPayrollChangeTypes(payrollTypesData);
          setWorkSchedules(schedulesData);
          if (employeesData.length > 0) {
            setLoggedInUser(employeesData[0]); // Set demo logged-in user
          }
        } catch (error) {
          console.error("Failed to fetch initial data:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [isAuthenticated]);


  // --- Auth Handlers ---
  const handleLogin = async () => {
    // In a real app, this would get credentials from the login form state
    const result = await api.login('demo@teamcheck.com', 'password123');
    if (result.success) {
      setIsAuthenticated(true);
      setCurrentPage('tracker');
    } else {
      alert("Login failed!"); // Placeholder for real error handling
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthPage('home');
  };

  const handleToggleRole = () => {
    const newRole = userRole === 'admin' ? 'employee' : 'admin';
    setUserRole(newRole);
    if (newRole === 'employee') {
      setCurrentPage('tracker');
    } else {
      setCurrentPage('dashboard');
    }
  };

  const userForProfile: User = {
    name: userRole === 'admin' ? 'Juan Sebastian' : loggedInUser?.name || 'Employee',
    messages: 0,
  };

  const handleNavigation = (page: string) => {
    const allowedPagesForEmployee = ['tracker', 'chronolog', 'profile', 'calendar', 'messages', 'password'];
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

  const handleAddEmployee = async (employeeData: Omit<Employee, 'id' | 'status' | 'lastClockInTime' | 'currentStatusStartTime'>) => {
    const newEmployee = await api.addEmployee(employeeData);
    setEmployees(prev => [...prev, newEmployee]);
    setIsAddModalOpen(false);
  };
  
  const handleUpdateEmployee = async (employeeData: Employee) => {
    const updatedEmployee = await api.updateEmployeeDetails(employeeData);
    setEmployees(prev => prev.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp));
    setIsEditModalOpen(false);
    setEmployeeToEdit(null);
  };

  const openEditEmployeeModal = (employeeId: number) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      setEmployeeToEdit(employee);
      setIsEditModalOpen(true);
    }
  };
  
  const handleCloseConfirmation = () => {
    setConfirmation({ ...confirmation, isOpen: false });
  };

  const promptRemoveEmployee = (employeeId: number) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee && employee.status !== 'Clocked Out') {
      alert("No se puede eliminar un empleado que no ha registrado su salida.");
      return;
    }
    if (employee) {
       setConfirmation({
        isOpen: true,
        title: 'Confirmar Eliminación',
        message: `¿Estás seguro de que quieres eliminar a ${employee.name}? Esta acción no se puede deshacer.`,
        onConfirm: () => handleConfirmRemoveEmployee(employee.id),
      });
    }
  };

  const handleConfirmRemoveEmployee = async (employeeId: number) => {
    await api.removeEmployee(employeeId);
    setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
    handleCloseConfirmation();
  };
  
  const handleEmployeeAction = async (employeeId: number, action: AttendanceAction) => {
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
    
    const [updatedEmployee, newLogEntry] = await Promise.all([
      api.updateEmployeeStatus(updatedEmpData),
      api.addAttendanceLogEntry({
        employeeId,
        employeeName: employee.name,
        action: action,
        timestamp: now,
      })
    ]);

    setEmployees(prevEmployees =>
      prevEmployees.map(emp => (emp.id === updatedEmployee.id ? updatedEmployee : emp))
    );
    setAttendanceLog(prevLog => [newLogEntry, ...prevLog]);
  };
  
  const openEditTimeModal = (employeeId: number) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee && employee.status !== 'Clocked Out') {
        setEmployeeToEditTime(employee);
        setIsEditTimeModalOpen(true);
    }
  };

  const handleUpdateTime = async (employeeId: number, newStartTime: number) => {
      try {
          const { updatedEmployee, updatedLog } = await api.updateEmployeeCurrentSession(employeeId, newStartTime);
          
          setEmployees(prev => prev.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp));
          setAttendanceLog(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log));

          setIsEditTimeModalOpen(false);
          setEmployeeToEditTime(null);
      } catch (error) {
          console.error("Failed to update time entry:", error);
          alert("Error: Could not update the session time. See console for details.");
      }
  };

  const openEditTimesheetModal = (entry: TimesheetEntry) => {
    setEntryToEdit(entry);
    setIsEditTimesheetModalOpen(true);
  };
  
  const openEditLogEntryModal = (entry: AttendanceLogEntry) => {
    setLogEntryToEdit(entry);
    setIsEditLogEntryModalOpen(true);
  };

  const handleUpdateLogEntry = async (logId: number, updates: { action: string, timestamp: number }) => {
    try {
        const updatedLog = await api.updateAttendanceLogEntry(logId, updates);
        setAttendanceLog(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log));
        setIsEditLogEntryModalOpen(false);
        setLogEntryToEdit(null);
    } catch (error) {
        console.error("Failed to update log entry:", error);
        alert("Error: Could not update the log entry. See console for details.");
    }
  };


  const handleUpdateTimesheetEntry = async (startLogId: number, endLogId: number, newStartTime: number, newEndTime: number) => {
    if (!entryToEdit) return;
    try {
      const { updatedLogs } = await api.updateTimesheetEntry(entryToEdit.employeeId, startLogId, endLogId, newStartTime, newEndTime);
      
      setAttendanceLog(prevLogs => {
        const newLogs = [...prevLogs];
        updatedLogs.forEach(updatedLog => {
            const index = newLogs.findIndex(l => l.id === updatedLog.id);
            if (index !== -1) {
                newLogs[index] = updatedLog;
            }
        });
        return newLogs;
      });
      
      setIsEditTimesheetModalOpen(false);
      setEntryToEdit(null);

    } catch (error: any) {
        console.error("Failed to update timesheet entry:", error);
        alert(`Error: ${error.message}`);
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
  
  const handleAddPayrollChangeType = async (name: string, color: string) => {
    const newType = await api.addPayrollChangeType(name, color);
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
    // FIX: Corrected typo `t` to `s`
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
        const existingStart = new Date(event.startDate + 'T00:00:00').getTime();
        const existingEnd = new Date(event.endDate + 'T23:59:59').getTime();
        // Check for overlap
        return newEventStart <= existingEnd && newEventEnd >= existingStart;
    });

    if (hasConflict) {
        alert(`${employeeName} already has a calendar event during this time. Please check the dates.`);
        return;
    }

    const newEvent = await api.addCalendarEvent(eventData);
    setCalendarEvents(prev => [...prev, newEvent]);
    setIsAddEventModalOpen(false);
  };
  
  const handleUpdateCalendarEvent = async (eventData: CalendarEvent) => {
    const updatedEvent = await api.updateCalendarEvent(eventData);
    setCalendarEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    setIsEditEventModalOpen(false);
    setEventToEdit(null);
  };

  const openEditCalendarEventModal = (event: CalendarEvent) => {
    setEventToEdit(event);
    setIsEditEventModalOpen(true);
  };
  
  const promptRemoveCalendarEvent = (event: CalendarEvent) => {
    const employeeName = employees.find(e => e.id === event.employeeId)?.name || 'empleado desconocido';
    setConfirmation({
        isOpen: true,
        title: 'Confirmar Eliminación de Novedad',
        message: `¿Estás seguro de que quieres eliminar la novedad "${event.type}" para ${employeeName} del ${event.startDate} al ${event.endDate}?`,
        onConfirm: () => handleConfirmRemoveCalendarEvent(event.id),
    });
  };

  const handleConfirmRemoveCalendarEvent = async (eventId: number) => {
    await api.removeCalendarEvent(eventId);
    setCalendarEvents(prev => prev.filter(e => e.id !== eventId));
    handleCloseConfirmation();
  };

  const renderPage = () => {
    if (!loggedInUser && isAuthenticated) return null; // Or some other placeholder
    
    const employeeDataForPage = userRole === 'employee' ? employees.filter(e => e.id === loggedInUser?.id) : employees;
    const employeeLogForPage = userRole === 'employee' ? attendanceLog.filter(log => log.employeeId === loggedInUser?.id) : attendanceLog;
    
    const allowedPagesForEmployee = ['tracker', 'chronolog', 'profile', 'calendar', 'messages', 'password'];
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
      case 'activitylog':
        return <ActivityLogPage
            attendanceLog={attendanceLog}
            onEditEntry={openEditLogEntryModal}
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
                />;
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

  if (!isAuthenticated) {
    if (authPage === 'login') {
      return <LoginPage onLogin={handleLogin} onNavigateToRegister={() => setAuthPage('register')} onNavigateToHome={() => setAuthPage('home')} />;
    }
    if (authPage === 'register') {
      return <RegisterPage onNavigateToLogin={() => setAuthPage('login')} onNavigateToHome={() => setAuthPage('home')} />;
    }
    return <HomePage onNavigateToLogin={() => setAuthPage('login')} onNavigateToRegister={() => setAuthPage('register')} />;
  }

  if (isLoading) {
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

  return (
    <div className="bg-bright-white min-h-screen text-bokara-grey font-sans">
      <div className="flex">
        {userRole === 'admin' && <SideNav currentPage={currentPage} onNavigate={handleNavigation} />}
        <div className="flex-1 flex flex-col min-w-0">
          <Header 
            currentPage={currentPage} 
            onNavigate={handleNavigation}
            user={userForProfile}
            userRole={userRole}
            onToggleRole={handleToggleRole}
            onLogout={handleLogout}
          />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {renderPage()}
          </main>
        </div>
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
      <EditActivityLogEntryModal
        isOpen={isEditLogEntryModalOpen}
        onClose={() => {
            setIsEditLogEntryModalOpen(false);
            setLogEntryToEdit(null);
        }}
        onSave={handleUpdateLogEntry}
        entry={logEntryToEdit}
        activityStatuses={activityStatuses}
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

export default App;