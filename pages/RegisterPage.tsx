
import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon } from '../components/Icons';
import { useNotification } from '../contexts/NotificationContext';

interface RegisterPageProps {
  onRegister: (data: { fullName: string; email: string; password: string; }) => Promise<void>;
  onNavigateToLogin: () => void;
  onNavigateToHome: () => void;
}

const DesktopNotSupported: React.FC<{ onNavigateToHome: () => void; }> = ({ onNavigateToHome }) => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bright-white p-6 text-center relative">
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
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
    if (password !== confirmPassword) {
        addNotification("Las contraseñas no coinciden.", 'error');
        return;
    }
    setIsRegistering(true);
    try {
        await onRegister({ fullName, email, password });
        addNotification('¡Registro exitoso! Ya puedes iniciar sesión.', 'success');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-bright-white p-4 relative">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-bokara-grey tracking-wider">
              Team<span className="text-lucius-lime">Check</span>
            </h1>
            <p className="text-bokara-grey/70 mt-2">Create an account to get started.</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-8 border border-bokara-grey/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-lucius-lime mb-2">
                Full Name
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
                Email Address
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
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-lucius-lime mb-2">
                Password
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
                Confirm Password
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
                disabled={!fullName || !email || !password || password !== confirmPassword || isRegistering}
              >
                {isRegistering ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
        
        <p className="mt-6 text-center text-sm text-bokara-grey/80">
            Already have an account?{' '}
            <button onClick={onNavigateToLogin} className="font-medium text-lucius-lime hover:text-lucius-lime/80 underline">
                Sign in
            </button>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
