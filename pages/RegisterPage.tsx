
import React, { useState } from 'react';
import { ArrowLeftIcon } from '../components/Icons';
import { useNotification } from '../contexts/NotificationContext';

interface RegisterPageProps {
  onRegister: (data: { fullName: string; email: string; password: string }) => Promise<void>;
  onNavigateToLogin: () => void;
  onNavigateToHome: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onRegister, onNavigateToLogin, onNavigateToHome }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorType, setErrorType] = useState<'ALREADY_EXISTS' | 'GENERIC' | null>(null);
  
  const { addNotification } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorType(null);

    if (password !== confirmPassword) {
        addNotification("Las contraseñas no coinciden.", 'error');
        return;
    }

    if (password.length < 6) {
        addNotification("La contraseña debe tener al menos 6 caracteres.", 'error');
        return;
    }
    
    setIsRegistering(true);
    try {
        await onRegister({ 
            fullName, 
            email, 
            password
        });
    } catch (error: any) {
        console.error("Register error:", error);
        // Capturamos el error específico de Firebase Auth
        if (error.code === 'auth/email-already-in-use' || error.message?.includes('email-already-in-use')) {
            setErrorType('ALREADY_EXISTS');
        } else {
            setErrorType('GENERIC');
            addNotification(error.message || "Error en el registro", 'error');
        }
    } finally {
        setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center p-4 sm:p-8 relative overflow-hidden">
      {/* Fondo decorativo sutil */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-lucius-lime/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-6xl flex justify-between items-center mb-12 z-10">
          <button onClick={onNavigateToHome} className="flex items-center gap-2 text-white/60 hover:text-white font-bold transition-colors">
              <ArrowLeftIcon className="w-5 h-5" />
              <span>Inicio</span>
          </button>
          <h1 className="text-3xl font-bold text-white tracking-wider">
              Team<span className="text-lucius-lime">Check</span>
          </h1>
          <div className="w-20"></div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-[#1E1E1E] rounded-[2rem] shadow-2xl border border-white/5 overflow-hidden animate-fade-in z-10">
          
          {/* Lado Izquierdo: Branding/Imagen */}
          <div className="hidden lg:flex relative flex-col justify-between p-12 bg-gradient-to-br from-bokara-grey to-black">
              <div className="absolute inset-0 opacity-40">
                  <img 
                    src="https://images.unsplash.com/photo-1522071823991-b9671e303061?q=80&w=2070&auto=format&fit=crop" 
                    alt="Teamwork" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1E1E1E] via-[#1E1E1E]/40 to-transparent"></div>
              </div>
              
              <div className="relative z-10">
                  <h2 className="text-4xl font-display font-bold text-white leading-tight">
                    Capturando Tiempo,<br/>
                    <span className="text-lucius-lime">Creando Valor</span>
                  </h2>
                  <div className="flex gap-2 mt-6">
                      <div className="w-8 h-1 bg-lucius-lime rounded-full"></div>
                      <div className="w-2 h-1 bg-white/20 rounded-full"></div>
                      <div className="w-2 h-1 bg-white/20 rounded-full"></div>
                  </div>
              </div>

              <div className="relative z-10">
                  <p className="text-white/60 text-sm max-w-xs italic">
                    "La mejor herramienta para gestionar equipos remotos y presenciales de manera eficiente."
                  </p>
              </div>
          </div>

          {/* Lado Derecho: Formulario */}
          <div className="p-8 sm:p-12 flex flex-col justify-center">
            
            {errorType === 'ALREADY_EXISTS' ? (
                <div className="animate-fade-in space-y-6">
                    <div className="bg-lucius-lime/10 border border-lucius-lime/20 p-8 rounded-3xl text-center">
                        <div className="w-16 h-16 bg-lucius-lime/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-lucius-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-3">¡Ya tienes una cuenta!</h3>
                        <p className="text-white/60 text-sm leading-relaxed mb-4">
                            El correo <span className="text-white font-bold">{email}</span> ya está registrado en TeamCheck.
                        </p>
                        <p className="text-lucius-lime font-medium text-xs uppercase tracking-widest bg-lucius-lime/5 py-2 px-4 rounded-full inline-block">
                           Inicia sesión para aceptar tu nueva invitación
                        </p>
                    </div>
                    
                    <div className="space-y-3">
                        <button
                            onClick={onNavigateToLogin}
                            className="w-full bg-lucius-lime text-bokara-grey font-bold py-4 px-6 rounded-xl hover:bg-white transition-all shadow-lg active:scale-95 text-lg"
                        >
                            Entrar con mi cuenta
                        </button>
                        <button 
                            onClick={() => setErrorType(null)}
                            className="w-full py-3 text-xs font-bold text-white/40 hover:text-white uppercase tracking-widest transition-colors"
                        >
                            Usar otro correo diferente
                        </button>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2">Crear una cuenta</h2>
                        <p className="text-white/40 text-sm">Únete a tu equipo hoy mismo.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5 ml-1">Nombre Completo</label>
                            <input
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-lucius-lime transition-all placeholder:text-white/10"
                                placeholder="Escribe tu nombre completo"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5 ml-1">Correo Electrónico</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-lucius-lime transition-all placeholder:text-white/10"
                                placeholder="tu@correo.com"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5 ml-1">Contraseña</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-lucius-lime transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5 ml-1">Confirmar</label>
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 ${confirmPassword && password !== confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-white/10 focus:ring-lucius-lime'} transition-all`}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="pt-4 space-y-4">
                            <button
                                type="submit"
                                disabled={isRegistering}
                                className="w-full bg-lucius-lime text-bokara-grey font-bold py-4 px-6 rounded-xl hover:bg-white transition-all shadow-xl disabled:opacity-50 disabled:cursor-wait active:scale-95 text-lg"
                            >
                                {isRegistering ? 'Procesando...' : 'Crear Cuenta'}
                            </button>
                            
                            <div className="flex flex-col items-center gap-2">
                                <button 
                                    type="button"
                                    onClick={onNavigateToLogin}
                                    className="text-sm font-bold text-white/40 hover:text-lucius-lime transition-colors"
                                >
                                    ¿Ya tienes cuenta? <span className="text-white underline">Inicia sesión</span>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default RegisterPage;
