import React from 'react';
import './info-overlay.scss';

const InfoOverlay = ({
  title,
  episodeName,
  description,
  isVisible = false,
}) => {
  if (!isVisible) return null;

  return (
    <div className="info-overlay">
      <h2 className="info-overlay__title">{title}</h2>
      {episodeName && (
        <h3 className="info-overlay__episode">{episodeName}</h3>
      )}
      {description && (
        <p className="info-overlay__description">{description}</p>
      )}
    </div>
  );
};

export default InfoOverlay;
