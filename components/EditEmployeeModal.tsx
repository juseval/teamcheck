
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

  const tabs = [
      { id: 'info', label: 'Employee Information' },
      { id: 'permissions', label: 'Permissions' },
      { id: 'clock', label: 'Clock In/Out' },
      { id: 'hr', label: 'Payroll & HR' }
  ];

  return (
    <div className="fixed inset-0 bg-bokara-grey bg-opacity-50 flex items-center justify-center z-50 transition-opacity" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-bright-white rounded-xl shadow-2xl w-full max-w-4xl border border-bokara-grey/10 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold text-bokara-grey">EDIT EMPLOYEE: {employeeData.name}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
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
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">First Name</label>
                    <input name="name" type="text" value={employeeData.name || ''} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-1 focus:ring-lucius-lime" required />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Email</label>
                    <input name="email" type="email" value={employeeData.email || ''} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-1 focus:ring-lucius-lime" required />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Phone</label>
                    <input name="phone" type="tel" value={employeeData.phone || ''} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-1 focus:ring-lucius-lime" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Schedule</label>
                    <select name="workScheduleId" value={employeeData.workScheduleId || ''} onChange={handleChange} className="w-full border rounded-lg p-2">
                        <option value="">No Assigned</option>
                        {workSchedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>
          )}

          {/* TAB: PERMISSIONS */}
          {activeTab === 'permissions' && (
              <div className="space-y-8 animate-fade-in">
                  <div className="border rounded-xl p-6 bg-white shadow-sm">
                      <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-wider">Account Type</h3>
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
                                      <p className="font-bold text-gray-700 capitalize">{role === 'admin' ? 'Administrator' : 'Employee'}</p>
                                      <p className="text-xs text-gray-400">
                                          {role === 'admin' ? 'Has full access to employees and business settings.' : 'Standard user role with access to his/her own profile only.'}
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
                  <div className="border rounded-xl p-6 bg-white shadow-sm">
                      <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-wider">Allow / Restriction</h3>
                      <div className="space-y-4">
                          <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                              <input 
                                type="checkbox" 
                                name="allowMobileClockIn" 
                                checked={employeeData.allowMobileClockIn} 
                                onChange={handleChange}
                                className="w-5 h-5 rounded text-lucius-lime focus:ring-lucius-lime"
                              />
                              <div>
                                  <p className="font-bold text-gray-700 text-sm">Allow employee to clock in/out on mobile application</p>
                                  <p className="text-[10px] text-red-500 font-bold">Si se desmarca, el usuario solo podrá marcar desde Computadores.</p>
                              </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                              <input 
                                type="checkbox" 
                                name="autoClockOut24h" 
                                checked={employeeData.autoClockOut24h} 
                                onChange={handleChange}
                                className="w-5 h-5 rounded text-lucius-lime focus:ring-lucius-lime"
                              />
                              <p className="font-bold text-gray-700 text-sm">Automatically clock out employee after 24 hours of working</p>
                          </label>

                           <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                              <input 
                                type="checkbox" 
                                name="blockEarlyClockIn" 
                                checked={employeeData.blockEarlyClockIn} 
                                onChange={handleChange}
                                className="w-5 h-5 rounded text-lucius-lime focus:ring-lucius-lime"
                              />
                              <p className="font-bold text-gray-700 text-sm">Do not allow user to clock in before schedule start time</p>
                          </label>
                      </div>
                  </div>
              </div>
          )}

          {/* TAB: HR */}
          {activeTab === 'hr' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                   <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Hire Date</label>
                        <input name="hireDate" type="date" value={employeeData.hireDate ? new Date(employeeData.hireDate).toISOString().split('T')[0] : ''} onChange={handleChange} className="w-full border rounded-lg p-2" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Termination Date</label>
                        <input name="terminationDate" type="date" value={employeeData.terminationDate ? new Date(employeeData.terminationDate).toISOString().split('T')[0] : ''} onChange={handleChange} className="w-full border rounded-lg p-2" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Manual Vacation Adjustment (Days)</label>
                        <input name="manualVacationAdjustment" type="number" step="0.5" value={employeeData.manualVacationAdjustment || 0} onChange={handleChange} className="w-full border rounded-lg p-2" />
                    </div>
              </div>
          )}

        </form>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-bokara-grey font-bold rounded-lg hover:bg-gray-300">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} className="px-10 py-2 bg-lucius-lime text-bokara-grey font-bold rounded-lg hover:bg-opacity-80 transition-colors shadow-md disabled:opacity-50" disabled={!isFormValid}>
              Save Changes
            </button>
        </div>
      </div>
    </div>
  );
};

export default EditEmployeeModal;
