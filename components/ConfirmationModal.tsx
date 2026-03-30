
import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-bokara-grey bg-opacity-75 flex items-center justify-center z-[9999] transition-opacity" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-bright-white rounded-xl shadow-2xl p-6 w-full max-w-sm border border-bokara-grey/10 animate-fade-in" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-bokara-grey mb-4">{title}</h2>
        <p className="text-bokara-grey/90 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-bokara-grey rounded-lg hover:bg-gray-300 transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} className="py-2 px-4 bg-red-600/80 text-bright-white font-bold rounded-lg hover:bg-red-600 transition-colors">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
