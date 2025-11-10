import React, { useMemo } from 'react';
import { Employee, AttendanceLogEntry, WorkSchedule } from '../types';
import { FilterIcon } from './Icons';

interface TimesheetOverviewProps {
  employees: Employee[];
  attendanceLog: AttendanceLogEntry[];
  workSchedules: WorkSchedule[];
}

// Helper to format time from "HH:mm" to "h:mm AM/PM"
const formatScheduleTime = (time: string): string => {
  if (!time || time === '-') return '-';
  const [hoursStr, minutes] = time.split(':');
  let hours = parseInt(hoursStr, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${hours}:${minutes} ${ampm}`;
};

// Helper to format timestamp to "h:mm AM/PM"
const formatClockInTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const TimesheetOverview: React.FC<TimesheetOverviewProps> = ({ employees, attendanceLog, workSchedules }) => {
  
  const processedData = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    // 1. Get today's first clock-in time for each employee
    const todaysClockIns = new Map<string, number>();
    attendanceLog.forEach(log => {
      if (log.action === 'Clock In' && log.timestamp >= todayStart.getTime()) {
        if (!todaysClockIns.has(log.employeeId) || log.timestamp < todaysClockIns.get(log.employeeId)!) {
          todaysClockIns.set(log.employeeId, log.timestamp);
        }
      }
    });

    // 2. Group employees by their schedule
    const scheduleMap = new Map<string, WorkSchedule>(workSchedules.map(s => [s.id, s]));
    const employeesBySchedule = new Map<string, Employee[]>();
    const unassignedEmployees: Employee[] = [];

    employees.forEach(employee => {
      if (employee.workScheduleId && scheduleMap.has(employee.workScheduleId)) {
        const scheduleId = employee.workScheduleId;
        if (!employeesBySchedule.has(scheduleId)) {
          employeesBySchedule.set(scheduleId, []);
        }
        employeesBySchedule.get(scheduleId)!.push(employee);
      } else {
        unassignedEmployees.push(employee);
      }
    });
    
    // Sort employees within each group alphabetically
    employeesBySchedule.forEach(empList => empList.sort((a, b) => a.name.localeCompare(b.name)));
    unassignedEmployees.sort((a, b) => a.name.localeCompare(b.name));

    // 3. Structure the final data for rendering, ensuring schedules with employees appear
    const structuredData = workSchedules
      .filter(schedule => employeesBySchedule.has(schedule.id) && employeesBySchedule.get(schedule.id)!.length > 0)
      .map(schedule => ({
        schedule,
        employees: employeesBySchedule.get(schedule.id)!,
      }));
    
    if (unassignedEmployees.length > 0) {
      structuredData.push({
        // A bit of a hack to create a schedule-like object for unassigned
        schedule: { id: 'unassigned', name: 'Unassigned', startTime: '-', endTime: '-', days: [] },
        employees: unassignedEmployees,
      });
    }
      
    return { structuredData, todaysClockIns };
  }, [employees, attendanceLog, workSchedules]);

  return (
    <div className="w-full bg-white rounded-xl shadow-md p-6 border border-bokara-grey/10">
      <h2 className="text-2xl font-bold text-bokara-grey mb-4">Daily Timesheet Overview</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-bokara-grey">
          <thead className="text-xs text-bokara-grey/80 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3">Employee Name</th>
              <th scope="col" className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <FilterIcon className="w-3.5 h-3.5"/> Entry Time
                </div>
              </th>
              <th scope="col" className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <FilterIcon className="w-3.5 h-3.5"/> Exit Time
                </div>
              </th>
              <th scope="col" className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <FilterIcon className="w-3.5 h-3.5"/> Clock In
                </div>
              </th>
              <th scope="col" className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <FilterIcon className="w-3.5 h-3.5"/> Clock In Status
                </div>
              </th>
            </tr>
          </thead>
          {processedData.structuredData.map(({ schedule, employees: employeeList }) => (
            <tbody key={schedule.id} className="border-t-2 border-bokara-grey/10">
              <tr className="bg-whisper-white/40">
                <td colSpan={5} className="px-4 py-2 font-bold text-bokara-grey">
                  {schedule.id !== 'unassigned' ? `Horario: ${formatScheduleTime(schedule.startTime)} - ${formatScheduleTime(schedule.endTime)}` : 'Unassigned Schedule'}
                </td>
              </tr>
              {employeeList.map(employee => {
                const clockInTime = processedData.todaysClockIns.get(employee.id);
                // "Not Ready" is any status that isn't working or clocked out
                const isNotReady = employee.status !== 'Working' && employee.status !== 'Clocked Out';
                
                return (
                  <tr key={employee.id} className={`border-b border-gray-200 hover:bg-gray-50 ${isNotReady ? 'bg-orange-100' : ''}`}>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{employee.name}</td>
                    <td className="px-4 py-3">{formatScheduleTime(schedule.startTime)}</td>
                    <td className="px-4 py-3">{formatScheduleTime(schedule.endTime)}</td>
                    <td className={`px-4 py-3 font-mono ${!clockInTime ? 'text-gray-500' : ''}`}>
                      {clockInTime ? formatClockInTime(clockInTime) : 'OFF'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${clockInTime ? 'text-green-600' : 'text-red-600'}`}>
                        {clockInTime ? 'Marcado' : 'Sin Marcar'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
          {processedData.structuredData.length === 0 && (
             <tbody>
                <tr>
                    <td colSpan={5} className="text-center p-8 text-bokara-grey/60">
                        No employees found. Add employees and assign schedules to see data here.
                    </td>
                </tr>
            </tbody>
          )}
        </table>
      </div>
    </div>
  );
};

export default TimesheetOverview;