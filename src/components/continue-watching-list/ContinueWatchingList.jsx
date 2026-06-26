import React, { useEffect, useRef, useState } from "react";

import ContentRow from "../content-row/ContentRow";
import { formatEpisodeDisplayName } from "../../utils/episodeDisplayName";
import {
  getRecentInProgressMovies,
  getRecentInProgressMoviesSnapshot,
} from "../../utils/watchHistoryManager";
import "./continue-watching-list.scss";

const FALLBACK_POSTER = "/poster-mau.png";
const SKELETON_CARD_COUNT = 6;

const getEpisodeDisplayText = (episodeName) => {
  const displayName = `${episodeName || ""}`
    .split(":")
    .pop()
    .replace(/^tap-/i, "");
  return displayName ? formatEpisodeDisplayName(displayName) : "";
};

const getItemPercentage = (item) => {
  const storedPercentage = Number(item.percentage);

  if (Number.isFinite(storedPercentage) && storedPercentage > 0) {
    return storedPercentage;
  }

  const currentTime = Number(item.currentTime);
  const duration = Number(item.duration);

  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) {
    return 0;
  }

  return (currentTime / duration) * 100;
};

const mapWatchItemToContentItem = (item) => {
  const movieInfo = item.movieInfo || {};
  const slug = movieInfo.slug || item.movieId;
  const name = movieInfo.title || movieInfo.name || item.movieId;
  const percentage = Math.round(getItemPercentage(item));

  return {
    key: item.key || `${item.movieId}_${item.episodeName}`,
    slug,
    name,
    tmdb: movieInfo.tmdb,
    poster: movieInfo.poster,
    episodeName: item.episodeName || "",
    progressBadge: `Đã xem ${percentage}%`,
    episodeSubtitle: getEpisodeDisplayText(item.episodeName),
  };
};

const getContinueWatchingUrl = (item) =>
  `/movie/${item.slug}?ep=${encodeURIComponent(item.episodeName || "")}`;

const SkeletonCards = () => (
  <div
    className="continue-watching-list__skeleton-track"
    data-testid="continue-watching-skeleton-track"
  >
    {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
      <div
        className="continue-watching-list__skeleton-card"
        data-testid="continue-watching-skeleton-card"
        key={`continue-watching-skeleton-${index}`}
      >
        <div className="continue-watching-list__skeleton-poster" />
        <div className="continue-watching-list__skeleton-title" />
        <div className="continue-watching-list__skeleton-episode" />
        <div className="continue-watching-list__skeleton-progress" />
      </div>
    ))}
  </div>
);

const ContinueWatchingList = ({ showSkeleton = false, tvFocusable = false, row = 0, zone = 1 }) => {
  const [items, setItems] = useState(() => getRecentInProgressMoviesSnapshot(10));
  const [hasLoaded, setHasLoaded] = useState(false);
  const loadGenerationRef = useRef(0);

  useEffect(() => {
    let isMounted = true;
    const generation = loadGenerationRef.current + 1;

    loadGenerationRef.current = generation;

    getRecentInProgressMovies(10).then((nextItems) => {
      if (!isMounted || loadGenerationRef.current !== generation) {
        return;
      }

      setItems(nextItems);
      setHasLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!showSkeleton && hasLoaded && items.length === 0) {
    return null;
  }

  const contentItems = items.map(mapWatchItemToContentItem);

  if (!showSkeleton && contentItems.length > 0) {
    return (
      <ContentRow
        title="Tiếp tục xem"
        items={contentItems}
        rowId="continue-watching"
        row={row}
        tvFocusable={tvFocusable}
        zone={zone}
        getItemUrl={getContinueWatchingUrl}
        getItemBadge={(item) => item.progressBadge}
        getItemSubtitle={(item) => item.episodeSubtitle}
        getFallbackPoster={(item) => item.poster || FALLBACK_POSTER}
      />
    );
  }

  return (
    <section className="section mb-3 continue-watching-list" aria-label="Tiếp tục xem">
      {showSkeleton ? (
        <>
          <div className="section__header mb-2">
            <h2 className="continue-watching-list__heading">Tiếp tục xem</h2>
          </div>
          <SkeletonCards />
        </>
      ) : (
        <div className="section__header mb-2">
          <h2 className="continue-watching-list__heading">Tiếp tục xem</h2>
        </div>
      )}
    </section>
  );
};

export default ContinueWatchingList;
