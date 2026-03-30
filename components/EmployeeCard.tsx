import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Employee, AttendanceAction, ActivityStatus } from '../types';
import ActivityPickerModal from '../components/ActivityPickerModal';
import { EditIcon, AlertIcon } from '../components/Icons';

interface EmployeeCardProps {
  employee: Employee;
  onAction: (employeeId: string, action: AttendanceAction) => Promise<void> | void;
  onRemove: (employeeId: string) => void;
  onEditTime: (employeeId: string) => void;
  activityStatuses: ActivityStatus[];
  userRole: 'master' | 'admin' | 'employee';
}

const formatTime = (totalSeconds: number): string => {
  const hours   = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const getInitials = (name: string = '') => {
  if (!name) return '??';
  const trimmed = name.trim();
  if (!trimmed) return '??';
  const parts = trimmed.split(' ');
  if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return trimmed.substring(0, 2).toUpperCase();
};

const checkIsMobile = (): boolean => {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const mobileUA = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const smallTouch = window.innerWidth < 1024 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  return mobileUA || smallTouch;
};

const StatusIndicator: React.FC<{ status: Employee['status']; activityStatuses: ActivityStatus[] }> = ({ status, activityStatuses }) => {
  const base = 'px-2 py-0.5 text-xs font-semibold rounded-full';
  const custom = activityStatuses.find(s => s.name === status);
  if (custom) return <span className={`${base} text-white`} style={{ backgroundColor: custom.color }}>{status}</span>;
  switch (status) {
    case 'Working':     return <span className={`${base} bg-lucius-lime/20 text-lucius-lime`}>Working</span>;
    case 'Clocked Out': return <span className={`${base} bg-gray-200 text-gray-700`}>Clocked Out</span>;
    default:            return <span className={`${base} bg-wet-sand/20 text-wet-sand`}>{status}</span>;
  }
};

const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee, onAction, onRemove, onEditTime, activityStatuses, userRole
}) => {
  const [elapsedTime, setElapsedTime]         = useState(0);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isMobile, setIsMobile]               = useState<boolean>(() => checkIsMobile());
  const [isActionPending, setIsActionPending] = useState(false);
  const [actionError, setActionError]         = useState<string | null>(null);

  const isMountedRef       = useRef(true);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Rastreamos status Y currentStatusStartTime para detectar cualquier cambio ──
  const prevStatusRef    = useRef(employee.status);
  const prevStartTimeRef = useRef(employee.currentStatusStartTime);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(checkIsMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Liberar bloqueo cuando Firestore propaga cualquier cambio real ──
  useEffect(() => {
    const statusChanged    = employee.status !== prevStatusRef.current;
    const startTimeChanged = employee.currentStatusStartTime !== prevStartTimeRef.current;

    prevStatusRef.current    = employee.status;
    prevStartTimeRef.current = employee.currentStatusStartTime;

    if (isActionPending && (statusChanged || startTimeChanged)) {
      if (isMountedRef.current) {
        setIsActionPending(false);
        setActionError(null);
        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current);
          fallbackTimeoutRef.current = null;
        }
      }
    }
  }, [employee.status, employee.currentStatusStartTime, isActionPending]);

  // ── Limpiar error después de 4s ──
  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => { if (isMountedRef.current) setActionError(null); }, 4000);
    return () => clearTimeout(t);
  }, [actionError]);

  // ── Timer — SOLO muestra el tiempo, NO hace Clock Out automático ──
  useEffect(() => {
    if (employee.status === 'Clocked Out') {
      setElapsedTime(0);
      return;
    }

    const isWorking    = employee.status === 'Working';
    const hasNewFields = employee.accumulatedWorkSeconds !== undefined || employee.workSessionStartTime !== undefined;

    if (isWorking) {
      if (!hasNewFields) {
        const fallbackStart = employee.lastClockInTime ?? employee.currentStatusStartTime ?? null;
        if (!fallbackStart) return;
        const updateTimer = () => {
          setElapsedTime(Math.floor((Date.now() - fallbackStart) / 1000));
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
      }

      const base         = employee.accumulatedWorkSeconds ?? 0;
      const sessionStart = employee.workSessionStartTime ?? null;
      if (!sessionStart) { setElapsedTime(base); return; }

      const updateTimer = () => {
        const live  = Math.floor((Date.now() - sessionStart) / 1000);
        setElapsedTime(base + live);
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);

    } else {
      const activityStart = employee.currentStatusStartTime ?? null;
      if (!activityStart) return;
      const updateTimer = () => setElapsedTime(Math.floor((Date.now() - activityStart) / 1000));
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [
    employee.status, employee.accumulatedWorkSeconds, employee.workSessionStartTime,
    employee.currentStatusStartTime, employee.lastClockInTime,
  ]);

  const handleAction = useCallback(async (action: AttendanceAction) => {
    if (isActionPending) return;

    setIsActionPending(true);
    setActionError(null);

    fallbackTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsActionPending(false);
        setActionError('Tiempo de espera agotado. Verifica tu conexión e intenta de nuevo.');
      }
    }, 8000);

    try {
      await onAction(employee.id, action);
    } catch (error: any) {
      if (isMountedRef.current) {
        setIsActionPending(false);
        setActionError(
          error?.code === 'unavailable'
            ? 'Sin conexión. Verifica tu red e intenta de nuevo.'
            : 'Error al registrar la acción. Intenta de nuevo.'
        );
        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current);
          fallbackTimeoutRef.current = null;
        }
      }
    }
  }, [isActionPending, onAction, employee.id]);

  const handleSelectActivity = useCallback((activityName: string) => {
    handleAction(`Start ${activityName}` as AttendanceAction);
    setIsActivityModalOpen(false);
  }, [handleAction]);

  const isMobileRestricted = isMobile && employee.allowMobileClockIn !== true;

  const renderButtons = () => {
    if (isMobileRestricted && userRole === 'employee') {
      return (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex flex-col items-center gap-2 text-red-700 animate-fade-in shadow-inner">
          <AlertIcon className="w-6 h-6 flex-shrink-0" />
          <span className="text-[10px] leading-tight font-bold text-center uppercase tracking-tight">
            Acceso móvil restringido.<br />Por favor use su computador asignado.
          </span>
        </div>
      );
    }

    const disabled = isActionPending;
    const base = `w-full text-center font-bold py-2 px-4 rounded-lg transition-all duration-300 shadow-md transform ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`;
    const primary   = `${base} bg-bokara-grey hover:bg-bokara-grey/90 text-bright-white`;
    const secondary = `${base} bg-wet-sand hover:bg-opacity-80 text-bokara-grey`;

    switch (employee.status) {
      case 'Clocked Out':
        return (
          <button onClick={() => handleAction('Clock In')} disabled={disabled} className={primary}>
            {disabled ? 'Registrando...' : 'Clock In'}
          </button>
        );
      case 'Working':
        return (
          <div className="flex gap-2">
            <button onClick={() => !disabled && setIsActivityModalOpen(true)} disabled={disabled} className={secondary}>
              {disabled ? '...' : 'Start Activity'}
            </button>
            <button onClick={() => handleAction('Clock Out')} disabled={disabled} className={primary}>
              {disabled ? '...' : 'Clock Out'}
            </button>
          </div>
        );
      default: {
        const currentStatus = employee.status;
        const customStatus  = activityStatuses.find(s => s.name === currentStatus);
        const endColor      = customStatus ? customStatus.color : '#AE8F60';
        return (
          <button
            onClick={() => handleAction(`End ${currentStatus}` as AttendanceAction)}
            disabled={disabled}
            className={`${base} text-white`}
            style={{ backgroundColor: endColor, filter: 'brightness(1.1)' }}
          >
            {disabled ? 'Registrando...' : `End ${currentStatus}`}
          </button>
        );
      }
    }
  };

  const isRemovable = employee.status === 'Clocked Out';
  const isClockedIn = employee.status !== 'Clocked Out';
  const initials    = getInitials(employee.name);

  // ── Alerta visual si lleva más de 12h activo (sin hacer Clock Out automático) ──
  const isOverdue = elapsedTime >= 12 * 3600;

  return (
    <>
      <div className={`bg-white rounded-xl shadow-md p-4 flex flex-col gap-4 border border-bokara-grey/10 relative transition-all duration-300 ease-in-out ${isOverdue && isClockedIn ? 'ring-2 ring-red-500 bg-red-50/30' : ''}`}>
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
          {userRole !== 'employee' && (
            <>
              <button
                onClick={() => onEditTime(employee.id)}
                className="p-1 text-bokara-grey/40 rounded-full hover:text-lucius-lime hover:bg-whisper-white transition-colors disabled:hover:text-bokara-grey/40 disabled:cursor-not-allowed"
                title={isClockedIn ? 'Edit session start time' : 'Employee must be clocked in to edit time'}
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
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
            <div className="text-[10px] font-bold text-red-600 uppercase animate-pulse">Sesión Crítica +12h</div>
          )}
          <div className="text-xs text-bokara-grey/60 -mt-1 truncate">
            {isClockedIn && employee.lastClockInTime
              ? employee.status === 'Working'
                ? `⏱ Working | In since ${new Date(employee.lastClockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : `⏱ ${employee.status} | In since ${employee.currentStatusStartTime ? new Date(employee.currentStatusStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}`
              : 'Offline'}
          </div>
        </div>

        {actionError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-semibold text-center animate-fade-in flex items-center gap-2 justify-center">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            {actionError}
          </div>
        )}

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