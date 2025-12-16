
import React, { useState, useMemo } from 'react';
import { CalendarEvent, Employee, PayrollChangeType } from '../types';

interface CalendarPageProps {
  events: CalendarEvent[];
  currentUser: Employee;
  payrollChangeTypes: PayrollChangeType[];
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayOfMonth: number;
  events: CalendarEvent[];
}

const CalendarPage: React.FC<CalendarPageProps> = ({ events, currentUser, payrollChangeTypes }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const eventColorMap = useMemo(() => {
      const map = new Map<string, string>();
      payrollChangeTypes.forEach(p => map.set(p.name, p.color));
      return map;
  }, [payrollChangeTypes]);

  // Filter events for the current user
  const myEvents = useMemo(() => {
      return events.filter(e => e.employeeId === currentUser.id && e.status !== 'rejected');
  }, [events, currentUser.id]);

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

      // Map events to days
      myEvents.forEach(event => {
          const startDate = new Date(event.startDate + 'T00:00:00');
          const endDate = new Date(event.endDate + 'T00:00:00');
          
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
              const dayStr = d.toISOString().split('T')[0];
              const dayInGrid = days.find(day => day.date.toISOString().split('T')[0] === dayStr);
              if (dayInGrid) {
                  dayInGrid.events.push(event);
              }
          }
      });

      return days;
  }, [currentDate, myEvents]);

  const monthName = currentDate.toLocaleString('es-ES', { month: 'long' });
  const year = currentDate.getFullYear();

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in flex flex-col gap-6 pb-8">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-md border border-bokara-grey/10">
          <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-bokara-grey">Mi Calendario</h1>
              <span className="bg-lucius-lime/20 text-bokara-grey text-sm font-bold px-3 py-1 rounded-full border border-lucius-lime/30">
                  {currentUser.name}
              </span>
          </div>
          <div className="flex items-center gap-2">
               <button onClick={handlePrevMonth} className="p-2 rounded-lg hover:bg-whisper-white transition-colors border border-transparent hover:border-bokara-grey/10">
                   <svg className="w-5 h-5 text-bokara-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
               </button>
               <span className="text-xl font-bold capitalize w-40 text-center text-bokara-grey">{monthName} {year}</span>
               <button onClick={handleNextMonth} className="p-2 rounded-lg hover:bg-whisper-white transition-colors border border-transparent hover:border-bokara-grey/10">
                   <svg className="w-5 h-5 text-bokara-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
               </button>
               <button onClick={handleToday} className="ml-2 text-sm text-lucius-lime font-bold hover:underline bg-lucius-lime/10 px-4 py-2 rounded-lg transition-colors hover:bg-lucius-lime/20">Hoy</button>
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-bokara-grey/10 bg-[#FFF9F0]">
              {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                  <div key={day} className="text-center font-bold p-3 text-sm text-bokara-grey/70 uppercase tracking-wider">
                      {day}
                  </div>
              ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr bg-bokara-grey/10 gap-[1px]">
              {calendarGrid.map((day, idx) => (
                  <div 
                      key={idx} 
                      className={`min-h-[120px] h-auto bg-white p-2 relative flex flex-col gap-1 transition-colors ${
                          !day.isCurrentMonth ? 'bg-gray-50/50 text-gray-400' : 'text-bokara-grey'
                      } ${day.isToday ? 'bg-lucius-lime/5' : ''}`}
                  >
                      <div className="flex justify-between items-start">
                          <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${
                              day.isToday ? 'bg-lucius-lime text-white shadow-sm' : ''
                          }`}>
                              {day.dayOfMonth}
                          </span>
                      </div>
                      
                      <div className="flex-grow flex flex-col gap-1 mt-1">
                          {day.events.map((event, i) => {
                              const color = eventColorMap.get(event.type) || '#91A673';
                              return (
                                  <div 
                                      key={`${event.id}-${i}`}
                                      className={`text-xs p-1.5 rounded border-l-4 shadow-sm opacity-90 hover:opacity-100 transition-opacity ${
                                          event.status === 'pending' ? 'border-dashed' : ''
                                      }`}
                                      style={{ 
                                          backgroundColor: 'white',
                                          borderColor: color,
                                          borderLeftColor: color
                                      }}
                                      title={`${event.type} (${event.status})`}
                                  >
                                      <div className="font-bold truncate text-[10px] text-bokara-grey uppercase tracking-tight">{event.type}</div>
                                      {event.status === 'pending' && <div className="text-[9px] text-yellow-600 font-semibold mt-0.5">Pendiente</div>}
                                  </div>
                              )
                          })}
                      </div>
                  </div>
              ))}
          </div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl shadow-sm border border-bokara-grey/10 justify-center">
          {payrollChangeTypes.map(type => (
              <div key={type.id} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded shadow-sm" style={{backgroundColor: type.color}}></div>
                  <span className="text-sm font-medium text-bokara-grey">{type.name}</span>
              </div>
          ))}
          <div className="w-px h-6 bg-bokara-grey/10 mx-2"></div>
          <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-white border-l-4 border-dashed border-gray-400 shadow-sm"></div>
                <span className="text-sm font-medium text-bokara-grey">Solicitud Pendiente</span>
          </div>
      </div>
    </div>
  );
};

export default CalendarPage;
