
import React, { useState, useEffect, useMemo } from 'react';
import { AttendanceLogEntry, ActivityStatus } from '../types';

interface EditActivityLogEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  // FIX: Changed logId type from number to string.
  onSave: (logId: string, updates: { action: string, timestamp: number }) => void;
  entry: AttendanceLogEntry | null;
  activityStatuses: ActivityStatus[];
}

const EditActivityLogEntryModal: React.FC<EditActivityLogEntryModalProps> = ({ isOpen, onClose, onSave, entry, activityStatuses }) => {
  const [editedTime, setEditedTime] = useState('');
  const [editedAction, setEditedAction] = useState('');

  useEffect(() => {
    if (entry) {
      const date = new Date(entry.timestamp);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      setEditedTime(`${hours}:${minutes}`);
      setEditedAction(entry.action);
    }
  }, [entry]);

  const actionOptions = useMemo(() => {
    const options = ['Clock In', 'Clock Out'];
    activityStatuses.forEach(status => {
      options.push(`Start ${status.name}`);
      options.push(`End ${status.name}`);
    });
    return options;
  }, [activityStatuses]);
  
  const hasChanges = useMemo(() => {
    if (!entry) return false;
    const originalDate = new Date(entry.timestamp);
    const originalTime = `${originalDate.getHours().toString().padStart(2, '0')}:${originalDate.getMinutes().toString().padStart(2, '0')}`;
    return editedAction !== entry.action || editedTime !== originalTime;
  }, [entry, editedAction, editedTime]);

  if (!isOpen || !entry) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editedTime && hasChanges) {
      const [hours, minutes] = editedTime.split(':').map(Number);
      const newTimestamp = new Date(entry.timestamp);
      newTimestamp.setHours(hours, minutes, 0, 0);
      
      if (newTimestamp.getTime() > Date.now()) {
        alert("Cannot set a time in the future.");
        return;
      }

      onSave(entry.id, { action: editedAction, timestamp: newTimestamp.getTime() });
    }
  };

  return (
    <div className="fixed inset-0 bg-bokara-grey bg-opacity-60 flex items-center justify-center z-50 transition-opacity" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-bokara-grey/10" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-bokara-grey mb-2">Edit Log Entry</h2>
        <p className="text-bokara-grey/80 mb-1">For <span className="font-semibold">{entry.employeeName}</span></p>
        <p className="text-bokara-grey/60 mb-6 text-sm">Date: {new Date(entry.timestamp).toLocaleDateString()}</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="logTime" className="block text-sm font-medium text-lucius-lime mb-1">
              Time
            </label>
            <input
              id="logTime"
              type="time"
              value={editedTime}
              onChange={(e) => setEditedTime(e.target.value)}
              className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-lucius-lime"
              required
            />
          </div>
           <div>
            <label htmlFor="logAction" className="block text-sm font-medium text-lucius-lime mb-1">
              Action
            </label>
            <select
                id="logAction"
                value={editedAction}
                onChange={(e) => setEditedAction(e.target.value)}
                className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime"
            >
                {actionOptions.map(action => (
                    <option key={action} value={action}>{action}</option>
                ))}
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-bokara-grey rounded-lg hover:bg-gray-300 transition-colors font-semibold">
              Cancel
            </button>
            <button 
                type="submit" 
                className="py-2 px-4 bg-lucius-lime text-bokara-grey font-bold rounded-lg hover:bg-opacity-80 transition-colors disabled:bg-lucius-lime/40 disabled:cursor-not-allowed"
                disabled={!hasChanges}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditActivityLogEntryModal;
