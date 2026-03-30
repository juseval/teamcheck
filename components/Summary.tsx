
import React, { useState } from 'react';
import { TimeEntry } from '../types.ts';
import { generateTimeSummary } from '../services/geminiService.ts';

interface SummaryProps {
  entries: TimeEntry[];
}

const Summary: React.FC<SummaryProps> = ({ entries }) => {
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    setError('');
    setSummary('');
    try {
      const result = await generateTimeSummary(entries);
      setSummary(result);
    } catch (err) {
      setError('Failed to generate summary.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-dark-hunter-green rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-bright-white mb-4">AI Summary</h2>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button
          onClick={handleGenerateSummary}
          disabled={isLoading || entries.length === 0}
          className="w-full sm:w-auto flex-shrink-0 bg-wet-sand hover:bg-opacity-80 disabled:bg-wet-sand/40 disabled:cursor-not-allowed text-bokara-grey font-bold py-2 px-6 rounded-lg transition-all duration-300 shadow-md focus:outline-none focus:ring-2 focus:ring-lucius-lime"
        >
          {isLoading ? 'Analyzing...' : 'Generate Summary'}
        </button>
        {entries.length === 0 && <p className="text-whisper-white/60 text-sm">Add time entries to enable summary.</p>}
      </div>

      {isLoading && (
         <div className="mt-6 flex items-center justify-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-lucius-lime animate-pulse delay-75"></div>
            <div className="w-4 h-4 rounded-full bg-lucius-lime animate-pulse delay-150"></div>
            <div className="w-4 h-4 rounded-full bg-lucius-lime animate-pulse delay-300"></div>
        </div>
      )}

      {error && <p className="mt-6 text-red-400">{error}</p>}
      
      {summary && (
        <div className="mt-6 bg-bokara-grey/50 p-4 rounded-lg">
          <p className="text-whisper-white whitespace-pre-wrap">{summary}</p>
        </div>
      )}
    </div>
  );
};

export default Summary;