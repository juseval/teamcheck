
import React, { useState, useMemo } from 'react';
import { Employee, AttendanceLogEntry, AttendanceAction, ActivityStatus, WorkSchedule } from '../types';
import EmployeeCard from '../components/EmployeeCard';
import AttendanceLog from '../components/AttendanceLog';
import EmployeeTimeline from '../components/EmployeeTimeline';
import { updateAttendanceLogEntry } from '../services/apiService';
import { useNotification } from '../contexts/NotificationContext';

interface TrackerPageProps {
  employees: Employee[];
  attendanceLog: AttendanceLogEntry[];
  // FIX: Changed employeeId type from number to string.
  onEmployeeAction: (employeeId: string, action: AttendanceAction) => void;
  onAddEmployee: () => void;
  // FIX: Changed employeeId type from number to string.
  onRemoveEmployee: (employeeId: string) => void;
  // FIX: Changed employeeId type from number to string.
  onEditTime: (employeeId: string) => void;
  userRole: 'admin' | 'employee';
  activityStatuses: ActivityStatus[];
  workSchedules: WorkSchedule[];
  // New prop for handling log editing
  onEditEntry?: (entry: AttendanceLogEntry) => void;
}

const TrackerPage: React.FC<TrackerPageProps> = ({ 
  employees, 
  attendanceLog, 
  onEmployeeAction,
  onAddEmployee,
  onRemoveEmployee,
  onEditTime,
  userRole,
  activityStatuses,
  workSchedules,
  onEditEntry
}) => {
  const { addNotification } = useNotification();
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  const filteredLogs = useMemo(() => {
    // If employee, filter logs for ONLY that employee immediately to prevent seeing others' data
    // (Though parent component likely filters 'employees' prop, attendanceLog might contain all)
    let logsToFilter = attendanceLog;
    
    // Safety check: if userRole is employee, find the matching employee ID from the employees prop (which should be length 1)
    if (userRole === 'employee' && employees.length > 0) {
        logsToFilter = attendanceLog.filter(log => log.employeeId === employees[0].id);
    }

    const { startDate, endDate } = dateRange;
    if (!startDate && !endDate) {
      return logsToFilter;
    }
    
    const startTimestamp = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0;
    const endTimestamp = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : Infinity;

    return logsToFilter.filter(log => {
      const logTs = log.timestamp;
      const isAfterStart = startTimestamp === 0 ? true : logTs >= startTimestamp;
      const isBeforeEnd = endTimestamp === Infinity ? true : logTs <= endTimestamp;
      return isAfterStart && isBeforeEnd;
    });
  }, [attendanceLog, dateRange, userRole, employees]);

  // Handle Correction Request (Employee)
  const handleRequestCorrection = async (entry: AttendanceLogEntry, requestText: string) => {
      try {
          await updateAttendanceLogEntry(entry.id, {
              correctionRequest: requestText,
              correctionStatus: 'pending'
          });
          addNotification("Solicitud enviada al administrador.", 'success');
      } catch (error) {
          console.error(error);
          addNotification("Error al enviar solicitud.", 'error');
      }
  };

  // Ensure Admins see "Team Status"
  const pageTitle = userRole === 'employee' ? "My Status" : "Team Status";

  // Grouping logic for admin view
  const employeesBySchedule = useMemo(() => {
    if (userRole !== 'admin') {
      return null;
    }

    const groups: { [key: string]: Employee[] } = { 'unassigned': [] };
    
    // Initialize groups for all schedules to maintain order
    workSchedules.forEach(schedule => {
        groups[schedule.id] = [];
    });

    // Group employees
    employees.forEach(employee => {
        const scheduleId = employee.workScheduleId;
        if (scheduleId && groups[scheduleId] !== undefined) {
            groups[scheduleId].push(employee);
        } else {
            groups['unassigned'].push(employee);
        }
    });

    return groups;
  }, [employees, workSchedules, userRole]);


  return (
    <>
        <div className="flex flex-col items-center gap-8 pt-8 w-full max-w-full overflow-x-hidden">
            <div className={`w-full ${userRole === 'admin' ? 'max-w-6xl' : 'max-w-md'}`}>
                <div className="flex justify-between items-center mb-6 px-2">
                    <h2 className="text-3xl font-bold text-bokara-grey">{pageTitle}</h2>
                    {userRole === 'admin' && (
                      <button
                        onClick={onAddEmployee}
                        className="bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg transition-all duration-300 shadow-md flex items-center gap-2 transform hover:scale-105"
                        aria-label="Add new employee"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                        <span>Add</span>
                      </button>
                    )}
                </div>
                
                {userRole === 'admin' && employeesBySchedule ? (
                  <div className="space-y-8">
                    {/* Render employees grouped by their assigned schedule */}
                    {workSchedules.map(schedule => (
                      employeesBySchedule[schedule.id]?.length > 0 && (
                        <div key={schedule.id}>
                            <h3 className="text-xl font-bold text-bokara-grey mb-4 px-2 border-b-2 border-lucius-lime pb-2">{schedule.name}</h3>
                            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {employeesBySchedule[schedule.id].map(employee => (
                                    <EmployeeCard 
                                        key={employee.id} 
                                        employee={employee} 
                                        onAction={onEmployeeAction}
                                        onRemove={onRemoveEmployee}
                                        onEditTime={onEditTime}
                                        activityStatuses={activityStatuses}
                                        userRole={userRole}
                                    />
                                ))}
                            </div>
                        </div>
                      )
                    ))}
                    {/* Render employees without an assigned schedule */}
                    {employeesBySchedule['unassigned']?.length > 0 && (
                       <div>
                            <h3 className="text-xl font-bold text-bokara-grey mb-4 px-2 border-b-2 border-bokara-grey/20 pb-2">Unassigned</h3>
                            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {employeesBySchedule['unassigned'].map(employee => (
                                   <EmployeeCard 
                                        key={employee.id} 
                                        employee={employee} 
                                        onAction={onEmployeeAction}
                                        onRemove={onRemoveEmployee}
                                        onEditTime={onEditTime}
                                        activityStatuses={activityStatuses}
                                        userRole={userRole}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                  </div>
                ) : (
                  // Original view for 'employee' role
                  <div className={`grid gap-6 ${userRole === 'admin' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                      {employees.map(employee => (
                      <EmployeeCard 
                          key={employee.id} 
                          employee={employee} 
                          onAction={onEmployeeAction}
                          onRemove={onRemoveEmployee}
                          onEditTime={onEditTime}
                          activityStatuses={activityStatuses}
                          userRole={userRole}
                      />
                      ))}
                  </div>
                )}
            </div>
            
            {userRole === 'admin' && (
                <div className="w-full max-w-6xl bg-white rounded-xl shadow-md p-6 border border-bokara-grey/10 transition-colors duration-300">
                     <EmployeeTimeline 
                        employees={employees} 
                        attendanceLog={attendanceLog} 
                        activityStatuses={activityStatuses} 
                    />
                </div>
            )}

            <div className={`w-full ${userRole === 'admin' ? 'max-w-6xl' : 'max-w-4xl'}`}>
                <AttendanceLog 
                    entries={filteredLogs}
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    userRole={userRole}
                    onRequestCorrection={handleRequestCorrection}
                    onEditEntry={onEditEntry}
                />
            </div>
        </div>
    </>
  );
};

export default TrackerPage;
