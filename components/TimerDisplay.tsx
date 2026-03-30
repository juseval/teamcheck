
import React from 'react';

interface TimerDisplayProps {
  elapsedTime: number; // in seconds
}

const formatTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const TimerDisplay: React.FC<TimerDisplayProps> = ({ elapsedTime }) => {
  return (
    <div className="font-display text-6xl md:text-8xl text-bright-white tracking-widest tabular-nums">
      {formatTime(elapsedTime)}
    </div>
  );
};

export default TimerDisplay;
