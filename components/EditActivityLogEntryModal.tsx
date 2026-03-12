import React, { useState, useEffect, useMemo } from 'react';
import { AttendanceLogEntry, ActivityStatus } from '../types';

interface EditActivityLogEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (logId: string, updates: Partial<AttendanceLogEntry>) => void;
  entry: AttendanceLogEntry | null;
  activityStatuses: ActivityStatus[];
}

const EditActivityLogEntryModal: React.FC<EditActivityLogEntryModalProps> = ({ isOpen, onClose, onSave, entry, activityStatuses }) => {
  const [editedDate, setEditedDate] = useState('');
  const [editedTime, setEditedTime] = useState('');
  const [editedAction, setEditedAction] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [isHandlingRequest, setIsHandlingRequest] = useState(false);

  useEffect(() => {
    if (entry) {
      const date = new Date(entry.timestamp);
      // Fecha en formato YYYY-MM-DD para el input type="date"
      const yyyy = date.getFullYear();
      const mm   = (date.getMonth() + 1).toString().padStart(2, '0');
      const dd   = date.getDate().toString().padStart(2, '0');
      setEditedDate(`${yyyy}-${mm}-${dd}`);
      setEditedTime(`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`);
      setEditedAction(entry.action);
      setAdminNote(entry.adminResponse || '');
      setIsHandlingRequest(entry.correctionStatus === 'pending');
    }
  }, [entry]);

  // ── Auto-cargar hora y acción sugeridas por el colaborador ──
  const hasSuggestion = !!(entry as any)?.correctionSuggestedTime || !!(entry as any)?.correctionSuggestedAction;

  const applySuggestion = () => {
    if (!entry) return;
    const sugTime = (entry as any).correctionSuggestedTime;
    const sugAction = (entry as any).correctionSuggestedAction;
    if (sugTime) setEditedTime(sugTime);
    if (sugAction) setEditedAction(sugAction);
  };

  const actionOptions = useMemo(() => {
    const options = ['Clock In', 'Clock Out', 'Start Break', 'End Break'];
    activityStatuses.forEach(status => {
      options.push(`Start ${status.name}`);
      options.push(`End ${status.name}`);
    });
    return options;
  }, [activityStatuses]);

  // Fecha máxima permitida = hoy (no se puede corregir a fecha futura)
  const todayStr = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm   = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd   = now.getDate().toString().padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const hasChanges = useMemo(() => {
    if (!entry) return false;
    const originalDate = new Date(entry.timestamp);
    const origDateStr = `${originalDate.getFullYear()}-${(originalDate.getMonth()+1).toString().padStart(2,'0')}-${originalDate.getDate().toString().padStart(2,'0')}`;
    const origTimeStr = `${originalDate.getHours().toString().padStart(2,'0')}:${originalDate.getMinutes().toString().padStart(2,'0')}`;
    return editedAction !== entry.action
      || editedTime !== origTimeStr
      || editedDate !== origDateStr
      || adminNote !== (entry.adminResponse || '');
  }, [entry, editedAction, editedTime, editedDate, adminNote]);

  const quickReplies = [
    "Aprobado.",
    "Aprobado, hora ajustada.",
    "Rechazado - Hora incorrecta.",
    "Rechazado - Falta justificación."
  ];

  if (!isOpen || !entry) return null;

  const handleSave = (status: 'approved' | 'rejected' | null = null) => {
    if (!editedDate || !editedTime) return;

    const [year, month, day] = editedDate.split('-').map(Number);
    const [hours, minutes]   = editedTime.split(':').map(Number);

    // Validar que los valores son números reales
    if ([year, month, day, hours, minutes].some(isNaN)) {
      alert("Fecha u hora inválida. Por favor verifica los campos.");
      return;
    }

    const newTimestamp = new Date(year, month - 1, day, hours, minutes, 0, 0);

    if (isNaN(newTimestamp.getTime())) {
      alert("Fecha u hora inválida.");
      return;
    }

    if (newTimestamp.getTime() > Date.now()) {
      alert("No se puede establecer una fecha/hora en el futuro.");
      return;
    }

    const updates: Partial<AttendanceLogEntry> = {
      action: editedAction,
      timestamp: newTimestamp.getTime(),
      adminResponse: adminNote,
    };
    if (status) updates.correctionStatus = status;

    onSave(entry.id, updates);
  };

  const handleSubmitNormal = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave(null);
  };

  // Etiqueta de la fecha para mostrar al lado del input
  const editedDateLabel = editedDate ? new Date(editedDate + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }) : '';

  return (
    <div className="fixed inset-0 bg-bokara-grey bg-opacity-60 flex items-center justify-center z-50 transition-opacity" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-bokara-grey/10" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-bokara-grey mb-2">
          {isHandlingRequest ? 'Responder Solicitud' : 'Editar Registro'}
        </h2>
        <p className="text-bokara-grey/80 mb-1">Colaborador: <span className="font-semibold">{entry.employeeName}</span></p>
        <p className="text-bokara-grey/60 mb-4 text-sm">Fecha original: {new Date(entry.timestamp).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>

        {/* SOLICITUD DEL COLABORADOR */}
        {entry.correctionRequest && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-yellow-800 font-bold uppercase mb-1">Solicitud del Colaborador</p>
            <p className="text-sm text-bokara-grey italic">"{entry.correctionRequest}"</p>

            {hasSuggestion && (
              <div className="mt-2 pt-2 border-t border-yellow-200">
                <p className="text-xs text-yellow-800 font-bold uppercase mb-1.5">Corrección sugerida</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {(entry as any).correctionSuggestedTime && (
                    <span className="text-xs bg-white border border-yellow-300 px-2 py-1 rounded font-mono text-bokara-grey">
                      🕐 {(entry as any).correctionSuggestedTime}
                    </span>
                  )}
                  {(entry as any).correctionSuggestedAction && (
                    <span className="text-xs bg-white border border-yellow-300 px-2 py-1 rounded text-bokara-grey">
                      ⚡ {(entry as any).correctionSuggestedAction}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={applySuggestion}
                    className="text-xs bg-yellow-200 hover:bg-yellow-300 text-yellow-900 font-bold px-3 py-1 rounded transition-colors"
                  >
                    Aplicar sugerencia
                  </button>
                </div>
              </div>
            )}

            {entry.correctionStatus === 'pending' && (
              <span className="inline-block mt-2 text-[10px] bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded font-bold">PENDIENTE</span>
            )}
          </div>
        )}

        <form onSubmit={handleSubmitNormal} className="space-y-4">

          {/* ── FECHA ── */}
          <div>
            <label htmlFor="logDate" className="block text-sm font-medium text-lucius-lime mb-1">Fecha</label>
            <div className="flex items-center gap-3">
              <input
                id="logDate"
                type="date"
                value={editedDate}
                max={todayStr}
                onChange={e => setEditedDate(e.target.value)}
                className="bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime"
                required
              />
              {editedDateLabel && (
                <span className="text-xs text-bokara-grey/50 capitalize">{editedDateLabel}</span>
              )}
            </div>
          </div>

          {/* ── HORA + ACCIÓN ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="logTime" className="block text-sm font-medium text-lucius-lime mb-1">Hora</label>
              <input
                id="logTime"
                type="time"
                value={editedTime}
                onChange={e => setEditedTime(e.target.value)}
                className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-lucius-lime"
                required
              />
            </div>
            <div>
              <label htmlFor="logAction" className="block text-sm font-medium text-lucius-lime mb-1">Acción</label>
              <select
                id="logAction"
                value={editedAction}
                onChange={e => setEditedAction(e.target.value)}
                className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime"
              >
                {actionOptions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── CONTEXTO / RESPUESTA ── */}
          <div>
            <label htmlFor="adminNote" className="block text-sm font-medium text-lucius-lime mb-1">
              Contexto / Respuesta
            </label>
            <textarea
              id="adminNote"
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lucius-lime resize-none h-20"
              placeholder="Ej: Aprobado, ajusté la hora de salida."
            />
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

          <div className="pt-4 border-t border-bokara-grey/10 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-bokara-grey rounded-lg hover:bg-gray-300 font-semibold text-sm">
              Cancelar
            </button>
            {isHandlingRequest ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSave('rejected')}
                  disabled={!adminNote}
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