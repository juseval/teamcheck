import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Employee, WorkSchedule } from '../types';

interface EmployeeScheduleBoardProps {
  employees: Employee[];
  workSchedules: WorkSchedule[];
  onUpdateEmployeeSchedule: (employeeId: string, newScheduleId: string | null) => void;
}

const EmployeeScheduleBoard: React.FC<EmployeeScheduleBoardProps> = ({ employees, workSchedules, onUpdateEmployeeSchedule }) => {
  const [draggedEmployeeId, setDraggedEmployeeId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Board drag-to-scroll (click + drag)
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDraggingBoard, setIsDraggingBoard] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Auto-scroll during card drag
  const autoScrollRef = useRef<number | null>(null);
  const EDGE_SIZE = 120;   // px desde el borde donde empieza el auto-scroll
  const SCROLL_SPEED = 12; // px por frame

  // Limpia el intervalo de auto-scroll
  const stopAutoScroll = () => {
    if (autoScrollRef.current !== null) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  };

  // Inicia auto-scroll hacia una dirección
  const startAutoScroll = (direction: 'left' | 'right') => {
    stopAutoScroll();
    const step = () => {
      if (!scrollContainerRef.current) return;
      scrollContainerRef.current.scrollLeft += direction === 'right' ? SCROLL_SPEED : -SCROLL_SPEED;
      autoScrollRef.current = requestAnimationFrame(step);
    };
    autoScrollRef.current = requestAnimationFrame(step);
  };

  // Se llama en cada dragover para decidir si scrollear
  const handleDragOverBoard = (e: React.DragEvent) => {
    if (!draggedEmployeeId || !scrollContainerRef.current) return;
    const rect = scrollContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (x < EDGE_SIZE) {
      startAutoScroll('left');
    } else if (x > rect.width - EDGE_SIZE) {
      startAutoScroll('right');
    } else {
      stopAutoScroll();
    }
  };

  // Limpia el auto-scroll al soltar o salir
  useEffect(() => {
    return () => stopAutoScroll();
  }, []);

  // Group employees by schedule
  const columns = useMemo(() => {
    const cols: Record<string, Employee[]> = { unassigned: [] };
    workSchedules.forEach(s => { cols[s.id] = []; });
    employees.forEach(emp => {
      const sid = emp.workScheduleId || 'unassigned';
      if (cols[sid]) cols[sid].push(emp);
      else cols['unassigned'].push(emp);
    });
    return cols;
  }, [employees, workSchedules]);

  // --- Employee Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, employeeId: string) => {
    e.stopPropagation();
    setDraggedEmployeeId(employeeId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, scheduleId: string) => {
    e.preventDefault();
    if (dragOverColumn !== scheduleId) setDragOverColumn(scheduleId);
  };

  const handleDrop = (e: React.DragEvent, scheduleId: string) => {
    e.preventDefault();
    stopAutoScroll();
    setDragOverColumn(null);
    if (draggedEmployeeId) {
      onUpdateEmployeeSchedule(draggedEmployeeId, scheduleId === 'unassigned' ? null : scheduleId);
      setDraggedEmployeeId(null);
    }
  };

  const handleDragEnd = () => {
    stopAutoScroll();
    setDraggedEmployeeId(null);
    setDragOverColumn(null);
  };

  // --- Board click-drag-to-scroll ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDraggingBoard(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => setIsDraggingBoard(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingBoard || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    scrollContainerRef.current.scrollLeft = scrollLeft - (x - startX) * 2;
  };

  const getInitials = (name: string = '') => {
    const trimmed = name.trim();
    if (!trimmed) return '??';
    const parts = trimmed.split(' ');
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : trimmed.substring(0, 2).toUpperCase();
  };

  const EmployeeCard = ({ employee, isUnassigned }: { employee: Employee; isUnassigned?: boolean }) => (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, employee.id)}
      onDragEnd={handleDragEnd}
      onMouseDown={(e) => e.stopPropagation()}
      className={`bg-white p-3 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all
        ${isUnassigned
          ? 'border border-gray-200'
          : 'border-l-4 border-l-lucius-lime border-y border-r border-gray-100'}
        ${draggedEmployeeId === employee.id ? 'opacity-40 scale-95' : 'opacity-100'}`}
    >
      <div className="flex items-center gap-3">
        {employee.avatarUrl ? (
          <img src={employee.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isUnassigned ? 'bg-gray-200 text-gray-600' : 'bg-lucius-lime/10 text-lucius-lime'}`}>
            {getInitials(employee.name)}
          </div>
        )}
        <div className="overflow-hidden">
          <p className="font-bold text-bokara-grey truncate text-sm">{employee.name}</p>
          <p className="text-xs text-gray-500 truncate">
            {isUnassigned ? (employee.role === 'admin' ? 'Administrador' : 'Colaborador') : employee.location}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div
      ref={scrollContainerRef}
      className={`flex gap-6 overflow-x-auto pb-4 h-full w-full items-start select-none ${isDraggingBoard && !draggedEmployeeId ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeaveOrUp}
      onMouseUp={handleMouseLeaveOrUp}
      onMouseMove={handleMouseMove}
      onDragOver={handleDragOverBoard}
      onDragLeave={() => stopAutoScroll()}
    >
      {/* ── Indicador visual de zona de auto-scroll ── */}
      {draggedEmployeeId && (
        <>
          <div className="fixed left-0 top-0 w-28 h-full z-50 pointer-events-none"
            style={{ background: 'linear-gradient(to right, rgba(145,166,115,0.18), transparent)' }}>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 opacity-70">
              <svg className="w-6 h-6 text-lucius-lime animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
              <span className="text-[9px] font-bold text-lucius-lime uppercase tracking-wider">scroll</span>
            </div>
          </div>
          <div className="fixed right-0 top-0 w-28 h-full z-50 pointer-events-none"
            style={{ background: 'linear-gradient(to left, rgba(145,166,115,0.18), transparent)' }}>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 opacity-70">
              <svg className="w-6 h-6 text-lucius-lime animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
              <span className="text-[9px] font-bold text-lucius-lime uppercase tracking-wider">scroll</span>
            </div>
          </div>
        </>
      )}

      {/* ── Columna Sin Horario ── */}
      <div
        className={`flex-shrink-0 w-80 flex flex-col rounded-xl transition-colors duration-200 border h-full max-h-full ${
          dragOverColumn === 'unassigned' ? 'bg-gray-100 border-lucius-lime border-2 border-dashed' : 'bg-gray-50 border-gray-200'
        }`}
        onDragOver={(e) => handleDragOver(e, 'unassigned')}
        onDrop={(e) => handleDrop(e, 'unassigned')}
      >
        <div className="p-4 border-b border-gray-200 bg-gray-100 rounded-t-xl sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-bokara-grey">Sin Horario</h3>
            <span className="bg-gray-300 text-bokara-grey text-xs font-bold px-2 py-1 rounded-full">{columns['unassigned'].length}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Arrastra aquí para desasignar</p>
        </div>
        <div className="p-3 flex-grow overflow-y-auto space-y-3 min-h-0">
          {columns['unassigned'].map(emp => <EmployeeCard key={emp.id} employee={emp} isUnassigned />)}
        </div>
      </div>

      {/* ── Columnas de Horarios ── */}
      {workSchedules.map(schedule => (
        <div
          key={schedule.id}
          className={`flex-shrink-0 w-80 flex flex-col rounded-xl transition-colors duration-200 border h-full max-h-full ${
            dragOverColumn === schedule.id ? 'bg-lucius-lime/5 border-lucius-lime border-2 border-dashed' : 'bg-white border-bokara-grey/10 shadow-sm'
          }`}
          onDragOver={(e) => handleDragOver(e, schedule.id)}
          onDrop={(e) => handleDrop(e, schedule.id)}
        >
          <div className="p-4 border-b border-bokara-grey/10 bg-whisper-white/30 rounded-t-xl sticky top-0 z-10">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-bokara-grey truncate w-48" title={schedule.name}>{schedule.name}</h3>
              <span className="bg-lucius-lime/20 text-bokara-grey text-xs font-bold px-2 py-1 rounded-full">{columns[schedule.id]?.length || 0}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-bokara-grey/60 font-mono">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {schedule.startTime} - {schedule.endTime}
            </div>
          </div>
          <div className="p-3 flex-grow overflow-y-auto space-y-3 min-h-0">
            {columns[schedule.id]?.map(emp => <EmployeeCard key={emp.id} employee={emp} />)}
            {columns[schedule.id]?.length === 0 && (
              <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-lg text-gray-300">
                <p className="text-xs">Arrastra colaboradores aquí</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default EmployeeScheduleBoard;