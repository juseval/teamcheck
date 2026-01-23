
import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon } from '../components/Icons';
import { useNotification } from '../contexts/NotificationContext';
import { resendVerificationEmail } from '../services/apiService';

interface RegisterPageProps {
  onRegister: (data: { fullName: string; email: string; password: string; companyName: string; inviteCode?: string }) => Promise<void>;
  onNavigateToLogin: () => void;
  onNavigateToHome: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onRegister, onNavigateToLogin, onNavigateToHome }) => {
  const [step, setStep] = useState<'selection' | 'form'>('selection');
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorType, setErrorType] = useState<string | null>(null);
  
  const { addNotification } = useNotification();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('inviteCode');
    if (code) {
        setActiveTab('join');
        setInviteCode(code);
        setStep('form');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorType(null);

    if (password !== confirmPassword) {
        addNotification("Las contraseñas no coinciden.", 'error');
        return;
    }
    
    setIsRegistering(true);
    try {
        await onRegister({ 
            fullName, 
            email, 
            password, 
            companyName: activeTab === 'create' ? companyName : '', 
            inviteCode: activeTab === 'join' ? inviteCode : undefined 
        });
        setIsSuccess(true);
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            setErrorType('ALREADY_EXISTS');
            addNotification("Este correo ya está registrado. Por favor inicia sesión.", 'error');
        } else {
            addNotification(error.message || "Error en el registro", 'error');
        }
    } finally {
        setIsRegistering(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
        await resendVerificationEmail(email);
        addNotification("Se ha enviado un nuevo enlace de verificación.", 'success');
    } catch (error: any) {
        addNotification(error.message || "Error al reenviar", 'error');
    } finally {
        setIsResending(false);
    }
  };

  if (isSuccess) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-bright-white p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-10 border border-bokara-grey/10 text-center animate-fade-in">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h2 className="text-3xl font-bold text-bokara-grey mb-3">¡Casi listo!</h2>
                <p className="text-bokara-grey/70 mb-8 leading-relaxed">
                    Hemos enviado un enlace de verificación a <strong className="text-bokara-grey">{email}</strong>.<br/>
                    Por favor revisa tu bandeja de entrada (y la carpeta de <strong>Spam</strong>).
                </p>
                
                <div className="space-y-3">
                    <button onClick={onNavigateToLogin} className="w-full bg-bokara-grey hover:bg-black text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md">
                        Ir a Iniciar Sesión
                    </button>
                    <button 
                        onClick={handleResend} 
                        disabled={isResending}
                        className="w-full bg-transparent text-bokara-grey/60 hover:text-bokara-grey font-bold py-2 text-sm transition-all disabled:opacity-50"
                    >
                        {isResending ? 'Enviando...' : '¿No recibiste nada? Reenviar'}
                    </button>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-bright-white flex flex-col items-center p-4 sm:p-8 relative">
      <div className="w-full max-w-6xl flex justify-between items-center mb-12">
          <button onClick={step === 'form' ? () => setStep('selection') : onNavigateToHome} className="flex items-center gap-2 text-bokara-grey/60 hover:text-bokara-grey font-bold transition-colors">
              <ArrowLeftIcon className="w-5 h-5" />
              <span>{step === 'form' ? 'Volver' : 'Inicio'}</span>
          </button>
          <h1 className="text-3xl font-bold text-bokara-grey tracking-wider">
              Team<span className="text-lucius-lime">Check</span>
          </h1>
          <div className="w-20"></div>
      </div>

      <div className="w-full max-w-5xl animate-fade-in">
        {step === 'selection' ? (
          <div className="space-y-12">
            <div className="text-center">
                <h2 className="text-4xl font-bold text-bokara-grey mb-4">¿Cómo quieres empezar hoy?</h2>
                <p className="text-xl text-bokara-grey/60">Elige la opción que mejor se adapte a ti.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* OPCIÓN: ¿ERES NUEVO? (ADMIN) */}
                <button 
                    onClick={() => { setActiveTab('create'); setStep('form'); }}
                    className="group bg-white rounded-3xl p-8 border-2 border-transparent hover:border-lucius-lime shadow-lg hover:shadow-2xl transition-all text-left flex flex-col h-full"
                >
                    <div className="mb-6">
                        <span className="text-sm font-bold text-lucius-lime uppercase tracking-widest">Para Fundadores y Gerentes</span>
                        <h3 className="text-2xl font-bold text-bokara-grey mt-2">¿Eres nuevo? Crea una empresa</h3>
                        <p className="text-bokara-grey/60 mt-2">Configura tu espacio de trabajo, define horarios y obtén tu código de equipo.</p>
                    </div>
                    <ul className="space-y-3 mb-8 flex-grow">
                        <li className="flex items-center gap-2 text-sm font-medium text-bokara-grey/80">
                            <div className="w-1.5 h-1.5 rounded-full bg-lucius-lime"></div> Crea códigos únicos (ej: ABC-123)
                        </li>
                        <li className="flex items-center gap-2 text-sm font-medium text-bokara-grey/80">
                            <div className="w-1.5 h-1.5 rounded-full bg-lucius-lime"></div> Control total de asistencia y nómina
                        </li>
                        <li className="flex items-center gap-2 text-sm font-medium text-bokara-grey/80">
                            <div className="w-1.5 h-1.5 rounded-full bg-lucius-lime"></div> Mapa interactivo de la oficina
                        </li>
                    </ul>
                    <div className="mt-auto">
                        <div className="w-full py-4 bg-lucius-lime rounded-2xl text-center font-bold text-bokara-grey group-hover:bg-bokara-grey group-hover:text-white transition-colors shadow-sm">
                            Comenzar como Administrador
                        </div>
                    </div>
                </button>

                {/* OPCIÓN: UNIRME A UN EQUIPO (EMPLOYEE) */}
                <button 
                    onClick={() => { setActiveTab('join'); setStep('form'); }}
                    className="group bg-white rounded-3xl p-8 border-2 border-transparent hover:border-bokara-grey shadow-lg hover:shadow-2xl transition-all text-left flex flex-col h-full"
                >
                    <div className="mb-6">
                        <span className="text-sm font-bold text-bokara-grey/40 uppercase tracking-widest">Para Miembros del Equipo</span>
                        <h3 className="text-2xl font-bold text-bokara-grey mt-2">Unirme a un equipo existente</h3>
                        <p className="text-bokara-grey/60 mt-2">Ingresa el código que te dio tu jefe y empieza a marcar tus horas.</p>
                    </div>
                    <ul className="space-y-3 mb-8 flex-grow">
                        <li className="flex items-center gap-2 text-sm font-medium text-bokara-grey/80">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div> Registro rápido con código de equipo
                        </li>
                        <li className="flex items-center gap-2 text-sm font-medium text-bokara-grey/80">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div> Visualiza tu horario y tiquetes
                        </li>
                        <li className="flex items-center gap-2 text-sm font-medium text-bokara-grey/80">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div> Ve tu asiento asignado en el mapa
                        </li>
                    </ul>
                    <div className="mt-auto">
                        <div className="w-full py-4 bg-gray-100 rounded-2xl text-center font-bold text-bokara-grey group-hover:bg-bokara-grey group-hover:text-white transition-colors shadow-sm">
                            Unirme a mi Empresa
                        </div>
                    </div>
                </button>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl p-8 sm:p-10 border border-bokara-grey/10">
            <h2 className="text-3xl font-bold text-bokara-grey mb-2">
                {activeTab === 'create' ? 'Nueva Organización' : 'Ingresa al Equipo'}
            </h2>
            <p className="text-bokara-grey/60 mb-8">
                {activeTab === 'create' ? 'Configura tu empresa para empezar.' : 'Completa tus datos personales.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
                {activeTab === 'create' ? (
                    <div>
                        <label className="block text-[10px] font-bold text-lucius-lime uppercase tracking-widest mb-1.5">Nombre de la Empresa</label>
                        <input
                            type="text"
                            required
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full bg-whisper-white border border-bokara-grey/10 rounded-xl px-4 py-3 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime transition-all"
                            placeholder="Ej: Innova Studio S.A.S"
                        />
                    </div>
                ) : (
                    <div>
                        <label className="block text-[10px] font-bold text-bokara-grey/40 uppercase tracking-widest mb-1.5">Código de Equipo</label>
                        <input
                            type="text"
                            required
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                            className="w-full bg-whisper-white border border-bokara-grey/10 rounded-xl px-4 py-3 text-bokara-grey font-mono focus:outline-none focus:ring-2 focus:ring-bokara-grey/20 transition-all text-center tracking-widest"
                            placeholder="ABC-123"
                            maxLength={7}
                        />
                        <p className="text-[9px] text-bokara-grey/40 mt-1.5">Pídele el código de 6 dígitos a tu administrador.</p>
                    </div>
                )}

                <div>
                    <label className="block text-[10px] font-bold text-bokara-grey/40 uppercase tracking-widest mb-1.5">Tu Nombre Completo</label>
                    <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-whisper-white border border-bokara-grey/10 rounded-xl px-4 py-3 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime transition-all"
                        placeholder="Juan Sebastian Valencia"
                    />
                </div>
                
                <div>
                    <label className="block text-[10px] font-bold text-bokara-grey/40 uppercase tracking-widest mb-1.5">Correo Electrónico</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full bg-whisper-white border rounded-xl px-4 py-3 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime transition-all ${errorType === 'ALREADY_EXISTS' ? 'border-red-500' : 'border-bokara-grey/10'}`}
                        placeholder="tu@correo.com"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-bokara-grey/40 uppercase tracking-widest mb-1.5">Contraseña</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-whisper-white border border-bokara-grey/10 rounded-xl px-4 py-3 text-bokara-grey focus:outline-none focus:ring-2 focus:ring-lucius-lime transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-bokara-grey/40 uppercase tracking-widest mb-1.5">Confirmar</label>
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`w-full bg-whisper-white border rounded-xl px-4 py-3 text-bokara-grey focus:outline-none focus:ring-2 ${confirmPassword && password !== confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-bokara-grey/10 focus:ring-lucius-lime'}`}
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <div className="pt-4">
                    {errorType === 'ALREADY_EXISTS' ? (
                        <div className="space-y-3">
                            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 font-medium">
                                Ya existe una cuenta con este correo. Si es tuya, por favor inicia sesión.
                            </div>
                            <button
                                type="button"
                                onClick={onNavigateToLogin}
                                className="w-full bg-bokara-grey text-white font-bold py-4 px-6 rounded-xl hover:bg-black transition-all shadow-lg"
                            >
                                Ir al Inicio de Sesión
                            </button>
                        </div>
                    ) : (
                        <button
                            type="submit"
                            disabled={isRegistering}
                            className="w-full bg-bokara-grey text-white font-bold py-4 px-6 rounded-xl hover:bg-black transition-all shadow-lg disabled:opacity-50 disabled:cursor-wait"
                        >
                            {isRegistering ? 'Procesando...' : (activeTab === 'create' ? 'Crear Empresa y Cuenta' : 'Unirme al Equipo')}
                        </button>
                    )}
                    <button 
                        type="button"
                        onClick={onNavigateToLogin}
                        className="w-full mt-4 text-xs font-bold text-bokara-grey/40 hover:text-lucius-lime transition-colors uppercase tracking-widest"
                    >
                        ¿Ya tienes cuenta? Iniciar sesión
                    </button>
                </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;
