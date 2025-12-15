
import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon } from '../components/Icons';
import { useNotification } from '../contexts/NotificationContext';
import { getCompanyDetails } from '../services/apiService';

interface RegisterPageProps {
  onRegister: (data: { fullName: string; email: string; password: string; companyName: string; inviteCode?: string }) => Promise<void>;
  onNavigateToLogin: () => void;
  onNavigateToHome: () => void;
}

const DesktopNotSupported: React.FC<{ onNavigateToHome: () => void; }> = ({ onNavigateToHome }) => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bright-white p-6 text-center relative">
        <div className="absolute top-4 left-4 sm:top-8 sm:left-8">
            <button onClick={onNavigateToHome} className="flex items-center gap-2 text-bokara-grey/80 hover:text-bokara-grey font-semibold transition-colors">
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Volver al Inicio</span>
            </button>
        </div>
        <svg className="w-20 h-20 text-bokara-grey/70 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h1 className="text-3xl font-bold text-bokara-grey">Acceso no disponible en móvil</h1>
        <p className="text-bokara-grey/80 mt-3 max-w-sm leading-relaxed">
            TeamCheck está diseñado para una experiencia óptima en computadoras. Por favor, acceda desde un navegador de escritorio.
        </p>
    </div>
);


const RegisterPage: React.FC<RegisterPageProps> = ({ onRegister, onNavigateToLogin, onNavigateToHome }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const { addNotification } = useNotification();

  useEffect(() => {
    const mobileCheck = /Mobi|Android|iPhone/i.test(navigator.userAgent);
    if (mobileCheck) {
        setIsMobile(true);
    }

    // Check for invite code in URL params
    const params = new URLSearchParams(window.location.search);
    const code = params.get('inviteCode');
    if (code) {
        setActiveTab('join');
        setInviteCode(code);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        
        // Show success screen instead of auto navigating
        setIsSuccess(true);
        
        // If invite code exists in URL, remove it
        if (inviteCode) {
             const url = new URL(window.location.href);
             if (url.searchParams.has('inviteCode')) {
                 url.searchParams.delete('inviteCode');
                 window.history.replaceState({}, '', url);
             }
        }
    } catch (error: any) {
        console.error("Registration failed", error);
        addNotification(error.message || "Error en el registro", 'error');
    } finally {
        setIsRegistering(false);
    }
  };

  if (isMobile) {
      return <DesktopNotSupported onNavigateToHome={onNavigateToHome} />;
  }

  // SUCCESS STATE: Verify Email
  if (isSuccess) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-bright-white p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 border border-bokara-grey/10 text-center animate-fade-in">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h2 className="text-3xl font-bold text-bokara-grey mb-3">¡Verifica tu correo!</h2>
                <p className="text-bokara-grey/70 mb-8 leading-relaxed">
                    Hemos enviado un enlace de confirmación a <strong className="text-bokara-grey">{email}</strong>. 
                    <br/>
                    Por favor, haz clic en el enlace para activar tu cuenta y poder iniciar sesión.
                </p>
                <button onClick={onNavigateToLogin} className="w-full bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-3 px-6 rounded-lg transition-all shadow-md transform hover:-translate-y-0.5">
                    Ir a Iniciar Sesión
                </button>
            </div>
        </div>
    );
  }

  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  
  const isCreateValid = fullName && email && password && passwordsMatch && companyName;
  const isJoinValid = fullName && email && password && passwordsMatch && inviteCode;
  
  const isFormValid = activeTab === 'create' ? isCreateValid : isJoinValid;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bright-white p-4 relative">
      <div className="absolute top-4 left-4 sm:top-8 sm:left-8">
        <button onClick={onNavigateToHome} className="flex items-center gap-2 text-bokara-grey/80 hover:text-bokara-grey font-semibold transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Volver al Inicio</span>
        </button>
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-bokara-grey tracking-wider">
              Team<span className="text-lucius-lime">Check</span>
            </h1>
            <p className="text-bokara-grey/70 mt-2">Gestiona tu equipo de manera eficiente.</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 overflow-hidden">
          
          {/* Tabs */}
          <div className="flex border-b border-bokara-grey/10">
              <button 
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${activeTab === 'create' ? 'bg-white text-lucius-lime border-b-2 border-lucius-lime' : 'bg-gray-50 text-bokara-grey/50 hover:bg-gray-100'}`}
              >
                  Crear Empresa
              </button>
              <button 
                onClick={() => setActiveTab('join')}
                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${activeTab === 'join' ? 'bg-white text-lucius-lime border-b-2 border-lucius-lime' : 'bg-gray-50 text-bokara-grey/50 hover:bg-gray-100'}`}
              >
                  Unirse a Equipo
              </button>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
                
                {activeTab === 'create' ? (
                    <div>
                        <label htmlFor="companyName" className="block text-sm font-medium text-lucius-lime mb-2">
                            Nombre de la Empresa
                        </label>
                        <input
                            id="companyName"
                            name="companyName"
                            type="text"
                            autoComplete="organization"
                            required
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime"
                            placeholder="Mi Empresa S.A."
                        />
                    </div>
                ) : (
                    <div>
                        <label htmlFor="inviteCode" className="block text-sm font-medium text-lucius-lime mb-2">
                            Código de Organización
                        </label>
                        <input
                            id="inviteCode"
                            name="inviteCode"
                            type="text"
                            required
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime font-mono"
                            placeholder="Ej: NqVNV10..."
                        />
                        <p className="text-xs text-bokara-grey/50 mt-1">Pídele este código a tu administrador.</p>
                    </div>
                )}

                <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-lucius-lime mb-2">
                    Nombre Completo
                </label>
                <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime"
                    placeholder="Juan Pérez"
                />
                </div>
                
                <div>
                <label htmlFor="email" className="block text-sm font-medium text-lucius-lime mb-2">
                    Correo Electrónico
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime"
                    placeholder="juan@ejemplo.com"
                />
                </div>

                <div>
                <label htmlFor="password" className="block text-sm font-medium text-lucius-lime mb-2">
                    Contraseña
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime"
                    placeholder="••••••••"
                />
                </div>

                <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-lucius-lime mb-2">
                    Confirmar Contraseña
                </label>
                <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full bg-whisper-white border text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${confirmPassword && !passwordsMatch ? 'border-red-500 focus:ring-red-500' : 'border-bokara-grey/20 focus:ring-lucius-lime'}`}
                    placeholder="••••••••"
                />
                {confirmPassword && !passwordsMatch && (
                    <p className="text-red-500 text-xs mt-1">Las contraseñas no coinciden.</p>
                )}
                </div>

                <div className="pt-2">
                <button
                    type="submit"
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-bokara-grey bg-lucius-lime hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lucius-lime transition-colors disabled:bg-lucius-lime/40 disabled:cursor-not-allowed"
                    disabled={!isFormValid || isRegistering}
                >
                    {isRegistering ? 'Procesando...' : (activeTab === 'create' ? 'Crear Cuenta' : 'Unirse al Equipo')}
                </button>
                </div>
            </form>
          </div>
        </div>
        
        <p className="mt-6 text-center text-sm text-bokara-grey/80">
            ¿Ya tienes cuenta?{' '}
            <button onClick={onNavigateToLogin} className="font-medium text-lucius-lime hover:text-lucius-lime/80 underline">
                Iniciar Sesión
            </button>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
