
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
  const [activeTab, setActiveTab] = useState('info');
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);

  useEffect(() => {
    if (employeeToEdit) {
      setEmployeeData({
          ...employeeToEdit,
          allowMobileClockIn: employeeToEdit.allowMobileClockIn ?? false,
          autoClockOut24h: employeeToEdit.autoClockOut24h ?? true
      });
    }
  }, [employeeToEdit]);

  if (!isOpen || !employeeData) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      
      setEmployeeData(prev => {
          if (!prev) return null;
          let val: any = value;
          if (type === 'checkbox') val = (e.target as HTMLInputElement).checked;
          if (name === 'manualVacationAdjustment') val = Number(value);
          
          // FIX: Manejo robusto de fechas para evitar desfases de un día por zona horaria
          if (name === 'hireDate' || name === 'terminationDate') {
              if (!value) {
                  val = undefined;
              } else {
                  // Creamos la fecha usando el string YYYY-MM-DD y forzamos la hora a 00:00 local
                  const [year, month, day] = value.split('-').map(Number);
                  val = new Date(year, month - 1, day).getTime();
              }
          }
          
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

  // Helper para convertir timestamp a string YYYY-MM-DD compatible con input date
  const timestampToDateString = (ts?: number) => {
      if (!ts) return '';
      const d = new Date(ts);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };
  
  const isFormValid = !!(employeeData && employeeData.name?.trim() && employeeData.email?.trim());

  const tabs = [
      { id: 'info', label: 'Información General' },
      { id: 'permissions', label: 'Permisos' },
      { id: 'clock', label: 'Control de Asistencia' },
      { id: 'hr', label: 'Nómina y RRHH' }
  ];

  return (
    <div className="fixed inset-0 bg-bokara-grey bg-opacity-50 flex items-center justify-center z-50 transition-opacity" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-bright-white rounded-xl shadow-2xl w-full max-w-4xl border border-bokara-grey/10 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold text-bokara-grey uppercase">Editar Colaborador: {employeeData.name}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b bg-white overflow-x-auto whitespace-nowrap scrollbar-hide">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
                        activeTab === tab.id 
                            ? 'border-lucius-lime text-lucius-lime bg-lucius-lime/5' 
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-8 space-y-6">
          
          {/* TAB: INFO */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nombre Completo</label>
                    <input name="name" type="text" value={employeeData.name || ''} onChange={handleChange} className="w-full border border-bokara-grey/20 rounded-lg p-2 focus:ring-1 focus:ring-lucius-lime" required />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Correo Electrónico</label>
                    <input name="email" type="email" value={employeeData.email || ''} onChange={handleChange} className="w-full border border-bokara-grey/20 rounded-lg p-2 focus:ring-1 focus:ring-lucius-lime" required />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Teléfono</label>
                    <input name="phone" type="tel" value={employeeData.phone || ''} onChange={handleChange} className="w-full border border-bokara-grey/20 rounded-lg p-2 focus:ring-1 focus:ring-lucius-lime" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Horario Asignado</label>
                    <select name="workScheduleId" value={employeeData.workScheduleId || ''} onChange={handleChange} className="w-full border border-bokara-grey/20 rounded-lg p-2">
                        <option value="">No Asignado</option>
                        {workSchedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>
          )}

          {/* TAB: PERMISSIONS */}
          {activeTab === 'permissions' && (
              <div className="space-y-8 animate-fade-in">
                  <div className="border border-bokara-grey/10 rounded-xl p-6 bg-white shadow-sm">
                      <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-wider">Tipo de Cuenta</h3>
                      <div className="space-y-4">
                          {['admin', 'employee'].map(role => (
                              <label key={role} className="flex items-start gap-3 cursor-pointer group">
                                  <input 
                                    type="radio" 
                                    name="role" 
                                    value={role} 
                                    checked={employeeData.role === role} 
                                    onChange={handleChange}
                                    className="mt-1 text-lucius-lime focus:ring-lucius-lime"
                                  />
                                  <div>
                                      <p className="font-bold text-gray-700 capitalize">{role === 'admin' ? 'Administrador' : 'Colaborador'}</p>
                                      <p className="text-xs text-gray-400">
                                          {role === 'admin' ? 'Tiene acceso total a la gestión de empleados y configuración.' : 'Usuario estándar con acceso solo a su propio perfil y marcaciones.'}
                                      </p>
                                  </div>
                              </label>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {/* TAB: CLOCK IN/OUT */}
          {activeTab === 'clock' && (
              <div className="space-y-8 animate-fade-in">
                  <div className="border border-bokara-grey/10 rounded-xl p-6 bg-white shadow-sm">
                      <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-wider">Restricciones de Acceso</h3>
                      <div className="space-y-4">
                          <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200">
                              <input 
                                type="checkbox" 
                                name="allowMobileClockIn" 
                                checked={employeeData.allowMobileClockIn} 
                                onChange={handleChange}
                                className="w-5 h-5 rounded text-lucius-lime focus:ring-lucius-lime"
                              />
                              <div>
                                  <p className="font-bold text-gray-700 text-sm">Permitir marcación desde Dispositivos Móviles</p>
                                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter">Si se desmarca, el usuario solo podrá marcar desde computadores de escritorio.</p>
                              </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200">
                              <input 
                                type="checkbox" 
                                name="autoClockOut24h" 
                                checked={employeeData.autoClockOut24h} 
                                onChange={handleChange}
                                className="w-5 h-5 rounded text-lucius-lime focus:ring-lucius-lime"
                              />
                              <p className="font-bold text-gray-700 text-sm">Cierre de sesión automático tras 24 horas continuas de trabajo</p>
                          </label>

                           <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200">
                              <input 
                                type="checkbox" 
                                name="blockEarlyClockIn" 
                                checked={employeeData.blockEarlyClockIn} 
                                onChange={handleChange}
                                className="w-5 h-5 rounded text-lucius-lime focus:ring-lucius-lime"
                              />
                              <p className="font-bold text-gray-700 text-sm">Bloquear entrada antes de la hora programada en el horario</p>
                          </label>
                      </div>
                  </div>
              </div>
          )}

          {/* TAB: RRHH / DÍAS DE ENTRADA Y SALIDA */}
          {activeTab === 'hr' && (
              <div className="animate-fade-in space-y-6">
                   <div className="bg-lucius-lime/5 border border-lucius-lime/20 p-4 rounded-xl mb-4">
                        <p className="text-xs text-lucius-lime font-bold uppercase mb-1">Información de Contrato</p>
                        <p className="text-[11px] text-bokara-grey/60">Estas fechas definen el cálculo automático del Libro de Vacaciones (1.25 días por mes).</p>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-bokara-grey uppercase mb-2">Día de Entrada (Ingreso)</label>
                            <input 
                                name="hireDate" 
                                type="date" 
                                value={timestampToDateString(employeeData.hireDate)} 
                                onChange={handleChange} 
                                className="w-full border border-bokara-grey/20 rounded-lg p-2 focus:ring-2 focus:ring-lucius-lime outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-red-400 uppercase mb-2">Día de Salida (Retiro / Opcional)</label>
                            <input 
                                name="terminationDate" 
                                type="date" 
                                value={timestampToDateString(employeeData.terminationDate)} 
                                onChange={handleChange} 
                                className="w-full border border-red-200 rounded-lg p-2 focus:ring-2 focus:ring-red-400 outline-none" 
                            />
                        </div>
                        <div className="md:col-span-2 pt-4 border-t border-bokara-grey/5">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Ajuste Manual de Vacaciones (Días)</label>
                            <input 
                                name="manualVacationAdjustment" 
                                type="number" 
                                step="0.5" 
                                value={employeeData.manualVacationAdjustment || 0} 
                                onChange={handleChange} 
                                className="w-full border border-bokara-grey/20 rounded-lg p-2" 
                                placeholder="Ej: 5 o -2"
                            />
                            <p className="text-[10px] text-bokara-grey/40 mt-1 italic">Suma o resta días directamente al saldo calculado por sistema.</p>
                        </div>
                   </div>
              </div>
          )}

        </form>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-bokara-grey font-bold rounded-lg hover:bg-gray-300 transition-colors">
              Cancelar
            </button>
            <button type="button" onClick={handleSubmit} className="px-10 py-2 bg-lucius-lime text-bokara-grey font-bold rounded-lg hover:bg-opacity-80 transition-colors shadow-md disabled:opacity-50" disabled={!isFormValid}>
              Guardar Cambios
            </button>
        </div>
      </div>
    </div>
  );
};

export default EditEmployeeModal;
