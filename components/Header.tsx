import React from 'react';
import ProfileDropdown from './ProfileDropdown.tsx';
import { User } from '../types.ts';

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  user: User;
  userRole: 'admin' | 'employee';
  onToggleRole: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate, user, userRole, onToggleRole, onLogout }) => {

  return (
    <header className="py-4 px-4 sm:px-8 bg-bright-white/80 backdrop-blur-md shadow-sm w-full flex justify-between items-center sticky top-0 z-20 border-b border-bokara-grey/10">
      {/* Left Side: Logo */}
      <button onClick={() => onNavigate('tracker')} className="cursor-pointer" aria-label="Go to homepage">
        <h1 className="text-3xl font-bold text-bokara-grey tracking-wider">
          Team<span className="text-lucius-lime">Check</span>
        </h1>
      </button>
      
      {/* Center: Role Switcher (for demo) */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-1 rounded-lg bg-whisper-white p-1 border border-bokara-grey/10 shadow-inner">
          <span className="text-sm font-semibold text-bokara-grey/70 hidden sm:inline px-2">View as:</span>
           <button 
            onClick={() => userRole !== 'admin' && onToggleRole()}
            className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${userRole === 'admin' ? 'bg-lucius-lime text-bokara-grey' : 'text-bokara-grey/70 hover:bg-white'}`}
          >
            Admin
          </button>
          <button 
            onClick={() => userRole !== 'employee' && onToggleRole()}
            className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${userRole === 'employee' ? 'bg-lucius-lime text-bokara-grey' : 'text-bokara-grey/70 hover:bg-white'}`}
          >
            Employee
          </button>
        </div>
      </div>


      {/* Right Side: Profile */}
      <div className="relative">
        <ProfileDropdown user={user} onNavigate={onNavigate} onLogout={onLogout} />
      </div>
    </header>
  );
};

export default Header;