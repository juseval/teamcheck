import React, { useState, useEffect, useRef } from 'react';
import { Employee, AttendanceAction, ActivityStatus } from '../types';
import ActivityPickerModal from '../components/ActivityPickerModal';
import { EditIcon, AlertIcon } from '../components/Icons';

interface EmployeeCardProps {
  employee: Employee;
  onAction: (employeeId: string, action: AttendanceAction) => void;
  onRemove: (employeeId: string) => void;
  onEditTime: (employeeId: string) => void;
  activityStatuses: ActivityStatus[];
  userRole: 'master' | 'admin' | 'employee';
}

const formatTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const getInitials = (name: string = '') => {
  if (!name) return '??';
  const trimmedName = name.trim();
  if (!trimmedName) return '??';
  const names = trimmedName.split(' ');
  if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  return trimmedName.substring(0, 2).toUpperCase();
};

// ─────────────────────────────────────────────
//  FIX: Detección de móvil SÍNCRONA
//  Separada del useEffect para que no haya
//  un render inicial con botones desbloqueados
// ─────────────────────────────────────────────
const checkIsMobile = (): boolean => {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const mobileUA = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const smallTouch = window.innerWidth < 1024 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  return mobileUA || smallTouch;
};

const StatusIndicator: React.FC<{ status: Employee['status'], activityStatuses: ActivityStatus[] }> = ({ status, activityStatuses }) => {
  const baseClasses = "px-2 py-0.5 text-xs font-semibold rounded-full";
  const customStatus = activityStatuses.find(s => s.name === status);
  if (customStatus) return <span className={`${baseClasses} text-white`} style={{ backgroundColor: customStatus.color }}>{status}</span>;
  switch (status) {
    case 'Working':    return <span className={`${baseClasses} bg-lucius-lime/20 text-lucius-lime`}>Working</span>;
    case 'Clocked Out': return <span className={`${baseClasses} bg-gray-200 text-gray-700`}>Clocked Out</span>;
    default:           return <span className={`${baseClasses} bg-wet-sand/20 text-wet-sand`}>{status}</span>;
  }
};

