import React, { useState, useMemo, Fragment, useEffect, useCallback } from 'react';
import { Employee, AttendanceLogEntry, ActivityStatus, TimesheetEntry } from '../types';
import { EditIcon, SearchIcon } from '../components/Icons';
import { exportTimesheet } from '../services/exportService';
import TimesheetStats from '../components/TimesheetStats';
import { NewLogEntryData } from '../components/AttendanceLog';
import { queryAttendanceLogByRange } from '../services/apiService';

const formatDuration = (seconds: number, style: 'short' | 'long' = 'long') => {
  if (isNaN(seconds) || seconds < 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (style === 'short') {
    return [h > 0 ? `${h}h` : '', m > 0 ? `${m}m` : ''].filter(Boolean).join(' ') || '0m';
  }
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

const MANUAL_ACTIONS = [
  'Clock In', 'Clock Out',
  'Start Break', 'End Break',
  'Start Lunch', 'End Lunch',
];

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const TimesheetPage: React.FC<{
  employees: Employee[];
  attendanceLog: AttendanceLogEntry[];
  activityStatuses: ActivityStatus[];
  onEditEntry: (entry: TimesheetEntry) => void;
  onCreateEntry?: (data: NewLogEntryData) => Promise<void>;
}> = ({ employees, attendanceLog, activityStatuses, onEditEntry, onCreateEntry }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate]     = useState(today);

  // ── Estado para logs consultados por rango ──
  const [rangeLog, setRangeLog]       = useState<AttendanceLogEntry[]>([]);
  const [isLoading, setIsLoading]     = useState(false);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [hasQueried, setHasQueried]   = useState(false);

  // ── Fetch por rango cada vez que cambian las fechas ──
  const fetchByRange = useCallback(async () => {
    if (!startDate || !endDate) return;
    const start = new Date(`${startDate}T00:00:00`).getTime();
    const end   = new Date(`${endDate}T23:59:59.999`).getTime();
    if (isNaN(start) || isNaN(end) || start > end) return;

    setIsLoading(true);
    setLoadError(null);
    try {
      const logs = await queryAttendanceLogByRange(start, end);
      setRangeLog(logs);
      setHasQueried(true);
    } catch (err: any) {
      console.error('[TimesheetPage] queryAttendanceLogByRange error:', err);
      setLoadError('Error al cargar registros. Usando datos en caché.');
      setHasQueried(false);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchByRange();
  }, [fetchByRange]);

  // Cuando se crea un registro manual, refrescar los datos
  const handleCreateEntryAndRefresh = async (data: NewLogEntryData) => {
    if (!onCreateEntry) return;
    await onCreateEntry(data);
    // Dar un pequeño delay para que Firestore propague el cambio
    setTimeout(() => fetchByRange(), 500);
  };

  // ── Usar rangeLog si la query fue exitosa, sino fallback al prop ──
  const effectiveLog = hasQueried ? rangeLog : attendanceLog;

  const [createModalOpen, setCreateModalOpen]   = useState(false);
  const [createEmployeeId, setCreateEmployeeId] = useState('');
  const [createAction, setCreateAction]         = useState('Clock In');
  const [createDate, setCreateDate]             = useState(() => new Date().toISOString().split('T')[0]);
  const [createTime, setCreateTime]             = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError]     = useState<string | null>(null);

  const allActions = useMemo(() => {
    const custom = activityStatuses.flatMap(s => [`Start ${s.name}`, `End ${s.name}`]);
    return [...MANUAL_ACTIONS, ...custom];
  }, [activityStatuses]);

  const handleOpenCreate = () => {
    setCreateEmployeeId(employees[0]?.id ?? '');
    setCreateAction('Clock In');
    setCreateDate(new Date().toISOString().split('T')[0]);
    const now = new Date();
    setCreateTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    setCreateError(null);
    setCreateModalOpen(true);
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmployeeId || !onCreateEntry) return;
    const emp = employees.find(em => em.id === createEmployeeId);
    if (!emp) return;
    setCreatePending(true);
    setCreateError(null);
    try {
      await handleCreateEntryAndRefresh({
        employeeId: createEmployeeId,
        employeeName: emp.name,
        action: createAction,
        date: createDate,
        time: createTime,
      });
      setCreateModalOpen(false);
    } catch (err: any) {
      setCreateError(err?.message ?? 'Error al crear el registro.');
    } finally {
      setCreatePending(false);
    }
  };

  const timesheetData = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00`).getTime();
    const end   = new Date(`${endDate}T23:59:59.999`).getTime();

    const filteredEmployees = employees.filter(e =>
      searchTerm === '' || e.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const statusColorMap = new Map<string, string>();
    activityStatuses.forEach(s => statusColorMap.set(s.name, s.color));
    statusColorMap.set('Working', 'transparent');

    const results: Record<string, {
      employeeName: string; employeeId: string; location: string; role: string;
      dailyData: Record<string, { entries: TimesheetEntry[]; totalWork: number; totalActivities: number }>;
      totalWork: number; totalActivities: number;
    }> = {};

    for (const employee of filteredEmployees) {
      const employeeLogs = effectiveLog
        .filter(log => log.employeeId === employee.id && log.timestamp >= start && log.timestamp <= end)
        .sort((a, b) => a.timestamp - b.timestamp);

      if (employeeLogs.length === 0 && searchTerm === '') continue;

      results[employee.id] = {
        employeeName: employee.name, employeeId: employee.id,
        location: employee.location, role: employee.role,
        dailyData: {}, totalWork: 0, totalActivities: 0,
      };

      if (employeeLogs.length > 0) {
        const logsByDay: Record<string, AttendanceLogEntry[]> = {};
        for (const log of employeeLogs) {
          const dateStr = new Date(log.timestamp).toISOString().split('T')[0];
          if (!logsByDay[dateStr]) logsByDay[dateStr] = [];
          logsByDay[dateStr].push(log);
        }

        for (const dateStr in logsByDay) {
          const dailyLogs = [...logsByDay[dateStr]].sort((a, b) => a.timestamp - b.timestamp);
          const entries: TimesheetEntry[] = [];
          const activityCounters: Record<string, number> = {};
          let dailyTotalWork       = 0;
          let dailyTotalActivities = 0;

          for (let i = 0; i < dailyLogs.length; i++) {
            const currentLog = dailyLogs[i];
            const nextLog    = dailyLogs[i + 1];
            if (currentLog.action === 'Clock Out' || !nextLog) continue;

            const duration = (nextLog.timestamp - currentLog.timestamp) / 1000;
            if (duration <= 1) continue;

            let activity = 'Working';
            if (currentLog.action.startsWith('Start ')) activity = currentLog.action.substring(6);

            let entryType = activity;
            if (activity !== 'Working') {
              if (!activityCounters[activity]) activityCounters[activity] = 0;
              activityCounters[activity]++;
              entryType = `${activity} ${activityCounters[activity]}`;
              dailyTotalActivities += duration;
            } else {
              dailyTotalWork += duration;
            }

            entries.push({
              key: `${employee.id}-${currentLog.id}`,
              employeeId: employee.id, employeeName: employee.name,
              date: dateStr,
              dayOfWeek: new Date(currentLog.timestamp).toLocaleDateString('en-US', { weekday: 'short' }),
              type: entryType,
              timeIn:  currentLog.timestamp,
              timeOut: nextLog.timestamp,
              duration,
              color: activity !== 'Working' ? statusColorMap.get(activity) : undefined,
              startLogId: currentLog.id,
              endLogId:   nextLog.id,
            });
          }

          if (entries.length > 0) {
            results[employee.id].dailyData[dateStr] = {
              entries,
              totalWork:       dailyTotalWork,
              totalActivities: dailyTotalActivities,
            };
            results[employee.id].totalWork       += dailyTotalWork;
            results[employee.id].totalActivities += dailyTotalActivities;
          }
        }
      }
    }
    return Object.values(results);
  }, [employees, effectiveLog, activityStatuses, searchTerm, startDate, endDate]);

  const stats = useMemo(() => {
    let totalWorkSeconds = 0; let totalActivitySeconds = 0;
    let topPerformer = { name: '', hours: 0 };
    timesheetData.forEach(data => {
      totalWorkSeconds     += data.totalWork;
      totalActivitySeconds += data.totalActivities;
      if (data.totalWork > topPerformer.hours) topPerformer = { name: data.employeeName, hours: data.totalWork };
    });
    const start = new Date(startDate); const end = new Date(endDate);
    const daysCovered = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return {
      totalWorkSeconds, totalActivitySeconds,
      uniqueEmployees: timesheetData.length, daysCovered,
      topPerformer: topPerformer.hours > 0 ? topPerformer : undefined,
    };
  }, [timesheetData, startDate, endDate]);

  const isSingleEmployeeView = timesheetData.length === 1 && searchTerm !== '';
  const singleEmployeeData   = isSingleEmployeeView ? timesheetData[0] : null;

  const getInitials = (name: string = '') => {
    if (!name) return '??';
    const trimmedName = name.trim();
    if (!trimmedName) return '??';
    const names = trimmedName.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return trimmedName.substring(0, 2).toUpperCase();
  };

  return (
    <div className="w-full mx-auto animate-fade-in flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-bokara-grey">Productividad</h1>
          <p className="text-bokara-grey/60 text-sm mt-1">
            Analizando desde <span className="font-bold text-bokara-grey">{startDate}</span> hasta <span className="font-bold text-bokara-grey">{endDate}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onCreateEntry && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg transition-all shadow-md"
            >
              <PlusIcon className="w-5 h-5" />
              Crear Registro
            </button>
          )}
          <button
            onClick={() => exportTimesheet(timesheetData)}
            disabled={timesheetData.length === 0}
            className="bg-bokara-grey hover:bg-bokara-grey/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-5 rounded-lg transition-all duration-300 shadow-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar Datos
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center bg-white rounded-xl shadow-md p-4 border border-bokara-grey/10">
        <div className="w-full lg:w-96 relative group">
          <input
            type="text" placeholder="Buscar..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white rounded-full py-3 pl-6 pr-14 text-bokara-grey shadow-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-bokara-grey/10 transition-all placeholder:text-gray-300 font-light"
          />
          <div className="absolute right-1.5 top-1.5 bottom-1.5">
            <div className="h-full aspect-square bg-bokara-grey text-white rounded-full flex items-center justify-center shadow-md">
              <SearchIcon className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="w-full lg:flex-1 flex flex-col sm:flex-row gap-4 justify-end">
          <div className="flex-1 lg:max-w-xs">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full bg-[#EAE2D3] border border-bokara-grey/20 text-bokara-grey rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-lucius-lime cursor-pointer shadow-sm" />
          </div>
          <div className="hidden sm:flex items-center text-bokara-grey/40 font-bold">A</div>
          <div className="flex-1 lg:max-w-xs">
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full bg-[#EAE2D3] border border-bokara-grey/20 text-bokara-grey rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-lucius-lime cursor-pointer shadow-sm" />
          </div>
        </div>
      </div>

      {/* Loading / Error indicators */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-bokara-grey/60">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Cargando registros...
        </div>
      )}
      {loadError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700 flex items-center gap-2">
          <span>⚠️</span> {loadError}
        </div>
      )}

      <TimesheetStats
        totalWorkSeconds={stats.totalWorkSeconds}
        totalActivitySeconds={stats.totalActivitySeconds}
        uniqueEmployees={stats.uniqueEmployees}
        daysCovered={stats.daysCovered}
        topPerformer={stats.topPerformer}
      />

      {isSingleEmployeeView && singleEmployeeData && (
        <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 overflow-hidden mb-8 animate-fade-in">
          <div className="bg-gradient-to-r from-bokara-grey to-dark-hunter-green p-6 text-white flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border-4 border-white/20 text-2xl font-bold backdrop-blur-sm">
              {getInitials(singleEmployeeData.employeeName)}
            </div>
            <div className="flex-grow text-center sm:text-left">
              <h2 className="text-3xl font-bold">{singleEmployeeData.employeeName}</h2>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-2 opacity-80 text-sm">
                <span className="bg-white/10 px-2 py-1 rounded">{singleEmployeeData.role}</span>
                <span>•</span>
                <span>{singleEmployeeData.location}</span>
              </div>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-xs uppercase tracking-widest opacity-60 mb-1">Total Periodo</p>
              <p className="text-4xl font-display font-bold">{formatDuration(singleEmployeeData.totalWork, 'short')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 text-xs font-bold text-bokara-grey/60 uppercase tracking-wider">Día</th>
                <th className="p-4 text-xs font-bold text-bokara-grey/60 uppercase tracking-wider">Tipo</th>
                <th className="p-4 text-xs font-bold text-bokara-grey/60 uppercase tracking-wider">Entrada</th>
                <th className="p-4 text-xs font-bold text-bokara-grey/60 uppercase tracking-wider">Salida</th>
                <th className="p-4 text-xs font-bold text-bokara-grey/60 uppercase tracking-wider text-right">Duración</th>
                <th className="p-4 text-xs font-bold text-bokara-grey/60 uppercase tracking-wider text-center">Editar</th>
              </tr>
            </thead>
            <tbody>
              {timesheetData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-16">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-bokara-grey/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      <p className="text-bokara-grey/50 font-medium">
                        {isLoading ? 'Cargando...' : 'No se encontraron registros para este período.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                timesheetData.map(employeeData => (
                  <Fragment key={employeeData.employeeName}>
                    {!isSingleEmployeeView && (
                      <tr className="bg-whisper-white/50 border-b border-bokara-grey/5">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-bokara-grey text-white flex items-center justify-center text-xs font-bold">
                                {getInitials(employeeData.employeeName)}
                              </div>
                              <span className="font-bold text-bokara-grey">{employeeData.employeeName}</span>
                            </div>
                            <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-bokara-grey/10 shadow-sm">
                              Total: {formatDuration(employeeData.totalWork + employeeData.totalActivities, 'short')}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {Object.entries(employeeData.dailyData)
                      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                      .map(([date, dailyInfo]) => {
                        const info = dailyInfo as { entries: TimesheetEntry[]; totalWork: number; totalActivities: number };
                        return (
                          <Fragment key={date}>
                            {info.entries.map((entry, index) => (
                              <tr key={entry.key} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${index === 0 && !isSingleEmployeeView ? 'border-t border-gray-200' : ''}`}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="font-bold text-sm text-bokara-grey">{entry.dayOfWeek}</div>
                                  <div className="text-xs text-bokara-grey/50">{entry.date}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color && entry.color !== 'transparent' ? entry.color : '#91A673' }} />
                                    <span className="text-sm font-medium text-bokara-grey/80">{entry.type}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-mono text-sm text-bokara-grey/70">{formatTime(entry.timeIn)}</td>
                                <td className="px-4 py-3 font-mono text-sm text-bokara-grey/70">{formatTime(entry.timeOut)}</td>
                                <td className="px-4 py-3 font-mono text-sm text-right font-bold text-bokara-grey">{formatDuration(entry.duration)}</td>
                                <td className="px-4 py-3 text-center">
                                  <button onClick={() => onEditEntry(entry)} className="p-1.5 text-bokara-grey/40 hover:text-lucius-lime hover:bg-lucius-lime/10 rounded-md transition-all">
                                    <EditIcon className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-gray-50/50 border-b border-gray-200">
                              <td colSpan={4} className="px-4 py-2 text-right text-xs font-bold text-bokara-grey/40 uppercase tracking-wide">Total Diario</td>
                              <td className="px-4 py-2 text-right font-mono text-sm font-bold text-bokara-grey">{formatDuration(info.totalWork + info.totalActivities)}</td>
                              <td />
                            </tr>
                          </Fragment>
                        );
                      })}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Crear Registro Manual */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-bokara-grey/60 flex items-center justify-center z-50 p-4" onClick={() => setCreateModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-bokara-grey/10 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-bokara-grey">Crear Registro Manual</h3>
                <p className="text-xs text-bokara-grey/50 mt-0.5">Se marcará como <span className="font-bold text-blue-600">Manual</span> en el Activity Log.</p>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="p-1 text-bokara-grey/40 hover:text-bokara-grey rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-lucius-lime uppercase tracking-widest mb-1">Colaborador</label>
                <select value={createEmployeeId} onChange={e => setCreateEmployeeId(e.target.value)} required
                  className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg px-3 py-2.5 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime">
                  <option value="" disabled>Seleccionar colaborador...</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-lucius-lime uppercase tracking-widest mb-1">Acción</label>
                <select value={createAction} onChange={e => setCreateAction(e.target.value)} required
                  className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg px-3 py-2.5 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime">
                  {allActions.map(action => <option key={action} value={action}>{action}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-lucius-lime uppercase tracking-widest mb-1">Fecha</label>
                  <input type="date" value={createDate} onChange={e => setCreateDate(e.target.value)} required
                    className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg px-3 py-2.5 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-lucius-lime uppercase tracking-widest mb-1">Hora</label>
                  <input type="time" value={createTime} onChange={e => setCreateTime(e.target.value)} required
                    className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg px-3 py-2.5 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime" />
                </div>
              </div>
              {createDate && createTime && (
                <div className="bg-whisper-white rounded-lg px-3 py-2 text-xs text-bokara-grey/70 border border-bokara-grey/10">
                  <span className="font-bold text-bokara-grey">Se registrará: </span>
                  {new Date(`${createDate}T${createTime}:00`).toLocaleString('es-CO', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              )}
              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-semibold">{createError}</div>
              )}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-bokara-grey rounded-lg hover:bg-gray-200 font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={createPending || !createEmployeeId}
                  className="px-5 py-2 bg-lucius-lime text-bokara-grey font-bold rounded-lg hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  {createPending ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    <><PlusIcon className="w-4 h-4" />Crear Registro</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetPage;