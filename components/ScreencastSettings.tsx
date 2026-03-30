// src/components/ScreencastSettings.tsx
// Tabla de gestión de screencasts por colaborador (similar a Hubstaff)
import React, { useState, useMemo } from 'react';
import { Employee } from '../types';

// ── Tipos de modo de captura ──────────────────────────────────────────────────
export type ScreenshotMode = 'off' | '3min' | '9min' | '15min' | '30min' | 'video';

export interface ScreencastConfig {
  screenshotMode:      ScreenshotMode;
  screenshotBlur:      boolean;
  canDeleteScreencasts: boolean;
  autoTimeoutMinutes:  number;   // 0 = sin timeout
}

export const SCREENSHOT_MODE_OPTIONS: { value: ScreenshotMode; label: string }[] = [
  { value: 'off',    label: 'Off' },
  { value: '3min',   label: 'Screenshots (3 min)' },
  { value: '9min',   label: 'Screenshots (9 min)' },
  { value: '15min',  label: 'Screenshots (15 min)' },
  { value: '30min',  label: 'Screenshots (30 min)' },
  { value: 'video',  label: 'Video (continuo)' },
];

export const TIMEOUT_OPTIONS: { value: number; label: string }[] = [
  { value: 15,  label: '15 min' },
  { value: 30,  label: '30 min' },
  { value: 60,  label: '1 hora' },
  { value: 120, label: '2 horas' },
  { value: 0,   label: 'Sin límite' },
];

