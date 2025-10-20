import React, { useState, useEffect, useRef } from 'react';
import { Employee, AttendanceLogEntry, WorkSchedule } from '../types';
import { AlertIcon, PaperAirplaneIcon } from './Icons';

interface LateArrivalsWidgetProps {
  employees: Employee[];
  attendanceLog: AttendanceLogEntry[];
  workSchedules: WorkSchedule[];
}

interface LateEmployee {
  id: number;
  name: string;
  minutesLate: number;
}

const LateArrivalsWidget: React.FC<LateArrivalsWidgetProps> = ({ employees, attendanceLog, workSchedules }) => {
  const [lateEmployees, setLateEmployees] = useState<LateEmployee[]>([]);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkLateArrivals = () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const todayStart = new Date(todayStr).getTime();
      const todayDayOfWeek = now.getDay(); // Sunday - 0, Monday - 1, etc.
      const gracePeriodMinutes = 10;

      const todaysClockIns = new Set(
        attendanceLog
          .filter(log => log.action === 'Clock In' && log.timestamp >= todayStart)
          .map(log => log.employeeId)
      );

      const scheduleMap = new Map<string, WorkSchedule>(workSchedules.map(s => [s.id, s]));
      const lateList: LateEmployee[] = [];

      employees.forEach(employee => {
        if (employee.workScheduleId && !todaysClockIns.has(employee.id)) {
          const schedule = scheduleMap.get(employee.workScheduleId);
          if (schedule && schedule.days.includes(todayDayOfWeek)) {
            const [hours, minutes] = schedule.startTime.split(':').map(Number);
            const scheduledStartTime = new Date(todayStr);
            scheduledStartTime.setHours(hours, minutes, 0, 0);

            const graceDeadline = new Date(scheduledStartTime);
            graceDeadline.setMinutes(graceDeadline.getMinutes() + gracePeriodMinutes);

            if (now > graceDeadline) {
              const minutesLate = Math.floor((now.getTime() - scheduledStartTime.getTime()) / (1000 * 60));
              lateList.push({ id: employee.id, name: employee.name, minutesLate });

              // Simulate sending notification only once per employee per day
              const notificationKey = `${employee.id}-${todayStr}`;
              if (!notifiedRef.current.has(notificationKey)) {
                console.log(`[Notification Service] Simulating notification for ${employee.name}'s late arrival.`);
                console.log(`   -> To: manager@example.com (EMAIL)`);
                console.log(`   -> To: +15551234567 (WHATSAPP/SMS)`);
                notifiedRef.current.add(notificationKey);
              }
            }
          }
        }
      });

      setLateEmployees(lateList);
    };

    checkLateArrivals(); // Initial check
    const interval = setInterval(checkLateArrivals, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [employees, attendanceLog, workSchedules]);

  if (lateEmployees.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-6xl bg-amber-50 rounded-xl shadow-md p-6 border border-amber-300">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-3 bg-amber-100 rounded-full">
            <AlertIcon className="w-6 h-6 text-amber-600" />
        </div>
        <div>
            <h2 className="text-xl font-bold text-amber-800">Late Arrivals Alert</h2>
            <p className="text-amber-700 mt-1">The following employees were late for their scheduled shift. A notification has been sent.</p>
            <ul className="mt-4 space-y-2">
                {lateEmployees.map(emp => (
                    <li key={emp.id} className="flex items-center gap-2 text-bokara-grey">
                        <span className="font-semibold">{emp.name}</span> - 
                        <span className="font-mono text-red-600"> {emp.minutesLate} minutes late</span>
                        <span title="Se ha enviado una notificación al gerente." className="text-bokara-grey/60 cursor-help">
                            <PaperAirplaneIcon className="w-4 h-4 transform rotate-45" />
                        </span>
                    </li>
                ))}
            </ul>
        </div>
      </div>
    </div>
  );
};

export default LateArrivalsWidget;
