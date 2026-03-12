import React, { useState, useMemo, useEffect } from 'react';
import { CalendarEvent, PayrollChangeType, Employee } from '../types';
import { EditIcon, TrashIcon } from '../components/Icons';
import { useNotification } from '../contexts/NotificationContext';
import { getNotificationRecipients, getEmailConfig } from '../services/apiService';

interface TicketingPageProps {
  events: CalendarEvent[];
  currentUser: Employee;
  payrollChangeTypes: PayrollChangeType[];
  employees: Employee[];
  onAddRequest: (requestData: Omit<CalendarEvent, 'id' | 'status'>) => void;
  onUpdateRequest: (event: CalendarEvent) => void;
  onRemoveRequest: (event: CalendarEvent) => void;
  onUpdateEventStatus?: (event: CalendarEvent, status: 'approved' | 'rejected') => void;
  onBulkImport?: (events: Omit<CalendarEvent, 'id'>[]) => Promise<void>;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayOfMonth: number;
  isPast: boolean;
  events: {
    event: CalendarEvent;
    isMine: boolean;
    color: string;
    label: string;
  }[];
  isBlocked?: boolean;
}

// ─────────────────────────────────────────────
//  HELPER: Enviar correo vía EmailJS REST API
//  Usa la config guardada en Firestore (Settings → EmailJS)
// ─────────────────────────────────────────────
const sendEmailJS = async (params: {
  to: string[];           // destinatarios
  employeeName: string;   // quien hizo la solicitud
  requestType: string;    // tipo de novedad
  startDate: string;
  endDate: string;
  statusLabel?: string;   // "NUEVA SOLICITUD" | "APROBADO" | "RECHAZADO"
}): Promise<boolean> => {
  try {
    const config = await getEmailConfig();

    // Si no hay config de EmailJS configurada, salimos silenciosamente
    if (!config?.serviceId || !config?.templateId || !config?.publicKey) {
      console.warn('EmailJS no configurado. Ve a Settings → Notificaciones de RRHH.');
      return false;
    }

    if (params.to.length === 0) return false;

    const label = params.statusLabel ?? 'NUEVA SOLICITUD';
    const subject = `[TeamCheck] ${label} — ${params.requestType} de ${params.employeeName}`;

    // Calculamos duración en días para el correo
    const start = new Date(params.startDate + 'T00:00:00');
    const end   = new Date(params.endDate   + 'T00:00:00');
    const days  = Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;

    const promises = params.to.map(recipientEmail =>
      fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id:  config.serviceId,
          template_id: config.templateId,
          user_id:     config.publicKey,
          template_params: {
            // ── Estas variables deben coincidir con tu plantilla de EmailJS ──
            to_email:       recipientEmail,
            subject:        subject,
            employee_name:  params.employeeName,
            request_type:   params.requestType,
            start_date:     params.startDate,
            end_date:       params.endDate,
            duration_days:  `${days} día${days !== 1 ? 's' : ''}`,
            status_label:   label,
            app_url:        window.location.origin,
          },
        }),
      })
    );

    const results = await Promise.allSettled(promises);
    const allOk = results.every(r => r.status === 'fulfilled');
    return allOk;
  } catch (err) {
    console.error('Error al enviar email:', err);
    return false;
  }
};

