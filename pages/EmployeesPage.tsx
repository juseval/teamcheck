
import React, { useState, useEffect, useMemo } from 'react';
import { Employee, WorkSchedule, CalendarEvent } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import EmployeeScheduleBoard from '../components/EmployeeScheduleBoard';
import { updateEmployeeDetails, getCalendarEvents } from '../services/apiService';
import { SearchIcon } from '../components/Icons';

interface EmployeesPageProps {
  employees: Employee[];
  onAddEmployee: () => void;
  onEditEmployee: (employeeId: string) => void;
  onRemoveEmployee: (employeeId: string) => void;
  workSchedules: WorkSchedule[];
  currentUser: Employee;
}

const EmployeesPage: React.FC<EmployeesPageProps> = ({ employees, onAddEmployee, onEditEmployee, onRemoveEmployee, workSchedules, currentUser }) => {
  const { addNotification } = useNotification();
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'board' | 'vacations'>('list');
  const [selectedHistoryEmp, setSelectedHistoryEmp] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    const loadEvents = async () => {
        try {
            const evs = await getCalendarEvents();
            setAllEvents(evs);
        } catch(e) { console.error(e); }
    };
    loadEvents();
  }, [employees]);

  const safeEmployees = Array.isArray(employees) ? employees : [];
  const safeWorkSchedules = Array.isArray(workSchedules) ? workSchedules : [];
  const scheduleMap = new Map(safeWorkSchedules.map(s => [s.id, s.name]));

  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return safeEmployees;
    const lower = searchTerm.toLowerCase();
    return safeEmployees.filter(emp => 
        emp.name.toLowerCase().includes(lower) || 
        emp.email.toLowerCase().includes(lower)
    );
  }, [safeEmployees, searchTerm]);

  // --- LÓGICA DE VACACIONES DESGLOSADA (NORMA COLOMBIA 2026) ---
  const getVacationData = (emp: Employee) => {
      if (!emp.hireDate) return { accrued: 0, taken: 0, compensated: 0, balance: 0, maxCompensable: 0, history: [] };
      
      const start = new Date(emp.hireDate);
      const end = emp.terminationDate ? new Date(emp.terminationDate) : new Date();
      
      // Normalización Contable (Método 30/360)
      let d1 = start.getDate();
      let m1 = start.getMonth() + 1;
      let y1 = start.getFullYear();
      let d2 = end.getDate();
      let m2 = end.getMonth() + 1;
      let y2 = end.getFullYear();

      if (d1 === 31) d1 = 30;
      if (d2 === 31) d2 = 30;
      if (m1 === 2 && d1 >= 28) d1 = 30;
      if (m2 === 2 && d2 >= 28) d2 = 30;

      const accountingDays = ((y2 - y1) * 360) + ((m2 - m1) * 30) + (d2 - d1) + 1;
      const accruedBase = (accountingDays * 15) / 360;
      const adjustment = emp.manualVacationAdjustment || 0;
      const totalAccrued = accruedBase + adjustment;

      // Eventos de usuario
      const myEvents = allEvents.filter(e => e.employeeId === emp.id && e.status === 'approved');

      // 1. Disfrutadas (Tiempo)
      let taken = 0;
      myEvents.filter(e => e.type === 'Vacation' || e.type === 'Vacaciones').forEach(e => {
          const s = new Date(e.startDate);
          const f = new Date(e.endDate);
          const duration = Math.ceil((f.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          taken += duration;
      });

      // 2. Compensadas (Dinero)
      let compensated = 0;
      myEvents.filter(e => e.type === 'Vacaciones (Dinero)' || e.type === 'Compensación').forEach(e => {
          const s = new Date(e.startDate);
          const f = new Date(e.endDate);
          const duration = Math.ceil((f.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          compensated += duration;
      });

      const balance = totalAccrued - taken - compensated;
      
      // Límite legal: Máximo 50% de lo acumulado puede ser dinero
      const legalLimitMoney = totalAccrued / 2;
      const maxCompensableRemaining = Math.max(0, legalLimitMoney - compensated);

      return {
          accrued: totalAccrued,
          taken,
          compensated,
          balance,
          maxCompensable: maxCompensableRemaining,
          daysWorked: accountingDays,
          history: myEvents.filter(e => ['Vacation', 'Vacaciones', 'Vacaciones (Dinero)', 'Compensación'].includes(e.type))
      };
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(currentUser.companyId).then(() => {
          addNotification("Código de organización copiado.", 'success');
      }).catch(() => {
          addNotification("Error al copiar el código.", 'error');
      });
  };

  const handleUpdateSchedule = async (employeeId: string, newScheduleId: string | null) => {
      const employee = safeEmployees.find(e => e.id === employeeId);
      if (!employee) return;
      try {
          await updateEmployeeDetails({ ...employee, workScheduleId: newScheduleId });
          addNotification("Horario actualizado", 'success');
      } catch (error) {
          addNotification("Error al actualizar horario", 'error');
      }
  };

  return (
    <div className="w-full mx-auto animate-fade-in space-y-6 pb-8">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-bokara-grey">Colaboradores</h1>
          <span className="bg-lucius-lime/20 text-bokara-grey text-lg font-bold px-3 py-1 rounded-full">{safeEmployees.length}</span>
        </div>

        <div className="w-full xl:max-w-md relative group">
            <input 
                type="text" 
                placeholder="Buscar por nombre o correo..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white rounded-full py-3 pl-6 pr-14 text-bokara-grey shadow-sm border border-bokara-grey/5 focus:outline-none focus:ring-2 focus:ring-lucius-lime/20 transition-all placeholder:text-bokara-grey/30 font-medium"
            />
            <div className="absolute right-1.5 top-1.5 bottom-1.5">
                <div className="h-full aspect-square bg-bokara-grey text-white rounded-full flex items-center justify-center shadow-md">
                    <SearchIcon className="w-5 h-5" />
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="bg-white rounded-lg border border-bokara-grey/10 p-1 flex">
                <button onClick={() => setActiveTab('list')} className={`p-2 rounded-md transition-all ${activeTab === 'list' ? 'bg-bokara-grey text-white shadow-sm' : 'text-bokara-grey/50 hover:bg-whisper-white'}`}><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg></button>
                <button onClick={() => setActiveTab('board')} className={`p-2 rounded-md transition-all ${activeTab === 'board' ? 'bg-bokara-grey text-white shadow-sm' : 'text-bokara-grey/50 hover:bg-whisper-white'}`}><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 00-2 2" /></svg></button>
                <button onClick={() => setActiveTab('vacations')} className={`p-2 rounded-md transition-all ${activeTab === 'vacations' ? 'bg-lucius-lime text-bokara-grey shadow-sm' : 'text-bokara-grey/50 hover:bg-whisper-white'}`}><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></button>
            </div>
            <button onClick={onAddEmployee} className="bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg shadow-md flex items-center gap-2 cursor-pointer transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg><span className="hidden sm:inline">Nuevo Colaborador</span></button>
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                <tr className="bg-whisper-white/50 border-b border-bokara-grey/10">
                    {["Nombre", "Ingreso", "Horario", "Saldo Total", "Estado", "Acciones"].map(header => (<th key={header} className="p-4 text-[11px] font-bold text-bokara-grey/60 uppercase tracking-widest whitespace-nowrap">{header}</th>))}
                </tr>
                </thead>
                <tbody>
                {filteredEmployees.map(employee => {
                    const vac = getVacationData(employee);
                    return (
                    <tr key={employee.id} className="border-b border-bokara-grey/10 hover:bg-whisper-white/40 transition-colors">
                        <td className="p-4 whitespace-nowrap">
                            <div className="font-bold text-bokara-grey">{employee.name}</div>
                            <div className="text-[10px] text-bokara-grey/50">{employee.email}</div>
                        </td>
                        <td className="p-4 whitespace-nowrap text-xs text-bokara-grey/90 font-mono">
                            {employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('es-CO') : '-'}
                        </td>
                        <td className="p-4 whitespace-nowrap text-xs text-bokara-grey/90">{employee.workScheduleId ? scheduleMap.get(employee.workScheduleId) : 'N/A'}</td>
                        <td className="p-4 whitespace-nowrap">
                            <div className="flex flex-col">
                                <span className={`text-lg font-display font-bold ${vac.balance < 0 ? 'text-red-500' : 'text-lucius-lime'}`}>
                                    {vac.balance.toFixed(2)} d
                                </span>
                            </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                            employee.status === 'Working' ? 'bg-lucius-lime text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                            {employee.status}
                        </span>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <button onClick={() => onEditEmployee(employee.id)} className="p-1.5 hover:bg-lucius-lime/10 rounded-md text-lucius-lime transition-colors cursor-pointer"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                            <button onClick={() => setSelectedHistoryEmp(employee)} className="p-1.5 hover:bg-wet-sand/10 rounded-md text-wet-sand transition-colors cursor-pointer"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></button>
                            {employee.role !== 'master' && (
                                <button onClick={() => onRemoveEmployee(employee.id)} className="p-1.5 hover:bg-red-50 rounded-md text-red-400 transition-colors cursor-pointer"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                            )}
                        </div>
                        </td>
                    </tr>
                    )})}
                </tbody>
            </table>
            </div>
        </div>
      )}

      {activeTab === 'board' && (
          <div className="h-[600px] min-h-[500px]"><EmployeeScheduleBoard employees={filteredEmployees} workSchedules={safeWorkSchedules} onUpdateEmployeeSchedule={handleUpdateSchedule}/></div>
      )}

      {activeTab === 'vacations' && (
          <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6 animate-fade-in">
              <div className="mb-6">
                  <h2 className="text-2xl font-bold text-bokara-grey">Libro Maestro de Vacaciones (CST)</h2>
                  <p className="text-xs text-bokara-grey/50">Regla Colombia: 15 días hábiles por año. Máximo 50% compensable en dinero.</p>
              </div>

              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead>
                          <tr className="border-b border-bokara-grey/10 bg-gray-50 text-[10px] font-bold text-bokara-grey/50 uppercase tracking-widest">
                              <th className="p-3">Colaborador</th>
                              <th className="p-3 text-right">Acumuladas</th>
                              <th className="p-3 text-right">Disfrutadas (Tiempo)</th>
                              <th className="p-3 text-right">Compensadas (Dinero)</th>
                              <th className="p-3 text-right">Saldo Disponible</th>
                              <th className="p-3 text-right text-blue-600">Por compensar (Max 50%)</th>
                          </tr>
                      </thead>
                      <tbody>
                          {filteredEmployees.map(emp => {
                              const vac = getVacationData(emp);
                              return (
                                  <tr key={emp.id} className="border-b border-bokara-grey/5 hover:bg-whisper-white/20 transition-colors">
                                      <td className="p-3 font-bold text-bokara-grey">
                                          <div>{emp.name}</div>
                                          <div className="text-[9px] text-bokara-grey/40">{emp.email}</div>
                                      </td>
                                      <td className="p-3 text-right text-xs font-mono text-bokara-grey/60">{vac.accrued.toFixed(2)}</td>
                                      <td className="p-3 text-right text-xs font-mono text-red-400">{vac.taken.toFixed(1)}</td>
                                      <td className="p-3 text-right text-xs font-mono text-wet-sand">{vac.compensated.toFixed(1)}</td>
                                      <td className={`p-3 text-right font-display font-bold text-lg ${vac.balance < 0 ? 'text-red-500' : 'text-lucius-lime'}`}>{vac.balance.toFixed(2)}</td>
                                      <td className="p-3 text-right font-bold text-blue-600 bg-blue-50/30">{vac.maxCompensable.toFixed(2)} d</td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* MODAL KARDEX DESGLOSADO */}
      {selectedHistoryEmp && (
          <div className="fixed inset-0 bg-bokara-grey bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setSelectedHistoryEmp(null)}>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="p-6 bg-whisper-white/30 border-b border-bokara-grey/10 flex justify-between items-center">
                      <div>
                          <h3 className="text-xl font-bold text-bokara-grey">Historial de Vacaciones (Kardex)</h3>
                          <p className="text-xs text-lucius-lime font-bold uppercase tracking-widest">{selectedHistoryEmp.name}</p>
                      </div>
                      <button onClick={() => setSelectedHistoryEmp(null)} className="p-2 text-bokara-grey/40 hover:text-bokara-grey cursor-pointer text-2xl">&times;</button>
                  </div>
                  
                  <div className="flex-grow p-6 overflow-y-auto">
                      <div className="grid grid-cols-3 gap-3 mb-8">
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                              <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Total Ganadas</p>
                              <p className="text-xl font-bold text-bokara-grey">{getVacationData(selectedHistoryEmp).accrued.toFixed(2)}</p>
                          </div>
                          <div className="bg-lucius-lime/5 p-3 rounded-lg border border-lucius-lime/20 text-center">
                              <p className="text-[9px] font-bold text-lucius-lime uppercase mb-1">Disfrutadas (Tiempo)</p>
                              <p className="text-xl font-bold text-bokara-grey">-{getVacationData(selectedHistoryEmp).taken.toFixed(1)}</p>
                          </div>
                          <div className="bg-wet-sand/5 p-3 rounded-lg border border-wet-sand/20 text-center">
                              <p className="text-[9px] font-bold text-wet-sand uppercase mb-1">Compensadas (Dinero)</p>
                              <p className="text-xl font-bold text-bokara-grey">-{getVacationData(selectedHistoryEmp).compensated.toFixed(1)}</p>
                          </div>
                      </div>

                      <h4 className="text-xs font-bold text-bokara-grey/40 uppercase mb-4 tracking-widest">Detalle de Movimientos</h4>
                      <div className="space-y-2">
                          {getVacationData(selectedHistoryEmp).history.length === 0 ? (
                              <p className="text-center py-8 text-sm text-bokara-grey/30 italic">No hay movimientos registrados.</p>
                          ) : (
                              getVacationData(selectedHistoryEmp).history.map(evt => {
                                  const s = new Date(evt.startDate);
                                  const f = new Date(evt.endDate);
                                  const dur = Math.ceil((f.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                  const isMoney = evt.type === 'Vacaciones (Dinero)' || evt.type === 'Compensación';
                                  return (
                                      <div key={evt.id} className="flex justify-between items-center p-3 bg-whisper-white/20 rounded-lg border border-bokara-grey/5">
                                          <div>
                                              <p className="text-sm font-bold text-bokara-grey">{evt.startDate} al {evt.endDate}</p>
                                              <p className={`text-[10px] font-bold uppercase ${isMoney ? 'text-wet-sand' : 'text-lucius-lime'}`}>
                                                  {isMoney ? 'Compensación $ (Dinero)' : 'Disfrute (Tiempo de Descanso)'}
                                              </p>
                                          </div>
                                          <div className="text-right">
                                              <p className={`text-lg font-bold ${isMoney ? 'text-wet-sand' : 'text-red-400'}`}>-{dur} d</p>
                                          </div>
                                      </div>
                                  );
                              })
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default EmployeesPage;
