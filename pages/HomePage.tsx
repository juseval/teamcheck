
import React, { useState, useEffect, useRef } from 'react';
import { ClockIcon, DashboardIcon, TeamIcon, ActivityLogIcon, ChronoLogIcon } from '../components/Icons.tsx';
import { useNotification } from '../contexts/NotificationContext';

interface HomePageProps {
  onLogin: (credentials: { email: string; password: string; }) => Promise<void>;
  onRegister: (data: { fullName: string; email: string; password: string; companyName: string; inviteCode?: string }) => Promise<void>;
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
  const [modalView, setModalView] = useState<'none' | 'login' | 'register' | 'forgot'>('none');
  const { addNotification } = useNotification();

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetForms = () => {
      setEmail('');
      setPassword('');
      setFullName('');
      setCompanyName('');
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
          // If successful, App component will likely unmount HomePage or we wait for redirect
      } catch (error) {
          setIsLoading(false);
      }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (password !== confirmPassword) {
          addNotification("Passwords do not match", 'error');
          return;
      }
      setIsLoading(true);
      try {
          await onRegister({ fullName, email, password, companyName });
          setModalView('login'); // Switch to login on success or let app handle it
          resetForms();
      } catch (error) {
          setIsLoading(false);
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
                    Sign In
                </button>
                <button onClick={() => openModal('register')} className="bg-lucius-lime hover:bg-opacity-90 text-bokara-grey font-bold py-2 px-5 rounded-lg transition-all duration-300 shadow-lg hover:shadow-lucius-lime/20 text-sm sm:text-base">
                    Get Started
                </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-grow">
            
            {/* Hero Section */}
            <section className="text-center py-24 sm:py-32 px-4 container mx-auto">
                <ScrollReveal>
                    <h2 className="text-5xl sm:text-7xl lg:text-8xl font-display font-bold text-bright-white leading-tight drop-shadow-md mb-8">
                        Time Tracking <br /> 
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-lucius-lime to-white">Reimagined</span>.
                    </h2>
                </ScrollReveal>
                
                <ScrollReveal delay={200}>
                    <p className="max-w-2xl mx-auto mt-2 text-xl text-bright-white/70 leading-relaxed">
                        Effortlessly monitor attendance, manage shift schedules, and gain actionable insights with TeamCheck's intuitive platform.
                    </p>
                </ScrollReveal>

                <ScrollReveal delay={400}>
                    <div className="mt-12 flex justify-center">
                        <button onClick={() => openModal('register')} className="bg-lucius-lime hover:bg-white hover:text-bokara-grey text-bokara-grey font-bold py-4 px-10 rounded-xl transition-all duration-300 shadow-xl hover:shadow-lucius-lime/40 text-lg transform hover:-translate-y-1">
                            Start Free Trial
                        </button>
                    </div>
                </ScrollReveal>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-black/20 backdrop-blur-sm border-y border-white/5">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <ScrollReveal>
                            <h3 className="text-3xl font-bold text-white mb-4">Everything you need to manage your team</h3>
                            <p className="text-white/60 max-w-2xl mx-auto">Stop using spreadsheets. Upgrade to a system that grows with your company.</p>
                        </ScrollReveal>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <ScrollReveal delay={100} className="h-full">
                            <FeatureCard
                                icon={<ClockIcon className="w-10 h-10 text-bright-white"/>}
                                title="Smart Clock-In"
                                description="Geolocated clock-ins ensure you know exactly where and when your team starts their day."
                            />
                        </ScrollReveal>
                        <ScrollReveal delay={300} className="h-full">
                             <FeatureCard
                                icon={<DashboardIcon className="w-10 h-10 text-bright-white"/>}
                                title="Live Dashboard"
                                description="Real-time visibility into who is working, who is on break, and who is absent."
                            />
                        </ScrollReveal>
                        <ScrollReveal delay={500} className="h-full">
                             <FeatureCard
                                icon={<ChronoLogIcon className="w-10 h-10 text-bright-white"/>}
                                title="AI Summaries"
                                description="Let our Gemini-powered AI analyze daily logs and provide productivity summaries instantly."
                            />
                        </ScrollReveal>
                    </div>
                </div>
            </section>

            {/* How It Works (Workflow) */}
            <section className="py-32 container mx-auto px-4">
                <ScrollReveal>
                    <div className="text-center mb-20">
                        <h3 className="text-4xl font-display font-bold text-white mb-6">Simple Workflow</h3>
                        <div className="w-20 h-1 bg-lucius-lime mx-auto rounded-full"></div>
                    </div>
                </ScrollReveal>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-24 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent z-0"></div>

                    <ScrollReveal delay={100}>
                        <WorkflowStep 
                            number="01" 
                            title="Check In" 
                            description="Employees clock in with a single tap from any device."
                            icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>}
                        />
                    </ScrollReveal>

                    <ScrollReveal delay={300}>
                        <WorkflowStep 
                            number="02" 
                            title="Track Activity" 
                            description="Log specific tasks, breaks, or custom statuses in real-time."
                            icon={<ActivityLogIcon className="w-8 h-8" />}
                        />
                    </ScrollReveal>

