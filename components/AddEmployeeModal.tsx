import React, { useState } from 'react';
import { WorkSchedule } from '../types';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEmployee: (data: {
    name: string;
    email: string;
    phone: string;
    role: 'admin' | 'employee';
    workScheduleId: string | null;
    status: string;
    idType?: string;
    idNumber?: string;
  }) => Promise<void>;
  workSchedules: WorkSchedule[];
  inviteCode?: string;
  companyName?: string;
}

const ID_TYPES = [
  'Cédula de Ciudadanía',
  'Tarjeta de Identidad',
  'Registro Civil',
  'Cédula de Extranjería',
  'Pasaporte',
  'NIT',
];

type Step = 'form' | 'invite';

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  onAddEmployee,
  workSchedules,
  inviteCode,
  companyName,
}) => {
  const [step, setStep] = useState<Step>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addedEmail, setAddedEmail] = useState('');
  const [addedName, setAddedName] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'employee' as 'admin' | 'employee',
    workScheduleId: '' as string | null,
    idType: '',
    idNumber: '',
  });

  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: { name?: string; email?: string } = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es obligatorio.';
    if (!formData.email.trim()) {
      newErrors.email = 'El correo es obligatorio.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Ingresa un correo válido.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      await onAddEmployee({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        role: formData.role,
        workScheduleId: formData.workScheduleId || null,
        status: 'Clocked Out',
        idType: formData.idType || undefined,
        idNumber: formData.idNumber.trim() || undefined,
      });
      setAddedEmail(formData.email.trim().toLowerCase());
      setAddedName(formData.name.trim());
      setStep('invite');
    } catch {
      // Error handled in parent via addNotification
    } finally {
      setIsLoading(false);
    }
  };

  const inviteLink = inviteCode
    ? `${window.location.origin}?inviteCode=${inviteCode}`
    : '';

  const handleCopyLink = () => {
    const textToCopy = inviteLink || inviteCode || '';
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent(
      `Invitación a TeamCheck${companyName ? ` — ${companyName}` : ''}`
    );
    const body = encodeURIComponent(
      `Hola ${addedName},\n\nHas sido añadido a ${companyName || 'nuestra organización'} en TeamCheck.\n\nAccede con este enlace:\n${inviteLink || inviteCode}\n\nSi ya tienes cuenta, ingresa el código: ${inviteCode}\n\n¡Bienvenido al equipo!`
    );
    window.open(`mailto:${addedEmail}?subject=${subject}&body=${body}`);
  };

  const handleClose = () => {
    setStep('form');
    setFormData({ name: '', email: '', phone: '', role: 'employee', workScheduleId: '', idType: '', idNumber: '' });
    setErrors({});
    setCopied(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: 'rgba(26, 26, 24, 0.6)', backdropFilter: 'blur(4px)' }}
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-bokara-grey/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── STEP 1: FORMULARIO ── */}
        {step === 'form' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-bokara-grey/8">
              <div>
                <h2 className="text-xl font-bold text-bokara-grey">Nuevo Colaborador</h2>
                <p className="text-xs text-bokara-grey/40 mt-0.5">
                  Tras guardarlo, podrás enviarle la invitación al equipo.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-full text-bokara-grey/30 hover:text-bokara-grey hover:bg-gray-100 transition-all text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="px-7 py-6 space-y-5">
              {/* Nombre */}
              <div>
                <label className="block text-[10px] font-bold text-bokara-grey/50 uppercase tracking-widest mb-1.5">
                  Nombre Completo <span className="text-red-400">*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  placeholder="Ej: María García López"
                  value={formData.name}
                  onChange={handleChange}
                  autoComplete="off"
                  className={`w-full rounded-xl border px-4 py-3 text-sm font-medium text-bokara-grey placeholder:text-bokara-grey/25 focus:outline-none focus:ring-2 transition-all ${
                    errors.name
                      ? 'border-red-300 bg-red-50 focus:ring-red-200'
                      : 'border-bokara-grey/15 bg-[#F9F8F6] focus:ring-lucius-lime/30'
                  }`}
                />
                {errors.name && (
                  <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold text-bokara-grey/50 uppercase tracking-widest mb-1.5">
                  Correo Electrónico <span className="text-red-400">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  placeholder="correo@empresa.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="off"
                  className={`w-full rounded-xl border px-4 py-3 text-sm font-medium text-bokara-grey placeholder:text-bokara-grey/25 focus:outline-none focus:ring-2 transition-all ${
                    errors.email
                      ? 'border-red-300 bg-red-50 focus:ring-red-200'
                      : 'border-bokara-grey/15 bg-[#F9F8F6] focus:ring-lucius-lime/30'
                  }`}
                />
                {errors.email && (
                  <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.email}</p>
                )}
              </div>

              {/* Tipo y Número de ID */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-bokara-grey/50 uppercase tracking-widest mb-1.5">
                    Tipo de ID
                  </label>
                  <select
                    name="idType"
                    value={formData.idType}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bokara-grey/15 bg-[#F9F8F6] px-4 py-3 text-sm font-medium text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime/30 transition-all"
                  >
                    <option value="">Sin especificar</option>
                    {ID_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-bokara-grey/50 uppercase tracking-widest mb-1.5">
                    Número de ID
                  </label>
                  <input
                    name="idNumber"
                    type="text"
                    placeholder="Ej: 1234567890"
                    value={formData.idNumber}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bokara-grey/15 bg-[#F9F8F6] px-4 py-3 text-sm font-medium text-bokara-grey placeholder:text-bokara-grey/25 focus:outline-none focus:ring-2 focus:ring-lucius-lime/30 transition-all"
                  />
                </div>
              </div>

              {/* Teléfono + Horario */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-bokara-grey/50 uppercase tracking-widest mb-1.5">
                    Teléfono
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="+57 300 000 0000"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bokara-grey/15 bg-[#F9F8F6] px-4 py-3 text-sm font-medium text-bokara-grey placeholder:text-bokara-grey/25 focus:outline-none focus:ring-2 focus:ring-lucius-lime/30 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-bokara-grey/50 uppercase tracking-widest mb-1.5">
                    Horario
                  </label>
                  <select
                    name="workScheduleId"
                    value={formData.workScheduleId || ''}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bokara-grey/15 bg-[#F9F8F6] px-4 py-3 text-sm font-medium text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime/30 transition-all"
                  >
                    <option value="">Sin asignar</option>
                    {workSchedules.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rol */}
              <div>
                <label className="block text-[10px] font-bold text-bokara-grey/50 uppercase tracking-widest mb-2">
                  Tipo de cuenta
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['employee', 'admin'] as const).map((role) => (
                    <label
                      key={role}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                        formData.role === role
                          ? 'border-lucius-lime bg-lucius-lime/5'
                          : 'border-bokara-grey/10 hover:border-bokara-grey/20'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role}
                        checked={formData.role === role}
                        onChange={handleChange}
                        className="accent-lucius-lime"
                      />
                      <div>
                        <p className="text-xs font-bold text-bokara-grey">
                          {role === 'employee' ? 'Colaborador' : 'Administrador'}
                        </p>
                        <p className="text-[9px] text-bokara-grey/40">
                          {role === 'employee' ? 'Acceso básico' : 'Acceso total'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-7 pb-7 flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl border-2 border-bokara-grey/10 text-bokara-grey/60 font-bold text-sm hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 py-3 rounded-xl bg-lucius-lime text-bokara-grey font-bold text-sm shadow-md shadow-lucius-lime/20 hover:bg-opacity-80 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-bokara-grey/30 border-t-bokara-grey rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Guardar Colaborador
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: INVITACIÓN ── */}
        {step === 'invite' && (
          <>
            {/* Header */}
            <div className="px-7 pt-7 pb-5 border-b border-bokara-grey/8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-lucius-lime/15 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-lucius-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-bokara-grey">¡Colaborador creado!</h2>
                  <p className="text-xs text-bokara-grey/40">{addedName} ha sido añadido al equipo.</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-full text-bokara-grey/30 hover:text-bokara-grey hover:bg-gray-100 transition-all text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="px-7 py-6 space-y-5">
              <p className="text-sm text-bokara-grey/60 leading-relaxed">
                Para que <span className="font-bold text-bokara-grey">{addedName}</span> pueda acceder a TeamCheck,
                necesita registrarse con el correo{' '}
                <span className="font-bold text-bokara-grey">{addedEmail}</span> usando el siguiente enlace o código:
              </p>

              {inviteLink && (
                <div className="bg-[#F9F8F6] border border-bokara-grey/10 rounded-xl p-4">
                  <p className="text-[9px] font-bold text-bokara-grey/40 uppercase tracking-widest mb-2">
                    Enlace de acceso directo
                  </p>
                  <p className="text-xs text-bokara-grey/70 font-mono break-all leading-relaxed">
                    {inviteLink}
                  </p>
                </div>
              )}

              {inviteCode && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-bokara-grey rounded-xl px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Código de equipo</p>
                      <p className="text-lg font-mono font-bold text-white tracking-widest">{inviteCode}</p>
                    </div>
                    <button
                      onClick={handleCopyLink}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        copied
                          ? 'bg-lucius-lime text-bokara-grey'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {copied ? '✓ Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-bokara-grey/40 text-center">
                El colaborador deberá registrarse en TeamCheck y al ingresar el código, quedará vinculado a tu organización automáticamente.
              </p>
            </div>

            {/* Footer */}
            <div className="px-7 pb-7 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSendEmail}
                className="flex-1 py-3 rounded-xl border-2 border-bokara-grey/10 text-bokara-grey font-bold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Enviar por correo
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl bg-bokara-grey text-white font-bold text-sm hover:bg-opacity-80 transition-all active:scale-95"
              >
                Listo
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AddEmployeeModal;