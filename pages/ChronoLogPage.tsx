import React from 'react';
import { TimeEntry } from '../types.ts';
import TimeLog from '../components/TimeLog.tsx';
import Summary from '../components/Summary.tsx';

interface ChronoLogPageProps {
  timeEntries: TimeEntry[];
}

const ChronoLogPage: React.FC<ChronoLogPageProps> = ({ timeEntries }) => {
  return (
    <div className="flex flex-col items-center gap-8 pt-8 animate-fade-in">
      <div className="w-full max-w-6xl text-center">
        <h2 className="text-3xl font-bold text-bokara-grey">ChronoLog AI</h2>
        <p className="text-bokara-grey/70 mt-1">Review your time entries and get an AI-powered productivity summary.</p>
      </div>
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TimeLog entries={timeEntries} />
        <Summary entries={timeEntries} />
      </div>
    </div>
  );
};

export default ChronoLogPage;