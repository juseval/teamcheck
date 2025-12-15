
import React, { useState, useEffect } from 'react';
import { Employee, AttendanceAction, ActivityStatus } from '../types';
import ActivityPickerModal from '../components/ActivityPickerModal';
import { EditIcon } from '../components/Icons';

interface EmployeeCardProps {
  employee: Employee;
  onAction: (employeeId: string, action: AttendanceAction) => void;
  onRemove: (employeeId: string) => void;
  onEditTime: (employeeId: string) => void;
  activityStatuses: ActivityStatus[];
  userRole: 'admin' | 'employee';
}

const formatTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const getInitials = (name: string) => {
  const names = name.trim().split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};


const StatusIndicator: React.FC<{ status: Employee['status'], activityStatuses: ActivityStatus[] }> = ({ status, activityStatuses }) => {
  const baseClasses = "px-2 py-0.5 text-xs font-semibold rounded-full";
  const customStatus = activityStatuses.find(s => s.name === status);

  if (customStatus) {
    return <span className={`${baseClasses} text-white`} style={{ backgroundColor: customStatus.color }}>{status}</span>;
  }

  switch (status) {
    case 'Working':
      return <span className={`${baseClasses} bg-lucius-lime/20 text-lucius-lime`}>Working</span>;
    case 'Clocked Out':
      return <span className={`${baseClasses} bg-gray-200 text-gray-700`}>Clocked Out</span>;
    default:
        return <span className={`${baseClasses} bg-wet-sand/20 text-wet-sand`}>{status}</span>;
  }
};

const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, onAction, onRemove, onEditTime, activityStatuses, userRole }) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  useEffect(() => {
    if (employee.status !== 'Clocked Out' && employee.currentStatusStartTime) {
      setElapsedTime(Math.floor((Date.now() - (employee.currentStatusStartTime || 0)) / 1000));
      const interval = setInterval(() => {
        const seconds = Math.floor((Date.now() - (employee.currentStatusStartTime || 0)) / 1000);
        setElapsedTime(seconds);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [employee.status, employee.currentStatusStartTime]);

  const handleSelectActivity = (activityName: string) => {
    onAction(employee.id, `Start ${activityName}`);
    setIsActivityModalOpen(false);
  };

  const handleEditClick = () => {
    onEditTime(employee.id);
  };

  const renderButtons = () => {
    const baseButtonClass = "w-full text-center font-bold py-2 px-4 rounded-lg transition-all duration-300 shadow-md transform hover:scale-105";
    const primaryButtonClass = `${baseButtonClass} bg-bokara-grey hover:bg-bokara-grey/90 text-bright-white`;
    const secondaryButtonClass = `${baseButtonClass} bg-wet-sand hover:bg-opacity-80 text-bokara-grey`;

    switch (employee.status) {
      case 'Clocked Out':
        return (
          <button onClick={() => onAction(employee.id, 'Clock In')} className={primaryButtonClass}>
            Clock In
          </button>
        );
      case 'Working':
        return (
          <div className="flex gap-2">
            <button onClick={() => setIsActivityModalOpen(true)} className={secondaryButtonClass}>
              Start Activity
            </button>
            <button onClick={() => onAction(employee.id, 'Clock Out')} className={primaryButtonClass}>
              Clock Out
            </button>
          </div>
        );
      default: // This handles all custom activities like 'Break', 'Training', etc.
        const customStatus = activityStatuses.find(s => s.name === employee.status);
        const endButtonColor = customStatus ? customStatus.color : '#AE8F60';
        return (
          <button 
            onClick={() => onAction(employee.id, `End ${employee.status}`)} 
            className={`${baseButtonClass} text-white`}
            style={{ backgroundColor: endButtonColor, filter: 'brightness(1.1)' }}
          >
            End {employee.status}
          </button>
        );
    }
  };

  const isRemovable = employee.status === 'Clocked Out';
  const isClockedIn = employee.status !== 'Clocked Out';
  const initials = getInitials(employee.name);

  return (
    <>
    <div className="bg-white rounded-xl shadow-md p-4 flex flex-col gap-4 border border-bokara-grey/10 relative transition-all duration-300 ease-in-out">
      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
        {userRole === 'admin' && (
          <>
            <button
              onClick={handleEditClick}
              className="p-1 text-bokara-grey/40 rounded-full hover:text-lucius-lime hover:bg-whisper-white transition-colors disabled:hover:text-bokara-grey/40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              aria-label="Edit employee hours"
              title={isClockedIn ? "Edit session start time" : "Employee must be clocked in to edit time"}
              disabled={!isClockedIn}
            >
              <EditIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => onRemove(employee.id)}
              className="p-1 text-bokara-grey/40 rounded-full hover:text-red-500 hover:bg-whisper-white disabled:hover:text-bokara-grey/40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
              aria-label="Remove employee"
              disabled={!isRemovable}
              title={!isRemovable ? 'Cannot remove an active employee' : 'Remove employee'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          {employee.avatarUrl ? (
             <img 
                src={employee.avatarUrl} 
                alt={employee.name} 
                className="w-14 h-14 rounded-full border-2 border-lucius-lime/50 object-cover"
             />
          ) : (
            <div className="w-14 h-14 bg-lucius-lime/20 rounded-full flex items-center justify-center border-2 border-lucius-lime/50">
              <span className="text-xl font-bold text-bokara-grey select-none">{initials}</span>
            </div>
          )}
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white transition-colors ${isClockedIn ? 'bg-lucius-lime' : 'bg-gray-400'}`}
            title={isClockedIn ? 'Online' : 'Offline'}
          ></div>
        </div>
        <div className="flex-grow overflow-hidden">
          <h3 className="text-lg font-bold text-bokara-grey truncate">{employee.name}</h3>
          <StatusIndicator status={employee.status} activityStatuses={activityStatuses} />
        </div>
      </div>

      <div className="text-center">
        <div className="font-display text-4xl text-bokara-grey tracking-widest tabular-nums">
          {formatTime(elapsedTime)}
        </div>
        <div className="text-xs text-bokara-grey/60 -mt-1 truncate">
          {employee.status !== 'Clocked Out' && employee.lastClockInTime ? `Session | In since ${new Date(employee.lastClockInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Offline'}
        </div>
      </div>

      <div className="mt-auto">
        {renderButtons()}
      </div>
    </div>
    <ActivityPickerModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onSelectActivity={handleSelectActivity}
        statuses={activityStatuses}
      />
    </>
  );
};

export default EmployeeCard;
