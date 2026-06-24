import React, { useEffect, useState } from 'react';
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
  const [domFocusedButton, setDomFocusedButton] = useState(null);

  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => playRef.current?.focus?.(), 0);
    return () => clearTimeout(timer);
  }, [isVisible, playRef]);

  if (!nextEpisode) return null;

  const nextEpisodeLabel = formatEpisodeDisplayName(nextEpisode.name);
  const isPlayFocused = playFocused || domFocusedButton === 'play';
  const isCancelFocused = cancelFocused || domFocusedButton === 'cancel';

  return (
    <div className={`autoplay-card ${isVisible ? 'autoplay-card--visible' : ''}`} role="status">
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
          className={`autoplay-card__button autoplay-card__button--play ${isPlayFocused ? 'autoplay-card__button--focused' : ''}`}
          data-tv-focusable="true"
          onClick={onPlayNow}
          onFocus={() => setDomFocusedButton('play')}
          onBlur={() => setDomFocusedButton((current) => (current === 'play' ? null : current))}
          type="button"
          aria-label="Phát tập tiếp theo ngay"
          style={{ '--autoplay-duration': `${autoPlayDuration}s` }}
        >
          <span
            className="autoplay-card__button-fill"
            aria-hidden="true"
            style={{ animationDuration: `${autoPlayDuration}s` }}
          />
          <span>Phát ngay</span>
        </button>
        <button
          ref={cancelRef}
          className={`autoplay-card__button autoplay-card__button--cancel ${isCancelFocused ? 'autoplay-card__button--focused' : ''}`}
          data-tv-focusable="true"
          onClick={onCancel}
          onFocus={() => setDomFocusedButton('cancel')}
          onBlur={() => setDomFocusedButton((current) => (current === 'cancel' ? null : current))}
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
