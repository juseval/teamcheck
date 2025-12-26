
import React, { useState } from 'react';
import { Employee, WorkSchedule } from '../types';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
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
      hireDate: new Date().toISOString().split('T')[0],
      terminationDate: '',
      manualVacationAdjustment: 0
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setEmployeeData(prev => ({ 
          ...prev, 
          [name]: name === 'manualVacationAdjustment' ? Number(value) : value 
      }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (employeeData.name.trim() && employeeData.email.trim()) {
      onAddEmployee({
        ...employeeData,
        workScheduleId: employeeData.workScheduleId || null,
        hireDate: new Date(employeeData.hireDate).getTime(),
        terminationDate: employeeData.terminationDate ? new Date(employeeData.terminationDate).getTime() : undefined,
        manualVacationAdjustment: employeeData.manualVacationAdjustment
      });
      // Reset
      setEmployeeData({
          name: '',
          email: '',
          phone: '',
          location: 'Oficina Principal',
          role: 'employee',
          workScheduleId: '',
          hireDate: new Date().toISOString().split('T')[0],
          terminationDate: '',
          manualVacationAdjustment: 0
      });
    }
  };
  
  const isFormValid = employeeData.name.trim() && employeeData.email.trim();

  return (
    <div className="fixed inset-0 bg-bokara-grey bg-opacity-50 flex items-center justify-center z-50 transition-opacity" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-bright-white rounded-xl shadow-2xl p-6 w-full max-w-2xl border border-bokara-grey/10 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
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
                  {workSchedules.map(schedule => (
                    <option key={schedule.id} value={schedule.id}>{schedule.name}</option>
                  ))}
                </select>
            </div>
            
            <div className="md:col-span-2 border-t border-bokara-grey/10 pt-4 mt-2">
                <h3 className="font-bold text-bokara-grey text-sm mb-3 uppercase tracking-wider">Recursos Humanos (Libro de Vacaciones)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="hireDate" className="block text-sm font-medium text-lucius-lime mb-1">Fecha de Ingreso</label>
                        <input id="hireDate" name="hireDate" type="date" value={employeeData.hireDate} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" required />
                    </div>
                    <div>
                        <label htmlFor="terminationDate" className="block text-sm font-medium text-red-600 mb-1">Fecha de Retiro (Opcional)</label>
                        <input id="terminationDate" name="terminationDate" type="date" value={employeeData.terminationDate} onChange={handleChange} className="w-full bg-whisper-white border border-red-200 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500" />
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="manualVacationAdjustment" className="block text-sm font-medium text-lucius-lime mb-1">Días de Vacaciones Pendientes (Ajuste Manual)</label>
                        <input id="manualVacationAdjustment" name="manualVacationAdjustment" type="number" step="0.5" value={employeeData.manualVacationAdjustment} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" placeholder="Ej: 5.5" />
                        <p className="text-[10px] text-bokara-grey/50 mt-1">Suma o resta días al saldo calculado automáticamente.</p>
                    </div>
                </div>
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
