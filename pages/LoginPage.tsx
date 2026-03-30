import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon, PasswordIcon, UserIcon } from '../components/Icons';
import { useNotification } from '../contexts/NotificationContext';

interface LoginPageProps {
  onLogin: (credentials: { email: string; password: string; rememberMe: boolean }) => Promise<void>;
  onNavigateToRegister: () => void;
  onNavigateToHome: () => void;
  onForgotPassword: (email: string) => Promise<void>;
}

const DesktopNotSupported: React.FC<{ onNavigateToHome: () => void }> = ({ onNavigateToHome }) => (
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

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onNavigateToRegister, onNavigateToHome, onForgotPassword }) => {
  const [view, setView] = useState<'login' | 'forgot_password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const { addNotification } = useNotification();
  const [isMobile, setIsMobile] = useState(false);

  // Cargar el email recordado si existe
  useEffect(() => {
    const mobileCheck = /Mobi|Android|iPhone|iPod/i.test(navigator.userAgent);
    if (mobileCheck) { setIsMobile(true); return; }

    const savedEmail = localStorage.getItem('tc_remembered_email');
    const savedRemember = localStorage.getItem('tc_remember_me') === 'true';
    if (savedEmail && savedRemember) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      addNotification('Por favor complete todos los campos.', 'error');
      return;
    }

    // Guardar o limpiar el email recordado
    if (rememberMe) {
      localStorage.setItem('tc_remembered_email', cleanEmail);
      localStorage.setItem('tc_remember_me', 'true');
    } else {
      localStorage.removeItem('tc_remembered_email');
      localStorage.removeItem('tc_remember_me');
    }

    setIsLoggingIn(true);
    try {
      await onLogin({ email: cleanEmail, password, rememberMe });
    } catch (error: any) {
      setIsLoggingIn(false);
      addNotification(error.message || 'Error al iniciar sesión', 'error');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      addNotification('Ingrese su correo para buscar su cuenta.', 'error');
      return;
    }
    setIsSendingReset(true);
    setResetSuccessMessage(null);
    try {
      await onForgotPassword(cleanEmail);
      setResetSuccessMessage(`Se ha enviado un enlace a ${cleanEmail}.`);
    } catch (error: any) {
      addNotification(error.message, 'error');
    } finally {
      setIsSendingReset(false);
    }
  };

  if (isMobile) return <DesktopNotSupported onNavigateToHome={onNavigateToHome} />;

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
        </div>

        <div className="bg-white rounded-xl shadow-2xl p-8 border border-bokara-grey/10 transition-all duration-300 min-h-[400px] flex flex-col justify-center">

          {view === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-6 animate-fade-in">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-bokara-grey">Bienvenido de nuevo</h2>
                <p className="text-sm text-bokara-grey/60 mt-1">Ingresa tus credenciales para entrar.</p>
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-bold text-lucius-lime uppercase tracking-widest mb-2">Correo Electrónico</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-bokara-grey/40"><UserIcon /></div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg pl-10 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-lucius-lime transition-all"
                    placeholder="tu@ejemplo.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-xs font-bold text-lucius-lime uppercase tracking-widest">Contraseña</label>
                  <button type="button" onClick={() => setView('forgot_password')} className="text-[10px] font-bold text-bokara-grey/60 hover:text-lucius-lime uppercase tracking-tighter">¿Olvidaste tu contraseña?</button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-bokara-grey/40"><PasswordIcon /></div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg pl-10 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-lucius-lime transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* ── Recordarme ── */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRememberMe(prev => !prev)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    rememberMe
                      ? 'bg-lucius-lime border-lucius-lime'
                      : 'bg-white border-bokara-grey/30 hover:border-lucius-lime'
                  }`}
                >
                  {rememberMe && (
                    <svg className="w-3 h-3 text-bokara-grey" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span
                  onClick={() => setRememberMe(prev => !prev)}
                  className="text-sm text-bokara-grey/70 cursor-pointer select-none"
                >
                  Recordarme
                </span>
              </div>

              <button type="submit" disabled={isLoggingIn} className="w-full py-4 bg-lucius-lime hover:bg-opacity-80 rounded-xl text-sm font-bold text-bokara-grey shadow-lg transition-all disabled:opacity-50">
                {isLoggingIn ? 'Verificando...' : 'Iniciar Sesión'}
              </button>
              <p className="text-center text-xs text-bokara-grey/60">¿No tienes cuenta? <button type="button" onClick={onNavigateToRegister} className="font-bold text-bokara-grey hover:underline">Regístrate</button></p>
            </form>
          )}

          {view === 'forgot_password' && (
            <form onSubmit={handleForgotSubmit} className="space-y-6 animate-fade-in">
              <h3 className="text-xl font-bold text-bokara-grey text-center">Recuperar Acceso</h3>
              {!resetSuccessMessage ? (
                <>
                  <p className="text-sm text-bokara-grey/70 text-center">Ingresa tu email para recibir instrucciones.</p>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg p-3 text-bokara-grey" placeholder="tu@correo.com" />
                  <div className="flex flex-col gap-3">
                    <button type="submit" disabled={isSendingReset} className="w-full py-3 bg-bokara-grey text-white rounded-lg font-bold hover:bg-black transition-all">{isSendingReset ? 'Enviando...' : 'Enviar Enlace'}</button>
                    <button type="button" onClick={() => setView('login')} className="text-sm text-bokara-grey/60">Cancelar</button>
                  </div>
                </>
              ) : (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-green-600 font-medium">{resetSuccessMessage}</p>
                  <button onClick={() => setView('login')} className="w-full py-3 bg-lucius-lime text-bokara-grey font-bold rounded-lg">Volver al Login</button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;