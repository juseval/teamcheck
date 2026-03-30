// src/pages/ScreencastsPage.tsx
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Employee } from '../types';
import { Screenshot, getCompanyScreenshots } from '../services/screenshotService';
import { updateEmployeeDetails } from '../services/apiService';
import ScreencastSettings, { ScreencastConfig } from '../components/ScreencastSettings';

interface ScreencastsPageProps {
  employees:       Employee[];
  companyId:       string;
  currentUserRole: 'master' | 'admin' | 'employee';
  currentUser:     Employee;
}

type ViewMode = 'day' | 'week';
type TabView  = 'settings' | 'gallery';

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

const todayEnd = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); };

const ScreencastsPage: React.FC<ScreencastsPageProps> = ({
  employees, companyId, currentUserRole, currentUser,
}) => {
  const [screenshots, setScreenshots]     = useState<Screenshot[]>([]);
  const [loading, setLoading]             = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('all');
  const [viewMode, setViewMode]           = useState<ViewMode>('day');
  const [activeTab, setActiveTab]         = useState<TabView>('settings');
  const [selectedDate, setSelectedDate]   = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [lightbox, setLightbox] = useState<Screenshot | null>(null);

  const collaborators = useMemo(
    () => employees.filter(e => e.role === 'employee'),
    [employees],
  );

  // ── Cargar screenshots ────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'gallery') return;
    const load = async () => {
      setLoading(true);
      try {
        let from: number;
        let to: number;

        if (viewMode === 'day') {
          const base = new Date(selectedDate + 'T00:00:00');
          from = base.setHours(0, 0, 0, 0);
          to   = new Date(selectedDate + 'T23:59:59').getTime();
        } else {
          to   = todayEnd();
          from = to - 7 * 86400_000;
        }

        const shots = await getCompanyScreenshots(companyId, from, to, 500);
        setScreenshots(shots);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId, selectedDate, viewMode, activeTab]);

  // ── Filtrar por empleado ──────────────────────────────────────────────────
  const filtered = useMemo(() =>
    selectedEmpId === 'all'
      ? screenshots
      : screenshots.filter(s => s.employeeId === selectedEmpId),
    [screenshots, selectedEmpId],
  );

  // ── Agrupar por hora/día ──────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<string, Screenshot[]>();
    filtered.forEach(s => {
      const d   = new Date(s.timestamp);
      const key = viewMode === 'day'
        ? `${d.getHours()}:00`
        : fmtDate(s.timestamp);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return Array.from(map.entries()).sort((a, b) => {
      const tA = a[1][0].timestamp;
      const tB = b[1][0].timestamp;
      return tB - tA;
    });
  }, [filtered, viewMode]);

  // ── Handler para actualizar config de screencast por empleado ──────────────
  const handleUpdateScreencastConfig = async (
    employeeId: string,
    updates: Partial<ScreencastConfig>,
  ) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;
    await updateEmployeeDetails({ ...emp, ...updates } as Employee);
  };

  if (currentUserRole === 'employee') {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>No tienes acceso a esta sección.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-bokara-grey tracking-tight">Screencasts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Capturas de pantalla · Retención 30 días
          </p>
        </div>

        {/* Tabs: Configuración / Galería */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-white text-bokara-grey shadow-sm'
                : 'text-gray-500 hover:text-bokara-grey'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configuración
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'gallery'
                ? 'bg-white text-bokara-grey shadow-sm'
                : 'text-gray-500 hover:text-bokara-grey'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Galería
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
           TAB: Configuración
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'settings' && (
        <ScreencastSettings
          employees={employees}
          currentUser={currentUser}
          onUpdateEmployee={handleUpdateScreencastConfig}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════════
           TAB: Galería
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'gallery' && (
        <>
          {/* Controles de galería */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {(['day', 'week'] as ViewMode[]).map(m => (
                <button key={m} onClick={() => setViewMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    viewMode === m ? 'bg-white text-bokara-grey shadow-sm' : 'text-gray-500 hover:text-bokara-grey'
                  }`}>
                  {m === 'day' ? 'Día' : '7 días'}
                </button>
              ))}
            </div>

            {viewMode === 'day' && (
              <input
                type="date"
                value={selectedDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm text-bokara-grey bg-white focus:outline-none focus:ring-2 focus:ring-lucius-lime"
              />
            )}

            <select
              value={selectedEmpId}
              onChange={e => setSelectedEmpId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm text-bokara-grey bg-white focus:outline-none focus:ring-2 focus:ring-lucius-lime"
            >
              <option value="all">Todos los colaboradores</option>
              {collaborators.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          {/* Contador */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-semibold text-bokara-grey">{filtered.length}</span> capturas
            {selectedEmpId !== 'all' && (
              <span>· {collaborators.find(e => e.id === selectedEmpId)?.name}</span>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
              <div className="w-5 h-5 border-2 border-lucius-lime border-t-transparent rounded-full animate-spin" />
              Cargando capturas…
            </div>
          )}

          {/* Sin resultados */}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400 space-y-2">
              <p className="text-4xl">📷</p>
              <p className="font-medium">No hay capturas en este período</p>
              <p className="text-xs">Las capturas aparecen cuando los colaboradores están en estado Working con Electron instalado</p>
            </div>
          )}

          {/* Grid agrupado por hora/día */}
          {!loading && grouped.map(([groupKey, shots]) => (
            <div key={groupKey} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-bokara-grey">
                  {viewMode === 'day'
                    ? (() => {
                        const [h] = groupKey.split(':');
                        const hour = parseInt(h);
                        const ampm = hour >= 12 ? 'PM' : 'AM';
                        const h12  = hour % 12 || 12;
                        return `${h12}:00 ${ampm}`;
                      })()
                    : groupKey
                  }
                </span>
                <span className="text-xs text-gray-400">{shots.length} captura{shots.length !== 1 ? 's' : ''}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {shots.map(shot => {
                  const emp = employees.find(e => e.id === shot.employeeId);
                  return (
                    <button
                      key={shot.id}
                      onClick={() => setLightbox(shot)}
                      className="group relative bg-gray-100 rounded-xl overflow-hidden aspect-video hover:ring-2 hover:ring-lucius-lime transition-all shadow-sm"
                    >
                      <img
                        src={shot.storageUrl}
                        alt={`Screenshot ${fmtTime(shot.timestamp)}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <p className="text-white text-[10px] font-bold">{fmtTime(shot.timestamp)}</p>
                        {selectedEmpId === 'all' && (
                          <p className="text-white/80 text-[9px] truncate">{emp?.name ?? shot.employeeName}</p>
                        )}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1.5 py-0.5">
                        <p className="text-white text-[9px] font-medium">{fmtTime(shot.timestamp)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-5xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white font-semibold">
                  {employees.find(e => e.id === lightbox.employeeId)?.name ?? lightbox.employeeName}
                </p>
                <p className="text-white/60 text-sm">
                  {fmtDate(lightbox.timestamp)} · {fmtTime(lightbox.timestamp)}
                </p>
              </div>
              <button
                onClick={() => setLightbox(null)}
                className="text-white/60 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <img
              src={lightbox.storageUrl}
              alt="Screenshot"
              className="w-full rounded-xl shadow-2xl"
            />

            <div className="flex justify-between mt-3">
              <button
                onClick={() => {
                  const idx = filtered.findIndex(s => s.id === lightbox.id);
                  if (idx < filtered.length - 1) setLightbox(filtered[idx + 1]);
                }}
                disabled={filtered.findIndex(s => s.id === lightbox.id) >= filtered.length - 1}
                className="text-white/60 hover:text-white disabled:opacity-30 text-sm flex items-center gap-1"
              >
                ← Anterior
              </button>
              <button
                onClick={() => {
                  const idx = filtered.findIndex(s => s.id === lightbox.id);
                  if (idx > 0) setLightbox(filtered[idx - 1]);
                }}
                disabled={filtered.findIndex(s => s.id === lightbox.id) === 0}
                className="text-white/60 hover:text-white disabled:opacity-30 text-sm flex items-center gap-1"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreencastsPage;