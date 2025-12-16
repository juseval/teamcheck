
import React, { useState, useMemo, useEffect } from 'react';
import { Employee, AttendanceLogEntry, AttendanceAction, ActivityStatus, WorkSchedule, CalendarEvent } from '../types';
import DashboardSummary from '../components/DashboardSummary';
import { ClockIcon, PowerIcon, TeamIcon } from '../components/Icons';
import EmployeeTimeline from '../components/EmployeeTimeline';
import AgentStateDashboard from '../components/AgentStateDashboard';
import TimesheetOverview from '../components/TimesheetOverview';

interface DashboardPageProps {
  attendanceLog?: AttendanceLogEntry[];
  employees?: Employee[];
  onEmployeeAction: (employeeId: string, action: AttendanceAction) => void;
  activityStatuses?: ActivityStatus[];
  workSchedules?: WorkSchedule[];
  calendarEvents?: CalendarEvent[];
}

const formatTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const StatusIndicator: React.FC<{ status: Employee['status'] }> = ({ status }) => {
  const baseClasses = "px-3 py-1 text-sm font-semibold rounded-full";
  switch (status) {
    case 'Working':
      return <span className={`${baseClasses} bg-lucius-lime/20 text-lucius-lime`}>Working</span>;
    case 'On Break':
      return <span className={`${baseClasses} bg-wet-sand/20 text-wet-sand`}>On Break</span>;
    case 'Clocked Out':
      return <span className={`${baseClasses} bg-gray-200 text-gray-700`}>Clocked Out</span>;
    default:
        return <span className={`${baseClasses} bg-wet-sand/20 text-wet-sand`}>{status}</span>;
  }
};


