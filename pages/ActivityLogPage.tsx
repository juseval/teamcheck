import React, { useState } from 'react';
import { ArrowLeftIcon } from '../components/Icons';
import { useNotification } from '../contexts/NotificationContext';

interface LoginPageProps {
  onLogin: (credentials: { email: string; }) => Promise<void>;
  onNavigateToRegister: () => void;
  onNavigateToHome: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onNavigateToRegister, onNavigateToHome }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { addNotification } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      setIsLoggingIn(true);
      try {
        await onLogin({ email });
        // Successful login will unmount this component, no need to setIsLoggingIn(false)
      } catch (error) {
        addNotification("An unexpected error occurred during login.", 'error');
        console.error("Login failed", error);
        setIsLoggingIn(false); // Re-enable button on failure
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bright-white p-4 relative">
      <div className="absolute top-4 left-4 sm:top-8 sm:left-8">
        <button onClick={onNavigateToHome} className="flex items-center gap-2 text-bokara-grey/80 hover:text-bokara-grey font-semibold transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Back to Home</span>
        </button>
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-bokara-grey tracking-wider">
              Team<span className="text-lucius-lime">Check</span>
            </h1>
            <p className="text-bokara-grey/70 mt-2">Welcome back! Please sign in to your account.</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-8 border border-bokara-grey/10">
          <form onSubmit={handleSubmit} className="space-y-6">
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
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-lucius-lime mb-2">
                  Password
                </label>
                <div className="text-sm">
                  <a href="#" className="font-medium text-lucius-lime hover:text-lucius-lime/80">
                    Forgot your password?
                  </a>
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
                {isLoggingIn ? 'Signing In...' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>

         <p className="mt-6 text-center text-sm text-bokara-grey/80">
            Don't have an account?{' '}
            <button onClick={onNavigateToRegister} className="font-medium text-lucius-lime hover:text-lucius-lime/80 underline">
              Sign up
            </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
