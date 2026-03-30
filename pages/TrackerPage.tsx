import React, { useState, useMemo } from 'react';
import { Employee, AttendanceLogEntry, AttendanceAction, ActivityStatus, WorkSchedule } from '../types';
import EmployeeCard from '../components/EmployeeCard';
import AttendanceLog, { NewLogEntryData } from '../components/AttendanceLog';
import EmployeeTimeline from '../components/EmployeeTimeline';
import { updateAttendanceLogEntry } from '../services/apiService';
import { useNotification } from '../contexts/NotificationContext';

interface TrackerPageProps {
  employees: Employee[];
  attendanceLog: AttendanceLogEntry[];
  onEmployeeAction: (employeeId: string, action: AttendanceAction) => void;
  onAddEmployee: () => void;
  onRemoveEmployee: (employeeId: string) => void;
  onEditTime: (employeeId: string) => void;
  userRole: 'master' | 'admin' | 'employee';
  activityStatuses: ActivityStatus[];
  workSchedules: WorkSchedule[];
  onEditEntry?: (entry: AttendanceLogEntry) => void;
  onRemoveEntry?: (entry: AttendanceLogEntry) => void;
  onCreateEntry?: (data: NewLogEntryData) => Promise<void>;  // NUEVO
}

const TrackerPage: React.FC<TrackerPageProps> = ({
  employees, attendanceLog, onEmployeeAction, onAddEmployee, onRemoveEmployee,
  onEditTime, userRole, activityStatuses, workSchedules, onEditEntry, onRemoveEntry,
  onCreateEntry,
}) => {
  const { addNotification } = useNotification();
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  const filteredLogs = useMemo(() => {
    let logsToFilter = attendanceLog;
    if (userRole === 'employee' && employees.length > 0 && employees[0]) {
      logsToFilter = attendanceLog.filter(log => log.employeeId === employees[0].id);
    }
    const { startDate, endDate } = dateRange;
    if (!startDate && !endDate) return logsToFilter;
    const startTimestamp = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0;
    const endTimestamp   = endDate   ? new Date(`${endDate}T23:59:59.999`).getTime() : Infinity;
    return logsToFilter.filter(log =>
      (startTimestamp === 0 || log.timestamp >= startTimestamp) &&
      (endTimestamp === Infinity || log.timestamp <= endTimestamp)
    );
  }, [attendanceLog, dateRange, userRole, employees]);

  const handleRequestCorrection = async (
    entry: AttendanceLogEntry,
    data: { text: string; suggestedTime: string; suggestedAction: string }
  ) => {
    try {
      await updateAttendanceLogEntry(entry.id, {
        correctionRequest: data.text,
        correctionSuggestedTime: data.suggestedTime,
        correctionSuggestedAction: data.suggestedAction,
        correctionStatus: 'pending',
      });
      addNotification('Solicitud enviada al administrador.', 'success');
    } catch (error) {
      console.error(error);
      addNotification('Error al enviar solicitud.', 'error');
    }
  };

  const pageTitle = userRole === 'employee' ? 'My Status' : 'Team Status';

  const employeesBySchedule = useMemo(() => {
    if (userRole === 'employee') return null;
    const groups: { [key: string]: Employee[] } = { unassigned: [] };
    workSchedules.forEach(schedule => { groups[schedule.id] = []; });
    employees.forEach(employee => {
      const scheduleId = employee.workScheduleId;
      if (scheduleId && groups[scheduleId] !== undefined) groups[scheduleId].push(employee);
      else groups['unassigned'].push(employee);
    });
    return groups;
  }, [employees, workSchedules, userRole]);

  // Lista simplificada de empleados para el modal de creación
  const employeeList = useMemo(() =>
    employees.map(e => ({ id: e.id, name: e.name })),
    [employees]
  );

  return (
    <>
      <div className="flex flex-col items-center gap-8 pt-8 w-full max-w-full overflow-x-hidden">
        <div className={`w-full ${userRole !== 'employee' ? 'max-w-6xl' : 'max-w-md'}`}>
          <div className="flex justify-between items-center mb-6 px-2">
            <h2 className="text-3xl font-bold text-bokara-grey">{pageTitle}</h2>
            {userRole !== 'employee' && (
              <button
                onClick={onAddEmployee}
                className="bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg transition-all duration-300 shadow-md flex items-center gap-2 transform hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add</span>
              </button>
            )}
          </div>

          {userRole !== 'employee' && employeesBySchedule ? (
            <div className="space-y-8">
              {workSchedules.map(schedule => (
                employeesBySchedule[schedule.id]?.length > 0 && (
                  <div key={schedule.id}>
                    <h3 className="text-xl font-bold text-bokara-grey mb-4 px-2 border-b-2 border-lucius-lime pb-2">{schedule.name}</h3>
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {employeesBySchedule[schedule.id].map(employee => (
                        <EmployeeCard key={employee.id} employee={employee} onAction={onEmployeeAction}
                          onRemove={onRemoveEmployee} onEditTime={onEditTime}
                          activityStatuses={activityStatuses} userRole={userRole} />
                      ))}
                    </div>
                  </div>
                )
              ))}
              {employeesBySchedule['unassigned']?.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-bokara-grey mb-4 px-2 border-b-2 border-bokara-grey/20 pb-2">Unassigned</h3>
                  <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {employeesBySchedule['unassigned'].map(employee => (
                      <EmployeeCard key={employee.id} employee={employee} onAction={onEmployeeAction}
                        onRemove={onRemoveEmployee} onEditTime={onEditTime}
                        activityStatuses={activityStatuses} userRole={userRole} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={`grid gap-6 ${userRole !== 'employee' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {employees.map(employee => (
                <EmployeeCard key={employee.id} employee={employee} onAction={onEmployeeAction}
                  onRemove={onRemoveEmployee} onEditTime={onEditTime}
                  activityStatuses={activityStatuses} userRole={userRole} />
              ))}
            </div>
          )}
        </div>

        {userRole !== 'employee' && (
          <div className="w-full max-w-6xl bg-white rounded-xl shadow-md p-6 border border-bokara-grey/10">
            <EmployeeTimeline employees={employees} attendanceLog={attendanceLog} activityStatuses={activityStatuses} />
          </div>
        )}

        <div className={`w-full ${userRole !== 'employee' ? 'max-w-6xl' : 'max-w-4xl'}`}>
          <AttendanceLog
            entries={filteredLogs}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            userRole={userRole}
            onRequestCorrection={handleRequestCorrection}
            activityStatuses={activityStatuses}
            onEditEntry={onEditEntry}
            onRemoveEntry={onRemoveEntry}
            employees={employeeList}
            onCreateEntry={onCreateEntry}
          />
        </div>
      </div>
    </>
  );
};

export default TrackerPage;