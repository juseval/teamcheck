// src/utils/vacations.ts
// ─────────────────────────────────────────────────────────────────────────────
//  LÓGICA CENTRAL DE VACACIONES (CST Colombia · método 30/360)
//
//  Toda la app debe usar este módulo. Antes el cálculo estaba duplicado en
//  TicketingPage.tsx y EmployeesPage.tsx; ahora la fórmula vive en un solo sitio.
//
//  Conceptos:
//   - Disfrutadas (taken)      → vacaciones tomadas en TIEMPO (el empleado descansa)
//   - Compensadas (compensated)→ vacaciones pagadas en DINERO (el empleado sigue trabajando)
//   - Regla CST Art. 189       → máximo el 50% de las vacaciones puede pagarse en dinero
// ─────────────────────────────────────────────────────────────────────────────

import { Employee, CalendarEvent } from '../types';

/** Días de vacaciones que se acumulan por año trabajado (Colombia: 15 hábiles). */
export const VACATION_DAYS_PER_YEAR = 15;

/** Nombres de novedad que cuentan como vacaciones DISFRUTADAS (en tiempo). */
export const VACATION_TIME_TYPES = ['Vacaciones', 'Vacation'] as const;

/** Nombres de novedad que cuentan como vacaciones COMPENSADAS (en dinero). */
export const VACATION_MONEY_TYPES = ['Vacaciones (Dinero)', 'Compensación'] as const;

/** Todos los nombres que afectan el saldo de vacaciones. */
export const ALL_VACATION_TYPES = [...VACATION_TIME_TYPES, ...VACATION_MONEY_TYPES] as const;

export const isTimeVacationType  = (type: string): boolean => VACATION_TIME_TYPES.includes(type as any);
export const isMoneyVacationType = (type: string): boolean => VACATION_MONEY_TYPES.includes(type as any);
export const isAnyVacationType   = (type: string): boolean => ALL_VACATION_TYPES.includes(type as any);

const MS_PER_DAY = 86_400_000;

/**
 * Cuenta los días calendario (inclusivos) entre dos fechas ISO (YYYY-MM-DD).
 * Ej: del 10 al 10 = 1 día; del 10 al 12 = 3 días.
 */
export function countInclusiveDays(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime();
  const end   = new Date(endDate).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return 0;
  return Math.ceil((end - start) / MS_PER_DAY) + 1;
}

/**
 * Días de vacaciones ACUMULADOS según el método contable 30/360 que usa el
 * proyecto, partiendo de la fecha de ingreso hasta hoy (o hasta la fecha de
 * retiro si existe). Incluye el ajuste manual del empleado.
 */
export function computeAccruedDays(person: Pick<Employee, 'hireDate' | 'terminationDate' | 'manualVacationAdjustment'>): number {
  if (!person.hireDate) return 0;

  const start = new Date(person.hireDate);
  const end   = person.terminationDate ? new Date(person.terminationDate) : new Date();

  let d1 = start.getDate(); const m1 = start.getMonth() + 1; const y1 = start.getFullYear();
  let d2 = end.getDate();   const m2 = end.getMonth()   + 1; const y2 = end.getFullYear();

  // Normalización 30/360
  if (d1 === 31) d1 = 30;
  if (d2 === 31) d2 = 30;
  if (m1 === 2 && d1 >= 28) d1 = 30;
  if (m2 === 2 && d2 >= 28) d2 = 30;

  const accountingDays = ((y2 - y1) * 360) + ((m2 - m1) * 30) + (d2 - d1) + 1;
  const accrued = (accountingDays * VACATION_DAYS_PER_YEAR) / 360;

  return accrued + (person.manualVacationAdjustment || 0);
}

export interface VacationData {
  /** Días ganados a la fecha (incluye ajuste manual). */
  accrued: number;
  /** Días disfrutados en tiempo (aprobados). */
  taken: number;
  /** Días pagados en dinero (aprobados). */
  compensated: number;
  /** Saldo real disponible = acumuladas − disfrutadas − compensadas. */
  balance: number;
  /** Máximo que aún se puede pedir en dinero (regla 50% CST). */
  maxCompensable: number;
  /** Movimientos de vacaciones (disfrute + dinero) para el Kardex. */
  history: CalendarEvent[];
}

/**
 * Calcula TODO el estado de vacaciones de una persona a partir de sus eventos.
 * Solo cuenta eventos APROBADOS. Es la única fuente de verdad para la UI.
 */
export function computeVacationData(
  person: Pick<Employee, 'id' | 'hireDate' | 'terminationDate' | 'manualVacationAdjustment'>,
  events: CalendarEvent[],
): VacationData {
  const accrued = computeAccruedDays(person);

  const myApproved = events.filter(e => e.employeeId === person.id && e.status === 'approved');

  let taken = 0;
  let compensated = 0;

  for (const e of myApproved) {
    const days = countInclusiveDays(e.startDate, e.endDate);
    if (isTimeVacationType(e.type))  taken += days;
    if (isMoneyVacationType(e.type)) compensated += days;
  }

  const balance = accrued - taken - compensated;
  const maxCompensable = Math.max(0, (accrued / 2) - compensated);
  const history = myApproved.filter(e => isAnyVacationType(e.type));

  return { accrued, taken, compensated, balance, maxCompensable, history };
}

export interface VacationValidationResult {
  ok: boolean;
  /** Mensaje listo para mostrar con addNotification(...) cuando ok === false. */
  error?: string;
}

/**
 * Valida una solicitud de vacaciones (disfrute o dinero) ANTES de guardarla.
 *  - El rango de fechas debe ser válido.
 *  - No se puede pedir más días de los que hay de saldo.
 *  - Si es en dinero, no se puede superar el 50% compensable (regla CST).
 *
 * Devuelve { ok: true } si la solicitud es válida.
 */
export function validateVacationRequest(
  requestType: string,
  startDate: string,
  endDate: string,
  vacation: VacationData,
): VacationValidationResult {
  // Si no es una novedad de vacaciones, no aplica esta validación.
  if (!isAnyVacationType(requestType)) return { ok: true };

  const requestedDays = countInclusiveDays(startDate, endDate);
  if (requestedDays <= 0) {
    return { ok: false, error: 'El rango de fechas no es válido.' };
  }

  if (requestedDays > vacation.balance) {
    return {
      ok: false,
      error: `Solo tienes ${vacation.balance.toFixed(2)} días de saldo disponible.`,
    };
  }

  if (isMoneyVacationType(requestType) && requestedDays > vacation.maxCompensable) {
    return {
      ok: false,
      error: `Por ley solo puedes compensar en dinero hasta ${vacation.maxCompensable.toFixed(2)} días.`,
    };
  }

  return { ok: true };
}
