
import React, { useState, useMemo, useEffect } from 'react';
import { CalendarEvent, PayrollChangeType, Employee } from '../types';
import { FilterIcon, EditIcon } from '../components/Icons';

interface TicketingPageProps {
  events: CalendarEvent[];
  currentUser: Employee;
  payrollChangeTypes: PayrollChangeType[];
  employees: Employee[];
  onAddRequest: (requestData: Omit<CalendarEvent, 'id' | 'status'>) => void;
  onUpdateRequest: (event: CalendarEvent) => void;
  onRemoveRequest: (event: CalendarEvent) => void;
  onUpdateEventStatus?: (event: CalendarEvent, status: 'approved' | 'rejected') => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayOfMonth: number;
  events: {
    event: CalendarEvent;
    isMine: boolean;
    color: string;
    label: string;
  }[];
  isBlocked?: boolean;
}

const TicketingPage: React.FC<TicketingPageProps> = ({ events, currentUser, payrollChangeTypes, employees, onAddRequest, onUpdateRequest, onRemoveRequest, onUpdateEventStatus }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
    const [viewType, setViewType] = useState('');
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

    const [newRequestType, setNewRequestType] = useState('');
    const [newRequestStartDate, setNewRequestStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [newRequestEndDate, setNewRequestEndDate] = useState(new Date().toISOString().split('T')[0]);

    const handlePrevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    const handleToday = () => setCurrentDate(new Date());

    const employeeMap = useMemo(() => new Map((employees || []).map(e => [e.id, e.name])), [employees]);
    const eventColorMap = useMemo(() => {
        const map = new Map<string, string>();
        payrollChangeTypes.forEach(p => map.set(p.name, p.color));
        return map;
    }, [payrollChangeTypes]);

    const visibleTypes = useMemo(() => {
        if (!currentUser || currentUser.role === 'admin') return payrollChangeTypes;
        return payrollChangeTypes.filter(t => !t.adminOnly);
    }, [payrollChangeTypes, currentUser]);

    useEffect(() => {
        if (visibleTypes.length > 0) {
            if (!viewType || !visibleTypes.find(t => t.name === viewType)) setViewType(visibleTypes[0].name);
            if (!editingEvent && (!newRequestType || !visibleTypes.find(t => t.name === newRequestType))) setNewRequestType(visibleTypes[0].name);
        }
    }, [visibleTypes, viewType, newRequestType, editingEvent]);

    // --- LÓGICA DE VACACIONES (15 DÍAS POR CADA 360 LABORADOS) ---
    const vacationStats = useMemo(() => {
        if (!currentUser.hireDate) return { accrued: "0.00", taken: "0.0", pending: "0.00" };
        
        const start = new Date(currentUser.hireDate);
        const end = currentUser.terminationDate ? new Date(currentUser.terminationDate) : new Date();
        
        let d1 = start.getDate();
        let m1 = start.getMonth() + 1;
        let y1 = start.getFullYear();
        
        let d2 = end.getDate();
        let m2 = end.getMonth() + 1;
        let y2 = end.getFullYear();

        if (d1 === 31) d1 = 30;
        if (d2 === 31) d2 = 30;
        if (m1 === 2 && d1 >= 28) d1 = 30;
        if (m2 === 2 && d2 >= 28) d2 = 30;

        // Días contables base 360 (Inclusivo +1)
        const accountingDays = ((y2 - y1) * 360) + ((m2 - m1) * 30) + (d2 - d1) + 1;
        
        // Fórmula exacta para 15 días/año (Equivale a 1.25 por mes)
        const accruedBase = (accountingDays * 15) / 360;
        
        const adjustment = currentUser.manualVacationAdjustment || 0;

        let taken = 0;
        events.filter(e => e.employeeId === currentUser.id && (e.type === 'Vacation' || e.type === 'Vacaciones') && e.status === 'approved').forEach(e => {
            const s = new Date(e.startDate);
            const f = new Date(e.endDate);
            const duration = Math.ceil((f.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            taken += duration;
        });

        const pending = (accruedBase + adjustment) - taken;

        return {
            accrued: accruedBase.toFixed(2),
            taken: taken.toFixed(1),
            pending: pending.toFixed(2)
        };
    }, [currentUser, events]);

    // --- QUOTA VALIDATION ---
    const quotaInfo = useMemo(() => {
        const type = payrollChangeTypes.find(t => t.name === newRequestType);
        if (!type || !type.yearlyQuota) return null;

        const currentYear = new Date().getFullYear();
        const count = events.filter(e => 
            e.employeeId === currentUser.id && 
            e.type === newRequestType && 
            e.status !== 'rejected' &&
            new Date(e.startDate).getFullYear() === currentYear
        ).length;

        return { current: count, max: type.yearlyQuota };
    }, [newRequestType, events, currentUser.id, payrollChangeTypes]);

    const handleDayClick = (date: Date) => {
        setEditingEvent(null);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        setNewRequestStartDate(dateStr);
        setNewRequestEndDate(dateStr);
        setIsRequestModalOpen(true);
    };

    const handleEditRequest = (event: CalendarEvent) => {
        setEditingEvent(event);
        setNewRequestType(event.type);
        setNewRequestStartDate(event.startDate);
        setNewRequestEndDate(event.endDate);
        setIsRequestModalOpen(true);
    };

    const calendarGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const days: CalendarDay[] = [];
        let startDayOfWeek = firstDayOfMonth.getDay(); 
        startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; 
        for (let i = 0; i < startDayOfWeek; i++) {
            const date = new Date(firstDayOfMonth);
            date.setDate(date.getDate() - (startDayOfWeek - i));
            days.push({ date, isCurrentMonth: false, isToday: false, dayOfMonth: date.getDate(), events: [] });
        }
        const today = new Date();
        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
            const date = new Date(year, month, i);
            const isToday = date.toDateString() === today.toDateString();
            days.push({ date, isCurrentMonth: true, isToday, dayOfMonth: i, events: [] });
        }
        const remainingDays = 42 - days.length; 
        for (let i = 1; i <= remainingDays; i++) {
            const date = new Date(lastDayOfMonth);
            date.setDate(date.getDate() + i);
            days.push({ date, isCurrentMonth: false, isToday: false, dayOfMonth: date.getDate(), events: [] });
        }
        const selectedTypeConfig = payrollChangeTypes.find(t => t.name === viewType);
        events.forEach(event => {
            if (event.status === 'rejected') return;
            const startDate = new Date(event.startDate + 'T00:00:00');
            const endDate = new Date(event.endDate + 'T00:00:00');
            const isMine = event.employeeId === currentUser.id;
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dayStr = d.toISOString().split('T')[0];
                const dayInGrid = days.find(day => day.date.toISOString().split('T')[0] === dayStr);
                if (dayInGrid) {
                    if (!isMine && selectedTypeConfig?.isExclusive && event.type === viewType && event.status === 'approved') dayInGrid.isBlocked = true;
                    if (isMine) {
                        dayInGrid.events.push({
                            event, isMine: true, color: eventColorMap.get(event.type) || '#91A673',
                            label: event.status === 'pending' ? `${event.type} (Pendiente)` : event.type
                        });
                    }
                }
            }
        });
        return days;
    }, [currentDate, events, eventColorMap, currentUser.id, viewType, payrollChangeTypes]);

    const handleRequestSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingEvent) onUpdateRequest({ ...editingEvent, type: newRequestType, startDate: newRequestStartDate, endDate: newRequestEndDate, status: 'pending' });
        else onAddRequest({ employeeId: currentUser.id, type: newRequestType, startDate: newRequestStartDate, endDate: newRequestEndDate, status: 'pending' } as any);
        setIsRequestModalOpen(false);
    };

    const myRequests = useMemo(() => events.filter(e => e.employeeId === currentUser.id).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()), [events, currentUser.id]);
    const pendingRequests = useMemo(() => (events || []).filter(e => e.status === 'pending').sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()), [events]);

    return (
        <div className="w-full mx-auto animate-fade-in flex flex-col gap-6">
            
            {/* LIBRO DE VACACIONES - Resumen Horizontal */}
            <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6">
                <div className="flex flex-col sm:flex-row items-center justify-start gap-8 sm:gap-16">
                    <div className="text-left">
                        <p className="text-[10px] font-bold text-bokara-grey/50 uppercase tracking-widest mb-1">Total acumulados</p>
                        <p className="text-2xl font-bold text-bokara-grey">{vacationStats.accrued}</p>
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-bold text-bokara-grey/50 uppercase tracking-widest mb-1">Total tomados</p>
                        <p className="text-2xl font-bold text-wet-sand">{vacationStats.taken}</p>
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-bold text-bokara-grey/50 uppercase tracking-widest mb-1">Saldo actual</p>
                        <p className="text-2xl font-bold text-lucius-lime">{vacationStats.pending}</p>
                    </div>
                </div>
                {!currentUser.hireDate && (
                    <div className="mt-4 p-2 bg-yellow-50 text-yellow-700 text-xs rounded border border-yellow-100">
                        ⚠️ No se ha definido tu fecha de ingreso. Contacta a un administrador para habilitar el conteo de vacaciones.
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-bokara-grey">Tiquetera de Novedades</h1>
                <div className="flex gap-3">
                    {currentUser.role === 'admin' && (
                        <button onClick={() => setIsPendingModalOpen(true)} className="relative text-bokara-grey hover:bg-whisper-white p-2 rounded-lg transition-colors border border-transparent hover:border-bokara-grey/10">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            {pendingRequests.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>}
                        </button>
                    )}
                    <button onClick={() => { setEditingEvent(null); setIsRequestModalOpen(true); }} className="bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        <span>Solicitar Tiquete</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6 flex flex-col">
                    <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
                        <div className="bg-[#F3F0E9] p-3 rounded-2xl border border-[#E5E0D6] flex items-center gap-4 w-full shadow-sm">
                            <div className="bg-white p-3 rounded-xl shadow-sm text-lucius-lime border border-[#E5E0D6] flex-shrink-0"><FilterIcon className="w-6 h-6" /></div>
                            <div className="flex-grow min-w-0">
                                <label className="block text-[10px] font-bold text-lucius-lime uppercase tracking-widest mb-0.5">Vista de Calendario</label>
                                <select className="appearance-none bg-transparent font-bold text-bokara-grey text-lg w-full focus:outline-none" value={viewType} onChange={(e) => setViewType(e.target.value)}>
                                    {visibleTypes.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                             <button onClick={handlePrevMonth} className="p-1 rounded hover:bg-whisper-white transition-colors cursor-pointer"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>
                             <span className="text-lg font-bold capitalize w-32 text-center text-bokara-grey">{currentDate.toLocaleString('es-ES', { month: 'long' })} {currentDate.getFullYear()}</span>
                             <button onClick={handleNextMonth} className="p-1 rounded hover:bg-whisper-white transition-colors cursor-pointer"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></button>
                        </div>
                        <button onClick={handleToday} className="text-sm text-lucius-lime font-bold hover:underline bg-lucius-lime/10 px-3 py-1 rounded-full transition-colors cursor-pointer">Hoy</button>
                    </div>

                    <div className="grid grid-cols-7 text-center text-[10px] font-bold text-bokara-grey/40 uppercase mb-2">
                        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => <div key={d}>{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1 flex-grow">
                        {calendarGrid.map((day, idx) => (
                            <div key={idx} onClick={() => !day.isBlocked && handleDayClick(day.date)} className={`min-h-[80px] p-1 border rounded-md relative flex flex-col transition-colors ${day.isBlocked ? 'bg-gray-100 cursor-not-allowed' : (!day.isCurrentMonth ? 'bg-whisper-white/30 cursor-pointer hover:bg-white' : 'bg-white cursor-pointer hover:bg-lucius-lime/5')} ${day.isToday ? 'border-lucius-lime ring-1 ring-lucius-lime' : 'border-bokara-grey/10'}`}>
                                <div className={`text-xs text-right mb-1 ${day.isToday ? 'font-bold text-lucius-lime' : 'text-bokara-grey/50'}`}>{day.dayOfMonth}</div>
                                {day.isBlocked ? (
                                    <div className="flex-grow flex items-center justify-center">
                                        <span className="text-[9px] font-bold text-gray-400 bg-gray-200/50 px-1 py-0.5 rounded text-center leading-tight">OCUPADO</span>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {day.events.map((evt, i) => (
                                            <div key={i} className="text-[9px] p-1 rounded truncate font-bold text-white shadow-sm" style={{ backgroundColor: evt.color }} title={evt.label}>
                                                {evt.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6 flex flex-col">
                    <h3 className="font-bold text-bokara-grey mb-4 border-b border-bokara-grey/5 pb-2">Mis Solicitudes</h3>
                    <div className="space-y-3 overflow-y-auto flex-grow max-h-[500px] pr-1">
                        {myRequests.map(req => (
                            <div key={req.id} className="p-3 bg-whisper-white/50 rounded-lg border border-bokara-grey/5 hover:bg-whisper-white transition-colors group">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-sm text-bokara-grey">{req.type}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                        req.status === 'approved' ? 'bg-green-100 text-green-700' : 
                                        req.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                                        'bg-yellow-100 text-yellow-700'
                                    }`}>{req.status === 'approved' ? 'Aprobado' : req.status === 'rejected' ? 'Rechazado' : 'Pendiente'}</span>
                                </div>
                                <div className="text-[11px] text-bokara-grey/70 font-mono mt-1 flex justify-between items-center">
                                    <span>{req.startDate} ➜ {req.endDate}</span>
                                    {req.status === 'pending' && (
                                        <button onClick={() => handleEditRequest(req)} className="p-1 hover:bg-lucius-lime/10 rounded text-lucius-lime">
                                            <EditIcon className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {myRequests.length === 0 && <p className="text-center py-12 text-sm text-bokara-grey/40">No tienes solicitudes registradas.</p>}
                    </div>
                </div>
            </div>

            {/* Request Modal */}
            {isRequestModalOpen && (
                <div className="fixed inset-0 bg-bokara-grey bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in border border-bokara-grey/10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-bokara-grey">{editingEvent ? 'Editar Solicitud' : 'Nueva Solicitud'}</h2>
                            <button onClick={() => setIsRequestModalOpen(false)} className="text-bokara-grey/40 hover:text-bokara-grey"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleRequestSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-lucius-lime uppercase tracking-widest mb-1.5">Tipo de Novedad</label>
                                <select 
                                    className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg p-3 text-bokara-grey font-bold" 
                                    value={newRequestType} 
                                    onChange={e => setNewRequestType(e.target.value)}
                                >
                                    {visibleTypes.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                </select>
                                {quotaInfo && (
                                    <p className={`text-[10px] mt-2 font-bold ${quotaInfo.current >= quotaInfo.max ? 'text-red-500' : 'text-bokara-grey/40'}`}>
                                        Cupo anual: {quotaInfo.current} de {quotaInfo.max} utilizados este año.
                                    </p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-lucius-lime uppercase tracking-widest mb-1.5">Desde</label><input type="date" className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg p-3 text-sm" value={newRequestStartDate} onChange={e => setNewRequestStartDate(e.target.value)} required /></div>
                                <div><label className="block text-xs font-bold text-lucius-lime uppercase tracking-widest mb-1.5">Hasta</label><input type="date" className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg p-3 text-sm" value={newRequestEndDate} onChange={e => setNewRequestEndDate(e.target.value)} required /></div>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg text-[10px] text-blue-700 leading-relaxed font-medium">
                                ℹ️ Recuerda que según la ley, las vacaciones se deben tomar por un mínimo de 6 días consecutivos y no se cuentan domingos ni festivos para el descuento de tu saldo.
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => setIsRequestModalOpen(false)} className="px-5 py-2.5 bg-gray-100 rounded-lg font-bold text-bokara-grey text-sm">Cancelar</button>
                                <button 
                                    type="submit" 
                                    className="px-5 py-2.5 bg-lucius-lime text-bokara-grey font-bold rounded-lg hover:bg-opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                                    disabled={quotaInfo ? quotaInfo.current >= quotaInfo.max && !editingEvent : false}
                                >
                                    {editingEvent ? 'Actualizar Solicitud' : 'Enviar Solicitud'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Pending Requests Modal (Admin View) */}
            {isPendingModalOpen && (
                <div className="fixed inset-0 bg-bokara-grey bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setIsPendingModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold mb-6 text-bokara-grey">Solicitudes Pendientes</h2>
                        {pendingRequests.length === 0 ? <p className="text-center py-8 text-bokara-grey/40">No hay tiquetes pendientes por aprobar.</p> : 
                        <div className="space-y-4">
                            {pendingRequests.map(req => (
                                <div key={req.id} className="bg-whisper-white/50 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4 border border-bokara-grey/5">
                                    <div className="text-center sm:text-left">
                                        <p className="font-bold text-lg text-bokara-grey">{employeeMap.get(req.employeeId) || 'Desconocido'}</p>
                                        <p className="text-sm text-bokara-grey/70 font-medium">{req.type}: {req.startDate} al {req.endDate}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => onUpdateEventStatus?.(req, 'rejected')} className="px-4 py-2 bg-red-100 text-red-700 font-bold rounded-lg hover:bg-red-200 text-sm">Rechazar</button>
                                        <button onClick={() => onUpdateEventStatus?.(req, 'approved')} className="px-4 py-2 bg-green-100 text-green-700 font-bold rounded-lg hover:bg-green-200 text-sm">Aprobar</button>
                                    </div>
                                </div>
                            ))}
                        </div>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TicketingPage;
