import React, { useEffect, useMemo, useState } from 'react';
import { AttendanceLogEntry, ActivityStatus } from '../types';

interface DailyTimeSummaryProps {
  /** Entradas del colaborador. El componente filtra a HOY internamente. */
  entries: AttendanceLogEntry[];
  activityStatuses?: ActivityStatus[];
}

// ── Formatea segundos a "Xh Ym" (o "Ym" / "Xs" si es corto) ──
const fmt = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
};

// ── Estado que representa cada acción ──
//  Clock In / End <X>  → Working (vuelve al trabajo)
//  Start <X>           → <X>      (Break, Lunch o estado personalizado)
//  Clock Out           → null     (fuera de turno, no se cuenta)
const stateOfAction = (action: string): string | null => {
  if (action === 'Clock In') return 'Working';
  if (action === 'Clock Out') return null;
  if (action.startsWith('End '))   return 'Working';
  if (action.startsWith('Start ')) return action.slice(6).trim();
  return null;
};

const DailyTimeSummary: React.FC<DailyTimeSummaryProps> = ({ entries, activityStatuses = [] }) => {
  const [now, setNow] = useState(Date.now());

  // Entradas de HOY (día local) ordenadas de la más antigua a la más reciente.
  const todayEntries = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const startTs = start.getTime();
    const endTs   = startTs + 86_400_000;
    return entries
      .filter(e => e.timestamp >= startTs && e.timestamp < endTs)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [entries]);

  // ¿El último evento dejó un segmento abierto (sigue trabajando o en una actividad)?
  const hasOpenSegment =
    todayEntries.length > 0 &&
    stateOfAction(todayEntries[todayEntries.length - 1].action) !== null;

  // Solo "tick" en vivo si hay un segmento abierto.
  useEffect(() => {
    if (!hasOpenSegment) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasOpenSegment]);

  // Suma de segundos por estado.
  const { totals, order } = useMemo(() => {
    const totals: Record<string, number> = {};
    const order: string[] = [];
    const add = (state: string, secs: number) => {
      if (!(state in totals)) { totals[state] = 0; order.push(state); }
      totals[state] += secs;
    };
    for (let i = 0; i < todayEntries.length; i++) {
      const state = stateOfAction(todayEntries[i].action);
      if (state === null) continue; // Clock Out → no se cuenta
      const segStart = todayEntries[i].timestamp;
      const segEnd   = i + 1 < todayEntries.length ? todayEntries[i + 1].timestamp : now;
      add(state, Math.max(0, (segEnd - segStart) / 1000));
    }
    return { totals, order };
  }, [todayEntries, now]);

  const colorFor = (state: string): string => {
    if (state === 'Working') return '#91A673'; // verde (lucius-lime)
    const cs = activityStatuses.find(s => s.name === state);
    return cs?.color ?? '#AE8F60';              // wet-sand por defecto
  };

  if (todayEntries.length === 0) return null; // aún no hay nada que resumir

  // Working siempre primero; el resto en el orden en que aparecieron.
  const states = [...order].sort((a, b) => (a === 'Working' ? -1 : b === 'Working' ? 1 : 0));

  return (
    <div className="w-full bg-white rounded-xl shadow-md border border-bokara-grey/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-bokara-grey">Resumen de hoy</h3>
        {hasOpenSegment && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-lucius-lime uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-lucius-lime animate-pulse" /> En curso
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {states.map(state => {
          const color = colorFor(state);
          const label = state === 'Working' ? 'Trabajando' : state;
          return (
            <div key={state} className="rounded-lg border p-3 flex flex-col gap-1"
              style={{ borderColor: `${color}40`, backgroundColor: `${color}0d` }}>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[10px] font-bold text-bokara-grey/60 uppercase tracking-wide truncate">{label}</span>
              </div>
              <span className="text-xl font-display font-bold text-bokara-grey tabular-nums">{fmt(totals[state])}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DailyTimeSummary;
