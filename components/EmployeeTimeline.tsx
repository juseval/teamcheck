import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Employee, AttendanceLogEntry, ActivityStatus } from '../types';

interface Segment {
  id: string;
  employeeId: string;
  employeeName: string;
  activity: string;
  startTime: number;
  endTime: number;
  color: string;
  lane: number;
  isOngoing: boolean;
}

type ViewMode = 'day' | 'week' | 'month';

interface GridHeader {
  label: string;
  isWeekend?: boolean;
}

const EmployeeTimeline: React.FC<{
  employees: Employee[];
  attendanceLog: AttendanceLogEntry[];
  activityStatuses: ActivityStatus[];
}> = ({ employees, attendanceLog, activityStatuses }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [now, setNow] = useState(Date.now());
  const [view, setView] = useState<ViewMode>('day');
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000 * 60);
    return () => clearInterval(timer);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - timelineContainerRef.current.offsetLeft);
    setScrollLeft(timelineContainerRef.current.scrollLeft);
    timelineContainerRef.current.style.cursor = 'grabbing';
    timelineContainerRef.current.style.userSelect = 'none';
  };

  const handleMouseLeaveOrUp = () => {
    if (!timelineContainerRef.current) return;
    setIsDragging(false);
    timelineContainerRef.current.style.cursor = 'grab';
    timelineContainerRef.current.style.userSelect = 'auto';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !timelineContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - timelineContainerRef.current.offsetLeft;
    timelineContainerRef.current.scrollLeft = scrollLeft - (x - startX) * 2;
  };

  const statusColorMap = useMemo(() => {
    const map = new Map<string, string>();
    activityStatuses.forEach(s => map.set(s.name, s.color));
    map.set('Working', '#91A673');
    return map;
  }, [activityStatuses]);

  const sortedEmployees = useMemo(() =>
    [...employees].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })),
    [employees]
  );

  const { laidOutSegments, dayBoundaries, gridHeaders, employeeLanes } = useMemo(() => {
    const calculationNow = Date.now();

    // ── Calcular boundaries del período visible ──
    const dayStart = new Date(selectedDate);
    let dayEnd: Date;
    let headers: GridHeader[] = [];

    if (view === 'day') {
      dayStart.setHours(0, 0, 0, 0);
      dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      headers = Array.from({ length: 24 }, (_, i) => ({
        label: `${i.toString().padStart(2, '0')}:00`,
      }));
    } else if (view === 'week') {
      const dow = dayStart.getDay();
      dayStart.setDate(dayStart.getDate() - dow);
      dayStart.setHours(0, 0, 0, 0);
      dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 6);
      dayEnd.setHours(23, 59, 59, 999);
      headers = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(dayStart);
        date.setDate(date.getDate() + i);
        return {
          label: `${date.toLocaleDateString(undefined, { weekday: 'short' })} ${date.getDate()}`,
          isWeekend: date.getDay() === 0 || date.getDay() === 6,
        };
      });
    } else {
      dayStart.setDate(1);
      dayStart.setHours(0, 0, 0, 0);
      dayEnd = new Date(dayStart.getFullYear(), dayStart.getMonth() + 1, 0);
      dayEnd.setHours(23, 59, 59, 999);
      headers = Array.from({ length: dayEnd.getDate() }, (_, i) => {
        const date = new Date(dayStart);
        date.setDate(date.getDate() + i);
        return {
          label: (i + 1).toString(),
          isWeekend: date.getDay() === 0 || date.getDay() === 6,
        };
      });
    }

    const dayStartTs = dayStart.getTime();
    const dayEndTs   = dayEnd.getTime();

    // ── El techo real de cualquier segmento es el mínimo entre ahora y el fin del período ──
    // Esto evita que se pinten barras en el futuro.
    const ceilTs = Math.min(calculationNow, dayEndTs);

    const employeeLaneMap = new Map<string, { lane: number; name: string }>();
    sortedEmployees.forEach((emp, index) => {
      employeeLaneMap.set(emp.id, { lane: index, name: emp.name });
    });

    const allSegments: Omit<Segment, 'lane'>[] = [];

    for (const employee of sortedEmployees) {
      const employeeLog = attendanceLog
        .filter(log => log.employeeId === employee.id)
        .sort((a, b) => a.timestamp - b.timestamp);

      for (let i = 0; i < employeeLog.length; i++) {
        const currentLog = employeeLog[i];

        // Clock Out no genera segmento
        if (currentLog.action === 'Clock Out') continue;

        const activity = currentLog.action.startsWith('Start ')
          ? currentLog.action.substring(6)
          : 'Working';

        const segmentStart = currentLog.timestamp;
        let segmentEnd: number;
        let isOngoing = false;

        const nextLog = employeeLog[i + 1];

        if (nextLog) {
          // ── Caso normal: hay un log siguiente ──
          // El segmento termina cuando empieza el siguiente evento.
          // Nunca puede terminar en el futuro.
          segmentEnd = Math.min(nextLog.timestamp, ceilTs);

        } else {
          // ── Último log del empleado: sin log siguiente ──

          // Si el empleado ya está Clocked Out → sesión cerrada, no pintar segmento abierto
          if (employee.status === 'Clocked Out') continue;

          // El empleado sigue activo. Solo pintar si es genuinamente el segmento actual:
          // la actividad del segmento debe coincidir con el estado actual del empleado.
          const currentActivity = employee.status === 'Working'
            ? 'Working'
            : employee.status; // ej. "Break", "Lunch"

          if (activity !== currentActivity) continue;

          // Verificar que el timestamp de inicio coincide con lo registrado en Firestore
          // (currentStatusStartTime para actividades, lastClockInTime para Working)
          const expectedStart = activity === 'Working'
            ? (employee.lastClockInTime ?? employee.currentStatusStartTime)
            : employee.currentStatusStartTime;

          // Tolerancia de 5 segundos para evitar falsas no-coincidencias por latencia
          const TOLERANCE_MS = 5000;
          if (expectedStart !== null && expectedStart !== undefined) {
            if (Math.abs(segmentStart - expectedStart) > TOLERANCE_MS) continue;
          }

          // Segmento activo válido → termina ahora (nunca más allá de ahora)
          segmentEnd = ceilTs;
          isOngoing  = true;
        }

        // Descartar segmentos que no intersectan el período visible
        if (segmentEnd <= dayStartTs || segmentStart >= dayEndTs) continue;
        // Nunca pintar más allá del momento actual
        if (segmentEnd > ceilTs) segmentEnd = ceilTs;
        // Descartar segmentos de duración cero o negativa
        if (segmentEnd <= segmentStart) continue;

        // Recortar al rango visible
        const clampedStart = Math.max(segmentStart, dayStartTs);
        const clampedEnd   = Math.min(segmentEnd, dayEndTs);

        if (clampedEnd > clampedStart) {
          allSegments.push({
            id: `${employee.id}-${currentLog.id}`,
            employeeId:   employee.id,
            employeeName: employee.name,
            activity,
            startTime: clampedStart,
            endTime:   clampedEnd,
            color:     statusColorMap.get(activity) || '#A0A0A0',
            isOngoing,
          });
        }
      }
    }

    const finalSegments: Segment[] = allSegments
      .map(s => ({ ...s, lane: employeeLaneMap.get(s.employeeId)?.lane ?? -1 }))
      .filter(s => s.lane !== -1);

    return {
      laidOutSegments: finalSegments,
      dayBoundaries: { start: dayStartTs, end: dayEndTs },
      gridHeaders: headers,
      employeeLanes: Array.from(employeeLaneMap.values()).sort((a, b) => a.lane - b.lane),
    };
  }, [selectedDate, attendanceLog, sortedEmployees, statusColorMap, now, view]);

  const handlePrev = () => setSelectedDate(d => {
    const nd = new Date(d);
    if (view === 'day')       nd.setDate(nd.getDate() - 1);
    else if (view === 'week') nd.setDate(nd.getDate() - 7);
    else                      nd.setMonth(nd.getMonth() - 1);
    return nd;
  });

  const handleNext = () => setSelectedDate(d => {
    const nd = new Date(d);
    if (view === 'day')       nd.setDate(nd.getDate() + 1);
    else if (view === 'week') nd.setDate(nd.getDate() + 7);
    else                      nd.setMonth(nd.getMonth() + 1);
    return nd;
  });

  const formatDateHeader = () => {
    if (view === 'day') return selectedDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    if (view === 'week') {
      const s = new Date(selectedDate); s.setDate(s.getDate() - s.getDay()); s.setHours(0, 0, 0, 0);
      const e = new Date(s); e.setDate(e.getDate() + 6);
      const sm = s.toLocaleDateString(undefined, { month: 'short' });
      const em = e.toLocaleDateString(undefined, { month: 'short' });
      if (s.getFullYear() !== e.getFullYear())
        return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} - ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
      if (sm !== em)
        return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${e.getFullYear()}`;
      return `${sm} ${s.getDate()} - ${e.getDate()}, ${e.getFullYear()}`;
    }
    return selectedDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  };

  const totalMs      = dayBoundaries.end - dayBoundaries.start;
  const isNowInRange = now >= dayBoundaries.start && now <= dayBoundaries.end;
  const nowPosition  = isNowInRange ? ((now - dayBoundaries.start) / totalMs) * 100 : -1;
  const containerMinWidth = view === 'day' ? 1400 : view === 'week' ? 900 : 1600;

  return (
    <div className="w-full bg-white rounded-xl shadow-md p-6 border border-bokara-grey/10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-bokara-grey">Live Activity Timeline</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 rounded-lg bg-whisper-white p-1 border border-bokara-grey/10 shadow-inner">
            {(['day', 'week', 'month'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${view === v ? 'bg-lucius-lime text-bokara-grey' : 'text-bokara-grey/70 hover:bg-white'}`}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button onClick={handlePrev} className="p-1.5 rounded-md hover:bg-whisper-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <button onClick={handleNext} className="p-1.5 rounded-md hover:bg-whisper-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
            <span className="text-lg font-semibold w-64 text-center">{formatDateHeader()}</span>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Employee names column */}
        <div className="w-48 flex-shrink-0">
          <div className="h-8 border-b-2 border-bokara-grey/10 flex items-center p-2">
            <span className="font-semibold text-sm text-bokara-grey/80">Employee</span>
          </div>
          <div className="relative">
            {employeeLanes.map(emp => (
              <div key={emp.lane}
                className="h-12 flex items-center p-2 border-b border-r border-bokara-grey/10 truncate"
                style={{ top: `${emp.lane * 48}px` }}>
                <span className="text-sm font-medium text-bokara-grey" title={emp.name}>{emp.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline grid */}
        <div className="flex-grow overflow-x-auto cursor-grab"
          ref={timelineContainerRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeaveOrUp}
          onMouseUp={handleMouseLeaveOrUp}
          onMouseMove={handleMouseMove}>
          <div style={{ minWidth: `${containerMinWidth}px` }} className="relative h-auto pb-4">

            {/* Hour/day headers */}
            <div className="relative flex h-8 border-b-2 border-bokara-grey/10">
              {gridHeaders.map((header, index) => (
                <div key={index}
                  className={`flex-1 text-center text-xs text-bokara-grey/60 border-r border-bokara-grey/10 pt-2 ${header.isWeekend ? 'bg-bokara-grey/5' : ''}`}>
                  {header.label}
                </div>
              ))}
            </div>

            {/* Segments area */}
            <div className="relative" style={{ minHeight: '4rem', height: `${employeeLanes.length * 48}px` }}>

              {/* Vertical grid lines */}
              {gridHeaders.map((header, index) => (
                <div key={index}
                  className={`absolute top-0 bottom-0 border-r border-bokara-grey/10 ${header.isWeekend ? 'bg-bokara-grey/5' : ''}`}
                  style={{ left: `${(index / gridHeaders.length) * 100}%`, width: `${(1 / gridHeaders.length) * 100}%` }}
                />
              ))}

              {/* Current time indicator */}
              {isNowInRange && nowPosition > 0 && (
                <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                  style={{ left: `${nowPosition}%` }}>
                  <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
                </div>
              )}

              {/* Activity segments */}
              {laidOutSegments.map(segment => {
                const left  = ((segment.startTime - dayBoundaries.start) / totalMs) * 100;
                const width = ((segment.endTime   - segment.startTime)   / totalMs) * 100;
                return (
                  <div key={segment.id}
                    className="absolute h-10 rounded-lg p-2 flex items-center shadow-sm transition-all duration-200"
                    style={{
                      left:  `calc(${left}%  + 2px)`,
                      width: `calc(${width}% - 4px)`,
                      top:   `${segment.lane * 48 + 4}px`,
                      backgroundColor: segment.color,
                    }}
                    title={`${segment.employeeName}: ${segment.activity}`}>
                    <span className="text-white text-sm font-semibold truncate select-none">
                      {segment.activity}
                    </span>
                    {segment.isOngoing && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full animate-pulse mr-2" />
                    )}
                  </div>
                );
              })}

              {employees.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-bokara-grey/60">No employees to display.</p>
                </div>
              )}
              {employees.length > 0 && laidOutSegments.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-bokara-grey/60">No activity recorded for this period.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeTimeline;