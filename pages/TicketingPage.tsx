
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
    
    // State for Editing
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

    // Request Form State
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

    // Filter available types based on user role (Hide adminOnly types from employees)
    const visibleTypes = useMemo(() => {
        if (!currentUser || currentUser.role === 'admin') return payrollChangeTypes;
        return payrollChangeTypes.filter(t => !t.adminOnly);
    }, [payrollChangeTypes, currentUser]);

    // Ensure viewType and newRequestType are valid when visibleTypes changes
    useEffect(() => {
        if (visibleTypes.length > 0) {
            if (!viewType || !visibleTypes.find(t => t.name === viewType)) {
                setViewType(visibleTypes[0].name);
            }
            if (!editingEvent && (!newRequestType || !visibleTypes.find(t => t.name === newRequestType))) {
                setNewRequestType(visibleTypes[0].name);
            }
        }
    }, [visibleTypes, viewType, newRequestType, editingEvent]);

    const openRequestModal = () => {
        setEditingEvent(null);
        setNewRequestStartDate(new Date().toISOString().split('T')[0]);
        setNewRequestEndDate(new Date().toISOString().split('T')[0]);
        if (visibleTypes.length > 0) {
            setNewRequestType(visibleTypes[0].name);
        }
        setIsRequestModalOpen(true);
    };

    const handleEditRequest = (event: CalendarEvent) => {
        setEditingEvent(event);
        setNewRequestType(event.type);
        setNewRequestStartDate(event.startDate);
        setNewRequestEndDate(event.endDate);
        setIsRequestModalOpen(true);
    };

    const handleDayClick = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        setEditingEvent(null);
        setNewRequestStartDate(dateStr);
        setNewRequestEndDate(dateStr);
        
        if (visibleTypes.length > 0) {
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
                    if (!isMine && isViewTypeExclusive && event.type === viewType && event.status === 'approved') {
                        dayInGrid.isBlocked = true;
                    }

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
        
        if (editingEvent) {
            if (typeof onUpdateRequest === 'function') {
                onUpdateRequest({
                    ...editingEvent,
                    type: newRequestType,
                    startDate: newRequestStartDate,
                    endDate: newRequestEndDate,
                    status: 'pending'
                });
            } else {
                console.error("onUpdateRequest is not a function");
            }
        } else {
            if (typeof onAddRequest === 'function') {
                onAddRequest({
                    employeeId: currentUser.id,
                    type: newRequestType,
                    startDate: newRequestStartDate,
                    endDate: newRequestEndDate,
                    status: 'pending'
                } as any);
            } else {
                console.error("onAddRequest is not a function");
            }
        }
        setIsRequestModalOpen(false);
    };

    const myRequests = useMemo(() => {
        return events
            .filter(e => e.employeeId === currentUser.id)
            .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }, [events, currentUser.id]);

    const pendingRequests = useMemo(() => {
        return (events || [])
            .filter(e => e.status === 'pending')
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }, [events]);

    const monthName = currentDate.toLocaleString('en-US', { month: 'long' });

    // Conflict Checking Logic
    const getConflict = (request: CalendarEvent) => {
        const typeConfig = payrollChangeTypes.find(t => t.name === request.type);
        if (!typeConfig?.isExclusive) return null;

        const reqStart = new Date(request.startDate).getTime();
        const reqEnd = new Date(request.endDate).getTime();

        const conflictingEvent = events.find(e => {
            if (e.status !== 'approved' || e.type !== request.type || e.id === request.id) return false;
            
            const eStart = new Date(e.startDate).getTime();
            const eEnd = new Date(e.endDate).getTime();

            // Check if ranges overlap
            return (reqStart <= eEnd) && (reqEnd >= eStart);
        });

        return conflictingEvent ? {
            employeeName: employeeMap.get(conflictingEvent.employeeId) || 'Unknown',
            event: conflictingEvent
        } : null;
    };

    return (
        <div className="w-full mx-auto animate-fade-in flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-bokara-grey">Ticket Management</h1>
                <div className="flex items-center gap-3">
                    {/* Pending Requests Button */}
                    {currentUser.role === 'admin' && (
                        <button 
                            onClick={() => setIsPendingModalOpen(true)}
                            className="relative text-bokara-grey hover:bg-whisper-white p-2 rounded-lg transition-colors border border-transparent hover:border-bokara-grey/10"
                            title="Solicitudes Pendientes"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            {pendingRequests.length > 0 && (
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
                            )}
                        </button>
                    )}
                    <button 
                        onClick={openRequestModal}
                        className="bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        <span>New Request</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar Section */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6 flex flex-col">
                    <div className="mb-6">
                        <div className="bg-[#F3F0E9] p-3 sm:p-4 rounded-2xl border border-[#E5E0D6] flex items-center gap-4 w-full sm:max-w-md shadow-sm">
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
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-bokara-grey/40">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                             <button onClick={handlePrevMonth} className="p-1 rounded hover:bg-whisper-white transition-colors cursor-pointer"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>
                             <span className="text-lg font-bold capitalize w-32 text-center text-bokara-grey">{monthName} {currentDate.getFullYear()}</span>
                             <button onClick={handleNextMonth} className="p-1 rounded hover:bg-whisper-white transition-colors cursor-pointer"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></button>
                        </div>
                        <button onClick={handleToday} className="text-sm text-lucius-lime font-bold hover:underline bg-lucius-lime/10 px-3 py-1 rounded-full transition-colors hover:bg-lucius-lime/20 cursor-pointer">Today</button>
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
                                                className="text-[10px] p-1 rounded truncate font-medium text-white shadow-sm cursor-pointer hover:brightness-110"
                                                style={{ backgroundColor: evt.color }}
                                                title={evt.label}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (evt.event.status === 'pending') {
                                                        handleEditRequest(evt.event);
                                                    }
                                                }}
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
                                <div key={req.id} className="p-3 bg-whisper-white/50 rounded-lg border border-bokara-grey/5 hover:bg-whisper-white transition-colors group">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-sm text-bokara-grey">{req.type}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                            req.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>{req.status === 'pending' ? 'Pending' : req.status === 'approved' ? 'Approved' : 'Rejected'}</span>
                                    </div>
                                    <div className="text-xs text-bokara-grey/70 font-mono flex justify-between items-center mt-2">
                                        <span>{req.startDate} <span className="text-lucius-lime mx-1">➜</span> {req.endDate}</span>
                                        
                                        {/* Edit/Delete Controls */}
                                        <div className="flex gap-2">
                                            {/* Edit: Only if Pending */}
                                            {req.status === 'pending' && (
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { 
                                                        e.preventDefault();
                                                        e.stopPropagation(); 
                                                        handleEditRequest(req); 
                                                    }}
                                                    className="p-1.5 bg-white border border-bokara-grey/10 text-bokara-grey/70 hover:text-lucius-lime hover:border-lucius-lime rounded-md transition-all shadow-sm cursor-pointer"
                                                    title="Edit Request"
                                                >
                                                    <EditIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                            
                                            {/* Delete: If Pending OR if Admin (for approved/rejected) */}
                                            {(req.status === 'pending' || currentUser.role === 'admin') && (
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { 
                                                        e.preventDefault();
                                                        e.stopPropagation(); 
                                                        if (typeof onRemoveRequest === 'function') {
                                                            onRemoveRequest(req); 
                                                        } else {
                                                            console.error("onRemoveRequest is not a function");
                                                        }
                                                    }}
                                                    className="p-1.5 bg-white border border-bokara-grey/10 text-bokara-grey/70 hover:text-red-500 hover:border-red-500 rounded-md transition-all shadow-sm cursor-pointer"
                                                    title="Delete Request"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                </button>
                                            )}
                                        </div>
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
                            <h2 className="text-2xl font-bold text-bokara-grey">{editingEvent ? 'Edit Request' : 'New Request'}</h2>
                            <button onClick={() => setIsRequestModalOpen(false)} className="text-bokara-grey/40 hover:text-bokara-grey transition-colors cursor-pointer">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleRequestSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-lucius-lime mb-2">Request Type</label>
                                {visibleTypes.length > 0 ? (
                                    <div className="relative">
                                        <select 
                                            className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg p-3 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime appearance-none cursor-pointer"
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
                                        className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg p-3 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime cursor-pointer"
                                        value={newRequestStartDate}
                                        onChange={e => setNewRequestStartDate(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-lucius-lime mb-2">To</label>
                                    <input 
                                        type="date" 
                                        className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg p-3 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime cursor-pointer"
                                        value={newRequestEndDate}
                                        onChange={e => setNewRequestEndDate(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            
                            {editingEvent && (
                                <div className="text-sm text-bokara-grey/60 bg-whisper-white/50 p-2 rounded">
                                    <span className="font-bold">Note:</span> Editing this request will reset its status to <strong>Pending</strong>.
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => setIsRequestModalOpen(false)} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-bokara-grey font-medium rounded-lg transition-colors cursor-pointer">Cancel</button>
                                <button 
                                    type="submit" 
                                    className="px-5 py-2.5 bg-lucius-lime text-bokara-grey font-bold rounded-lg hover:bg-opacity-80 disabled:bg-lucius-lime/40 disabled:cursor-not-allowed shadow-md transition-all hover:translate-y-[-1px] cursor-pointer"
                                    disabled={visibleTypes.length === 0}
                                >
                                    {editingEvent ? 'Update Request' : 'Submit Request'}
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
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-bokara-grey">Solicitudes Pendientes</h2>
                            <button onClick={() => setIsPendingModalOpen(false)} className="text-bokara-grey/50 hover:text-bokara-grey">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        {!pendingRequests || pendingRequests.length === 0 ? (
                            <p className="text-center text-bokara-grey/60 py-8">No hay solicitudes pendientes.</p>
                        ) : (
                            <div className="space-y-4">
                                {pendingRequests.map(request => {
                                    const conflict = getConflict(request);
                                    
                                    return (
                                        <div key={request.id} className="bg-whisper-white/50 p-4 rounded-lg border border-bokara-grey/10 flex flex-col gap-3 relative">
                                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
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
                                                        className={`px-3 py-1.5 font-semibold rounded transition flex items-center gap-1 ${
                                                            conflict 
                                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        }`}
                                                        disabled={!!conflict}
                                                        title={conflict ? "Conflicto de disponibilidad" : "Aprobar solicitud"}
                                                    >
                                                        {conflict && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                                                        Aprobar
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Conflict Warning Area */}
                                            {conflict && (
                                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-2 animate-pulse">
                                                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                    <div>
                                                        <strong>Conflicto detectado:</strong> Este tipo de novedad es exclusivo y <strong>{conflict.employeeName}</strong> ya tiene aprobado el mismo periodo.
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TicketingPage;
