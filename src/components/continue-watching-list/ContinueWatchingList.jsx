import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Autoplay, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import { formatEpisodeDisplayName } from "../../utils/episodeDisplayName";
import {
  getRecentInProgressMovies,
  getRecentInProgressMoviesSnapshot,
  removeWatchProgress,
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

const getWatchItemKey = (item) => `${item.movieId}-${item.episodeName}`;

const getWatchProgressKey = (item) => item.key || `${item.movieId}_${item.episodeName}`;

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

const ContinueWatchingList = ({ showSkeleton = false }) => {
  const [items, setItems] = useState(() => getRecentInProgressMoviesSnapshot(10));
  const [hasLoaded, setHasLoaded] = useState(false);
  const [menuState, setMenuState] = useState(null);
  const longPressTimerRef = useRef(null);
  const loadGenerationRef = useRef(0);
  const removedKeysRef = useRef(new Set());
  const suppressNextClickRef = useRef(false);
  const menuOpenRef = useRef(false);
  const swiperRef = useRef(null);

  const filterRemovedItems = (nextItems) =>
    nextItems.filter((item) => !removedKeysRef.current.has(getWatchProgressKey(item)));

  const stopAutoplay = () => {
    swiperRef.current?.autoplay?.stop?.();
  };

  const startAutoplay = () => {
    swiperRef.current?.autoplay?.start?.();
  };

  useEffect(() => {
    let isMounted = true;
    const generation = loadGenerationRef.current + 1;

    loadGenerationRef.current = generation;

    getRecentInProgressMovies(10).then((nextItems) => {
      if (!isMounted || loadGenerationRef.current !== generation) {
        return;
      }

      setItems(filterRemovedItems(nextItems));
      setHasLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const closeMenu = () => {
      if (menuOpenRef.current) {
        startAutoplay();
      }

      suppressNextClickRef.current = false;
      menuOpenRef.current = false;
      setMenuState(null);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("click", closeMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("click", closeMenu);
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const openMenu = (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    stopAutoplay();
    menuOpenRef.current = true;
    setMenuState({ item, x: event.clientX, y: event.clientY });
  };

  const handleTouchStart = (event, item) => {
    const touch = event.touches[0];

    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      suppressNextClickRef.current = true;
      stopAutoplay();
      menuOpenRef.current = true;
      setMenuState({ item, x: touch.clientX, y: touch.clientY });
    }, 500);
  };

  const handleCardClick = (event) => {
    if (!suppressNextClickRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressNextClickRef.current = false;
  };

  const cancelLongPress = () => {
    clearTimeout(longPressTimerRef.current);
  };

  const handleRemove = async () => {
    if (!menuState?.item) {
      return;
    }

    const removedItem = menuState.item;
    const removedKey = getWatchProgressKey(removedItem);
    const generation = loadGenerationRef.current + 1;

    removedKeysRef.current.add(removedKey);
    loadGenerationRef.current = generation;
    setItems((currentItems) => currentItems.filter((item) => getWatchProgressKey(item) !== removedKey));
    suppressNextClickRef.current = false;
    menuOpenRef.current = false;
    setMenuState(null);
    startAutoplay();

    await removeWatchProgress(removedItem.movieId, removedItem.episodeName);
    const nextItems = await getRecentInProgressMovies(10);

    if (loadGenerationRef.current === generation) {
      setItems(filterRemovedItems(nextItems));
      setHasLoaded(true);
    }
  };

  if (!showSkeleton && hasLoaded && items.length === 0) {
    return null;
  }

  return (
    <section
      className="section mb-3 continue-watching-list"
      aria-labelledby="continue-watching-heading"
    >
      <div className="section__header mb-2">
        <h2
          id="continue-watching-heading"
          className="continue-watching-list__heading"
        >
          Tiếp tục xem
        </h2>
      </div>

      <div className="continue-watching-list__carousel-wrapper">
        {showSkeleton ? (
          <SkeletonCards />
        ) : (
          <Swiper
          modules={[Navigation, Autoplay]}
          className="continue-watching-list__carousel"
          data-testid="continue-watching-carousel"
          grabCursor={true}
          spaceBetween={12}
          slidesPerView="auto"
          autoplay={{ delay: 4000 }}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          navigation={{
            nextEl: ".continue-watching-list__button-next",
            prevEl: ".continue-watching-list__button-prev",
          }}
          >
            {items.map((item) => {
            const movieInfo = item.movieInfo || {};
            const slug = movieInfo.slug || item.movieId;
            const title = movieInfo.title || item.movieId;
            const poster = movieInfo.poster || FALLBACK_POSTER;
            const percentage = Math.round(getItemPercentage(item));
            const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
            const resumeUrl = `/movie/${slug}?ep=${encodeURIComponent(item.episodeName || "")}`;
            const episodeDisplayText = getEpisodeDisplayText(item.episodeName);

              return (
                <SwiperSlide key={`${item.movieId}-${item.episodeName}`}>
                  <Link
                  className={`continue-watching-list__card${
                    menuState?.item &&
                    getWatchItemKey(menuState.item) === getWatchItemKey(item)
                      ? " continue-watching-list__card--menu-open"
                      : ""
                  }`}
                  to={resumeUrl}
                  onClick={handleCardClick}
                  onContextMenu={(event) => openMenu(event, item)}
                  onTouchStart={(event) => handleTouchStart(event, item)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                  onTouchCancel={cancelLongPress}
                  >
                    <div className="continue-watching-list__poster">
                      <img src={poster} alt="" loading="lazy" />
                      <div className="continue-watching-list__progress-bar">
                        <span style={{ width: `${clampedPercentage}%` }} />
                      </div>
                    </div>
                    <div className="continue-watching-list__meta">
                      <h3 className="continue-watching-list__title">{title}</h3>
                      {episodeDisplayText ? (
                        <p className="continue-watching-list__episode-text">
                          Tập đang xem: {episodeDisplayText}
                        </p>
                      ) : null}
                      <p className="continue-watching-list__progress-text">
                        Đã xem {percentage}%
                      </p>
                    </div>
                  </Link>
                </SwiperSlide>
              );
            })}
          </Swiper>
        )}
        <div className="continue-watching-list__button-prev swiper-button-prev">
          <i className="bx bx-chevron-left"></i>
        </div>
        <div className="continue-watching-list__button-next swiper-button-next">
          <i className="bx bx-chevron-right"></i>
        </div>
      </div>
      {menuState && !showSkeleton ? (
        <div
          className="continue-watching-list__context-menu"
          style={{ left: menuState.x, top: menuState.y }}
          role="menu"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <button type="button" role="menuitem" onClick={handleRemove}>
            <i className="bx bx-trash" aria-hidden="true"></i>
            Xóa khỏi danh sách
          </button>
        </div>
      ) : null}
    </section>
  );
};

export default ContinueWatchingList;
