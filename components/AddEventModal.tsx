


import React, { useState, useEffect } from 'react';
import { Employee, PayrollChangeType, CalendarEvent } from '../types.ts';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEvent: (eventData: Omit<CalendarEvent, 'id'>) => void;
  employees: Employee[];
  payrollChangeTypes: PayrollChangeType[];
}

const AddEventModal: React.FC<AddEventModalProps> = ({ isOpen, onClose, onAddEvent, employees, payrollChangeTypes }) => {
  const [eventData, setEventData] = useState({
      employeeId: employees.length > 0 ? employees[0].id : '',
      type: payrollChangeTypes.length > 0 ? payrollChangeTypes[0].name : '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    // Reset form when modal is opened
    if (isOpen) {
        setEventData({
            employeeId: employees.length > 0 ? employees[0].id : '',
            type: payrollChangeTypes.length > 0 ? payrollChangeTypes[0].name : '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
        });
    }
  }, [isOpen, employees, payrollChangeTypes]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setEventData(prev => ({ ...prev, [name]: value }));
  };
  
  const isFormValid = eventData.employeeId && eventData.type && eventData.startDate && eventData.endDate && eventData.startDate <= eventData.endDate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid) {
      onAddEvent({
        ...eventData,
        status: 'approved' // Manually added events by admin are auto-approved
      });
    }
  };
  
  return (
    <div className="fixed inset-0 bg-bokara-grey bg-opacity-50 flex items-center justify-center z-50 transition-opacity" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-bright-white rounded-xl shadow-2xl p-6 w-full max-w-lg border border-bokara-grey/10" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-bokara-grey mb-6">Agregar Novedad</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="employeeId" className="block text-sm font-medium text-lucius-lime mb-1">Empleado</label>
                <select id="employeeId" name="employeeId" value={eventData.employeeId} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime">
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="type" className="block text-sm font-medium text-lucius-lime mb-1">Tipo de Novedad</label>
                <select id="type" name="type" value={eventData.type} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime">
                    {payrollChangeTypes.map(pt => <option key={pt.id} value={pt.name}>{pt.name}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-lucius-lime mb-1">Fecha de Inicio</label>
                    <input id="startDate" name="startDate" type="date" value={eventData.startDate} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" required />
                </div>
                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-lucius-lime mb-1">Fecha de Fin</label>
                    <input id="endDate" name="endDate" type="date" value={eventData.endDate} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" required />
                </div>
            </div>
          
          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-bokara-grey rounded-lg hover:bg-gray-300 transition-colors">
              Cancelar
            </button>
            <button type="submit" className="py-2 px-4 bg-lucius-lime text-bokara-grey font-bold rounded-lg hover:bg-opacity-80 transition-colors disabled:bg-lucius-lime/40 disabled:cursor-not-allowed" disabled={!isFormValid}>
              Aplicar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEventModal;