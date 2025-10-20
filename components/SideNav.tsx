import React from 'react';
import { ClockIcon, DashboardIcon, TeamIcon, CalendarIcon, SettingsIcon, TimesheetIcon, ActivityLogIcon } from './Icons.tsx';

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
        <span className="text-xs font-medium">
          {label}
        </span>
      </button>
    );
};

interface SideNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const SideNav: React.FC<SideNavProps> = ({ currentPage, onNavigate }) => {
  return (
    <aside className="w-24 bg-whisper-white/50 flex-shrink-0 flex flex-col items-center gap-2 p-2 border-r border-bokara-grey/10 min-h-screen sticky top-0">
      <nav className="w-full flex flex-col gap-2 mt-20">
        <NavItem label="Tracker" pageName="tracker" currentPage={currentPage} onNavigate={onNavigate}>
            <ClockIcon />
        </NavItem>
        <NavItem label="Dashboard" pageName="dashboard" currentPage={currentPage} onNavigate={onNavigate}>
            <DashboardIcon />
        </NavItem>
         <NavItem label="Timesheet" pageName="timesheet" currentPage={currentPage} onNavigate={onNavigate}>
            <TimesheetIcon />
        </NavItem>
        <NavItem label="Activity Log" pageName="activitylog" currentPage={currentPage} onNavigate={onNavigate}>
            <ActivityLogIcon />
        </NavItem>
        <NavItem label="Employees" pageName="employees" currentPage={currentPage} onNavigate={onNavigate}>
            <TeamIcon />
        </NavItem>
        <NavItem label="Schedule" pageName="schedule" currentPage={currentPage} onNavigate={onNavigate}>
            <CalendarIcon />
        </NavItem>
        <NavItem label="Settings" pageName="settings" currentPage={currentPage} onNavigate={onNavigate}>
            <SettingsIcon />
        </NavItem>
      </nav>
    </aside>
  );
};

export default SideNav;