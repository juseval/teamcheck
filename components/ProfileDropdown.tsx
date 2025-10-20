import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types.ts';
import { UserIcon, CalendarIcon, MessageIcon, PasswordIcon, ClockIcon, LogoutIcon } from './Icons.tsx';

interface ProfileDropdownProps {
  user: User;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

const getInitials = (name: string) => {
  const names = name.trim().split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ user, onNavigate, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = getInitials(user.name);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleNavigation = (page: string) => {
    onNavigate(page);
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 text-left p-1 rounded-full transition-colors hover:bg-whisper-white"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="hidden sm:inline text-bokara-grey font-medium text-sm">{user.name}</span>
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 bg-lucius-lime/20 rounded-full flex items-center justify-center border-2 border-lucius-lime">
            <span className="text-md font-bold text-bokara-grey select-none">{initials}</span>
          </div>
          {user.messages > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white ring-2 ring-bright-white">
              {user.messages}
            </span>
          )}
           <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-bright-white bg-lucius-lime" title="Online"></span>
        </div>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 origin-top-right rounded-md bg-bright-white shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-30"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu-button"
        >
          <div className="py-1" role="none">
            <button onClick={() => handleNavigation('profile')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-bokara-grey hover:bg-whisper-white" role="menuitem">
              <UserIcon /> My Profile
            </button>
            <button onClick={() => handleNavigation('calendar')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-bokara-grey hover:bg-whisper-white" role="menuitem">
              <CalendarIcon /> My Calendar
            </button>
            <button onClick={() => handleNavigation('messages')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-bokara-grey hover:bg-whisper-white" role="menuitem">
              <MessageIcon /> Messages ({user.messages})
            </button>
            <button onClick={() => handleNavigation('password')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-bokara-grey hover:bg-whisper-white" role="menuitem">
              <PasswordIcon /> Change Password
            </button>
          </div>
          <div className="border-t border-gray-200" />
          <div className="py-1" role="none">
            <button onClick={onLogout} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-bokara-grey hover:bg-whisper-white" role="menuitem">
              <LogoutIcon /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;