const DashboardPage: React.FC<DashboardPageProps> = ({ 
    attendanceLog, 
    employees, 
    onEmployeeAction, 
    activityStatuses, 
    workSchedules, 
    calendarEvents 
}) => {
  // Defensive checks: Ensure we always work with arrays
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const safeAttendanceLog = Array.isArray(attendanceLog) ? attendanceLog : [];
  const safeWorkSchedules = Array.isArray(workSchedules) ? workSchedules : [];
  const safeActivityStatuses = Array.isArray(activityStatuses) ? activityStatuses : [];
  const safeCalendarEvents = Array.isArray(calendarEvents) ? calendarEvents : [];
  
  // Defensive initializer for selectedEmployeeId
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(() => {
      return (safeEmployees && safeEmployees.length > 0) ? safeEmployees[0].id : null;
  });
  
  const [elapsedTime, setElapsedTime] = useState(0);

  const selectedEmployee = useMemo(() => safeEmployees.find(e => e.id === selectedEmployeeId), [safeEmployees, selectedEmployeeId]);
  
  const teamOverviewStats = useMemo(() => {
    if (!safeEmployees) return { working: 0, onActivity: 0, clockedOut: 0 };
    const working = safeEmployees.filter(e => e.status === 'Working').length;
    const clockedOut = safeEmployees.filter(e => e.status === 'Clocked Out').length;
    const onActivity = safeEmployees.length - working - clockedOut;
    return { working, onActivity, clockedOut };
  }, [safeEmployees]);

  useEffect(() => {
    if (selectedEmployee?.status !== 'Clocked Out' && selectedEmployee?.currentStatusStartTime) {
      const interval = setInterval(() => {
        const seconds = Math.floor((Date.now() - (selectedEmployee.currentStatusStartTime || 0)) / 1000);
        setElapsedTime(seconds);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [selectedEmployee?.status, selectedEmployee?.currentStatusStartTime]);
  
  const renderButtons = () => {
    if (!selectedEmployee) return null;
    const baseButtonClass = "w-full text-center font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg transform hover:scale-105 text-base";
    switch (selectedEmployee.status) {
      case 'Clocked Out':
        return (
          <button onClick={() => onEmployeeAction(selectedEmployee.id, 'Clock In')} className={`${baseButtonClass} bg-lucius-lime hover:bg-opacity-80 text-bokara-grey`}>
            Clock In
          </button>
        );
      case 'Working':
      case 'On Break':
        return (
          <div className="h-[52px] flex items-center justify-center text-center text-bokara-grey/60">
              <p>Manage active session on the <strong>Tracker</strong> page.</p>
          </div>
        );
      default:
        return <div className="h-[52px] flex items-center justify-center text-center text-bokara-grey/60">
              <p>Manage active session on the <strong>Tracker</strong> page.</p>
          </div>;
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 pt-8">
      <TimesheetOverview
        employees={safeEmployees}
        attendanceLog={safeAttendanceLog}
        workSchedules={safeWorkSchedules}
        activityStatuses={safeActivityStatuses}
      />

      <AgentStateDashboard
        employees={safeEmployees}
        workSchedules={safeWorkSchedules}
        activityStatuses={safeActivityStatuses}
        calendarEvents={safeCalendarEvents}
      />

       {/* Live Console Section */}
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-md p-6 border border-bokara-grey/10">
        <h2 className="text-3xl font-bold text-bokara-grey mb-2">Consola en Vivo</h2>
        <p className="text-bokara-grey/80 mb-6">Selecciona un colaborador para acciones rápidas.</p>
        <div className="mb-6">
          <label htmlFor="employee-select" className="block text-sm font-medium text-lucius-lime mb-2">Seleccionar Colaborador</label>
          <select
            id="employee-select"
            value={selectedEmployeeId ?? ''}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime"
          >
            {safeEmployees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>

        {selectedEmployee ? (
          <div className="bg-whisper-white/60 rounded-lg p-6 flex flex-col items-center gap-6 text-center border border-bokara-grey/10">
              <div className="flex flex-col items-center gap-2">
                  <h3 className="text-3xl font-bold text-bokara-grey">{selectedEmployee.name}</h3>
                  <StatusIndicator status={selectedEmployee.status} />
              </div>
              
              <div className="font-display text-7xl text-bokara-grey tracking-widest tabular-nums">
                  {formatTime(elapsedTime)}
              </div>
              
              <div className="w-full max-w-md mt-4">
                  {renderButtons()}
              </div>
          </div>
        ) : (
          <p className="text-center text-bokara-grey/60 py-16">No hay colaboradores disponibles. Agrega uno en la página de Tracker.</p>
        )}
      </div>

      {/* Team Overview Section */}
       <div className="w-full max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6 flex items-center gap-4 border border-lucius-lime/30">
            <div className="p-3 bg-lucius-lime/20 rounded-full">
              <TeamIcon className="w-8 h-8 text-lucius-lime" />
            </div>
            <div>
              <p className="text-sm text-lucius-lime font-semibold uppercase tracking-wider">Working</p>
              <p className="text-3xl font-bold text-bokara-grey">{teamOverviewStats.working}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 flex items-center gap-4 border border-wet-sand/30">
            <div className="p-3 bg-wet-sand/20 rounded-full">
              <ClockIcon className="w-8 h-8 text-wet-sand" />
            </div>
            <div>
              <p className="text-sm text-wet-sand font-semibold uppercase tracking-wider">On Activity</p>
              <p className="text-3xl font-bold text-bokara-grey">{teamOverviewStats.onActivity}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 flex items-center gap-4 border border-bokara-grey/10">
            <div className="p-3 bg-gray-200 rounded-full">
              <PowerIcon className="w-8 h-8 text-bokara-grey/70" />
            </div>
            <div>
              <p className="text-sm text-bokara-grey/70 font-semibold uppercase tracking-wider">Offline</p>
              <p className="text-3xl font-bold text-bokara-grey">{teamOverviewStats.clockedOut}</p>
            </div>
          </div>
        </div>
      </div>


      {/* Data Analysis Section */}
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-md p-6 border border-bokara-grey/10">
            <div>
                <h2 className="text-3xl font-bold text-bokara-grey">Activity Dashboard</h2>
                <p className="text-bokara-grey/80 mt-1">
                Overview of your team's logged activity.
                </p>
            </div>
       
        <DashboardSummary attendanceLog={safeAttendanceLog} />

        <div className="mt-8 border-t border-bokara-grey/10 pt-6">
             <EmployeeTimeline 
                employees={safeEmployees} 
                attendanceLog={safeAttendanceLog} 
                activityStatuses={safeActivityStatuses} 
            />
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
