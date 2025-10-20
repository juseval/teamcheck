
import React from 'react';
import { TimeEntry } from '../types.ts';

interface TimeLogProps {
  entries: TimeEntry[];
}

const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const TimeLog: React.FC<TimeLogProps> = ({ entries }) => {
  return (
    <div className="w-full bg-dark-hunter-green rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-bright-white mb-4">Time Log</h2>
      <div className="overflow-x-auto">
        {entries.length > 0 ? (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-wet-sand/30">
                <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">Activity</th>
                <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">Start</th>
                <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">End</th>
                <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-bokara-grey/50 hover:bg-bokara-grey/30 transition-colors">
                  <td className="p-3 text-whisper-white">{entry.activity}</td>
                  <td className="p-3 text-whisper-white/80">{formatDate(entry.startTime)}</td>
                  <td className="p-3 text-whisper-white/80">{formatDate(entry.endTime)}</td>
                  <td className="p-3 text-bright-white font-mono text-right">{formatDuration(entry.duration)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center text-whisper-white/60 py-8">No entries yet. Clock in to start tracking your time.</p>
        )}
      </div>
    </div>
  );
};

export default TimeLog;