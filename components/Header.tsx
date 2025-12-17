
import React, { useState, useRef, useEffect } from 'react';
import ProfileDropdown from './ProfileDropdown';
import { Employee, AttendanceLogEntry } from '../types';
import { MenuIcon, BellIcon, AlertIcon } from './Icons';

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  user: Employee;
  userRole: 'admin' | 'employee';
  onLogout: () => void;
  onMenuClick?: () => void;
  notifications?: AttendanceLogEntry[];
  onNotificationClick?: (entry: AttendanceLogEntry) => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate, user, userRole, onLogout, onMenuClick, notifications = [], onNotificationClick }) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNotificationClick = (entry: AttendanceLogEntry) => {
      if (onNotificationClick) {
          onNotificationClick(entry);
          setIsNotificationsOpen(false);
      }
  };

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
      
      {/* Right Side: Notifications & Profile */}
      <div className="flex items-center gap-4">
        
        {/* Admin Notifications */}
        {userRole === 'admin' && (
            <div className="relative" ref={notificationRef}>
                <button 
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className="p-2 text-bokara-grey hover:bg-whisper-white rounded-full transition-colors relative"
                    aria-label="Notifications"
                >
                    <BellIcon className="w-6 h-6" />
                    {notifications.length > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                    )}
                </button>

                {isNotificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-bokara-grey/10 overflow-hidden z-30 animate-fade-in origin-top-right">
                        <div className="p-3 border-b border-bokara-grey/10 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-sm text-bokara-grey">Solicitudes Pendientes</h3>
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{notifications.length}</span>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-6 text-center text-bokara-grey/50 text-sm">
                                    No hay notificaciones nuevas.
                                </div>
                            ) : (
                                <ul>
                                    {notifications.map(entry => (
                                        <li key={entry.id} className="border-b border-bokara-grey/5 last:border-0">
                                            <button 
                                                onClick={() => handleNotificationClick(entry)}
                                                className="w-full text-left p-3 hover:bg-whisper-white/50 transition-colors flex items-start gap-3 group"
                                            >
                                                <div className="mt-1 p-1.5 bg-yellow-100 text-yellow-600 rounded-full flex-shrink-0 group-hover:bg-yellow-200">
                                                    <AlertIcon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-bokara-grey">{entry.employeeName}</p>
                                                    <p className="text-xs text-bokara-grey/70 line-clamp-1 italic">"{entry.correctionRequest}"</p>
                                                    <p className="text-[10px] text-bokara-grey/40 mt-1">{new Date(entry.timestamp).toLocaleDateString()} - {new Date(entry.timestamp).toLocaleTimeString()}</p>
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}

        <div className="relative">
            <ProfileDropdown user={user} onNavigate={onNavigate} onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
};

export default Header;
