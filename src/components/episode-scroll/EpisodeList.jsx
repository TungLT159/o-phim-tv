import React from "react";
import { formatEpisodeDisplayName } from "../../utils/episodeDisplayName";

export const VIRTUAL_ITEM_LIMIT = 40;
export const DEFAULT_COLUMNS = 8;
export const DEFAULT_VISIBLE_ROWS = 6;
export const EPISODE_ROW_HEIGHT = 60;
export const EPISODE_ROW_GAP = 12;
const VIRTUAL_OVERSCAN_ROWS = 2;

export const getEpisodeIdentity = (episode) =>
  episode?.episodeKey ||
  `${episode?.episodeGroupTitle || ""}:${episode?.slug || episode?.name || ""}`;

export const getVirtualWindow = ({
  items,
  virtualScrollTop,
  virtualColumns,
  virtualVisibleRows,
}) => {
  if (!items || items.length <= VIRTUAL_ITEM_LIMIT) {
    return {
      items: items || [],
      startIndex: 0,
      totalHeight: 0,
      offsetTop: 0,
      isVirtual: false,
    };
  }

  const rowStride = EPISODE_ROW_HEIGHT + EPISODE_ROW_GAP;
  const firstVisibleRow = Math.floor(virtualScrollTop / rowStride);
  const startRow = Math.max(0, firstVisibleRow - VIRTUAL_OVERSCAN_ROWS);
  const endRow = Math.min(
    Math.ceil(items.length / virtualColumns),
    firstVisibleRow + virtualVisibleRows + VIRTUAL_OVERSCAN_ROWS,
  );
  const startIndex = startRow * virtualColumns;
  const endIndex = Math.min(items.length, endRow * virtualColumns);

  return {
    items: items.slice(startIndex, endIndex),
    startIndex,
    totalHeight: Math.ceil(items.length / virtualColumns) * rowStride,
    offsetTop: startRow * rowStride,
    isVirtual: true,
  };
};

const EpisodeList = ({
  items,
  labelPrefix = "",
  currentEpisodeKey,
  episodeIndexByKey,
  episodeRefs,
  listRef,
  onEpisodeClick,
  onVirtualScroll,
  virtualColumns,
  virtualScrollTop,
  virtualVisibleRows,
}) => {
  const virtualWindow = getVirtualWindow({
    items,
    virtualScrollTop,
    virtualColumns,
    virtualVisibleRows,
  });
  const listClassName = `episode-list ${
    virtualWindow.isVirtual ? "episode-list--virtual" : ""
  }`;

  const renderEpisodeButton = (ep, index) => {
    const episodeKey = getEpisodeIdentity(ep);
    const episodeIndex = episodeIndexByKey.get(episodeKey) ?? index;
    const isCurrent = currentEpisodeKey === episodeKey;
    const ariaLabel = `${labelPrefix}${formatEpisodeDisplayName(ep.name)}`;

    return (
      <button
        key={episodeKey || index}
        ref={(el) => (episodeRefs.current[episodeIndex] = el)}
        className={`episode-btn ${isCurrent ? "active" : ""}`}
        onClick={() => onEpisodeClick(ep, episodeIndex)}
        tabIndex={0}
        aria-label={ariaLabel}
        aria-current={isCurrent ? "true" : "false"}
      >
        <span className="episode-btn__number">
          {formatEpisodeDisplayName(ep.name)}
        </span>
      </button>
    );
  };

  if (!virtualWindow.isVirtual) {
    return (
      <div className={listClassName} ref={listRef}>
        {virtualWindow.items.map((ep, offset) =>
          renderEpisodeButton(ep, virtualWindow.startIndex + offset),
        )}
      </div>
    );
  }

  return (
    <div className={listClassName} ref={listRef} onScroll={onVirtualScroll}>
      <div
        className="episode-list__virtual-spacer"
        style={{ height: virtualWindow.totalHeight }}
      >
        <div
          className="episode-list__virtual-grid"
          style={{
            gridTemplateColumns: `repeat(${virtualColumns}, minmax(0, 1fr))`,
            transform: `translateY(${virtualWindow.offsetTop}px)`,
          }}
        >
          {virtualWindow.items.map((ep, offset) =>
            renderEpisodeButton(ep, virtualWindow.startIndex + offset),
          )}
        </div>
      </div>
    </div>
  );
};

export default EpisodeList;
