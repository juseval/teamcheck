
import React, { useState, useMemo } from 'react';
import { Employee, WorkSchedule } from '../types';

interface EmployeeScheduleBoardProps {
  employees: Employee[];
  workSchedules: WorkSchedule[];
  onUpdateEmployeeSchedule: (employeeId: string, newScheduleId: string | null) => void;
}

const EmployeeScheduleBoard: React.FC<EmployeeScheduleBoardProps> = ({ employees, workSchedules, onUpdateEmployeeSchedule }) => {
  const [draggedEmployeeId, setDraggedEmployeeId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Group employees by schedule
  const columns = useMemo(() => {
    const cols: Record<string, Employee[]> = {
      'unassigned': []
    };
    
    // Initialize columns for each schedule
    workSchedules.forEach(schedule => {
      cols[schedule.id] = [];
    });

    // Distribute employees
    employees.forEach(emp => {
      const scheduleId = emp.workScheduleId || 'unassigned';
      if (cols[scheduleId]) {
        cols[scheduleId].push(emp);
      } else {
        // Fallback for deleted schedules
        cols['unassigned'].push(emp);
      }
    });

    return cols;
  }, [employees, workSchedules]);

  const handleDragStart = (e: React.DragEvent, employeeId: string) => {
    setDraggedEmployeeId(employeeId);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent ghost image setup could go here if needed
  };

  const handleDragOver = (e: React.DragEvent, scheduleId: string) => {
    e.preventDefault(); // Necessary to allow dropping
    if (dragOverColumn !== scheduleId) {
      setDragOverColumn(scheduleId);
    }
  };

  const handleDrop = (e: React.DragEvent, scheduleId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedEmployeeId) {
      const targetScheduleId = scheduleId === 'unassigned' ? null : scheduleId;
      onUpdateEmployeeSchedule(draggedEmployeeId, targetScheduleId);
      setDraggedEmployeeId(null);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-220px)] items-start">
      {/* Render "Unassigned" Column First */}
      <div 
        className={`flex-shrink-0 w-80 flex flex-col rounded-xl transition-colors duration-200 border ${
            dragOverColumn === 'unassigned' ? 'bg-gray-100 border-lucius-lime border-2 border-dashed' : 'bg-gray-50 border-gray-200'
        }`}
        onDragOver={(e) => handleDragOver(e, 'unassigned')}
        onDrop={(e) => handleDrop(e, 'unassigned')}
        style={{ minHeight: '200px' }}
      >
        <div className="p-4 border-b border-gray-200 bg-gray-100 rounded-t-xl sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-bokara-grey">Sin Horario</h3>
            <span className="bg-gray-300 text-bokara-grey text-xs font-bold px-2 py-1 rounded-full">
              {columns['unassigned'].length}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Arrastra aquí para desasignar</p>
        </div>
        <div className="p-3 flex-grow overflow-y-auto space-y-3 custom-scrollbar">
          {columns['unassigned'].map(employee => (
            <div
              key={employee.id}
              draggable
              onDragStart={(e) => handleDragStart(e, employee.id)}
              className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                  {getInitials(employee.name)}
                </div>
                <div className="overflow-hidden">
                  <p className="font-bold text-bokara-grey truncate text-sm">{employee.name}</p>
                  <p className="text-xs text-gray-500 truncate">{employee.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Render Schedule Columns */}
      {workSchedules.map(schedule => (
        <div 
          key={schedule.id}
          className={`flex-shrink-0 w-80 flex flex-col rounded-xl transition-colors duration-200 border ${
            dragOverColumn === schedule.id ? 'bg-lucius-lime/5 border-lucius-lime border-2 border-dashed' : 'bg-white border-bokara-grey/10 shadow-sm'
          }`}
          onDragOver={(e) => handleDragOver(e, schedule.id)}
          onDrop={(e) => handleDrop(e, schedule.id)}
          style={{ minHeight: '200px' }}
        >
          <div className="p-4 border-b border-bokara-grey/10 bg-whisper-white/30 rounded-t-xl sticky top-0 z-10">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-bokara-grey truncate w-48" title={schedule.name}>{schedule.name}</h3>
              <span className="bg-lucius-lime/20 text-bokara-grey text-xs font-bold px-2 py-1 rounded-full">
                {columns[schedule.id]?.length || 0}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-bokara-grey/60 font-mono">
               <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               {schedule.startTime} - {schedule.endTime}
            </div>
          </div>
          
          <div className="p-3 flex-grow overflow-y-auto space-y-3 custom-scrollbar">
            {columns[schedule.id]?.map(employee => (
              <div
                key={employee.id}
                draggable
                onDragStart={(e) => handleDragStart(e, employee.id)}
                className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-l-lucius-lime border-y border-r border-gray-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                    {employee.avatarUrl ? (
                        <img src={employee.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-lucius-lime/10 flex items-center justify-center text-xs font-bold text-lucius-lime">
                        {getInitials(employee.name)}
                        </div>
                    )}
                  <div className="overflow-hidden">
                    <p className="font-bold text-bokara-grey truncate text-sm">{employee.name}</p>
                    <p className="text-xs text-gray-500 truncate">{employee.location}</p>
                  </div>
                </div>
              </div>
            ))}
            {columns[schedule.id]?.length === 0 && (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-lg">
                    <p className="text-xs text-gray-400">Arrastra empleados aquí</p>
                </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default EmployeeScheduleBoard;
