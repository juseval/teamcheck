import React from 'react';
import ProfileDropdown from './ProfileDropdown';
import { Employee } from '../types';

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  user: Employee;
  userRole: 'admin' | 'employee';
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate, user, userRole, onLogout }) => {

  return (
    <header className="py-4 px-4 sm:px-8 bg-bright-white/80 backdrop-blur-md shadow-sm w-full flex justify-between items-center sticky top-0 z-20 border-b border-bokara-grey/10">
      {/* Left Side: Logo */}
      <button onClick={() => onNavigate('tracker')} className="cursor-pointer" aria-label="Go to homepage">
        <h1 className="text-3xl font-bold text-bokara-grey tracking-wider">
          Team<span className="text-lucius-lime">Check</span>
        </h1>
      </button>
      
      {/* Center: Role Display */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-1 rounded-lg bg-whisper-white p-1 border border-bokara-grey/10 shadow-inner">
          <span className="px-3 py-1 text-sm font-semibold rounded-md bg-lucius-lime text-bokara-grey capitalize">
            {userRole} View
          </span>
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