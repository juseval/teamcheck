import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Employee, AttendanceLogEntry, ActivityStatus } from '../types.ts';

// Segment type for processed activities
interface Segment {
  id: string;
  employeeId: number;
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
  const containerRef = useRef<HTMLDivElement>(null);

  // State for mouse dragging
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000 * 60); // Update every minute
    return () => clearInterval(timer);
  }, []);
  
  // Mouse event handlers for drag-to-scroll
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    // Capture the starting position and scroll offset
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
    // Improve UX by changing cursor and preventing text selection
    containerRef.current.style.cursor = 'grabbing';
    containerRef.current.style.userSelect = 'none';
  };

  const handleMouseLeaveOrUp = () => {
    if (!containerRef.current) return;
    setIsDragging(false);
    containerRef.current.style.cursor = 'grab';
    containerRef.current.style.userSelect = 'auto';
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // The multiplier can be adjusted for scroll speed
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const statusColorMap = useMemo(() => {
    const map = new Map<string, string>();
    activityStatuses.forEach(s => map.set(s.name, s.color));
    map.set('Working', '#91A673');
    return map;
  }, [activityStatuses]);

  const { laidOutSegments, dayBoundaries, gridHeaders } = useMemo(() => {
    const calculationNow = Date.now();
    const dayStart = new Date(selectedDate);
    let dayEnd: Date;
    let headers: GridHeader[] = [];

    if (view === 'day') {
        dayStart.setHours(0, 0, 0, 0);
        dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        headers = Array.from({ length: 24 }, (_, i) => ({ label: `${i.toString().padStart(2, '0')}:00` }));
    } else if (view === 'week') {
        const dayOfWeek = dayStart.getDay();
        dayStart.setDate(dayStart.getDate() - dayOfWeek);
        dayStart.setHours(0, 0, 0, 0);
        dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 6);
        dayEnd.setHours(23, 59, 59, 999);
        headers = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(dayStart);
            date.setDate(date.getDate() + i);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            return { label: `${date.toLocaleDateString(undefined, { weekday: 'short' })} ${date.getDate()}`, isWeekend };
        });
    } else { // month
        dayStart.setDate(1);
        dayStart.setHours(0, 0, 0, 0);
        dayEnd = new Date(dayStart.getFullYear(), dayStart.getMonth() + 1, 0);
        dayEnd.setHours(23, 59, 59, 999);
        const daysInMonth = dayEnd.getDate();
        headers = Array.from({ length: daysInMonth }, (_, i) => {
            const date = new Date(dayStart);
            date.setDate(date.getDate() + i);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            return { label: (i + 1).toString(), isWeekend };
        });
    }
    
    const dayStartTs = dayStart.getTime();
    const dayEndTs = dayEnd.getTime();
    
    const allSegments: Omit<Segment, 'lane'>[] = [];
    for (const employee of employees) {
      const employeeLog = attendanceLog
        .filter(log => log.employeeId === employee.id)
        .sort((a, b) => a.timestamp - b.timestamp);

      for (let i = 0; i < employeeLog.length; i++) {
        const currentLog = employeeLog[i];
        if (currentLog.action === 'Clock Out') continue;

        let activity = currentLog.action.startsWith('Start ') ? currentLog.action.substring(6) : 'Working';
        const startTime = currentLog.timestamp;
        let endTime;
        let isOngoing = false;

        const nextLog = employeeLog[i + 1];
        if (nextLog) {
            endTime = nextLog.timestamp;
        } else if (employee.status !== 'Clocked Out' && employee.status === activity && employee.currentStatusStartTime === startTime) {
            endTime = calculationNow;
            isOngoing = true;
        } else {
            continue;
        }
        
        const clampedStartTime = Math.max(startTime, dayStartTs);
        const clampedEndTime = Math.min(endTime, dayEndTs);

        if (clampedEndTime > clampedStartTime) {
          allSegments.push({
            id: `${employee.id}-${currentLog.id}`,
            employeeId: employee.id,
            employeeName: employee.name,
            activity,
            startTime: clampedStartTime,
            endTime: clampedEndTime,
            color: statusColorMap.get(activity) || '#A0A0A0',
            isOngoing,
          });
        }
      }
    }
    
    allSegments.sort((a, b) => a.startTime - b.startTime);

    const lanes: { endTime: number }[] = [];
    const finalSegments: Segment[] = [];

    for (const segment of allSegments) {
      let placedInLane = -1;
      for (let i = 0; i < lanes.length; i++) {
        if (segment.startTime >= lanes[i].endTime) {
          lanes[i].endTime = segment.endTime;
          placedInLane = i;
          break;
        }
      }
      if (placedInLane === -1) {
        lanes.push({ endTime: segment.endTime });
        placedInLane = lanes.length - 1;
      }
      finalSegments.push({ ...segment, lane: placedInLane });
    }

    return { laidOutSegments: finalSegments, dayBoundaries: { start: dayStartTs, end: dayEndTs }, gridHeaders: headers };
  }, [selectedDate, attendanceLog, employees, statusColorMap, now, view]);

  const handlePrev = () => setSelectedDate(d => {
    const newDate = new Date(d);
    if (view === 'day') newDate.setDate(newDate.getDate() - 1);
    else if (view === 'week') newDate.setDate(newDate.getDate() - 7);
    else newDate.setMonth(newDate.getMonth() - 1);
    return newDate;
  });

  const handleNext = () => setSelectedDate(d => {
    const newDate = new Date(d);
    if (view === 'day') newDate.setDate(newDate.getDate() + 1);
    else if (view === 'week') newDate.setDate(newDate.getDate() + 7);
    else newDate.setMonth(newDate.getMonth() + 1);
    return newDate;
  });

  const formatDateHeader = () => {
    if (view === 'day') return selectedDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    if (view === 'week') {
        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        const startMonth = startOfWeek.toLocaleDateString(undefined, { month: 'short' });
        const endMonth = endOfWeek.toLocaleDateString(undefined, { month: 'short' });

        if (startOfWeek.getFullYear() !== endOfWeek.getFullYear()) {
            return `${startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} - ${endOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
        if (startMonth !== endMonth) {
             return `${startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${endOfWeek.getFullYear()}`;
        }
        return `${startMonth} ${startOfWeek.getDate()} - ${endOfWeek.getDate()}, ${endOfWeek.getFullYear()}`;
    }
    return selectedDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  };

  const totalMs = dayBoundaries.end - dayBoundaries.start;
  const isNowInRange = now >= dayBoundaries.start && now <= dayBoundaries.end;
  const nowPosition = isNowInRange ? ((now - dayBoundaries.start) / totalMs) * 100 : -1;
  const containerMinWidth = view === 'day' ? 1400 : view === 'week' ? 900 : 1600;

  return (
    <div className="w-full bg-white rounded-xl shadow-md p-6 border border-bokara-grey/10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-bokara-grey">Live Activity Timeline</h2>
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 rounded-lg bg-whisper-white p-1 border border-bokara-grey/10 shadow-inner">
                {(['day', 'week', 'month'] as ViewMode[]).map(v => (
                    <button key={v} onClick={() => setView(v)} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${view === v ? 'bg-lucius-lime text-bokara-grey' : 'text-bokara-grey/70 hover:bg-white'}`}>
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                    <button onClick={handlePrev} className="p-1.5 rounded-md hover:bg-whisper-white transition-colors" aria-label={`Previous ${view}`}>
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                     <button onClick={handleNext} className="p-1.5 rounded-md hover:bg-whisper-white transition-colors" aria-label={`Next ${view}`}>
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                     </button>
                </div>
                <span className="text-lg font-semibold w-64 text-center">{formatDateHeader()}</span>
              </div>
          </div>
      </div>

      <div 
        className="overflow-x-hidden cursor-grab"
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeaveOrUp}
        onMouseUp={handleMouseLeaveOrUp}
        onMouseMove={handleMouseMove}
      >
        <div style={{minWidth: `${containerMinWidth}px`}} className="relative h-auto pb-4">
          <div className="relative flex h-8 border-b-2 border-bokara-grey/10">
            {gridHeaders.map((header, index) => (
              <div key={index} className={`flex-1 text-center text-xs text-bokara-grey/60 border-r border-bokara-grey/10 pt-2 ${header.isWeekend ? 'bg-bokara-grey/5' : ''}`}>
                {header.label}
              </div>
            ))}
          </div>
          
          <div className="relative" style={{ minHeight: '4rem', height: `${laidOutSegments.reduce((max, seg) => Math.max(max, seg.lane + 1), 0) * 48}px`}}>
            {gridHeaders.map((header, index) => (
              <div key={index} className={`absolute top-0 bottom-0 border-r border-bokara-grey/10 ${header.isWeekend ? 'bg-bokara-grey/5' : ''}`} style={{ left: `${(index / gridHeaders.length) * 100}%`, width: `${(1 / gridHeaders.length) * 100}%`}}></div>
            ))}
            
            {isNowInRange && nowPosition > 0 && (
              <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20" style={{ left: `${nowPosition}%` }}>
                <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
              </div>
            )}
            
            {laidOutSegments.map(segment => {
              const left = ((segment.startTime - dayBoundaries.start) / totalMs) * 100;
              const width = ((segment.endTime - segment.startTime) / totalMs) * 100;
              
              return (
                <div 
                  key={segment.id}
                  className="absolute h-10 rounded-lg p-2 flex items-center shadow-sm group transition-all duration-200"
                  style={{
                    left: `calc(${left}% + 2px)`,
                    width: `calc(${width}% - 4px)`,
                    top: `${segment.lane * 48 + 4}px`,
                    backgroundColor: segment.color,
                  }}
                  title={`${segment.employeeName}: ${segment.activity}`}
                >
                  <span className="text-white text-sm font-semibold truncate select-none">
                    {`${segment.employeeName}: ${segment.activity}`}
                  </span>
                  {segment.isOngoing && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full animate-pulse mr-2"></div>}
                </div>
              );
            })}

            {laidOutSegments.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-bokara-grey/60">No activity recorded for this period.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeTimeline;