import React, { useState, useEffect } from 'react';
import { Employee, Invitation } from '../types';
import { createCompany, joinCompany, getPendingInvitation, acceptInvitation } from '../services/apiService';
import { useNotification } from '../contexts/NotificationContext';
import { ArrowLeftIcon } from '../components/Icons';

interface OnboardingPageProps {
  user: Employee;
  onLogout: () => void;
  onComplete: () => void;
  initialInviteCode?: string;
  /** Si es true, el master ya tiene empresa y está creando una adicional */
  allowCreateAdditional?: boolean;
  /** Callback para volver atrás sin hacer logout (cuando tiene empresa activa) */
  onCancel?: () => void;
}

const GrowthIllustration = () => (
  <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
    <div className="absolute inset-0 bg-whisper-white/30 rounded-full scale-110"></div>
    <div className="relative w-36 h-36 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center overflow-hidden">
      <svg className="w-20 h-20 text-[#FF7043]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4L12 20M12 4L7 9M12 4L17 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="6" y="16" width="3" height="4" rx="0.5" fill="#AE8F60" fillOpacity="0.4" />
        <rect x="10" y="13" width="3" height="7" rx="0.5" fill="#AE8F60" fillOpacity="0.7" />
        <rect x="14" y="11" width="3" height="9" rx="0.5" fill="#AE8F60" />
      </svg>
    </div>
    <div className="absolute bottom-6 -right-1 bg-white px-3 py-1.5 rounded-xl shadow-md border border-gray-100 flex flex-col items-center z-10">
      <span className="text-[9px] font-bold text-bokara-grey uppercase tracking-tighter leading-none">Nueva</span>
      <span className="text-[9px] font-bold text-bokara-grey uppercase tracking-tighter leading-none">Organización</span>
    </div>
  </div>
);

const TeamIllustration = () => (
  <div className="relative w-full h-32 mx-auto flex items-center justify-center">
    <svg className="w-48 h-full" viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="70" r="22" fill="#E8F5E9" />
      <circle cx="100" cy="70" r="18" stroke="#27AE60" strokeWidth="3" />
      <path d="M100 62C102.761 62 105 64.2386 105 67C105 69.7614 102.761 72 100 72C97.2386 72 95 69.7614 95 67C95 64.2386 97.2386 62 100 62ZM100 74C105.523 74 110 78.4772 110 84V85H90V84C90 78.4772 94.4772 74 100 74Z" fill="#27AE60" />
      <path d="M85 55L70 45" stroke="#D1D5DB" strokeWidth="2" strokeDasharray="4 4" />
      <path d="M115 55L130 45" stroke="#D1D5DB" strokeWidth="2" strokeDasharray="4 4" />
      <path d="M115 85L130 95" stroke="#D1D5DB" strokeWidth="2" strokeDasharray="4 4" />
      <circle cx="65" cy="40" r="10" fill="#9CA3AF" />
      <circle cx="135" cy="40" r="10" fill="#9CA3AF" />
      <circle cx="135" cy="100" r="10" fill="#9CA3AF" />
      <circle cx="90" cy="40" r="8" fill="#27AE60" />
      <path d="M86 40L89 43L94 38" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

const OnboardingPage: React.FC<OnboardingPageProps> = ({
  user, onLogout, onComplete, initialInviteCode,
  allowCreateAdditional = false, onCancel,
}) => {
  const [view, setView] = useState<'selection' | 'create' | 'join'>(
    // Si viene con allowCreateAdditional, ir directo a crear
    allowCreateAdditional ? 'create' : (initialInviteCode ? 'join' : 'selection')
  );
  const [companyName, setCompanyName]   = useState('');
  const [inviteCode, setInviteCode]     = useState(initialInviteCode || '');
  const [isLoading, setIsLoading]       = useState(false);
  const [pendingInv, setPendingInv]     = useState<Invitation | null>(null);
  const [isCheckingInv, setIsCheckingInv] = useState(!allowCreateAdditional);
  const { addNotification } = useNotification();

  useEffect(() => {
    if (allowCreateAdditional) return; // no buscar invitaciones si está creando empresa adicional
    const check = async () => {
      try {
        const inv = await getPendingInvitation(user.email);
        if (inv) setPendingInv(inv);
      } catch (e) { console.error("Error checking invitations", e); }
      finally { setIsCheckingInv(false); }
    };
    check();
  }, [user.email, allowCreateAdditional]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    setIsLoading(true);
    try {
      await createCompany(companyName.trim());
      addNotification("¡Organización creada con éxito!", 'success');
      onComplete();
    } catch (error: any) {
      addNotification(error.message || "Error al crear organización", 'error');
    } finally { setIsLoading(false); }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setIsLoading(true);
    try {
      await joinCompany(inviteCode.trim());
      addNotification("Te has unido al equipo correctamente.", 'success');
      onComplete();
    } catch (error: any) {
      addNotification(error.message || "Código inválido o error al unirse", 'error');
    } finally { setIsLoading(false); }
  };

  const handleAcceptInvitation = async () => {
    if (!pendingInv) return;
    setIsLoading(true);
    try {
      await acceptInvitation(pendingInv.id);
      addNotification(`¡Bienvenido a ${pendingInv.companyName}!`, 'success');
      onComplete();
    } catch (error: any) {
      addNotification(error.message || "Error al aceptar invitación", 'error');
    } finally { setIsLoading(false); }
  };

  const handleBack = () => {
    if (view !== 'selection') { setView('selection'); return; }
    // Si puede cancelar (tiene empresa activa), volver sin logout
    if (onCancel) { onCancel(); return; }
    onLogout();
  };

  // ── Vista: Crear empresa ──
  if (view === 'create') {
    return (
      <div className="min-h-screen bg-[#F7F6F5] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md mb-8">
          <button onClick={handleBack} className="flex items-center gap-2 text-bokara-grey/40 hover:text-bokara-grey font-bold transition-all group">
            <ArrowLeftIcon className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" />
            <span>{allowCreateAdditional ? 'Cancelar' : 'Volver'}</span>
          </button>
        </div>
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-bokara-grey/5 animate-fade-in overflow-hidden">
          <h2 className="text-3xl font-bold text-bokara-grey mb-2 text-center">
            {allowCreateAdditional ? 'Nueva Empresa' : 'Comenzar desde cero'}
          </h2>
          {allowCreateAdditional && (
            <p className="text-xs text-lucius-lime font-bold text-center mb-2 uppercase tracking-widest">
              Tu empresa actual no se verá afectada
            </p>
          )}
          <p className="text-bokara-grey/50 text-sm mb-8 font-medium text-center">
            Dale un nombre a tu nueva organización para empezar.
          </p>
          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-lucius-lime uppercase tracking-widest mb-2 ml-1">Nombre de la Empresa</label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Ej: Innova Team S.A.S"
                className="w-full bg-[#F3F0E9]/50 border border-bokara-grey/5 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-lucius-lime text-bokara-grey font-bold shadow-inner"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#FF7043] text-white font-bold py-5 rounded-2xl hover:bg-[#F4511E] transition-all shadow-xl shadow-[#FF7043]/20 disabled:opacity-50 active:scale-95 text-lg"
            >
              {isLoading ? 'Creando...' : 'Confirmar y Crear'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Vista: Unirse con código ──
  if (view === 'join') {
    return (
      <div className="min-h-screen bg-[#F7F6F5] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md mb-8">
          <button onClick={handleBack} className="flex items-center gap-2 text-bokara-grey/40 hover:text-bokara-grey font-bold transition-all group">
            <ArrowLeftIcon className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" />
            <span>Volver</span>
          </button>
        </div>
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-bokara-grey/5 animate-fade-in overflow-hidden">
          <h2 className="text-3xl font-bold text-bokara-grey mb-2 text-center">Ingresar Código</h2>
          <p className="text-bokara-grey/50 text-sm mb-8 font-medium text-center">
            Introduce el código de tu equipo. Pídeselo al administrador de tu organización.
          </p>
          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-bokara-grey/30 uppercase tracking-widest mb-2 ml-1">Código de Invitación</label>
              <input
                type="text"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                placeholder="ABC-123"
                maxLength={32}
                className={`w-full bg-[#F3F0E9]/50 border border-bokara-grey/5 rounded-2xl px-5 py-4 text-center font-mono font-bold focus:outline-none focus:ring-2 focus:ring-lucius-lime text-bokara-grey shadow-inner transition-all ${inviteCode.length > 10 ? 'text-xl tracking-normal' : 'text-4xl tracking-[0.2em]'}`}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-lucius-lime text-bokara-grey font-bold py-5 rounded-2xl shadow-xl shadow-lucius-lime/20 transition-all disabled:opacity-50 active:scale-95 text-lg"
            >
              {isLoading ? 'Verificando...' : 'Unirse al Equipo'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Vista: Selección principal ──
  return (
    <div className="min-h-screen bg-[#F7F6F5] flex flex-col items-center justify-center p-6 sm:p-10 animate-fade-in relative overflow-x-hidden">

      <div className="absolute top-8 left-8 z-30">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-bokara-grey/50 hover:text-bokara-grey font-bold transition-all group px-4 py-2 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-bokara-grey/5"
        >
          <ArrowLeftIcon className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" />
          <span>{onCancel ? 'Volver' : 'Cerrar Sesión'}</span>
        </button>
      </div>

      <div className="w-full max-w-6xl mt-12 sm:mt-0">
        <div className="mb-12 text-center sm:text-left animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-bold text-bokara-grey tracking-tight">
            ¡Bienvenido a TeamCheck, <span className="text-lucius-lime capitalize">{user.name.split(' ')[0]}</span>!
          </h1>
          <p className="text-bokara-grey/40 font-medium mt-3 text-lg">
            Crea tu nueva organización o únete a una existente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Card 1: Crear */}
          <div className="flex flex-col gap-6 group animate-fade-in">
            <h3 className="text-bokara-grey/30 font-bold uppercase tracking-[0.2em] text-[10px] ml-4">Para propietarios de negocios y autónomos</h3>
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-bokara-grey/5 p-10 flex flex-col min-h-[560px] h-full hover:shadow-2xl hover:translate-y-[-4px] transition-all relative overflow-hidden">
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex-grow">
                  <h2 className="text-3xl font-bold text-bokara-grey mb-2">Comenzar desde cero</h2>
                  <p className="text-bokara-grey/40 text-sm mb-10 font-medium tracking-tight">Estructura tu empresa y gestiona tu personal desde cero</p>
                  <ul className="space-y-6 mb-8">
                    <li className="flex items-start gap-4">
                      <div className="w-6 h-6 bg-lucius-lime/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2.5 h-2.5 bg-lucius-lime rounded-full"></div>
                      </div>
                      <span className="text-bokara-grey font-bold text-sm leading-tight">Invita y gestiona a tu equipo de manera sencilla</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="w-6 h-6 bg-lucius-lime/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2.5 h-2.5 bg-lucius-lime rounded-full"></div>
                      </div>
                      <span className="text-bokara-grey font-bold text-sm leading-tight">Lleva el control del tiempo y los proyectos</span>
                    </li>
                  </ul>
                </div>
                <div className="my-8 py-2"><GrowthIllustration /></div>
                <div className="relative z-20 flex flex-col items-center mt-auto">
                  <button
                    onClick={() => setView('create')}
                    className="w-full sm:w-56 py-4 bg-[#FF7043] hover:bg-[#F4511E] text-white font-bold rounded-2xl shadow-xl shadow-[#FF7043]/30 transition-all transform hover:scale-105 active:scale-95"
                  >
                    Crear ahora
                  </button>
                  <div className="mt-4">
                    <span className="bg-[#FFF3E0] text-[#E65100] px-3 py-1 rounded-lg text-[9px] font-bold uppercase border border-orange-100 shadow-sm inline-block">¿AUTÓNOMO?</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Unirse */}
          <div className="flex flex-col gap-6 group animate-fade-in" style={{ animationDelay: '100ms' }}>
            <h3 className="text-bokara-grey/30 font-bold uppercase tracking-[0.2em] text-[10px] ml-4">Para empleados y miembros del equipo</h3>
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-bokara-grey/5 p-10 flex flex-col min-h-[560px] h-full hover:shadow-2xl hover:translate-y-[-4px] transition-all relative overflow-hidden">
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex-grow">
                  <h2 className="text-3xl font-bold text-bokara-grey mb-2">Ya tienes organización</h2>
                  <p className="text-bokara-grey/40 text-sm mb-10 font-medium tracking-tight">Accede a tu panel y empieza a registrar tus horas</p>
                  <div className="my-6"><TeamIllustration /></div>
                </div>
                <div className="bg-[#F8FDF9] rounded-3xl p-6 border border-[#E8F5E9] shadow-inner mt-auto mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 bg-[#27AE60] rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-bold text-[#27AE60] uppercase tracking-widest">Unirse a</span>
                  </div>
                  <h4 className="text-2xl font-bold text-bokara-grey mb-6">Organización</h4>
                  {isCheckingInv ? (
                    <div className="flex items-center gap-3 py-2">
                      <div className="w-4 h-4 border-2 border-lucius-lime border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-bokara-grey/40 font-bold uppercase tracking-widest">Verificando...</span>
                    </div>
                  ) : pendingInv ? (
                    <button
                      onClick={handleAcceptInvitation}
                      disabled={isLoading}
                      className="w-full py-4 bg-[#27AE60] hover:bg-[#219150] text-white font-bold rounded-xl shadow-lg shadow-[#27AE60]/20 transition-all active:scale-95 text-sm uppercase tracking-wider"
                    >
                      {isLoading ? 'Entrando...' : 'ACEPTAR Y ENTRAR'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setView('join')}
                      className="w-full py-4 border-2 border-bokara-grey/10 hover:border-lucius-lime text-bokara-grey font-bold rounded-xl transition-all hover:bg-lucius-lime/5 hover:text-lucius-lime text-sm uppercase tracking-wider"
                    >
                      Ingresar Código
                    </button>
                  )}
                </div>
                <div className="text-center min-h-[1.5rem]">
                  {!isCheckingInv && !pendingInv && (
                    <p className="text-[10px] text-bokara-grey/30 font-medium leading-relaxed max-w-[240px] mx-auto">
                      No detectamos invitaciones para <span className="text-bokara-grey/60 font-bold">{user.email}</span>.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-lucius-lime/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-wet-sand/5 rounded-full blur-[100px] pointer-events-none"></div>
    </div>
  );
};

export default OnboardingPage;