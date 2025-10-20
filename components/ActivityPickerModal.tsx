import React from 'react';
import { ActivityStatus } from '../types.ts';

interface ActivityPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectActivity: (name: string) => void;
  statuses: ActivityStatus[];
}

const ActivityPickerModal: React.FC<ActivityPickerModalProps> = ({ isOpen, onClose, onSelectActivity, statuses }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-bokara-grey bg-opacity-50 flex items-center justify-center z-50 transition-opacity" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-bright-white rounded-xl shadow-2xl p-6 w-full max-w-sm border border-bokara-grey/10" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-bokara-grey mb-4">Start New Activity</h2>
        <div className="flex flex-col gap-3 max-h-80 overflow-y-auto">
            {statuses.map(status => (
                <button 
                    key={status.id}
                    onClick={() => onSelectActivity(status.name)}
                    className="w-full text-center font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-md transform hover:scale-105 text-white"
                    style={{ backgroundColor: status.color }}
                >
                    {status.name}
                </button>
            ))}
            {statuses.length === 0 && <p className="text-bokara-grey/60 text-center py-4">No activities defined. Go to Settings to add one.</p>}
        </div>
         <div className="mt-6 flex justify-end">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-bokara-grey rounded-lg hover:bg-gray-300 transition-colors">
              Cancel
            </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityPickerModal;