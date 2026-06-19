import React from 'react';
import './thumbnail-preview.scss';

const formatTime = (seconds) => {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const ThumbnailPreview = ({ visible, dataURL, time, position }) => {
  if (!visible || !dataURL) return null;

  return (
    <div
      className="thumbnail-preview"
      style={{ left: `${position}%` }}
      role="tooltip"
      aria-live="polite"
    >
      <img
        className="thumbnail-preview__image"
        src={dataURL}
        alt={`Preview at ${formatTime(time)}`}
      />
      <span className="thumbnail-preview__time">{formatTime(time)}</span>
    </div>
  );
};

export default ThumbnailPreview;
