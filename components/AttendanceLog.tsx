
import React from 'react';
import { AttendanceLogEntry } from '../types';
import { exportActivityLog } from '../services/exportService';
import { EditIcon } from './Icons';

interface AttendanceLogProps {
  entries: AttendanceLogEntry[];
  dateRange: { startDate: string; endDate: string };
  onDateRangeChange: (range: { startDate: string; endDate: string }) => void;
  userRole: 'admin' | 'employee';
  onEditEntry?: (entry: AttendanceLogEntry) => void;
}

const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    try {
        return new Date(timestamp).toLocaleDateString([], { year: 'numeric', month: 'numeric', day: 'numeric' });
    } catch (e) {
        return 'Invalid Date';
    }
}

const formatTime = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    try {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
        return 'Invalid Time';
    }
}

const AttendanceLog: React.FC<AttendanceLogProps> = ({ entries, dateRange, onDateRangeChange, userRole, onEditEntry }) => {
  
  const handleExport = () => {
    exportActivityLog(entries);
  };

  if (userRole === 'employee') {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todaysEntries = entries.filter(
      entry => entry.timestamp >= todayStart.getTime() && entry.timestamp <= todayEnd.getTime()
    );

    return (
      <div className="w-full bg-white rounded-xl shadow-md p-6 border border-bokara-grey/10 transition-colors duration-300">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-bokara-grey">Today's Activity</h2>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          {todaysEntries.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-bokara-grey/10">
                  <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">Time</th>
                  <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {todaysEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-200">
                    <td className="p-3 text-bokara-grey/80 font-mono">{formatTime(entry.timestamp)}</td>
                    <td className={`p-3 text-bokara-grey ${(entry.action || '').includes('Break') ? 'text-wet-sand' : ''}`}>{entry.action || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-bokara-grey/60 py-8">No activity recorded today.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl shadow-md p-6 border border-bokara-grey/10 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h2 className="text-2xl font-bold text-bokara-grey">Activity Log</h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
           <div className="flex items-center gap-2">
             <label htmlFor="startDate" className="text-sm text-lucius-lime flex-shrink-0">From:</label>
             <input
               type="date"
               id="startDate"
               value={dateRange.startDate}
               onChange={(e) => onDateRangeChange({ ...dateRange, startDate: e.target.value })}
               className="bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-lucius-lime w-full sm:w-auto"
             />
           </div>
           <div className="flex items-center gap-2">
             <label htmlFor="endDate" className="text-sm text-lucius-lime flex-shrink-0">To:</label>
             <input
               type="date"
               id="endDate"
               value={dateRange.endDate}
               onChange={(e) => onDateRangeChange({ ...dateRange, endDate: e.target.value })}
               className="bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-lucius-lime w-full sm:w-auto"
             />
           </div>
           {(dateRange.startDate || dateRange.endDate) && (
             <button onClick={() => onDateRangeChange({ startDate: '', endDate: '' })} className="text-bokara-grey/60 hover:text-bokara-grey text-xs underline">Clear</button>
           )}
            <button
              onClick={handleExport}
              disabled={entries.length === 0}
              className="bg-wet-sand hover:bg-opacity-80 disabled:bg-wet-sand/40 disabled:cursor-not-allowed text-bokara-grey font-bold py-1 px-3 rounded-lg transition-all duration-300 shadow-sm text-sm"
            >
              Export CSV
            </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        {entries.length > 0 ? (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-bokara-grey/10">
                <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">Date</th>
                <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">Time</th>
                <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">Colaborador</th>
                <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">Action</th>
                {onEditEntry && <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-200 hover:bg-whisper-white/40 transition-colors">
                  <td className="p-3 text-bokara-grey/80 font-mono text-sm">{formatDate(entry.timestamp)}</td>
                  <td className="p-3 text-bokara-grey/80 font-mono text-sm">{formatTime(entry.timestamp)}</td>
                  <td className="p-3 text-bokara-grey">{entry.employeeName || 'Unknown'}</td>
                  <td className={`p-3 text-bokara-grey ${(entry.action || '').includes('Break') ? 'text-wet-sand' : ''}`}>{entry.action || '-'}</td>
                  {onEditEntry && (
                    <td className="p-3 text-right">
                        <button onClick={() => onEditEntry(entry)} className="p-1.5 text-bokara-grey/50 hover:text-lucius-lime rounded-full hover:bg-whisper-white transition-colors" title="Edit Log Entry">
                            <EditIcon className="w-5 h-5" />
                        </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center text-bokara-grey/60 py-8">{(dateRange.startDate || dateRange.endDate) ? 'No activity found for this date range.' : 'No activity yet. Clock in a collaborator to start the log.'}</p>
        )}
      </div>
    </div>
  );
};

export default AttendanceLog;
