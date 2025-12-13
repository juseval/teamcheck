

import React, { useState, useMemo } from 'react';
import { CalendarEvent, Employee, PayrollChangeType } from '../types';

interface SchedulePageProps {
  events: CalendarEvent[];
  employees: Employee[];
  payrollChangeTypes: PayrollChangeType[];
  onAddEvent: () => void;
  onEditEvent: (event: CalendarEvent) => void;
  onRemoveEvent: (event: CalendarEvent) => void;
  onUpdateEventStatus?: (event: CalendarEvent, status: 'approved' | 'rejected') => void;
}

// Define the structure for a day in the calendar grid
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

const SchedulePage: React.FC<SchedulePageProps> = ({ events, employees, payrollChangeTypes, onAddEvent, onEditEvent, onRemoveEvent, onUpdateEventStatus }) => {
    const [currentDate, setCurrentDate] = useState(new Date()); 
    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);

    // Navigation handlers
    const handlePrevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    const handleToday = () => setCurrentDate(new Date());

    const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e.name])), [employees]);
    const eventColorMap = useMemo(() => {
        const map = new Map<string, string>();
        payrollChangeTypes.forEach(p => map.set(p.name, p.color));
        return map;
    }, [payrollChangeTypes]);

    const pendingRequests = useMemo(() => {
        return events.filter(e => e.status === 'pending');
    }, [events]);

    const calendarGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        
        const days: CalendarDay[] = [];
        
        // Days from previous month to fill the grid start
        let startDayOfWeek = firstDayOfMonth.getDay(); // Sunday - 0, Saturday - 6
        startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Monday - 0, Sunday - 6
        
        for (let i = 0; i < startDayOfWeek; i++) {
            const date = new Date(firstDayOfMonth);
            date.setDate(date.getDate() - (startDayOfWeek - i));
            days.push({
                date,
                isCurrentMonth: false,
                isToday: false,
                dayOfMonth: date.getDate(),
                events: []
            });
        }

        // Days of the current month
        const today = new Date();
        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
            const date = new Date(year, month, i);
            const isToday = date.toDateString() === today.toDateString();
            days.push({
                date,
                isCurrentMonth: true,
                isToday,
                dayOfMonth: i,
                events: []
            });
        }
        
        // Days from next month to fill the grid end
        let endDayOfWeek = lastDayOfMonth.getDay();
        endDayOfWeek = endDayOfWeek === 0 ? 6 : endDayOfWeek - 1;
        const remainingDays = 42 - days.length; // Ensure 6 weeks total (6*7=42)
        
        for (let i = 1; i <= remainingDays; i++) {
            const date = new Date(lastDayOfMonth);
            date.setDate(date.getDate() + i);
            days.push({
                date,
                isCurrentMonth: false,
                isToday: false,
                dayOfMonth: date.getDate(),
                events: []
            });
        }

        // Map events to the calendar days
        events.forEach(event => {
            // Only show approved events in the main grid to avoid clutter, or visually distinguish pending
            if (event.status === 'rejected') return;

            const startDate = new Date(event.startDate + 'T00:00:00');
            const endDate = new Date(event.endDate + 'T00:00:00');
            
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dayStr = d.toISOString().split('T')[0];
                const dayInGrid = days.find(day => day.date.toISOString().split('T')[0] === dayStr);
                if (dayInGrid) {
                    dayInGrid.events.push({
                        event: event,
                        employeeName: employeeMap.get(event.employeeId) || 'Unknown',
                        color: eventColorMap.get(event.type) || '#91A673',
                        isPending: event.status === 'pending'
                    });
                }
            }
        });

        // Chunk into weeks
        const weeks = [];
        for (let i = 0; i < days.length; i += 7) {
            weeks.push(days.slice(i, i + 7));
        }

        return weeks;

    }, [currentDate, events, employeeMap, eventColorMap]);

    const monthName = currentDate.toLocaleString('es-ES', { month: 'long' });
    const year = currentDate.getFullYear();

    return (
        <div className="w-full mx-auto animate-fade-in text-bokara-grey flex flex-col h-full bg-white p-6 rounded-xl shadow-md border border-bokara-grey/10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-bold">Calendario de Equipo</h1>
                </div>
                <div className="flex items-center gap-2">
                     <button onClick={handleToday} className="px-3 py-1.5 text-sm font-semibold rounded-md border border-bokara-grey/20 hover:bg-whisper-white transition-colors">Hoy</button>
                    <div className="flex items-center gap-1">
                        <button onClick={handlePrevMonth} className="p-1.5 rounded-md hover:bg-whisper-white transition-colors" aria-label="Mes anterior">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                        </button>
                         <button onClick={handleNextMonth} className="p-1.5 rounded-md hover:bg-whisper-white transition-colors" aria-label="Mes siguiente">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                         </button>
                    </div>
                    <span className="text-lg font-semibold w-48 text-center capitalize">{monthName} {year}</span>
                    
                    {/* Pending Requests Button */}
                    <button 
                        onClick={() => setIsPendingModalOpen(true)}
                        className="relative bg-white border border-bokara-grey/20 hover:bg-whisper-white text-bokara-grey font-medium py-2 px-4 rounded-lg transition-all duration-300 shadow-sm flex items-center gap-2"
                    >
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        <span>Solicitudes</span>
                        {pendingRequests.length > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white ring-2 ring-white">
                                {pendingRequests.length}
                            </span>
                        )}
                    </button>

                    <button onClick={onAddEvent} className="bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg transition-all duration-300 shadow-sm flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                        <span>Agregar Novedad</span>
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-grow grid grid-cols-7 border-t border-l border-bokara-grey/20 bg-[#FFF9F0]">
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                    <div key={day} className="text-center font-semibold p-2 border-b border-bokara-grey/20 text-sm text-bokara-grey/80 bg-whisper-white">
                        {day}
                    </div>
                ))}

                {calendarGrid.flat().map((day, index) => (
                    <div key={index} className={`relative p-2 border-b border-r border-bokara-grey/20 min-h-[120px] flex flex-col ${!day.isCurrentMonth ? 'bg-bright-white/60' : ''}`}>
                        <div className="flex-shrink-0">
                            <span className={`text-sm ${day.isToday ? 'bg-red-500 text-white rounded-full flex items-center justify-center w-6 h-6 font-bold' : (day.isCurrentMonth ? 'text-bokara-grey/80 font-semibold' : 'text-bokara-grey/40')}`}>
                               {day.dayOfMonth}
                            </span>
                        </div>
                         <div className="mt-1 space-y-1 text-xs overflow-y-auto flex-grow">
                            {day.events.map(({ event, employeeName, color, isPending }) => (
                                <div 
                                    key={`${event.id}-${day.date}`} 
                                    className={`group relative bg-white p-1 rounded-sm border-l-4 shadow-xs flex items-center justify-between cursor-pointer ${isPending ? 'opacity-70 border-dashed' : ''}`} 
                                    style={{ borderColor: color }} 
                                    onClick={() => onEditEvent(event)}
                                >
                                    <div className="w-full text-left overflow-hidden">
                                        <p className="font-medium text-bokara-grey truncate" title={employeeName}>{employeeName}</p>
                                        <p className="text-bokara-grey/70 truncate">
                                            {event.type} {isPending && '(P)'}
                                        </p>
                                    </div>
                                    {!isPending && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveEvent(event);
                                            }}
                                            className="absolute top-1 right-1 p-0.5 rounded-full bg-red-100 text-red-600 opacity-0 group-hover:opacity-100 hover:bg-red-200 transition-opacity"
                                            aria-label="Remove event"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Pending Requests Modal */}
            {isPendingModalOpen && (
                <div className="fixed inset-0 bg-bokara-grey bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setIsPendingModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-bokara-grey">Solicitudes Pendientes</h2>
                            <button onClick={() => setIsPendingModalOpen(false)} className="text-bokara-grey/50 hover:text-bokara-grey">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        {pendingRequests.length === 0 ? (
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
                                            <button 
                                                onClick={() => onUpdateEventStatus && onUpdateEventStatus(request, 'rejected')}
                                                className="px-3 py-1.5 bg-red-100 text-red-700 font-semibold rounded hover:bg-red-200 transition"
                                            >
                                                Rechazar
                                            </button>
                                            <button 
                                                onClick={() => onUpdateEventStatus && onUpdateEventStatus(request, 'approved')}
                                                className="px-3 py-1.5 bg-green-100 text-green-700 font-semibold rounded hover:bg-green-200 transition"
                                            >
                                                Aprobar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SchedulePage;