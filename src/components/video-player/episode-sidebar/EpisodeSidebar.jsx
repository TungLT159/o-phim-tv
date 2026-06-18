import React, { useEffect } from 'react';
import { useFocusable, useFocus } from '../../../context/FocusContext';
import { formatEpisodeDisplayName } from '../../../utils/episodeDisplayName';
import './episode-sidebar.scss';

const EpisodeSidebar = ({
  episodes = [],
  currentEpisode,
  isOpen = false,
  onClose,
  onSelectEpisode,
}) => {
  const { setTrap, clearTrap } = useFocus();
  const { ref: closeRef, focused: closeFocused } = useFocusable(3, 0, 0);

  // Set focus trap when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setTrap(3); // Trap focus in zone 3
      // Auto-focus close button
      if (closeRef.current) {
        closeRef.current.focus();
      }
    } else {
      clearTrap();
    }
  }, [isOpen, setTrap, clearTrap, closeRef]);

  // Handle Backspace/Escape to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentEpisodeKey = currentEpisode?.episodeKey || currentEpisode?.slug || currentEpisode?.name;

  return (
    <div 
      className={`episode-sidebar ${isOpen ? 'episode-sidebar--open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Danh sách tập"
    >
      <div className="episode-sidebar__header">
        <h2 className="episode-sidebar__title">Tập phim</h2>
        <button
          ref={closeRef}
          className={`episode-sidebar__close ${closeFocused ? 'episode-sidebar__close--focused' : ''}`}
          onClick={onClose}
          type="button"
          aria-label="Đóng danh sách tập"
        >
          <i className="bx bx-x" />
        </button>
      </div>

      <div className="episode-sidebar__list">
        {episodes.map((episode, index) => {
          const episodeKey = episode.episodeKey || episode.slug || episode.name;
          const isCurrent = episodeKey === currentEpisodeKey;

          return (
            <EpisodeSidebarItem
              key={episodeKey}
              episode={episode}
              row={index + 1}
              isCurrent={isCurrent}
              onClick={() => {
                onSelectEpisode(episode);
                onClose();
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

// Sidebar item sub-component
function EpisodeSidebarItem({ episode, row, isCurrent, onClick }) {
  const { ref, focused } = useFocusable(3, row, 0);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <button
      ref={ref}
      className={`episode-sidebar__item ${focused ? 'episode-sidebar__item--focused' : ''} ${isCurrent ? 'episode-sidebar__item--current' : ''}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      type="button"
      aria-current={isCurrent ? 'true' : undefined}
    >
      <div className="episode-sidebar__item-thumbnail">
        {/* TODO: Thumbnail will be added in Phase 4 */}
        <div className="episode-sidebar__item-placeholder">
          <i className="bx bx-play-circle" />
        </div>
      </div>
      <div className="episode-sidebar__item-info">
        <span className="episode-sidebar__item-number">
          {formatEpisodeDisplayName(episode.name)}
        </span>
        <span className="episode-sidebar__item-title">{episode.name}</span>
      </div>
    </button>
  );
}

export default EpisodeSidebar;
