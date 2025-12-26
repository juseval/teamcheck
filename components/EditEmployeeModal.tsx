
import React, { useState, useEffect } from 'react';
import { Employee, WorkSchedule } from '../types';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateEmployee: (employeeData: Employee) => void;
  employeeToEdit: Employee | null;
  workSchedules: WorkSchedule[];
}

const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({ isOpen, onClose, onUpdateEmployee, employeeToEdit, workSchedules }) => {
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);

  useEffect(() => {
    if (employeeToEdit) {
      setEmployeeData(employeeToEdit);
    }
  }, [employeeToEdit]);

  if (!isOpen || !employeeData) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      
      setEmployeeData(prev => {
          if (!prev) return null;
          let val: any = value;
          if (name === 'manualVacationAdjustment') val = Number(value);
          if (name === 'hireDate' || name === 'terminationDate') val = value ? new Date(value).getTime() : undefined;
          
          return { ...prev, [name]: val };
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (employeeData && employeeData.name?.trim() && employeeData.email?.trim()) {
      onUpdateEmployee({
          ...employeeData,
          workScheduleId: employeeData.workScheduleId || null
      });
    }
  };
  
  const isFormValid = !!(employeeData && employeeData.name?.trim() && employeeData.email?.trim());

  return (
    <div className="fixed inset-0 bg-bokara-grey bg-opacity-50 flex items-center justify-center z-50 transition-opacity" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-bright-white rounded-xl shadow-2xl p-6 w-full max-w-2xl border border-bokara-grey/10 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-bokara-grey mb-6">Editar Colaborador</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="editEmployeeName" className="block text-sm font-medium text-lucius-lime mb-1">Nombre Completo</label>
              <input id="editEmployeeName" name="name" type="text" value={employeeData.name || ''} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" required />
            </div>
             <div>
              <label htmlFor="editEmployeeEmail" className="block text-sm font-medium text-lucius-lime mb-1">Correo</label>
              <input id="editEmployeeEmail" name="email" type="email" value={employeeData.email || ''} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" required />
            </div>
             <div>
              <label htmlFor="editEmployeePhone" className="block text-sm font-medium text-lucius-lime mb-1">Teléfono</label>
              <input id="editEmployeePhone" name="phone" type="tel" value={employeeData.phone || ''} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" />
            </div>
             <div>
              <label htmlFor="editEmployeeLocation" className="block text-sm font-medium text-lucius-lime mb-1">Ubicación Principal</label>
              <input id="editEmployeeLocation" name="location" type="text" value={employeeData.location || ''} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" />
            </div>
             <div>
              <label htmlFor="editEmployeeRole" className="block text-sm font-medium text-lucius-lime mb-1">Rol</label>
              <select id="editEmployeeRole" name="role" value={employeeData.role} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime">
                <option value="employee">Colaborador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
             <div>
              <label htmlFor="editWorkScheduleId" className="block text-sm font-medium text-lucius-lime mb-1">Horario de Trabajo</label>
                <select id="editWorkScheduleId" name="workScheduleId" value={employeeData.workScheduleId || ''} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime">
                  <option value="">No Asignado</option>
                  {workSchedules.map(schedule => (
                    <option key={schedule.id} value={schedule.id}>{schedule.name}</option>
                  ))}
                </select>
            </div>

            <div className="md:col-span-2 border-t border-bokara-grey/10 pt-4 mt-2">
                <h3 className="font-bold text-bokara-grey text-sm mb-3 uppercase tracking-wider">Recursos Humanos (Libro de Vacaciones)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="edit_hireDate" className="block text-sm font-medium text-lucius-lime mb-1">Fecha de Ingreso</label>
                        <input 
                            id="edit_hireDate" 
                            name="hireDate" 
                            type="date" 
                            value={employeeData.hireDate ? new Date(employeeData.hireDate).toISOString().split('T')[0] : ''} 
                            onChange={handleChange} 
                            className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" 
                            required 
                        />
                    </div>
                    <div>
                        <label htmlFor="edit_terminationDate" className="block text-sm font-medium text-red-600 mb-1">Fecha de Retiro</label>
                        <input 
                            id="edit_terminationDate" 
                            name="terminationDate" 
                            type="date" 
                            value={employeeData.terminationDate ? new Date(employeeData.terminationDate).toISOString().split('T')[0] : ''} 
                            onChange={handleChange} 
                            className="w-full bg-whisper-white border border-red-200 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500" 
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="edit_manualVacationAdjustment" className="block text-sm font-medium text-lucius-lime mb-1">Ajuste Manual de Saldo</label>
                        <input id="edit_manualVacationAdjustment" name="manualVacationAdjustment" type="number" step="0.5" value={employeeData.manualVacationAdjustment || 0} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" />
                    </div>
                </div>
            </div>
          </div>
          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-bokara-grey rounded-lg hover:bg-gray-300 transition-colors">
              Cancelar
            </button>
            <button type="submit" className="py-2 px-4 bg-lucius-lime text-bokara-grey font-bold rounded-lg hover:bg-opacity-80 transition-colors disabled:bg-lucius-lime/40 disabled:cursor-not-allowed" disabled={!isFormValid}>
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEmployeeModal;
