import React, { useState, useEffect } from 'react';
import { Employee, WorkSchedule } from '../types.ts';

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
      setEmployeeData(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (employeeData && employeeData.name.trim() && employeeData.email.trim()) {
      onUpdateEmployee({
          ...employeeData,
          workScheduleId: employeeData.workScheduleId || null
      });
    }
  };
  
  const isFormValid = employeeData.name.trim() && employeeData.email.trim();

  return (
    <div className="fixed inset-0 bg-bokara-grey bg-opacity-50 flex items-center justify-center z-50 transition-opacity" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-bright-white rounded-xl shadow-2xl p-6 w-full max-w-lg border border-bokara-grey/10" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-bokara-grey mb-6">Edit Employee</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="editEmployeeName" className="block text-sm font-medium text-lucius-lime mb-1">Full Name</label>
              <input id="editEmployeeName" name="name" type="text" value={employeeData.name} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" required />
            </div>
             <div>
              <label htmlFor="editEmployeeEmail" className="block text-sm font-medium text-lucius-lime mb-1">Email</label>
              <input id="editEmployeeEmail" name="email" type="email" value={employeeData.email} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" required />
            </div>
             <div>
              <label htmlFor="editEmployeePhone" className="block text-sm font-medium text-lucius-lime mb-1">Phone</label>
              <input id="editEmployeePhone" name="phone" type="tel" value={employeeData.phone} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" />
            </div>
             <div>
              <label htmlFor="editEmployeeLocation" className="block text-sm font-medium text-lucius-lime mb-1">Primary Location</label>
              <input id="editEmployeeLocation" name="location" type="text" value={employeeData.location} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" />
            </div>
             <div>
              <label htmlFor="editEmployeeRole" className="block text-sm font-medium text-lucius-lime mb-1">Role</label>
              <select id="editEmployeeRole" name="role" value={employeeData.role} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime">
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
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
          </div>
          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-bokara-grey rounded-lg hover:bg-gray-300 transition-colors">
              Cancel
            </button>
            <button type="submit" className="py-2 px-4 bg-lucius-lime text-bokara-grey font-bold rounded-lg hover:bg-opacity-80 transition-colors disabled:bg-lucius-lime/40 disabled:cursor-not-allowed" disabled={!isFormValid}>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEmployeeModal;