
import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon } from '../components/Icons';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const { addNotification } = useNotification();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mobileCheck = /Mobi|Android|iPhone/i.test(navigator.userAgent);
    if (mobileCheck) {
        setIsMobile(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Trim input to avoid accidental whitespace issues
    const cleanEmail = email.trim();
    const cleanPassword = password; // Do not trim password as spaces might be valid
    
    if (!cleanEmail) {
        addNotification("Por favor ingrese su correo electrónico.", 'error');
        return;
    }
    
    if (!cleanPassword) {
        addNotification("Por favor ingrese su contraseña.", 'error');
        return;
    }

    setIsLoggingIn(true);
    try {
      await onLogin({ email: cleanEmail, password: cleanPassword });
      // Successful login will unmount this component via parent state change
    } catch (error) {
      // The notification is handled by the `onLogin` function in App.tsx
      setIsLoggingIn(false);
    }
  };

  const handleForgotPasswordClick = async () => {
      const cleanEmail = email.trim();
      if (!cleanEmail) {
          addNotification("Por favor ingrese su correo electrónico para recuperar la contraseña.", 'error');
          return;
      }
      
      setIsResettingPassword(true);
      try {
          await onForgotPassword(cleanEmail);
      } finally {
          setIsResettingPassword(false);
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
            <p className="text-bokara-grey/70 mt-2">¡Bienvenido de nuevo! Inicia sesión en tu cuenta.</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-8 border border-bokara-grey/10">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="tu@ejemplo.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-lucius-lime mb-2">
                  Contraseña
                </label>
                <div className="text-sm">
                  <button 
                    type="button"
                    onClick={handleForgotPasswordClick}
                    className="font-medium text-lucius-lime hover:text-lucius-lime/80 hover:underline"
                    disabled={isResettingPassword}
                  >
                    {isResettingPassword ? 'Enviando...' : '¿Olvidaste tu contraseña?'}
                  </button>
                </div>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime"
                placeholder="••••••••"
              />
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-bokara-grey bg-lucius-lime hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lucius-lime transition-colors disabled:bg-lucius-lime/40 disabled:cursor-wait"
                disabled={!email || !password || isLoggingIn}
              >
                {isLoggingIn ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
              </button>
            </div>
          </form>
        </div>

         <p className="mt-6 text-center text-sm text-bokara-grey/80">
            ¿No tienes una cuenta?{' '}
            <button onClick={onNavigateToRegister} className="font-medium text-lucius-lime hover:text-lucius-lime/80 underline">
              Regístrate
            </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
