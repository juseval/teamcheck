import React from 'react';

interface EmployeeTimeData {
  employeeName: string;
  workSeconds: number;
  breakSeconds: number;
}

interface EmployeeChartProps {
  data: EmployeeTimeData[];
}

const formatDurationTooltip = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
}


const EmployeeChart: React.FC<EmployeeChartProps> = ({ data }) => {
  if (data.length === 0) {
    return <p className="text-center text-bokara-grey/60 py-16">No data available for the selected date range. Log some activity to see the chart.</p>;
  }

  const maxTime = Math.max(...data.flatMap(d => [d.workSeconds, d.breakSeconds]), 1); // Avoid division by zero

  return (
    <div className="mt-8">
      <div className="flex justify-end items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-lucius-lime"></div>
            <span className="text-bokara-grey/80">Work Time</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-wet-sand"></div>
            <span className="text-bokara-grey/80">Break Time</span>
          </div>
      </div>
      <div className="w-full bg-whisper-white p-4 sm:p-6 rounded-lg shadow-inner">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
          {data.map(({ employeeName, workSeconds, breakSeconds }) => (
            <div key={employeeName} className="flex flex-col items-center">
              <div className="h-48 w-full flex items-end justify-center gap-2 border-b-2 border-bokara-grey/10 pb-1">
                {/* Work Bar */}
                <div className="w-1/3 group relative">
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max px-2 py-1 bg-bokara-grey text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {formatDurationTooltip(workSeconds)}
                    </div>
                    <div
                        className="bg-lucius-lime rounded-t-sm transition-all duration-500 ease-out"
                        style={{ height: `${(workSeconds / maxTime) * 100}%` }}
                        title={`Work: ${formatDurationTooltip(workSeconds)}`}
                    ></div>
                </div>
                {/* Break Bar */}
                <div className="w-1/3 group relative">
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max px-2 py-1 bg-bokara-grey text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {formatDurationTooltip(breakSeconds)}
                    </div>
                    <div
                        className="bg-wet-sand rounded-t-sm transition-all duration-500 ease-out"
                        style={{ height: `${(breakSeconds / maxTime) * 100}%` }}
                        title={`Break: ${formatDurationTooltip(breakSeconds)}`}
                    ></div>
                </div>
              </div>
              <p className="text-center text-sm text-bokara-grey mt-2 truncate w-full" title={employeeName}>{employeeName}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmployeeChart;