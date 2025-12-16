
import React, { useState } from 'react';
import { Employee, WorkSchedule } from '../types';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  // FIX: Added 'companyId' to Omit to prevent type error since the modal doesn't handle companyId.
  onAddEmployee: (employeeData: Omit<Employee, 'id' | 'status' | 'lastClockInTime' | 'currentStatusStartTime' | 'companyId'>) => void;
  workSchedules: WorkSchedule[];
}

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ isOpen, onClose, onAddEmployee, workSchedules }) => {
  const [employeeData, setEmployeeData] = useState({
      name: '',
      email: '',
      phone: '',
      location: 'Oficina Principal',
      role: 'employee' as 'admin' | 'employee',
      workScheduleId: '',
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setEmployeeData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (employeeData.name.trim() && employeeData.email.trim()) {
      onAddEmployee({
        ...employeeData,
        workScheduleId: employeeData.workScheduleId || null,
      });
      // Reset form for next entry
      setEmployeeData({
          name: '',
          email: '',
          phone: '',
          location: 'Oficina Principal',
          role: 'employee',
          workScheduleId: '',
      });
    }
  };
  
  const isFormValid = employeeData.name.trim() && employeeData.email.trim();
  const safeSchedules = Array.isArray(workSchedules) ? workSchedules : [];

  return (
    <div className="fixed inset-0 bg-bokara-grey bg-opacity-50 flex items-center justify-center z-50 transition-opacity" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-bright-white rounded-xl shadow-2xl p-6 w-full max-w-lg border border-bokara-grey/10" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-bokara-grey mb-6">Agregar Nuevo Colaborador</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="employeeName" className="block text-sm font-medium text-lucius-lime mb-1">Nombre Completo</label>
              <input id="employeeName" name="name" type="text" value={employeeData.name} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" placeholder="Ej: Juan Pérez" required />
            </div>
             <div>
              <label htmlFor="employeeEmail" className="block text-sm font-medium text-lucius-lime mb-1">Correo</label>
              <input id="employeeEmail" name="email" type="email" value={employeeData.email} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" placeholder="Ej: juan@empresa.com" required />
            </div>
             <div>
              <label htmlFor="employeePhone" className="block text-sm font-medium text-lucius-lime mb-1">Teléfono</label>
              <input id="employeePhone" name="phone" type="tel" value={employeeData.phone} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" placeholder="(555) 123-4567" />
            </div>
             <div>
              <label htmlFor="employeeLocation" className="block text-sm font-medium text-lucius-lime mb-1">Ubicación Principal</label>
              <input id="employeeLocation" name="location" type="text" value={employeeData.location} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" placeholder="Ej: Oficina Principal" />
            </div>
             <div>
              <label htmlFor="employeeRole" className="block text-sm font-medium text-lucius-lime mb-1">Rol</label>
              <select id="employeeRole" name="role" value={employeeData.role} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime">
                <option value="employee">Colaborador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
             <div>
              <label htmlFor="workScheduleId" className="block text-sm font-medium text-lucius-lime mb-1">Horario de Trabajo</label>
                <select id="workScheduleId" name="workScheduleId" value={employeeData.workScheduleId} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime">
                  <option value="">No Asignado</option>
                  {safeSchedules.map(schedule => (
                    <option key={schedule.id} value={schedule.id}>{schedule.name}</option>
                  ))}
                </select>
            </div>
          </div>
          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-bokara-grey rounded-lg hover:bg-gray-300 transition-colors">
              Cancelar
            </button>
            <button type="submit" className="py-2 px-4 bg-lucius-lime text-bokara-grey font-bold rounded-lg hover:bg-opacity-80 transition-colors disabled:bg-lucius-lime/40 disabled:cursor-not-allowed" disabled={!isFormValid}>
              Agregar Colaborador
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
