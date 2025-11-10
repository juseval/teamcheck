import React from 'react';
import { Employee, WorkSchedule } from '../types';

interface EmployeesPageProps {
  employees: Employee[];
  onAddEmployee: () => void;
  // FIX: Changed employeeId type from number to string.
  onEditEmployee: (employeeId: string) => void;
  // FIX: Changed employeeId type from number to string.
  onRemoveEmployee: (employeeId: string) => void;
  workSchedules: WorkSchedule[];
}

const EmployeesPage: React.FC<EmployeesPageProps> = ({ employees, onAddEmployee, onEditEmployee, onRemoveEmployee, workSchedules }) => {
  const tableHeaders = ["Name", "Email", "Phone", "Primary Location", "Role", "Horario", "Status", "Actions"];
  
  const scheduleMap = new Map(workSchedules.map(s => [s.id, s.name]));

  return (
    <div className="w-full mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-bokara-grey">Employees</h1>
          <span className="bg-lucius-lime/20 text-bokara-grey text-lg font-bold px-3 py-1 rounded-full">{employees.length}</span>
        </div>
        <button
          onClick={onAddEmployee}
          className="bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg transition-all duration-300 shadow-md flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
          <span>Add Employee</span>
        </button>
      </div>
      
      <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 overflow-hidden">
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
    </div>
  );
};

export default EmployeesPage;