
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
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const { addNotification } = useNotification();
  const [isMobile, setIsMobile] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);

  useEffect(() => {
    const mobileCheck = /Mobi|Android|iPhone/i.test(navigator.userAgent);
    if (mobileCheck) {
        setIsMobile(true);
    }

    // Check for invite code in URL params
    const params = new URLSearchParams(window.location.search);
    const code = params.get('inviteCode');
    if (code) {
        setInviteCode(code);
        fetchCompanyInfo(code);
    }
  }, []);

  const fetchCompanyInfo = async (code: string) => {
      setIsLoadingInvite(true);
      try {
          const company = await getCompanyDetails(code);
          if (company) {
              setCompanyName(company.name);
          } else {
              addNotification("El código de invitación no es válido.", 'error');
              setInviteCode(null); // Reset if invalid
          }
      } catch (error) {
          console.error(error);
          addNotification("Error al verificar la invitación.", 'error');
      } finally {
          setIsLoadingInvite(false);
      }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
        addNotification("Las contraseñas no coinciden.", 'error');
        return;
    }
    setIsRegistering(true);
    try {
        await onRegister({ fullName, email, password, companyName, inviteCode: inviteCode || undefined });
        addNotification(inviteCode ? '¡Te has unido exitosamente!' : '¡Registro exitoso!', 'success');
        // If invite code exists, remove it from URL for cleaner history
        if (inviteCode) {
             const url = new URL(window.location.href);
             url.searchParams.delete('inviteCode');
             window.history.replaceState({}, '', url);
        }
        onNavigateToLogin();
    } catch (error) {
        // Notification is handled by the `onRegister` function
        console.error("Registration failed", error);
    } finally {
        setIsRegistering(false);
    }
  };

  if (isMobile) {
      return <DesktopNotSupported onNavigateToHome={onNavigateToHome} />;
  }

  if (isLoadingInvite) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-bright-white">
              <div className="text-center">
                  <div className="w-8 h-8 border-4 border-lucius-lime border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-bokara-grey/60">Verificando invitación...</p>
              </div>
          </div>
      );
  }

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
            <p className="text-bokara-grey/70 mt-2">{inviteCode ? 'Únete a tu equipo como empleado.' : 'Crea tu cuenta de empresa.'}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-8 border border-bokara-grey/10">
          {inviteCode && (
              <div className="bg-lucius-lime/10 p-4 rounded-lg mb-6 flex items-start gap-3 border border-lucius-lime/20">
                  <div className="p-1 bg-lucius-lime text-white rounded-full mt-0.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  </div>
                  <div>
                      <p className="text-sm text-bokara-grey/80">Estás aceptando una invitación para unirte a:</p>
                      <p className="font-bold text-bokara-grey text-lg">{companyName}</p>
                  </div>
              </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {!inviteCode && (
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
            )}

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-lucius-lime mb-2">
                Nombre Completo {inviteCode ? '(Empleado)' : '(Admin)'}
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
                placeholder="Jane Doe"
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
                placeholder={inviteCode ? "empleado@miempresa.com" : "admin@miempresa.com"}
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
                className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime"
                placeholder="••••••••"
              />
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-bokara-grey bg-lucius-lime hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lucius-lime transition-colors disabled:bg-lucius-lime/40 disabled:cursor-wait"
                disabled={!fullName || !email || !password || password !== confirmPassword || !companyName || isRegistering}
              >
                {isRegistering ? 'Procesando...' : (inviteCode ? 'Unirse al Equipo' : 'Crear Cuenta')}
              </button>
            </div>
          </form>
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
