import React, { useMemo } from 'react';
import { AttendanceLogEntry, AttendanceAction } from '../types.ts';

interface DashboardSummaryProps {
  attendanceLog: AttendanceLogEntry[];
}

const formatDuration = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const DashboardSummary: React.FC<DashboardSummaryProps> = ({ attendanceLog }) => {
  const { totalWorkSeconds, totalBreakSeconds } = useMemo(() => {
    let work = 0;
    let breakTime = 0;
    const sortedLog = [...attendanceLog].sort((a, b) => a.timestamp - b.timestamp);

    const logsByEmployee: { [key: number]: AttendanceLogEntry[] } = {};
    for (const entry of sortedLog) {
      if (!logsByEmployee[entry.employeeId]) {
        logsByEmployee[entry.employeeId] = [];
      }
      logsByEmployee[entry.employeeId].push(entry);
    }

    for (const employeeId in logsByEmployee) {
      const employeeLog = logsByEmployee[employeeId];
      let lastTimestamp: number | null = null;
      let lastAction: AttendanceAction | null = null;

      for (const entry of employeeLog) {
        if (lastTimestamp && lastAction) {
          const duration = entry.timestamp - lastTimestamp;
          if (lastAction === 'Clock In' || lastAction.startsWith('End Break')) {
            work += duration;
          } else if (lastAction.startsWith('Start Break')) {
            breakTime += duration;
          }
        }
        
        if (entry.action !== 'Clock Out') {
          lastTimestamp = entry.timestamp;
          lastAction = entry.action;
        } else {
          lastTimestamp = null;
          lastAction = null;
        }
      }
    }

    return {
      totalWorkSeconds: Math.floor(work / 1000),
      totalBreakSeconds: Math.floor(breakTime / 1000),
    };
  }, [attendanceLog]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
      <div className="bg-whisper-white p-6 rounded-lg text-center flex flex-col justify-center items-center shadow-inner">
        <h3 className="text-lg font-semibold text-lucius-lime uppercase tracking-wider">Total Time Worked</h3>
        <p className="font-display text-5xl text-bokara-grey mt-2 tabular-nums">{formatDuration(totalWorkSeconds)}</p>
      </div>
      <div className="bg-whisper-white p-6 rounded-lg text-center flex flex-col justify-center items-center shadow-inner">
        <h3 className="text-lg font-semibold text-wet-sand uppercase tracking-wider">Total Break Time</h3>
        <p className="font-display text-5xl text-bokara-grey mt-2 tabular-nums">{formatDuration(totalBreakSeconds)}</p>
      </div>
    </div>
  );
};

export default DashboardSummary;