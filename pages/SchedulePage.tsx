import React, { useState, useMemo } from 'react';
import { CalendarEvent, Employee, PayrollChangeType } from '../types.ts';

interface SchedulePageProps {
  events: CalendarEvent[];
  employees: Employee[];
  payrollChangeTypes: PayrollChangeType[];
  onAddEvent: () => void;
  onEditEvent: (event: CalendarEvent) => void;
  onRemoveEvent: (event: CalendarEvent) => void;
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
  }[];
}

const SchedulePage: React.FC<SchedulePageProps> = ({ events, employees, payrollChangeTypes, onAddEvent, onEditEvent, onRemoveEvent }) => {
    const [currentDate, setCurrentDate] = useState(new Date()); 

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
            const startDate = new Date(event.startDate + 'T00:00:00');
            const endDate = new Date(event.endDate + 'T00:00:00');
            
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dayStr = d.toISOString().split('T')[0];
                const dayInGrid = days.find(day => day.date.toISOString().split('T')[0] === dayStr);
                if (dayInGrid) {
                    dayInGrid.events.push({
                        event: event,
                        employeeName: employeeMap.get(event.employeeId) || 'Unknown',
                        color: eventColorMap.get(event.type) || '#91A673'
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
                            {day.events.map(({ event, employeeName, color }) => (
                                <div key={`${event.id}-${day.date}`} className="group relative bg-white p-1 rounded-sm border-l-4 shadow-xs flex items-center justify-between cursor-pointer" style={{ borderColor: color }} onClick={() => onEditEvent(event)}>
                                    <div className="w-full text-left overflow-hidden">
                                        <p className="font-medium text-bokara-grey truncate" title={employeeName}>{employeeName}</p>
                                        <p className="text-bokara-grey/70">{event.type}</p>
                                    </div>
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
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SchedulePage;