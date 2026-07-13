import React, { useEffect, useCallback, useRef } from 'react';
import { useFocusable, useOptionalFocus } from '../../../context/FocusContext';
import { formatEpisodeDisplayName } from '../../../utils/episodeDisplayName';
import EpisodeGroupAccordion from '../../episode-group-accordion/EpisodeGroupAccordion';
import './episode-sidebar.scss';

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
      data-focus-row={row}
      aria-current={isCurrent ? 'true' : undefined}
    >
      <div className="episode-sidebar__item-info">
        <span className="episode-sidebar__item-number">
          {formatEpisodeDisplayName(episode.name)}
        </span>
      </div>
    </button>
  );
}

const EpisodeSidebar = ({
  episodes = [],
  episodeGroups = [],
  currentEpisode,
  isOpen = false,
  onClose,
  onSelectEpisode,
}) => {
  const focus = useOptionalFocus();
  const setTrap = focus?.setTrap;
  const clearTrap = focus?.clearTrap;
  const trapWasActiveRef = useRef(false);
  const { ref: closeRef, focused: closeFocused } = useFocusable(3, 0, 0);

  const handleSelect = useCallback((ep) => {
    onSelectEpisode(ep);
    onClose();
  }, [onSelectEpisode, onClose]);

  const currentEpisodeKey = currentEpisode?.episodeKey || currentEpisode?.slug || currentEpisode?.name;
  const hasGroups = episodeGroups.length > 1;

  const firstFocusableRow = 1;

  const handleBackKey = useCallback((e) => {
    if (e.key !== 'Backspace' && e.key !== 'Escape') return false;

    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();
    e.stopImmediatePropagation?.();
    onClose();
    return true;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      handleBackKey(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleBackKey]);

  useEffect(() => {
    if (!isOpen) {
      if (trapWasActiveRef.current) {
        clearTrap?.();
        trapWasActiveRef.current = false;
      }
      return undefined;
    }

    setTrap?.(3, firstFocusableRow, 0);
    trapWasActiveRef.current = true;

    const focusFirstEpisode = () => {
      const firstEpisode = document.querySelector('.episode-sidebar__item');
      if (firstEpisode) {
        firstEpisode.focus();
      } else if (closeRef.current) {
        closeRef.current.focus();
      }
    };

    focusFirstEpisode();
    const frameId = requestAnimationFrame(focusFirstEpisode);
    return () => cancelAnimationFrame(frameId);
  }, [isOpen, firstFocusableRow, setTrap, clearTrap, closeRef]);

  if (!isOpen) return null;

  const renderSidebarEpisode = (ep, row, col) => {
    const episodeKey = ep.episodeKey || ep.slug || ep.name;
    const isCurrent = episodeKey === currentEpisodeKey;
    return (
      <EpisodeSidebarItem
        key={episodeKey}
        episode={ep}
        row={row}
        isCurrent={isCurrent}
        onClick={() => handleSelect(ep)}
      />
    );
  };

  return (
    <div 
      className={`episode-sidebar ${isOpen ? 'episode-sidebar--open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Danh sách tập"
      onKeyDown={handleBackKey}
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
        {hasGroups ? (
          <EpisodeGroupAccordion
            groups={episodeGroups}
            currentEpisode={currentEpisode}
            zone={3}
            baseRow={1}
            columns={1}
            variant="sidebar"
            renderEpisode={renderSidebarEpisode}
          />
        ) : (
          episodes.map((ep, index) => {
            const episodeKey = ep.episodeKey || ep.slug || ep.name;
            const isCurrent = episodeKey === currentEpisodeKey;
            return (
              <EpisodeSidebarItem
                key={episodeKey}
                episode={ep}
                row={index + 1}
                isCurrent={isCurrent}
                onClick={() => handleSelect(ep)}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default EpisodeSidebar;
