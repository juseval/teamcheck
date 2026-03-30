
import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { verifyEmailWithToken } from '../services/apiService';

interface VerifyEmailPageProps {
  onNavigateToLogin: () => void;
}

const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ onNavigateToLogin }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const { addNotification } = useNotification();

  useEffect(() => {
    const handleVerification = async () => {
        const params = new URLSearchParams(window.location.search);
        // Firebase usa 'oobCode' para sus links de verificación
        const code = params.get('oobCode') || params.get('token');

        if (!code) {
            setStatus('error');
            setErrorMessage('Enlace no válido. Por favor solicita uno nuevo.');
            return;
        }

        try {
            await verifyEmailWithToken(code);
            setStatus('success');
            addNotification('¡Correo verificado con éxito!', 'success');
        } catch (error: any) {
            console.error('Email verification failed:', error);
            setStatus('error');
            setErrorMessage('El enlace ha expirado o ya ha sido utilizado.');
        }
    };

    handleVerification();
  }, [addNotification]);

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-bright-white px-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-md border border-bokara-grey/10 p-8 text-center animate-fade-in">
            {status === 'loading' && (
                <div className="flex flex-col items-center gap-4">
                    <div className="flex space-x-2">
                        <div className="w-4 h-4 rounded-full bg-lucius-lime animate-pulse delay-75"></div>
                        <div className="w-4 h-4 rounded-full bg-lucius-lime animate-pulse delay-150"></div>
                        <div className="w-4 h-4 rounded-full bg-lucius-lime animate-pulse delay-300"></div>
                    </div>
                    <p className="text-bokara-grey/60">Verificando tu cuenta...</p>
                </div>
            )}

            {status === 'success' && (
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-bokara-grey">¡Correo Confirmado!</h2>
                    <p className="text-bokara-grey/70 mb-6">Tu cuenta ya está activa. Ahora puedes acceder a TeamCheck.</p>
                    <button onClick={onNavigateToLogin} className="w-full bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-3 px-6 rounded-lg transition-all shadow-md">
                        Iniciar Sesión
                    </button>
                </div>
            )}

            {status === 'error' && (
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-2">
                        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-bokara-grey">Error de Verificación</h2>
                    <p className="text-bokara-grey/70 mb-6">{errorMessage}</p>
                    <button onClick={onNavigateToLogin} className="w-full bg-gray-200 hover:bg-gray-300 text-bokara-grey font-bold py-3 px-6 rounded-lg transition-all">
                        Ir al Login
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};

export default VerifyEmailPage;
