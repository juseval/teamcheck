import React, { useState, useEffect } from 'react';
import { ActivityStatus, PayrollChangeType, WorkSchedule } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { PlugIcon } from '../components/Icons';
import { getNotificationRecipients, addNotificationRecipient, removeNotificationRecipient, getEmailConfig, saveEmailConfig } from '../services/apiService';

interface SettingsPageProps {
  statuses: ActivityStatus[];
  onAddStatus: (name: string, color: string) => Promise<void>;
  onRemoveStatus: (id: string) => Promise<void>;
  payrollChangeTypes: PayrollChangeType[];
  onAddPayrollChangeType: (
    name: string,
    color: string,
    requiereAprobacion: boolean,
    soloAdmin: boolean,
    yearlyQuota?: number,
    semesterQuota?: number
  ) => Promise<void>;
  onUpdatePayrollChangeType: (id: string, updates: Partial<Omit<PayrollChangeType, 'id'>>) => Promise<void>;
  onRemovePayrollChangeType: (id: string) => Promise<void>;
  workSchedules: WorkSchedule[];
  onAddWorkSchedule: (schedule: Omit<WorkSchedule, 'id' | 'companyId'>) => Promise<void>;
  onUpdateWorkSchedule: (id: string, updates: Partial<Omit<WorkSchedule, 'id'>>) => Promise<void>;
  onRemoveWorkSchedule: (id: string) => Promise<void>;
  companyId?: string;
  inviteCode?: string;
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
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
};

