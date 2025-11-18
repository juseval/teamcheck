
import React from 'react';
import { AttendanceLogEntry } from '../types';
import { exportActivityLog } from '../services/exportService';
import { EditIcon, FilterIcon, XCircleIcon } from './Icons';

interface AttendanceLogProps {
  entries: AttendanceLogEntry[];
  dateRange: { startDate: string; endDate: string };
  onDateRangeChange: (range: { startDate: string; endDate: string }) => void;
  userRole: 'admin' | 'employee';
  onEditEntry?: (entry: AttendanceLogEntry) => void;
}

const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const AttendanceLog: React.FC<AttendanceLogProps> = ({ entries, dateRange, onDateRangeChange, userRole, onEditEntry }) => {
  
  const handleExport = () => {
    exportActivityLog(entries);
  };

  const hasActiveFilter = dateRange.startDate || dateRange.endDate;

  if (userRole === 'employee') {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todaysEntries = entries.filter(
      entry => entry.timestamp >= todayStart.getTime() && entry.timestamp <= todayEnd.getTime()
    );

    return (
      <div className="w-full bg-white rounded-xl shadow-md p-6 border border-bokara-grey/10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-bokara-grey">Today's Activity</h2>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          {todaysEntries.length > 0 ? (
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white shadow-sm">
                <tr className="border-b border-bokara-grey/10">
                  <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">Time</th>
                  <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {todaysEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-whisper-white/40 transition-colors">
                    <td className="p-3 text-bokara-grey/80 font-mono">{formatDate(entry.timestamp)}</td>
                    <td className={`p-3 font-medium ${entry.action.includes('Break') ? 'text-wet-sand' : 'text-bokara-grey'}`}>{entry.action}</td>
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
    <div className="w-full bg-white rounded-xl shadow-md p-6 border border-bokara-grey/10">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-bokara-grey flex items-center gap-2">
            Activity Log
            <span className="text-sm font-normal text-bokara-grey/40 bg-whisper-white px-2 py-0.5 rounded-full">{entries.length}</span>
        </h2>
        
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full lg:w-auto">
           <div className="flex items-center gap-2 bg-whisper-white/50 p-1.5 rounded-lg border border-bokara-grey/10 w-full sm:w-auto">
             <div className="flex items-center gap-2 px-2">
                <FilterIcon className="w-4 h-4 text-lucius-lime" />
                <span className="text-xs font-semibold text-bokara-grey/60 uppercase">Filter</span>
             </div>
             <div className="h-4 w-px bg-bokara-grey/20 mx-1"></div>
             <div className="flex items-center gap-2">
                <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => onDateRangeChange({ ...dateRange, startDate: e.target.value })}
                    className="bg-transparent border-none text-bokara-grey text-sm focus:ring-0 p-0 w-32 font-medium cursor-pointer"
                    placeholder="Start Date"
                />
                <span className="text-bokara-grey/40">-</span>
                <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => onDateRangeChange({ ...dateRange, endDate: e.target.value })}
                    className="bg-transparent border-none text-bokara-grey text-sm focus:ring-0 p-0 w-32 font-medium cursor-pointer"
                    placeholder="End Date"
                />
             </div>
             {hasActiveFilter && (
                 <button 
                    onClick={() => onDateRangeChange({ startDate: '', endDate: '' })} 
                    className="ml-2 p-1 hover:bg-bokara-grey/10 rounded-full text-bokara-grey/50 hover:text-red-500 transition-colors"
                    title="Clear filters"
                 >
                    <XCircleIcon className="w-4 h-4" />
                 </button>
             )}
           </div>

            <button
              onClick={handleExport}
              disabled={entries.length === 0}
              className="w-full sm:w-auto bg-wet-sand/10 hover:bg-wet-sand/20 text-wet-sand font-bold py-2 px-4 rounded-lg transition-all duration-300 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-wet-sand/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Export CSV
            </button>
        </div>
      </div>
      
      <div className="overflow-x-auto rounded-lg border border-bokara-grey/5">
        {entries.length > 0 ? (
          <table className="w-full text-left">
            <thead className="bg-whisper-white/50">
              <tr className="border-b border-bokara-grey/10">
                <th className="p-4 text-xs font-bold text-bokara-grey/60 uppercase tracking-wider">Time</th>
                <th className="p-4 text-xs font-bold text-bokara-grey/60 uppercase tracking-wider">Employee</th>
                <th className="p-4 text-xs font-bold text-bokara-grey/60 uppercase tracking-wider">Action</th>
                {onEditEntry && <th className="p-4 text-xs font-bold text-bokara-grey/60 uppercase tracking-wider text-right">Edit</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-whisper-white/30 transition-colors group">
                  <td className="p-4 text-bokara-grey/70 font-mono text-sm">{formatDate(entry.timestamp)}</td>
                  <td className="p-4 font-medium text-bokara-grey">{entry.employeeName}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${
                        entry.action === 'Clock In' ? 'bg-lucius-lime/10 text-lucius-lime border-lucius-lime/20' :
                        entry.action === 'Clock Out' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                        entry.action.includes('Break') ? 'bg-wet-sand/10 text-wet-sand border-wet-sand/20' :
                        'bg-blue-50 text-blue-600 border-blue-100'
                    }`}>
                        {entry.action}
                    </span>
                  </td>
                  {onEditEntry && (
                    <td className="p-4 text-right">
                        <button 
                            onClick={() => onEditEntry(entry)} 
                            className="p-1.5 text-bokara-grey/30 hover:text-lucius-lime hover:bg-lucius-lime/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100" 
                            title="Edit Log Entry"
                        >
                            <EditIcon className="w-4 h-4" />
                        </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-16 bg-whisper-white/10">
            <p className="text-bokara-grey/40 mb-2">
                {hasActiveFilter ? 'No records match your filters.' : 'Activity log is empty.'}
            </p>
            {hasActiveFilter && (
                <button onClick={() => onDateRangeChange({ startDate: '', endDate: '' })} className="text-lucius-lime hover:underline text-sm font-medium">
                    Clear Filters
                </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceLog;
