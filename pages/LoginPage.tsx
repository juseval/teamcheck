
import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon, PasswordIcon, UserIcon } from '../components/Icons';
import { useNotification } from '../contexts/NotificationContext';

interface LoginPageProps {
  onLogin: (credentials: { email: string; password: string; }) => Promise<void>;
  onNavigateToRegister: () => void;
  onNavigateToHome: () => void;
  onForgotPassword: (email: string) => Promise<void>;
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

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onNavigateToRegister, onNavigateToHome, onForgotPassword }) => {
  const [view, setView] = useState<'login' | 'forgot_password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  
  const { addNotification } = useNotification();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mobileCheck = /Mobi|Android|iPhone/i.test(navigator.userAgent);
    if (mobileCheck) {
        setIsMobile(true);
    }
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    
    if (!cleanEmail || !password) {
        addNotification("Por favor complete todos los campos.", 'error');
        return;
    }

    setIsLoggingIn(true);
    try {
      await onLogin({ email: cleanEmail, password });
    } catch (error) {
      setIsLoggingIn(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const cleanEmail = email.trim();
      
      if (!cleanEmail) {
          addNotification("Ingrese su correo para buscar su cuenta.", 'error');
          return;
      }
      
      setIsSendingReset(true);
      setResetSuccessMessage(null);
      try {
          await onForgotPassword(cleanEmail);
          setResetSuccessMessage(`Se ha enviado un enlace de recuperación a ${cleanEmail}. Revisa tu bandeja de entrada.`);
      } catch (error) {
          console.error(error);
          // Notification handled by parent
      } finally {
          setIsSendingReset(false);
      }
  };
  
  if (isMobile) {
      return <DesktopNotSupported onNavigateToHome={onNavigateToHome} />;
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
            <p className="text-bokara-grey/70 mt-2">
                {view === 'login' ? '¡Bienvenido de nuevo! Inicia sesión.' : 'Recupera el acceso a tu cuenta.'}
            </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-8 border border-bokara-grey/10 transition-all duration-300">
          
          {/* LOGIN VIEW */}
          {view === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-6 animate-fade-in">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-lucius-lime mb-2">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-bokara-grey/40">
                          <UserIcon />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime transition-all"
                        placeholder="tu@ejemplo.com"
                      />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="block text-sm font-medium text-lucius-lime">
                      Contraseña
                    </label>
                    <button 
                        type="button"
                        onClick={() => { setView('forgot_password'); setResetSuccessMessage(null); setEmail(''); }}
                        className="text-xs font-medium text-bokara-grey/60 hover:text-lucius-lime transition-colors"
                    >
                        ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-bokara-grey/40">
                          <PasswordIcon />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime transition-all"
                        placeholder="••••••••"
                      />
                  </div>
                </div>

                <button
                    type="submit"
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-bokara-grey bg-lucius-lime hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lucius-lime transition-colors disabled:bg-lucius-lime/40 disabled:cursor-wait"
                    disabled={!email || !password || isLoggingIn}
                >
                    {isLoggingIn ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
                </button>
              </form>
          )}

          {/* FORGOT PASSWORD VIEW */}
          {view === 'forgot_password' && (
              <div className="space-y-6 animate-fade-in">
                  {!resetSuccessMessage ? (
                      <form onSubmit={handleForgotSubmit} className="space-y-6">
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                            <p className="text-xs text-blue-800">
                                Ingresa el correo electrónico asociado a tu cuenta. Te enviaremos un enlace para restablecer tu contraseña.
                            </p>
                        </div>
                        <div>
                            <label htmlFor="reset-email" className="block text-sm font-medium text-lucius-lime mb-2">
                                Correo de Recuperación
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-bokara-grey/40">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                </div>
                                <input
                                    id="reset-email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime transition-all"
                                    placeholder="tu@ejemplo.com"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                type="submit"
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold bg-wet-sand hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wet-sand transition-colors disabled:opacity-50 disabled:cursor-wait text-white"
                                disabled={!email || isSendingReset}
                            >
                                {isSendingReset ? 'Enviando...' : 'Enviar Enlace'}
                            </button>
                            
                            <button
                                type="button"
                                onClick={() => setView('login')}
                                className="w-full flex justify-center py-2 px-4 text-sm font-medium text-bokara-grey/60 hover:text-bokara-grey transition-colors"
                            >
                                Cancelar y volver
                            </button>
                        </div>
                      </form>
                  ) : (
                      <div className="text-center space-y-6">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                          </div>
                          <h3 className="text-xl font-bold text-bokara-grey">¡Enlace Enviado!</h3>
                          <p className="text-bokara-grey/70 text-sm">{resetSuccessMessage}</p>
                          
                          {/* Demo Mode Helper */}
                          <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-left">
                                <p className="text-xs text-yellow-800 mb-1 font-bold">¿No recibiste el correo?</p>
                                <p className="text-xs text-yellow-700 mb-2 leading-relaxed">
                                    Si estás en modo Demo o sin conexión a un servidor de correo real, el email no llegará.
                                </p>
                                <a 
                                    href="/?mode=resetPassword&oobCode=demo_code"
                                    className="block w-full text-center py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs font-bold rounded transition-colors"
                                >
                                    Simular enlace de recuperación (Demo)
                                </a>
                          </div>

                          <button
                                onClick={() => setView('login')}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-bokara-grey bg-lucius-lime hover:bg-opacity-80 transition-colors"
                            >
                                Volver a Iniciar Sesión
                            </button>
                      </div>
                  )}
              </div>
          )}
        </div>

        {view === 'login' && (
            <p className="mt-6 text-center text-sm text-bokara-grey/80">
                ¿No tienes una cuenta?{' '}
                <button onClick={onNavigateToRegister} className="font-medium text-lucius-lime hover:text-lucius-lime/80 underline">
                Regístrate
                </button>
            </p>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