// ── Checkbox bonito reutilizable ──
const ToggleCheck: React.FC<{
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    sublabel?: string;
}> = ({ checked, onChange, label, sublabel }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`flex items-start gap-2 p-2 rounded-lg border transition-all cursor-pointer text-left w-full
            ${checked ? 'bg-lucius-lime/10 border-lucius-lime/40' : 'bg-bright-white border-bokara-grey/15 hover:border-bokara-grey/30'}`}
    >
        <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
            ${checked ? 'bg-lucius-lime border-lucius-lime' : 'bg-white border-bokara-grey/30'}`}>
            {checked && (
                <svg className="w-2.5 h-2.5 text-bokara-grey" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            )}
        </div>
        <div>
            <p className="text-xs font-bold text-bokara-grey leading-tight">{label}</p>
            {sublabel && <p className="text-[10px] text-bokara-grey/50 leading-tight mt-0.5">{sublabel}</p>}
        </div>
    </button>
);

const SettingsPage: React.FC<SettingsPageProps> = ({ 
    statuses, onAddStatus, onRemoveStatus, payrollChangeTypes,
    onAddPayrollChangeType, onUpdatePayrollChangeType, onRemovePayrollChangeType,
    workSchedules, onAddWorkSchedule, onUpdateWorkSchedule, onRemoveWorkSchedule,
    companyId, inviteCode
}) => {
    const { addNotification } = useNotification();
    const [activeSection, setActiveSection] = useState<'general' | 'integrations'>('general');
    
    // Status Logic
    const [newStatusName, setNewStatusName] = useState('');
    const [newStatusColor, setNewStatusColor] = useState('#888888');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Payroll Type Logic
    const [newPayrollChangeName, setNewPayrollChangeName] = useState('');
    const [newPayrollChangeColor, setNewPayrollChangeColor] = useState('#3B82F6');
    const [newPayrollRequiereAprobacion, setNewPayrollRequiereAprobacion] = useState(false);
    const [newPayrollSoloAdmin, setNewPayrollSoloAdmin] = useState(false);
    const [newPayrollQuota, setNewPayrollQuota] = useState(0);
    const [newPayrollSemesterQuota, setNewPayrollSemesterQuota] = useState(0);
    const [isPayrollSubmitting, setIsPayrollSubmitting] = useState(false);

    // Schedule Logic
    const [newScheduleName, setNewScheduleName] = useState('');
    const [newScheduleStart, setNewScheduleStart] = useState('07:00');
    const [newScheduleEnd, setNewScheduleEnd] = useState('15:00');
    const [newScheduleDays, setNewScheduleDays] = useState<number[]>([1, 2, 3, 4, 5]);
    const [isScheduleSubmitting, setIsScheduleSubmitting] = useState(false);

    // Notifications Logic
    const [notifRecipients, setNotifRecipients] = useState<string[]>([]);
    const [newRecipientEmail, setNewRecipientEmail] = useState('');
    const [isAddingEmail, setIsAddingEmail] = useState(false);

    // Email Integration Logic (EmailJS)
    const [emailConfig, setEmailConfig] = useState({ serviceId: '', templateId: '', publicKey: '' });
    const [isSavingEmail, setIsSavingEmail] = useState(false);
    const [isTestingEmail, setIsTestingEmail] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            const list = await getNotificationRecipients();
            setNotifRecipients(list);
            const config = await getEmailConfig();
            if (config) setEmailConfig(config);
        };
        loadSettings();
    }, []);
    
    const handleAddStatusSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStatusName.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try { await onAddStatus(newStatusName.trim(), newStatusColor); setNewStatusName(''); setNewStatusColor('#888888'); } 
        finally { setIsSubmitting(false); }
    };
    
    const handlePayrollChangeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPayrollChangeName.trim() || isPayrollSubmitting) return;
        setIsPayrollSubmitting(true);
        try { 
            await onAddPayrollChangeType(
                newPayrollChangeName.trim(),
                newPayrollChangeColor,
                newPayrollRequiereAprobacion,
                newPayrollSoloAdmin,
                newPayrollQuota > 0 ? newPayrollQuota : undefined,
                newPayrollSemesterQuota > 0 ? newPayrollSemesterQuota : undefined
            ); 
            setNewPayrollChangeName('');
            setNewPayrollChangeColor('#3B82F6');
            setNewPayrollRequiereAprobacion(false);
            setNewPayrollSoloAdmin(false);
            setNewPayrollQuota(0);
            setNewPayrollSemesterQuota(0);
        } finally { setIsPayrollSubmitting(false); }
    };

    const handleScheduleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newScheduleName.trim() || isScheduleSubmitting) return;
        setIsScheduleSubmitting(true);
        try { 
            await onAddWorkSchedule({ name: newScheduleName.trim(), startTime: newScheduleStart, endTime: newScheduleEnd, days: newScheduleDays });
            setNewScheduleName(''); setNewScheduleStart('07:00'); setNewScheduleEnd('15:00'); setNewScheduleDays([1, 2, 3, 4, 5]);
        } finally { setIsScheduleSubmitting(false); }
    };

    const handleAddRecipient = async (e: React.FormEvent) => {
        e.preventDefault();
        const email = newRecipientEmail.trim().toLowerCase();
        if (!email || isAddingEmail) return;
        if (notifRecipients.includes(email)) { addNotification("Este correo ya está en la lista.", 'error'); return; }
        setIsAddingEmail(true);
        try {
            await addNotificationRecipient(email);
            setNotifRecipients([...notifRecipients, email]);
            setNewRecipientEmail('');
            addNotification("Correo agregado exitosamente.", 'success');
        } catch { addNotification("Error al agregar correo.", 'error'); } 
        finally { setIsAddingEmail(false); }
    };

    const handleRemoveRecipient = async (email: string) => {
        try {
            await removeNotificationRecipient(email);
            setNotifRecipients(notifRecipients.filter(e => e !== email));
            addNotification("Correo eliminado.", 'success');
        } catch { addNotification("Error al eliminar correo.", 'error'); }
    };

    const handleSaveEmailConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingEmail(true);
        try { await saveEmailConfig(emailConfig); addNotification("Configuración de correo guardada.", 'success'); }
        catch { addNotification("Error al guardar configuración.", 'error'); }
        finally { setIsSavingEmail(false); }
    };

    const handleTestEmail = async () => {
        if (!emailConfig.serviceId || !emailConfig.templateId || !emailConfig.publicKey) {
            addNotification("Primero completa todos los campos de EmailJS.", 'error'); return;
        }
        if (notifRecipients.length === 0) {
            addNotification("Debes agregar al menos un correo en 'Notificaciones de RRHH' para probar.", 'error'); return;
        }
        setIsTestingEmail(true);
        try {
            const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: emailConfig.serviceId,
                    template_id: emailConfig.templateId,
                    user_id: emailConfig.publicKey,
                    template_params: {
                        recipient_email: notifRecipients[0],
                        user_name: "Soporte TeamCheck",
                        request_type: "PRUEBA DE CONEXIÓN",
                        start_date: new Date().toLocaleDateString(),
                        end_date: new Date().toLocaleDateString()
                    }
                })
            });
            if (response.ok) addNotification(`¡Prueba exitosa! Revisa ${notifRecipients[0]}`, 'success');
            else throw new Error(await response.text());
        } catch (error: any) {
            addNotification(`Error de EmailJS: ${error.message}`, 'error');
        } finally { setIsTestingEmail(false); }
    };

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in space-y-8 pb-10">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-bokara-grey">Configuración del Sistema</h1>
            <div className="bg-white border border-bokara-grey/10 rounded-lg p-1 flex gap-1 shadow-sm">
                <button onClick={() => setActiveSection('general')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeSection === 'general' ? 'bg-lucius-lime text-bokara-grey shadow-sm' : 'text-bokara-grey/40 hover:text-bokara-grey'}`}>General</button>
                <button onClick={() => setActiveSection('integrations')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeSection === 'integrations' ? 'bg-bokara-grey text-white shadow-sm' : 'text-bokara-grey/40 hover:text-bokara-grey'}`}>
                    <PlugIcon className="w-4 h-4" /> Integraciones
                </button>
            </div>
        </div>

        {activeSection === 'general' ? (
            <div className="space-y-8">
                {/* CÓDIGO DE INVITACIÓN */}
                <div className="bg-lucius-lime rounded-2xl shadow-xl p-8 border border-bokara-grey/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-10 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform">
                        <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="text-center md:text-left">
                            <h2 className="text-3xl font-black text-bokara-grey mb-2 uppercase tracking-tight">Código de tu Equipo</h2>
                            <p className="text-bokara-grey/60 font-medium max-w-md">Comparte este código con tus colaboradores para que se unan a tu organización automáticamente.</p>
                        </div>
                        <div className="flex flex-col items-center gap-4">
                            <div className="bg-white/40 backdrop-blur-md border-2 border-bokara-grey/10 rounded-3xl px-10 py-6 shadow-inner flex flex-col items-center">
                                <span className="text-[10px] font-bold text-bokara-grey/40 uppercase tracking-[0.3em] mb-2">Código de Invitación</span>
                                <span className="text-5xl font-black text-bokara-grey font-mono tracking-widest">{inviteCode || '--- ---'}</span>
                            </div>
                            <button onClick={() => { if (inviteCode) { navigator.clipboard.writeText(inviteCode); addNotification("¡Código copiado!", 'success'); } }} className="flex items-center gap-2 bg-bokara-grey text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition-all shadow-lg active:scale-95">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                Copiar Código
                            </button>
                        </div>
                    </div>
                </div>

                {/* NOTIFICACIONES DE RRHH */}
                <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-lucius-lime/10 rounded-lg text-lucius-lime">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                        <h2 className="text-2xl font-bold text-bokara-grey">Notificaciones de RRHH</h2>
                    </div>
                    <p className="text-sm text-bokara-grey/60 mb-6">Correos que reciben alertas cuando un colaborador solicita novedades.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <form onSubmit={handleAddRecipient} className="bg-whisper-white/40 p-4 rounded-xl border border-bokara-grey/5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-bokara-grey/40 uppercase mb-2">Nuevo Destinatario</label>
                                <input type="email" placeholder="correo@ejemplo.com" className="w-full bg-white border border-bokara-grey/10 rounded-lg p-2 text-sm focus:ring-2 focus:ring-lucius-lime outline-none" value={newRecipientEmail} onChange={e => setNewRecipientEmail(e.target.value)} required />
                            </div>
                            <button type="submit" disabled={isAddingEmail} className="w-full bg-bokara-grey text-white font-bold py-2 rounded-lg text-sm hover:bg-black transition-all disabled:opacity-50">
                                {isAddingEmail ? 'Agregando...' : 'Agregar a Alertas'}
                            </button>
                        </form>
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                            {notifRecipients.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-300 py-8 italic border-2 border-dashed border-gray-100 rounded-xl">
                                    <p className="text-xs">No hay destinatarios configurados.</p>
                                </div>
                            ) : notifRecipients.map(email => (
                                <div key={email} className="flex items-center justify-between bg-white border border-bokara-grey/5 p-3 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-lucius-lime/10 flex items-center justify-center text-lucius-lime">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" /></svg>
                                        </div>
                                        <span className="text-sm font-medium text-bokara-grey">{email}</span>
                                    </div>
                                    <button onClick={() => handleRemoveRecipient(email)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ESTADOS DE ACTIVIDAD */}
                <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6">
                    <h2 className="text-2xl font-bold text-bokara-grey mb-2">Estados de Actividad Personalizados</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-semibold text-lucius-lime mb-3">Agregar Nuevo Estado</h3>
                            <form onSubmit={handleAddStatusSubmit} className="bg-whisper-white/60 p-4 rounded-lg border border-bokara-grey/10">
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-bokara-grey mb-1">Nombre del Estado</label>
                                    <input type="text" value={newStatusName} onChange={e => setNewStatusName(e.target.value)} className="w-full bg-bright-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2" required />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-bokara-grey mb-1">Color</label>
                                    <input type="color" value={newStatusColor} onChange={e => setNewStatusColor(e.target.value)} className="w-full h-10 p-1 bg-bright-white border border-bokara-grey/20 rounded-lg" />
                                </div>
                                <button type="submit" className="w-full bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg">Agregar Estado</button>
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

                {/* TIPOS DE NOVEDADES */}
                <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6">
                    <h2 className="text-2xl font-bold text-bokara-grey mb-2">Tipos de Novedades (Tiquetera)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-semibold text-lucius-lime mb-3">Agregar Nuevo Tipo</h3>
                            <form onSubmit={handlePayrollChangeSubmit} className="bg-whisper-white/60 p-4 rounded-lg border border-bokara-grey/10 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-bokara-grey mb-1">Nombre de la Novedad</label>
                                    <input type="text" value={newPayrollChangeName} onChange={e => setNewPayrollChangeName(e.target.value)} className="w-full bg-bright-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2" required />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-bokara-grey mb-1">Color</label>
                                    <input type="color" value={newPayrollChangeColor} onChange={e => setNewPayrollChangeColor(e.target.value)} className="w-full h-10 p-1 bg-bright-white border border-bokara-grey/20 rounded-lg" />
                                </div>

                                {/* Cupos */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-bokara-grey/60 uppercase tracking-wide mb-1">Cupo Anual</label>
                                        <input type="number" min="0" value={newPayrollQuota} onChange={e => setNewPayrollQuota(Number(e.target.value))} className="w-full bg-bright-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 text-sm" placeholder="0 = sin límite" />
                                        <p className="text-[9px] text-bokara-grey/40 mt-0.5">Máx. usos por año</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-bokara-grey/60 uppercase tracking-wide mb-1">Cupo Semestral</label>
                                        <input type="number" min="0" value={newPayrollSemesterQuota} onChange={e => setNewPayrollSemesterQuota(Number(e.target.value))} className="w-full bg-bright-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 text-sm" placeholder="0 = sin límite" />
                                        <p className="text-[9px] text-bokara-grey/40 mt-0.5">Activa ventanas S1/S2</p>
                                    </div>
                                </div>

                                {/* Toggles renombrados */}
                                <div className="space-y-2">
                                    <ToggleCheck
                                        checked={newPayrollRequiereAprobacion}
                                        onChange={setNewPayrollRequiereAprobacion}
                                        label="Requiere Aprobación"
                                        sublabel="El colaborador solicita y el admin aprueba antes de que cuente en la tabla anual."
                                    />
                                    <ToggleCheck
                                        checked={newPayrollSoloAdmin}
                                        onChange={setNewPayrollSoloAdmin}
                                        label="Solo Admin"
                                        sublabel="El admin lo registra directamente; el colaborador no puede solicitarlo."
                                    />
                                </div>

                                <button type="submit" disabled={isPayrollSubmitting} className="w-full bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg disabled:opacity-50">
                                    {isPayrollSubmitting ? 'Guardando...' : 'Agregar Tipo'}
                                </button>
                            </form>
                        </div>

                        {/* Lista de tipos existentes */}
                        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                            {payrollChangeTypes.map(type => {
                                // Compatibilidad: leer campo nuevo O campo viejo (datos legacy en Firestore)
                                const reqAprobacion = !!(type.requiereAprobacion ?? type.isExclusive);
                                const soloAdm       = !!(type.soloAdmin ?? type.adminOnly);
                                return (
                                <div key={type.id} className="bg-whisper-white/60 p-3 rounded-lg border border-bokara-grey/10 space-y-3">
                                    {/* Cabecera: color + nombre + delete */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={type.color} onChange={e => onUpdatePayrollChangeType(type.id, { color: e.target.value })} className="w-6 h-6 p-0 border-none cursor-pointer bg-transparent rounded" />
                                            <span className="font-bold text-bokara-grey">{type.name}</span>
                                        </div>
                                        <button onClick={() => onRemovePayrollChangeType(type.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-md transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        </button>
                                    </div>

                                    {/* Cupos — guarda onBlur para no llamar Firestore en cada tecla */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <label className="text-[10px] font-bold text-bokara-grey/50 uppercase whitespace-nowrap">Cupo Anual:</label>
                                            <input
                                                type="number" min="0"
                                                defaultValue={type.yearlyQuota ?? 0}
                                                key={`ya-${type.id}-${type.yearlyQuota}`}
                                                onBlur={e => {
                                                    const v = e.target.value === '' ? undefined : Number(e.target.value);
                                                    onUpdatePayrollChangeType(type.id, { yearlyQuota: v });
                                                }}
                                                className="w-14 bg-white border border-bokara-grey/10 rounded px-1 py-0.5 text-xs"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <label className="text-[10px] font-bold text-bokara-grey/50 uppercase whitespace-nowrap">Cupo Sem.:</label>
                                            <input
                                                type="number" min="0"
                                                defaultValue={type.semesterQuota ?? 0}
                                                key={`sq-${type.id}-${type.semesterQuota}`}
                                                onBlur={e => {
                                                    const v = e.target.value === '' ? undefined : Number(e.target.value);
                                                    onUpdatePayrollChangeType(type.id, { semesterQuota: v });
                                                }}
                                                className="w-14 bg-white border border-bokara-grey/10 rounded px-1 py-0.5 text-xs"
                                            />
                                        </div>
                                    </div>

                                    {/* Toggles inline — usan reqAprobacion/soloAdm que leen campo nuevo O viejo */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onUpdatePayrollChangeType(type.id, { requiereAprobacion: !reqAprobacion, isExclusive: !reqAprobacion })}
                                            className={`flex items-center gap-1.5 p-1.5 rounded-md border cursor-pointer transition-all text-[10px] font-bold
                                                ${reqAprobacion ? 'bg-lucius-lime/10 border-lucius-lime/30 text-bokara-grey' : 'bg-white border-bokara-grey/10 text-bokara-grey/50'}`}>
                                            <div className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${reqAprobacion ? 'bg-lucius-lime border-lucius-lime' : 'border-bokara-grey/30'}`}>
                                                {reqAprobacion && <svg className="w-2 h-2 text-bokara-grey" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                                            </div>
                                            Req. Aprobación
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onUpdatePayrollChangeType(type.id, { soloAdmin: !soloAdm, adminOnly: !soloAdm })}
                                            className={`flex items-center gap-1.5 p-1.5 rounded-md border cursor-pointer transition-all text-[10px] font-bold
                                                ${soloAdm ? 'bg-bokara-grey/10 border-bokara-grey/30 text-bokara-grey' : 'bg-white border-bokara-grey/10 text-bokara-grey/50'}`}>
                                            <div className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${soloAdm ? 'bg-bokara-grey border-bokara-grey' : 'border-bokara-grey/30'}`}>
                                                {soloAdm && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                                            </div>
                                            Solo Admin
                                        </button>
                                    </div>

                                    {/* Chips de info */}
                                    {(type.semesterQuota || type.yearlyQuota) ? (
                                        <div className="flex flex-wrap gap-1">
                                            {type.semesterQuota ? (
                                                <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded-full font-bold">
                                                    📅 {type.semesterQuota}/semestre → ventana S1: dic–may · S2: jun–nov
                                                </span>
                                            ) : (
                                                <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded-full font-bold">
                                                    📆 {type.yearlyQuota}/año
                                                </span>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* HORARIOS DE TRABAJO */}
                <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6">
                    <h2 className="text-2xl font-bold text-bokara-grey mb-2">Horarios de Trabajo</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-semibold text-lucius-lime mb-3">Agregar Nuevo Horario</h3>
                            <form onSubmit={handleScheduleSubmit} className="bg-whisper-white/60 p-4 rounded-lg border border-bokara-grey/10 space-y-4">
                                <input type="text" value={newScheduleName} onChange={e => setNewScheduleName(e.target.value)} className="w-full px-3 py-2 rounded-lg" placeholder="Nombre del horario" required />
                                <DayPicker selectedDays={newScheduleDays} onDayToggle={d => setNewScheduleDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="time" value={newScheduleStart} onChange={e => setNewScheduleStart(e.target.value)} className="w-full px-3 py-2 rounded-lg" required />
                                    <input type="time" value={newScheduleEnd} onChange={e => setNewScheduleEnd(e.target.value)} className="w-full px-3 py-2 rounded-lg" required />
                                </div>
                                <button type="submit" className="w-full bg-lucius-lime text-bokara-grey font-bold py-2 rounded-lg">Agregar Horario</button>
                            </form>
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {workSchedules.map(s => (
                                <div key={s.id} className="bg-whisper-white/60 p-3 rounded-lg border border-bokara-grey/10">
                                    <div className="flex justify-between mb-2">
                                        <input type="text" value={s.name} onChange={e => onUpdateWorkSchedule(s.id, { name: e.target.value })} className="font-bold bg-transparent" />
                                        <button onClick={() => onRemoveWorkSchedule(s.id)} className="text-red-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                                    </div>
                                    <div className="flex gap-2 mb-2">
                                        <input type="time" value={s.startTime} onChange={e => onUpdateWorkSchedule(s.id, { startTime: e.target.value })} className="text-xs bg-white p-1 rounded" />
                                        <span>-</span>
                                        <input type="time" value={s.endTime} onChange={e => onUpdateWorkSchedule(s.id, { endTime: e.target.value })} className="text-xs bg-white p-1 rounded" />
                                    </div>
                                    <DayPicker selectedDays={s.days} onDayToggle={d => onUpdateWorkSchedule(s.id, { days: s.days.includes(d) ? s.days.filter(x => x !== d) : [...s.days, d].sort() })} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            /* ── INTEGRACIONES ── */
            <div className="space-y-8 animate-fade-in">
                <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-blue-100 rounded-2xl text-blue-700 shadow-sm border border-blue-200">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-bokara-grey">Servicio de Alertas (EmailJS)</h2>
                            <p className="text-bokara-grey/50">Integración gratuita para correos automáticos sin suscripciones a Google.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <form onSubmit={handleSaveEmailConfig} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-bokara-grey/40 uppercase tracking-widest mb-1">Service ID <span className="text-red-500">*</span></label>
                                <input type="text" value={emailConfig.serviceId} onChange={e => setEmailConfig({...emailConfig, serviceId: e.target.value})} className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg p-2 text-sm focus:ring-2 focus:ring-lucius-lime outline-none" placeholder="service_xxxxxx" required />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-bokara-grey/40 uppercase tracking-widest mb-1">Template ID <span className="text-red-500">*</span></label>
                                <input type="text" value={emailConfig.templateId} onChange={e => setEmailConfig({...emailConfig, templateId: e.target.value})} className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg p-2 text-sm focus:ring-2 focus:ring-lucius-lime outline-none" placeholder="template_xxxxxx" required />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-bokara-grey/40 uppercase tracking-widest mb-1">Public Key <span className="text-red-500">*</span></label>
                                <input type="text" value={emailConfig.publicKey} onChange={e => setEmailConfig({...emailConfig, publicKey: e.target.value})} className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg p-2 text-sm focus:ring-2 focus:ring-lucius-lime outline-none" placeholder="user_xxxxxx" required />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button type="submit" disabled={isSavingEmail} className="bg-bokara-grey text-white font-bold py-3 rounded-lg hover:bg-black transition-all text-sm">
                                    {isSavingEmail ? 'Guardando...' : 'Guardar Credenciales'}
                                </button>
                                <button type="button" onClick={handleTestEmail} disabled={isTestingEmail || !emailConfig.publicKey} className="bg-lucius-lime text-bokara-grey font-bold py-3 rounded-lg hover:bg-opacity-80 transition-all text-sm flex items-center justify-center gap-2">
                                    {isTestingEmail ? <div className="w-4 h-4 border-2 border-bokara-grey border-t-transparent rounded-full animate-spin"></div> : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> Probar Conexión</>}
                                </button>
                            </div>
                        </form>
                        <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
                            <h4 className="font-bold text-blue-800 mb-3">¿Por qué EmailJS?</h4>
                            <div className="text-xs text-blue-700/80 space-y-2">
                                <p>Firebase cobra una suscripción para enviar correos. EmailJS lo hace gratis hasta 200 emails/mes.</p>
                                <p className="font-mono bg-white/40 p-2 rounded text-[10px]">Variables requeridas en tu plantilla:<br/>{'{{recipient_email}}'} · {'{{user_name}}'} · {'{{request_type}}'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Power BI */}
                <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-yellow-100 rounded-2xl text-yellow-700 shadow-sm border border-yellow-200">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 00-2 2" /></svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-bokara-grey">Conector Power BI</h2>
                            <p className="text-bokara-grey/50">Extrae datos en tiempo real para reportes personalizados.</p>
                        </div>
                    </div>
                    <div className="bg-lucius-lime/5 p-4 rounded-xl border border-lucius-lime/20">
                        <p className="text-[10px] font-bold text-lucius-lime uppercase mb-1">Company ID Filter</p>
                        <p className="text-xl font-mono font-bold text-bokara-grey">{companyId || 'PROXIMAMENTE'}</p>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default SettingsPage;