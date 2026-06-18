import React from 'react';
import { useFocusable } from '../../../context/FocusContext';
import { formatEpisodeDisplayName } from '../../../utils/episodeDisplayName';
import './autoplay-card.scss';

const AutoplayCard = ({
  nextEpisode,
  countdown,
  autoPlayDuration = 10,
  isVisible = false,
  onPlayNow,
  onCancel,
}) => {
  const { ref: playRef, focused: playFocused } = useFocusable(4, 0, 0);
  const { ref: cancelRef, focused: cancelFocused } = useFocusable(4, 0, 1);

  if (!isVisible || !nextEpisode) return null;

  const nextEpisodeLabel = formatEpisodeDisplayName(nextEpisode.name);

  return (
    <div className="autoplay-card" role="status">
      <div className="autoplay-card__content">
        <span className="autoplay-card__label">Tiếp theo</span>
        <strong className="autoplay-card__title">{nextEpisodeLabel}</strong>
        <small className="autoplay-card__countdown">
          Tự động phát sau {countdown} giây
        </small>
      </div>
      <div className="autoplay-card__actions">
        <button
          ref={playRef}
          className={`autoplay-card__button autoplay-card__button--play ${playFocused ? 'autoplay-card__button--focused' : ''}`}
          onClick={onPlayNow}
          type="button"
          aria-label="Phát tập tiếp theo ngay"
          style={{ '--autoplay-duration': `${autoPlayDuration}s` }}
        >
          <span>Phát ngay</span>
        </button>
        <button
          ref={cancelRef}
          className={`autoplay-card__button autoplay-card__button--cancel ${cancelFocused ? 'autoplay-card__button--focused' : ''}`}
          onClick={onCancel}
          type="button"
          aria-label="Hủy tự động phát"
        >
          <i className="bx bx-x" />
        </button>
      </div>
    </div>
  );
};

export default AutoplayCard;
