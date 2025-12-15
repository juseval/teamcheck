
import React, { useState, useEffect } from 'react';
import { Employee, WorkSchedule } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import EmployeeScheduleBoard from '../components/EmployeeScheduleBoard';
import { updateEmployeeDetails } from '../services/apiService';

interface EmployeesPageProps {
  employees: Employee[];
  onAddEmployee: () => void;
  // FIX: Changed employeeId type from number to string.
  onEditEmployee: (employeeId: string) => void;
  // FIX: Changed employeeId type from number to string.
  onRemoveEmployee: (employeeId: string) => void;
  workSchedules: WorkSchedule[];
  currentUser: Employee;
}

const EmployeesPage: React.FC<EmployeesPageProps> = ({ employees, onAddEmployee, onEditEmployee, onRemoveEmployee, workSchedules, currentUser }) => {
  const { addNotification } = useNotification();
  
  // Initialize state from localStorage if available, otherwise default to 'list'
  const [viewMode, setViewMode] = useState<'list' | 'board'>(() => {
      const savedMode = localStorage.getItem('employeesViewMode');
      return (savedMode === 'board' || savedMode === 'list') ? savedMode : 'list';
  });

  // Save to localStorage whenever viewMode changes
  useEffect(() => {
      localStorage.setItem('employeesViewMode', viewMode);
  }, [viewMode]);
  
  const tableHeaders = ["Name", "Email", "Phone", "Primary Location", "Role", "Horario", "Status", "Actions"];
  
  const scheduleMap = new Map(workSchedules.map(s => [s.id, s.name]));

  // Generate Invite Link
  // Use query param on root to ensure compatibility across hosting environments without strict rewrite rules
  const inviteLink = `${window.location.origin}/?inviteCode=${currentUser.companyId}`;

  const copyToClipboard = () => {
      navigator.clipboard.writeText(inviteLink).then(() => {
          addNotification("Enlace de invitación copiado al portapapeles.", 'success');
      }).catch(() => {
          addNotification("Error al copiar el enlace.", 'error');
      });
  };

  const handleUpdateSchedule = async (employeeId: string, newScheduleId: string | null) => {
      const employee = employees.find(e => e.id === employeeId);
      if (!employee) return;

      try {
          await updateEmployeeDetails({
              ...employee,
              workScheduleId: newScheduleId
          });
          addNotification("Horario actualizado", 'success');
      } catch (error) {
          console.error(error);
          addNotification("Error al actualizar horario", 'error');
      }
  };

  return (
    <div className="w-full mx-auto animate-fade-in space-y-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-bokara-grey">Employees</h1>
          <span className="bg-lucius-lime/20 text-bokara-grey text-lg font-bold px-3 py-1 rounded-full">{employees.length}</span>
        </div>
        
        <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="bg-white rounded-lg border border-bokara-grey/10 p-1 flex">
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-bokara-grey text-white shadow-sm' : 'text-bokara-grey/50 hover:bg-whisper-white'}`}
                    title="List View"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                </button>
                <button 
                    onClick={() => setViewMode('board')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'board' ? 'bg-bokara-grey text-white shadow-sm' : 'text-bokara-grey/50 hover:bg-whisper-white'}`}
                    title="Board View (Schedule)"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
                </button>
            </div>

            <button
            onClick={onAddEmployee}
            className="bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg transition-all duration-300 shadow-md flex items-center gap-2"
            >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            <span className="hidden sm:inline">Add Employee</span>
            </button>
        </div>
      </div>

      {/* Invite Link Widget */}
      {currentUser.role === 'admin' && (
          <div className="bg-white rounded-xl shadow-sm border border-lucius-lime/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-lucius-lime/10 rounded-full text-lucius-lime">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  </div>
                  <div>
                      <h3 className="font-bold text-bokara-grey">Invite Employees</h3>
                      <p className="text-xs text-bokara-grey/60">Share this link to let employees join your company directly.</p>
                  </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="bg-whisper-white/50 border border-bokara-grey/10 rounded-lg px-3 py-2 text-xs text-bokara-grey/70 truncate w-full sm:w-64 font-mono select-all">
                      {inviteLink}
                  </div>
                  <button onClick={copyToClipboard} className="p-2 bg-white border border-bokara-grey/20 hover:bg-whisper-white rounded-lg text-bokara-grey transition-colors" title="Copy Link">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                  </button>
              </div>
          </div>
      )}
      
      {viewMode === 'list' ? (
        <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 overflow-hidden flex-grow">
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
      ) : (
          <div className="flex-grow overflow-hidden">
              <EmployeeScheduleBoard 
                employees={employees} 
                workSchedules={workSchedules} 
                onUpdateEmployeeSchedule={handleUpdateSchedule}
              />
          </div>
      )}
    </div>
  );
};

export default EmployeesPage;
