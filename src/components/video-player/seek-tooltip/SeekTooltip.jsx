import React from 'react';
import './seek-tooltip.scss';

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
const formatTime = (seconds) => {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const SeekTooltip = ({ visible, currentTime, duration, position }) => {
  if (!visible) return null;
  
  return (
    <div 
      className="seek-tooltip" 
      style={{ left: `${position}%` }}
      role="tooltip"
      aria-live="polite"
    >
      <span className="seek-tooltip__time">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
};

export default SeekTooltip;
