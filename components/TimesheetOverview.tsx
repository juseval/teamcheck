
import React, { useMemo } from 'react';
import { Employee, AttendanceLogEntry, WorkSchedule, ActivityStatus } from '../types';
import { FilterIcon, AlertIcon } from './Icons';

interface TimesheetOverviewProps {
  employees: Employee[];
  attendanceLog: AttendanceLogEntry[];
  workSchedules: WorkSchedule[];
  activityStatuses: ActivityStatus[];
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

const formatDurationShort = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

const TimesheetOverview: React.FC<TimesheetOverviewProps> = ({ employees, attendanceLog, workSchedules, activityStatuses }) => {
  
  const processedData = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    // We need more detailed stats than just first clock in
    const dailyStats = new Map<string, { 
        firstClockIn: number | null, 
        lastClockOut: number | null,
        totalBreakSeconds: number 
    }>();

    // Group logs by employee for today
    const logsByEmployee = new Map<string, AttendanceLogEntry[]>();
    attendanceLog.forEach(log => {
        if (log.timestamp >= todayStart.getTime() && log.timestamp <= todayEnd.getTime()) {
            if (!logsByEmployee.has(log.employeeId)) {
                logsByEmployee.set(log.employeeId, []);
            }
            logsByEmployee.get(log.employeeId)!.push(log);
        }
    });

    // Calculate stats per employee
    logsByEmployee.forEach((logs, employeeId) => {
        // Sort logs chronologically
        logs.sort((a, b) => a.timestamp - b.timestamp);

        let firstClockIn: number | null = null;
        let lastClockOut: number | null = null;
        let totalBreakSeconds = 0;

        // Find first Clock In
        const clockInLog = logs.find(l => l.action === 'Clock In');
        if (clockInLog) firstClockIn = clockInLog.timestamp;

        // Find last Clock Out (if exists)
        const clockOutLog = [...logs].reverse().find(l => l.action === 'Clock Out');
        if (clockOutLog) lastClockOut = clockOutLog.timestamp;

        // Calculate Break Duration (Any "Start [Activity]" -> Next Log)
        for (let i = 0; i < logs.length - 1; i++) {
            const current = logs[i];
            const next = logs[i+1];
            
            // Assuming any action starting with 'Start ' that isn't working is a break/activity
            // Or strictly checks against activityStatuses. 
            // Here we check if action starts with 'Start ' (e.g., Start Break, Start Lunch)
            if (current.action.startsWith('Start ') && next) {
                 totalBreakSeconds += (next.timestamp - current.timestamp) / 1000;
            }
        }
        
        // Handle ongoing break (last log is Start Break)
        const lastLog = logs[logs.length - 1];
        if (lastLog && lastLog.action.startsWith('Start ')) {
            totalBreakSeconds += (Date.now() - lastLog.timestamp) / 1000;
        }

        dailyStats.set(employeeId, { firstClockIn, lastClockOut, totalBreakSeconds });
    });


    // Group employees by their schedule (existing logic)
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
    
    employeesBySchedule.forEach(empList => empList.sort((a, b) => a.name.localeCompare(b.name)));
    unassignedEmployees.sort((a, b) => a.name.localeCompare(b.name));

    const structuredData = workSchedules
      .filter(schedule => employeesBySchedule.has(schedule.id) && employeesBySchedule.get(schedule.id)!.length > 0)
      .map(schedule => ({
        schedule,
        employees: employeesBySchedule.get(schedule.id)!,
      }));
    
    if (unassignedEmployees.length > 0) {
      structuredData.push({
        schedule: { id: 'unassigned', name: 'Unassigned', startTime: '-', endTime: '-', days: [] },
        employees: unassignedEmployees,
      });
    }
      
    return { structuredData, dailyStats };
  }, [employees, attendanceLog, workSchedules]);

  // Thresholds
  const GRACE_PERIOD_MINUTES = 5;
  const MAX_BREAK_SECONDS = 3600; // 1 hour

  return (
    <div className="w-full bg-white rounded-xl shadow-md p-6 border border-bokara-grey/10">
      <h2 className="text-2xl font-bold text-bokara-grey mb-4">Daily Timesheet Overview</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-bokara-grey">
          <thead className="text-xs text-bokara-grey/80 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3">Employee Name</th>
              <th scope="col" className="px-4 py-3">Entry Time</th>
              <th scope="col" className="px-4 py-3">Exit Time</th>
              <th scope="col" className="px-4 py-3">Breaks Total</th>
              <th scope="col" className="px-4 py-3">Status</th>
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
                const stats = processedData.dailyStats.get(employee.id);
                const firstClockIn = stats?.firstClockIn;
                const lastClockOut = stats?.lastClockOut;
                const totalBreak = stats?.totalBreakSeconds || 0;
                
                // Logic for Late Arrival
                let isLate = false;
                if (firstClockIn && schedule.id !== 'unassigned') {
                    const [h, m] = schedule.startTime.split(':').map(Number);
                    const scheduleDate = new Date(firstClockIn);
                    scheduleDate.setHours(h, m, 0, 0);
                    // Add grace period
                    scheduleDate.setMinutes(scheduleDate.getMinutes() + GRACE_PERIOD_MINUTES);
                    if (firstClockIn > scheduleDate.getTime()) {
                        isLate = true;
                    }
                }

                // Logic for Early Departure
                let isEarly = false;
                if (lastClockOut && schedule.id !== 'unassigned') {
                     const [h, m] = schedule.endTime.split(':').map(Number);
                     const scheduleDate = new Date(lastClockOut);
                     scheduleDate.setHours(h, m, 0, 0);
                     // Allow leaving exactly on time or after. If before, check tolerance.
                     // Example: Shift ends 17:00. Left 16:50 -> Early.
                     if (lastClockOut < scheduleDate.getTime() - (GRACE_PERIOD_MINUTES * 60 * 1000)) {
                         isEarly = true;
                     }
                }

                // Logic for Excessive Break
                const isExcessiveBreak = totalBreak > MAX_BREAK_SECONDS;

                return (
                  <tr key={employee.id} className={`border-b border-gray-200 hover:bg-gray-50`}>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{employee.name}</td>
                    
                    {/* Entry Time */}
                    <td className="px-4 py-3">
                        {firstClockIn ? (
                            <div className="flex items-center gap-2">
                                <span className={`font-mono ${isLate ? 'text-red-600 font-bold' : ''}`}>
                                    {formatClockInTime(firstClockIn)}
                                </span>
                                {isLate && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200">Late</span>}
                            </div>
                        ) : (
                            <span className="text-gray-400">-</span>
                        )}
                    </td>

                    {/* Exit Time */}
                    <td className="px-4 py-3">
                         {lastClockOut ? (
                            <div className="flex items-center gap-2">
                                <span className={`font-mono ${isEarly ? 'text-amber-600 font-bold' : ''}`}>
                                    {formatClockInTime(lastClockOut)}
                                </span>
                                {isEarly && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded border border-amber-200">Early</span>}
                            </div>
                        ) : (
                            <span className="text-gray-400">Active</span>
                        )}
                    </td>

                    {/* Total Break */}
                    <td className="px-4 py-3">
                        {totalBreak > 0 ? (
                            <div className="flex items-center gap-2">
                                <span className={`font-mono ${isExcessiveBreak ? 'text-red-600 font-bold' : ''}`}>
                                    {formatDurationShort(totalBreak)}
                                </span>
                                {isExcessiveBreak && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200">&gt;1h</span>}
                            </div>
                        ) : <span className="text-gray-400">-</span>}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          firstClockIn 
                            ? (lastClockOut ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700') 
                            : 'bg-red-50 text-red-500'
                      }`}>
                        {firstClockIn ? (lastClockOut ? 'Done' : 'Active') : 'Absent'}
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