/** Convierte el modo a milisegundos de intervalo (0 = desactivado, -1 = video continuo) */
export function modeToIntervalMs(mode: ScreenshotMode): number {
  switch (mode) {
    case 'off':   return 0;
    case '3min':  return 3 * 60 * 1000;
    case '9min':  return 9 * 60 * 1000;
    case '15min': return 15 * 60 * 1000;
    case '30min': return 30 * 60 * 1000;
    case 'video': return -1; // señal especial para video continuo
    default:      return 0;
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface ScreencastSettingsProps {
  employees:     Employee[];
  currentUser:   Employee;
  onUpdateEmployee: (employeeId: string, updates: Partial<ScreencastConfig>) => Promise<void>;
}

// ── Componente ────────────────────────────────────────────────────────────────
const ScreencastSettings: React.FC<ScreencastSettingsProps> = ({
  employees,
  currentUser,
  onUpdateEmployee,
}) => {
  const [saving, setSaving] = useState<string | null>(null);

  // Solo mostrar colaboradores (no masters)
  const collaborators = useMemo(
    () => employees
      .filter(e => e.id !== currentUser.id || currentUser.role === 'master')
      .sort((a, b) => a.name.localeCompare(b.name)),
    [employees, currentUser],
  );

  const handleChange = async (
    empId: string,
    field: keyof ScreencastConfig,
    value: ScreenshotMode | boolean | number,
  ) => {
    setSaving(empId);
    try {
      await onUpdateEmployee(empId, { [field]: value });
    } catch (err) {
      console.error('[ScreencastSettings] Error:', err);
    } finally {
      setSaving(null);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      master:   'bg-amber-100 text-amber-700',
      admin:    'bg-blue-100 text-blue-700',
      employee: 'bg-gray-100 text-gray-600',
    };
    const labels: Record<string, string> = {
      master: 'Owner', admin: 'Admin', employee: 'Colaborador',
    };
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styles[role] || styles.employee}`}>
        {labels[role] || role}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-bokara-grey">Configuración de Screencasts</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Controla las capturas de pantalla por colaborador. Solo aplica en Electron Desktop.
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
              <th className="text-left px-6 py-3 font-semibold">Colaborador</th>
              <th className="text-left px-4 py-3 font-semibold">
                <div className="flex items-center gap-1">
                  Screencasts
                  <span className="text-gray-300 cursor-help" title="Frecuencia de capturas de pantalla">ⓘ</span>
                </div>
              </th>
              <th className="text-center px-4 py-3 font-semibold">
                <div className="flex items-center justify-center gap-1">
                  Blur
                  <span className="text-gray-300 cursor-help" title="Difuminar capturas para privacidad">ⓘ</span>
                </div>
              </th>
              <th className="text-center px-4 py-3 font-semibold">
                <div className="flex items-center justify-center gap-1">
                  Borrar capturas
                  <span className="text-gray-300 cursor-help" title="Permitir al colaborador borrar sus capturas">ⓘ</span>
                </div>
              </th>
              <th className="text-left px-4 py-3 font-semibold">
                <div className="flex items-center gap-1">
                  Auto-timeout
                  <span className="text-gray-300 cursor-help" title="Tiempo de inactividad antes de detener capturas">ⓘ</span>
                </div>
              </th>
              <th className="text-center px-4 py-3 font-semibold">Rol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {collaborators.map(emp => {
              const mode    = (emp as any).screenshotMode      as ScreenshotMode || 'off';
              const blur    = (emp as any).screenshotBlur      as boolean         ?? false;
              const canDel  = (emp as any).canDeleteScreencasts as boolean        ?? false;
              const timeout = (emp as any).autoTimeoutMinutes   as number         ?? 60;
              const isSaving = saving === emp.id;

              return (
                <tr
                  key={emp.id}
                  className={`hover:bg-gray-50/50 transition-colors ${isSaving ? 'opacity-60' : ''}`}
                >
                  {/* Nombre */}
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lucius-lime/60 to-lucius-lime flex items-center justify-center text-xs font-bold text-bokara-grey shrink-0">
                        {emp.avatarUrl
                          ? <img src={emp.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                          : getInitials(emp.name)
                        }
                      </div>
                      <div>
                        <p className="font-semibold text-bokara-grey text-sm">{emp.name}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[160px]">{emp.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Modo de Screenshot */}
                  <td className="px-4 py-3">
                    <select
                      value={mode}
                      onChange={e => handleChange(emp.id, 'screenshotMode', e.target.value as ScreenshotMode)}
                      disabled={isSaving}
                      className={`text-sm rounded-lg border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-lucius-lime transition-colors cursor-pointer ${
                        mode === 'off'
                          ? 'border-gray-200 bg-gray-50 text-gray-400'
                          : mode === 'video'
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : 'border-green-200 bg-green-50 text-green-700'
                      }`}
                    >
                      {SCREENSHOT_MODE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>

                  {/* Blur */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleChange(emp.id, 'screenshotBlur', !blur)}
                      disabled={isSaving || mode === 'off'}
                      className={`relative w-10 h-5 rounded-full transition-all duration-200 ${
                        mode === 'off' ? 'bg-gray-200 cursor-not-allowed' :
                        blur ? 'bg-lucius-lime' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                        blur ? 'left-5' : 'left-0.5'
                      }`} />
                    </button>
                  </td>

                  {/* Borrar capturas */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleChange(emp.id, 'canDeleteScreencasts', !canDel)}
                      disabled={isSaving || mode === 'off'}
                      className={`relative w-10 h-5 rounded-full transition-all duration-200 ${
                        mode === 'off' ? 'bg-gray-200 cursor-not-allowed' :
                        canDel ? 'bg-lucius-lime' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                        canDel ? 'left-5' : 'left-0.5'
                      }`} />
                    </button>
                  </td>

                  {/* Auto-timeout */}
                  <td className="px-4 py-3">
                    <select
                      value={timeout}
                      onChange={e => handleChange(emp.id, 'autoTimeoutMinutes', Number(e.target.value))}
                      disabled={isSaving || mode === 'off'}
                      className={`text-sm rounded-lg border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-lucius-lime cursor-pointer ${
                        mode === 'off'
                          ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                          : 'border-gray-200 bg-white text-bokara-grey'
                      }`}
                    >
                      {TIMEOUT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>

                  {/* Rol */}
                  <td className="px-4 py-3 text-center">
                    {getRoleBadge(emp.role)}
                  </td>
                </tr>
              );
            })}

            {collaborators.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  No hay colaboradores registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-2">
        <span>💡</span>
        <span>Los cambios se aplican inmediatamente. El colaborador verá el cambio en su próximo Clock In.</span>
      </div>
    </div>
  );
};

export default ScreencastSettings;