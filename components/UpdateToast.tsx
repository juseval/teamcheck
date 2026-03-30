// src/components/UpdateToast.tsx
// Muestra notificaciones de actualización en la app Desktop
import React, { useState, useEffect } from 'react';
import { isElectron } from '../hooks/useElectron';

type UpdateState =
  | { phase: 'idle' }
  | { phase: 'available';   version: string }
  | { phase: 'downloading'; percent: number }
  | { phase: 'ready';       version: string }
  | { phase: 'error';       message: string };

const UpdateToast: React.FC = () => {
  const [state, setState] = useState<UpdateState>({ phase: 'idle' });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;

    const u1 = api.onUpdateAvailable?.((data: any) => {
      setState({ phase: 'available', version: data.version });
      setVisible(true);
    });
    const u2 = api.onUpdateDownloadProgress?.((data: any) => {
      setState({ phase: 'downloading', percent: data.percent });
      setVisible(true);
    });
    const u3 = api.onUpdateDownloaded?.((data: any) => {
      setState({ phase: 'ready', version: data.version });
      setVisible(true);
    });
    const u4 = api.onUpdateError?.((data: any) => {
      setState({ phase: 'error', message: data.message });
      setVisible(true);
      setTimeout(() => setVisible(false), 6000);
    });

    return () => { u1?.(); u2?.(); u3?.(); u4?.(); };
  }, []);

  if (!isElectron || !visible || state.phase === 'idle') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-bokara-grey/10 overflow-hidden">

        {/* ── Actualización disponible ── */}
        {state.phase === 'available' && (
          <>
            <div className="bg-bokara-grey px-4 py-3 flex items-center gap-2">
              <span className="text-lg">🔄</span>
              <div>
                <p className="text-white font-bold text-sm">Actualización disponible</p>
                <p className="text-white/60 text-xs">TeamCheck v{state.version}</p>
              </div>
              <button onClick={() => setVisible(false)} className="ml-auto text-white/40 hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-bokara-grey/60">Hay una nueva versión lista para descargar. La instalación ocurre automáticamente al cerrar la app.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { (window as any).electronAPI.downloadUpdate(); setState({ phase: 'downloading', percent: 0 }); }}
                  className="flex-1 bg-lucius-lime text-bokara-grey font-bold py-2 rounded-xl text-sm hover:brightness-105 transition-all"
                >
                  Descargar ahora
                </button>
                <button onClick={() => setVisible(false)} className="px-3 py-2 bg-gray-100 text-bokara-grey/60 font-bold rounded-xl text-sm hover:bg-gray-200 transition-all">
                  Después
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Descargando ── */}
        {state.phase === 'downloading' && (
          <>
            <div className="bg-bokara-grey px-4 py-3 flex items-center gap-2">
              <span className="text-lg">⬇️</span>
              <div>
                <p className="text-white font-bold text-sm">Descargando actualización</p>
                <p className="text-white/60 text-xs">{state.percent}% completado</p>
              </div>
            </div>
            <div className="p-4">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-lucius-lime h-2 rounded-full transition-all duration-300"
                  style={{ width: `${state.percent}%` }}
                />
              </div>
              <p className="text-[10px] text-bokara-grey/40 mt-2 text-center">No cierres la aplicación</p>
            </div>
          </>
        )}

        {/* ── Lista para instalar ── */}
        {state.phase === 'ready' && (
          <>
            <div className="bg-lucius-lime px-4 py-3 flex items-center gap-2">
              <span className="text-lg">✅</span>
              <div>
                <p className="text-bokara-grey font-bold text-sm">Lista para instalar</p>
                <p className="text-bokara-grey/60 text-xs">TeamCheck v{state.version}</p>
              </div>
              <button onClick={() => setVisible(false)} className="ml-auto text-bokara-grey/40 hover:text-bokara-grey text-lg leading-none">×</button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-bokara-grey/60">La actualización se instalará automáticamente al cerrar la app, o puedes reiniciar ahora.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => (window as any).electronAPI.installUpdate()}
                  className="flex-1 bg-bokara-grey text-white font-bold py-2 rounded-xl text-sm hover:bg-black transition-all"
                >
                  Reiniciar e instalar
                </button>
                <button onClick={() => setVisible(false)} className="px-3 py-2 bg-gray-100 text-bokara-grey/60 font-bold rounded-xl text-sm hover:bg-gray-200 transition-all">
                  Después
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Error ── */}
        {state.phase === 'error' && (
          <div className="p-4 flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-sm font-bold text-bokara-grey">Error al actualizar</p>
              <p className="text-xs text-bokara-grey/50 mt-0.5">{state.message}</p>
            </div>
            <button onClick={() => setVisible(false)} className="ml-auto text-gray-300 hover:text-gray-500 text-lg leading-none">×</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateToast;