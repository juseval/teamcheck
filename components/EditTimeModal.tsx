
import React, { useState, useEffect } from 'react';
import { Employee } from '../types';

interface EditTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  // FIX: Changed employeeId type from number to string.
  onSave: (employeeId: string, newStartTime: number) => void;
  employee: Employee | null;
}

const EditTimeModal: React.FC<EditTimeModalProps> = ({ isOpen, onClose, onSave, employee }) => {
  const [time, setTime] = useState('');

  useEffect(() => {
    if (employee && employee.currentStatusStartTime) {
      const date = new Date(employee.currentStatusStartTime);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    }
  }, [employee]);

  if (!isOpen || !employee) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (time && employee.currentStatusStartTime) {
      const [hours, minutes] = time.split(':').map(Number);
      // FIX: Use 'currentStatusStartTime' instead of 'currentStatus' which does not exist on the Employee type.
      const newStartDate = new Date(employee.currentStatusStartTime);
      newStartDate.setHours(hours, minutes, 0, 0);

      if (newStartDate.getTime() > Date.now()) {
        alert("Cannot set a time in the future.");
        return;
      }

      onSave(employee.id, newStartDate.getTime());
    }
  };

  return (
    <div className="fixed inset-0 bg-bokara-grey bg-opacity-60 flex items-center justify-center z-50 transition-opacity" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm border border-bokara-grey/10" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-bokara-grey mb-2">Edit Session Time</h2>
        <p className="text-bokara-grey/80 mb-1">For <span className="font-semibold">{employee.name}</span></p>
        <p className="text-bokara-grey/60 mb-6 text-sm">Current Status: <span className="font-semibold">{employee.status}</span></p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="sessionStartTime" className="block text-sm font-medium text-lucius-lime mb-1">
              New Start Time for this Session
            </label>
            <input
              id="sessionStartTime"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-lucius-lime"
              required
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-bokara-grey rounded-lg hover:bg-gray-300 transition-colors font-semibold">
              Cancel
            </button>
            <button type="submit" className="py-2 px-4 bg-lucius-lime text-bokara-grey font-bold rounded-lg hover:bg-opacity-80 transition-colors">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTimeModal;