// ─────────────────────────────────────────────
//  COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
const TicketingPage: React.FC<TicketingPageProps> = ({
  events, currentUser, payrollChangeTypes, employees,
  onAddRequest, onUpdateRequest, onRemoveRequest, onUpdateEventStatus, onBulkImport,
}) => {
  const { addNotification } = useNotification();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isImportModalOpen,  setIsImportModalOpen]  = useState(false);
  const [importRows,         setImportRows]         = useState<{ emp: string; type: string; start: string; end: string; status: 'ok'|'err'; msg: string }[]>([]);
  const [isImporting,        setIsImporting]        = useState(false);
  const [viewType,      setViewType]      = useState('');
  const [editingEvent,  setEditingEvent]  = useState<CalendarEvent | null>(null);

  const [newRequestType,      setNewRequestType]      = useState('');
  const [newRequestStartDate, setNewRequestStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newRequestEndDate,   setNewRequestEndDate]   = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting,        setIsSubmitting]        = useState(false);

  const handlePrevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const handleToday     = () => setCurrentDate(new Date());

  // ── Mapa de colores por tipo ──
  const eventColorMap = useMemo(() => {
    const map = new Map<string, string>();
    payrollChangeTypes.forEach(p => map.set(p.name, p.color));
    return map;
  }, [payrollChangeTypes]);

  // ── Tipos visibles según rol ──
  // soloAdmin (o adminOnly legacy) = true → solo admins/master lo ven
  const visibleTypes = useMemo(() => {
    if (!currentUser || currentUser.role === 'admin' || currentUser.role === 'master')
      return payrollChangeTypes;
    return payrollChangeTypes.filter(t => !t.soloAdmin && !t.adminOnly);
  }, [payrollChangeTypes, currentUser]);

  // ─────────────────────────────────────────────
  //  HELPER: Ventanas semestrales y cupos
  // ─────────────────────────────────────────────

  /**
   * Devuelve { allowed, reason } para el colaborador al solicitar un tipo con semesterQuota.
   * Los admins/master siempre pasan (allowed=true).
   *
   * Semestres:
   *  S1: Ene 1 – Jun 30  →  ventana de solicitud: Dic 1 (año ant.) – May 31
   *  S2: Jul 1 – Dic 31  →  ventana de solicitud: Jun 1 – Nov 30
   */
  const checkSemesterQuota = (typeConfig: typeof payrollChangeTypes[0], startDate: string): { allowed: boolean; reason?: string } => {
    // Admins/master sin restricción de ventana
    if (currentUser.role === 'admin' || currentUser.role === 'master') return { allowed: true };

    const today = new Date();
    const todayMonth = today.getMonth() + 1; // 1–12

    // ¿En qué ventana estamos hoy?
    // S1 window: Dic(12) | Ene-May(1-5)
    // S2 window: Jun(6) – Nov(11)
    const inS1Window = todayMonth === 12 || todayMonth <= 5;
    const inS2Window = todayMonth >= 6 && todayMonth <= 11;

    const eventDate = new Date(startDate + 'T00:00:00');
    const eventMonth = eventDate.getMonth() + 1; // 1–12
    const eventYear  = eventDate.getFullYear();

    // ¿A qué semestre pertenece la fecha solicitada?
    const eventInS1 = eventMonth >= 1 && eventMonth <= 6;   // Ene–Jun
    const eventInS2 = eventMonth >= 7 && eventMonth <= 12;  // Jul–Dic

    // Validar que la fecha caiga en el semestre habilitado hoy
    if (eventInS1 && !inS1Window) {
      return { allowed: false, reason: 'Las solicitudes para el 1° semestre (Ene–Jun) se abren el 1 de diciembre.' };
    }
    if (eventInS2 && !inS2Window) {
      return { allowed: false, reason: 'Las solicitudes para el 2° semestre (Jul–Dic) se abren el 1 de junio.' };
    }

    // Calcular cuántas veces usó el cupo en este semestre (solo aprobadas)
    const semStart = eventInS1 ? `${eventYear}-01-01` : `${eventYear}-07-01`;
    const semEnd   = eventInS1 ? `${eventYear}-06-30` : `${eventYear}-12-31`;

    const used = events.filter(e =>
      e.employeeId === currentUser.id &&
      e.type === typeConfig.name &&
      e.status === 'approved' &&
      e.startDate >= semStart &&
      e.startDate <= semEnd
    ).length;

    const quota = typeConfig.semesterQuota ?? 1;
    if (used >= quota) {
      const semLabel = eventInS1 ? '1° semestre' : '2° semestre';
      return { allowed: false, reason: `Ya usaste tu cupo del ${semLabel} (${quota} de ${quota}).` };
    }

    return { allowed: true };
  };

  /**
   * Devuelve { allowed, reason } para cupo anual (yearlyQuota).
   * Admins/master sin restricción.
   */
  const checkYearlyQuota = (typeConfig: typeof payrollChangeTypes[0], startDate: string): { allowed: boolean; reason?: string } => {
    if (currentUser.role === 'admin' || currentUser.role === 'master') return { allowed: true };
    if (!typeConfig.yearlyQuota) return { allowed: true };

    const eventYear = new Date(startDate + 'T00:00:00').getFullYear();
    const used = events.filter(e =>
      e.employeeId === currentUser.id &&
      e.type === typeConfig.name &&
      e.status === 'approved' &&
      e.startDate.startsWith(eventYear.toString())
    ).length;

    if (used >= typeConfig.yearlyQuota) {
      return { allowed: false, reason: `Ya alcanzaste el cupo anual de ${typeConfig.yearlyQuota} para ${typeConfig.name}.` };
    }
    return { allowed: true };
  };

  /**
   * Resumen legible del cupo para mostrar en el modal de solicitud.
   */
  const quotaSummary = useMemo(() => {
    if (!newRequestType || !newRequestStartDate) return null;
    const typeConfig = payrollChangeTypes.find(t => t.name === newRequestType);
    if (!typeConfig) return null;
    if (currentUser.role === 'admin' || currentUser.role === 'master') return null;

    const lines: string[] = [];

    if (typeConfig.semesterQuota) {
      const eventDate  = new Date(newRequestStartDate + 'T00:00:00');
      const eventMonth = eventDate.getMonth() + 1;
      const eventYear  = eventDate.getFullYear();
      const eventInS1  = eventMonth >= 1 && eventMonth <= 6;
      const semStart   = eventInS1 ? `${eventYear}-01-01` : `${eventYear}-07-01`;
      const semEnd     = eventInS1 ? `${eventYear}-06-30` : `${eventYear}-12-31`;
      const used       = events.filter(e =>
        e.employeeId === currentUser.id &&
        e.type === typeConfig.name &&
        e.status === 'approved' &&
        e.startDate >= semStart &&
        e.startDate <= semEnd
      ).length;
      const remaining = Math.max(0, (typeConfig.semesterQuota ?? 1) - used);
      const semLabel  = eventInS1 ? '1er semestre' : '2do semestre';
      lines.push(`Cupo ${semLabel}: ${remaining} restante(s) de ${typeConfig.semesterQuota}`);
    }

    if (typeConfig.yearlyQuota && !typeConfig.semesterQuota) {
      const eventYear = new Date(newRequestStartDate + 'T00:00:00').getFullYear();
      const used      = events.filter(e =>
        e.employeeId === currentUser.id &&
        e.type === typeConfig.name &&
        e.status === 'approved' &&
        e.startDate.startsWith(eventYear.toString())
      ).length;
      const remaining = Math.max(0, typeConfig.yearlyQuota - used);
      lines.push(`Cupo anual: ${remaining} restante(s) de ${typeConfig.yearlyQuota}`);
    }

    return lines.length > 0 ? lines.join(' · ') : null;
  }, [newRequestType, newRequestStartDate, payrollChangeTypes, events, currentUser]);

  useEffect(() => {
    if (visibleTypes.length > 0) {
      if (!viewType || !visibleTypes.find(t => t.name === viewType))
        setViewType(visibleTypes[0].name);
      if (!editingEvent && (!newRequestType || !visibleTypes.find(t => t.name === newRequestType)))
        setNewRequestType(visibleTypes[0].name);
    }
  }, [visibleTypes]);

  // ── Estadísticas de vacaciones (CST 30/360) ──
  const vacationStats = useMemo(() => {
    if (!currentUser.hireDate)
      return { accrued: 0, taken: 0, compensated: 0, balance: 0, maxCompensable: 0 };

    const start = new Date(currentUser.hireDate);
    const end   = currentUser.terminationDate ? new Date(currentUser.terminationDate) : new Date();

    let d1 = start.getDate(); const m1 = start.getMonth() + 1; const y1 = start.getFullYear();
    let d2 = end.getDate();   const m2 = end.getMonth()   + 1; const y2 = end.getFullYear();

    if (d1 === 31) d1 = 30;
    if (d2 === 31) d2 = 30;
    if (m1 === 2 && d1 >= 28) d1 = 30;
    if (m2 === 2 && d2 >= 28) d2 = 30;

    const accountingDays = ((y2 - y1) * 360) + ((m2 - m1) * 30) + (d2 - d1) + 1;
    const totalAccrued   = ((accountingDays * 15) / 360) + (currentUser.manualVacationAdjustment || 0);

    let taken = 0; let compensated = 0;
    events
      .filter(e => e.employeeId === currentUser.id && e.status === 'approved')
      .forEach(e => {
        const dur = Math.ceil((new Date(e.endDate).getTime() - new Date(e.startDate).getTime()) / 86_400_000) + 1;
        if (e.type === 'Vacation'  || e.type === 'Vacaciones')           taken       += dur;
        if (e.type === 'Vacaciones (Dinero)' || e.type === 'Compensación') compensated += dur;
      });

    const balance        = totalAccrued - taken - compensated;
    const maxMoneyLegal  = (totalAccrued / 2) - compensated;
    return { accrued: totalAccrued, taken, compensated, balance, maxCompensable: Math.max(0, maxMoneyLegal) };
  }, [currentUser, events]);

  // ── Grid del calendario ──
  const calendarGrid = useMemo(() => {
    const year  = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const days: CalendarDay[] = [];

    let startDOW = firstDay.getDay();
    startDOW = startDOW === 0 ? 6 : startDOW - 1; // Lunes = 0

    const today = new Date(); today.setHours(0, 0, 0, 0);

    // Días del mes anterior
    for (let i = 0; i < startDOW; i++) {
      const date = new Date(firstDay);
      date.setDate(date.getDate() - (startDOW - i));
      days.push({ date, isCurrentMonth: false, isToday: false, dayOfMonth: date.getDate(), isPast: date < today, events: [] });
    }
    // Días del mes actual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date    = new Date(year, month, i);
      const isToday = date.toDateString() === today.toDateString();
      days.push({ date, isCurrentMonth: true, isToday, dayOfMonth: i, isPast: date < today, events: [] });
    }
    // Días del mes siguiente (completar 42 celdas)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(lastDay);
      date.setDate(date.getDate() + i);
      days.push({ date, isCurrentMonth: false, isToday: false, dayOfMonth: date.getDate(), isPast: date < today, events: [] });
    }

    const selectedTypeConfig = payrollChangeTypes.find(t => t.name === viewType);

    events.forEach(event => {
      if (event.status === 'rejected') return;
      const startDate = new Date(event.startDate + 'T00:00:00');
      const endDate   = new Date(event.endDate   + 'T00:00:00');
      const isMine    = event.employeeId === currentUser.id;

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayStr    = d.toISOString().split('T')[0];
        const dayInGrid = days.find(day => day.date.toISOString().split('T')[0] === dayStr);
        if (dayInGrid) {
          if (!isMine && (selectedTypeConfig?.requiereAprobacion || selectedTypeConfig?.isExclusive) && event.type === viewType && event.status === 'approved')
            dayInGrid.isBlocked = true;
          if (isMine) {
            dayInGrid.events.push({
              event, isMine: true,
              color: eventColorMap.get(event.type) || '#91A673',
              label: event.status === 'pending' ? `${event.type} (Pendiente)` : event.type,
            });
          }
        }
      }
    });

    return days;
  }, [currentDate, events, eventColorMap, currentUser.id, viewType, payrollChangeTypes]);

  // ── Abrir modal desde click en día ──
  const handleDayClick = (date: Date, isPast: boolean) => {
    if (isPast) return;
    const dateStr = date.toISOString().split('T')[0];
    setNewRequestStartDate(dateStr);
    setNewRequestEndDate(dateStr);
    setEditingEvent(null);
    setIsRequestModalOpen(true);
  };

  const handleEditRequest = (event: CalendarEvent) => {
    setEditingEvent(event);
    setNewRequestType(event.type);
    setNewRequestStartDate(event.startDate);
    setNewRequestEndDate(event.endDate);
    setIsRequestModalOpen(true);
  };

  // ─────────────────────────────────────────────
  //  CREAR / EDITAR SOLICITUD  →  Notifica a RRHH
  // ─────────────────────────────────────────────
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const payload = {
      employeeId: currentUser.id,
      type:       newRequestType,
      startDate:  newRequestStartDate,
      endDate:    newRequestEndDate,
      status:     'pending' as const,
    };

    // ── Validaciones de cupo y ventana (solo para colaboradores, no en edición) ──
    if (!editingEvent && currentUser.role === 'employee') {
      const typeConfig = payrollChangeTypes.find(t => t.name === newRequestType);

      if (typeConfig?.semesterQuota) {
        const semCheck = checkSemesterQuota(typeConfig, newRequestStartDate);
        if (!semCheck.allowed) {
          addNotification(semCheck.reason ?? 'No puedes solicitar esta novedad ahora.', 'error');
          setIsSubmitting(false);
          return;
        }
      } else if (typeConfig?.yearlyQuota) {
        const yearCheck = checkYearlyQuota(typeConfig, newRequestStartDate);
        if (!yearCheck.allowed) {
          addNotification(yearCheck.reason ?? 'Cupo anual agotado.', 'error');
          setIsSubmitting(false);
          return;
        }
      }
    }

    try {
      if (editingEvent) {
        // ── Edición: solo actualizar, no reenviar correo ──
        onUpdateRequest({ ...editingEvent, ...payload } as CalendarEvent);
        addNotification('Solicitud editada correctamente.', 'success');
      } else {
        // ── Nueva solicitud ──
        onAddRequest(payload as any);
        addNotification('Solicitud creada exitosamente.', 'success');

        // Notificar a RRHH de forma silenciosa (no bloquea la UI)
        getNotificationRecipients()
          .then(recipients => {
            if (recipients.length === 0) return;
            return sendEmailJS({
              to:           recipients,
              employeeName: currentUser.name,
              requestType:  newRequestType,
              startDate:    newRequestStartDate,
              endDate:      newRequestEndDate,
              statusLabel:  'NUEVA SOLICITUD',
            });
          })
          .catch(err => console.warn('Fallo silencioso al notificar RRHH:', err));
      }
    } finally {
      setIsSubmitting(false);
      setIsRequestModalOpen(false);
    }
  };

  // ─────────────────────────────────────────────
  //  APROBAR / RECHAZAR  →  Notifica al empleado
  // ─────────────────────────────────────────────
  const handleStatusAction = async (event: CalendarEvent, newStatus: 'approved' | 'rejected') => {
    if (!onUpdateEventStatus) return;

    // 1. Actualizar estado en BD (inmediato, no esperamos el correo)
    onUpdateEventStatus(event, newStatus);
    addNotification(`Solicitud ${newStatus === 'approved' ? 'aprobada' : 'rechazada'}.`, 'success');

    // 2. Notificar al empleado de forma silenciosa
    const targetEmployee = employees.find(e => e.id === event.employeeId);
    if (!targetEmployee?.email) return;

    sendEmailJS({
      to:           [targetEmployee.email],
      employeeName: targetEmployee.name,
      requestType:  event.type,
      startDate:    event.startDate,
      endDate:      event.endDate,
      statusLabel:  newStatus === 'approved' ? 'APROBADO ✅' : 'RECHAZADO ❌',
    }).catch(err => console.warn('Fallo silencioso al notificar empleado:', err));
  };

  // ── Listas derivadas ──
  const myRequests = useMemo(() =>
    events
      .filter(e => e.employeeId === currentUser.id)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
    [events, currentUser.id]
  );

  const pendingRequests = useMemo(() => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'master') return [];
    return events
      .filter(e => e.status === 'pending')
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)); // orden de llegada
  }, [events, currentUser.role]);

  // ─────────────────────────────────────────────
  //  IMPORTACIÓN MASIVA
  // ─────────────────────────────────────────────
  const isAdminOrMaster = currentUser.role === 'admin' || currentUser.role === 'master';

  const downloadTemplate = () => {
    const header = 'Colaborador,Novedad,Fecha Inicio (YYYY-MM-DD),Fecha Fin (YYYY-MM-DD)';
    const example = employees.slice(0, 2).map((e, i) => {
      const t = payrollChangeTypes[i % payrollChangeTypes.length]?.name ?? 'Reserve Holiday';
      return `${e.name},${t},2026-01-15,2026-01-15`;
    }).join('\n') || `Juan Perez,Reserve Holiday,2026-01-15,2026-01-17`;
    const blob = new Blob([header + '\n' + example], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'plantilla_novedades.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      const dataLines = lines[0]?.toLowerCase().includes('colaborador') ? lines.slice(1) : lines;
      const empNameMap = new Map(employees.map(emp => [emp.name.trim().toLowerCase(), emp]));
      const typeNameMap = new Map(payrollChangeTypes.map(t => [t.name.trim().toLowerCase(), t]));

      const parsed = dataLines.map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const [empRaw, typeRaw, start, end] = cols;
        const emp  = empNameMap.get(empRaw?.toLowerCase() ?? '');
        const type = typeNameMap.get(typeRaw?.toLowerCase() ?? '');
        if (!emp)  return { emp: empRaw, type: typeRaw, start, end, status: 'err' as const, msg: `Colaborador "${empRaw}" no encontrado` };
        if (!type) return { emp: empRaw, type: typeRaw, start, end, status: 'err' as const, msg: `Novedad "${typeRaw}" no existe` };
        if (!start?.match(/^\d{4}-\d{2}-\d{2}/)) return { emp: empRaw, type: typeRaw, start, end, status: 'err' as const, msg: 'Fecha inicio inválida (usa YYYY-MM-DD)' };
        const endDate = end?.match(/^\d{4}-\d{2}-\d{2}/) ? end : start;
        return { emp: emp.name, type: type.name, start, end: endDate, status: 'ok' as const, msg: '' };
      });
      setImportRows(parsed);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!onBulkImport) return;
    const valid = importRows.filter(r => r.status === 'ok');
    if (valid.length === 0) return;
    setIsImporting(true);
    try {
      const empNameMap = new Map(employees.map(e => [e.name, e]));
      const eventsToCreate = valid.map(r => ({
        employeeId: empNameMap.get(r.emp)!.id,
        type: r.type,
        startDate: r.start,
        endDate: r.end,
        status: 'approved' as const,
        createdAt: Date.now(),
      }));
      await onBulkImport(eventsToCreate as any);
      addNotification(`${valid.length} novedades importadas correctamente.`, 'success');
      setIsImportModalOpen(false);
      setImportRows([]);
    } catch { addNotification('Error al importar.', 'error'); }
    finally { setIsImporting(false); }
  };

  // ─────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="w-full mx-auto animate-fade-in flex flex-col gap-6">

      {/* ── STATS DE VACACIONES ── */}
      <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-8">
          <div className="text-left">
            <p className="text-[10px] font-bold text-bokara-grey/50 uppercase tracking-widest mb-1">Acumuladas</p>
            <p className="text-2xl font-bold text-bokara-grey">{vacationStats.accrued.toFixed(2)} d</p>
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold text-bokara-grey/50 uppercase tracking-widest mb-1">Disfrutadas</p>
            <p className="text-2xl font-bold text-red-400">{vacationStats.taken.toFixed(1)} d</p>
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold text-bokara-grey/50 uppercase tracking-widest mb-1">Compensadas</p>
            <p className="text-2xl font-bold text-wet-sand">{vacationStats.compensated.toFixed(1)} d</p>
          </div>
          <div className="text-left bg-lucius-lime/5 p-3 rounded-lg border border-lucius-lime/20">
            <p className="text-[10px] font-bold text-lucius-lime uppercase tracking-widest mb-1">Saldo Disponible</p>
            <p className="text-3xl font-display font-bold text-bokara-grey">{vacationStats.balance.toFixed(2)} d</p>
          </div>
        </div>
      </div>

      {/* ── ENCABEZADO ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-bokara-grey">Tiquetera de Novedades</h1>
        <div className="flex items-center gap-2">
          {isAdminOrMaster && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="border border-bokara-grey/20 text-bokara-grey/70 hover:text-bokara-grey hover:border-bokara-grey/40 font-bold py-2 px-4 rounded-lg transition-all flex items-center gap-2 bg-white shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              Importar
            </button>
          )}
          <button
            onClick={() => { setEditingEvent(null); setIsRequestModalOpen(true); }}
            className="bg-lucius-lime hover:bg-opacity-80 text-bokara-grey font-bold py-2 px-4 rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Solicitar Tiquete</span>
          </button>
        </div>
      </div>

      {/* ── ADMIN: SOLICITUDES PENDIENTES ── */}
      {(currentUser.role === 'admin' || currentUser.role === 'master') && pendingRequests.length > 0 && (() => {
        // Agrupar por tipo preservando orden de llegada del primer ticket de cada grupo
        const groups = new Map<string, { color: string; requests: typeof pendingRequests }>();
        pendingRequests.forEach(req => {
          if (!groups.has(req.type)) {
            const color = payrollChangeTypes.find(t => t.name === req.type)?.color ?? '#AE8F60';
            groups.set(req.type, { color, requests: [] });
          }
          groups.get(req.type)!.requests.push(req);
        });
        const groupList = Array.from(groups.entries());
        // Índice global para numerar por orden de llegada
        const globalIndex: Record<string, number> = {};
        pendingRequests.forEach((req, i) => { globalIndex[req.id] = i + 1; });

        return (
          <div className="bg-white rounded-xl shadow-lg border border-orange-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-orange-600 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Solicitudes Pendientes por Aprobar
                <span className="ml-1 bg-orange-100 text-orange-700 text-xs font-black px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
              </h3>
              {/* Aprobar todo */}
              <button
                onClick={() => { if (window.confirm(`¿Aprobar las ${pendingRequests.length} solicitudes pendientes?`)) pendingRequests.forEach(r => handleStatusAction(r, 'approved')); }}
                className="text-xs font-bold px-3 py-1.5 bg-lucius-lime text-bokara-grey rounded-lg hover:bg-opacity-80 transition-colors shadow-sm"
              >
                ✓ Aprobar todas
              </button>
            </div>

            {/* Tabs por concepto */}
            <div className="flex flex-col gap-5">
              {groupList.map(([type, { color, requests }]) => (
                <div key={type} className="rounded-xl border overflow-hidden" style={{ borderColor: `${color}40` }}>
                  {/* Cabecera del grupo */}
                  <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: `${color}15` }}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="font-bold text-sm text-bokara-grey">{type}</span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>
                        {requests.length}
                      </span>
                    </div>
                    <button
                      onClick={() => { if (window.confirm(`¿Aprobar las ${requests.length} solicitudes de "${type}"?`)) requests.forEach(r => handleStatusAction(r, 'approved')); }}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg text-white transition-opacity hover:opacity-80"
                      style={{ backgroundColor: color }}
                    >
                      Aprobar grupo
                    </button>
                  </div>

                  {/* Lista de tickets */}
                  <div className="divide-y divide-gray-100">
                    {requests.map(req => {
                      const empName = employees.find(e => e.id === req.employeeId)?.name || 'Desconocido';
                      const arrivalNum = globalIndex[req.id];
                      const days = Math.ceil((new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) / 86_400_000) + 1;
                      const arrivedAt = req.createdAt ? new Date(req.createdAt).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
                      return (
                        <div key={req.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                          {/* Número de orden */}
                          <div className="w-7 h-7 rounded-full bg-gray-100 text-bokara-grey text-xs font-black flex items-center justify-center flex-shrink-0">
                            {arrivalNum}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-bokara-grey truncate">{empName}</span>
                              <span className="text-[10px] text-bokara-grey/50 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                {req.startDate === req.endDate ? req.startDate : `${req.startDate} → ${req.endDate}`}
                                {' · '}{days} día{days !== 1 ? 's' : ''}
                              </span>
                            </div>
                            {arrivedAt && (
                              <p className="text-[10px] text-bokara-grey/40 mt-0.5">Recibido: {arrivedAt}</p>
                            )}
                          </div>

                          {/* Acciones */}
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => handleStatusAction(req, 'rejected')}
                              className="px-2.5 py-1 bg-white border border-red-200 text-red-500 rounded-md text-xs font-bold hover:bg-red-50 transition-colors"
                            >
                              Rechazar
                            </button>
                            <button
                              onClick={() => handleStatusAction(req, 'approved')}
                              className="px-2.5 py-1 text-white rounded-md text-xs font-bold hover:opacity-80 transition-colors shadow-sm"
                              style={{ backgroundColor: color }}
                            >
                              Aprobar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── GRID PRINCIPAL: CALENDARIO + MIS SOLICITUDES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* CALENDARIO */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6 flex flex-col">
          {/* Filtro por tipo — pills */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-bokara-grey/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/></svg>
              <span className="text-[11px] font-bold text-bokara-grey/40 uppercase tracking-widest">Filtrar por novedad</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleTypes.map(p => {
                const isActive = viewType === p.name;
                return (
                  <button
                    key={p.id}
                    onClick={() => setViewType(isActive ? '' : p.name)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border transition-all ${
                      isActive
                        ? 'bg-bokara-grey text-white border-bokara-grey'
                        : 'bg-white text-bokara-grey border-gray-300 hover:border-bokara-grey hover:bg-gray-50'
                    }`}
                  >
                    {isActive && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />}
                    {p.name}
                  </button>
                );
              })}
              {viewType && (
                <button
                  onClick={() => setViewType('')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold border border-gray-200 text-gray-400 hover:border-gray-400 transition-all"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Navegación de mes */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <button onClick={handlePrevMonth} className="p-1 rounded hover:bg-whisper-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-lg font-bold capitalize w-48 text-center text-bokara-grey">
                {currentDate.toLocaleString('es-ES', { month: 'long' })} {currentDate.getFullYear()}
              </span>
              <button onClick={handleNextMonth} className="p-1 rounded hover:bg-whisper-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            <button onClick={handleToday} className="text-sm text-lucius-lime font-bold hover:underline bg-lucius-lime/10 px-3 py-1 rounded-full transition-colors">
              Hoy
            </button>
          </div>

          {/* Cabecera días */}
          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-bokara-grey/40 uppercase mb-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => <div key={d}>{d}</div>)}
          </div>

          {/* Celdas */}
          <div className="grid grid-cols-7 gap-1 flex-grow">
            {calendarGrid.map((day, idx) => (
              <div
                key={idx}
                onClick={() => handleDayClick(day.date, day.isPast)}
                className={`min-h-[80px] p-1 border rounded-md flex flex-col transition-colors
                  ${day.isBlocked  ? 'bg-gray-100 cursor-not-allowed' :
                    day.isPast     ? 'bg-gray-50 cursor-not-allowed opacity-60' :
                    !day.isCurrentMonth ? 'bg-whisper-white/30 cursor-pointer hover:bg-white' :
                    'bg-white cursor-pointer hover:bg-lucius-lime/5'}
                  ${day.isToday ? 'border-lucius-lime ring-1 ring-lucius-lime' : 'border-bokara-grey/10'}`}
              >
                <div className={`text-xs text-right mb-1 ${day.isToday ? 'font-bold text-lucius-lime' : 'text-bokara-grey/50'}`}>
                  {day.dayOfMonth}
                </div>
                {day.isBlocked ? (
                  <div className="flex-grow flex items-center justify-center">
                    <span className="text-[9px] font-bold text-gray-400 bg-gray-200/50 px-1 py-0.5 rounded uppercase">Ocupado</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {day.events.map((evt, i) => (
                      <div
                        key={i}
                        className="text-[9px] p-1 rounded truncate font-bold text-white shadow-sm"
                        style={{ backgroundColor: evt.color }}
                        title={evt.label}
                      >
                        {evt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* MIS SOLICITUDES */}
        <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6 flex flex-col">
          <h3 className="font-bold text-bokara-grey mb-4 border-b border-bokara-grey/5 pb-2">Mis Solicitudes</h3>
          <div className="space-y-3 overflow-y-auto flex-grow max-h-[500px] pr-1">
            {myRequests.length === 0 && (
              <p className="text-sm text-gray-400 italic">No tienes solicitudes.</p>
            )}
            {myRequests.map(req => {
              const today   = new Date(); today.setHours(0, 0, 0, 0);
              const isPast  = new Date(req.endDate + 'T00:00:00') < today;
              const isPending = req.status === 'pending';
              return (
                <div key={req.id} className="p-3 rounded-lg border border-bokara-grey/5 bg-whisper-white/50 hover:bg-whisper-white transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm text-bokara-grey">{req.type}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      req.status === 'approved' ? 'bg-green-100 text-green-700' :
                      req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {req.status === 'approved' ? 'Aprobado' : req.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                    </span>
                  </div>
                  <div className="text-[11px] text-bokara-grey/70 font-mono mt-1 flex justify-between items-center">
                    <span>{req.startDate} ➜ {req.endDate}</span>
                    <div className="flex items-center gap-2">
                      {isPending && !isPast && (
                        <>
                          <button onClick={() => handleEditRequest(req)} className="p-1 hover:bg-lucius-lime/10 rounded text-lucius-lime transition-all" title="Editar">
                            <EditIcon className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => onRemoveRequest(req)} className="p-1 hover:bg-red-100 rounded text-red-500 transition-all" title="Eliminar">
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MODAL DE SOLICITUD ── */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-bokara-grey bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in border border-bokara-grey/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-bokara-grey">
                {editingEvent ? 'Editar Solicitud' : 'Nueva Solicitud'}
              </h2>
              <button onClick={() => setIsRequestModalOpen(false)} className="text-bokara-grey/40 hover:text-bokara-grey text-2xl">&times;</button>
            </div>
            <form onSubmit={handleRequestSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-lucius-lime uppercase tracking-widest mb-1.5">Tipo de Novedad</label>
                <select
                  className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg p-3 text-bokara-grey font-bold"
                  value={newRequestType}
                  onChange={e => setNewRequestType(e.target.value)}
                >
                  {visibleTypes.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
                {(newRequestType === 'Vacaciones (Dinero)' || newRequestType === 'Compensación') && (
                  <div className="mt-3 p-2 bg-blue-50 text-blue-800 rounded border border-blue-100 text-[10px] leading-tight">
                    <strong>Regla CST (Dinero):</strong> Máximo 50% compensable.<br />
                    Te quedan <strong>{vacationStats.maxCompensable.toFixed(2)} días</strong> para solicitar en dinero.
                  </div>
                )}
                {quotaSummary && (
                  <div className="mt-2 p-2 bg-lucius-lime/10 text-bokara-grey rounded border border-lucius-lime/30 text-[10px] leading-tight font-medium">
                    📊 {quotaSummary}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-lucius-lime uppercase tracking-widest mb-1.5">Desde</label>
                  <input type="date" className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg p-3 text-sm" value={newRequestStartDate} onChange={e => setNewRequestStartDate(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-lucius-lime uppercase tracking-widest mb-1.5">Hasta</label>
                  <input type="date" className="w-full bg-whisper-white border border-bokara-grey/20 rounded-lg p-3 text-sm" value={newRequestEndDate} onChange={e => setNewRequestEndDate(e.target.value)} required />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setIsRequestModalOpen(false)} className="px-5 py-2.5 bg-gray-100 rounded-lg font-bold text-bokara-grey text-sm">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-lucius-lime text-bokara-grey font-bold rounded-lg hover:bg-opacity-80 text-sm disabled:opacity-60 disabled:cursor-wait"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL IMPORTACIÓN ── */}
      {isImportModalOpen && isAdminOrMaster && (
        <div className="fixed inset-0 bg-bokara-grey/60 flex items-center justify-center z-50 p-4" onClick={() => { setIsImportModalOpen(false); setImportRows([]); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-bokara-grey">Importar Novedades</h3>
                <p className="text-sm text-bokara-grey/50 mt-0.5">Sube un archivo CSV con el historial de novedades</p>
              </div>
              <button onClick={() => { setIsImportModalOpen(false); setImportRows([]); }} className="text-bokara-grey/30 hover:text-bokara-grey text-2xl">&times;</button>
            </div>

            <div className="p-6 flex flex-col gap-5 overflow-y-auto">
              {/* Paso 1: Descargar plantilla */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-blue-800 text-sm">Paso 1 — Descarga la plantilla</p>
                  <p className="text-xs text-blue-600/80 mt-0.5">Formato: <span className="font-mono">Colaborador, Novedad, Fecha Inicio, Fecha Fin</span></p>
                  <p className="text-xs text-blue-500/70 mt-1">Las fechas deben ir en formato <strong>YYYY-MM-DD</strong> (ej: 2026-03-15). Si es un solo día, repite la misma fecha en ambas columnas.</p>
                  <button onClick={downloadTemplate} className="mt-2 flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    Descargar plantilla_novedades.csv
                  </button>
                </div>
              </div>

              {/* Tipos disponibles */}
              <div className="text-xs text-bokara-grey/50">
                <p className="font-bold mb-1">Novedades disponibles (copia exactamente como están):</p>
                <div className="flex flex-wrap gap-1.5">
                  {payrollChangeTypes.map(t => (
                    <span key={t.id} className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border" style={{ borderColor: `${t.color}50`, color: t.color, backgroundColor: `${t.color}10` }}>
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Paso 2: Subir archivo */}
              <div>
                <p className="font-bold text-bokara-grey text-sm mb-2">Paso 2 — Sube tu archivo CSV</p>
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-bokara-grey/20 rounded-xl cursor-pointer hover:border-lucius-lime/50 hover:bg-lucius-lime/5 transition-all">
                  <svg className="w-7 h-7 text-bokara-grey/30 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  <span className="text-sm text-bokara-grey/50">Haz clic o arrastra tu archivo .csv aquí</span>
                  <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>

              {/* Preview de filas */}
              {importRows.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-bokara-grey text-sm">
                      Vista previa — {importRows.filter(r => r.status === 'ok').length} válidas, {importRows.filter(r => r.status === 'err').length} con error
                    </p>
                    <button onClick={() => setImportRows([])} className="text-xs text-gray-400 hover:text-gray-600">Limpiar</button>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                    {importRows.map((row, i) => (
                      <div key={i} className={`flex items-center gap-3 px-3 py-2 text-xs ${row.status === 'err' ? 'bg-red-50' : 'bg-white'}`}>
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-white font-black text-[9px] flex-shrink-0 ${row.status === 'ok' ? 'bg-green-500' : 'bg-red-400'}`}>
                          {row.status === 'ok' ? '✓' : '!'}
                        </span>
                        <span className="font-bold text-bokara-grey truncate w-28 flex-shrink-0">{row.emp}</span>
                        <span className="text-bokara-grey/60 truncate flex-1">{row.type}</span>
                        <span className="font-mono text-bokara-grey/50 flex-shrink-0">{row.start}{row.end !== row.start ? ` → ${row.end}` : ''}</span>
                        {row.msg && <span className="text-red-500 flex-shrink-0 text-[10px]">{row.msg}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setIsImportModalOpen(false); setImportRows([]); }} className="px-4 py-2 bg-gray-100 rounded-lg font-bold text-bokara-grey text-sm">
                Cancelar
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={isImporting || importRows.filter(r => r.status === 'ok').length === 0}
                className="px-4 py-2 bg-lucius-lime text-bokara-grey font-bold rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? 'Importando...' : `Importar ${importRows.filter(r => r.status === 'ok').length} novedades`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketingPage;