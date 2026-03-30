
import React, { useState, useEffect, useRef } from 'react';
import { ClockIcon, DashboardIcon, TeamIcon, ActivityLogIcon, ChronoLogIcon } from '../components/Icons.tsx';
import { useNotification } from '../contexts/NotificationContext';

interface HomePageProps {
  onLogin: (credentials: { email: string; password: string; }) => Promise<void>;
  onRegister: (data: { fullName: string; email: string; password: string }) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
}

// Hook to detect visibility
const useElementOnScreen = (options: IntersectionObserverInit) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting) {
        setIsVisible(true);
        // Once visible, stop observing to keep it visible (no toggle effect)
        if (containerRef.current) observer.unobserve(containerRef.current);
      }
    }, options);

    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      if (containerRef.current) observer.unobserve(containerRef.current);
    };
  }, [containerRef, options]);

  return [containerRef, isVisible] as const;
};

// Animation Wrapper Component
const ScrollReveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = '' }) => {
    const [ref, isVisible] = useElementOnScreen({
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    });

    return (
        <div 
            ref={ref} 
            className={`transition-all duration-1000 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'} ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
    <div className="group relative bg-white/5 backdrop-blur-lg border border-white/10 p-8 rounded-2xl text-center transition-all duration-300 hover:-translate-y-2 hover:bg-white/10 hover:shadow-2xl hover:shadow-lucius-lime/10 h-full flex flex-col items-center">
        <div className="bg-lucius-lime/10 text-lucius-lime w-20 h-20 rounded-full flex items-center justify-center mb-6 border-2 border-lucius-lime/20 group-hover:border-lucius-lime/50 transition-colors">
            <div className="transition-transform duration-300 group-hover:scale-110">
                {icon}
            </div>
        </div>
        <h3 className="text-2xl font-bold text-bright-white mb-3">{title}</h3>
        <p className="text-bright-white/70 leading-relaxed">{description}</p>
    </div>
);

const WorkflowStep: React.FC<{ number: string; title: string; description: string; icon: React.ReactNode }> = ({ number, title, description, icon }) => (
    <div className="flex flex-col items-center text-center relative z-10">
        <div className="text-9xl font-display font-bold text-white/5 absolute -top-10 select-none z-0">
            {number}
        </div>
        <div className="w-16 h-16 bg-gradient-to-br from-lucius-lime to-dark-hunter-green rounded-2xl rotate-3 flex items-center justify-center mb-6 shadow-lg z-10">
             <div className="text-white -rotate-3 transform scale-110">
                {icon}
             </div>
        </div>
        <h4 className="text-xl font-bold text-bright-white mb-2 z-10">{title}</h4>
        <p className="text-bright-white/60 max-w-xs z-10">{description}</p>
    </div>
);

const InputField: React.FC<{
    label: string;
    type: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    required?: boolean;
}> = ({ label, type, value, onChange, placeholder, required }) => (
    <div className="mb-4">
        <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-lucius-lime focus:ring-1 focus:ring-lucius-lime transition-all"
        />
    </div>
);

const HomePage: React.FC<HomePageProps> = ({ onLogin, onRegister, onForgotPassword }) => {
  const [modalView, setModalView] = useState<'none' | 'login' | 'register' | 'forgot' | 'already_exists'>('none');
  const { addNotification } = useNotification();

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetForms = () => {
      setEmail('');
      setPassword('');
      setFullName('');
      setConfirmPassword('');
      setIsLoading(false);
  };

  const openModal = (view: 'login' | 'register') => {
      resetForms();
      setModalView(view);
  };

  const closeModal = () => {
      setModalView('none');
      resetForms();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      try {
          await onLogin({ email, password });
      } catch (error) {
          setIsLoading(false);
      }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (password !== confirmPassword) {
          addNotification("Las contraseñas no coinciden", 'error');
          return;
      }
      setIsLoading(true);
      try {
          await onRegister({ fullName, email, password });
          setModalView('login'); 
          resetForms();
      } catch (error: any) {
          setIsLoading(false);
          // Si el email ya está en uso, mostramos la vista informativa en lugar del error genérico
          if (error.code === 'auth/email-already-in-use' || error.message?.includes('email-already-in-use')) {
              setModalView('already_exists');
          }
      }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      try {
          await onForgotPassword(email);
          setModalView('login');
      } catch (error) {
          setIsLoading(false);
      }
  };

  return (
    <div className="min-h-screen text-bright-white font-sans relative overflow-x-hidden">
        {/* Background Image and Overlay */}
        <div className="fixed inset-0 z-0">
            <img 
                src="https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=2835&auto=format&fit=crop" 
                alt="Modern office background" 
                className="w-full h-full object-cover transform scale-105" 
            />
            <div className="absolute inset-0 bg-bokara-grey/90"></div>
            {/* Subtle Texture Overlay */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#91A673 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        </div>

        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Header */}
          <header className="py-6 px-4 sm:px-10 w-full flex justify-between items-center animate-fade-in backdrop-blur-sm sticky top-0 z-40 bg-bokara-grey/80 border-b border-white/5">
            <h1 className="text-3xl font-bold text-bright-white tracking-wider cursor-pointer flex items-center gap-2">
              <div className="w-3 h-3 bg-lucius-lime rounded-full animate-pulse"></div>
              Team<span className="text-lucius-lime">Check</span>
            </h1>
            <div className="flex items-center gap-4">
                <button onClick={() => openModal('login')} className="text-bright-white font-semibold hover:text-lucius-lime transition-colors text-sm sm:text-base">
                    Iniciar Sesión
                </button>
                <button onClick={() => openModal('register')} className="bg-lucius-lime hover:bg-opacity-90 text-bokara-grey font-bold py-2 px-5 rounded-lg transition-all duration-300 shadow-lg hover:shadow-lucius-lime/20 text-sm sm:text-base">
                    Empezar
                </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-grow">
            
            {/* Hero Section */}
            <section className="text-center py-24 sm:py-32 px-4 container mx-auto">
                <ScrollReveal>
                    <h2 className="text-5xl sm:text-7xl lg:text-8xl font-display font-bold text-bright-white leading-tight drop-shadow-md mb-8">
                        Seguimiento de Tiempo <br /> 
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-lucius-lime to-white">Rediseñado</span>.
                    </h2>
                </ScrollReveal>
                
                <ScrollReveal delay={200}>
                    <p className="max-w-2xl mx-auto mt-2 text-xl text-bright-white/70 leading-relaxed">
                        Supervise la asistencia sin esfuerzo, gestione turnos y obtenga información útil con la plataforma intuitiva de TeamCheck.
                    </p>
                </ScrollReveal>

                <ScrollReveal delay={400}>
                    <div className="mt-12 flex justify-center">
                        <button onClick={() => openModal('register')} className="bg-lucius-lime hover:bg-white hover:text-bokara-grey text-bokara-grey font-bold py-4 px-10 rounded-xl transition-all duration-300 shadow-xl hover:shadow-lucius-lime/40 text-lg transform hover:-translate-y-1">
                            Prueba Gratis Ahora
                        </button>
                    </div>
                </ScrollReveal>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-black/20 backdrop-blur-sm border-y border-white/5">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <ScrollReveal>
                            <h3 className="text-3xl font-bold text-white mb-4">Todo lo que necesitas para gestionar tu equipo</h3>
                            <p className="text-white/60 max-w-2xl mx-auto">Deja de usar hojas de cálculo. Actualízate a un sistema que crece con tu empresa.</p>
                        </ScrollReveal>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <ScrollReveal delay={100} className="h-full">
                            <FeatureCard
                                icon={<ClockIcon className="w-10 h-10 text-bright-white"/>}
                                title="Marcación Inteligente"
                                description="Marcaciones con geolocalización para saber exactamente dónde y cuándo empieza su equipo."
                            />
                        </ScrollReveal>
                        <ScrollReveal delay={300} className="h-full">
                             <FeatureCard
                                icon={<DashboardIcon className="w-10 h-10 text-bright-white"/>}
                                title="Panel en Vivo"
                                description="Visibilidad en tiempo real de quién está trabajando, quién está en descanso y quién falta."
                            />
                        </ScrollReveal>
                        <ScrollReveal delay={500} className="h-full">
                             <FeatureCard
                                icon={<ChronoLogIcon className="w-10 h-10 text-bright-white"/>}
                                title="Resúmenes con IA"
                                description="Deja que nuestra IA impulsada por Gemini analice los registros diarios y genere informes al instante."
                            />
                        </ScrollReveal>
                    </div>
                </div>
            </section>

            {/* How It Works (Workflow) */}
            <section className="py-32 container mx-auto px-4">
                <ScrollReveal>
                    <div className="text-center mb-20">
                        <h3 className="text-4xl font-display font-bold text-white mb-6">Flujo de Trabajo Simple</h3>
                        <div className="w-20 h-1 bg-lucius-lime mx-auto rounded-full"></div>
                    </div>
                </ScrollReveal>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-24 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent z-0"></div>

                    <ScrollReveal delay={100}>
                        <WorkflowStep 
                            number="01" 
                            title="Entrada" 
                            description="Los colaboradores marcan entrada con un solo toque desde cualquier dispositivo."
                            icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>}
                        />
                    </ScrollReveal>

                    <ScrollReveal delay={300}>
                        <WorkflowStep 
                            number="02" 
                            title="Actividad" 
                            description="Registra tareas específicas, descansos o estados personalizados en tiempo real."
                            icon={<ActivityLogIcon className="w-8 h-8" />}
                        />
                    </ScrollReveal>

                    <ScrollReveal delay={500}>
                        <WorkflowStep 
                            number="03" 
                            title="Análisis" 
                            description="Los administradores obtienen reportes instantáneos y planillas para nómina."
                            icon={<TeamIcon className="w-8 h-8" />}
                        />
                    </ScrollReveal>
                </div>
            </section>

            {/* Bottom CTA */}
            <section className="py-24 bg-lucius-lime text-bokara-grey relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                     <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                     </svg>
                </div>
                
                <div className="container mx-auto px-4 text-center relative z-10">
                    <ScrollReveal>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">¿Listo para optimizar su equipo?</h2>
                        <p className="text-xl md:text-2xl opacity-80 mb-10 max-w-2xl mx-auto">
                            Únete a miles de gerentes que ahorran horas cada semana con TeamCheck.
                        </p>
                        <button 
                            onClick={() => openModal('register')}
                            className="bg-bokara-grey text-white text-xl font-bold py-4 px-12 rounded-full hover:bg-white hover:text-bokara-grey transition-all duration-300 shadow-2xl transform hover:scale-105"
                        >
                            Crear Cuenta Gratis
                        </button>
                        <p className="mt-4 text-sm opacity-60">No se requiere tarjeta de crédito. Cancela en cualquier momento.</p>
                    </ScrollReveal>
                </div>
            </section>

          </main>

          {/* Footer */}
          <footer className="bg-black/40 py-12 px-4 border-t border-white/5">
            <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-left">
                    <h4 className="text-2xl font-bold text-white mb-2">Team<span className="text-lucius-lime">Check</span></h4>
                    <p className="text-white/50 text-sm">Empoderando a los equipos para trabajar de manera más inteligente.</p>
                </div>
                <div className="flex gap-8 text-sm text-white/60">
                    <a href="#" className="hover:text-lucius-lime transition-colors">Privacidad</a>
                    <a href="#" className="hover:text-lucius-lime transition-colors">Términos</a>
                    <a href="#" className="hover:text-lucius-lime transition-colors">Soporte</a>
                </div>
            </div>
            <div className="text-center mt-12 text-white/20 text-xs">
                &copy; {new Date().getFullYear()} TeamCheck Inc. Todos los derechos reservados.
            </div>
          </footer>
        </div>

        {/* Glass Modal Overlay */}
        {modalView !== 'none' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={closeModal}></div>

                {/* Modal Content */}
                <div className="relative w-full max-w-5xl h-auto min-h-[550px] bg-bokara-grey/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl flex overflow-hidden">
                    {/* Left Side: Visual / Branding */}
                    <div className="hidden md:flex w-5/12 relative flex-col justify-between p-10 overflow-hidden bg-bokara-grey">
                        <div className="absolute inset-0">
                            <img 
                                src="https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2670&q=80" 
                                alt="Abstract dark green fluid background" 
                                className="w-full h-full object-cover opacity-80"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-bokara-grey via-transparent to-transparent"></div>
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold tracking-widest text-bright-white">TeamCheck</h3>
                        </div>
                        <div className="relative z-10 mb-8">
                            <h2 className="text-3xl font-display font-bold text-white mb-4 leading-tight">
                                Capturando Tiempo,<br/>Creando Valor
                            </h2>
                            <div className="flex gap-2">
                                <div className="w-8 h-1 bg-lucius-lime rounded-full"></div>
                                <div className="w-2 h-1 bg-white/30 rounded-full"></div>
                                <div className="w-2 h-1 bg-white/30 rounded-full"></div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Forms */}
                    <div className="w-full md:w-7/12 p-8 sm:p-12 flex flex-col justify-center bg-white/5 relative">
                        <button onClick={closeModal} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        {/* Already Exists View */}
                        {modalView === 'already_exists' && (
                             <div className="w-full max-w-sm mx-auto animate-fade-in space-y-6">
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
                                       Inicia sesión para entrar a tu nuevo equipo
                                    </p>
                                </div>
                                
                                <div className="space-y-3">
                                    <button
                                        onClick={() => setModalView('login')}
                                        className="w-full bg-lucius-lime text-bokara-grey font-bold py-4 px-6 rounded-xl hover:bg-white transition-all shadow-lg active:scale-95 text-lg"
                                    >
                                        Iniciar Sesión
                                    </button>
                                    <button 
                                        onClick={() => setModalView('register')}
                                        className="w-full py-3 text-xs font-bold text-white/40 hover:text-white uppercase tracking-widest transition-colors"
                                    >
                                        Usar otro correo diferente
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Login View */}
                        {modalView === 'login' && (
                            <div className="w-full max-w-sm mx-auto animate-fade-in">
                                <h2 className="text-3xl font-bold text-white mb-2">Bienvenido</h2>
                                <p className="text-white/60 mb-8">Ingresa tus datos para continuar.</p>
                                
                                <form onSubmit={handleLoginSubmit}>
                                    <InputField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" required />
                                    <InputField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                                    
                                    <div className="flex justify-between items-center mb-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" className="rounded bg-white/10 border-white/20 text-lucius-lime focus:ring-0" />
                                            <span className="text-sm text-white/60">Recordarme</span>
                                        </label>
                                        <button type="button" onClick={() => setModalView('forgot')} className="text-sm text-lucius-lime hover:underline font-medium">¿Olvidó contraseña?</button>
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={isLoading}
                                        className="w-full bg-lucius-lime hover:bg-opacity-90 text-bokara-grey font-bold py-3 rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        {isLoading ? 'Entrando...' : 'Entrar'}
                                    </button>
                                </form>

                                <div className="mt-6 text-center">
                                    <span className="text-white/50 text-sm">¿No tienes cuenta? </span>
                                    <button onClick={() => openModal('register')} className="text-white font-semibold hover:underline text-sm">Regístrate</button>
                                </div>
                            </div>
                        )}

                        {/* Register View */}
                        {modalView === 'register' && (
                            <div className="w-full max-w-sm mx-auto animate-fade-in">
                                <h2 className="text-3xl font-bold text-white mb-2">Crear Cuenta</h2>
                                <p className="text-white/60 mb-8">Únete a tu equipo hoy mismo.</p>
                                
                                <form onSubmit={handleRegisterSubmit}>
                                    <InputField label="Nombre Completo" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Escribe tu nombre completo" required />
                                    <InputField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" required />
                                    <InputField label="Contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                                    <InputField label="Confirmar" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
                                    
                                    <div className="mb-6">
                                        <label className="flex items-start gap-2 cursor-pointer">
                                            <input type="checkbox" required className="mt-1 rounded bg-white/10 border-white/20 text-lucius-lime focus:ring-0" />
                                            <span className="text-xs text-white/60">Acepto los <a href="#" className="underline hover:text-white">Términos y Condiciones</a></span>
                                        </label>
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={isLoading}
                                        className="w-full bg-lucius-lime hover:bg-opacity-90 text-bokara-grey font-bold py-3 rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        {isLoading ? 'Registrando...' : 'Registrarme'}
                                    </button>
                                </form>

                                <div className="mt-6 text-center">
                                    <span className="text-white/50 text-sm">¿Ya tienes cuenta? </span>
                                    <button onClick={() => openModal('login')} className="text-white font-semibold hover:underline text-sm">Entrar</button>
                                </div>
                            </div>
                        )}

                        {/* Forgot Password View */}
                        {modalView === 'forgot' && (
                            <div className="w-full max-w-sm mx-auto animate-fade-in">
                                <h2 className="text-3xl font-bold text-white mb-2">Recuperar Acceso</h2>
                                <p className="text-white/60 mb-8">Ingresa tu email para recibir instrucciones.</p>
                                
                                <form onSubmit={handleForgotSubmit}>
                                    <InputField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" required />
                                    
                                    <button 
                                        type="submit" 
                                        disabled={isLoading}
                                        className="w-full bg-lucius-lime hover:bg-opacity-90 text-bokara-grey font-bold py-3 rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-wait mb-4"
                                    >
                                        {isLoading ? 'Enviando...' : 'Enviar Enlace'}
                                    </button>
                                    
                                    <button 
                                        type="button" 
                                        onClick={() => openModal('login')}
                                        className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-lg transition-all"
                                    >
                                        Volver
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default HomePage;
