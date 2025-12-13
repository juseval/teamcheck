
import React, { useState } from 'react';
import { Employee, WorkSchedule } from '../types';
import { UserIcon, ClockIcon } from '../components/Icons';

interface EmployeesPageProps {
  employees: Employee[];
  onAddEmployee: () => void;
  // FIX: Changed employeeId type from number to string.
  onEditEmployee: (employeeId: string) => void;
  onUpdateEmployee: (employee: Employee) => void;
  // FIX: Changed employeeId type from number to string.
  onRemoveEmployee: (employeeId: string) => void;
  workSchedules: WorkSchedule[];
}

const EmployeesPage: React.FC<EmployeesPageProps> = ({ employees, onAddEmployee, onEditEmployee, onUpdateEmployee, onRemoveEmployee, workSchedules }) => {
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [draggingEmployeeId, setDraggingEmployeeId] = useState<string | null>(null);

  const tableHeaders = ["Name", "Email", "Phone", "Primary Location", "Role", "Horario", "Status", "Actions"];
  const scheduleMap = new Map(workSchedules.map(s => [s.id, s.name]));

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, employeeId: string) => {
    setDraggingEmployeeId(employeeId);
    e.dataTransfer.setData('text/plain', employeeId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetScheduleId: string | null) => {
    e.preventDefault();
    const employeeId = e.dataTransfer.getData('text/plain');
    
    if (employeeId) {
      const employee = employees.find(emp => emp.id === employeeId);
      if (employee && employee.workScheduleId !== targetScheduleId) {
        // Optimistic update handled by App.tsx through state propagation
        onUpdateEmployee({
          ...employee,
          workScheduleId: targetScheduleId
        });
      }
    }
    setDraggingEmployeeId(null);
  };

  // --- Render Functions ---

  const renderListView = () => (
    <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-whisper-white/50 border-b border-bokara-grey/10">
                {tableHeaders.map(header => (
                  <th key={header} className="p-4 text-sm font-semibold text-bokara-grey/80 uppercase tracking-wider whitespace-nowrap">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.length > 0 ? (
                employees.map(employee => (
                  <tr key={employee.id} className="border-b border-bokara-grey/10 hover:bg-whisper-white/40">
                    <td className="p-4 whitespace-nowrap font-semibold text-bokara-grey">{employee.name}</td>
                    <td className="p-4 whitespace-nowrap text-bokara-grey/90">{employee.email}</td>
                    <td className="p-4 whitespace-nowrap text-bokara-grey/90">{employee.phone}</td>
                    <td className="p-4 whitespace-nowrap text-bokara-grey/90">{employee.location}</td>
                    <td className="p-4 whitespace-nowrap text-bokara-grey/90 capitalize">{employee.role}</td>
                    <td className="p-4 whitespace-nowrap text-bokara-grey/90">{employee.workScheduleId ? scheduleMap.get(employee.workScheduleId) : 'N/A'}</td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        employee.status === 'Working' ? 'bg-lucius-lime/20 text-lucius-lime' :
                        employee.status === 'Clocked Out' ? 'bg-gray-200 text-gray-700' :
                        'bg-wet-sand/20 text-wet-sand'
                      }`}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={() => onEditEmployee(employee.id)} className="text-lucius-lime hover:text-lucius-lime/80 font-semibold text-sm">Edit</button>
                        <span className="text-bokara-grey/20">|</span>
                        <button onClick={() => onRemoveEmployee(employee.id)} className="text-red-500 hover:text-red-700 font-semibold text-sm">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={tableHeaders.length} className="text-center p-16">
                    <p className="text-bokara-grey/60">No employee data to display.</p>
                    <p className="text-bokara-grey/50 text-sm mt-2">Click 'Add Employee' to get started.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
  );

  const renderBoardView = () => {
    // 1. Group employees by schedule
    const unassignedEmployees = employees.filter(e => !e.workScheduleId || !scheduleMap.has(e.workScheduleId));
    
    return (
        <div className="flex gap-6 overflow-x-auto pb-6 animate-fade-in items-start h-[calc(100vh-200px)]">
            {/* Unassigned Column */}
            <div 
                className="flex-shrink-0 w-80 bg-[#F3F0E9] rounded-xl flex flex-col h-full border border-bokara-grey/10"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, null)}
            >
                <div className="p-4 border-b border-bokara-grey/10 bg-[#E5E0D6] rounded-t-xl sticky top-0 z-10">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-bokara-grey flex items-center gap-2">
                            <UserIcon /> Sin Asignar
                        </h3>
                        <span className="bg-white/50 text-bokara-grey text-xs font-bold px-2 py-0.5 rounded-full">{unassignedEmployees.length}</span>
                    </div>
                    <p className="text-xs text-bokara-grey/60 mt-1">Arrastra aquí para quitar horario</p>
                </div>
                <div className="p-3 flex-1 overflow-y-auto space-y-3">
                    {unassignedEmployees.map(emp => (
                        <div 
                            key={emp.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, emp.id)}
                            className="bg-white p-3 rounded-lg shadow-sm border border-bokara-grey/5 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-lucius-lime transition-all"
                        >
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-bokara-grey">{emp.name}</span>
                                <button onClick={() => onEditEmployee(emp.id)} className="text-bokara-grey/40 hover:text-lucius-lime"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg></button>
                            </div>
                            <p className="text-xs text-bokara-grey/60 mt-1">{emp.role}</p>
                        </div>
                    ))}
                    {unassignedEmployees.length === 0 && <div className="text-center text-bokara-grey/40 text-sm py-4 italic">Vacío</div>}
                </div>
            </div>

            {/* Schedule Columns */}
            {workSchedules.map(schedule => {
                const scheduleEmployees = employees.filter(e => e.workScheduleId === schedule.id);
                return (
                    <div 
                        key={schedule.id}
                        className="flex-shrink-0 w-80 bg-white rounded-xl flex flex-col h-full border border-bokara-grey/10 shadow-sm"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, schedule.id)}
                    >
                        <div className="p-4 border-b border-bokara-grey/10 bg-whisper-white/30 rounded-t-xl sticky top-0 z-10">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-bokara-grey text-lg">{schedule.name}</h3>
                                <span className="bg-lucius-lime/20 text-bokara-grey text-xs font-bold px-2 py-0.5 rounded-full">{scheduleEmployees.length}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-bokara-grey/80 bg-white px-2 py-1 rounded border border-bokara-grey/5 w-fit">
                                <ClockIcon className="w-4 h-4 text-lucius-lime" />
                                <span className="font-mono font-medium">{schedule.startTime} - {schedule.endTime}</span>
                            </div>
                        </div>
                        <div className="p-3 flex-1 overflow-y-auto space-y-3 bg-gray-50/50">
                            {scheduleEmployees.map(emp => (
                                <div 
                                    key={emp.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, emp.id)}
                                    className="bg-white p-3 rounded-lg shadow-sm border border-bokara-grey/5 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-lucius-lime transition-all group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-lucius-lime/10 flex items-center justify-center text-xs font-bold text-bokara-grey border border-lucius-lime/20">
                                                {emp.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-bokara-grey text-sm">{emp.name}</p>
                                                <p className="text-[10px] text-bokara-grey/60 uppercase tracking-wide">{emp.role}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => onEditEmployee(emp.id)} className="text-bokara-grey/20 hover:text-lucius-lime opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                             {scheduleEmployees.length === 0 && <div className="text-center text-bokara-grey/40 text-sm py-10 border-2 border-dashed border-bokara-grey/10 rounded-lg m-2">Arrastra empleados aquí</div>}
                        </div>
                    </div>
                )
            })}
        </div>
    );
  };

  return (
    <div className="w-full mx-auto animate-fade-in flex flex-col h-full">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-bokara-grey">Employees</h1>
          <span className="bg-lucius-lime/20 text-bokara-grey text-lg font-bold px-3 py-1 rounded-full">{employees.length}</span>
        </div>
        
        <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="bg-whisper-white p-1 rounded-lg flex border border-bokara-grey/10">
                <button 
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-white text-bokara-grey shadow-sm' : 'text-bokara-grey/50 hover:text-bokara-grey'}`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                    List
                </button>
                <button 
                    onClick={() => setViewMode('board')}
                    className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${viewMode === 'board' ? 'bg-white text-bokara-grey shadow-sm' : 'text-bokara-grey/50 hover:text-bokara-grey'}`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
                    Board
                </button>
            </div>

            <button
            onClick={onAddEmployee}
            className="bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg transition-all duration-300 shadow-md flex items-center gap-2"
            >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            <span>Add Employee</span>
            </button>
        </div>
      </div>
      
      {viewMode === 'list' ? renderListView() : renderBoardView()}
    </div>
  );
};

export default EmployeesPage;
