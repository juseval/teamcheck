
import React, { useState } from 'react';
import { AttendanceLogEntry } from '../types';
import { exportActivityLog } from '../services/exportService';
import { EditIcon, ChatBubbleIcon, AlertIcon } from './Icons';

interface AttendanceLogProps {
  entries: AttendanceLogEntry[];
  dateRange: { startDate: string; endDate: string };
  onDateRangeChange: (range: { startDate: string; endDate: string }) => void;
  userRole: 'admin' | 'employee';
  onEditEntry?: (entry: AttendanceLogEntry) => void;
  onRequestCorrection?: (entry: AttendanceLogEntry, requestText: string) => void;
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

const AttendanceLog: React.FC<AttendanceLogProps> = ({ entries, dateRange, onDateRangeChange, userRole, onEditEntry, onRequestCorrection }) => {
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AttendanceLogEntry | null>(null);
  const [requestText, setRequestText] = useState('');

  const handleExport = () => {
    exportActivityLog(entries);
  };

  const handleOpenRequest = (entry: AttendanceLogEntry) => {
      setSelectedEntry(entry);
      // Pre-fill if editing an existing pending request could be an option, but for now fresh start
      setRequestText(entry.correctionRequest || '');
      setRequestModalOpen(true);
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedEntry && onRequestCorrection && requestText.trim()) {
          onRequestCorrection(selectedEntry, requestText.trim());
          setRequestModalOpen(false);
          setSelectedEntry(null);
          setRequestText('');
      }
  };

  // --- RENDER LOG ROW CONTENT ---
  const renderRow = (entry: AttendanceLogEntry) => {
      const isPending = entry.correctionStatus === 'pending';
      const isApproved = entry.correctionStatus === 'approved';
      const isRejected = entry.correctionStatus === 'rejected';
      
      return (
        <tr key={entry.id} className={`border-b border-gray-200 hover:bg-whisper-white/40 transition-colors ${isPending ? 'bg-yellow-50' : ''}`}>
            <td className="p-3 text-bokara-grey/80 font-mono text-sm whitespace-nowrap">
                {userRole === 'admin' ? formatDate(entry.timestamp) : formatTime(entry.timestamp)}
                {/* Admin Response/Status Indicator */}
                {entry.correctionStatus && (
                    <div className="mt-1 flex items-center gap-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            isApproved ? 'bg-green-100 text-green-700' : 
                            isRejected ? 'bg-red-100 text-red-700' : 
                            'bg-yellow-100 text-yellow-700'
                        }`}>
                            {entry.correctionStatus === 'approved' ? 'Corregido' : entry.correctionStatus === 'rejected' ? 'Rechazado' : 'Pendiente'}
                        </span>
                    </div>
                )}
            </td>
            {userRole === 'admin' && (
                <>
                    <td className="p-3 text-bokara-grey/80 font-mono text-sm">{formatTime(entry.timestamp)}</td>
                    <td className="p-3 text-bokara-grey">{entry.employeeName || 'Unknown'}</td>
                </>
            )}
            <td className="p-3">
                <span className={`text-bokara-grey ${(entry.action || '').includes('Break') ? 'text-wet-sand' : ''}`}>
                    {entry.action || '-'}
                </span>
                {/* Display Context/Response */}
                {entry.adminResponse && (
                    <div className="mt-2 text-xs bg-white/60 p-2 rounded border border-bokara-grey/10 text-bokara-grey/80 flex items-start gap-1">
                        <ChatBubbleIcon className="w-3 h-3 mt-0.5 text-lucius-lime flex-shrink-0" />
                        <span><strong className="text-bokara-grey">Admin:</strong> {entry.adminResponse}</span>
                    </div>
                )}
                {userRole === 'employee' && entry.correctionRequest && entry.correctionStatus === 'pending' && (
                     <div className="mt-1 text-xs text-yellow-700 italic">
                        Solicitud: "{entry.correctionRequest}"
                     </div>
                )}
            </td>
            
            {/* Action Buttons */}
            <td className="p-3 text-right whitespace-nowrap">
                <div className="flex justify-end items-center gap-2">
                    {/* Admin: Edit Button (Handles Requests too) */}
                    {userRole === 'admin' && onEditEntry && (
                        <button 
                            onClick={() => onEditEntry(entry)} 
                            className={`p-1.5 rounded-full transition-colors relative ${isPending ? 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200' : 'text-bokara-grey/50 hover:text-lucius-lime hover:bg-whisper-white'}`} 
                            title={isPending ? "Revisar Solicitud" : "Editar Registro"}
                        >
                            {isPending && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                            <EditIcon className="w-5 h-5" />
                        </button>
                    )}

                    {/* Employee: Request Correction Button */}
                    {userRole === 'employee' && onRequestCorrection && (
                        <button 
                            onClick={() => handleOpenRequest(entry)} 
                            className={`p-1.5 rounded-full transition-colors flex items-center gap-1 ${
                                isPending 
                                    ? 'text-yellow-600 bg-yellow-50 cursor-default' 
                                    : 'text-bokara-grey/40 hover:text-lucius-lime hover:bg-whisper-white'
                            }`}
                            disabled={isPending} // Disable if already pending
                            title="Solicitar corrección de hora o marca"
                        >
                            <span className="text-xs font-bold">{isPending ? 'En revisión' : 'Corregir'}</span>
                            <AlertIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </td>
        </tr>
      );
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Filter for employee view (Today only) vs Admin view (Date Range)
  const displayEntries = userRole === 'employee' 
    ? entries.filter(entry => entry.timestamp >= todayStart.getTime() && entry.timestamp <= todayEnd.getTime())
    : entries;

  return (
    <>
        <div className="w-full bg-white rounded-xl shadow-md p-6 border border-bokara-grey/10 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h2 className="text-2xl font-bold text-bokara-grey">{userRole === 'employee' ? "Today's Activity" : "Activity Log"}</h2>
            
            {userRole === 'admin' && (
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
            )}
        </div>
        
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            {displayEntries.length > 0 ? (
            <table className="w-full text-left">
                <thead>
                <tr className="border-b border-bokara-grey/10 bg-gray-50 sticky top-0 z-10">
                    <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">
                        {userRole === 'admin' ? 'Date' : 'Time'}
                    </th>
                    {userRole === 'admin' && (
                        <>
                            <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">Time</th>
                            <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">Colaborador</th>
                        </>
                    )}
                    <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">Action</th>
                    <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider text-right">
                        {userRole === 'admin' ? 'Actions' : 'Corrections'}
                    </th>
                </tr>
                </thead>
                <tbody>
                {displayEntries.map(renderRow)}
                </tbody>
            </table>
            ) : (
            <p className="text-center text-bokara-grey/60 py-8">
                {userRole === 'admin' && (dateRange.startDate || dateRange.endDate) ? 'No activity found for this date range.' : 'No activity recorded.'}
            </p>
            )}
        </div>
        </div>

        {/* Correction Request Modal (Employee) */}
        {requestModalOpen && (
            <div className="fixed inset-0 bg-bokara-grey bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setRequestModalOpen(false)}>
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-bokara-grey/10 animate-fade-in" onClick={e => e.stopPropagation()}>
                    <h3 className="text-xl font-bold text-bokara-grey mb-2">Solicitar Corrección</h3>
                    <p className="text-sm text-bokara-grey/70 mb-4">
                        Describe el error (ej: "Olvidé marcar salida a las 18:00" o "El break terminó antes").
                    </p>
                    <form onSubmit={handleSubmitRequest}>
                        <textarea 
                            className="w-full h-32 bg-whisper-white border border-bokara-grey/20 rounded-lg p-3 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime resize-none"
                            placeholder="Escribe tu justificación aquí..."
                            value={requestText}
                            onChange={(e) => setRequestText(e.target.value)}
                            required
                        ></textarea>
                        <div className="flex justify-end gap-3 mt-4">
                            <button type="button" onClick={() => setRequestModalOpen(false)} className="px-4 py-2 bg-gray-200 text-bokara-grey rounded-lg hover:bg-gray-300">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-lucius-lime text-bokara-grey font-bold rounded-lg hover:bg-opacity-80">Enviar Solicitud</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </>
  );
};

export default AttendanceLog;
