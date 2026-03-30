
import React, { useState, useEffect } from 'react';
import { Employee, AttendanceAction } from '../types';

interface QuickClockInConsolePageProps {
  employees: Employee[];
  // FIX: Changed employeeId type from number to string.
  onEmployeeAction: (employeeId: string, action: AttendanceAction) => void;
}

const formatTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const StatusIndicator: React.FC<{ status: Employee['status'] }> = ({ status }) => {
  const baseClasses = "px-3 py-1 text-sm font-semibold rounded-full";
  switch (status) {
    case 'Working':
      return <span className={`${baseClasses} bg-lucius-lime/20 text-lucius-lime`}>Working</span>;
    case 'On Break':
      return <span className={`${baseClasses} bg-wet-sand/20 text-wet-sand`}>On Break</span>;
    case 'Clocked Out':
      return <span className={`${baseClasses} bg-bokara-grey/40 text-whisper-white/60`}>Clocked Out</span>;
    default:
        return <span className={`${baseClasses} bg-bokara-grey/20 text-bokara-grey/60`}>{status}</span>;
  }
};

const QuickClockInConsolePage: React.FC<QuickClockInConsolePageProps> = ({ employees, onEmployeeAction }) => {
  const safeEmployees = Array.isArray(employees) ? employees : [];
  
  // FIX: Changed selectedEmployeeId state type to string to match Employee ID type.
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(() => (safeEmployees.length > 0) ? safeEmployees[0].id : null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const selectedEmployee = safeEmployees.find(e => e.id === selectedEmployeeId);

  useEffect(() => {
    if (selectedEmployee?.status !== 'Clocked Out' && selectedEmployee?.currentStatusStartTime) {
      const interval = setInterval(() => {
        const seconds = Math.floor((Date.now() - (selectedEmployee.currentStatusStartTime || 0)) / 1000);
        setElapsedTime(seconds);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [selectedEmployee?.status, selectedEmployee?.currentStatusStartTime]);

  const renderButtons = () => {
    if (!selectedEmployee) return null;
    const baseButtonClass = "w-full text-center font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg transform hover:scale-105 text-base";
    switch (selectedEmployee.status) {
      case 'Clocked Out':
        return (
          <button onClick={() => onEmployeeAction(selectedEmployee.id, 'Clock In')} className={`${baseButtonClass} bg-lucius-lime hover:bg-opacity-80 text-bokara-grey`}>
            Clock In
          </button>
        );
      case 'Working':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={() => onEmployeeAction(selectedEmployee.id, 'Start Break')} className={`${baseButtonClass} bg-wet-sand hover:bg-opacity-80 text-bokara-grey`}>
              Start Break
            </button>
            <button onClick={() => onEmployeeAction(selectedEmployee.id, 'Clock Out')} className={`${baseButtonClass} bg-red-600/80 hover:bg-red-600 text-bright-white`}>
              Clock Out
            </button>
          </div>
        );
      case 'On Break':
        return (
          <button onClick={() => onEmployeeAction(selectedEmployee.id, 'End Break')} className={`${baseButtonClass} bg-lucius-lime hover:bg-opacity-80 text-bokara-grey`}>
            End Break
          </button>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto bg-dark-hunter-green rounded-xl shadow-lg p-8 animate-fade-in">
      <h1 className="text-4xl font-bold text-bright-white mb-2">Quick Clock-in Console</h1>
      <p className="text-whisper-white/80 mb-8">Select an employee to manage their time.</p>

      <div className="mb-6">
        <label htmlFor="employee-select" className="block text-sm font-medium text-lucius-lime mb-2">Select Employee</label>
        <select
          id="employee-select"
          value={selectedEmployeeId ?? ''}
          // FIX: Removed Number() conversion as ID is now a string.
          onChange={(e) => setSelectedEmployeeId(e.target.value)}
          className="w-full bg-bokara-grey/50 border border-wet-sand/40 text-bright-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime"
        >
          {safeEmployees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>
      </div>

      {selectedEmployee ? (
        <div className="bg-bokara-grey/40 rounded-lg p-6 flex flex-col items-center gap-6 text-center border border-wet-sand/20">
            <div className="flex flex-col items-center gap-2">
                <h2 className="text-3xl font-bold text-bright-white">{selectedEmployee.name}</h2>
                <StatusIndicator status={selectedEmployee.status} />
            </div>
            
            <div className="font-display text-7xl text-bright-white tracking-widest tabular-nums">
                {formatTime(elapsedTime)}
            </div>
            
            <div className="w-full max-w-md mt-4">
                {renderButtons()}
            </div>
        </div>
      ) : (
        <p className="text-center text-whisper-white/60 py-16">No employees available. Add an employee on the Tracker page.</p>
      )}
    </div>
  );
};

export default QuickClockInConsolePage;
