import React, { useMemo } from 'react';
import { Employee, AttendanceLogEntry, WorkSchedule, ActivityStatus, CalendarEvent, PayrollChangeType } from '../types';

interface TimesheetOverviewProps {
  employees: Employee[];
  attendanceLog: AttendanceLogEntry[];
  workSchedules: WorkSchedule[];
  activityStatuses: ActivityStatus[];
  calendarEvents?: CalendarEvent[];
  payrollChangeTypes?: PayrollChangeType[];
}

const formatScheduleTime = (time: string): string => {
  if (!time || time === '-') return '-';
  const [hoursStr, minutes] = time.split(':');
  let hours = parseInt(hoursStr, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
};

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

const TimesheetOverview: React.FC<TimesheetOverviewProps> = ({
  employees, attendanceLog, workSchedules, activityStatuses: _activityStatuses,
  calendarEvents = [], payrollChangeTypes = []
}) => {

  const todayEventsByEmployee = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const map = new Map<string, CalendarEvent[]>();
    calendarEvents.forEach(ev => {
      if (ev.startDate <= todayStr && ev.endDate >= todayStr) {
        if (!map.has(ev.employeeId)) map.set(ev.employeeId, []);
        map.get(ev.employeeId)!.push(ev);
      }
    });
    return map;
  }, [calendarEvents]);

  const typeByName = useMemo(() => {
    const m = new Map<string, PayrollChangeType>();
    payrollChangeTypes.forEach(t => m.set(t.name, t));
    return m;
  }, [payrollChangeTypes]);

  const processedData = useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const todayStartTs = todayStart.getTime();
    const todayEndTs   = todayEnd.getTime();

    const dailyStats = new Map<string, {
      firstClockIn: number | null;
      lastClockOut: number | null;
      totalBreakSeconds: number;
    }>();

    // Agrupar logs de HOY por empleado
    const logsByEmployee = new Map<string, AttendanceLogEntry[]>();
    attendanceLog.forEach(log => {
      if (log.timestamp >= todayStartTs && log.timestamp <= todayEndTs) {
        if (!logsByEmployee.has(log.employeeId)) logsByEmployee.set(log.employeeId, []);
        logsByEmployee.get(log.employeeId)!.push(log);
      }
    });

    logsByEmployee.forEach((logs, employeeId) => {
      // ── FIX: siempre ordenar ASC antes de procesar ──
      // streamAttendanceLog ahora devuelve DESC desde Firestore.
      // El .reverse() anterior invertía incorrectamente ese orden.
      // Ahora creamos una copia ordenada ASC explícitamente.
      const asc = [...logs].sort((a, b) => a.timestamp - b.timestamp);

      let firstClockIn: number | null = null;
      let lastClockOut: number | null = null;
      let totalBreakSeconds           = 0;

      // Primer Clock In del día
      const clockInLog = asc.find(l => l.action === 'Clock In');
      if (clockInLog) firstClockIn = clockInLog.timestamp;

      // Último Clock Out del día — iterar desde el final del array ASC
      for (let i = asc.length - 1; i >= 0; i--) {
        if (asc[i].action === 'Clock Out') {
          lastClockOut = asc[i].timestamp;
          break;
        }
      }

      // Calcular duración de breaks (Start X → siguiente log)
      for (let i = 0; i < asc.length - 1; i++) {
        if (asc[i].action.startsWith('Start ')) {
          totalBreakSeconds += (asc[i + 1].timestamp - asc[i].timestamp) / 1000;
        }
      }
      // Break activo (último log es un Start sin cierre todavía)
      const lastLog = asc[asc.length - 1];
      if (lastLog?.action.startsWith('Start ')) {
        totalBreakSeconds += (Date.now() - lastLog.timestamp) / 1000;
      }

      dailyStats.set(employeeId, { firstClockIn, lastClockOut, totalBreakSeconds });
    });

    const scheduleMap = new Map<string, WorkSchedule>(workSchedules.map(s => [s.id, s]));
    const employeesBySchedule = new Map<string, Employee[]>();
    const unassignedEmployees: Employee[] = [];

    employees.forEach(employee => {
      if (employee.workScheduleId && scheduleMap.has(employee.workScheduleId)) {
        const sid = employee.workScheduleId;
        if (!employeesBySchedule.has(sid)) employeesBySchedule.set(sid, []);
        employeesBySchedule.get(sid)!.push(employee);
      } else {
        unassignedEmployees.push(employee);
      }
    });

    employeesBySchedule.forEach(list => list.sort((a, b) => a.name.localeCompare(b.name)));
    unassignedEmployees.sort((a, b) => a.name.localeCompare(b.name));

    const structuredData = workSchedules
      .filter(s => employeesBySchedule.has(s.id) && employeesBySchedule.get(s.id)!.length > 0)
      .map(schedule => ({ schedule, employees: employeesBySchedule.get(schedule.id)! }));

    if (unassignedEmployees.length > 0)
      structuredData.push({
        schedule: { id: 'unassigned', name: 'Unassigned', startTime: '-', endTime: '-', days: [], companyId: '' } as WorkSchedule,
        employees: unassignedEmployees,
      });

    return { structuredData, dailyStats };
  }, [employees, attendanceLog, workSchedules]);

  const GRACE_PERIOD_MINUTES = 5;
  const MAX_BREAK_SECONDS    = 3600;

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
                  {schedule.id !== 'unassigned'
                    ? `Horario: ${formatScheduleTime(schedule.startTime)} - ${formatScheduleTime(schedule.endTime)}`
                    : 'Unassigned Schedule'}
                </td>
              </tr>

              {employeeList.map(employee => {
                const stats        = processedData.dailyStats.get(employee.id);
                const firstClockIn = stats?.firstClockIn ?? null;
                const lastClockOut = stats?.lastClockOut ?? null;
                const totalBreak   = stats?.totalBreakSeconds || 0;

                const todayEvents = todayEventsByEmployee.get(employee.id) ?? [];
                const activeEvent = todayEvents.find(e => e.status === 'approved') ?? todayEvents.find(e => e.status === 'pending') ?? null;
                const eventType   = activeEvent ? typeByName.get(activeEvent.type) : null;

                let isLate = false;
                if (firstClockIn && schedule.id !== 'unassigned') {
                  const [h, m] = schedule.startTime.split(':').map(Number);
                  const d = new Date(firstClockIn); d.setHours(h, m + GRACE_PERIOD_MINUTES, 0, 0);
                  if (firstClockIn > d.getTime()) isLate = true;
                }

                let isEarly = false;
                if (lastClockOut && schedule.id !== 'unassigned') {
                  const [h, m] = schedule.endTime.split(':').map(Number);
                  const d = new Date(lastClockOut); d.setHours(h, m, 0, 0);
                  if (lastClockOut < d.getTime() - GRACE_PERIOD_MINUTES * 60 * 1000) isEarly = true;
                }

                const isExcessiveBreak = totalBreak > MAX_BREAK_SECONDS;

                const EventBadge = activeEvent ? (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: eventType ? `${eventType.color}20` : '#fef3c7',
                      borderColor:     eventType ? `${eventType.color}60` : '#fcd34d',
                      color:           eventType?.color ?? '#92400e',
                    }}
                    title={activeEvent.status === 'pending' ? 'Pendiente de aprobación' : 'Aprobada'}
                  >
                    {activeEvent.status === 'pending' ? '⏳' : '📅'} {activeEvent.type}
                  </span>
                ) : null;

                return (
                  <tr key={employee.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{employee.name}</td>

                    <td className="px-4 py-3">
                      {firstClockIn ? (
                        <div className="flex items-center gap-2">
                          <span className={`font-mono ${isLate ? 'text-red-600 font-bold' : ''}`}>
                            {formatClockInTime(firstClockIn)}
                          </span>
                          {isLate && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200">Late</span>}
                        </div>
                      ) : <span className="text-gray-400">-</span>}
                    </td>

                    <td className="px-4 py-3">
                      {lastClockOut ? (
                        <div className="flex items-center gap-2">
                          <span className={`font-mono ${isEarly ? 'text-amber-600 font-bold' : ''}`}>
                            {formatClockInTime(lastClockOut)}
                          </span>
                          {isEarly && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded border border-amber-200">Early</span>}
                        </div>
                      ) : <span className="text-gray-400">Active</span>}
                    </td>

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
                      {firstClockIn ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            lastClockOut ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'
                          }`}>
                            {lastClockOut ? 'Done' : 'Active'}
                          </span>
                          {EventBadge}
                        </div>
                      ) : activeEvent ? (
                        EventBadge
                      ) : (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-50 text-red-500">
                          Absent
                        </span>
                      )}
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