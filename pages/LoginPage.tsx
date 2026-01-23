
import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon, PasswordIcon, UserIcon } from '../components/Icons';
import { useNotification } from '../contexts/NotificationContext';
import { resendVerificationEmail, loginWithEmailAndPassword } from '../services/apiService';

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
  const [view, setView] = useState<'login' | 'forgot_password' | 'unverified'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  
  const { addNotification } = useNotification();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mobileCheck = /Mobi|Android|iPhone|iPod/i.test(navigator.userAgent);
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
    } catch (error: any) {
      setIsLoggingIn(false);
      // CAPTURAR EL BLOQUEO DE VERIFICACIÓN
      if (error.message.includes("VERIFY_REQUIRED")) {
          setView('unverified');
      } else {
          addNotification(error.message, 'error');
      }
    }
  };

  const handleResendVerification = async () => {
      setIsResending(true);
      try {
          // Primero intentamos hacer login para "despertar" la sesión de Firebase
          // No necesitamos manejar el error VERIFY_REQUIRED aquí porque resendVerificationEmail lo usará.
          try {
              await loginWithEmailAndPassword(email, password);
          } catch (e: any) {
              // Si falla por falta de verificación, ignoramos el error porque es lo que queremos corregir
              if (!e.message.includes("VERIFY_REQUIRED")) throw e;
          }
          
          await resendVerificationEmail(email);
          addNotification("¡Enlace enviado! Revisa tu bandeja de entrada.", 'success');
      } catch (e: any) {
          addNotification(e.message || "Error al intentar reenviar.", 'error');
      } finally {
          setIsResending(false);
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
      } catch (error: any) {
          addNotification(error.message, 'error');
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
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-8 border border-bokara-grey/10 transition-all duration-300">
          
          {view === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-6 animate-fade-in">
                <p className="text-bokara-grey/70 text-center">Inicia sesión para continuar.</p>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-lucius-lime mb-2">Correo Electrónico</label>
                  <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-bokara-grey/40"><UserIcon /></div>
                      <input
                        id="email"
                        type="email"
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
                    <label htmlFor="password" className="block text-sm font-medium text-lucius-lime">Contraseña</label>
                    <button type="button" onClick={() => setView('forgot_password')} className="text-xs font-medium text-bokara-grey/60 hover:text-lucius-lime">¿Olvidaste tu contraseña?</button>
                  </div>
                  <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-bokara-grey/40"><PasswordIcon /></div>
                      <input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime transition-all"
                        placeholder="••••••••"
                      />
                  </div>
                </div>
                <button type="submit" disabled={isLoggingIn} className="w-full py-3 bg-lucius-lime hover:bg-opacity-80 rounded-lg text-sm font-bold text-bokara-grey shadow-sm transition-all disabled:opacity-50">
                    {isLoggingIn ? 'Entrando...' : 'Iniciar Sesión'}
                </button>
              </form>
          )}

          {view === 'unverified' && (
              <div className="text-center space-y-6 animate-fade-in">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto text-yellow-600"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
                  <h3 className="text-xl font-bold text-bokara-grey">Verifica tu correo</h3>
                  <p className="text-sm text-bokara-grey/70 leading-relaxed">
                      Tu cuenta está bloqueada hasta que confirmes tu identidad. <br/>
                      Si no has recibido el link en <strong>{email}</strong>, pulsa abajo.
                  </p>
                  <button onClick={handleResendVerification} disabled={isResending} className="w-full py-3 bg-bokara-grey text-white rounded-lg font-bold hover:bg-black transition-all shadow-md">
                      {isResending ? 'Enviando...' : 'Reenviar Email Real'}
                  </button>
                  <button onClick={() => setView('login')} className="text-xs text-bokara-grey/60 hover:underline">Intentar con otro correo</button>
              </div>
          )}

          {view === 'forgot_password' && (
               <form onSubmit={handleForgotSubmit} className="space-y-6 animate-fade-in">
                    <h3 className="text-xl font-bold text-bokara-grey">Recuperar Acceso</h3>
                    {!resetSuccessMessage ? (
                        <>
                            <p className="text-sm text-bokara-grey/70">Ingresa tu email para recibir instrucciones.</p>
                            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg p-3 text-bokara-grey" placeholder="tu@correo.com" />
                            <div className="flex flex-col gap-3">
                                <button type="submit" disabled={isSendingReset} className="w-full py-3 bg-bokara-grey text-white rounded-lg font-bold hover:bg-black transition-all">Enviar Enlace</button>
                                <button type="button" onClick={() => setView('login')} className="text-sm text-bokara-grey/60">Cancelar</button>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
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
