import React, { useState, useEffect, useMemo } from 'react';
import { TimesheetEntry } from '../types';

interface EditTimesheetEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (startLogId: number, endLogId: number, newStartTime: number, newEndTime: number) => void;
  entry: TimesheetEntry | null;
}

const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "Invalid duration";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
};

const EditTimesheetEntryModal: React.FC<EditTimesheetEntryModalProps> = ({ isOpen, onClose, onSave, entry }) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (entry) {
      const startDate = new Date(entry.timeIn);
      const endDate = new Date(entry.timeOut);
      setStartTime(`${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`);
      setEndTime(`${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`);
    }
  }, [entry]);
  
  const { duration, isValid } = useMemo(() => {
      if (!entry || !startTime || !endTime) return { duration: 0, isValid: false };
      
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);

      const startDate = new Date(entry.timeIn);
      startDate.setHours(startH, startM, 0, 0);
      
      const endDate = new Date(entry.timeIn);
      endDate.setHours(endH, endM, 0, 0);

      if (endDate <= startDate) { // Handles overnight case
          endDate.setDate(endDate.getDate() + 1);
      }

      const diffSeconds = (endDate.getTime() - startDate.getTime()) / 1000;
      return { duration: diffSeconds, isValid: diffSeconds > 0 };

  }, [startTime, endTime, entry]);

  if (!isOpen || !entry) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);

      const newStartDate = new Date(entry.timeIn);
      newStartDate.setHours(startH, startM, 0, 0);
      
      const newEndDate = new Date(entry.timeIn);
      newEndDate.setHours(endH, endM, 0, 0);

       if (newEndDate <= newStartDate) {
          newEndDate.setDate(newEndDate.getDate() + 1);
      }

      onSave(entry.startLogId, entry.endLogId, newStartDate.getTime(), newEndDate.getTime());
    }
  };

  return (
    <div className="fixed inset-0 bg-bokara-grey bg-opacity-60 flex items-center justify-center z-50 transition-opacity" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-bokara-grey/10" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-bokara-grey mb-2">Edit Timesheet Entry</h2>
        <p className="text-bokara-grey/80 mb-4">For <span className="font-semibold">{entry.employeeName}</span> on <span className="font-semibold">{entry.date}</span></p>
        
        <div className="bg-lucius-lime/10 p-3 rounded-md mb-6 text-center">
             <p className="font-semibold text-bokara-grey">{entry.type}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-bokara-grey mb-1">Start Time</label>
                <input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-lucius-lime"
                  required
                />
              </div>
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-bokara-grey mb-1">End Time</label>
                <input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-lucius-lime"
                  required
                />
              </div>
          </div>

           <div className="text-center bg-bokara-grey/5 p-2 rounded-md text-sm font-semibold text-bokara-grey">
                Total Duration: {formatDuration(duration)}
            </div>
            {!isValid && startTime && endTime && <p className="text-red-500 text-sm text-center">End time must be after start time.</p>}

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-bokara-grey rounded-lg hover:bg-gray-300 transition-colors font-semibold">
              Cancel
            </button>
            <button type="submit" className="py-2 px-4 bg-lucius-lime text-bokara-grey font-bold rounded-lg hover:bg-opacity-80 transition-colors disabled:bg-lucius-lime/40 disabled:cursor-not-allowed" disabled={!isValid}>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTimesheetEntryModal;