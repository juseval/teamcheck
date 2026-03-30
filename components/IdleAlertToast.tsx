// src/components/IdleAlertToast.tsx
import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';

// ── Inline type so this component has zero external deps ──────────────────────
export interface IdleEvent {
  employeeId: string;
  employeeName: string;
  companyId: string;
  idleStartedAt: number;
  thresholdMinutes: number;
}

interface Alert {
  alertId: string;
  addedAt: number;
  employeeId: string;
  employeeName: string;
  companyId: string;
  idleStartedAt: number;
  thresholdMinutes: number;
}

interface IdleAlertToastProps {
  registerTrigger: (trigger: (event: IdleEvent) => void) => void;
  onViewProductivity?: () => void;
}

const AUTO_DISMISS_MS = 12_000;

const IdleAlertToast: React.FC<IdleAlertToastProps> = ({
  registerTrigger,
  onViewProductivity,
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const dismiss = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(a => a.alertId !== alertId));
  }, []);

  const addAlert = useCallback((event: IdleEvent) => {
    const alertId = `${event.employeeId}-${Date.now()}`;
    const newAlert: Alert = {
      alertId,
      addedAt: Date.now(),
      employeeId: event.employeeId,
      employeeName: event.employeeName,
      companyId: event.companyId,
      idleStartedAt: event.idleStartedAt,
      thresholdMinutes: event.thresholdMinutes,
    };
    setAlerts(prev => [...prev.slice(-3), newAlert]);
  }, []);

  useEffect(() => {
    registerTrigger(addAlert);
  }, [registerTrigger, addAlert]);

  useEffect(() => {
    if (alerts.length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setAlerts(prev => prev.filter(a => now - a.addedAt < AUTO_DISMISS_MS));
    }, 1000);
    return () => clearInterval(timer);
  }, [alerts.length]);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {alerts.map(alert => (
        <div
          key={alert.alertId}
          className="pointer-events-auto w-80 bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden"
          style={{ animation: 'idleSlideUp 0.3s cubic-bezier(.4,0,.2,1) forwards' }}
        >
          {/* Progress bar */}
          <div className="h-1 bg-red-100">
            <div
              className="h-full bg-red-400 rounded-full"
              style={{ animation: `idleShrink ${AUTO_DISMISS_MS}ms linear forwards` }}
            />
          </div>

          <div className="p-4 flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0 text-xl">
              😴
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-bokara-grey text-sm leading-tight">
                {alert.employeeName}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Inactivo por más de{' '}
                <span className="font-semibold text-red-500">
                  {Math.round(alert.thresholdMinutes)}min
                </span>
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                {new Date(alert.idleStartedAt).toLocaleTimeString('es-CO', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
            <button
              onClick={() => dismiss(alert.alertId)}
              className="self-start text-gray-300 hover:text-gray-500 text-lg leading-none"
            >
              ×
            </button>
          </div>

          {onViewProductivity && (
            <div className="px-4 pb-3">
              <button
                onClick={() => { onViewProductivity(); dismiss(alert.alertId); }}
                className="w-full text-xs font-semibold text-lucius-lime bg-lucius-lime/10 hover:bg-lucius-lime/20 rounded-lg py-1.5 transition-colors"
              >
                Ver productividad →
              </button>
            </div>
          )}
        </div>
      ))}

      <style>{`
        @keyframes idleSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes idleShrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default IdleAlertToast;