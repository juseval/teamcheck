import React, { useState, useRef, useEffect } from 'react';
import ProfileDropdown from './ProfileDropdown';
import { Employee, AttendanceAction, Company } from '../types';
import { MenuIcon, BellIcon, AlertIcon } from './Icons';
import { isElectron } from '../hooks/useElectron';

// ── URL del instalador — cámbiala cuando tengas el .exe subido ───────────────
const ELECTRON_DOWNLOAD_URL = 'https://drive.google.com/uc?export=download&id=1vObqzFHMc4P5REX71YtULoBa2GWiEbWW';

export interface BellNotification {
  id: string;
  type: 'ticket_pending' | 'correction_request';
  title: string;
  subtitle: string;
  timestamp: number;
  navigateTo: string;
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
  onQuickAction?: (employeeId: string, action: AttendanceAction) => void;
  userCompanies?: Company[];
  activeCompany?: Company | null;
  onSwitchCompany?: (companyId: string) => Promise<void>;
  onCreateNewCompany?: () => void;
}

const PlayIcon        = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>;
const StopIcon        = () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12"/></svg>;
const PauseIcon       = () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>;
const ChevronDownIcon = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>;
const PlusIcon        = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>;
const CheckIcon       = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>;
const BuildingIcon    = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>;
const DownloadIcon    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>;
const DesktopIcon     = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>;

