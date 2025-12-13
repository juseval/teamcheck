
import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { verifyPasswordResetCode, confirmPasswordReset } from '../services/apiService';

interface ResetPasswordPageProps {
  oobCode: string;
  onNavigateToLogin: () => void;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ oobCode, onNavigateToLogin }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { addNotification } = useNotification();

  useEffect(() => {
    const verifyCode = async () => {
        try {
            const email = await verifyPasswordResetCode(oobCode);
            setUserEmail(email);
        } catch (error) {
            console.error("Invalid reset code", error);
            addNotification('El enlace de restablecimiento es inválido o ha expirado.', 'error');
            setTimeout(onNavigateToLogin, 3000);
        } finally {
            setIsVerifying(false);
        }
    };
    verifyCode();
  }, [oobCode, addNotification, onNavigateToLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
        addNotification('La contraseña debe tener al menos 6 caracteres.', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        addNotification('Las contraseñas no coinciden.', 'error');
        return;
    }

    setIsSubmitting(true);
    try {
        await confirmPasswordReset(oobCode, newPassword);
        addNotification('Contraseña restablecida exitosamente. Inicia sesión.', 'success');
        setTimeout(onNavigateToLogin, 2000);
    } catch (error: any) {
        console.error('Error confirming reset:', error);
        addNotification(error.message || 'Error al restablecer la contraseña.', 'error');
        setIsSubmitting(false);
    }
  };

  const ToggleIcon = ({ isVisible }: { isVisible: boolean }) => (
    isVisible ? (
      <svg className="w-5 h-5 text-bokara-grey/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
    ) : (
      <svg className="w-5 h-5 text-bokara-grey/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    )
  );

  if (isVerifying) {
      return (
        <div className="w-full min-h-screen flex items-center justify-center bg-bright-white">
            <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-lucius-lime animate-pulse delay-75"></div>
                <div className="w-4 h-4 rounded-full bg-lucius-lime animate-pulse delay-150"></div>
                <div className="w-4 h-4 rounded-full bg-lucius-lime animate-pulse delay-300"></div>
            </div>
        </div>
      );
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center animate-fade-in px-4 bg-bright-white">
        <div className="w-full max-w-md bg-white rounded-xl shadow-md border border-bokara-grey/10 p-8">
            <h1 className="text-2xl font-bold text-bokara-grey mb-2">Cambiar la contraseña</h1>
            {userEmail && <p className="text-bokara-grey/80 mb-8 font-medium">de {userEmail}</p>}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-bokara-grey/60 mb-1">Nueva contraseña</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime transition-all"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/5"
                        >
                            <ToggleIcon isVisible={showPassword} />
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-bokara-grey/60 mb-1">Confirmar contraseña</label>
                    <div className="relative">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime transition-all"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/5"
                        >
                            <ToggleIcon isVisible={showConfirmPassword} />
                        </button>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={isSubmitting || !newPassword || !confirmPassword}
                        className="bg-lucius-lime text-bokara-grey font-bold py-2 px-6 rounded-lg hover:bg-opacity-80 transition-colors shadow-sm disabled:bg-lucius-lime/40 disabled:cursor-not-allowed uppercase text-sm tracking-wide"
                    >
                        {isSubmitting ? 'Guardando...' : 'GUARDAR'}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default ResetPasswordPage;
