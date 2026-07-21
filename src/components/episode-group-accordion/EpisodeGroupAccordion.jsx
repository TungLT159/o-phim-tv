import React, { useState, useEffect, useRef, useCallback } from 'react';
import { focusKeyForGrid, useFocusable, useOptionalFocus } from '../../context/FocusContext';
import './episode-group-accordion.scss';

function AccordionHeader({ group, groupIndex, isOpen, onToggle, zone, row, col, onArrowPress }) {
  const { ref, focused } = useFocusable({
    focusKey: focusKeyForGrid(zone, row, col),
    onArrowPress,
  });

  const handleKeyDown = useCallback((e) => {
    const directionByKey = {
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
    };
    const direction = directionByKey[e.key];

    if (direction) {
      if (onArrowPress?.(direction) === false) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onToggle();
    }
  }, [onArrowPress, onToggle]);

  const episodes = group?.episodes ?? [];
  const title = group?.title || 'Nhóm ' + (groupIndex + 1);

  return (
    <button
      ref={ref}
      type="button"
      className={`episode-accordion__header ${focused ? 'episode-accordion__header--focused' : ''}`}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      data-focus-key={focusKeyForGrid(zone, row, col)}
      aria-expanded={isOpen}
    >
      <span className={`episode-accordion__chevron ${isOpen ? 'episode-accordion__chevron--open' : ''}`}>
        ▶
      </span>
      <span className="episode-accordion__header-title">{title}</span>
      <span className="episode-accordion__header-count">{episodes.length} tập</span>
    </button>
  );
}

const DEFAULT_COLUMNS = 4;

function EpisodeGroupAccordion({
  groups = [],
  currentEpisode,
  zone = 1,
  baseRow = 0,
  columns = DEFAULT_COLUMNS,
  variant = 'default',
  renderEpisode,
}) {
  const [openGroups, setOpenGroups] = useState({});
  const initialAutoOpenDone = useRef(false);
  const focusByKey = useOptionalFocus()?.focusByKey;

  const toggleGroup = useCallback((index) => {
    setOpenGroups((prev) => {
      const isCurrentlyOpen = !!prev[index];
      if (isCurrentlyOpen) {
        return {};
      }
      return { [index]: true };
    });
  }, []);

  useEffect(() => {
    if (!currentEpisode || !groups.length || initialAutoOpenDone.current) return;
    const currentKey = currentEpisode.episodeKey || currentEpisode.slug || currentEpisode.name;
    const groupIndex = groups.findIndex((group) => {
      const episodes = group?.episodes ?? [];
      return episodes.some((ep) => {
        const epKey = ep.episodeKey || ep.slug || ep.name;
        return epKey === currentKey;
      });
    });
    if (groupIndex >= 0) {
      setOpenGroups((prev) => ({ ...prev, [groupIndex]: true }));
    }
    initialAutoOpenDone.current = true;
  }, [currentEpisode, groups]);

  if (!groups.length) return null;

  let rowCursor = baseRow;

  return (
    <div className={`episode-accordion ${variant === 'sidebar' ? 'episode-accordion--sidebar' : ''}`}>
      {groups.map((group, groupIndex) => {
        const headerRow = rowCursor;
        rowCursor += 1;

        const isOpen = !!openGroups[groupIndex];
        const episodes = group?.episodes ?? [];
        const episodeRows = isOpen ? Math.ceil(episodes.length / columns) : 0;
        const contentStartRow = rowCursor;
        rowCursor += episodeRows;
        const nextHeaderRow = rowCursor;

        const focusAccordionKey = (targetRow, targetCol = 0) => (
          focusByKey?.(focusKeyForGrid(zone, targetRow, targetCol)) || false
        );

        const handleHeaderArrowPress = (direction) => {
          if (direction !== 'down') return true;

          if (isOpen && episodes.length) {
            return focusAccordionKey(contentStartRow, 0) ? false : true;
          }

          if (groupIndex < groups.length - 1) {
            return focusAccordionKey(nextHeaderRow, 0) ? false : true;
          }

          return true;
        };

        const getEpisodeArrowTarget = (episodeIndex, direction) => {
          const isFirstColumn = episodeIndex % columns === 0;
          const isLastColumn = episodeIndex % columns === columns - 1;

          if (direction === 'left' && isFirstColumn) return -1;
          if (direction === 'right' && isLastColumn) return -1;
          if (direction === 'left') return episodeIndex - 1;
          if (direction === 'right') return episodeIndex + 1;
          if (direction === 'up') return episodeIndex - columns;
          if (direction === 'down') return episodeIndex + columns;
          return -1;
        };

        const handleEpisodeArrowPress = (episodeIndex, direction) => {
          const targetIndex = getEpisodeArrowTarget(episodeIndex, direction);

          if (direction === 'up' && targetIndex < 0) {
            return focusAccordionKey(headerRow, 0) ? false : true;
          }

          if (direction === 'down' && targetIndex >= episodes.length && groupIndex < groups.length - 1) {
            return focusAccordionKey(nextHeaderRow, 0) ? false : true;
          }

          if (targetIndex < 0 || targetIndex >= episodes.length) return false;

          const targetRow = contentStartRow + Math.floor(targetIndex / columns);
          const targetCol = targetIndex % columns;
          return focusAccordionKey(targetRow, targetCol) ? false : true;
        };

        return (
          <div key={group?.title || groupIndex} className="episode-accordion__group">
            <AccordionHeader
              group={group}
              groupIndex={groupIndex}
              isOpen={isOpen}
              onToggle={() => toggleGroup(groupIndex)}
              zone={zone}
              row={headerRow}
              col={0}
              onArrowPress={handleHeaderArrowPress}
            />
            <div className={`episode-accordion__content ${isOpen ? 'episode-accordion__content--open' : ''}`}>
              {isOpen && (
                <div
                  className="episode-accordion__ep-list"
                  style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
                >
                  {episodes.map((ep, idx) => {
                    const epRow = contentStartRow + Math.floor(idx / columns);
                    const epCol = idx % columns;
                    if (typeof renderEpisode === 'function') {
                      return renderEpisode(ep, epRow, epCol, {
                        focusKey: focusKeyForGrid(zone, epRow, epCol),
                        onArrowPress: (direction) => handleEpisodeArrowPress(idx, direction),
                      });
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default EpisodeGroupAccordion;
