// src/pages/MobileBlockedPage.tsx
import React from 'react';

interface MobileBlockedPageProps {
    message?: string;
}

const MobileBlockedPage: React.FC<MobileBlockedPageProps> = ({ 
    message = 'Esta aplicación solo está disponible desde computadoras de escritorio por razones de seguridad.' 
}) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-dark-hunter-green to-bokara-grey flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-bright-white rounded-2xl shadow-2xl p-8 text-center">
                {/* Icono de computadora */}
                <div className="mb-6 flex justify-center">
                    <div className="w-24 h-24 bg-lucius-lime/20 rounded-full flex items-center justify-center">
                        <svg 
                            className="w-12 h-12 text-lucius-lime" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                            />
                        </svg>
                    </div>
                </div>

                {/* Título */}
                <h1 className="text-2xl font-bold text-bokara-grey mb-4">
                    Acceso Restringido
                </h1>

                {/* Mensaje */}
                <p className="text-bokara-grey/70 mb-6 leading-relaxed">
                    {message}
                </p>

                {/* Icono de dispositivo móvil bloqueado */}
                <div className="mb-6 flex justify-center items-center gap-4 text-bokara-grey/50">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z"/>
                    </svg>
                    <div className="text-3xl text-red-500">✕</div>
                </div>

                {/* Instrucciones */}
                <div className="bg-whisper-white rounded-lg p-4 text-left">
                    <h3 className="font-semibold text-bokara-grey mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5 text-lucius-lime" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                        </svg>
                        Para acceder a TeamCheck:
                    </h3>
                    <ul className="text-sm text-bokara-grey/70 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-lucius-lime mt-0.5">•</span>
                            <span>Utiliza una computadora de escritorio o laptop</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-lucius-lime mt-0.5">•</span>
                            <span>Asegúrate de estar en la red de la empresa</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-lucius-lime mt-0.5">•</span>
                            <span>Usa un navegador actualizado (Chrome, Firefox, Edge)</span>
                        </li>
                    </ul>
                </div>

                {/* Logo o marca */}
                <div className="mt-6 pt-6 border-t border-bokara-grey/10">
                    <p className="text-sm text-bokara-grey/50 font-display">
                        TeamCheck
                    </p>
                    <p className="text-xs text-bokara-grey/40 mt-1">
                        Sistema de Control de Asistencia
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MobileBlockedPage;