const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, onAction, onRemove, onEditTime, activityStatuses, userRole }) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  // ── FIX: estado inicializado SÍNCRONAMENTE con checkIsMobile() ──
  // Esto evita el render inicial con isMobileDevice = false
  const [isMobile, setIsMobile] = useState<boolean>(() => checkIsMobile());

  const hasAutoClockedOut = useRef(false);

  // Actualizar detección si cambia el tamaño de ventana (rotación de pantalla, etc.)
  useEffect(() => {
    const handleResize = () => setIsMobile(checkIsMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Timer + auto clock-out 24h
  useEffect(() => {
    if (employee.status === 'Clocked Out') {
      hasAutoClockedOut.current = false;
      setElapsedTime(0);
      return;
    }
    if (employee.currentStatusStartTime) {
      const updateTimer = () => {
        const seconds = Math.floor((Date.now() - (employee.currentStatusStartTime || 0)) / 1000);
        setElapsedTime(seconds);
        if (employee.autoClockOut24h !== false && seconds >= 86400 && !hasAutoClockedOut.current) {
          hasAutoClockedOut.current = true;
          onAction(employee.id, 'Clock Out');
        }
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [employee.status, employee.currentStatusStartTime, employee.autoClockOut24h, employee.id, onAction]);

  const handleSelectActivity = (activityName: string) => {
    onAction(employee.id, `Start ${activityName}`);
    setIsActivityModalOpen(false);
  };

  // ── FIX: Bloqueo calculado síncronamente en cada render ──
  // allowMobileClockIn debe ser exactamente `true` para permitir
  const isMobileRestricted = isMobile && employee.allowMobileClockIn !== true;

  const renderButtons = () => {
    // Bloquear botones si es móvil restringido Y es empleado
    if (isMobileRestricted && userRole === 'employee') {
      return (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex flex-col items-center gap-2 text-red-700 animate-fade-in shadow-inner">
          <AlertIcon className="w-6 h-6 flex-shrink-0" />
          <span className="text-[10px] leading-tight font-bold text-center uppercase tracking-tight">
            Acceso móvil restringido.<br />Por favor use un computador de escritorio.
          </span>
        </div>
      );
    }

    const base = "w-full text-center font-bold py-2 px-4 rounded-lg transition-all duration-300 shadow-md transform hover:scale-105";
    const primary   = `${base} bg-bokara-grey hover:bg-bokara-grey/90 text-bright-white`;
    const secondary = `${base} bg-wet-sand hover:bg-opacity-80 text-bokara-grey`;

    switch (employee.status) {
      case 'Clocked Out':
        return <button onClick={() => onAction(employee.id, 'Clock In')} className={primary}>Clock In</button>;
      case 'Working':
        return (
          <div className="flex gap-2">
            <button onClick={() => setIsActivityModalOpen(true)} className={secondary}>Start Activity</button>
            <button onClick={() => onAction(employee.id, 'Clock Out')} className={primary}>Clock Out</button>
          </div>
        );
      default: {
        const customStatus = activityStatuses.find(s => s.name === employee.status);
        const endColor = customStatus ? customStatus.color : '#AE8F60';
        return (
          <button
            onClick={() => onAction(employee.id, `End ${employee.status}`)}
            className={`${base} text-white`}
            style={{ backgroundColor: endColor, filter: 'brightness(1.1)' }}
          >
            End {employee.status}
          </button>
        );
      }
    }
  };

  const isRemovable  = employee.status === 'Clocked Out';
  const isClockedIn  = employee.status !== 'Clocked Out';
  const initials     = getInitials(employee.name);
  const isOverdue    = elapsedTime >= 86400;

  return (
    <>
      <div className={`bg-white rounded-xl shadow-md p-4 flex flex-col gap-4 border border-bokara-grey/10 relative transition-all duration-300 ease-in-out ${isOverdue && isClockedIn ? 'ring-2 ring-red-500 bg-red-50/30' : ''}`}>
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
          {userRole !== 'employee' && (
            <>
              <button
                onClick={() => onEditTime(employee.id)}
                className="p-1 text-bokara-grey/40 rounded-full hover:text-lucius-lime hover:bg-whisper-white transition-colors disabled:hover:text-bokara-grey/40 disabled:cursor-not-allowed"
                title={isClockedIn ? "Edit session start time" : "Employee must be clocked in to edit time"}
                disabled={!isClockedIn}
              >
                <EditIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => onRemove(employee.id)}
                className="p-1 text-bokara-grey/40 rounded-full hover:text-red-500 hover:bg-whisper-white disabled:hover:text-bokara-grey/40 disabled:cursor-not-allowed transition-colors"
                disabled={!isRemovable}
                title={!isRemovable ? 'Cannot remove an active employee' : 'Remove employee'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            {employee.avatarUrl ? (
              <img src={employee.avatarUrl} alt={employee.name} className="w-14 h-14 rounded-full border-2 border-lucius-lime/50 object-cover" />
            ) : (
              <div className="w-14 h-14 bg-lucius-lime/20 rounded-full flex items-center justify-center border-2 border-lucius-lime/50">
                <span className="text-xl font-bold text-bokara-grey select-none">{initials}</span>
              </div>
            )}
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white transition-colors ${isClockedIn ? 'bg-lucius-lime' : 'bg-gray-400'}`}
              title={isClockedIn ? 'Online' : 'Offline'}
            />
          </div>
          <div className="flex-grow overflow-hidden">
            <h3 className="text-lg font-bold text-bokara-grey truncate">{employee.name}</h3>
            <StatusIndicator status={employee.status} activityStatuses={activityStatuses} />
          </div>
        </div>

        <div className="text-center relative">
          <div className={`font-display text-4xl tracking-widest tabular-nums transition-colors ${isOverdue && isClockedIn ? 'text-red-600' : 'text-bokara-grey'}`}>
            {formatTime(elapsedTime)}
          </div>
          {isOverdue && isClockedIn && (
            <div className="text-[10px] font-bold text-red-600 uppercase animate-pulse">Sesión Crítica +24h</div>
          )}
          <div className="text-xs text-bokara-grey/60 -mt-1 truncate">
            {isClockedIn && employee.lastClockInTime
              ? `Session | In since ${new Date(employee.lastClockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Offline'}
          </div>
        </div>

        {/* Indicador visual de restricción móvil activa (solo admin, para que sepa el estado) */}
        {isMobileRestricted && userRole !== 'employee' && (
          <div className="text-[9px] text-center text-red-400 font-bold uppercase tracking-wide -mt-2">
            📵 Vista móvil — acceso restringido para este usuario
          </div>
        )}

        <div className="mt-auto">
          {renderButtons()}
        </div>
      </div>

      <ActivityPickerModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onSelectActivity={handleSelectActivity}
        statuses={activityStatuses}
      />
    </>
  );
};

export default EmployeeCard;