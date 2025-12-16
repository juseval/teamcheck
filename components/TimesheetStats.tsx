
import React from 'react';
import { ClockIcon, ActivityLogIcon, CheckCircleIcon } from './Icons';

interface TimesheetStatsProps {
  totalWorkSeconds: number;
  totalActivitySeconds: number;
  uniqueEmployees: number;
  daysCovered: number;
  topPerformer?: { name: string; hours: number };
}

const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
};

const TimesheetStats: React.FC<TimesheetStatsProps> = ({ 
    totalWorkSeconds, 
    totalActivitySeconds, 
    uniqueEmployees, 
    daysCovered,
    topPerformer
}) => {
    const totalSeconds = totalWorkSeconds + totalActivitySeconds;
    const workPercentage = totalSeconds > 0 ? Math.round((totalWorkSeconds / totalSeconds) * 100) : 0;
    const activityPercentage = totalSeconds > 0 ? Math.round((totalActivitySeconds / totalSeconds) * 100) : 0;
    
    // Calculate average hours per employee per day (approx)
    const avgDailySeconds = (uniqueEmployees > 0 && daysCovered > 0) 
        ? (totalWorkSeconds / uniqueEmployees / daysCovered) 
        : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in">
            {/* KPI 1: Total Hours */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-bokara-grey/10 flex items-center gap-4">
                <div className="p-3 bg-lucius-lime/20 text-lucius-lime rounded-full">
                    <ClockIcon className="w-8 h-8" />
                </div>
                <div>
                    <p className="text-xs text-bokara-grey/60 font-bold uppercase tracking-wider">Horas Totales</p>
                    <h3 className="text-2xl font-bold text-bokara-grey">{formatDuration(totalWorkSeconds)}</h3>
                    <p className="text-xs text-lucius-lime font-medium">Trabajo Efectivo</p>
                </div>
            </div>

            {/* KPI 2: Efficiency / Distribution (Donut Chart representation) */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-bokara-grey/10 flex items-center gap-6 relative overflow-hidden">
                <div 
                    className="w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center relative"
                    style={{
                        background: `conic-gradient(#91A673 ${workPercentage}%, #AE8F60 0)`
                    }}
                >
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xs font-bold text-bokara-grey">
                        {workPercentage}%
                    </div>
                </div>
                <div>
                    <p className="text-xs text-bokara-grey/60 font-bold uppercase tracking-wider">Distribución</p>
                    <div className="flex flex-col gap-1 mt-1">
                        <div className="flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 rounded-full bg-lucius-lime"></div>
                            <span>Trabajo</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 rounded-full bg-wet-sand"></div>
                            <span>Pausas/Act.</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI 3: Average Daily */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-bokara-grey/10 flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                    <ActivityLogIcon className="w-8 h-8" />
                </div>
                <div>
                    <p className="text-xs text-bokara-grey/60 font-bold uppercase tracking-wider">Promedio Diario</p>
                    <h3 className="text-2xl font-bold text-bokara-grey">{formatDuration(avgDailySeconds)}</h3>
                    <p className="text-xs text-bokara-grey/40">Por Colaborador</p>
                </div>
            </div>

            {/* KPI 4: Top Performer */}
            <div className="bg-bokara-grey p-6 rounded-xl shadow-md border border-bokara-grey/10 flex items-center gap-4 text-white">
                <div className="p-3 bg-white/10 rounded-full">
                    <CheckCircleIcon className="w-8 h-8 text-lucius-lime" />
                </div>
                <div className="overflow-hidden">
                    <p className="text-xs text-white/60 font-bold uppercase tracking-wider">Mayor Actividad</p>
                    <h3 className="text-lg font-bold truncate" title={topPerformer?.name || '-'}>{topPerformer?.name || '-'}</h3>
                    <p className="text-xs text-lucius-lime font-medium">{topPerformer ? formatDuration(topPerformer.hours) : '0h 0m'}</p>
                </div>
            </div>
        </div>
    );
};

export default TimesheetStats;
