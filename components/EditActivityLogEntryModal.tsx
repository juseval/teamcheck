
import React, { useState, useEffect, useMemo } from 'react';
import { AttendanceLogEntry, ActivityStatus } from '../types';

interface EditActivityLogEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Updated signature to handle full updates
  onSave: (logId: string, updates: Partial<AttendanceLogEntry>) => void;
  entry: AttendanceLogEntry | null;
  activityStatuses: ActivityStatus[];
}

const EditActivityLogEntryModal: React.FC<EditActivityLogEntryModalProps> = ({ isOpen, onClose, onSave, entry, activityStatuses }) => {
  const [editedTime, setEditedTime] = useState('');
  const [editedAction, setEditedAction] = useState('');
  
  // Correction Handling State
  const [adminNote, setAdminNote] = useState('');
  const [isHandlingRequest, setIsHandlingRequest] = useState(false);

  useEffect(() => {
    if (entry) {
      const date = new Date(entry.timestamp);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      setEditedTime(`${hours}:${minutes}`);
      setEditedAction(entry.action);
      setAdminNote(entry.adminResponse || '');
      // If there is a pending request, we are essentially handling it
      setIsHandlingRequest(entry.correctionStatus === 'pending');
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
    return editedAction !== entry.action || editedTime !== originalTime || adminNote !== (entry.adminResponse || '');
  }, [entry, editedAction, editedTime, adminNote]);

  const quickReplies = [
      "Aprobado.",
      "Aprobado, hora ajustada.",
      "Rechazado - Hora incorrecta.",
      "Rechazado - Falta justificación."
  ];

  if (!isOpen || !entry) return null;

  const handleSave = (status: 'approved' | 'rejected' | null = null) => {
    if (editedTime) {
      const [hours, minutes] = editedTime.split(':').map(Number);
      const newTimestamp = new Date(entry.timestamp);
      newTimestamp.setHours(hours, minutes, 0, 0);
      
      if (newTimestamp.getTime() > Date.now()) {
        alert("Cannot set a time in the future.");
        return;
      }

      const updates: Partial<AttendanceLogEntry> = {
          action: editedAction,
          timestamp: newTimestamp.getTime(),
          adminResponse: adminNote
      };

      if (status) {
          updates.correctionStatus = status;
      }

      onSave(entry.id, updates);
    }
  };

  const handleSubmitNormal = (e: React.FormEvent) => {
      e.preventDefault();
      handleSave(null); // Just a normal edit, preserve existing status or null
  }

  return (
    <div className="fixed inset-0 bg-bokara-grey bg-opacity-60 flex items-center justify-center z-50 transition-opacity" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-bokara-grey/10" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-bokara-grey mb-2">
            {isHandlingRequest ? 'Responder Solicitud' : 'Editar Registro'}
        </h2>
        <p className="text-bokara-grey/80 mb-1">Colaborador: <span className="font-semibold">{entry.employeeName}</span></p>
        <p className="text-bokara-grey/60 mb-6 text-sm">Fecha: {new Date(entry.timestamp).toLocaleDateString()}</p>
        
        {/* REQUEST SECTION */}
        {entry.correctionRequest && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                <p className="text-xs text-yellow-800 font-bold uppercase mb-1">Solicitud del Colaborador</p>
                <p className="text-sm text-bokara-grey italic">"{entry.correctionRequest}"</p>
                {entry.correctionStatus === 'pending' && (
                    <span className="inline-block mt-2 text-[10px] bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded font-bold">PENDIENTE</span>
                )}
            </div>
        )}

        <form onSubmit={handleSubmitNormal} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="logTime" className="block text-sm font-medium text-lucius-lime mb-1">Hora</label>
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
                <label htmlFor="logAction" className="block text-sm font-medium text-lucius-lime mb-1">Acción</label>
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
          </div>

          <div>
              <label htmlFor="adminNote" className="block text-sm font-medium text-lucius-lime mb-1">
                  Contexto / Respuesta
              </label>
              <textarea 
                  id="adminNote"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lucius-lime resize-none h-20"
                  placeholder="Ej: Aprobado, ajusté la hora de salida."
              />
              
              {/* Quick Replies */}
              {isHandlingRequest && (
                  <div className="mt-2 flex flex-wrap gap-2">
                      {quickReplies.map(reply => (
                          <button
                            key={reply}
                            type="button"
                            onClick={() => setAdminNote(reply)}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-bokara-grey px-2 py-1 rounded transition-colors"
                          >
                              {reply}
                          </button>
                      ))}
                  </div>
              )}
          </div>

          {/* ACTIONS */}
          <div className="pt-4 border-t border-bokara-grey/10 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-bokara-grey rounded-lg hover:bg-gray-300 font-semibold text-sm">
              Cancelar
            </button>
            
            {/* Logic split: If pending request, show Approve/Reject. Else show Save */}
            {isHandlingRequest ? (
                <>
                    <button 
                        type="button" 
                        onClick={() => handleSave('rejected')}
                        disabled={!adminNote} // Require note for rejection context
                        className="px-4 py-2 bg-red-100 text-red-700 font-bold rounded-lg hover:bg-red-200 disabled:opacity-50 text-sm"
                        title="Debe agregar una nota para rechazar"
                    >
                        Rechazar
                    </button>
                    <button 
                        type="button" 
                        onClick={() => handleSave('approved')}
                        className="px-4 py-2 bg-green-100 text-green-700 font-bold rounded-lg hover:bg-green-200 text-sm"
                    >
                        Aprobar y Guardar
                    </button>
                </>
            ) : (
                <button 
                    type="submit" 
                    className="px-4 py-2 bg-lucius-lime text-bokara-grey font-bold rounded-lg hover:bg-opacity-80 disabled:opacity-50 text-sm"
                    disabled={!hasChanges}
                >
                    Guardar Cambios
                </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditActivityLogEntryModal;
