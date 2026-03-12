import React, { useState, useMemo } from 'react';
import { CalendarEvent, Employee, PayrollChangeType } from '../types';
import { EditIcon, TrashIcon } from '../components/Icons';

interface SchedulePageProps {
  events: CalendarEvent[];
  employees: Employee[];
  payrollChangeTypes: PayrollChangeType[];
  onAddEvent: () => void;
  onEditEvent: (event: CalendarEvent) => void;
  onRemoveEvent: (event: CalendarEvent) => void;
  onUpdateEventStatus?: (event: CalendarEvent, status: 'approved' | 'rejected') => void;
  onBulkImport?: (events: Omit<CalendarEvent, 'id'>[]) => Promise<void>;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayOfMonth: number;
  events: {
    event: CalendarEvent;
    employeeName: string;
    color: string;
    isPending: boolean;
  }[];
}

const MAX_VISIBLE_EVENTS = 3;

const SchedulePage: React.FC<SchedulePageProps> = ({ events = [], employees = [], payrollChangeTypes = [], onAddEvent, onEditEvent, onRemoveEvent, onUpdateEventStatus, onBulkImport }) => {
    const [currentDate, setCurrentDate] = useState(new Date()); 
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [viewMode, setViewMode] = useState<'calendar' | 'report'>('calendar');
    const [searchTerm, setSearchTerm] = useState('');
    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importRows, setImportRows] = useState<{ emp: string; type: string; start: string; end: string; status: 'ok'|'err'; msg: string }[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [dayModalData, setDayModalData] = useState<CalendarDay | null>(null);

    const employeeMap = useMemo(() => new Map((employees || []).map(e => [e.id, e.name])), [employees]);
    
    const eventColorMap = useMemo(() => {
        const map = new Map<string, string>();
        (payrollChangeTypes || []).forEach(p => map.set(p.name, p.color));
        return map;
    }, [payrollChangeTypes]);

    const pendingRequests = useMemo(() => (events || []).filter(e => e.status === 'pending'), [events]);

    const filteredEvents = useMemo(() => {
        if (!searchTerm.trim()) return events;
        const lowerTerm = searchTerm.toLowerCase();
        const matchingEmployeeIds = employees.filter(e => e.name.toLowerCase().includes(lowerTerm)).map(e => e.id);
        return events.filter(e => matchingEmployeeIds.includes(e.employeeId));
    }, [events, employees, searchTerm]);

    // ── Import helpers ──────────────────────────────────────────────────────
    const downloadTemplate = () => {
        const header = 'Colaborador,Novedad,Fecha Inicio (YYYY-MM-DD),Fecha Fin (YYYY-MM-DD)';
        const example = employees.slice(0, 2).map((e, i) => {
            const t = payrollChangeTypes[i % payrollChangeTypes.length]?.name ?? 'Reserve Holiday';
            return `${e.name},${t},2026-01-15,2026-01-15`;
        }).join('\n') || 'Juan Perez,Reserve Holiday,2026-01-15,2026-01-17';
        const blob = new Blob([header + '\n' + example], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'plantilla_novedades.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const lines = text.split(/\r?\n/).filter(Boolean);
            const dataLines = lines[0]?.toLowerCase().includes('colaborador') ? lines.slice(1) : lines;
            const empMap  = new Map(employees.map(emp => [emp.name.trim().toLowerCase(), emp]));
            const typeMap = new Map(payrollChangeTypes.map(t => [t.name.trim().toLowerCase(), t]));
            const parsed = dataLines.map(line => {
                const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                const [empRaw, typeRaw, start, end] = cols;
                const emp  = empMap.get(empRaw?.toLowerCase() ?? '');
                const type = typeMap.get(typeRaw?.toLowerCase() ?? '');
                if (!emp)  return { emp: empRaw, type: typeRaw, start, end, status: 'err' as const, msg: `Colaborador "${empRaw}" no encontrado` };
                if (!type) return { emp: empRaw, type: typeRaw, start, end, status: 'err' as const, msg: `Novedad "${typeRaw}" no existe` };
                if (!start?.match(/^\d{4}-\d{2}-\d{2}/)) return { emp: empRaw, type: typeRaw, start, end, status: 'err' as const, msg: 'Fecha inválida (usa YYYY-MM-DD)' };
                const endDate = end?.match(/^\d{4}-\d{2}-\d{2}/) ? end : start;
                return { emp: emp.name, type: type.name, start, end: endDate, status: 'ok' as const, msg: '' };
            });
            setImportRows(parsed);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleConfirmImport = async () => {
        if (!onBulkImport) return;
        const valid = importRows.filter(r => r.status === 'ok');
        if (!valid.length) return;
        setIsImporting(true);
        try {
            const empMap = new Map(employees.map(e => [e.name, e]));
            await onBulkImport(valid.map(r => ({
                employeeId: empMap.get(r.emp)!.id,
                type: r.type,
                startDate: r.start,
                endDate: r.end,
                status: 'approved' as const,
                createdAt: Date.now(),
            })) as any);
            setIsImportModalOpen(false);
            setImportRows([]);
        } finally { setIsImporting(false); }
    };

    // ── Stats ───────────────────────────────────────────────────────────────
    const annualStats = useMemo(() => {
        const yearEvents = filteredEvents.filter(e => new Date(e.startDate).getFullYear() === selectedYear && e.status !== 'rejected');
        const totalEvents = yearEvents.length;
        const uniqueEmployees = new Set(yearEvents.map(e => e.employeeId)).size;
        const typeCounts: Record<string, number> = {};
        yearEvents.forEach(e => { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1; });
        const statsList = Object.entries(typeCounts)
            .map(([type, count]) => ({ type, count, percentage: totalEvents > 0 ? (count / totalEvents) * 100 : 0, color: eventColorMap.get(type) || '#91A673' }))
            .sort((a, b) => b.count - a.count);
        return { totalEvents, uniqueEmployees, statsList };
    }, [filteredEvents, selectedYear, eventColorMap]);

    const reportMatrix = useMemo(() => {
        const relevantEmployees = searchTerm ? employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())) : employees;
        return relevantEmployees.map(emp => {
            const empEvents = events.filter(e => e.employeeId === emp.id && new Date(e.startDate).getFullYear() === selectedYear && e.status === 'approved');
            const counts: Record<string, number> = {}; let total = 0;
            empEvents.forEach(e => {
                const diffDays = Math.ceil(Math.abs(new Date(e.endDate).getTime() - new Date(e.startDate).getTime()) / 86400000) + 1;
                counts[e.type] = (counts[e.type] || 0) + diffDays; total += diffDays;
            });
            return { id: emp.id, name: emp.name, totalDays: total, breakdown: counts };
        }).sort((a, b) => b.totalDays - a.totalDays);
    }, [employees, events, selectedYear, searchTerm]);

    const handlePrevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    const handleToday = () => { const now = new Date(); setCurrentDate(now); setSelectedYear(now.getFullYear()); };

    const calendarGrid = useMemo(() => {
        const year = currentDate.getFullYear(); const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1); const lastDayOfMonth = new Date(year, month + 1, 0);
        const days: CalendarDay[] = [];
        let startDayOfWeek = firstDayOfMonth.getDay(); startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
        for (let i = 0; i < startDayOfWeek; i++) { const date = new Date(firstDayOfMonth); date.setDate(date.getDate() - (startDayOfWeek - i)); days.push({ date, isCurrentMonth: false, isToday: false, dayOfMonth: date.getDate(), events: [] }); }
        const today = new Date();
        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) { const date = new Date(year, month, i); days.push({ date, isCurrentMonth: true, isToday: date.toDateString() === today.toDateString(), dayOfMonth: i, events: [] }); }
        for (let i = 1; i <= 42 - days.length; i++) { const date = new Date(lastDayOfMonth); date.setDate(date.getDate() + i); days.push({ date, isCurrentMonth: false, isToday: false, dayOfMonth: date.getDate(), events: [] }); }
        filteredEvents.forEach(event => {
            if (event.status === 'rejected') return;
            const startDate = new Date(event.startDate + 'T00:00:00'); const endDate = new Date(event.endDate + 'T00:00:00');
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dayStr = d.toISOString().split('T')[0];
                const dayInGrid = days.find(day => day.date.toISOString().split('T')[0] === dayStr);
                if (dayInGrid) dayInGrid.events.push({ event, employeeName: employeeMap.get(event.employeeId) || 'Unknown', color: eventColorMap.get(event.type) || '#91A673', isPending: event.status === 'pending' });
            }
        });
        const weeks = []; for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
        return weeks;
    }, [currentDate, filteredEvents, employeeMap, eventColorMap]);

    const monthName = currentDate.toLocaleString('es-ES', { month: 'long' });
    const year = currentDate.getFullYear();
    const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i);

    return (
        <div className="w-full mx-auto animate-fade-in text-bokara-grey flex flex-col lg:flex-row h-[calc(100vh-100px)] gap-6">
            
            {/* ── SIDEBAR ── */}
            <div className="w-full lg:w-80 bg-white p-6 rounded-xl shadow-md border border-bokara-grey/10 flex flex-col gap-6 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                    <svg className="w-6 h-6 text-bokara-grey" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    <h2 className="text-xl font-bold">Resumen</h2>
                </div>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-bokara-grey/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <select value={selectedYear} onChange={(e) => { const val = Number(e.target.value); setSelectedYear(val); setCurrentDate(new Date(val, currentDate.getMonth(), 1)); }}
                        className="w-full pl-10 pr-4 py-2 bg-[#FFF9F0] border border-bokara-grey/10 rounded-lg appearance-none font-bold text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime cursor-pointer">
                        {years.map(y => <option key={y} value={y}>Año: {y}</option>)}
                    </select>
                </div>
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-800 font-semibold uppercase mb-1">Total Novedades</p>
                    <p className="text-3xl font-bold text-blue-600">{annualStats.totalEvents}</p>
                </div>
                <div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
                    <p className="text-xs text-green-800 font-semibold uppercase mb-1">Empleados con Novedades</p>
                    <p className="text-3xl font-bold text-green-600">{annualStats.uniqueEmployees}</p>
                </div>
                <div className="flex-grow">
                    <h3 className="font-bold text-sm text-bokara-grey mb-4 flex items-center gap-2">
                        <span className="w-1 h-4 bg-lucius-lime rounded-full"></span>Detalle por Tipo
                    </h3>
                    <div className="space-y-4 pr-1">
                        {annualStats.statsList.map(stat => (
                            <div key={stat.type} className="group">
                                <div className="flex justify-between text-xs mb-1 font-medium text-bokara-grey">
                                    <span>{stat.type}</span>
                                    <span className="text-bokara-grey/60">{stat.count} ({stat.percentage.toFixed(1)}%)</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                    <div className="h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${stat.percentage}%`, backgroundColor: stat.color }} />
                                </div>
                            </div>
                        ))}
                        {annualStats.statsList.length === 0 && <p className="text-xs text-bokara-grey/40 text-center py-4">No hay datos registrados en este año.</p>}
                    </div>
                </div>
                <div className="mt-auto bg-gray-50 p-3 rounded-lg border border-gray-100 text-[10px] text-gray-500">
                    <p><strong>Rango:</strong> 1/1/{selectedYear} - 31/12/{selectedYear}</p>
                    <p>Total Registros: {filteredEvents.length}</p>
                </div>
            </div>

            {/* ── MAIN PANEL ── */}
            <div className="flex-grow flex flex-col bg-white p-6 rounded-xl shadow-md border border-bokara-grey/10 overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                            <input type="text" placeholder="Buscar empleado..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-whisper-white/50 border border-bokara-grey/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-lucius-lime transition-all" />
                            <svg className="w-5 h-5 text-bokara-grey/40 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <div className="flex bg-whisper-white/50 p-1 rounded-lg border border-bokara-grey/10">
                            <button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${viewMode === 'calendar' ? 'bg-white shadow-sm text-bokara-grey' : 'text-bokara-grey/50 hover:text-bokara-grey'}`}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                Calendario
                            </button>
                            <button onClick={() => setViewMode('report')} className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${viewMode === 'report' ? 'bg-white shadow-sm text-bokara-grey' : 'text-bokara-grey/50 hover:text-bokara-grey'}`}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                Tabla Anual
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsPendingModalOpen(true)} className="relative text-bokara-grey hover:bg-whisper-white p-2 rounded-lg transition-colors border border-transparent hover:border-bokara-grey/10" title="Solicitudes Pendientes">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            {pendingRequests.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />}
                        </button>
                        {onBulkImport && (
                            <button onClick={() => setIsImportModalOpen(true)}
                                className="border border-gray-300 text-bokara-grey hover:border-bokara-grey hover:bg-gray-50 font-bold py-2 px-4 rounded-lg transition-all flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                                Importar
                            </button>
                        )}
                        <button onClick={onAddEvent} className="bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg transition-all shadow-sm flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            <span>Nueva Novedad</span>
                        </button>
                    </div>
                </div>

                {/* ── CALENDARIO ── */}
                {viewMode === 'calendar' && (
                    <div className="flex flex-col h-full overflow-hidden animate-fade-in">
                        <div className="flex items-center justify-between mb-4 bg-whisper-white/20 p-2 rounded-lg border border-bokara-grey/5">
                            <div className="flex items-center gap-1">
                                <button onClick={handlePrevMonth} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>
                                <span className="text-lg font-bold w-48 text-center capitalize text-bokara-grey">{monthName} {year}</span>
                                <button onClick={handleNextMonth} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></button>
                            </div>
                            <button onClick={handleToday} className="text-sm font-semibold text-lucius-lime hover:underline px-3">Hoy</button>
                        </div>
                        <div className="flex-grow grid grid-cols-7 border-t border-l border-bokara-grey/20 bg-[#FFF9F0] overflow-y-auto">
                            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                                <div key={day} className="text-center font-semibold p-2 border-b border-bokara-grey/20 text-sm text-bokara-grey/80 bg-whisper-white sticky top-0 z-10">{day}</div>
                            ))}
                            {calendarGrid.flat().map((day, index) => {
                                const visibleEvents = day.events.slice(0, MAX_VISIBLE_EVENTS);
                                const hiddenCount = day.events.length - MAX_VISIBLE_EVENTS;
                                return (
                                    <div key={index} onClick={() => setDayModalData(day)}
                                        className={`relative p-2 border-b border-r border-bokara-grey/20 min-h-[140px] flex flex-col transition-colors cursor-pointer hover:bg-blue-50/20 ${!day.isCurrentMonth ? 'bg-gray-50/50' : 'bg-white'}`}>
                                        <div className="flex-shrink-0 mb-1 flex justify-between items-start">
                                            <span className={`text-sm inline-flex items-center justify-center w-7 h-7 rounded-full ${day.isToday ? 'bg-red-500 text-white font-bold shadow-sm' : (day.isCurrentMonth ? 'text-bokara-grey/80 font-semibold' : 'text-bokara-grey/40')}`}>{day.dayOfMonth}</span>
                                        </div>
                                        <div className="flex-grow flex flex-col gap-1 overflow-hidden">
                                            {visibleEvents.map(({ event, employeeName, color, isPending }) => (
                                                <div key={`${event.id}-${day.date}`}
                                                    className={`group relative px-2 py-1 rounded text-xs font-medium shadow-sm flex items-center justify-between cursor-pointer hover:opacity-80 transition-all ${isPending ? 'border border-dashed border-bokara-grey/40' : 'text-white'}`}
                                                    style={{ backgroundColor: isPending ? '#f3f4f6' : color, color: isPending ? '#374151' : 'white' }}
                                                    onClick={(e) => { e.stopPropagation(); setDayModalData(day); }}
                                                    title={`${employeeName}: ${event.type}`}>
                                                    <span className="truncate w-full flex gap-1">
                                                        <span className="font-bold truncate">{employeeName}</span>
                                                        <span className="opacity-90 truncate flex-shrink-0 font-normal">- {event.type}</span>
                                                    </span>
                                                </div>
                                            ))}
                                            {hiddenCount > 0 && (
                                                <div className="mt-auto pt-1">
                                                    <span className="text-[10px] font-bold text-bokara-grey/60 bg-bokara-grey/5 hover:bg-bokara-grey/10 px-2 py-1 rounded w-full block text-center transition-colors">+ {hiddenCount} más</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── TABLA ANUAL ── */}
                {viewMode === 'report' && (
                    <div className="flex flex-col h-full overflow-hidden animate-fade-in">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-bokara-grey">Reporte Anual {selectedYear}</h3>
                            <div className="flex gap-4 text-xs text-bokara-grey/60">
                                {payrollChangeTypes.map(type => (
                                    <div key={type.id} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{backgroundColor: type.color}} /><span>{type.name}</span></div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-grow overflow-auto border border-bokara-grey/10 rounded-lg">
                            <table className="w-full text-sm text-left text-bokara-grey">
                                <thead className="text-xs text-bokara-grey/70 uppercase bg-gray-50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-3 font-bold">Empleado</th>
                                        <th className="px-6 py-3 text-center bg-blue-50/50 text-blue-700 font-bold">Total Días</th>
                                        {payrollChangeTypes.map(type => <th key={type.id} className="px-6 py-3 text-center border-l border-gray-100">{type.name}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportMatrix.map((row) => (
                                        <tr key={row.id} className="bg-white border-b border-gray-50 hover:bg-whisper-white/30 transition-colors">
                                            <td className="px-6 py-3 font-medium text-bokara-grey whitespace-nowrap">{row.name}</td>
                                            <td className="px-6 py-3 text-center font-bold text-blue-600 bg-blue-50/10">{row.totalDays}</td>
                                            {payrollChangeTypes.map(type => (
                                                <td key={type.id} className="px-6 py-3 text-center border-l border-gray-50 text-bokara-grey/80">
                                                    {row.breakdown[type.name] ? <span className="inline-block py-0.5 px-2 rounded-md bg-gray-100 font-semibold text-xs">{row.breakdown[type.name]}</span> : <span className="text-gray-300">-</span>}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {reportMatrix.length === 0 && <tr><td colSpan={payrollChangeTypes.length + 2} className="px-6 py-8 text-center text-bokara-grey/50">No se encontraron registros para este filtro.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* ── MODAL PENDIENTES ── */}
            {isPendingModalOpen && (
                <div className="fixed inset-0 bg-bokara-grey bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setIsPendingModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-bokara-grey">Solicitudes Pendientes</h2>
                            <button onClick={() => setIsPendingModalOpen(false)} className="text-bokara-grey/50 hover:text-bokara-grey"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        {!pendingRequests || pendingRequests.length === 0 ? (
                            <p className="text-center text-bokara-grey/60 py-8">No hay solicitudes pendientes.</p>
                        ) : (
                            <div className="space-y-4">
                                {pendingRequests.map(request => (
                                    <div key={request.id} className="bg-whisper-white/50 p-4 rounded-lg border border-bokara-grey/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div>
                                            <p className="font-bold text-lg text-bokara-grey">{employeeMap.get(request.employeeId) || 'Desconocido'}</p>
                                            <p className="text-bokara-grey/80"><span className="font-semibold">{request.type}</span>: {request.startDate} al {request.endDate}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => onUpdateEventStatus && onUpdateEventStatus(request, 'rejected')} className="px-3 py-1.5 bg-red-100 text-red-700 font-semibold rounded hover:bg-red-200 transition">Rechazar</button>
                                            <button onClick={() => onUpdateEventStatus && onUpdateEventStatus(request, 'approved')} className="px-3 py-1.5 bg-green-100 text-green-700 font-semibold rounded hover:bg-green-200 transition">Aprobar</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── MODAL DÍA ── */}
            {dayModalData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bokara-grey/50 backdrop-blur-sm" onClick={() => setDayModalData(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
                        <div className="bg-whisper-white p-4 border-b border-bokara-grey/10 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-bokara-grey capitalize">{dayModalData.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                                <p className="text-sm text-bokara-grey/60">{dayModalData.events.length} Novedades</p>
                            </div>
                            <button onClick={() => setDayModalData(null)} className="p-2 hover:bg-white rounded-full transition-colors text-bokara-grey/60 hover:text-bokara-grey">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
                            {dayModalData.events.length === 0 ? (
                                <p className="text-center text-bokara-grey/50 py-8">No hay novedades para este día.</p>
                            ) : dayModalData.events.map(({ event, employeeName, color, isPending }, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-bokara-grey/5 bg-white shadow-sm hover:shadow-md transition-shadow">
                                    <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: color }} />
                                    <div className="flex-grow">
                                        <h4 className="font-bold text-bokara-grey">{employeeName}</h4>
                                        <p className="text-sm text-bokara-grey/70">{event.type}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isPending && <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-1 rounded-full uppercase mr-2">Pendiente</span>}
                                        <button onClick={() => { setDayModalData(null); onEditEvent(event); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors" title="Editar"><EditIcon className="w-4 h-4" /></button>
                                        <button onClick={() => { if(window.confirm('¿Estás seguro de que deseas eliminar esta novedad?')) { onRemoveEvent(event); setDayModalData(prev => prev ? ({ ...prev, events: prev.events.filter(e => e.event.id !== event.id) }) : null); } }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Eliminar"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-bokara-grey/10 flex justify-end">
                            <button onClick={() => { setDayModalData(null); onAddEvent(); }} className="text-sm font-bold text-bokara-grey hover:text-lucius-lime transition-colors flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                Agregar Novedad
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL IMPORTACIÓN ── */}
            {isImportModalOpen && (
                <div className="fixed inset-0 bg-bokara-grey/60 flex items-center justify-center z-50 p-4" onClick={() => { setIsImportModalOpen(false); setImportRows([]); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-bokara-grey">Importar Novedades</h3>
                                <p className="text-sm text-bokara-grey/50 mt-0.5">Sube un archivo CSV con el historial de novedades</p>
                            </div>
                            <button onClick={() => { setIsImportModalOpen(false); setImportRows([]); }} className="text-bokara-grey/30 hover:text-bokara-grey text-2xl">&times;</button>
                        </div>
                        <div className="p-6 flex flex-col gap-5 overflow-y-auto">
                            {/* Paso 1 */}
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
                                <div className="p-2 bg-white border border-gray-200 rounded-lg text-bokara-grey/50 flex-shrink-0">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-bokara-grey text-sm">Paso 1 — Descarga la plantilla</p>
                                    <p className="text-xs text-bokara-grey/50 mt-0.5">Formato: <span className="font-mono bg-white border border-gray-200 px-1 rounded">Colaborador, Novedad, Fecha Inicio, Fecha Fin</span></p>
                                    <p className="text-xs text-bokara-grey/40 mt-1">Fechas en formato <strong className="text-bokara-grey/60">YYYY-MM-DD</strong>. Si es un solo día, repite la misma fecha.</p>
                                    <button onClick={downloadTemplate} className="mt-2 flex items-center gap-1.5 text-xs font-bold text-bokara-grey hover:underline">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                        Descargar plantilla_novedades.csv
                                    </button>
                                </div>
                            </div>
                            {/* Tipos */}
                            <div>
                                <p className="text-xs font-bold text-bokara-grey/70 mb-1.5">Novedades disponibles (copia exactamente como aparecen):</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {payrollChangeTypes.map(t => (
                                        <span key={t.id} className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold border border-gray-200 bg-white text-bokara-grey">{t.name}</span>
                                    ))}
                                </div>
                            </div>
                            {/* Paso 2 */}
                            <div>
                                <p className="font-bold text-bokara-grey text-sm mb-2">Paso 2 — Sube tu archivo CSV</p>
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-bokara-grey/40 hover:bg-gray-50 transition-all">
                                    <svg className="w-7 h-7 text-bokara-grey/20 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                                    <span className="text-sm text-bokara-grey/40">Haz clic o arrastra tu archivo .csv aquí</span>
                                    <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
                                </label>
                            </div>
                            {/* Preview */}
                            {importRows.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="font-bold text-bokara-grey text-sm">
                                            Vista previa —{' '}
                                            <span className="text-green-700">{importRows.filter(r => r.status === 'ok').length} válidas</span>
                                            {importRows.filter(r => r.status === 'err').length > 0 && <span className="text-red-500"> · {importRows.filter(r => r.status === 'err').length} con error</span>}
                                        </p>
                                        <button onClick={() => setImportRows([])} className="text-xs text-gray-400 hover:text-gray-600">Limpiar</button>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                                        {importRows.map((row, i) => (
                                            <div key={i} className={`flex items-center gap-3 px-3 py-2 text-xs ${row.status === 'err' ? 'bg-red-50/60' : ''}`}>
                                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-white font-black text-[9px] flex-shrink-0 ${row.status === 'ok' ? 'bg-green-500' : 'bg-red-400'}`}>{row.status === 'ok' ? '✓' : '!'}</span>
                                                <span className="font-semibold text-bokara-grey truncate w-28 flex-shrink-0">{row.emp}</span>
                                                <span className="text-bokara-grey/50 truncate flex-1">{row.type}</span>
                                                <span className="font-mono text-bokara-grey/40 flex-shrink-0">{row.start}{row.end !== row.start ? ` → ${row.end}` : ''}</span>
                                                {row.msg && <span className="text-red-400 flex-shrink-0 text-[10px]">{row.msg}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => { setIsImportModalOpen(false); setImportRows([]); }} className="px-4 py-2 bg-gray-100 rounded-lg font-bold text-bokara-grey text-sm">Cancelar</button>
                            <button onClick={handleConfirmImport} disabled={isImporting || importRows.filter(r => r.status === 'ok').length === 0}
                                className="px-4 py-2 bg-lucius-lime text-bokara-grey font-bold rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                {isImporting ? 'Importando...' : `Importar ${importRows.filter(r => r.status === 'ok').length} novedades`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SchedulePage;