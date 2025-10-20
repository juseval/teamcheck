import React, { useState } from 'react';
import { ActivityStatus, PayrollChangeType, WorkSchedule } from '../types.ts';

interface SettingsPageProps {
  statuses: ActivityStatus[];
  onAddStatus: (name: string, color: string) => Promise<void>;
  onRemoveStatus: (id: string) => Promise<void>;
  payrollChangeTypes: PayrollChangeType[];
  onAddPayrollChangeType: (name: string, color: string) => Promise<void>;
  onUpdatePayrollChangeType: (id: string, updates: Partial<Omit<PayrollChangeType, 'id'>>) => Promise<void>;
  onRemovePayrollChangeType: (id: string) => Promise<void>;
  workSchedules: WorkSchedule[];
  onAddWorkSchedule: (schedule: Omit<WorkSchedule, 'id'>) => Promise<void>;
  onUpdateWorkSchedule: (id: string, updates: Partial<Omit<WorkSchedule, 'id'>>) => Promise<void>;
  onRemoveWorkSchedule: (id: string) => Promise<void>;
}

// Helper to calculate duration
const calculateDuration = (startTime: string, endTime: string): string => {
    if (!startTime || !endTime) return "0 horas 0 minutos";
    
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);

    if (end <= start) { // Handles overnight shifts
        end.setDate(end.getDate() + 1);
    }
    
    const diffMs = end.getTime() - start.getTime();
    if (isNaN(diffMs) || diffMs < 0) return "0 horas 0 minutos";
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${diffHours} horas ${diffMinutes} minutos`;
}

const dayLabels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

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
    statuses, 
    onAddStatus, 
    onRemoveStatus,
    payrollChangeTypes,
    onAddPayrollChangeType,
    onUpdatePayrollChangeType,
    onRemovePayrollChangeType,
    workSchedules,
    onAddWorkSchedule,
    onUpdateWorkSchedule,
    onRemoveWorkSchedule
}) => {
    const [newStatusName, setNewStatusName] = useState('');
    const [newStatusColor, setNewStatusColor] = useState('#888888');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [newPayrollChangeName, setNewPayrollChangeName] = useState('');
    const [newPayrollChangeColor, setNewPayrollChangeColor] = useState('#3B82F6');
    const [isPayrollSubmitting, setIsPayrollSubmitting] = useState(false);

    const [newScheduleName, setNewScheduleName] = useState('');
    const [newScheduleStart, setNewScheduleStart] = useState('07:00');
    const [newScheduleEnd, setNewScheduleEnd] = useState('15:00');
    const [newScheduleDays, setNewScheduleDays] = useState<number[]>([1, 2, 3, 4, 5]);
    const [isScheduleSubmitting, setIsScheduleSubmitting] = useState(false);

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStatusName.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onAddStatus(newStatusName.trim(), newStatusColor);
            setNewStatusName('');
            setNewStatusColor('#888888');
        } catch (error) {
            console.error("Failed to add status", error);
            // In a real app, show an error message to the user
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const handlePayrollChangeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPayrollChangeName.trim() || isPayrollSubmitting) return;

        setIsPayrollSubmitting(true);
        try {
            await onAddPayrollChangeType(newPayrollChangeName.trim(), newPayrollChangeColor);
            setNewPayrollChangeName('');
            setNewPayrollChangeColor('#3B82F6');
        } catch (error) {
            console.error("Failed to add payroll change type", error);
        } finally {
            setIsPayrollSubmitting(false);
        }
    }

    const handleNewScheduleDayToggle = (dayIndex: number) => {
        setNewScheduleDays(prev => 
            prev.includes(dayIndex) 
                ? prev.filter(d => d !== dayIndex)
                : [...prev, dayIndex].sort()
        );
    };
    
    const handleScheduleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newScheduleName.trim() || !newScheduleStart || !newScheduleEnd || newScheduleDays.length === 0 || isScheduleSubmitting) return;

        setIsScheduleSubmitting(true);
        try {
            await onAddWorkSchedule({
                name: newScheduleName.trim(),
                startTime: newScheduleStart,
                endTime: newScheduleEnd,
                days: newScheduleDays
            });
            setNewScheduleName('');
            setNewScheduleStart('07:00');
            setNewScheduleEnd('15:00');
            setNewScheduleDays([1, 2, 3, 4, 5]);
        } catch (error) {
            console.error("Failed to add work schedule", error);
        } finally {
            setIsScheduleSubmitting(false);
        }
    };
    
    const handleExistingScheduleDayToggle = (schedule: WorkSchedule, dayIndex: number) => {
        const updatedDays = schedule.days.includes(dayIndex)
            ? schedule.days.filter(d => d !== dayIndex)
            : [...schedule.days, dayIndex].sort();
        
        if (updatedDays.length > 0) { // Prevent removing all days
            onUpdateWorkSchedule(schedule.id, { days: updatedDays });
        }
    };


  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in space-y-8">
        <h1 className="text-3xl font-bold text-bokara-grey">Settings</h1>
      
        {/* Custom Activity Statuses Section */}
        <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6">
            <h2 className="text-2xl font-bold text-bokara-grey mb-2">Custom Activity Statuses</h2>
            <p className="text-bokara-grey/80 mb-6">Add or remove statuses that employees can select during their workday (e.g., Training, Client Meeting).</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Add New Status Form */}
                <div>
                    <h3 className="text-lg font-semibold text-lucius-lime mb-3">Add New Status</h3>
                    <form onSubmit={handleAddSubmit} className="bg-whisper-white/60 p-4 rounded-lg border border-bokara-grey/10">
                        <div className="mb-4">
                            <label htmlFor="statusName" className="block text-sm font-medium text-bokara-grey mb-1">Status Name</label>
                            <input
                                id="statusName"
                                type="text"
                                value={newStatusName}
                                onChange={(e) => setNewStatusName(e.target.value)}
                                className="w-full bg-bright-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime"
                                placeholder="e.g., Training"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="statusColor" className="block text-sm font-medium text-bokara-grey mb-1">Color</label>
                            <input
                                id="statusColor"
                                type="color"
                                value={newStatusColor}
                                onChange={(e) => setNewStatusColor(e.target.value)}
                                className="w-full h-10 p-1 bg-bright-white border border-bokara-grey/20 rounded-lg cursor-pointer"
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={!newStatusName.trim() || isSubmitting}
                            className="w-full bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg transition-colors shadow-sm disabled:bg-lucius-lime/40 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Adding...' : 'Add Status'}
                        </button>
                    </form>
                </div>

                {/* Existing Statuses List */}
                <div>
                    <h3 className="text-lg font-semibold text-lucius-lime mb-3">Existing Statuses</h3>
                    <div className="space-y-2">
                        {statuses.length > 0 ? statuses.map(status => (
                            <div key={status.id} className="flex items-center justify-between bg-whisper-white/60 p-3 rounded-lg border border-bokara-grey/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-sm flex-shrink-0" style={{ backgroundColor: status.color }}></div>
                                    <span className="font-medium text-bokara-grey">{status.name}</span>
                                </div>
                                <button 
                                    onClick={() => onRemoveStatus(status.id)}
                                    className="text-red-500/70 hover:text-red-600 hover:bg-red-500/10 p-1 rounded-md"
                                    aria-label={`Remove ${status.name} status`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        )) : (
                            <p className="text-bokara-grey/60 text-center py-8">No custom statuses added yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Payroll Changes Section */}
        <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6">
            <h2 className="text-2xl font-bold text-bokara-grey mb-2">Payroll Changes (Novedades)</h2>
            <p className="text-bokara-grey/80 mb-6">Manage the types of events that affect payroll, such as vacation, sick days, etc.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Add New Form */}
                <div>
                    <h3 className="text-lg font-semibold text-lucius-lime mb-3">Add New Type</h3>
                    <form onSubmit={handlePayrollChangeSubmit} className="bg-whisper-white/60 p-4 rounded-lg border border-bokara-grey/10">
                        <div className="mb-4">
                            <label htmlFor="payrollChangeName" className="block text-sm font-medium text-bokara-grey mb-1">Type Name</label>
                            <input
                                id="payrollChangeName"
                                type="text"
                                value={newPayrollChangeName}
                                onChange={(e) => setNewPayrollChangeName(e.target.value)}
                                className="w-full bg-bright-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime"
                                placeholder="e.g., Vacation"
                                required
                            />
                        </div>
                         <div className="mb-4">
                            <label htmlFor="payrollChangeColor" className="block text-sm font-medium text-bokara-grey mb-1">Color</label>
                            <input
                                id="payrollChangeColor"
                                type="color"
                                value={newPayrollChangeColor}
                                onChange={(e) => setNewPayrollChangeColor(e.target.value)}
                                className="w-full h-10 p-1 bg-bright-white border border-bokara-grey/20 rounded-lg cursor-pointer"
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={!newPayrollChangeName.trim() || isPayrollSubmitting}
                            className="w-full bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg transition-colors shadow-sm disabled:bg-lucius-lime/40 disabled:cursor-not-allowed"
                        >
                            {isPayrollSubmitting ? 'Adding...' : 'Add Type'}
                        </button>
                    </form>
                </div>

                {/* Existing List */}
                <div>
                    <h3 className="text-lg font-semibold text-lucius-lime mb-3">Existing Types</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {payrollChangeTypes.length > 0 ? payrollChangeTypes.map(type => (
                            <div key={type.id} className="flex items-center justify-between bg-whisper-white/60 p-2 rounded-lg border border-bokara-grey/10">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={type.color}
                                        onChange={(e) => onUpdatePayrollChangeType(type.id, { color: e.target.value })}
                                        className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"
                                        aria-label={`Change color for ${type.name}`}
                                    />
                                    <span className="font-medium text-bokara-grey">{type.name}</span>
                                </div>
                                <button 
                                    onClick={() => onRemovePayrollChangeType(type.id)}
                                    className="text-red-500/70 hover:text-red-600 hover:bg-red-500/10 p-1 rounded-md"
                                    aria-label={`Remove ${type.name}`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        )) : (
                            <p className="text-bokara-grey/60 text-center py-8">No payroll change types added yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>

         {/* Work Schedule Blocks Section */}
        <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6">
            <h2 className="text-2xl font-bold text-bokara-grey mb-2">Bloques de Horarios</h2>
            <p className="text-bokara-grey/80 mb-6">Define los diferentes turnos de trabajo para tu equipo.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Add New Form */}
                <div>
                    <h3 className="text-lg font-semibold text-lucius-lime mb-3">Agregar Nuevo Horario</h3>
                    <form onSubmit={handleScheduleSubmit} className="bg-whisper-white/60 p-4 rounded-lg border border-bokara-grey/10 space-y-4">
                        <div>
                            <label htmlFor="scheduleName" className="block text-sm font-medium text-bokara-grey mb-1">Nombre del Horario</label>
                            <input
                                id="scheduleName"
                                type="text"
                                value={newScheduleName}
                                onChange={(e) => setNewScheduleName(e.target.value)}
                                className="w-full bg-bright-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime"
                                placeholder="e.g., Horario A"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-bokara-grey mb-2">Días de la Semana</label>
                            <DayPicker selectedDays={newScheduleDays} onDayToggle={handleNewScheduleDayToggle} />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="scheduleStart" className="block text-sm font-medium text-bokara-grey mb-1">Hora de Inicio</label>
                                <input
                                    id="scheduleStart"
                                    type="time"
                                    value={newScheduleStart}
                                    onChange={(e) => setNewScheduleStart(e.target.value)}
                                    className="w-full bg-bright-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime"
                                    required
                                />
                            </div>
                             <div>
                                <label htmlFor="scheduleEnd" className="block text-sm font-medium text-bokara-grey mb-1">Hora de Fin</label>
                                <input
                                    id="scheduleEnd"
                                    type="time"
                                    value={newScheduleEnd}
                                    onChange={(e) => setNewScheduleEnd(e.target.value)}
                                    className="w-full bg-bright-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime"
                                    required
                                />
                            </div>
                        </div>
                        <div className="text-center bg-lucius-lime/10 p-2 rounded-md text-sm font-semibold text-bokara-grey">
                            Total: {calculateDuration(newScheduleStart, newScheduleEnd)}
                        </div>
                        <button 
                            type="submit"
                            disabled={!newScheduleName.trim() || newScheduleDays.length === 0 || isScheduleSubmitting}
                            className="w-full bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg transition-colors shadow-sm disabled:bg-lucius-lime/40 disabled:cursor-not-allowed"
                        >
                            {isScheduleSubmitting ? 'Agregando...' : 'Agregar Horario'}
                        </button>
                    </form>
                </div>

                {/* Existing List */}
                <div>
                    <h3 className="text-lg font-semibold text-lucius-lime mb-3">Horarios Existentes</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {workSchedules.length > 0 ? workSchedules.map(schedule => (
                            <div key={schedule.id} className="bg-whisper-white/60 p-3 rounded-lg border border-bokara-grey/10 space-y-2">
                                <div className="grid gap-x-2 items-center" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) auto auto auto minmax(0, 1fr) auto' }}>
                                    <input 
                                        type="text"
                                        value={schedule.name}
                                        onChange={(e) => onUpdateWorkSchedule(schedule.id, { name: e.target.value })}
                                        className="font-medium text-bokara-grey truncate pr-2 bg-transparent focus:outline-none border-b border-dashed border-transparent focus:border-lucius-lime"
                                        title={schedule.name}
                                    />
                                    
                                    <input 
                                        type="time" 
                                        value={schedule.startTime} 
                                        onChange={(e) => onUpdateWorkSchedule(schedule.id, { startTime: e.target.value })}
                                        className="w-full bg-transparent text-center border-b border-dashed border-bokara-grey/40 focus:outline-none focus:border-lucius-lime p-1"
                                    />
                                    <div className="text-center text-bokara-grey/80">-</div>
                                    <input 
                                        type="time" 
                                        value={schedule.endTime} 
                                        onChange={(e) => onUpdateWorkSchedule(schedule.id, { endTime: e.target.value })}
                                        className="w-full bg-transparent text-center border-b border-dashed border-bokara-grey/40 focus:outline-none focus:border-lucius-lime p-1"
                                    />
                                    
                                    <div className="text-xs text-center text-lucius-lime font-semibold p-1 bg-lucius-lime/10 rounded-md whitespace-nowrap overflow-hidden text-ellipsis">
                                        {calculateDuration(schedule.startTime, schedule.endTime)}
                                    </div>
                                    
                                    <button 
                                        onClick={() => onRemoveWorkSchedule(schedule.id)}
                                        className="text-red-500/70 hover:text-red-600 hover:bg-red-500/10 p-1 rounded-md justify-self-end"
                                        aria-label={`Remove ${schedule.name}`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                                <DayPicker selectedDays={schedule.days} onDayToggle={(dayIndex) => handleExistingScheduleDayToggle(schedule, dayIndex)} />
                            </div>
                        )) : (
                            <p className="text-bokara-grey/60 text-center py-8">No hay horarios definidos.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SettingsPage;