                    <ScrollReveal delay={500}>
                        <WorkflowStep 
                            number="03" 
                            title="Analyze" 
                            description="Admins get instant reports and timesheets for payroll."
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
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to optimize your team?</h2>
                        <p className="text-xl md:text-2xl opacity-80 mb-10 max-w-2xl mx-auto">
                            Join thousands of managers who save hours every week with TeamCheck.
                        </p>
                        <button 
                            onClick={() => openModal('register')}
                            className="bg-bokara-grey text-white text-xl font-bold py-4 px-12 rounded-full hover:bg-white hover:text-bokara-grey transition-all duration-300 shadow-2xl transform hover:scale-105"
                        >
                            Create Free Account
                        </button>
                        <p className="mt-4 text-sm opacity-60">No credit card required. Cancel anytime.</p>
                    </ScrollReveal>
                </div>
            </section>

          </main>

          {/* Footer */}
          <footer className="bg-black/40 py-12 px-4 border-t border-white/5">
            <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-left">
                    <h4 className="text-2xl font-bold text-white mb-2">Team<span className="text-lucius-lime">Check</span></h4>
                    <p className="text-white/50 text-sm">Empowering teams to work smarter, not harder.</p>
                </div>
                <div className="flex gap-8 text-sm text-white/60">
                    <a href="#" className="hover:text-lucius-lime transition-colors">Privacy Policy</a>
                    <a href="#" className="hover:text-lucius-lime transition-colors">Terms of Service</a>
                    <a href="#" className="hover:text-lucius-lime transition-colors">Contact Support</a>
                </div>
            </div>
            <div className="text-center mt-12 text-white/20 text-xs">
                &copy; {new Date().getFullYear()} TeamCheck Inc. All rights reserved.
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
                                Capturing Time,<br/>Creating Value
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

                        {/* Login View */}
                        {modalView === 'login' && (
                            <div className="w-full max-w-sm mx-auto animate-fade-in">
                                <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
                                <p className="text-white/60 mb-8">Please enter your details to sign in.</p>
                                
                                <form onSubmit={handleLoginSubmit}>
                                    <InputField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required />
                                    <InputField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                                    
                                    <div className="flex justify-between items-center mb-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" className="rounded bg-white/10 border-white/20 text-lucius-lime focus:ring-0" />
                                            <span className="text-sm text-white/60">Remember me</span>
                                        </label>
                                        <button type="button" onClick={() => setModalView('forgot')} className="text-sm text-lucius-lime hover:underline font-medium">Forgot password?</button>
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={isLoading}
                                        className="w-full bg-lucius-lime hover:bg-opacity-90 text-bokara-grey font-bold py-3 rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        {isLoading ? 'Signing in...' : 'Sign in'}
                                    </button>
                                </form>

                                <div className="mt-6 text-center">
                                    <span className="text-white/50 text-sm">Don't have an account? </span>
                                    <button onClick={() => openModal('register')} className="text-white font-semibold hover:underline text-sm">Sign up</button>
                                </div>
                            </div>
                        )}

                        {/* Register View */}
                        {modalView === 'register' && (
                            <div className="w-full max-w-sm mx-auto animate-fade-in">
                                <h2 className="text-3xl font-bold text-white mb-2">Create an account</h2>
                                <p className="text-white/60 mb-8">Join your team today.</p>
                                
                                <form onSubmit={handleRegisterSubmit}>
                                    <InputField label="Company Name" type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Inc." required />
                                    <InputField label="Full Name" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Doe" required />
                                    <InputField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required />
                                    <InputField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                                    <InputField label="Confirm Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
                                    
                                    <div className="mb-6">
                                        <label className="flex items-start gap-2 cursor-pointer">
                                            <input type="checkbox" required className="mt-1 rounded bg-white/10 border-white/20 text-lucius-lime focus:ring-0" />
                                            <span className="text-xs text-white/60">I agree to the <a href="#" className="underline hover:text-white">Terms & Conditions</a></span>
                                        </label>
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={isLoading}
                                        className="w-full bg-lucius-lime hover:bg-opacity-90 text-bokara-grey font-bold py-3 rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        {isLoading ? 'Creating account...' : 'Create account'}
                                    </button>
                                </form>

                                <div className="mt-6 text-center">
                                    <span className="text-white/50 text-sm">Already have an account? </span>
                                    <button onClick={() => openModal('login')} className="text-white font-semibold hover:underline text-sm">Log in</button>
                                </div>
                            </div>
                        )}

                        {/* Forgot Password View */}
                        {modalView === 'forgot' && (
                            <div className="w-full max-w-sm mx-auto animate-fade-in">
                                <h2 className="text-3xl font-bold text-white mb-2">Reset Password</h2>
                                <p className="text-white/60 mb-8">Enter your email to receive reset instructions.</p>
                                
                                <form onSubmit={handleForgotSubmit}>
                                    <InputField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required />
                                    
                                    <button 
                                        type="submit" 
                                        disabled={isLoading}
                                        className="w-full bg-lucius-lime hover:bg-opacity-90 text-bokara-grey font-bold py-3 rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-wait mb-4"
                                    >
                                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                                    </button>
                                    
                                    <button 
                                        type="button" 
                                        onClick={() => openModal('login')}
                                        className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-lg transition-all"
                                    >
                                        Back to Login
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
