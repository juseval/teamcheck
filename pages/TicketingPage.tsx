
import React, { useState, useMemo, useEffect } from 'react';
import { CalendarEvent, PayrollChangeType, Employee } from '../types';
import { FilterIcon } from '../components/Icons';

interface TicketingPageProps {
  events: CalendarEvent[];
  currentUser: Employee;
  payrollChangeTypes: PayrollChangeType[];
  onAddRequest: (requestData: Omit<CalendarEvent, 'id' | 'status'>) => void;
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

const TicketingPage: React.FC<TicketingPageProps> = ({ events, currentUser, payrollChangeTypes, onAddRequest }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [viewType, setViewType] = useState('');

    // New Request Form State
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

    // Filter available types based on user role (Hide adminOnly types from employees)
    const visibleTypes = useMemo(() => {
        if (currentUser.role === 'admin') return payrollChangeTypes;
        return payrollChangeTypes.filter(t => !t.adminOnly);
    }, [payrollChangeTypes, currentUser.role]);

    // Ensure viewType and newRequestType are valid when visibleTypes changes
    useEffect(() => {
        if (visibleTypes.length > 0) {
            if (!viewType || !visibleTypes.find(t => t.name === viewType)) {
                setViewType(visibleTypes[0].name);
            }
            if (!newRequestType || !visibleTypes.find(t => t.name === newRequestType)) {
                setNewRequestType(visibleTypes[0].name);
            }
        }
    }, [visibleTypes, viewType, newRequestType]);

    const openRequestModal = () => {
        if (visibleTypes.length > 0) {
            setNewRequestType(visibleTypes[0].name);
        }
        setIsRequestModalOpen(true);
    };

    const handleDayClick = (date: Date) => {
        // Format date to YYYY-MM-DD manually to avoid UTC issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        setNewRequestStartDate(dateStr);
        setNewRequestEndDate(dateStr);
        
        if (visibleTypes.length > 0) {
            // If the current newRequestType is empty or invalid, set it to the first available one
            if (!newRequestType || !visibleTypes.find(t => t.name === newRequestType)) {
                 setNewRequestType(visibleTypes[0].name);
            }
        }
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

        // --- Availability Logic ---
        const selectedTypeConfig = payrollChangeTypes.find(t => t.name === viewType);
        const isViewTypeExclusive = !!selectedTypeConfig?.isExclusive;

        events.forEach(event => {
            if (event.status === 'rejected') return;

            const startDate = new Date(event.startDate + 'T00:00:00');
            const endDate = new Date(event.endDate + 'T00:00:00');
            const isMine = event.employeeId === currentUser.id;

            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dayStr = d.toISOString().split('T')[0];
                const dayInGrid = days.find(day => day.date.toISOString().split('T')[0] === dayStr);
                
                if (dayInGrid) {
                    // BLOCKING LOGIC:
                    // If exclusive type selected, check if *anyone else* has this type approved.
                    // If so, block the day.
                    if (!isMine && isViewTypeExclusive && event.type === viewType && event.status === 'approved') {
                        dayInGrid.isBlocked = true;
                    }

                    // Display Logic: Show my events always.
                    if (isMine) {
                        const color = eventColorMap.get(event.type) || '#91A673';
                        let label = event.type;
                        if (event.status === 'pending') label += ' (Pending)';
                        
                        dayInGrid.events.push({
                            event: event,
                            isMine: true,
                            color: color,
                            label: label
                        });
                    }
                }
            }
        });

        return days;
    }, [currentDate, events, eventColorMap, currentUser.id, viewType, payrollChangeTypes]);

    const handleRequestSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddRequest({
            employeeId: currentUser.id,
            type: newRequestType,
            startDate: newRequestStartDate,
            endDate: newRequestEndDate,
        });
        setIsRequestModalOpen(false);
    };

    const myRequests = useMemo(() => {
        return events
            .filter(e => e.employeeId === currentUser.id)
            .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }, [events, currentUser.id]);

    const monthName = currentDate.toLocaleString('en-US', { month: 'long' });

    return (
        <div className="w-full mx-auto animate-fade-in flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-bokara-grey">Ticket Management</h1>
                <button 
                    onClick={openRequestModal}
                    className="bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg shadow-md transition-all flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    <span>New Request</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar Section */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6 flex flex-col">
                    
                    {/* Enhanced View Filter: New Design */}
                    <div className="mb-6">
                        <div className="bg-[#F3F0E9] p-3 sm:p-4 rounded-2xl border border-[#E5E0D6] flex items-center gap-4 w-full sm:max-w-md shadow-sm transition-all hover:shadow-md hover:border-[#D6D1C7]">
                            <div className="bg-white p-3 rounded-xl shadow-sm text-lucius-lime border border-[#E5E0D6] flex-shrink-0">
                                <FilterIcon className="w-6 h-6" />
                            </div>
                            <div className="flex-grow min-w-0">
                                <label htmlFor="viewType" className="block text-[10px] sm:text-xs font-bold text-lucius-lime uppercase tracking-widest mb-0.5">
                                    Check Availability
                                </label>
                                <div className="relative group">
                                    <select
                                        id="viewType"
                                        className="appearance-none bg-transparent font-bold text-bokara-grey text-lg sm:text-xl focus:outline-none pr-8 cursor-pointer w-full truncate"
                                        value={viewType}
                                        onChange={(e) => setViewType(e.target.value)}
                                    >
                                        {visibleTypes.map(p => (
                                            <option key={p.id} value={p.name}>{p.name}</option>
                                        ))}
                                        {visibleTypes.length === 0 && <option disabled>No options available</option>}
                                    </select>
                                    {/* Custom Select Arrow */}
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-bokara-grey/40 group-hover:text-lucius-lime transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                             <button onClick={handlePrevMonth} className="p-1 rounded hover:bg-whisper-white transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>
                             <span className="text-lg font-bold capitalize w-32 text-center text-bokara-grey">{monthName} {currentDate.getFullYear()}</span>
                             <button onClick={handleNextMonth} className="p-1 rounded hover:bg-whisper-white transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></button>
                        </div>
                        <button onClick={handleToday} className="text-sm text-lucius-lime font-bold hover:underline bg-lucius-lime/10 px-3 py-1 rounded-full transition-colors hover:bg-lucius-lime/20">Today</button>
                    </div>

                    <div className="grid grid-cols-7 text-center text-sm text-bokara-grey/60 mb-2 font-medium">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d}>{d}</div>)}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1 flex-grow">
                        {calendarGrid.map((day, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => !day.isBlocked && handleDayClick(day.date)}
                                className={`min-h-[80px] p-1 border rounded-md relative flex flex-col transition-colors
                                    ${day.isBlocked 
                                        ? 'bg-gray-100 cursor-not-allowed' 
                                        : (!day.isCurrentMonth ? 'bg-whisper-white/30 cursor-pointer hover:bg-white' : 'bg-white cursor-pointer hover:bg-lucius-lime/5')} 
                                    ${day.isToday ? 'border-lucius-lime ring-1 ring-lucius-lime' : 'border-bokara-grey/10'}
                                `}
                            >
                                <div className={`text-xs text-right mb-1 ${day.isToday ? 'font-bold text-lucius-lime' : 'text-bokara-grey/50'}`}>{day.dayOfMonth}</div>
                                
                                {day.isBlocked ? (
                                    <div className="flex-grow flex items-center justify-center">
                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-200/50 px-1.5 py-0.5 rounded select-none text-center leading-tight">Unavailable</span>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {day.events.map((evt, i) => (
                                            <div 
                                                key={i} 
                                                className="text-[10px] p-1 rounded truncate font-medium text-white shadow-sm"
                                                style={{ backgroundColor: evt.color }}
                                                title={evt.label}
                                            >
                                                {evt.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar: Legend & History */}
                <div className="flex flex-col gap-6">
                    <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6 flex-grow">
                        <h3 className="font-bold text-bokara-grey mb-4 border-b border-bokara-grey/10 pb-2">My Recent Requests</h3>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                            {myRequests.length > 0 ? myRequests.map(req => (
                                <div key={req.id} className="p-3 bg-whisper-white/50 rounded-lg border border-bokara-grey/5 hover:bg-whisper-white transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-sm text-bokara-grey">{req.type}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                            req.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>{req.status === 'pending' ? 'Pending' : req.status === 'approved' ? 'Approved' : 'Rejected'}</span>
                                    </div>
                                    <div className="text-xs text-bokara-grey/70 font-mono">
                                        {req.startDate} <span className="text-lucius-lime mx-1">➜</span> {req.endDate}
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8">
                                    <p className="text-sm text-bokara-grey/50">No requests found.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6">
                         <h3 className="font-bold text-lucius-lime mb-3 text-sm uppercase tracking-wide">Legend</h3>
                         <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-white border border-gray-300 rounded shadow-sm"></div>
                                <span className="text-bokara-grey/80">Available</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div>
                                <span className="text-bokara-grey/80">Unavailable</span>
                            </div>
                            {visibleTypes.map(type => (
                                <div key={type.id} className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded shadow-sm" style={{backgroundColor: type.color}}></div>
                                    <span className="text-bokara-grey/80">{type.name}</span>
                                </div>
                            ))}
                         </div>
                    </div>
                </div>
            </div>

            {/* Request Modal */}
            {isRequestModalOpen && (
                <div className="fixed inset-0 bg-bokara-grey bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in border border-bokara-grey/10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-bokara-grey">New Request</h2>
                            <button onClick={() => setIsRequestModalOpen(false)} className="text-bokara-grey/40 hover:text-bokara-grey transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleRequestSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-lucius-lime mb-2">Request Type</label>
                                {visibleTypes.length > 0 ? (
                                    <div className="relative">
                                        <select 
                                            className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg p-3 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime appearance-none"
                                            value={newRequestType}
                                            onChange={e => setNewRequestType(e.target.value)}
                                        >
                                            {visibleTypes.map(p => (
                                                <option key={p.id} value={p.name}>{p.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-bokara-grey/50">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                                        No request types available. Contact your admin.
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-lucius-lime mb-2">From</label>
                                    <input 
                                        type="date" 
                                        className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg p-3 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime"
                                        value={newRequestStartDate}
                                        onChange={e => setNewRequestStartDate(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-lucius-lime mb-2">To</label>
                                    <input 
                                        type="date" 
                                        className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg p-3 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime"
                                        value={newRequestEndDate}
                                        onChange={e => setNewRequestEndDate(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => setIsRequestModalOpen(false)} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-bokara-grey font-medium rounded-lg transition-colors">Cancel</button>
                                <button 
                                    type="submit" 
                                    className="px-5 py-2.5 bg-lucius-lime text-bokara-grey font-bold rounded-lg hover:bg-opacity-80 disabled:bg-lucius-lime/40 disabled:cursor-not-allowed shadow-md transition-all hover:translate-y-[-1px]"
                                    disabled={visibleTypes.length === 0}
                                >
                                    Submit Request
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
