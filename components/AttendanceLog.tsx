import React, { useState, useMemo } from 'react';
import { AttendanceLogEntry } from '../types';
import { exportActivityLog } from '../services/exportService';
import { EditIcon, ChatBubbleIcon, AlertIcon, TrashIcon } from './Icons';

interface CorrectionData {
  text: string;
  suggestedTime: string;
  suggestedAction: string;
}

// ── Datos que el admin provee al crear un registro manual ──
export interface NewLogEntryData {
  employeeId: string;
  employeeName: string;
  action: string;
  date: string;   // "YYYY-MM-DD"
  time: string;   // "HH:MM"
}

interface AttendanceLogProps {
  entries: AttendanceLogEntry[];
  dateRange: { startDate: string; endDate: string };
  onDateRangeChange: (range: { startDate: string; endDate: string }) => void;
  userRole: 'master' | 'admin' | 'employee';
  activityStatuses?: { id: string; name: string; color: string }[];
  employees?: { id: string; name: string }[];
  onEditEntry?: (entry: AttendanceLogEntry) => void;
  onRemoveEntry?: (entry: AttendanceLogEntry) => void;
  onRequestCorrection?: (entry: AttendanceLogEntry, data: CorrectionData) => void;
  onCreateEntry?: (data: NewLogEntryData) => Promise<void>;
}

const formatDate = (timestamp: number) => {
  if (!timestamp) return 'N/A';
  try { return new Date(timestamp).toLocaleDateString([], { year: 'numeric', month: 'numeric', day: 'numeric' }); }
  catch (e) { return 'Invalid Date'; }
};

const formatTime = (timestamp: number) => {
  if (!timestamp) return 'N/A';
  try { return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch (e) { return 'Invalid Time'; }
};

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
  </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const SortIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9M3 12h5m4 0l4-4m0 0l4 4m-4-4v12" />
  </svg>
);

// Acciones disponibles para crear manualmente
const MANUAL_ACTIONS = [
  'Clock In', 'Clock Out',
  'Start Break', 'End Break',
  'Start Lunch', 'End Lunch',
];

// ── Tipos de ordenamiento ──
type SortMode = 'time' | 'name' | 'name-time';

const SORT_OPTIONS: { value: SortMode; label: string; description: string }[] = [
  { value: 'time',      label: 'Hora',          description: 'Más reciente primero' },
  { value: 'name',      label: 'A → Z',         description: 'Alfabético por nombre' },
  { value: 'name-time', label: 'A → Z + Hora',  description: 'Alfabético, luego por hora' },
];

