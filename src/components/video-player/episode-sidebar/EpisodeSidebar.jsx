import React, { useEffect, useCallback, useRef } from 'react';
import {
  FOCUS_KEYS,
  focusKeyForPlayerEpisode,
  useFocusable,
  useOptionalFocus,
} from '../../../context/FocusContext';
import { formatEpisodeDisplayName } from '../../../utils/episodeDisplayName';
import EpisodeGroupAccordion from '../../episode-group-accordion/EpisodeGroupAccordion';
import './episode-sidebar.scss';

const getEpisodeKey = (episode) => episode?.episodeKey || episode?.slug || episode?.name;
const PLAYER_EPISODES_CLOSE_FOCUS_KEY = `${FOCUS_KEYS.PLAYER_EPISODES}_CLOSE`;

const getEpisodeFocusSeed = (episode, index) => {
  const key = getEpisodeKey(episode);
  return key ? `${key}_${index}` : index;
};

const buildEpisodeEntries = (episodeGroups, episodes, hasGroups) => {
  if (!hasGroups) {
    return episodes.map((episode, index) => ({ episode, index }));
  }

  let index = 0;
  return episodeGroups.flatMap((group) => (group?.episodes || []).map((episode) => {
    const entry = { episode, index };
    index += 1;
    return entry;
  }));
};

function EpisodeSidebarItem({ episode, row, isCurrent, onClick, focusKey }) {
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: () => onClick(),
  });

  return (
    <button
      ref={ref}
      className={`episode-sidebar__item ${focused ? 'episode-sidebar__item--focused' : ''} ${isCurrent && !focused ? 'episode-sidebar__item--current' : ''}`}
      onClick={onClick}
      type="button"
      data-focus-row={row}
      data-focus-key={focusKey}
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

function EpisodeSidebarContent({
  episodes = [],
  episodeGroups = [],
  currentEpisode,
  onClose,
  onSelectEpisode,
}) {
  const focus = useOptionalFocus();
  const setTrap = focus?.setTrap;
  const clearTrap = focus?.clearTrap;
  const focusByKey = focus?.focusByKey;
  const sidebarRef = useRef(null);
  const trapWasActiveRef = useRef(false);
  const { ref: closeRef, focused: closeFocused } = useFocusable({
    focusKey: PLAYER_EPISODES_CLOSE_FOCUS_KEY,
    onEnterPress: onClose,
  });

  const handleSelect = useCallback((ep) => {
    onSelectEpisode(ep);
  }, [onSelectEpisode]);

  const currentEpisodeKey = getEpisodeKey(currentEpisode);
  const hasGroups = episodeGroups.length > 1;
  const sidebarEpisodeEntries = buildEpisodeEntries(episodeGroups, episodes, hasGroups);
  const currentEntry = sidebarEpisodeEntries.find((entry) => getEpisodeKey(entry.episode) === currentEpisodeKey);
  const currentIndex = currentEntry?.index ?? 0;
  const currentEpisodeForFocus = currentEntry?.episode || sidebarEpisodeEntries[0]?.episode;
  const currentFocusKey = focusKeyForPlayerEpisode(
    getEpisodeFocusSeed(currentEpisodeForFocus, currentIndex),
    currentIndex,
  );

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
    const handleKeyDown = (e) => {
      handleBackKey(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBackKey]);

  useEffect(() => {
    setTrap?.(3, firstFocusableRow, 0);
    trapWasActiveRef.current = true;

    const focusCurrentEpisode = () => {
      const currentEpisodeButton = sidebarRef.current?.querySelector('.episode-sidebar__item--current');
      if (currentEpisodeButton) {
        currentEpisodeButton.focus();
        return true;
      }

      const firstEpisode = sidebarRef.current?.querySelector('.episode-sidebar__item');
      if (firstEpisode) {
        firstEpisode.focus();
        return true;
      }

      closeRef.current?.focus();
      return Boolean(closeRef.current);
    };

    focusCurrentEpisode();
    const timer = setTimeout(() => {
      if (focusByKey?.(currentFocusKey)) return;
      focusCurrentEpisode();
    }, 0);

    return () => {
      clearTimeout(timer);
      if (trapWasActiveRef.current) {
        clearTrap?.();
        trapWasActiveRef.current = false;
      }
    };
  }, [firstFocusableRow, setTrap, clearTrap, closeRef, currentFocusKey, focusByKey]);

  const renderSidebarEpisode = (ep, row, col) => {
    const episodeKey = getEpisodeKey(ep);
    const isCurrent = episodeKey === currentEpisodeKey;
    const entry = sidebarEpisodeEntries.find((candidate) => candidate.episode === ep);
    const focusIndex = entry?.index ?? row;
    return (
      <EpisodeSidebarItem
        key={getEpisodeFocusSeed(ep, focusIndex)}
        episode={ep}
        row={row}
        isCurrent={isCurrent}
        onClick={() => handleSelect(ep)}
        focusKey={focusKeyForPlayerEpisode(getEpisodeFocusSeed(ep, focusIndex), focusIndex)}
      />
    );
  };

  return (
    <div 
      ref={sidebarRef}
      className="episode-sidebar episode-sidebar--open"
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
            const episodeKey = getEpisodeKey(ep);
            const isCurrent = episodeKey === currentEpisodeKey;
            return (
              <EpisodeSidebarItem
                key={getEpisodeFocusSeed(ep, index)}
                episode={ep}
                row={index + 1}
                isCurrent={isCurrent}
                onClick={() => handleSelect(ep)}
                focusKey={focusKeyForPlayerEpisode(getEpisodeFocusSeed(ep, index), index)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

const EpisodeSidebar = ({ isOpen = false, ...props }) => {
  if (!isOpen) return null;
  return <EpisodeSidebarContent {...props} />;
};

export default EpisodeSidebar;
