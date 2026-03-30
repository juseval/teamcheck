// src/hooks/useIdleDetection.ts
import { useEffect, useRef, useCallback } from 'react';

const randomBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export interface IdleEvent {
  employeeId: string;
  employeeName: string;
  companyId: string;
  idleStartedAt: number;
  thresholdMinutes: number;
}

interface UseIdleDetectionOptions {
  employeeId: string;
  employeeName: string;
  companyId: string;
  onIdleDetected: (event: IdleEvent) => void;
  onIdleAlert: (event: IdleEvent) => void;
  onIdleStopped?: () => void;
  currentStatus: string;
}

// ── UMBRAL DE PRUEBA: 1 min fijo para verificar que funciona ──────────────
// Una vez confirmado, cambiar a: randomBetween(3, 15) * 60 * 1000
const TEST_MODE = true;
const getThresholdMs = () => TEST_MODE ? 1 * 60 * 1000 : randomBetween(3, 15) * 60 * 1000;

export const useIdleDetection = ({
  employeeId,
  employeeName,
  companyId,
  onIdleDetected,
  onIdleAlert,
  onIdleStopped,
  currentStatus,
}: UseIdleDetectionOptions) => {

  // ── Todos los valores volátiles en refs ───────────────────────────────────
  const currentStatusRef  = useRef(currentStatus);
  const employeeIdRef     = useRef(employeeId);
  const employeeNameRef   = useRef(employeeName);
  const companyIdRef      = useRef(companyId);
  const onIdleDetectedRef = useRef(onIdleDetected);
  const onIdleAlertRef    = useRef(onIdleAlert);
  const onIdleStoppedRef  = useRef(onIdleStopped);
  const prevStatusRef     = useRef(currentStatus);

  // Actualizar en cada render sin recrear callbacks
  currentStatusRef.current  = currentStatus;
  employeeIdRef.current     = employeeId;
  employeeNameRef.current   = employeeName;
  companyIdRef.current      = companyId;
  onIdleDetectedRef.current = onIdleDetected;
  onIdleAlertRef.current    = onIdleAlert;
  onIdleStoppedRef.current  = onIdleStopped;

  const thresholdMs      = useRef<number>(getThresholdMs());
  const thresholdMinutes = useRef<number>(thresholdMs.current / 60000);
  const timerRef         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAlerted       = useRef(false);
  const mountedRef       = useRef(false);

  const isWorking = () => currentStatusRef.current === 'Working';

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetIdle = useCallback(() => {
    clearTimer();
    hasAlerted.current = false;

    if (!isWorking()) {
      console.log('[IdleDetection] ⏸ pausado — status:', currentStatusRef.current);
      return;
    }

    const ms = thresholdMs.current;
    console.log(`[IdleDetection] ⏱ timer iniciado — umbral: ${Math.round(ms/1000)}s (${(ms/60000).toFixed(1)}min)`);

    timerRef.current = setTimeout(() => {
      if (!isWorking()) {
        console.log('[IdleDetection] ⚠ disparó pero ya no está Working — ignorado');
        return;
      }
      if (hasAlerted.current) return;

      hasAlerted.current = true;
      const event: IdleEvent = {
        employeeId:       employeeIdRef.current,
        employeeName:     employeeNameRef.current,
        companyId:        companyIdRef.current,
        idleStartedAt:    Date.now(),
        thresholdMinutes: thresholdMinutes.current,
      };

      console.log('[IdleDetection] 😴 INACTIVIDAD DETECTADA para:', event.employeeName, '— umbral:', event.thresholdMinutes, 'min');
      onIdleDetectedRef.current(event);
      onIdleAlertRef.current(event);

      // Nuevo umbral para el siguiente ciclo
      thresholdMs.current      = getThresholdMs();
      thresholdMinutes.current = thresholdMs.current / 60000;
    }, ms);
  }, [clearTimer]);

  // ── Montar listeners UNA sola vez ─────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    console.log('[IdleDetection] 🚀 hook montado — status inicial:', currentStatusRef.current);

    const events: (keyof WindowEventMap)[] = [
      'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel',
    ];

    const handleActivity = () => {
      if (isWorking()) resetIdle();
    };

    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    resetIdle(); // arrancar timer si ya está Working al montar

    return () => {
      mountedRef.current = false;
      clearTimer();
      events.forEach(e => window.removeEventListener(e, handleActivity));
      console.log('[IdleDetection] 🔴 hook desmontado');
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reaccionar cuando cambia el status ────────────────────────────────────
  useEffect(() => {
    const prev = prevStatusRef.current;
    const curr = currentStatus;
    if (prev === curr) return;

    console.log(`[IdleDetection] 🔄 status cambió: "${prev}" → "${curr}"`);
    prevStatusRef.current = curr;

    if (curr === 'Working') {
      console.log('[IdleDetection] ▶ volvió a Working — reiniciando timer');
      resetIdle();
    } else {
      console.log('[IdleDetection] ⏹ dejó Working — deteniendo timer');
      clearTimer();
      hasAlerted.current = false;
      onIdleStoppedRef.current?.();
    }
  }, [currentStatus, clearTimer, resetIdle]);

  return { thresholdMinutes: thresholdMinutes.current };
};