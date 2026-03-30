// src/hooks/useElectron.ts
import { useEffect, useRef } from 'react';
import { IdleEvent } from '../components/IdleAlertToast';
import { ScreenshotMode, modeToIntervalMs } from '../components/ScreencastSettings';

// ── Detección de entorno Electron ─────────────────────────────────────────────
function detectElectron(): boolean {
  try {
    return typeof window !== 'undefined' &&
      typeof (window as any).electronAPI !== 'undefined' &&
      (window as any).electronAPI?.isElectron === true;
  } catch {
    return false;
  }
}

export const isElectron: boolean = detectElectron();

// Alias tipado de la API expuesta por preload.cjs
interface ElectronAPI {
  isElectron:            boolean;
  getConfig:             () => Promise<ElectronConfig>;
  setScreenshotInterval: (ms: number) => void;
  toggleScreenshots:     (enabled: boolean) => void;
  setAutoLaunch:         (enabled: boolean) => void;
  notifyClockIn:         () => void;
  notifyClockOut:        () => void;
  onScreenshotTaken:     (cb: (data: ScreenshotPayload) => void) => (() => void);
  onSystemIdle:          (cb: (data: IdlePayload)       => void) => (() => void);
  onSystemActive:        (cb: (data: ActivePayload)     => void) => (() => void);
  onSystemSuspended:     (cb: (data: SuspendPayload)    => void) => (() => void);
  onSystemResumed:       (cb: (data: ResumedPayload)    => void) => (() => void);
}

export interface ElectronConfig {
  screenshotIntervalMs: number;
  idleThresholdSeconds: number;
  autoLaunchEnabled:    boolean;
}

interface ScreenshotPayload { timestamp: number; data: string; }
interface IdlePayload       { idleStartedAt: number; idleSeconds: number; }
interface ActivePayload     { resumedAt: number; }
interface SuspendPayload    { timestamp: number; }
interface ResumedPayload    { timestamp: number; }

const api = (): ElectronAPI | undefined =>
  isElectron ? (window as any).electronAPI as ElectronAPI : undefined;

// ── Hook principal ────────────────────────────────────────────────────────────
interface UseElectronOptions {
  employeeId:         string;
  companyId:          string;
  employeeName:       string;
  isWorking:          boolean;
  /** Modo de screenshot del empleado (leído de su perfil en Firestore) */
  screenshotMode:     ScreenshotMode;
  onIdleDetected:     (event: IdleEvent) => void;
  onUserReturned:     () => void;
  onClockOutRequired: () => void;
  onScreenshot:       (payload: { data: string; employeeId: string; companyId: string }) => Promise<void>;
}

export function useElectron({
  employeeId,
  companyId,
  employeeName,
  isWorking,
  screenshotMode,
  onIdleDetected,
  onUserReturned,
  onClockOutRequired,
  onScreenshot,
}: UseElectronOptions): void {

  const screenshotRef = useRef(onScreenshot);
  const idleRef       = useRef(onIdleDetected);
  const returnRef     = useRef(onUserReturned);
  const clockOutRef   = useRef(onClockOutRequired);

  useEffect(() => { screenshotRef.current = onScreenshot;       }, [onScreenshot]);
  useEffect(() => { idleRef.current       = onIdleDetected;     }, [onIdleDetected]);
  useEffect(() => { returnRef.current     = onUserReturned;     }, [onUserReturned]);
  useEffect(() => { clockOutRef.current   = onClockOutRequired; }, [onClockOutRequired]);

  // ── Manejar Clock In / Clock Out ──────────────────────────────────────────
  useEffect(() => {
    const electron = api();
    if (!electron) return;

    if (isWorking) {
      // Configurar intervalo ANTES de notificar clock-in
      const intervalMs = modeToIntervalMs(screenshotMode);

      if (intervalMs === 0) {
        // Screenshots desactivados para este empleado
        console.log('[useElectron] Screenshots OFF para este empleado');
        electron.toggleScreenshots(false);
      } else if (intervalMs === -1) {
        // Modo video continuo — usar intervalo muy corto (10 seg)
        console.log('[useElectron] Modo VIDEO continuo');
        electron.setScreenshotInterval(10_000);
      } else {
        // Intervalo normal
        console.log(`[useElectron] Screenshots cada ${intervalMs / 60000}min`);
        electron.setScreenshotInterval(intervalMs);
      }

      electron.notifyClockIn();
    } else {
      electron.notifyClockOut();
    }
  }, [isWorking, screenshotMode]);

  // ── Manejar cambios de screenshotMode en caliente ──────────────────────────
  // Si el admin cambia el modo mientras el empleado ya está Working
  useEffect(() => {
    const electron = api();
    if (!electron || !isWorking) return;

    const intervalMs = modeToIntervalMs(screenshotMode);

    if (intervalMs === 0) {
      console.log('[useElectron] Admin desactivó screenshots — deteniendo');
      electron.toggleScreenshots(false);
    } else if (intervalMs === -1) {
      console.log('[useElectron] Admin activó modo video');
      electron.setScreenshotInterval(10_000);
      electron.toggleScreenshots(true);
    } else {
      console.log(`[useElectron] Admin cambió intervalo a ${intervalMs / 60000}min`);
      electron.setScreenshotInterval(intervalMs);
      electron.toggleScreenshots(true);
    }
  }, [screenshotMode, isWorking]);

  // ── Listeners de eventos del proceso principal ─────────────────────────────
  useEffect(() => {
    const electron = api();
    if (!electron) return;

    const unsubScreenshot = electron.onScreenshotTaken?.((payload) => {
      screenshotRef.current({ data: payload.data, employeeId, companyId });
    });

    const unsubIdle = electron.onSystemIdle?.((payload) => {
      idleRef.current({
        employeeId,
        employeeName,
        companyId,
        idleStartedAt:    payload.idleStartedAt,
        thresholdMinutes: Math.round(payload.idleSeconds / 60),
      } as IdleEvent);
    });

    const unsubActive  = electron.onSystemActive?.(() => { returnRef.current(); });
    const unsubSuspend = electron.onSystemSuspended?.(() => { clockOutRef.current(); });

    return () => {
      unsubScreenshot?.();
      unsubIdle?.();
      unsubActive?.();
      unsubSuspend?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, companyId, employeeName]);
}

export async function getElectronConfig(): Promise<ElectronConfig | null> {
  const electron = api();
  if (!electron) return null;
  return electron.getConfig();
}

export function setElectronScreenshotInterval(ms: number): void { api()?.setScreenshotInterval(ms); }
export function setElectronAutoLaunch(enabled: boolean): void   { api()?.setAutoLaunch(enabled); }
export function toggleElectronScreenshots(enabled: boolean): void { api()?.toggleScreenshots(enabled); }