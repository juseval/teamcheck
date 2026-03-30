import React, { useState, useEffect, useRef } from 'react';
import { Employee, Company } from '../types';
import { UserIcon, CalendarIcon, PasswordIcon, LogoutIcon } from './Icons';

interface ProfileDropdownProps {
  user: Employee;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  // ── Multi-empresa (solo para masters) ──
  userCompanies?: Company[];
  activeCompany?: Company | null;
  onSwitchCompany?: (companyId: string) => Promise<void>;
  onCreateNewCompany?: () => void;
}

const getInitials = (name: string = '') => {
  if (!name) return '??';
  const trimmedName = name.trim();
  if (!trimmedName) return '??';
  const names = trimmedName.split(' ');
  if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  return trimmedName.substring(0, 2).toUpperCase();
};

const BuildingIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const PlusSmallIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
  </svg>
);

const CheckSmallIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-3.5 h-3.5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
  </svg>
);

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  user, onNavigate, onLogout,
  userCompanies = [], activeCompany, onSwitchCompany, onCreateNewCompany,
}) => {
  const [isOpen, setIsOpen]               = useState(false);
  const [showCompanies, setShowCompanies] = useState(false);
  const [isSwitching, setIsSwitching]     = useState(false);
  const dropdownRef                       = useRef<HTMLDivElement>(null);
  const initials                          = getInitials(user.name);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCompanies(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigation = (page: string) => {
    onNavigate(page);
    setIsOpen(false);
    setShowCompanies(false);
  };

  const handleSwitchCompany = async (companyId: string) => {
    if (!onSwitchCompany || companyId === activeCompany?.id) {
      setIsOpen(false);
      setShowCompanies(false);
      return;
    }
    setIsSwitching(true);
    try {
      await onSwitchCompany(companyId);
    } finally {
      setIsSwitching(false);
      setIsOpen(false);
      setShowCompanies(false);
    }
  };

  const isMaster = user.role === 'master';
  const hasMultipleCompanies = isMaster && userCompanies.length > 1;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => { setIsOpen(!isOpen); setShowCompanies(false); }}
        className="flex items-center gap-3 text-left p-1 rounded-full transition-colors hover:bg-whisper-white"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="hidden sm:inline text-bokara-grey font-medium text-sm">{user.name}</span>
        <div className="relative flex-shrink-0">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full border-2 border-lucius-lime object-cover" />
          ) : (
            <div className="w-10 h-10 bg-lucius-lime/20 rounded-full flex items-center justify-center border-2 border-lucius-lime">
              <span className="text-md font-bold text-bokara-grey select-none">{initials}</span>
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-bright-white bg-lucius-lime" title="Online" />
        </div>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl bg-bright-white shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-30 overflow-hidden"
          role="menu"
        >
          {/* User info header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm font-bold text-bokara-grey truncate">{user.name}</p>
            <p className="text-xs text-bokara-grey/50 truncate">{user.email}</p>
            {isMaster && (
              <span className="mt-1 inline-block text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black uppercase">
                ⭐ Propietario
              </span>
            )}
            {activeCompany && (
              <p className="text-[10px] text-bokara-grey/40 mt-1 truncate">📍 {activeCompany.name}</p>
            )}
          </div>

          <div className="py-1" role="none">
            <button onClick={() => handleNavigation('profile')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-bokara-grey hover:bg-whisper-white" role="menuitem">
              <UserIcon /> My Profile
            </button>
            <button onClick={() => handleNavigation('calendar')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-bokara-grey hover:bg-whisper-white" role="menuitem">
              <CalendarIcon /> My Calendar
            </button>
            <button onClick={() => handleNavigation('password')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-bokara-grey hover:bg-whisper-white" role="menuitem">
              <PasswordIcon /> Change Password
            </button>
          </div>

          {/* ── Sección multi-empresa (solo master) ── */}
          {isMaster && (
            <>
              <div className="border-t border-gray-100" />
              <div className="py-1">

                {/* Submenú de empresas */}
                {hasMultipleCompanies && (
                  <div className="relative">
                    <button
                      onClick={() => setShowCompanies(v => !v)}
                      className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-bokara-grey hover:bg-whisper-white"
                      disabled={isSwitching}
                    >
                      <BuildingIcon />
                      <span className="flex-1">{isSwitching ? 'Cambiando...' : 'Cambiar Empresa'}</span>
                      <ChevronRightIcon />
                    </button>

                    {showCompanies && (
                      <div className="border-t border-gray-100 bg-gray-50">
                        {userCompanies.map(company => (
                          <button
                            key={company.id}
                            onClick={() => handleSwitchCompany(company.id)}
                            disabled={isSwitching}
                            className={`w-full text-left flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${
                              company.id === activeCompany?.id
                                ? 'text-lucius-lime font-bold bg-lucius-lime/5'
                                : 'text-bokara-grey/80 hover:bg-whisper-white'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black flex-shrink-0 ${
                              company.id === activeCompany?.id
                                ? 'bg-lucius-lime text-bokara-grey'
                                : 'bg-bokara-grey/10 text-bokara-grey/50'
                            }`}>
                              {company.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="truncate flex-1">{company.name}</span>
                            {company.id === activeCompany?.id && (
                              <span className="text-lucius-lime flex-shrink-0"><CheckSmallIcon /></span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Crear nueva empresa */}
                {onCreateNewCompany && (
                  <button
                    onClick={() => { setIsOpen(false); onCreateNewCompany(); }}
                    className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-lucius-lime hover:bg-lucius-lime/5 font-bold"
                  >
                    <PlusSmallIcon />
                    Nueva Empresa
                  </button>
                )}
              </div>
            </>
          )}

          <div className="border-t border-gray-100" />
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