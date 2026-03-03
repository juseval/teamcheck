import React, { useState, useMemo, useEffect } from 'react';
import { CalendarEvent, PayrollChangeType, Employee } from '../types';
import { EditIcon, TrashIcon } from '../components/Icons';
import { useNotification } from '../contexts/NotificationContext';
import { getNotificationRecipients, getEmailConfig } from '../services/apiService';

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
  isPast: boolean;
  events: {
    event: CalendarEvent;
    isMine: boolean;
    color: string;
    label: string;
  }[];
  isBlocked?: boolean;
}

const TicketingPage: React.FC<TicketingPageProps> = ({ events, currentUser, payrollChangeTypes, employees, onAddRequest, onUpdateRequest, onRemoveRequest, onUpdateEventStatus }) => {
    const { addNotification } = useNotification();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [viewType, setViewType] = useState('');
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

    const [newRequestType, setNewRequestType] = useState('');
    const [newRequestStartDate, setNewRequestStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [newRequestEndDate, setNewRequestEndDate] = useState(new Date().toISOString().split('T')[0]);

    const handlePrevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    const handleToday = () => setCurrentDate(new Date());

    const eventColorMap = useMemo(() => {
        const map = new Map<string, string>();
        payrollChangeTypes.forEach(p => map.set(p.name, p.color));
        return map;
    }, [payrollChangeTypes]);

    const visibleTypes = useMemo(() => {
        if (!currentUser || currentUser.role === 'admin' || currentUser.role === 'master') return payrollChangeTypes;
        return payrollChangeTypes.filter(t => !t.adminOnly);
    }, [payrollChangeTypes, currentUser]);

    useEffect(() => {
        if (visibleTypes.length > 0) {
            if (!viewType || !visibleTypes.find(t => t.name === viewType)) setViewType(visibleTypes[0].name);
            if (!editingEvent && (!newRequestType || !visibleTypes.find(t => t.name === newRequestType))) setNewRequestType(visibleTypes[0].name);
        }
    }, [visibleTypes, viewType, newRequestType, editingEvent]);

    // --- LÓGICA DE VACACIONES ---
    const vacationStats = useMemo(() => {
        if (!currentUser.hireDate) return { accrued: 0, taken: 0, compensated: 0, balance: 0, maxCompensable: 0 };
        const start = new Date(currentUser.hireDate);
        const end = currentUser.terminationDate ? new Date(currentUser.terminationDate) : new Date();
        let d1 = start.getDate(); const m1 = start.getMonth() + 1; const y1 = start.getFullYear();
        let d2 = end.getDate(); const m2 = end.getMonth() + 1; const y2 = end.getFullYear();
        if (d1 === 31) d1 = 30; if (d2 === 31) d2 = 30;
        if (m1 === 2 && d1 >= 28) d1 = 30; if (m2 === 2 && d2 >= 28) d2 = 30;
        const accountingDays = ((y2 - y1) * 360) + ((m2 - m1) * 30) + (d2 - d1) + 1;
        const totalAccrued = ((accountingDays * 15) / 360) + (currentUser.manualVacationAdjustment || 0);
        let taken = 0; let compensated = 0;
        events.filter(e => e.employeeId === currentUser.id && e.status === 'approved').forEach(e => {
            const duration = Math.ceil((new Date(e.endDate).getTime() - new Date(e.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
            if (e.type === 'Vacation' || e.type === 'Vacaciones') taken += duration;
            if (e.type === 'Vacaciones (Dinero)' || e.type === 'Compensación') compensated += duration;
        });
        const balance = totalAccrued - taken - compensated;
        const maxMoneyLegal = (totalAccrued / 2) - compensated;
        return { accrued: totalAccrued, taken, compensated, balance, maxCompensable: Math.max(0, maxMoneyLegal) };
    }, [currentUser, events]);

    // --- HELPER PARA ENVIAR CORREOS ---
    const sendEmail = async (recipients: string[], subjectUser: string, type: string, start: string, end: string, statusInfo?: string) => {
        try {
            const config = await getEmailConfig();
            const hasKeys = config?.serviceId && config?.templateId && config?.publicKey;

            if (recipients.length > 0 && hasKeys) {
                const emailPromises = recipients.map(email => {
                    return fetch('https://api.emailjs.com/api/v1.0/email/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            service_id: config.serviceId,
                            template_id: config.templateId,
                            user_id: config.publicKey,
                            template_params: {
                                recipient_email: email,
                                user_name: subjectUser,
                                // Si hay statusInfo (ej: APROBADO), lo concatenamos al tipo para que se vea en el asunto/cuerpo
                                request_type: statusInfo ? `${statusInfo}: ${type}` : type, 
                                start_date: start,
                                end_date: end
                            }
                        })
                    });
                });
                await Promise.allSettled(emailPromises);
                return true;
            }
            return false;
        } catch (e) {
            console.error("Error enviando email", e);
            return false;
        }
    };

    const handleDayClick = (date: Date, isPast: boolean) => {
        if (isPast) return;
        const dateStr = date.toISOString().split('T')[0];
        setNewRequestStartDate(dateStr);
        setNewRequestEndDate(dateStr);
        setEditingEvent(null);
        setIsRequestModalOpen(true);
    };

    const handleEditRequest = (event: CalendarEvent) => {
        setEditingEvent(event);
        setNewRequestType(event.type);
        setNewRequestStartDate(event.startDate);
        setNewRequestEndDate(event.endDate);
        setIsRequestModalOpen(true);
    };

    // --- LÓGICA DE CALENDARIO ---
    const calendarGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const days: CalendarDay[] = [];
        let startDayOfWeek = firstDayOfMonth.getDay(); 
        startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; 
        const today = new Date(); today.setHours(0,0,0,0);
        for (let i = 0; i < startDayOfWeek; i++) {
            const date = new Date(firstDayOfMonth); date.setDate(date.getDate() - (startDayOfWeek - i));
            days.push({ date, isCurrentMonth: false, isToday: false, dayOfMonth: date.getDate(), isPast: date < today, events: [] });
        }
        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
            const date = new Date(year, month, i); const isToday = date.toDateString() === today.toDateString();
            days.push({ date, isCurrentMonth: true, isToday, dayOfMonth: i, isPast: date < today, events: [] });
        }
        const remainingDays = 42 - days.length; 
        for (let i = 1; i <= remainingDays; i++) {
            const date = new Date(lastDayOfMonth); date.setDate(date.getDate() + i);
            days.push({ date, isCurrentMonth: false, isToday: false, dayOfMonth: date.getDate(), isPast: date < today, events: [] });
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

    // --- MANEJO DE CREACIÓN DE TICKET (Notifica a RRHH) ---
    const handleRequestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const payload = { 
            employeeId: currentUser.id, 
            type: newRequestType, 
            startDate: newRequestStartDate, 
            endDate: newRequestEndDate, 
            status: 'pending' 
        };

        if (editingEvent) {
            onUpdateRequest({ ...editingEvent, ...payload } as CalendarEvent);
            addNotification("Solicitud editada correctamente.", 'success');
        } else {
            onAddRequest(payload as any);
            
            // Notificar a RRHH
            try {
                const recipients = await getNotificationRecipients();
                const sent = await sendEmail(recipients, currentUser.name, newRequestType, newRequestStartDate, newRequestEndDate, "(NUEVA)");
                
                if (sent) {
                    addNotification(`Solicitud creada. Notificación enviada a RRHH.`, 'success');
                } else {
                    addNotification("Solicitud creada (Sin notificación de correo).", 'success');
                }
            } catch (e) {
                console.error("Error flujo email", e);
            }
        }
        setIsRequestModalOpen(false);
    };

    // --- MANEJO DE APROBACIÓN/RECHAZO (Notifica al Empleado) ---
    const handleStatusAction = async (event: CalendarEvent, newStatus: 'approved' | 'rejected') => {
        if (!onUpdateEventStatus) return;

        // 1. Actualizar en Base de Datos
        onUpdateEventStatus(event, newStatus);

        // 2. Buscar Email del Empleado
        const targetEmployee = employees.find(e => e.id === event.employeeId);
        
        if (targetEmployee && targetEmployee.email) {
            // 3. Enviar Correo al Empleado
            const statusLabel = newStatus === 'approved' ? 'APROBADO' : 'RECHAZADO';
            
            // Nota: Aquí "currentUser.name" es el Admin que aprueba. 
            // Pero en el template de EmailJS usamos 'user_name' usualmente para decir DE QUIEN es la novedad.
            // Para que el empleado entienda, el asunto dirá "APROBADO: Vacaciones"
            
            const sent = await sendEmail(
                [targetEmployee.email], // Destinatario: El empleado
                targetEmployee.name,    // Nombre en el correo: El nombre del empleado
                event.type, 
                event.startDate, 
                event.endDate, 
                statusLabel // "APROBADO" o "RECHAZADO"
            );

            if (sent) {
                addNotification(`Estado actualizado y notificado a ${targetEmployee.email}`, 'success');
            } else {
                addNotification("Estado actualizado (No se pudo enviar correo al empleado).", 'warning');
            }
        } else {
            addNotification("Estado actualizado (Empleado sin email registrado).", 'warning');
        }
    };

    const myRequests = useMemo(() => events.filter(e => e.employeeId === currentUser.id).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()), [events, currentUser.id]);

    // Filtrar solicitudes pendientes de OTROS (Para vista Admin)
    const pendingRequests = useMemo(() => {
        if (currentUser.role !== 'admin' && currentUser.role !== 'master') return [];
        return events
            .filter(e => e.status === 'pending')
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }, [events, currentUser.role]);

    return (
        <div className="w-full mx-auto animate-fade-in flex flex-col gap-6">
            
            {/* ... (STATS DE VACACIONES - Sin cambios) ... */}
            <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-8">
                    <div className="text-left">
                        <p className="text-[10px] font-bold text-bokara-grey/50 uppercase tracking-widest mb-1">Acumuladas</p>
                        <p className="text-2xl font-bold text-bokara-grey">{vacationStats.accrued.toFixed(2)} d</p>
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-bold text-bokara-grey/50 uppercase tracking-widest mb-1">Disfrutadas</p>
                        <p className="text-2xl font-bold text-red-400">{vacationStats.taken.toFixed(1)} d</p>
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-bold text-bokara-grey/50 uppercase tracking-widest mb-1">Compensadas</p>
                        <p className="text-2xl font-bold text-wet-sand">{vacationStats.compensated.toFixed(1)} d</p>
                    </div>
                    <div className="text-left bg-lucius-lime/5 p-3 rounded-lg border border-lucius-lime/20">
                        <p className="text-[10px] font-bold text-lucius-lime uppercase tracking-widest mb-1">Saldo Disponible</p>
                        <p className="text-3xl font-display font-bold text-bokara-grey">{vacationStats.balance.toFixed(2)} d</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-bokara-grey">Tiquetera de Novedades</h1>
                <div className="flex gap-3">
                    <button onClick={() => { setEditingEvent(null); setIsRequestModalOpen(true); }} className="bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        <span>Solicitar Tiquete</span>
                    </button>
                </div>
            </div>

            {/* --- SECCIÓN ADMIN: SOLICITUDES PENDIENTES (NUEVO) --- */}
            {(currentUser.role === 'admin' || currentUser.role === 'master') && pendingRequests.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-orange-200 p-6 animate-pulse-slow">
                    <h3 className="font-bold text-orange-600 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Solicitudes Pendientes por Aprobar
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingRequests.map(req => {
                            const empName = employees.find(e => e.id === req.employeeId)?.name || 'Desconocido';
                            return (
                                <div key={req.id} className="border border-orange-100 bg-orange-50/50 p-4 rounded-lg flex flex-col justify-between gap-3">
                                    <div>
                                        <div className="flex justify-between">
                                            <span className="font-bold text-bokara-grey">{empName}</span>
                                            <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-orange-200 text-orange-600">{req.type}</span>
                                        </div>
                                        <p className="text-sm text-bokara-grey/70 mt-1 font-mono">{req.startDate} ➜ {req.endDate}</p>
                                    </div>
                                    <div className="flex gap-2 justify-end mt-2">
                                        <button 
                                            onClick={() => handleStatusAction(req, 'rejected')}
                                            className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-md text-sm font-bold hover:bg-red-50"
                                        >
                                            Rechazar
                                        </button>
                                        <button 
                                            onClick={() => handleStatusAction(req, 'approved')}
                                            className="px-3 py-1.5 bg-lucius-lime text-bokara-grey rounded-md text-sm font-bold shadow-sm hover:bg-opacity-80"
                                        >
                                            Aprobar
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* --- CALENDARIO --- */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6 flex flex-col">
                    <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
                        <div className="bg-[#F3F0E9] p-3 rounded-2xl border border-[#E5E0D6] flex items-center gap-4 w-full shadow-sm">
                            <div className="bg-white p-3 rounded-xl shadow-sm text-lucius-lime border border-[#E5E0D6] flex-shrink-0">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <div className="flex-grow min-w-0">
                                <label className="block text-[10px] font-bold text-lucius-lime uppercase tracking-widest mb-0.5">Filtrar por Novedad</label>
                                <select className="appearance-none bg-transparent font-bold text-bokara-grey text-lg w-full focus:outline-none cursor-pointer" value={viewType} onChange={(e) => setViewType(e.target.value)}>
                                    {visibleTypes.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                             <button onClick={handlePrevMonth} className="p-1 rounded hover:bg-whisper-white transition-colors cursor-pointer"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>
                             <span className="text-lg font-bold capitalize w-48 text-center text-bokara-grey">{currentDate.toLocaleString('es-ES', { month: 'long' })} {currentDate.getFullYear()}</span>
                             <button onClick={handleNextMonth} className="p-1 rounded hover:bg-whisper-white transition-colors cursor-pointer"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></button>
                        </div>
                        <button onClick={handleToday} className="text-sm text-lucius-lime font-bold hover:underline bg-lucius-lime/10 px-3 py-1 rounded-full transition-colors cursor-pointer">Hoy</button>
                    </div>

                    <div className="grid grid-cols-7 text-center text-[10px] font-bold text-bokara-grey/40 uppercase mb-2">
                        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => <div key={d}>{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1 flex-grow">
                        {calendarGrid.map((day, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => handleDayClick(day.date, day.isPast)} 
                                className={`min-h-[80px] p-1 border rounded-md relative flex flex-col transition-colors ${
                                    day.isBlocked ? 'bg-gray-100 cursor-not-allowed' : 
                                    day.isPast ? 'bg-gray-50 cursor-not-allowed opacity-60' :
                                    (!day.isCurrentMonth ? 'bg-whisper-white/30 cursor-pointer hover:bg-white' : 'bg-white cursor-pointer hover:bg-lucius-lime/5')
                                } ${day.isToday ? 'border-lucius-lime ring-1 ring-lucius-lime' : 'border-bokara-grey/10'}`}
                            >
                                <div className={`text-xs text-right mb-1 ${day.isToday ? 'font-bold text-lucius-lime' : 'text-bokara-grey/50'}`}>{day.dayOfMonth}</div>
                                {day.isBlocked ? (
                                    <div className="flex-grow flex items-center justify-center">
                                        <span className="text-[9px] font-bold text-gray-400 bg-gray-200/50 px-1 py-0.5 rounded text-center leading-tight uppercase">Ocupado</span>
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

                {/* --- MIS SOLICITUDES --- */}
                <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6 flex flex-col">
                    <h3 className="font-bold text-bokara-grey mb-4 border-b border-bokara-grey/5 pb-2">Mis Solicitudes</h3>
                    <div className="space-y-3 overflow-y-auto flex-grow max-h-[500px] pr-1">
                        {myRequests.length === 0 && <p className="text-sm text-gray-400 italic">No tienes solicitudes.</p>}
                        {myRequests.map(req => {
                            const today = new Date(); today.setHours(0,0,0,0);
                            const isPast = new Date(req.endDate + 'T00:00:00') < today;
                            const isPending = req.status === 'pending';

                            return (
                                <div key={req.id} className="p-3 rounded-lg border border-bokara-grey/5 transition-colors group bg-whisper-white/50 hover:bg-whisper-white">
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
                                        <div className="flex items-center gap-2">
                                            {isPending && !isPast && (
                                                <>
                                                    <button onClick={() => handleEditRequest(req)} className="p-1 hover:bg-lucius-lime/10 rounded text-lucius-lime transition-all" title="Editar">
                                                        <EditIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => onRemoveRequest(req)} className="p-1 hover:bg-red-100 rounded text-red-500 transition-all" title="Eliminar">
                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* --- MODAL --- */}
            {isRequestModalOpen && (
                <div className="fixed inset-0 bg-bokara-grey bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in border border-bokara-grey/10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-bokara-grey">{editingEvent ? 'Editar Solicitud' : 'Nueva Solicitud'}</h2>
                            <button onClick={() => setIsRequestModalOpen(false)} className="text-bokara-grey/40 hover:text-bokara-grey text-2xl">&times;</button>
                        </div>
                        <form onSubmit={handleRequestSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-lucius-lime uppercase tracking-widest mb-1.5">Tipo de Novedad</label>
                                <select className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg p-3 text-bokara-grey font-bold" value={newRequestType} onChange={e => setNewRequestType(e.target.value)}>
                                    {visibleTypes.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                </select>
                                {(newRequestType === 'Vacaciones (Dinero)' || newRequestType === 'Compensación') && (
                                    <div className="mt-3 p-2 bg-blue-50 text-blue-800 rounded border border-blue-100 text-[10px] leading-tight">
                                        <strong>Regla CST (Dinero):</strong> Máximo 50% compensable. <br/>
                                        Te quedan <strong>{vacationStats.maxCompensable.toFixed(2)} días</strong> para solicitar en dinero.
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-lucius-lime uppercase tracking-widest mb-1.5">Desde</label><input type="date" className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg p-3 text-sm" value={newRequestStartDate} onChange={e => setNewRequestStartDate(e.target.value)} required /></div>
                                <div><label className="block text-xs font-bold text-lucius-lime uppercase tracking-widest mb-1.5">Hasta</label><input type="date" className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg p-3 text-sm" value={newRequestEndDate} onChange={e => setNewRequestEndDate(e.target.value)} required /></div>
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => setIsRequestModalOpen(false)} className="px-5 py-2.5 bg-gray-100 rounded-lg font-bold text-bokara-grey text-sm">Cancelar</button>
                                <button type="submit" className="px-5 py-2.5 bg-lucius-lime text-bokara-grey font-bold rounded-lg hover:bg-opacity-80 text-sm">
                                    Enviar Solicitud
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TicketingPage;