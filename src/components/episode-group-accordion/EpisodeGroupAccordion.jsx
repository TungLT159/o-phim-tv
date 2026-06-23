import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusable } from '../../context/FocusContext';
import './episode-group-accordion.scss';

function AccordionHeader({ group, groupIndex, isOpen, onToggle, zone, row, col }) {
  const { ref, focused } = useFocusable(zone, row, col);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  }, [onToggle]);

  const episodes = group?.episodes ?? [];
  const title = group?.title || 'Nhóm ' + (groupIndex + 1);

  return (
    <button
      ref={ref}
      type="button"
      className={`episode-accordion__header ${focused ? 'episode-accordion__header--focused' : ''}`}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
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

  const toggleGroup = useCallback((index) => {
    setOpenGroups((prev) => ({ ...prev, [index]: !prev[index] }));
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
                      return renderEpisode(ep, epRow, epCol);
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
