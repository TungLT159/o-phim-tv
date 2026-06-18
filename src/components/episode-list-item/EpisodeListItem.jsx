import React, { useEffect } from 'react';
import { useFocusable } from '../../context/FocusContext';
import { formatEpisodeDisplayName } from '../../utils/episodeDisplayName';
import './episode-list-item.scss';

const EpisodeListItem = ({
  episode,
  zone,
  row,
  col,
  isCurrent = false,
  onClick,
}) => {
  const { ref, focused } = useFocusable(zone, row, col);

  // TODO: TMDB episode thumbnail fetching will be added in Phase 3
  // For now, always use placeholder

  const episodeNumber = formatEpisodeDisplayName(episode.name);
  const episodeDescription = episode.description || '';
  const duration = episode.duration || '';

  const handleClick = () => {
    if (onClick) onClick(episode);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleClick();
    }
  };

  useEffect(() => {
    // Auto-scroll to center when focused
    if (focused && ref.current && ref.current.scrollIntoView) {
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [focused, ref]);

  return (
    <div
      ref={ref}
      className={`episode-list-item ${focused ? 'episode-list-item--focused' : ''} ${isCurrent ? 'episode-list-item--current' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={-1}
      aria-current={isCurrent ? 'true' : undefined}
    >
      <div className="episode-list-item__thumbnail">
        <div className="episode-list-item__thumbnail-placeholder">
          <i className="bx bx-play-circle" />
        </div>
      </div>

      <div className="episode-list-item__info">
        <div className="episode-list-item__header">
          <span className="episode-list-item__number">{episodeNumber}</span>
        </div>
        {episodeDescription && (
          <p className="episode-list-item__description">{episodeDescription}</p>
        )}
      </div>

      {duration && (
        <div className="episode-list-item__duration">{duration}</div>
      )}
    </div>
  );
};

export default EpisodeListItem;
