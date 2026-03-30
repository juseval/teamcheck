// src/components/DownloadElectronBanner.tsx
//
// Uso en SettingsPage o donde quieras:
//   import DownloadElectronBanner from '../components/DownloadElectronBanner';
//   <DownloadElectronBanner downloadUrl="https://TU_URL/TeamCheck-Setup.exe" />
//
import * as React from 'react';
import { isElectron } from '../hooks/useElectron';

interface Props {
  /** URL pública del instalador .exe generado con electron:build:win */
  downloadUrl?: string;
}

const steps = [
  {
    icon: '⬇️',
    title: 'Descarga el instalador',
    desc:  'Haz clic en el botón de abajo y guarda el archivo .exe.',
  },
  {
    icon: '🛡️',
    title: 'Ejecuta como administrador',
    desc:  'Si Windows muestra "SmartScreen", haz clic en "Más información" → "Ejecutar de todas formas".',
  },
  {
    icon: '🔔',
    title: 'Arranca minimizado',
    desc:  'La app aparece en el área de notificaciones (bandeja del sistema). Haz doble clic para abrirla.',
  },
  {
    icon: '✅',
    title: 'Inicia sesión y ficha',
    desc:  'Entra con tu cuenta de TeamCheck. Las capturas y el control de inactividad se activan automáticamente al hacer Clock In.',
  },
];

const DownloadElectronBanner: React.FC<Props> = ({ downloadUrl }) => {
  // Si ya estamos corriendo en Electron, mostrar estado "instalado"
  if (isElectron) {
    return (
      <div className="rounded-2xl border border-lucius-lime/40 bg-lucius-lime/10 p-5 flex items-center gap-4">
        <span className="text-3xl">✅</span>
        <div>
          <p className="font-bold text-bokara-grey">TeamCheck Desktop instalado</p>
          <p className="text-sm text-gray-500 mt-0.5">
            Las capturas de pantalla y la detección de inactividad están activas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

      {/* Header */}
      <div className="bg-bokara-grey px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-white text-lg font-bold tracking-tight flex items-center gap-2">
            <span>🖥️</span> TeamCheck Desktop
          </h2>
          <p className="text-white/60 text-sm mt-0.5">
            App de escritorio para Windows — capturas automáticas y control de inactividad
          </p>
        </div>

        {downloadUrl ? (
          <a
            href={downloadUrl}
            download
            className="flex-shrink-0 inline-flex items-center gap-2 bg-lucius-lime hover:brightness-105 text-bokara-grey font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow"
          >
            <span>⬇️</span> Descargar instalador (.exe)
          </a>
        ) : (
          <span className="text-white/40 text-sm italic">URL del instalador no configurada</span>
        )}
      </div>

      {/* Pasos */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-3">
            {/* Número */}
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-lucius-lime/20 text-bokara-grey font-bold text-xs flex items-center justify-center mt-0.5">
              {i + 1}
            </div>
            <div>
              <p className="font-semibold text-bokara-grey text-sm flex items-center gap-1">
                <span>{step.icon}</span> {step.title}
              </p>
              <p className="text-gray-500 text-xs mt-1 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer — requisitos */}
      <div className="border-t border-gray-100 px-6 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400">
        <span>🪟 Windows 10 / 11</span>
        <span>🔒 Se necesita permiso de administrador para instalar</span>
        <span>📷 Retención de capturas: 30 días</span>
        <span>☁️ Las capturas se sincronizan automáticamente con la nube</span>
      </div>
    </div>
  );
};

export default DownloadElectronBanner;