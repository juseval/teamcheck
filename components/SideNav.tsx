
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
        onClick={() => {
            onNavigate(pageName);
            if (onClick) onClick();
        }}
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
  isOpen?: boolean;
  onClose?: () => void;
}

const SideNav: React.FC<SideNavProps> = ({ currentPage, onNavigate, userRole, isOpen, onClose }) => {
  return (
    <>
        {/* Mobile Backdrop */}
        {isOpen && (
            <div 
                className="fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity" 
                onClick={onClose}
            ></div>
        )}

        {/* Sidebar */}
        <aside 
            className={`
                bg-whisper-white/95 flex-shrink-0 flex flex-col items-center gap-2 p-2 border-r border-bokara-grey/10 
                h-full overflow-y-auto transition-transform duration-300 z-30
                fixed top-0 left-0 bottom-0 w-24 md:w-24 md:static
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}
        >
            {/* Mobile Header in Sidebar (optional, keeps consistent look) */}
            <div className="md:hidden w-full py-4 mb-2 flex justify-center border-b border-bokara-grey/10">
                 <h1 className="text-xl font-bold text-bokara-grey tracking-wider">
                    T<span className="text-lucius-lime">C</span>
                </h1>
            </div>

            <nav className="w-full flex flex-col gap-2 mt-2">
                <NavItem label="Tracker" pageName="tracker" currentPage={currentPage} onNavigate={onNavigate} onClick={onClose}>
                    <ClockIcon />
                </NavItem>
                
                {userRole === 'admin' && (
                <>
                    <div className="w-full border-t border-bokara-grey/10 my-1"></div>

                    <NavItem label="Dashboard" pageName="dashboard" currentPage={currentPage} onNavigate={onNavigate} onClick={onClose}>
                        <DashboardIcon />
                    </NavItem>
                    
                    <NavItem label="Timesheet" pageName="timesheet" currentPage={currentPage} onNavigate={onNavigate} onClick={onClose}>
                        <TimesheetIcon />
                    </NavItem>
                    
                    <NavItem label="Collaborators" pageName="employees" currentPage={currentPage} onNavigate={onNavigate} onClick={onClose}>
                        <TeamIcon />
                    </NavItem>
                    
                    <NavItem label="Schedule" pageName="schedule" currentPage={currentPage} onNavigate={onNavigate} onClick={onClose}>
                        <CalendarIcon />
                    </NavItem>
                    
                    <div className="w-full border-t border-bokara-grey/10 my-1"></div>
                </>
                )}

                {/* Requirement: Employee cannot see Map module */}
                {userRole === 'admin' && (
                    <NavItem label="Map" pageName="seating" currentPage={currentPage} onNavigate={onNavigate} onClick={onClose}>
                        <MapIcon />
                    </NavItem>
                )}

                <NavItem label="Tickets" pageName="ticketing" currentPage={currentPage} onNavigate={onNavigate} onClick={onClose}>
                    <TicketIcon />
                </NavItem>

                {userRole === 'admin' && (
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
