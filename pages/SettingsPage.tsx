
import React, { useState } from 'react';
import { ActivityStatus, PayrollChangeType, WorkSchedule } from '../types';
import { useNotification } from '../contexts/NotificationContext';

interface SettingsPageProps {
  statuses: ActivityStatus[];
  onAddStatus: (name: string, color: string) => Promise<void>;
  onRemoveStatus: (id: string) => Promise<void>;
  payrollChangeTypes: PayrollChangeType[];
  onAddPayrollChangeType: (name: string, color: string, isExclusive: boolean, adminOnly: boolean, yearlyQuota?: number) => Promise<void>;
  onUpdatePayrollChangeType: (id: string, updates: Partial<Omit<PayrollChangeType, 'id'>>) => Promise<void>;
  onRemovePayrollChangeType: (id: string) => Promise<void>;
  workSchedules: WorkSchedule[];
  onAddWorkSchedule: (schedule: Omit<WorkSchedule, 'id' | 'companyId'>) => Promise<void>;
  onUpdateWorkSchedule: (id: string, updates: Partial<Omit<WorkSchedule, 'id'>>) => Promise<void>;
  onRemoveWorkSchedule: (id: string) => Promise<void>;
}

const calculateDuration = (startTime: string, endTime: string): string => {
    if (!startTime || !endTime) return "0 hours 0 minutes";
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    if (end <= start) end.setDate(end.getDate() + 1);
    const diffMs = end.getTime() - start.getTime();
    if (isNaN(diffMs) || diffMs < 0) return "0 hours 0 minutes";
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours} hours ${diffMinutes} minutes`;
}

const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const DayPicker: React.FC<{ selectedDays: number[], onDayToggle: (dayIndex: number) => void }> = ({ selectedDays, onDayToggle }) => {
    return (
        <div className="flex justify-center gap-1">
            {dayLabels.map((label, index) => {
                const isSelected = selectedDays.includes(index);
                return (
                    <button
                        key={index}
                        type="button"
                        onClick={() => onDayToggle(index)}
                        className={`w-8 h-8 rounded-md text-sm font-bold transition-colors ${
                            isSelected 
                                ? 'bg-lucius-lime text-bokara-grey' 
                                : 'bg-bokara-grey/10 text-bokara-grey/60 hover:bg-bokara-grey/20'
                        }`}
                        aria-label={`Toggle ${label}`}
                    >
                        {label}
                    </button>
                )
            })}
        </div>
    );
};

const SettingsPage: React.FC<SettingsPageProps> = ({ 
    statuses, onAddStatus, onRemoveStatus, payrollChangeTypes,
    onAddPayrollChangeType, onUpdatePayrollChangeType, onRemovePayrollChangeType,
    workSchedules, onAddWorkSchedule, onUpdateWorkSchedule, onRemoveWorkSchedule
}) => {
    const [newStatusName, setNewStatusName] = useState('');
    const [newStatusColor, setNewStatusColor] = useState('#888888');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [newPayrollChangeName, setNewPayrollChangeName] = useState('');
    const [newPayrollChangeColor, setNewPayrollChangeColor] = useState('#3B82F6');
    const [newPayrollIsExclusive, setNewPayrollIsExclusive] = useState(false);
    const [newPayrollAdminOnly, setNewPayrollAdminOnly] = useState(false);
    const [newPayrollQuota, setNewPayrollQuota] = useState(0);
    const [isPayrollSubmitting, setIsPayrollSubmitting] = useState(false);

    const [newScheduleName, setNewScheduleName] = useState('');
    const [newScheduleStart, setNewScheduleStart] = useState('07:00');
    const [newScheduleEnd, setNewScheduleEnd] = useState('15:00');
    const [newScheduleDays, setNewScheduleDays] = useState<number[]>([1, 2, 3, 4, 5]);
    const [isScheduleSubmitting, setIsScheduleSubmitting] = useState(false);
    
    const handleAddStatusSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStatusName.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try { await onAddStatus(newStatusName.trim(), newStatusColor); setNewStatusName(''); setNewStatusColor('#888888'); } finally { setIsSubmitting(false); }
    }
    
    const handlePayrollChangeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPayrollChangeName.trim() || isPayrollSubmitting) return;
        setIsPayrollSubmitting(true);
        try { 
            await onAddPayrollChangeType(newPayrollChangeName.trim(), newPayrollChangeColor, newPayrollIsExclusive, newPayrollAdminOnly, newPayrollQuota > 0 ? newPayrollQuota : undefined); 
            setNewPayrollChangeName(''); setNewPayrollChangeColor('#3B82F6'); setNewPayrollIsExclusive(false); setNewPayrollAdminOnly(false); setNewPayrollQuota(0);
        } finally { setIsPayrollSubmitting(false); }
    }

    const handleScheduleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newScheduleName.trim() || isScheduleSubmitting) return;
        setIsScheduleSubmitting(true);
        try { 
            await onAddWorkSchedule({ name: newScheduleName.trim(), startTime: newScheduleStart, endTime: newScheduleEnd, days: newScheduleDays });
            setNewScheduleName(''); setNewScheduleStart('07:00'); setNewScheduleEnd('15:00'); setNewScheduleDays([1, 2, 3, 4, 5]);
        } finally { setIsScheduleSubmitting(false); }
    };

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in space-y-8 pb-10">
        <h1 className="text-3xl font-bold text-bokara-grey">Settings</h1>
      
        <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6">
            <h2 className="text-2xl font-bold text-bokara-grey mb-2">Custom Activity Statuses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-lg font-semibold text-lucius-lime mb-3">Add New Status</h3>
                    <form onSubmit={handleAddStatusSubmit} className="bg-whisper-white/60 p-4 rounded-lg border border-bokara-grey/10">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-bokara-grey mb-1">Status Name</label>
                            <input type="text" value={newStatusName} onChange={(e) => setNewStatusName(e.target.value)} className="w-full bg-bright-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2" required />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-bokara-grey mb-1">Color</label>
                            <input type="color" value={newStatusColor} onChange={(e) => setNewStatusColor(e.target.value)} className="w-full h-10 p-1 bg-bright-white border border-bokara-grey/20 rounded-lg" />
                        </div>
                        <button type="submit" className="w-full bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg">Add Status</button>
                    </form>
                </div>
                <div className="space-y-2">
                    {statuses.map(s => (
                        <div key={s.id} className="flex items-center justify-between bg-whisper-white/60 p-3 rounded-lg">
                            <div className="flex items-center gap-3"><div className="w-5 h-5 rounded-sm" style={{ backgroundColor: s.color }}></div><span className="font-medium">{s.name}</span></div>
                            <button onClick={() => onRemoveStatus(s.id)} className="text-red-500 hover:bg-red-500/10 p-1 rounded-md"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6">
            <h2 className="text-2xl font-bold text-bokara-grey mb-2">Ticket Types (Tiquetera)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-lg font-semibold text-lucius-lime mb-3">Add New Type</h3>
                    <form onSubmit={handlePayrollChangeSubmit} className="bg-whisper-white/60 p-4 rounded-lg border border-bokara-grey/10">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-bokara-grey mb-1">Type Name</label>
                            <input type="text" value={newPayrollChangeName} onChange={(e) => setNewPayrollChangeName(e.target.value)} className="w-full bg-bright-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-bokara-grey mb-1">Color</label>
                                <input type="color" value={newPayrollChangeColor} onChange={(e) => setNewPayrollChangeColor(e.target.value)} className="w-full h-10 p-1 bg-bright-white border border-bokara-grey/20 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-bokara-grey mb-1">Cupo Anual</label>
                                <input type="number" min="0" value={newPayrollQuota} onChange={(e) => setNewPayrollQuota(Number(e.target.value))} className="w-full bg-bright-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2" placeholder="0 = Sin límite" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <label className="flex items-center gap-2 cursor-pointer bg-bright-white p-2 rounded-lg"><input type="checkbox" checked={newPayrollIsExclusive} onChange={(e) => setNewPayrollIsExclusive(e.target.checked)} /><span className="text-xs font-bold">Exclusive?</span></label>
                            <label className="flex items-center gap-2 cursor-pointer bg-bright-white p-2 rounded-lg"><input type="checkbox" checked={newPayrollAdminOnly} onChange={(e) => setNewPayrollAdminOnly(e.target.checked)} /><span className="text-xs font-bold">Admin Only?</span></label>
                        </div>
                        <button type="submit" className="w-full bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg">Add Type</button>
                    </form>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {payrollChangeTypes.map(type => (
                        <div key={type.id} className="bg-whisper-white/60 p-3 rounded-lg border border-bokara-grey/10 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3"><input type="color" value={type.color} onChange={(e) => onUpdatePayrollChangeType(type.id, { color: e.target.value })} className="w-6 h-6 p-0 border-none cursor-pointer bg-transparent" /><span className="font-bold">{type.name}</span></div>
                                <button onClick={() => onRemovePayrollChangeType(type.id)} className="text-red-500 hover:bg-red-500/10 p-1 rounded-md"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-bold text-bokara-grey/60 uppercase">Cupo Anual:</label>
                                    <input type="number" min="0" value={type.yearlyQuota || 0} onChange={(e) => onUpdatePayrollChangeType(type.id, { yearlyQuota: Number(e.target.value) })} className="w-16 bg-white border border-bokara-grey/10 rounded px-1 text-xs" />
                                </div>
                                <div className="flex gap-2">
                                    <label className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={!!type.isExclusive} onChange={(e) => onUpdatePayrollChangeType(type.id, { isExclusive: e.target.checked })} /> Excl.</label>
                                    <label className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={!!type.adminOnly} onChange={(e) => onUpdatePayrollChangeType(type.id, { adminOnly: e.target.checked })} /> AdminOnly</label>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6">
            <h2 className="text-2xl font-bold text-bokara-grey mb-2">Work Schedules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-lg font-semibold text-lucius-lime mb-3">Add New Schedule</h3>
                    <form onSubmit={handleScheduleSubmit} className="bg-whisper-white/60 p-4 rounded-lg border border-bokara-grey/10 space-y-4">
                        <input type="text" value={newScheduleName} onChange={(e) => setNewScheduleName(e.target.value)} className="w-full px-3 py-2 rounded-lg" placeholder="Schedule Name" required />
                        <DayPicker selectedDays={newScheduleDays} onDayToggle={(d) => setNewScheduleDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())} />
                        <div className="grid grid-cols-2 gap-4">
                            <input type="time" value={newScheduleStart} onChange={(e) => setNewScheduleStart(e.target.value)} className="w-full px-3 py-2 rounded-lg" required />
                            <input type="time" value={newScheduleEnd} onChange={(e) => setNewScheduleEnd(e.target.value)} className="w-full px-3 py-2 rounded-lg" required />
                        </div>
                        <button type="submit" className="w-full bg-lucius-lime text-bokara-grey font-bold py-2 rounded-lg">Add Schedule</button>
                    </form>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {workSchedules.map(s => (
                        <div key={s.id} className="bg-whisper-white/60 p-3 rounded-lg border border-bokara-grey/10">
                            <div className="flex justify-between mb-2"><input type="text" value={s.name} onChange={(e) => onUpdateWorkSchedule(s.id, { name: e.target.value })} className="font-bold bg-transparent" /><button onClick={() => onRemoveWorkSchedule(s.id)} className="text-red-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button></div>
                            <div className="flex gap-2 mb-2"><input type="time" value={s.startTime} onChange={(e) => onUpdateWorkSchedule(s.id, { startTime: e.target.value })} className="text-xs bg-white p-1 rounded" /><span>-</span><input type="time" value={s.endTime} onChange={(e) => onUpdateWorkSchedule(s.id, { endTime: e.target.value })} className="text-xs bg-white p-1 rounded" /></div>
                            <DayPicker selectedDays={s.days} onDayToggle={(d) => onUpdateWorkSchedule(s.id, { days: s.days.includes(d) ? s.days.filter(x => x !== d) : [...s.days, d].sort() })} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

export default SettingsPage;
