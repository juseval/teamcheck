import React, { useState, useRef, useEffect } from 'react';
import ProfileDropdown from './ProfileDropdown';
import { Employee } from '../types';
import { MenuIcon, BellIcon, AlertIcon } from './Icons';

// ── Tipo genérico para la campana ──
export interface BellNotification {
  id: string;
  type: 'ticket_pending' | 'correction_request';
  title: string;      // nombre del empleado
  subtitle: string;   // descripción corta
  timestamp: number;
  navigateTo: string; // página a la que navegar al hacer click
}

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  user: Employee;
  userRole: 'master' | 'admin' | 'employee';
  onLogout: () => void;
  onMenuClick?: () => void;
  notifications?: BellNotification[];
  onNotificationClick?: (notif: BellNotification) => void;
}

const Header: React.FC<HeaderProps> = ({
  currentPage, onNavigate, user, userRole, onLogout, onMenuClick,
  notifications = [], onNotificationClick,
}) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClick = (notif: BellNotification) => {
    if (onNotificationClick) onNotificationClick(notif);
    setIsNotificationsOpen(false);
  };

  // Iconos y colores según tipo
  const typeStyle = (type: BellNotification['type']) =>
    type === 'ticket_pending'
      ? 'bg-orange-100 text-orange-600 group-hover:bg-orange-200'
      : 'bg-yellow-100 text-yellow-600 group-hover:bg-yellow-200';

  const typeLabel = (type: BellNotification['type']) =>
    type === 'ticket_pending' ? 'Tiquete' : 'Corrección';

  const typeLabelColor = (type: BellNotification['type']) =>
    type === 'ticket_pending'
      ? 'bg-orange-50 text-orange-600'
      : 'bg-yellow-50 text-yellow-700';

  return (
    <header className="py-4 px-4 sm:px-8 bg-bright-white/80 backdrop-blur-md shadow-sm w-full flex justify-between items-center sticky top-0 z-20 border-b border-bokara-grey/10">

      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 rounded-lg text-bokara-grey hover:bg-whisper-white transition-colors"
          aria-label="Open menu"
        >
          <MenuIcon />
        </button>
        <button onClick={() => onNavigate('tracker')} className="cursor-pointer" aria-label="Go to homepage">
          <h1 className="text-2xl sm:text-3xl font-bold text-bokara-grey tracking-wider">
            Team<span className="text-lucius-lime">Check</span>
          </h1>
        </button>
      </div>

      <div className="flex items-center gap-4">

        {/* Campana — solo admins y masters */}
        {userRole !== 'employee' && (
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 text-bokara-grey hover:bg-whisper-white rounded-full transition-colors relative"
              aria-label="Notificaciones"
            >
              <BellIcon className="w-6 h-6" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-bokara-grey/10 overflow-hidden z-30 animate-fade-in origin-top-right">
                <div className="p-3 border-b border-bokara-grey/10 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-sm text-bokara-grey">Pendientes</h3>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                    {notifications.length}
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-bokara-grey/50 text-sm">
                      No hay notificaciones nuevas.
                    </div>
                  ) : (
                    <ul>
                      {notifications.map(notif => (
                        <li key={notif.id} className="border-b border-bokara-grey/5 last:border-0">
                          <button
                            onClick={() => handleClick(notif)}
                            className="w-full text-left p-3 hover:bg-whisper-white/50 transition-colors flex items-start gap-3 group"
                          >
                            <div className={`mt-1 p-1.5 rounded-full flex-shrink-0 transition-colors ${typeStyle(notif.type)}`}>
                              <AlertIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-sm font-bold text-bokara-grey truncate">{notif.title}</p>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${typeLabelColor(notif.type)}`}>
                                  {typeLabel(notif.type)}
                                </span>
                              </div>
                              <p className="text-xs text-bokara-grey/70 line-clamp-2">{notif.subtitle}</p>
                              <p className="text-[10px] text-bokara-grey/40 mt-1">
                                {new Date(notif.timestamp).toLocaleDateString('es-ES')} ·{' '}
                                {new Date(notif.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="p-2 bg-gray-50 border-t border-bokara-grey/5 grid grid-cols-2 gap-1 text-[11px]">
                    <div className="flex items-center gap-1 text-bokara-grey/50 justify-center">
                      <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                      {notifications.filter(n => n.type === 'ticket_pending').length} tiquetes
                    </div>
                    <div className="flex items-center gap-1 text-bokara-grey/50 justify-center">
                      <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                      {notifications.filter(n => n.type === 'correction_request').length} correcciones
                    </div>
                  </div>
                )}
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