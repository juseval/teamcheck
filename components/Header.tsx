
import React from 'react';
import ProfileDropdown from './ProfileDropdown';
import { Employee } from '../types';
import { MenuIcon } from './Icons';

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  user: Employee;
  userRole: 'admin' | 'employee';
  onLogout: () => void;
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate, user, userRole, onLogout, onMenuClick }) => {

  return (
    <header className="py-4 px-4 sm:px-8 bg-bright-white/80 backdrop-blur-md shadow-sm w-full flex justify-between items-center sticky top-0 z-20 border-b border-bokara-grey/10">
      
      <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button 
            onClick={onMenuClick} 
            className="md:hidden p-2 -ml-2 rounded-lg text-bokara-grey hover:bg-whisper-white transition-colors"
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>

          {/* Logo */}
          <button onClick={() => onNavigate('tracker')} className="cursor-pointer" aria-label="Go to homepage">
            <h1 className="text-2xl sm:text-3xl font-bold text-bokara-grey tracking-wider">
              Team<span className="text-lucius-lime">Check</span>
            </h1>
          </button>
      </div>
      
      {/* Right Side: Profile */}
      <div className="relative">
        <ProfileDropdown user={user} onNavigate={onNavigate} onLogout={onLogout} />
      </div>
    </header>
  );
};

export default Header;