const AttendanceLog: React.FC<AttendanceLogProps> = ({
  entries, dateRange, onDateRangeChange, userRole, activityStatuses = [],
  employees = [], onEditEntry, onRemoveEntry, onRequestCorrection, onCreateEntry,
}) => {
  // ── Estados existentes ──
  const [requestModalOpen, setRequestModalOpen]   = useState(false);
  const [selectedEntry, setSelectedEntry]         = useState<AttendanceLogEntry | null>(null);
  const [requestText, setRequestText]             = useState('');
  const [suggestedTime, setSuggestedTime]         = useState('');
  const [suggestedAction, setSuggestedAction]     = useState('');
  const [collaboratorSearch, setCollaboratorSearch] = useState('');

  // ── NUEVO: ordenamiento ──
  const [sortMode, setSortMode] = useState<SortMode>('time');

  // ── Estado del modal de creación ──
  const [createModalOpen, setCreateModalOpen]     = useState(false);
  const [createEmployeeId, setCreateEmployeeId]   = useState('');
  const [createAction, setCreateAction]           = useState('Clock In');
  const [createDate, setCreateDate]               = useState(() => new Date().toISOString().split('T')[0]);
  const [createTime, setCreateTime]               = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  const [createPending, setCreatePending]         = useState(false);
  const [createError, setCreateError]             = useState<string | null>(null);

  const handleExport = () => exportActivityLog(entries);

  // ── Abrir modal de creación ──
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
      await onCreateEntry({
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

  // ── Corrección ──
  const handleOpenRequest = (entry: AttendanceLogEntry) => {
    setSelectedEntry(entry);
    setRequestText('');
    const d  = new Date(entry.timestamp);
    setSuggestedTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
    setSuggestedAction(entry.action || 'Clock In');
    setRequestModalOpen(true);
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEntry && onRequestCorrection && requestText.trim()) {
      onRequestCorrection(selectedEntry, { text: requestText.trim(), suggestedTime, suggestedAction });
      setRequestModalOpen(false);
      setSelectedEntry(null);
      setRequestText(''); setSuggestedTime(''); setSuggestedAction('');
    }
  };

  // ── Filtrado ──
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const isFiltered = dateRange.startDate || dateRange.endDate;

  const baseEntries = (() => {
    if (userRole !== 'employee') return entries;
    if (!dateRange.startDate && !dateRange.endDate)
      return entries.filter(e => e.timestamp >= todayStart.getTime() && e.timestamp <= todayEnd.getTime());
    return entries;
  })();

  const searchedEntries = useMemo(() => {
    if (userRole === 'employee' || !collaboratorSearch.trim()) return baseEntries;
    const query = collaboratorSearch.trim().toLowerCase();
    return baseEntries.filter(e => (e.employeeName || '').toLowerCase().includes(query));
  }, [baseEntries, collaboratorSearch, userRole]);

  // ── NUEVO: ordenamiento aplicado ──
  const displayEntries = useMemo(() => {
    const arr = [...searchedEntries];

    switch (sortMode) {
      case 'time':
        // Orden por defecto: más reciente primero (ya viene así de Firestore)
        return arr.sort((a, b) => b.timestamp - a.timestamp);

      case 'name':
        // Alfabético por nombre, sin sub-orden por hora
        return arr.sort((a, b) => {
          const nameA = (a.employeeName || '').toLowerCase();
          const nameB = (b.employeeName || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });

      case 'name-time':
        // Alfabético por nombre, luego por hora ASC dentro de cada persona
        return arr.sort((a, b) => {
          const nameA = (a.employeeName || '').toLowerCase();
          const nameB = (b.employeeName || '').toLowerCase();
          const nameCompare = nameA.localeCompare(nameB);
          if (nameCompare !== 0) return nameCompare;
          return a.timestamp - b.timestamp; // ASC dentro del mismo nombre
        });

      default:
        return arr;
    }
  }, [searchedEntries, sortMode]);

  const collaboratorNames = useMemo(() => {
    if (userRole === 'employee') return [];
    const names = new Set(entries.map(e => e.employeeName).filter(Boolean));
    return Array.from(names).sort();
  }, [entries, userRole]);

  const title = userRole === 'employee'
    ? (isFiltered ? 'Mi Actividad' : 'Actividad de Hoy')
    : 'Activity Log';

  const allActions = useMemo(() => {
    const custom = activityStatuses.flatMap(s => [`Start ${s.name}`, `End ${s.name}`]);
    return [...MANUAL_ACTIONS, ...custom];
  }, [activityStatuses]);

  // ── Separador visual cuando se agrupa por nombre ──
  const shouldShowNameSeparator = (entry: AttendanceLogEntry, index: number): boolean => {
    if (sortMode !== 'name' && sortMode !== 'name-time') return false;
    if (index === 0) return true;
    const prev = displayEntries[index - 1];
    return (entry.employeeName || '').toLowerCase() !== (prev?.employeeName || '').toLowerCase();
  };

  const renderRow = (entry: AttendanceLogEntry, index: number) => {
    const isPending  = entry.correctionStatus === 'pending';
    const isApproved = entry.correctionStatus === 'approved';
    const isRejected = entry.correctionStatus === 'rejected';
    const showSeparator = shouldShowNameSeparator(entry, index);

    const renderName = (name: string = 'Unknown') => {
      if (!collaboratorSearch.trim()) return name;
      const query = collaboratorSearch.trim();
      const idx   = name.toLowerCase().indexOf(query.toLowerCase());
      if (idx === -1) return name;
      return (
        <>
          {name.slice(0, idx)}
          <mark className="bg-lucius-lime/30 text-bokara-grey rounded px-0.5">
            {name.slice(idx, idx + query.length)}
          </mark>
          {name.slice(idx + query.length)}
        </>
      );
    };

    return (
      <React.Fragment key={entry.id}>
        {/* Separador visual por nombre cuando se ordena alfabéticamente */}
        {showSeparator && (
          <tr className="bg-whisper-white/60">
            <td colSpan={userRole !== 'employee' ? 5 : 4} className="px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-bokara-grey text-white flex items-center justify-center text-[10px] font-bold">
                  {(entry.employeeName || '?')[0].toUpperCase()}
                </div>
                <span className="text-sm font-bold text-bokara-grey">{entry.employeeName}</span>
                <div className="flex-1 h-px bg-bokara-grey/10" />
              </div>
            </td>
          </tr>
        )}

        <tr className={`border-b border-gray-200 hover:bg-whisper-white/40 transition-colors ${isPending ? 'bg-yellow-50' : ''} ${entry.isManual ? 'bg-blue-50/30' : ''}`}>
          <td className="p-3 text-bokara-grey/80 font-mono text-sm whitespace-nowrap">
            {userRole !== 'employee' ? formatDate(entry.timestamp) : formatTime(entry.timestamp)}
            <div className="mt-1 flex items-center gap-1 flex-wrap">
              {entry.isManual && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-blue-100 text-blue-700">
                  Manual
                </span>
              )}
              {entry.correctionStatus && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                  isApproved ? 'bg-green-100 text-green-700' :
                  isRejected ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {isApproved ? 'Corregido' : isRejected ? 'Rechazado' : 'Pendiente'}
                </span>
              )}
            </div>
          </td>

          {userRole !== 'employee' && (
            <>
              <td className="p-3 text-bokara-grey/80 font-mono text-sm">{formatTime(entry.timestamp)}</td>
              <td className="p-3 text-bokara-grey">{renderName(entry.employeeName)}</td>
            </>
          )}
          {userRole === 'employee' && (
            <td className="p-3 text-bokara-grey/60 font-mono text-xs">{formatDate(entry.timestamp)}</td>
          )}

          <td className="p-3">
            <span className={`text-bokara-grey ${(entry.action || '').includes('Break') ? 'text-wet-sand' : ''}`}>
              {entry.action || '-'}
            </span>
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

          <td className="p-3 text-right whitespace-nowrap">
            <div className="flex justify-end items-center gap-2">
              {userRole !== 'employee' && onEditEntry && (
                <button
                  onClick={() => onEditEntry(entry)}
                  className={`p-1.5 rounded-full transition-colors relative ${isPending ? 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200' : 'text-bokara-grey/50 hover:text-lucius-lime hover:bg-whisper-white'}`}
                  title={isPending ? 'Revisar Solicitud' : 'Editar Registro'}
                >
                  {isPending && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                  <EditIcon className="w-5 h-5" />
                </button>
              )}
              {userRole !== 'employee' && onRemoveEntry && (
                <button
                  onClick={() => onRemoveEntry(entry)}
                  className="p-1.5 rounded-full transition-colors text-bokara-grey/30 hover:text-red-500 hover:bg-red-50"
                  title="Eliminar registro"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
              {userRole === 'employee' && onRequestCorrection && (
                <button
                  onClick={() => handleOpenRequest(entry)}
                  className={`p-1.5 rounded-full transition-colors flex items-center gap-1 ${
                    isPending ? 'text-yellow-600 bg-yellow-50 cursor-default' : 'text-bokara-grey/40 hover:text-lucius-lime hover:bg-whisper-white'
                  }`}
                  disabled={isPending}
                  title="Solicitar corrección"
                >
                  <span className="text-xs font-bold">{isPending ? 'En revisión' : 'Corregir'}</span>
                  <AlertIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </td>
        </tr>
      </React.Fragment>
    );
  };

  return (
    <>
      <div className="w-full bg-white rounded-xl shadow-md p-6 border border-bokara-grey/10 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-bokara-grey">{title}</h2>
            {userRole !== 'employee' && onCreateEntry && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-1.5 bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-1.5 px-3 rounded-lg transition-all shadow-sm text-sm"
                title="Crear registro manual"
              >
                <PlusIcon className="w-4 h-4" />
                Crear Registro
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {/* ── Búsqueda por colaborador ── */}
            {userRole !== 'employee' && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-bokara-grey/40">
                  <SearchIcon className="w-4 h-4" />
                </div>
                <input
                  type="search"
                  list="collaborator-list"
                  value={collaboratorSearch}
                  onChange={e => setCollaboratorSearch(e.target.value)}
                  placeholder="Buscar colaborador..."
                  className="bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg pl-9 pr-3 py-1 focus:outline-none focus:ring-2 focus:ring-lucius-lime w-52 text-sm"
                />
                {collaboratorSearch && (
                  <button
                    onClick={() => setCollaboratorSearch('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-bokara-grey/40 hover:text-bokara-grey"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <datalist id="collaborator-list">
                  {collaboratorNames.map(name => <option key={name} value={name} />)}
                </datalist>
              </div>
            )}

            {/* ── NUEVO: Selector de orden ── */}
            {userRole !== 'employee' && (
              <div className="flex items-center gap-1.5">
                <SortIcon className="w-4 h-4 text-bokara-grey/40" />
                <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSortMode(opt.value)}
                      title={opt.description}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                        sortMode === opt.value
                          ? 'bg-white text-bokara-grey shadow-sm'
                          : 'text-gray-500 hover:text-bokara-grey'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label htmlFor="startDate" className="text-sm text-lucius-lime flex-shrink-0">Desde:</label>
              <input type="date" id="startDate" value={dateRange.startDate}
                onChange={e => onDateRangeChange({ ...dateRange, startDate: e.target.value })}
                className="bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-lucius-lime w-full sm:w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="endDate" className="text-sm text-lucius-lime flex-shrink-0">Hasta:</label>
              <input type="date" id="endDate" value={dateRange.endDate}
                onChange={e => onDateRangeChange({ ...dateRange, endDate: e.target.value })}
                className="bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-lucius-lime w-full sm:w-auto"
              />
            </div>
            {isFiltered && (
              <button onClick={() => onDateRangeChange({ startDate: '', endDate: '' })} className="text-bokara-grey/60 hover:text-bokara-grey text-xs underline">
                Limpiar
              </button>
            )}
            {userRole !== 'employee' && (
              <button onClick={handleExport} disabled={entries.length === 0}
                className="bg-wet-sand hover:bg-opacity-80 disabled:bg-wet-sand/40 disabled:cursor-not-allowed text-bokara-grey font-bold py-1 px-3 rounded-lg transition-all duration-300 shadow-sm text-sm"
              >
                Export CSV
              </button>
            )}
          </div>
        </div>

        {userRole !== 'employee' && collaboratorSearch.trim() && (
          <div className="mb-3 text-xs text-bokara-grey/60">
            {displayEntries.length === 0
              ? `Sin resultados para "${collaboratorSearch}"`
              : `${displayEntries.length} registro${displayEntries.length !== 1 ? 's' : ''} para "${collaboratorSearch}"`}
          </div>
        )}

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          {displayEntries.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-bokara-grey/10 bg-gray-50 sticky top-0 z-10">
                  <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">
                    {userRole !== 'employee' ? 'Date' : 'Hora'}
                  </th>
                  {userRole !== 'employee' && (
                    <>
                      <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">Time</th>
                      <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">
                        <button
                          onClick={() => setSortMode(prev => prev === 'name-time' ? 'time' : 'name-time')}
                          className="flex items-center gap-1 hover:text-bokara-grey transition-colors"
                          title="Clic para alternar orden"
                        >
                          Colaborador
                          {(sortMode === 'name' || sortMode === 'name-time') && (
                            <span className="text-[10px]">▲</span>
                          )}
                        </button>
                      </th>
                    </>
                  )}
                  {userRole === 'employee' && (
                    <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">Fecha</th>
                  )}
                  <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">Acción</th>
                  <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider text-right">
                    {userRole !== 'employee' ? 'Actions' : 'Correcciones'}
                  </th>
                </tr>
              </thead>
              <tbody>{displayEntries.map((entry, index) => renderRow(entry, index))}</tbody>
            </table>
          ) : (
            <p className="text-center text-bokara-grey/60 py-8">
              {collaboratorSearch.trim()
                ? `No se encontró actividad para "${collaboratorSearch}".`
                : isFiltered ? 'No hay actividad en este rango de fechas.' : 'No hay actividad registrada hoy.'}
            </p>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          MODAL: Crear Registro Manual (admin/master)
      ══════════════════════════════════════════════════ */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-bokara-grey/60 flex items-center justify-center z-50 p-4" onClick={() => setCreateModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-bokara-grey/10 animate-fade-in" onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-bokara-grey">Crear Registro Manual</h3>
                <p className="text-xs text-bokara-grey/50 mt-0.5">Este registro quedará marcado como <span className="font-bold text-blue-600">Manual</span> en el log.</p>
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
                <select
                  value={createEmployeeId}
                  onChange={e => setCreateEmployeeId(e.target.value)}
                  required
                  className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg px-3 py-2.5 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime"
                >
                  <option value="" disabled>Seleccionar colaborador...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-lucius-lime uppercase tracking-widest mb-1">Acción</label>
                <select
                  value={createAction}
                  onChange={e => setCreateAction(e.target.value)}
                  required
                  className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg px-3 py-2.5 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime"
                >
                  {allActions.map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-lucius-lime uppercase tracking-widest mb-1">Fecha</label>
                  <input
                    type="date"
                    value={createDate}
                    onChange={e => setCreateDate(e.target.value)}
                    required
                    className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg px-3 py-2.5 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-lucius-lime uppercase tracking-widest mb-1">Hora</label>
                  <input
                    type="time"
                    value={createTime}
                    onChange={e => setCreateTime(e.target.value)}
                    required
                    className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg px-3 py-2.5 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime"
                  />
                </div>
              </div>

              {createDate && createTime && (
                <div className="bg-whisper-white rounded-lg px-3 py-2 text-xs text-bokara-grey/70 border border-bokara-grey/10">
                  <span className="font-bold text-bokara-grey">Se registrará: </span>
                  {new Date(`${createDate}T${createTime}:00`).toLocaleString('es-CO', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              )}

              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-semibold">
                  {createError}
                </div>
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
                    <>
                      <PlusIcon className="w-4 h-4" />
                      Crear Registro
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de corrección (empleados) */}
      {requestModalOpen && selectedEntry && (
        <div className="fixed inset-0 bg-bokara-grey bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setRequestModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-bokara-grey/10 animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-bokara-grey mb-1">Solicitar Corrección</h3>
            <div className="mb-4 px-3 py-2 bg-whisper-white rounded-lg border border-bokara-grey/10 text-xs text-bokara-grey/70">
              <span className="font-bold text-bokara-grey">Registro actual:</span>{' '}
              {new Date(selectedEntry.timestamp).toLocaleDateString('es-CO')} a las{' '}
              {new Date(selectedEntry.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              {' · '}<span className="font-medium">{selectedEntry.action}</span>
            </div>
            <form onSubmit={handleSubmitRequest} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-lucius-lime mb-1">Hora correcta</label>
                  <input type="time" value={suggestedTime} onChange={e => setSuggestedTime(e.target.value)}
                    className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg px-3 py-2 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-lucius-lime mb-1">Acción correcta</label>
                  <select value={suggestedAction} onChange={e => setSuggestedAction(e.target.value)}
                    className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg px-3 py-2 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime" required>
                    <option value="Clock In">Clock In</option>
                    <option value="Clock Out">Clock Out</option>
                    <option value="Start Break">Start Break</option>
                    <option value="End Break">End Break</option>
                    {activityStatuses.map(s => (
                      <React.Fragment key={s.id}>
                        <option value={`Start ${s.name}`}>Start {s.name}</option>
                        <option value={`End ${s.name}`}>End {s.name}</option>
                      </React.Fragment>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-lucius-lime mb-1">Motivo / Justificación</label>
                <textarea className="w-full h-24 bg-whisper-white border border-bokara-grey/20 rounded-lg p-3 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime resize-none"
                  placeholder="Ej: Olvidé marcar salida, el sistema falló..."
                  value={requestText} onChange={e => setRequestText(e.target.value)} required />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setRequestModalOpen(false)} className="px-4 py-2 bg-gray-200 text-bokara-grey rounded-lg hover:bg-gray-300 font-medium">Cancelar</button>
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