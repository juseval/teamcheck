import React from 'react';
import { ClockIcon, DashboardIcon, TeamIcon, CalendarIcon, SettingsIcon, TimesheetIcon, TicketIcon, MapIcon } from './Icons';

interface NavItemProps {
  label: string;
  pageName: string;
  currentPage: string;
  onNavigate: (page: string) => void;
  onClick?: () => void;
  children: React.ReactNode;
}

const NavItem: React.FC<NavItemProps> = ({ label, pageName, currentPage, onNavigate, onClick, children }) => {
  const isActive = currentPage === pageName;
  return (
    <button
      onClick={() => { onNavigate(pageName); if (onClick) onClick(); }}
      className={`w-full flex flex-col items-center justify-center gap-1 p-2 rounded-lg group transition-colors duration-200 ${
        isActive ? 'bg-[#91A673] text-[#2A2725]' : 'text-[#2A2725]/60 hover:bg-white hover:text-[#2A2725]'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
      <span className="text-[10px] font-medium text-center leading-tight">{label}</span>
    </button>
  );
};

// ── Iconos inline para nuevas páginas ────────────────────────────────────────
const ProductivityIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ScreencastIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
  </svg>
);

interface SideNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  userRole: 'master' | 'admin' | 'employee';
  isOpen?: boolean;
  onClose?: () => void;
}

const SideNav: React.FC<SideNavProps> = ({ currentPage, onNavigate, userRole, isOpen, onClose }) => {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity" onClick={onClose} />
      )}
      <aside className={`
        bg-whisper-white/95 flex-shrink-0 flex flex-col items-center gap-2 p-2 border-r border-bokara-grey/10
        h-full overflow-y-auto transition-transform duration-300 z-30
        fixed top-0 left-0 bottom-0 w-24 md:w-24 md:static
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="md:hidden w-full py-4 mb-2 flex justify-center border-b border-bokara-grey/10">
          <h1 className="text-xl font-bold text-bokara-grey tracking-wider">
            T<span className="text-lucius-lime">C</span>
          </h1>
        </div>

        <nav className="w-full flex flex-col gap-2 mt-2">
          <NavItem label="Tracker" pageName="tracker" currentPage={currentPage} onNavigate={onNavigate} onClick={onClose}>
            <ClockIcon />
          </NavItem>

          {userRole !== 'employee' && (
            <>
              <div className="w-full border-t border-bokara-grey/10 my-1" />

              <NavItem label="Dashboard" pageName="dashboard" currentPage={currentPage} onNavigate={onNavigate} onClick={onClose}>
                <DashboardIcon />
              </NavItem>

              <NavItem label="Timesheet" pageName="timesheet" currentPage={currentPage} onNavigate={onNavigate} onClick={onClose}>
                <TimesheetIcon />
              </NavItem>

              <NavItem label="Employees" pageName="employees" currentPage={currentPage} onNavigate={onNavigate} onClick={onClose}>
                <TeamIcon />
              </NavItem>

              <NavItem label="Schedule" pageName="schedule" currentPage={currentPage} onNavigate={onNavigate} onClick={onClose}>
                <CalendarIcon />
              </NavItem>

              <NavItem label="Productivity" pageName="productivity" currentPage={currentPage} onNavigate={onNavigate} onClick={onClose}>
                <ProductivityIcon />
              </NavItem>

              <NavItem label="Screencasts" pageName="screencasts" currentPage={currentPage} onNavigate={onNavigate} onClick={onClose}>
                <ScreencastIcon />
              </NavItem>

              <div className="w-full border-t border-bokara-grey/10 my-1" />
            </>
          )}

          {userRole !== 'employee' && (
            <NavItem label="Map" pageName="seating" currentPage={currentPage} onNavigate={onNavigate} onClick={onClose}>
              <MapIcon />
            </NavItem>
          )}

          <NavItem label="Ticketing" pageName="ticketing" currentPage={currentPage} onNavigate={onNavigate} onClick={onClose}>
            <TicketIcon />
          </NavItem>

          {userRole !== 'employee' && (
            <NavItem label="Settings" pageName="settings" currentPage={currentPage} onNavigate={onNavigate} onClick={onClose}>
              <SettingsIcon />
            </NavItem>
          )}
        </nav>
      </aside>
    </>
  );
};

export default SideNav;