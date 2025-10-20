import React, { useState, useMemo } from 'react';
import { AttendanceLogEntry } from '../types';
import AttendanceLog from '../components/AttendanceLog';

interface ActivityLogPageProps {
  attendanceLog: AttendanceLogEntry[];
  onEditEntry: (entry: AttendanceLogEntry) => void;
}

const ActivityLogPage: React.FC<ActivityLogPageProps> = ({ attendanceLog, onEditEntry }) => {
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  const filteredLogs = useMemo(() => {
    const { startDate, endDate } = dateRange;
    // By default (no date range), show all logs sorted by most recent first
    if (!startDate && !endDate) {
      return [...attendanceLog].sort((a, b) => b.timestamp - a.timestamp);
    }
    
    const startTimestamp = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0;
    const endTimestamp = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : Infinity;

    return attendanceLog
        .filter(log => {
            const logTs = log.timestamp;
            const isAfterStart = startTimestamp === 0 ? true : logTs >= startTimestamp;
            const isBeforeEnd = endTimestamp === Infinity ? true : logTs <= endTimestamp;
            return isAfterStart && isBeforeEnd;
        })
        .sort((a, b) => b.timestamp - a.timestamp); // Also sort the filtered results

  }, [attendanceLog, dateRange]);

  return (
    <div className="w-full max-w-7xl mx-auto animate-fade-in">
        <AttendanceLog 
            entries={filteredLogs}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            userRole="admin" // This page is admin-only
            onEditEntry={onEditEntry}
        />
    </div>
  );
};

export default ActivityLogPage;
