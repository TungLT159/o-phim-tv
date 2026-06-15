import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EpisodeList, {
  DEFAULT_COLUMNS,
  DEFAULT_VISIBLE_ROWS,
  EPISODE_ROW_GAP,
  EPISODE_ROW_HEIGHT,
  VIRTUAL_ITEM_LIMIT,
  getEpisodeIdentity,
} from "./EpisodeList";
import "./episode-scroll.scss";

const EMPTY_EPISODES = [];
const NOOP = () => {};

const EpisodeScroll = ({
  episodes = EMPTY_EPISODES,
  episodeGroups = EMPTY_EPISODES,
  currentEpisode,
  onSelectEpisode = NOOP,
}) => {
  const scrollContainerRef = useRef(null);
  const episodeListRef = useRef(null);
  const scrollFrameRef = useRef(null);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [virtualScrollTop, setVirtualScrollTop] = useState(0);
  const [virtualColumns, setVirtualColumns] = useState(DEFAULT_COLUMNS);
  const [virtualVisibleRows, setVirtualVisibleRows] = useState(
    DEFAULT_VISIBLE_ROWS,
  );
  const episodeRefs = useRef([]);

  const episodeIndexByKey = useMemo(() => {
    const indexByKey = new Map();
    episodes?.forEach((episode, index) => {
      indexByKey.set(getEpisodeIdentity(episode), index);
    });
    return indexByKey;
  }, [episodes]);

  const hasGroups = episodeGroups.length > 0;
  const activeGroup = episodeGroups[activeGroupIndex];
  const currentEpisodeKey = getEpisodeIdentity(currentEpisode);
  const currentGroupIndex = hasGroups
    ? Math.max(
        0,
        episodeGroups.findIndex((group) =>
          group.episodes.some(
            (episode) => getEpisodeIdentity(episode) === currentEpisodeKey,
          ),
        ),
      )
    : 0;

  const resetEpisodeScroll = useCallback(() => {
    setVirtualScrollTop(0);
    if (episodeListRef.current) {
      episodeListRef.current.scrollTop = 0;
    }
  }, []);

  useEffect(() => {
    if (hasGroups) {
      setActiveGroupIndex(currentGroupIndex);
      resetEpisodeScroll();
    }
  }, [currentGroupIndex, hasGroups, resetEpisodeScroll]);

  useEffect(() => {
    const listElement = episodeListRef.current;
    if (!listElement) return undefined;

    const measureList = () => {
      const width = listElement.clientWidth || 0;
      const height = listElement.clientHeight || 0;
      const columns = width
        ? Math.max(
            1,
            Math.floor((width + EPISODE_ROW_GAP) / (80 + EPISODE_ROW_GAP)),
          )
        : DEFAULT_COLUMNS;
      const visibleRows = height
        ? Math.max(1, Math.ceil(height / (EPISODE_ROW_HEIGHT + EPISODE_ROW_GAP)))
        : DEFAULT_VISIBLE_ROWS;

      setVirtualColumns(columns);
      setVirtualVisibleRows(visibleRows);
    };

    measureList();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measureList);
      return () => window.removeEventListener("resize", measureList);
    }

    const resizeObserver = new ResizeObserver(measureList);
    resizeObserver.observe(listElement);
    return () => resizeObserver.disconnect();
  }, [activeGroupIndex, hasGroups]);

  // Tự động focus vào tập đang phát khi component mount
  useEffect(() => {
    if (currentEpisode && episodes) {
      const currentIndex = episodeIndexByKey.get(currentEpisodeKey);
      if (currentIndex !== undefined) {
        if (episodes.length > VIRTUAL_ITEM_LIMIT) {
          const activeGroupIndex = activeGroup?.episodes.findIndex(
            (episode) => getEpisodeIdentity(episode) === currentEpisodeKey,
          );
          const virtualIndex =
            activeGroupIndex !== undefined && activeGroupIndex >= 0
              ? activeGroupIndex
              : currentIndex;
          const targetTop =
            Math.floor(virtualIndex / virtualColumns) *
            (EPISODE_ROW_HEIGHT + EPISODE_ROW_GAP);
          setVirtualScrollTop(targetTop);
          if (episodeListRef.current) {
            episodeListRef.current.scrollTop = targetTop;
          }
        }

        // Scroll đến tập đang phát
        const timeoutId = setTimeout(() => {
          episodeRefs.current[currentIndex]?.scrollIntoView?.({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }, 100);

        return () => clearTimeout(timeoutId);
      }
    }
    return undefined;
  }, [
    currentEpisode,
    currentEpisodeKey,
    activeGroup,
    episodes,
    episodeIndexByKey,
    virtualColumns,
  ]);

  const handleEpisodeClick = (ep) => {
    onSelectEpisode(ep);
  };

  useEffect(
    () => () => {
      if (scrollFrameRef.current) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    },
    [],
  );

  const handleVirtualScroll = (event) => {
    const nextScrollTop = event.currentTarget.scrollTop;

    if (scrollFrameRef.current) {
      cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = requestAnimationFrame(() => {
      setVirtualScrollTop(nextScrollTop);
      scrollFrameRef.current = null;
    });
  };

  if (!episodes || episodes.length === 0) {
    return null;
  }

  return (
    <div className="episode-scroll" ref={scrollContainerRef}>
      <div className="episode-scroll__header">
        <h3 className="episode-scroll__title">Danh sách tập phim</h3>
        <span className="episode-scroll__count">{episodes.length} tập</span>
      </div>

      {hasGroups ? (
        <>
          <div
            className="episode-tabs"
            role="tablist"
            aria-label="Chọn phần phim"
          >
            {episodeGroups.map((group, groupIndex) => {
              const isActive = activeGroupIndex === groupIndex;

              return (
                <button
                  key={`${group.title}-${groupIndex}`}
                  type="button"
                  role="tab"
                  className={`episode-tab ${isActive ? "active" : ""}`}
                  aria-selected={isActive ? "true" : "false"}
                  onClick={() => {
                    setActiveGroupIndex(groupIndex);
                    resetEpisodeScroll();
                  }}
                >
                  <span className="episode-tab__title">{group.title}</span>
                  <span className="episode-tab__count">
                    {group.episodes.length} tập
                  </span>
                </button>
              );
            })}
          </div>

          {activeGroup && (
            <div className="episode-group episode-group--active">
              <EpisodeList
                items={activeGroup.episodes}
                labelPrefix={`${activeGroup.title} `}
                currentEpisodeKey={currentEpisodeKey}
                episodeIndexByKey={episodeIndexByKey}
                episodeRefs={episodeRefs}
                listRef={episodeListRef}
                onEpisodeClick={handleEpisodeClick}
                onVirtualScroll={handleVirtualScroll}
                virtualColumns={virtualColumns}
                virtualScrollTop={virtualScrollTop}
                virtualVisibleRows={virtualVisibleRows}
              />
            </div>
          )}
        </>
      ) : (
        <EpisodeList
          items={episodes}
          currentEpisodeKey={currentEpisodeKey}
          episodeIndexByKey={episodeIndexByKey}
          episodeRefs={episodeRefs}
          listRef={episodeListRef}
          onEpisodeClick={handleEpisodeClick}
          onVirtualScroll={handleVirtualScroll}
          virtualColumns={virtualColumns}
          virtualScrollTop={virtualScrollTop}
          virtualVisibleRows={virtualVisibleRows}
        />
      )}

      {/* <div className="episode-scroll__hint">
        <span>💡 Dùng phím mũi tên để di chuyển, Enter để chọn</span>
      </div> */}
    </div>
  );
};

export default EpisodeScroll;
