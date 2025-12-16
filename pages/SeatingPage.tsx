
import React from 'react';
import { Employee, ActivityStatus } from '../types';
import OfficeMap from '../components/OfficeMap';
import { updateEmployeeSeat } from '../services/apiService';
import { useNotification } from '../contexts/NotificationContext';

interface SeatingPageProps {
  employees: Employee[];
  activityStatuses: ActivityStatus[];
  currentUserRole: 'admin' | 'employee';
}

const SeatingPage: React.FC<SeatingPageProps> = ({ employees, activityStatuses, currentUserRole }) => {
  const { addNotification } = useNotification();

  const handleAssignSeat = async (seatId: string, employeeId: string | null) => {
      try {
          if (employeeId) {
              await updateEmployeeSeat(employeeId, seatId);
              addNotification('Seat assigned successfully', 'success');
          } else {
              // If employeeId is null, we need to find who is sitting there and clear it
              const currentOccupant = employees.find(e => e.seatId === seatId);
              if (currentOccupant) {
                  await updateEmployeeSeat(currentOccupant.id, null);
                  addNotification('Seat cleared', 'success');
              }
          }
      } catch (error) {
          console.error(error);
          addNotification('Failed to update seat', 'error');
      }
  };

  return (
    <div className="w-full max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col animate-fade-in pb-4">
      <OfficeMap 
        employees={employees}
        activityStatuses={activityStatuses}
        currentUserRole={currentUserRole}
        onAssignSeat={handleAssignSeat}
      />
    </div>
  );
};

export default SeatingPage;
