
import React, { useState, useEffect, useMemo } from 'react';
import { Employee, WorkSchedule, CalendarEvent } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import EmployeeScheduleBoard from '../components/EmployeeScheduleBoard';
import { updateEmployeeDetails, getCalendarEvents } from '../services/apiService';

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

  // --- LÓGICA DE VACACIONES CONTABLE LEGAL (30/360) ---
  const getVacationData = (emp: Employee) => {
      if (!emp.hireDate) return { accrued: "0.00", taken: "0.0", balance: "0.00", daysWorked: 0, history: [] };
      
      const start = new Date(emp.hireDate);
      const end = emp.terminationDate ? new Date(emp.terminationDate) : new Date();
      
      // Normalización Contable (Método 30/360)
      let d1 = start.getDate();
      let m1 = start.getMonth() + 1;
      let y1 = start.getFullYear();
      
      let d2 = end.getDate();
      let m2 = end.getMonth() + 1;
      let y2 = end.getFullYear();

      // Ajuste de días 31 a 30
      if (d1 === 31) d1 = 30;
      if (d2 === 31) d2 = 30;
      
      // Ajuste especial para Febrero (contablemente son 30 días en base 360)
      if (m1 === 2 && d1 >= 28) d1 = 30;
      if (m2 === 2 && d2 >= 28) d2 = 30;

      // Cálculo de Días Laborados (Base 360) INCLUSIVO (+1)
      // Fórmula: ((Y2 - Y1) * 360) + ((M2 - M1) * 30) + (D2 - D1) + 1
      const accountingDays = ((y2 - y1) * 360) + ((m2 - m1) * 30) + (d2 - d1) + 1;
      
      // Proporción: (Días Trabajados * 15 días de vacaciones) / 360 días del año
      // Esto da exactamente 1.25 días por cada 30 días laborados.
      const accrued = (accountingDays * 15) / 360;
      
      const adjustment = emp.manualVacationAdjustment || 0;

      const myApprovedVacations = allEvents.filter(e => 
          e.employeeId === emp.id && 
          (e.type === 'Vacation' || e.type === 'Vacaciones') && 
          e.status === 'approved'
      );

      let taken = 0;
      myApprovedVacations.forEach(e => {
          const s = new Date(e.startDate);
          const f = new Date(e.endDate);
          const duration = Math.ceil((f.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          taken += duration;
      });

      return {
          accrued: accrued.toFixed(2),
          taken: taken.toFixed(1),
          balance: (accrued + adjustment - taken).toFixed(2),
          daysWorked: accountingDays,
          history: myApprovedVacations
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
          console.error(error);
          addNotification("Error al actualizar horario", 'error');
      }
  };

  return (
    <div className="w-full mx-auto animate-fade-in space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-bokara-grey">Colaboradores</h1>
          <span className="bg-lucius-lime/20 text-bokara-grey text-lg font-bold px-3 py-1 rounded-full">{safeEmployees.length}</span>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg border border-bokara-grey/10 p-1 flex">
                <button onClick={() => setActiveTab('list')} className={`p-2 rounded-md transition-all ${activeTab === 'list' ? 'bg-bokara-grey text-white shadow-sm' : 'text-bokara-grey/50 hover:bg-whisper-white'}`} title="Vista de Lista"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg></button>
                <button onClick={() => setActiveTab('board')} className={`p-2 rounded-md transition-all ${activeTab === 'board' ? 'bg-bokara-grey text-white shadow-sm' : 'text-bokara-grey/50 hover:bg-whisper-white'}`} title="Vista de Tablero"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 00-2 2" /></svg></button>
                <button onClick={() => setActiveTab('vacations')} className={`p-2 rounded-md transition-all ${activeTab === 'vacations' ? 'bg-lucius-lime text-bokara-grey shadow-sm' : 'text-bokara-grey/50 hover:bg-whisper-white'}`} title="Libro de Vacaciones"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></button>
            </div>
            <button onClick={onAddEmployee} className="bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg shadow-md flex items-center gap-2 cursor-pointer transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg><span className="hidden sm:inline">Nuevo Colaborador</span></button>
        </div>
      </div>

      {currentUser.role === 'admin' && (
          <div className="bg-white rounded-xl shadow-sm border border-lucius-lime/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                  <div className="p-3 bg-lucius-lime/10 rounded-full text-lucius-lime"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg></div>
                  <div><h3 className="font-bold text-bokara-grey">Vinculación de Colaboradores</h3><p className="text-xs text-bokara-grey/60 max-w-lg">Crea el perfil primero y luego diles que se registren con su correo y este código.</p></div>
              </div>
              <div className="flex flex-col gap-1 w-full sm:w-auto"><span className="text-[10px] font-bold text-lucius-lime uppercase tracking-wider">Código de Organización</span><div className="flex items-center gap-2"><div className="bg-whisper-white/50 border border-bokara-grey/10 rounded-lg px-4 py-2 text-lg font-mono font-bold text-bokara-grey">{currentUser.companyId}</div><button onClick={copyToClipboard} className="p-3 bg-white border border-bokara-grey/20 hover:bg-whisper-white rounded-lg text-bokara-grey cursor-pointer transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg></button></div></div>
          </div>
      )}
      
      {activeTab === 'list' && (
        <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                <tr className="bg-whisper-white/50 border-b border-bokara-grey/10">
                    {["Nombre", "Ingreso", "Retiro", "Horario", "Saldo Vac.", "Estado", "Acciones"].map(header => (<th key={header} className="p-4 text-[11px] font-bold text-bokara-grey/60 uppercase tracking-widest whitespace-nowrap">{header}</th>))}
                </tr>
                </thead>
                <tbody>
                {safeEmployees.length > 0 ? (
                    safeEmployees.map(employee => {
                    const vac = getVacationData(employee);
                    return (
                    <tr key={employee.id} className={`border-b border-bokara-grey/10 hover:bg-whisper-white/40 transition-colors ${employee.terminationDate ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                        <td className="p-4 whitespace-nowrap">
                            <div className="font-bold text-bokara-grey">{employee.name}</div>
                            <div className="text-[10px] text-bokara-grey/50 truncate max-w-[150px]">{employee.email}</div>
                        </td>
                        <td className="p-4 whitespace-nowrap text-xs text-bokara-grey/90 font-mono">
                            {employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('es-CO') : '-'}
                        </td>
                        <td className="p-4 whitespace-nowrap text-xs text-red-600/80 font-mono">
                            {employee.terminationDate ? new Date(employee.terminationDate).toLocaleDateString('es-CO') : '-'}
                        </td>
                        <td className="p-4 whitespace-nowrap text-xs text-bokara-grey/90">{employee.workScheduleId ? scheduleMap.get(employee.workScheduleId) : 'N/A'}</td>
                        <td className="p-4 whitespace-nowrap">
                            <div className="flex flex-col">
                                <span className={`text-lg font-display font-bold ${Number(vac.balance) < 0 ? 'text-red-500' : 'text-lucius-lime'}`}>
                                    {vac.balance} días
                                </span>
                                <span className="text-[9px] text-bokara-grey/40 uppercase font-bold tracking-widest">Saldo Actual</span>
                            </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                            employee.terminationDate ? 'bg-red-100 text-red-700' :
                            employee.status === 'Working' ? 'bg-lucius-lime text-white shadow-sm' :
                            'bg-gray-100 text-gray-600'
                        }`}>
                            {employee.terminationDate ? 'Retirado' : employee.status}
                        </span>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <button onClick={() => onEditEmployee(employee.id)} className="p-1.5 hover:bg-lucius-lime/10 rounded-md text-lucius-lime transition-colors cursor-pointer" title="Editar Perfil"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                            <button onClick={() => { setSelectedHistoryEmp(employee); }} className="p-1.5 hover:bg-wet-sand/10 rounded-md text-wet-sand transition-colors cursor-pointer" title="Ver Historial Vacaciones"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></button>
                            <button onClick={() => onRemoveEmployee(employee.id)} className="p-1.5 hover:bg-red-50 rounded-md text-red-400 transition-colors cursor-pointer" title="Eliminar"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                        </td>
                    </tr>
                    )})
                ) : (
                    <tr><td colSpan={7} className="text-center p-16 text-bokara-grey/50 font-medium">No hay colaboradores registrados.</td></tr>
                )}
                </tbody>
            </table>
            </div>
        </div>
      )}

      {activeTab === 'board' && (
          <div className="h-[600px] min-h-[500px]"><EmployeeScheduleBoard employees={safeEmployees} workSchedules={safeWorkSchedules} onUpdateEmployeeSchedule={handleUpdateSchedule}/></div>
      )}

      {activeTab === 'vacations' && (
          <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                  <div>
                      <h2 className="text-2xl font-bold text-bokara-grey">Libro Maestro de Vacaciones</h2>
                      <p className="text-xs text-bokara-grey/50">Regla: 15 días hábiles por año laborado (1.25 días por mes contable de 30 días).</p>
                  </div>
                  <div className="flex gap-4 text-[10px] uppercase font-bold tracking-tighter">
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-lucius-lime"></span> Saldo Positivo</div>
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> Saldo Deudor</div>
                  </div>
              </div>

              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead>
                          <tr className="border-b border-bokara-grey/10 bg-gray-50 text-[10px] font-bold text-bokara-grey/50 uppercase tracking-widest">
                              <th className="p-3">Colaborador</th>
                              <th className="p-3 text-center">Ingreso</th>
                              <th className="p-3 text-center">Días Laborados</th>
                              <th className="p-3 text-right">Días Devengados</th>
                              <th className="p-3 text-right">Ajuste</th>
                              <th className="p-3 text-right">Tomados</th>
                              <th className="p-3 text-right text-bokara-grey">Saldo Neto</th>
                          </tr>
                      </thead>
                      <tbody>
                          {safeEmployees.map(emp => {
                              const vac = getVacationData(emp);
                              return (
                                  <tr key={emp.id} className="border-b border-bokara-grey/5 hover:bg-whisper-white/20 transition-colors">
                                      <td className="p-3 font-bold text-bokara-grey">{emp.name}</td>
                                      <td className="p-3 text-center text-xs font-mono text-bokara-grey/60">{emp.hireDate ? new Date(emp.hireDate).toLocaleDateString('es-CO') : 'Sin Fecha'}</td>
                                      <td className="p-3 text-center text-xs font-mono text-lucius-lime font-bold">{vac.daysWorked}</td>
                                      <td className="p-3 text-right font-medium text-bokara-grey/60">{vac.accrued}</td>
                                      <td className="p-3 text-right font-medium text-wet-sand">{emp.manualVacationAdjustment || 0}</td>
                                      <td className="p-3 text-right font-medium text-red-400">{vac.taken}</td>
                                      <td className={`p-3 text-right font-display font-bold text-lg ${Number(vac.balance) < 0 ? 'text-red-500' : 'text-lucius-lime'}`}>{vac.balance}</td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* MODAL HISTORIAL INDIVIDUAL (KARDEX) */}
      {selectedHistoryEmp && (
          <div className="fixed inset-0 bg-bokara-grey bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setSelectedHistoryEmp(null)}>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="p-6 bg-whisper-white/30 border-b border-bokara-grey/10 flex justify-between items-center">
                      <div>
                          <h3 className="text-xl font-bold text-bokara-grey">Historial de Vacaciones</h3>
                          <p className="text-xs text-lucius-lime font-bold uppercase tracking-widest">{selectedHistoryEmp.name}</p>
                      </div>
                      <button onClick={() => setSelectedHistoryEmp(null)} className="p-2 hover:bg-white rounded-full transition-all text-bokara-grey/40 hover:text-bokara-grey cursor-pointer"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                  
                  <div className="flex-grow p-6 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4 mb-8">
                          <div className="bg-lucius-lime/5 p-4 rounded-xl border border-lucius-lime/20">
                              <p className="text-[10px] font-bold text-lucius-lime uppercase mb-1">Días Acumulados (Ley)</p>
                              <p className="text-3xl font-display font-bold text-bokara-grey">{getVacationData(selectedHistoryEmp).accrued}</p>
                          </div>
                          <div className="bg-wet-sand/5 p-4 rounded-xl border border-wet-sand/20">
                              <p className="text-[10px] font-bold text-wet-sand uppercase mb-1">Ajuste Administrativo</p>
                              <p className="text-3xl font-display font-bold text-bokara-grey">{selectedHistoryEmp.manualVacationAdjustment || 0}</p>
                          </div>
                      </div>

                      <h4 className="text-xs font-bold text-bokara-grey/40 uppercase mb-4 tracking-widest">Tiquetes de Vacaciones Disfrutados</h4>
                      <div className="space-y-3">
                          {getVacationData(selectedHistoryEmp).history.length === 0 ? (
                              <p className="text-center py-8 text-sm text-bokara-grey/30 italic">No hay tiquetes de vacaciones registrados para este colaborador.</p>
                          ) : (
                              getVacationData(selectedHistoryEmp).history.map(evt => {
                                  const s = new Date(evt.startDate);
                                  const f = new Date(evt.endDate);
                                  const dur = Math.ceil((f.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                  return (
                                      <div key={evt.id} className="flex justify-between items-center p-3 bg-whisper-white/20 rounded-lg border border-bokara-grey/5">
                                          <div>
                                              <p className="text-sm font-bold text-bokara-grey">{evt.startDate} al {evt.endDate}</p>
                                              <p className="text-[10px] text-bokara-grey/50 uppercase">Tiquete Aprobado</p>
                                          </div>
                                          <div className="text-right">
                                              <p className="text-lg font-bold text-red-400">-{dur} días</p>
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
