// src/pages/ProductivityPage.tsx
import * as React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Employee, IdleLogEntry, AttendanceLogEntry } from '../types';

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const fmtTime = (epoch: number) =>
  new Date(epoch).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

const fmtDate = (epoch: number) =>
  new Date(epoch).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });

const productivityColor = (pct: number) => {
  if (pct >= 80) return '#a3e635';
  if (pct >= 60) return '#facc15';
  if (pct >= 40) return '#fb923c';
  return '#f87171';
};

const productivityLabel = (pct: number) => {
  if (pct >= 80) return 'Excelente';
  if (pct >= 60) return 'Bueno';
  if (pct >= 40) return 'Regular';
  return 'Bajo';
};

// ─── Tipos de segmento para la línea de tiempo ───────────────────────────────
type SegmentType = 'working' | 'idle' | 'activity' | 'clocked-out';

interface TimeSegment {
  type: SegmentType;
  start: number;
  end: number;
  label?: string; // nombre de la actividad si aplica
}

const SEGMENT_COLORS: Record<SegmentType, string> = {
  'working':     '#a3e635',
  'idle':        '#f87171',
  'activity':    '#facc15',
  'clocked-out': '#e5e7eb',
};

const SEGMENT_LABELS: Record<SegmentType, string> = {
  'working':     'Working',
  'idle':        'Inactivo',
  'activity':    'Actividad',
  'clocked-out': 'Fuera',
};

// ─── Construye segmentos de línea de tiempo para un empleado en un día ───────
const buildTimeline = (
  empId: string,
  log: AttendanceLogEntry[],
  idleEntries: IdleLogEntry[],
  dayStart: number,
  dayEnd: number,
): TimeSegment[] => {
  const empLog = log
    .filter(e => e.employeeId === empId)
    .sort((a, b) => a.timestamp - b.timestamp);

  const segments: TimeSegment[] = [];

  // Fase 1: construir segmentos de asistencia (Working / Activity / Clocked-Out)
  let cursor = dayStart;
  let currentState: 'clocked-out' | 'working' | 'activity' = 'clocked-out';
  let activityName = '';

  const pushSeg = (end: number) => {
    if (end <= cursor) return;
    segments.push({
      type: currentState === 'activity' ? 'activity' : currentState,
      start: cursor,
      end,
      label: currentState === 'activity' ? activityName : undefined,
    });
  };

  for (const entry of empLog) {
    const t = Math.max(dayStart, Math.min(entry.timestamp, dayEnd));
    if (entry.timestamp < dayStart) {
      // Evento anterior al día — actualizar estado inicial
      if (entry.action === 'Clock In') { currentState = 'working'; activityName = ''; }
      else if (entry.action === 'Clock Out') { currentState = 'clocked-out'; activityName = ''; }
      else if (entry.action.startsWith('Start ')) { currentState = 'activity'; activityName = entry.action.slice(6); }
      else if (entry.action.startsWith('End ')) { currentState = 'working'; activityName = ''; }
      continue;
    }
    if (entry.timestamp > dayEnd) break;

    pushSeg(t);
    cursor = t;

    if (entry.action === 'Clock In') { currentState = 'working'; activityName = ''; }
    else if (entry.action === 'Clock Out') { currentState = 'clocked-out'; activityName = ''; }
    else if (entry.action.startsWith('Start ')) { currentState = 'activity'; activityName = entry.action.slice(6); }
    else if (entry.action.startsWith('End ')) { currentState = 'working'; activityName = ''; }
  }

  // Segmento hasta el final del día (o ahora si es hoy)
  pushSeg(dayEnd);

  // Fase 2: superponer segmentos de inactividad sobre los Working
  const result: TimeSegment[] = [];

  for (const seg of segments) {
    if (seg.type !== 'working') { result.push(seg); continue; }

    // Idle entries que caen dentro de este segmento Working
    const overlaps = idleEntries
      .filter(e => {
        const iStart = e.idleStartedAt;
        const iEnd   = e.resumedAt ?? dayEnd;
        return iStart < seg.end && iEnd > seg.start;
      })
      .map(e => ({
        start: Math.max(e.idleStartedAt, seg.start),
        end:   Math.min(e.resumedAt ?? dayEnd, seg.end),
      }))
      .sort((a, b) => a.start - b.start);

    if (overlaps.length === 0) { result.push(seg); continue; }

    let pos = seg.start;
    for (const idle of overlaps) {
      if (idle.start > pos) result.push({ type: 'working', start: pos, end: idle.start });
      result.push({ type: 'idle', start: idle.start, end: idle.end });
      pos = idle.end;
    }
    if (pos < seg.end) result.push({ type: 'working', start: pos, end: seg.end });
  }

  return result.filter(s => s.end - s.start > 30_000); // omitir < 30 seg (ruido visual)
};

// ─── Componente línea de tiempo ───────────────────────────────────────────────
interface DayTimelineProps {
  segments: TimeSegment[];
  dayStart: number;
  dayEnd: number;
}

const DayTimeline: React.FC<DayTimelineProps> = ({ segments, dayStart, dayEnd }) => {
  const [tooltip, setTooltip] = useState<{ seg: TimeSegment; x: number } | null>(null);
  const totalMs = dayEnd - dayStart;

  if (segments.length === 0) {
    return (
      <div className="h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs text-gray-400">
        Sin actividad registrada
      </div>
    );
  }

  // Horas para el eje X (cada 2h)
  const hourMarks: number[] = [];
  const d = new Date(dayStart);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + (d.getHours() % 2 === 0 ? 0 : 1));
  while (d.getTime() <= dayEnd) {
    if (d.getTime() >= dayStart) hourMarks.push(d.getTime());
    d.setHours(d.getHours() + 2);
  }

  return (
    <div className="space-y-1 select-none">
      {/* Barra */}
      <div
        className="relative h-8 rounded-full overflow-hidden bg-gray-100 cursor-pointer"
        onMouseLeave={() => setTooltip(null)}
      >
        {segments.map((seg, i) => {
          const left = ((seg.start - dayStart) / totalMs) * 100;
          const width = ((seg.end - seg.start) / totalMs) * 100;
          return (
            <div
              key={i}
              className="absolute top-0 h-full transition-opacity hover:opacity-80"
              style={{
                left:  `${left}%`,
                width: `${Math.max(width, 0.3)}%`,
                backgroundColor: SEGMENT_COLORS[seg.type],
              }}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                const x = Math.min(
                  Math.max(((seg.start + seg.end) / 2 - dayStart) / totalMs * 100, 5),
                  95
                );
                setTooltip({ seg, x });
              }}
            />
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute bottom-full mb-2 z-20 pointer-events-none"
            style={{ left: `${tooltip.x}%`, transform: 'translateX(-50%)' }}
          >
            <div className="bg-bokara-grey text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap">
              <div className="font-bold">
                {tooltip.seg.label || SEGMENT_LABELS[tooltip.seg.type]}
              </div>
              <div className="text-white/70">
                {fmtTime(tooltip.seg.start)} → {fmtTime(tooltip.seg.end)}
              </div>
              <div className="text-white/70">
                {fmt(tooltip.seg.end - tooltip.seg.start)}
              </div>
            </div>
            <div className="w-2 h-2 bg-bokara-grey rotate-45 mx-auto -mt-1" />
          </div>
        )}
      </div>

      {/* Eje de horas */}
      <div className="relative h-4">
        {hourMarks.map(t => {
          const left = ((t - dayStart) / totalMs) * 100;
          const h = new Date(t).getHours();
          const label = h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`;
          return (
            <span
              key={t}
              className="absolute text-[9px] text-gray-400 -translate-x-1/2"
              style={{ left: `${left}%` }}
            >
              {label}
            </span>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 pt-1">
        {(Object.entries(SEGMENT_COLORS) as [SegmentType, string][]).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-gray-500">{SEGMENT_LABELS[type]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── calcWorkingMs ────────────────────────────────────────────────────────────
const calcWorkingMs = (
  empId: string,
  log: AttendanceLogEntry[],
  from: number,
  to: number,
): number => {
  const empLog = log
    .filter(e => e.employeeId === empId)
    .sort((a, b) => a.timestamp - b.timestamp);

  let totalMs = 0;
  let workingStart: number | null = null;

  for (const entry of empLog) {
    const t = entry.timestamp;
    if (t < from) {
      if (entry.action === 'Clock In') workingStart = from;
      else if (entry.action === 'Clock Out' || entry.action.startsWith('Start ')) workingStart = null;
      else if (entry.action.startsWith('End ')) workingStart = from;
      continue;
    }
    if (t > to) {
      if (workingStart !== null) { totalMs += Math.max(0, to - workingStart); workingStart = null; }
      break;
    }
    if (entry.action === 'Clock In') { workingStart = t; }
    else if (entry.action === 'Clock Out') {
      if (workingStart !== null) { totalMs += Math.max(0, t - workingStart); workingStart = null; }
    } else if (entry.action.startsWith('Start ')) {
      if (workingStart !== null) { totalMs += Math.max(0, t - workingStart); workingStart = null; }
    } else if (entry.action.startsWith('End ')) { workingStart = t; }
  }

  if (workingStart !== null) totalMs += Math.max(0, to - workingStart);
  return totalMs;
};

// ─── Radial ring ──────────────────────────────────────────────────────────────
const Ring: React.FC<{ pct: number; size?: number; stroke?: number }> = ({ pct, size = 72, stroke = 6 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={productivityColor(pct)} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)' }} />
    </svg>
  );
};

const IdleBadge: React.FC<{ minutes: number }> = ({ minutes }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-600">
    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
    {minutes}m inactivo
  </span>
);

// ─── Props ────────────────────────────────────────────────────────────────────
interface ProductivityPageProps {
  employees: Employee[];
  idleLog: IdleLogEntry[];
  attendanceLog: AttendanceLogEntry[];
  currentUserRole: 'master' | 'admin' | 'employee';
}

type DateFilter = 'today' | 'week' | 'month' | 'all';

const ProductivityPage: React.FC<ProductivityPageProps> = ({
  employees, idleLog, attendanceLog, currentUserRole,
}) => {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [liveIdleMap, setLiveIdleMap] = useState<Record<string, number>>({});
  const liveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [now, setNow] = useState(Date.now());

  // Tick every minute to keep timelines fresh
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Live idle counter
  useEffect(() => {
    const tick = () => {
      const ts = Date.now();
      const map: Record<string, number> = {};
      idleLog.forEach(entry => {
        if (!entry.resumedAt) {
          const secs = Math.floor((ts - entry.idleStartedAt) / 1000);
          if (!map[entry.employeeId] || secs > map[entry.employeeId]) map[entry.employeeId] = secs;
        }
      });
      setLiveIdleMap(map);
    };
    tick();
    liveTimerRef.current = setInterval(tick, 1000);
    return () => { if (liveTimerRef.current) clearInterval(liveTimerRef.current); };
  }, [idleLog]);

  // ── Ventana temporal ──
  const { windowStart, windowEnd } = useMemo(() => {
    if (dateFilter === 'today') return { windowStart: new Date(now).setHours(0,0,0,0), windowEnd: now };
    if (dateFilter === 'week')  return { windowStart: now - 7 * 86400_000, windowEnd: now };
    if (dateFilter === 'month') return { windowStart: now - 30 * 86400_000, windowEnd: now };
    return { windowStart: 0, windowEnd: now };
  }, [dateFilter, now]);

  const filteredLog = useMemo(
    () => idleLog.filter(e => e.idleStartedAt >= windowStart),
    [idleLog, windowStart],
  );

  // ── Stats por empleado ──
  const employeeStats = useMemo(() => {
    const collaborators = employees.filter(e => e.role === 'employee');
    return collaborators.map(emp => {
      const totalWorkingMs = calcWorkingMs(emp.id, attendanceLog, windowStart, windowEnd);
      const entries = filteredLog.filter(e => e.employeeId === emp.id);
      const totalIdleMs = entries.reduce((sum, e) => {
        const end = e.resumedAt ?? now;
        return sum + Math.max(0, end - e.idleStartedAt);
      }, 0);
      const idleCapped    = Math.min(totalIdleMs, totalWorkingMs);
      const activeWorkingMs = Math.max(0, totalWorkingMs - idleCapped);
      const productivityPct = totalWorkingMs > 0
        ? Math.round((activeWorkingMs / totalWorkingMs) * 100)
        : 100;
      const isCurrentlyIdle = !!liveIdleMap[emp.id];
      const currentIdleSecs = liveIdleMap[emp.id] ?? 0;
      return { emp, totalWorkingMs, totalIdleMs, activeWorkingMs, idleEvents: entries.length, productivityPct, isCurrentlyIdle, currentIdleSecs, entries };
    });
  }, [employees, filteredLog, attendanceLog, liveIdleMap, windowStart, windowEnd, now]);

  // ── Totales ──
  const totals = useMemo(() => {
    const withData = employeeStats.filter(s => s.totalWorkingMs > 0);
    const avgPct = withData.length
      ? Math.round(withData.reduce((sum, s) => sum + s.productivityPct, 0) / withData.length)
      : 100;
    return { avgPct, currentlyIdleCount: employeeStats.filter(s => s.isCurrentlyIdle).length, total: employeeStats.length };
  }, [employeeStats]);

  const selectedStats = selectedEmployee === 'all'
    ? null : employeeStats.find(s => s.emp.id === selectedEmployee) ?? null;

  // ── Línea de tiempo del empleado seleccionado ──
  // Para "hoy" mostramos el día completo. Para otros períodos, agrupamos por día.
  const timelineDays = useMemo(() => {
    if (!selectedStats) return [];
    const empId = selectedStats.emp.id;
    const empIdleEntries = selectedStats.entries;

    if (dateFilter === 'today') {
      const dayStart = new Date(now).setHours(0,0,0,0);
      const dayEnd   = now;
      return [{ date: dayStart, segments: buildTimeline(empId, attendanceLog, empIdleEntries, dayStart, dayEnd) }];
    }

    // Para semana/mes/todo: un día por fila
    const days: { date: number; segments: TimeSegment[] }[] = [];
    const start = new Date(windowStart);
    start.setHours(0,0,0,0);
    const end = new Date(windowEnd);
    end.setHours(23,59,59,999);

    let cur = new Date(start);
    while (cur <= end) {
      const dayStart = cur.setHours(0,0,0,0);
      const dayEnd   = Math.min(new Date(dayStart).setHours(23,59,59,999), now);
      const segs = buildTimeline(empId, attendanceLog, empIdleEntries, dayStart, dayEnd);
      const hasActivity = segs.some(s => s.type !== 'clocked-out');
      if (hasActivity) days.push({ date: dayStart, segments: segs });
      cur = new Date(dayStart);
      cur.setDate(cur.getDate() + 1);
    }
    return days.reverse(); // más reciente primero
  }, [selectedStats, dateFilter, attendanceLog, windowStart, windowEnd, now]);

  const DATE_TABS: { key: DateFilter; label: string }[] = [
    { key: 'today', label: 'Hoy'    },
    { key: 'week',  label: '7 días' },
    { key: 'month', label: '30 días'},
    { key: 'all',   label: 'Todo'   },
  ];

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-bokara-grey tracking-tight">Productividad</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Tiempo Working = 100% · El idle en Working resta productividad
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {DATE_TABS.map(t => (
            <button key={t.key} onClick={() => setDateFilter(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                dateFilter === t.key ? 'bg-white text-bokara-grey shadow-sm' : 'text-gray-500 hover:text-bokara-grey'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="relative flex items-center justify-center w-[72px] h-[72px] shrink-0">
            <Ring pct={totals.avgPct} />
            <span className="absolute text-xs font-bold text-bokara-grey">{totals.avgPct}%</span>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Productividad promedio</p>
            <p className="text-xl font-bold text-bokara-grey">{productivityLabel(totals.avgPct)}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${totals.currentlyIdleCount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <span className="text-2xl">{totals.currentlyIdleCount > 0 ? '😴' : '✅'}</span>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Inactivos ahora</p>
            <p className="text-xl font-bold text-bokara-grey">
              {totals.currentlyIdleCount}<span className="text-sm text-gray-400 font-normal"> / {totals.total}</span>
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <span className="text-2xl">⏱</span>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Eventos de inactividad</p>
            <p className="text-xl font-bold text-bokara-grey">{filteredLog.length}</p>
          </div>
        </div>
      </div>

      {/* Employee grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {employeeStats.map(({ emp, productivityPct, totalIdleMs, totalWorkingMs, idleEvents, isCurrentlyIdle, currentIdleSecs }) => (
          <button key={emp.id}
            onClick={() => setSelectedEmployee(prev => prev === emp.id ? 'all' : emp.id)}
            className={`text-left bg-white rounded-2xl p-5 shadow-sm border transition-all hover:shadow-md ${
              selectedEmployee === emp.id ? 'border-lucius-lime ring-2 ring-lucius-lime/30' : 'border-gray-100'
            }`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lucius-lime/60 to-lucius-lime flex items-center justify-center text-sm font-bold text-bokara-grey shrink-0">
                  {emp.avatarUrl
                    ? <img src={emp.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                    : emp.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-bokara-grey text-sm leading-tight">{emp.name}</p>
                  <p className="text-xs text-gray-400">{emp.status}</p>
                </div>
              </div>
              <div className="relative flex items-center justify-center w-[52px] h-[52px]">
                <Ring pct={productivityPct} size={52} stroke={5} />
                <span className="absolute text-[10px] font-bold text-bokara-grey">{productivityPct}%</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <span>🕐 {idleEvents} evento{idleEvents !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>⏸ {fmt(totalIdleMs)} inactivo</span>
              {totalWorkingMs > 0 && <><span>·</span><span>▶ {fmt(totalWorkingMs)} working</span></>}
            </div>
            {isCurrentlyIdle && <div className="mt-2"><IdleBadge minutes={Math.floor(currentIdleSecs / 60)} /></div>}
            <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${productivityPct}%`, backgroundColor: productivityColor(productivityPct) }} />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>{productivityLabel(productivityPct)}</span>
              <span>{productivityPct}%</span>
            </div>
          </button>
        ))}
        {employeeStats.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📊</p>
            <p className="font-medium">No hay colaboradores registrados</p>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedStats && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">

          {/* Header del panel */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-bokara-grey text-lg">{selectedStats.emp.name}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Working: <span className="font-semibold text-bokara-grey">{fmt(selectedStats.totalWorkingMs)}</span>
                &nbsp;·&nbsp;
                Inactivo: <span className="font-semibold text-red-500">{fmt(selectedStats.totalIdleMs)}</span>
                &nbsp;·&nbsp;
                Activo: <span className="font-semibold text-green-600">{fmt(selectedStats.activeWorkingMs)}</span>
              </p>
            </div>
            <button onClick={() => setSelectedEmployee('all')} className="text-sm text-gray-400 hover:text-bokara-grey">
              ✕ Cerrar
            </button>
          </div>

          {/* ── Línea de tiempo ── */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-bokara-grey">Línea de tiempo</h3>
            {timelineDays.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Sin actividad en el período seleccionado</p>
            ) : (
              timelineDays.map(day => (
                <div key={day.date} className="space-y-1">
                  {dateFilter !== 'today' && (
                    <p className="text-xs font-semibold text-gray-500">{fmtDate(day.date)}</p>
                  )}
                  <DayTimeline
                    segments={day.segments}
                    dayStart={new Date(day.date).setHours(0,0,0,0)}
                    dayEnd={Math.min(new Date(day.date).setHours(23,59,59,999), now)}
                  />
                </div>
              ))
            )}
          </div>

          {/* ── Tabla de eventos idle ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-bokara-grey">Eventos de inactividad</h3>
            {selectedStats.entries.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Sin eventos de inactividad 🎉</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                      <th className="text-left py-2 pr-4">Fecha</th>
                      <th className="text-left py-2 pr-4">Inicio</th>
                      <th className="text-left py-2 pr-4">Retorno</th>
                      <th className="text-left py-2 pr-4">Duración</th>
                      <th className="text-left py-2">Umbral</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {selectedStats.entries.map(entry => {
                      const durationMs = entry.resumedAt
                        ? entry.resumedAt - entry.idleStartedAt
                        : now - entry.idleStartedAt;
                      const isOngoing = !entry.resumedAt;
                      return (
                        <tr key={entry.id} className={isOngoing ? 'bg-red-50/50' : ''}>
                          <td className="py-2.5 pr-4 text-gray-500">{fmtDate(entry.idleStartedAt)}</td>
                          <td className="py-2.5 pr-4 font-medium text-bokara-grey">{fmtTime(entry.idleStartedAt)}</td>
                          <td className="py-2.5 pr-4">
                            {entry.resumedAt
                              ? <span className="text-green-600 font-medium">{fmtTime(entry.resumedAt)}</span>
                              : <span className="text-red-500 font-bold animate-pulse">En curso…</span>}
                          </td>
                          <td className="py-2.5 pr-4">
                            <span className={`font-semibold ${isOngoing ? 'text-red-500' : 'text-bokara-grey'}`}>
                              {fmt(durationMs)}
                            </span>
                          </td>
                          <td className="py-2.5 text-gray-400 text-xs">{entry.thresholdMinutes}m</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductivityPage;