import React from 'react';
import { ClockIcon, DashboardIcon } from '../components/Icons';

interface HomePageProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
}

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
    <div className="group relative bg-white/5 backdrop-blur-lg border border-white/10 p-8 rounded-2xl text-center transition-transform duration-300 hover:-translate-y-2">
        <div className="mx-auto bg-lucius-lime/10 text-lucius-lime w-20 h-20 rounded-full flex items-center justify-center mb-6 border-2 border-lucius-lime/20">
            <div className="transition-transform duration-300 group-hover:scale-110">
                {icon}
            </div>
        </div>
        <h3 className="text-2xl font-bold text-bright-white mb-3">{title}</h3>
        <p className="text-bright-white/70 leading-relaxed">{description}</p>
    </div>
);


const HomePage: React.FC<HomePageProps> = ({ onNavigateToLogin, onNavigateToRegister }) => {
  return (
    <div className="min-h-screen text-bright-white font-sans relative overflow-hidden">
        {/* Background Image and Overlay */}
        <div className="absolute inset-0 z-0">
            <img 
                src="https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=2835&auto=format&fit=crop" 
                alt="Modern office background" 
                className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-bokara-grey/80"></div>
        </div>

        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Header */}
          <header className="py-5 px-4 sm:px-10 w-full flex justify-between items-center">
            <h1 className="text-4xl font-bold text-bright-white tracking-wider">
              Team<span className="text-lucius-lime">Check</span>
            </h1>
            <div className="flex items-center gap-4">
                <button onClick={onNavigateToLogin} className="text-bright-white font-semibold hover:text-lucius-lime transition-colors text-lg">
                    Sign In
                </button>
                <button onClick={onNavigateToRegister} className="bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-6 rounded-lg transition-all duration-300 shadow-lg text-lg">
                    Get Started
                </button>
            </div>
          </header>

          {/* Hero Section */}
          <main className="flex-grow flex flex-col justify-center">
            <section className="text-center py-20 px-4">
                <h2 className="text-5xl sm:text-7xl font-extrabold text-bright-white leading-tight drop-shadow-md">
                    Manage Your Team's Time <br /> <span className="text-lucius-lime">Effortlessly</span>.
                </h2>
                <p className="max-w-3xl mx-auto mt-6 text-xl text-bright-white/80">
                    TeamCheck is the ultimate solution for tracking employee attendance, managing activities, and gaining valuable insights with AI-powered summaries.
                </p>
                <div className="mt-12">
                    <button onClick={onNavigateToRegister} className="bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-4 px-10 rounded-lg transition-all duration-300 shadow-2xl text-xl transform hover:scale-105">
                        Get Started Free
                    </button>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <FeatureCard
                            icon={<ClockIcon className="w-10 h-10 text-bright-white"/>}
                            title="Real-Time Tracking"
                            description="Monitor clock-ins, outs, breaks, and custom activities as they happen with an intuitive interface."
                        />
                         <FeatureCard
                            icon={<DashboardIcon className="w-10 h-10 text-bright-white"/>}
                            title="Insightful Dashboard"
                            description="Get a comprehensive overview of your team's status, total work hours, and activity distribution at a glance."
                        />
                         <FeatureCard
                            icon={
                                <svg className="w-10 h-10 text-bright-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                            }
                            title="AI-Powered Summaries"
                            description="Leverage the power of Gemini to generate smart summaries of work logs, highlighting key metrics and insights."
                        />
                    </div>
                </div>
            </section>
          </main>

          {/* Footer */}
          <footer className="text-center py-8 px-4">
            <p className="text-bright-white/60">&copy; {new Date().getFullYear()} TeamCheck. All rights reserved.</p>
          </footer>
        </div>
    </div>
  );
};

export default HomePage;