// ── Botón de descarga de la app de escritorio ─────────────────────────────────
const ElectronDownloadButton: React.FC = () => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node))
        setShowTooltip(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Ya instalado → mostrar badge verde
  if (isElectron) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-lucius-lime/15 border border-lucius-lime/30 text-bokara-grey text-xs font-bold">
        <span className="w-2 h-2 rounded-full bg-lucius-lime animate-pulse" />
        Desktop
      </div>
    );
  }

  // No instalado → botón de descarga
  return (
    <div className="relative hidden sm:block" ref={tooltipRef}>
      <button
        onClick={() => setShowTooltip(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-bokara-grey/8 border border-bokara-grey/15 hover:border-bokara-grey/30 hover:bg-bokara-grey/12 transition-all text-bokara-grey/70 hover:text-bokara-grey text-xs font-bold"
        title="Instalar TeamCheck Desktop"
      >
        <DesktopIcon />
        <span>Desktop</span>
      </button>

      {showTooltip && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-bokara-grey/10 overflow-hidden z-30 animate-fade-in origin-top-right">
          {/* Header del tooltip */}
          <div className="bg-bokara-grey px-4 py-3">
            <p className="text-white font-bold text-sm flex items-center gap-2">
              <DesktopIcon />
              TeamCheck Desktop
            </p>
            <p className="text-white/50 text-xs mt-0.5">App de escritorio para Windows</p>
          </div>

          {/* Beneficios */}
          <div className="p-4 space-y-2.5">
            {[
              { icon: '📷', text: 'Capturas automáticas de pantalla cada 3 min' },
              { icon: '💤', text: 'Detección de inactividad del sistema' },
              { icon: '🔌', text: 'Clock Out automático al cerrar/hibernar la PC' },
              { icon: '☁️', text: 'Sincronización en tiempo real con la nube' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-base leading-none mt-0.5">{item.icon}</span>
                <p className="text-xs text-bokara-grey/70 leading-snug">{item.text}</p>
              </div>
            ))}
          </div>

          {/* Botón de descarga */}
          <div className="px-4 pb-4">
            {ELECTRON_DOWNLOAD_URL ? (
              <a
                href={ELECTRON_DOWNLOAD_URL}
                download
                onClick={() => setShowTooltip(false)}
                className="flex items-center justify-center gap-2 w-full bg-lucius-lime hover:brightness-105 text-bokara-grey font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow"
              >
                <DownloadIcon />
                Descargar instalador (.exe)
              </a>
            ) : (
              <div className="text-center text-xs text-bokara-grey/40 italic py-1">
                Instalador no disponible aún
              </div>
            )}
          </div>

          {/* Requisitos */}
          <div className="border-t border-gray-100 px-4 py-2 flex gap-3 text-[10px] text-gray-400">
            <span>🪟 Windows 10/11</span>
            <span>📁 ~120 MB</span>
            <span>🔒 Admin requerido</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────
const Header: React.FC<HeaderProps> = ({
  onNavigate, user, userRole, onLogout, onMenuClick,
  notifications = [], onNotificationClick, onQuickAction,
  userCompanies = [], activeCompany, onSwitchCompany, onCreateNewCompany,
}) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isQuickMenuOpen,      setIsQuickMenuOpen]     = useState(false);
  const [isCompanyMenuOpen,    setIsCompanyMenuOpen]   = useState(false);
  const [isSwitching,          setIsSwitching]         = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const quickMenuRef    = useRef<HTMLDivElement>(null);
  const companyMenuRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node))
        setIsNotificationsOpen(false);
      if (quickMenuRef.current && !quickMenuRef.current.contains(e.target as Node))
        setIsQuickMenuOpen(false);
      if (companyMenuRef.current && !companyMenuRef.current.contains(e.target as Node))
        setIsCompanyMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBellClick = (notif: BellNotification) => {
    if (onNotificationClick) onNotificationClick(notif);
    setIsNotificationsOpen(false);
  };

  const handleSwitchCompany = async (companyId: string) => {
    if (!onSwitchCompany || companyId === activeCompany?.id) {
      setIsCompanyMenuOpen(false);
      return;
    }
    setIsSwitching(true);
    setIsCompanyMenuOpen(false);
    try { await onSwitchCompany(companyId); }
    finally { setIsSwitching(false); }
  };

  const typeStyle = (type: BellNotification['type']) =>
    type === 'ticket_pending' ? 'bg-orange-100 text-orange-600 group-hover:bg-orange-200' : 'bg-yellow-100 text-yellow-600 group-hover:bg-yellow-200';
  const typeLabel = (type: BellNotification['type']) =>
    type === 'ticket_pending' ? 'Tiquete' : 'Corrección';
  const typeLabelColor = (type: BellNotification['type']) =>
    type === 'ticket_pending' ? 'bg-orange-50 text-orange-600' : 'bg-yellow-50 text-yellow-700';

  const status = user.status ?? 'Clocked Out';

  const quickBtn = (() => {
    if (status === 'Clocked Out') return {
      label: 'Clock In',
      icon: <PlayIcon />,
      color: 'bg-lucius-lime text-bokara-grey hover:bg-lucius-lime/80',
      onClick: () => onQuickAction?.(user.id, 'Clock In'),
      hasMenu: false,
    };
    if (status === 'Working') return {
      label: 'Working',
      icon: <StopIcon />,
      color: 'bg-green-500 text-white hover:bg-green-600',
      onClick: () => setIsQuickMenuOpen(v => !v),
      hasMenu: true,
    };
    return {
      label: status,
      icon: <PauseIcon />,
      color: 'bg-wet-sand text-bokara-grey hover:bg-wet-sand/80',
      onClick: () => setIsQuickMenuOpen(v => !v),
      hasMenu: true,
    };
  })();

  const showCompanySwitcher = userRole === 'master' && userCompanies.length > 0;

  return (
    <header className="py-4 px-4 sm:px-8 bg-bright-white/80 backdrop-blur-md shadow-sm w-full flex justify-between items-center sticky top-0 z-20 border-b border-bokara-grey/10">

      {/* ── LEFT ── */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="md:hidden p-2 -ml-2 rounded-lg text-bokara-grey hover:bg-whisper-white transition-colors" aria-label="Open menu">
          <MenuIcon />
        </button>
        <button onClick={() => onNavigate('tracker')} className="cursor-pointer" aria-label="Go to homepage">
          <h1 className="text-2xl sm:text-3xl font-bold text-bokara-grey tracking-wider">
            Team<span className="text-lucius-lime">Check</span>
          </h1>
        </button>

        {/* SELECTOR DE EMPRESA */}
        {showCompanySwitcher && (
          <div className="relative hidden sm:block" ref={companyMenuRef}>
            <button
              onClick={() => setIsCompanyMenuOpen(v => !v)}
              disabled={isSwitching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-whisper-white border border-bokara-grey/10 hover:border-lucius-lime/40 transition-all text-sm font-semibold text-bokara-grey max-w-[180px] disabled:opacity-50"
              title="Cambiar empresa"
            >
              <BuildingIcon />
              <span className="truncate">{isSwitching ? 'Cambiando...' : (activeCompany?.name ?? 'Empresa')}</span>
              <ChevronDownIcon />
            </button>

            {isCompanyMenuOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-bokara-grey/10 overflow-hidden z-30 animate-fade-in origin-top-left">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-bokara-grey/5">
                  <p className="text-[10px] font-bold text-bokara-grey/50 uppercase tracking-widest">Mis Empresas</p>
                </div>
                <ul className="py-1 max-h-60 overflow-y-auto">
                  {userCompanies.map(company => (
                    <li key={company.id}>
                      <button
                        onClick={() => handleSwitchCompany(company.id)}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors text-sm ${
                          company.id === activeCompany?.id
                            ? 'bg-lucius-lime/10 text-bokara-grey font-bold'
                            : 'hover:bg-whisper-white text-bokara-grey/80 font-medium'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-[10px] font-black ${
                          company.id === activeCompany?.id ? 'bg-lucius-lime text-bokara-grey' : 'bg-bokara-grey/10 text-bokara-grey/60'
                        }`}>
                          {company.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate flex-1">{company.name}</span>
                        {company.id === activeCompany?.id && <span className="text-lucius-lime flex-shrink-0"><CheckIcon /></span>}
                      </button>
                    </li>
                  ))}
                </ul>
                {onCreateNewCompany && (
                  <>
                    <div className="border-t border-bokara-grey/5" />
                    <button
                      onClick={() => { setIsCompanyMenuOpen(false); onCreateNewCompany(); }}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-whisper-white transition-colors text-sm font-bold text-lucius-lime"
                    >
                      <div className="w-6 h-6 rounded-md bg-lucius-lime/10 flex items-center justify-center flex-shrink-0"><PlusIcon /></div>
                      Crear nueva empresa
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT ── */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* BOTÓN DESKTOP (solo empleados — para que descarguen la app) */}
        {!isElectron && <ElectronDownloadButton />}

        {/* BOTÓN MARCACIÓN RÁPIDA */}
        {onQuickAction && (
          <div className="relative" ref={quickMenuRef}>
            <button
              onClick={quickBtn.onClick}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-sm transition-all shadow-sm ${quickBtn.color}`}
              title={`Estado actual: ${status}`}
            >
              {quickBtn.icon}
              <span className="hidden sm:inline max-w-[100px] truncate">{quickBtn.label}</span>
            </button>

            {isQuickMenuOpen && quickBtn.hasMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl border border-bokara-grey/10 overflow-hidden z-30 animate-fade-in origin-top-right">
                <div className="px-4 py-2 bg-gray-50 border-b border-bokara-grey/5">
                  <p className="text-[10px] font-bold text-bokara-grey/50 uppercase tracking-widest">Acción rápida</p>
                </div>
                {status === 'Working' && (
                  <button
                    onClick={() => { onQuickAction(user.id, 'Start Break'); setIsQuickMenuOpen(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-whisper-white transition-colors flex items-center gap-3 text-sm font-medium text-bokara-grey"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-wet-sand flex-shrink-0" />
                    Iniciar Break
                  </button>
                )}
                {status !== 'Working' && status !== 'Clocked Out' && (
                  <button
                    onClick={() => { onQuickAction(user.id, `End ${status}` as AttendanceAction); setIsQuickMenuOpen(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-whisper-white transition-colors flex items-center gap-3 text-sm font-medium text-bokara-grey"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-lucius-lime flex-shrink-0" />
                    Terminar {status}
                  </button>
                )}
                <div className="border-t border-bokara-grey/5" />
                <button
                  onClick={() => { onQuickAction(user.id, 'Clock Out'); setIsQuickMenuOpen(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-red-50 transition-colors flex items-center gap-3 text-sm font-bold text-red-600"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                  Clock Out
                </button>
              </div>
            )}
          </div>
        )}

        {/* CAMPANA */}
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
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{notifications.length}</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-bokara-grey/50 text-sm">No hay notificaciones nuevas.</div>
                  ) : (
                    <ul>
                      {notifications.map(notif => (
                        <li key={notif.id} className="border-b border-bokara-grey/5 last:border-0">
                          <button onClick={() => handleBellClick(notif)} className="w-full text-left p-3 hover:bg-whisper-white/50 transition-colors flex items-start gap-3 group">
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
          <ProfileDropdown
            user={user}
            onNavigate={onNavigate}
            onLogout={onLogout}
            userCompanies={userCompanies}
            activeCompany={activeCompany}
            onSwitchCompany={user.role === 'master' ? onSwitchCompany : undefined}
            onCreateNewCompany={user.role === 'master' ? onCreateNewCompany : undefined}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;