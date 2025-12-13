
import React from 'react';
import { ClockIcon, DashboardIcon, TeamIcon, CalendarIcon, SettingsIcon, TimesheetIcon, TicketIcon } from './Icons';

interface NavItemProps {
  label: string;
  pageName: string;
  currentPage: string;
  onNavigate: (page: string) => void;
  children: React.ReactNode;
}

const NavItem: React.FC<NavItemProps> = ({ label, pageName, currentPage, onNavigate, children }) => {
    const isActive = currentPage === pageName;
    return (
      <button
        onClick={() => onNavigate(pageName)}
        className={`w-full flex flex-col items-center justify-center gap-1 p-2 rounded-lg group transition-colors duration-200 ${
          isActive
            ? 'bg-[#91A673] text-[#2A2725]'
            : 'text-[#2A2725]/60 hover:bg-white hover:text-[#2A2725]'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        {children}
        <span className="text-[10px] font-medium text-center leading-tight">
          {label}
        </span>
      </button>
    );
};

interface SideNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  userRole: 'admin' | 'employee';
}

const SideNav: React.FC<SideNavProps> = ({ currentPage, onNavigate, userRole }) => {
  return (
    <aside className="w-24 bg-whisper-white/50 flex-shrink-0 flex flex-col items-center gap-2 p-2 border-r border-bokara-grey/10 h-full overflow-y-auto transition-colors duration-300">
      <nav className="w-full flex flex-col gap-2 mt-2">
        <NavItem label="Tracker" pageName="tracker" currentPage={currentPage} onNavigate={onNavigate}>
            <ClockIcon />
        </NavItem>
        
        {userRole === 'admin' && (
          <>
            <div className="w-full border-t border-bokara-grey/10 my-1"></div>

            <NavItem label="Dashboard" pageName="dashboard" currentPage={currentPage} onNavigate={onNavigate}>
                <DashboardIcon />
            </NavItem>
            
            <NavItem label="Timesheet" pageName="timesheet" currentPage={currentPage} onNavigate={onNavigate}>
                <TimesheetIcon />
            </NavItem>
            
            <NavItem label="Employees" pageName="employees" currentPage={currentPage} onNavigate={onNavigate}>
                <TeamIcon />
            </NavItem>
            
            <NavItem label="Schedule" pageName="schedule" currentPage={currentPage} onNavigate={onNavigate}>
                <CalendarIcon />
            </NavItem>
            
            <div className="w-full border-t border-bokara-grey/10 my-1"></div>
          </>
        )}

        <NavItem label="Tickets" pageName="ticketing" currentPage={currentPage} onNavigate={onNavigate}>
            <TicketIcon />
        </NavItem>

        {userRole === 'admin' && (
            <NavItem label="Settings" pageName="settings" currentPage={currentPage} onNavigate={onNavigate}>
                <SettingsIcon />
            </NavItem>
        )}
      </nav>
    </aside>
  );
};

export default SideNav;
