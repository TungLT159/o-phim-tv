import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { fetchTMDBImages } from "../../utils/tmdbImageFetcher";
import {
  saveWatchProgress,
  getWatchProgress,
  shouldShowContinueWatching,
  flushWatchHistory,
} from "../../utils/watchHistoryManager";
import "./detail.scss";
import SimilarMovies from "../../components/similar-movies/SimilarMovies";
import { formatEpisodeDisplayName } from "../../utils/episodeDisplayName";
import { useMovieDetail } from "./useMovieDetail";
import { getEpisodeIdentity, useEpisodeCatalog } from "./useEpisodeCatalog";
import { useEpisodePlayback } from "./useEpisodePlayback";
import DetailLoading from "./DetailLoading";
import DetailSeo from "./DetailSeo";
import WatchSection from "./WatchSection";

const getEpisodeProgressKey = (episode) => getEpisodeIdentity(episode);
const AUTO_PLAY_STORAGE_KEY = "autoPlayEnabled:v1";
const LEGACY_AUTO_PLAY_STORAGE_KEY = "autoPlayEnabled";

const getEpisodeProgressKeysForRead = (episode) => {
  const progressKey = getEpisodeProgressKey(episode);
  if (!progressKey) return [];

  return episode?.name && episode.name !== progressKey
    ? [progressKey, episode.name]
    : [progressKey];
};

const runWhenIdle = (callback) => {
  if (typeof window !== "undefined" && window.requestIdleCallback) {
    const idleId = window.requestIdleCallback(callback, { timeout: 1500 });
    return () => window.cancelIdleCallback?.(idleId);
  }

  const timeoutId = setTimeout(callback, 1500);
  return () => clearTimeout(timeoutId);
};

const Detail = () => {
  const { category, id } = useParams();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  const { item, loadError } = useMovieDetail(category, id);
  const [poster_url, setPosterUrl] = useState("/poster-mau.png");
  const [backdrop_url, setBackdropUrl] = useState("");
  const [overview, setOverview] = useState("");
  const [autoPlayCountdown, setAutoPlayCountdown] = useState(null);
  const [showAutoPlayNotice, setShowAutoPlayNotice] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(() => {
    // Lấy từ localStorage, mặc định là true
    const saved =
      localStorage.getItem(AUTO_PLAY_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_AUTO_PLAY_STORAGE_KEY);
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Watch history states
  const [showContinueWatching, setShowContinueWatching] = useState(false);
  const [savedProgress, setSavedProgress] = useState(null);
  const [showSecondaryContent, setShowSecondaryContent] = useState(false);
  const saveProgressIntervalRef = useRef(null);

  const videoRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // ✅ Lấy episode từ URL param nếu có
  const query = new URLSearchParams(search);
  const epFromUrl = query.get("ep");
  const {
    episodeGroups,
    episodeList,
    currentEpisode: currentEp,
    currentEpisodeIndex,
    selectEpisode,
  } = useEpisodeCatalog(item, epFromUrl);

  const currentEpisodeDisplayName = currentEp
    ? formatEpisodeDisplayName(currentEp.name)
    : "";
  const nextEpisode =
    currentEpisodeIndex >= 0 ? episodeList[currentEpisodeIndex + 1] : null;
  const { playbackError } = useEpisodePlayback({
    movieId: id,
    episode: currentEp,
    nextEpisode,
    videoRef,
  });

  // ✅ Clear auto-play timers
  const clearAutoPlayTimers = useCallback(() => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setAutoPlayCountdown(null);
    setShowAutoPlayNotice(false);
  }, []);

  // ✅ Toggle auto-play setting
  const handleToggleAutoPlay = useCallback(() => {
    const newValue = !autoPlayEnabled;
    setAutoPlayEnabled(newValue);
    localStorage.setItem(AUTO_PLAY_STORAGE_KEY, JSON.stringify(newValue));

    // Nếu tắt auto-play, clear timers hiện tại
    if (!newValue) {
      clearAutoPlayTimers();
    }
  }, [autoPlayEnabled, clearAutoPlayTimers]);

  // ✅ Memoize genres list
  const genresList = useMemo(() => {
    if (!item?.category) return null;
    return item.category.slice(0, 5).map((genre) => (
      <span key={genre.slug ?? genre.name} className="genres__item">
        {genre.name}
      </span>
    ));
  }, [item?.category]);

  // ✅ Memoize movie tags
  const movieTags = useMemo(() => {
    if (!item) return null;
    return (
      <div className="movie-tags">
        {item.quality && (
          <span className="tag">Chất lượng: {item.quality}</span>
        )}
        {item.lang && <span className="tag">Ngôn ngữ: {item.lang}</span>}
        {item.time && <span className="tag">Thời lượng: {item.time}</span>}
        {item.episode_total != null && (
          <span className="tag">Số tập: {item.episode_total}</span>
        )}
        {item.episode_current && (
          <span className="tag">Tình trạng: {item.episode_current}</span>
        )}
        {item.year != null && <span className="tag">Năm: {item.year}</span>}
      </div>
    );
  }, [item]);

  // ✅ Memoize video source URL
  const videoSource = useMemo(() => {
    if (item?.episode_current === "Trailer") {
      return item.trailer_url?.replace("watch?v=", "embed/");
    }
    return null;
  }, [item]);

  useEffect(() => {
    let isCancelled = false;

    clearAutoPlayTimers();
    setShowContinueWatching(false);
    setSavedProgress(null);

    if (!currentEp) return undefined;

    const loadSavedProgress = async () => {
      const progressResults = await Promise.all(
        getEpisodeProgressKeysForRead(currentEp).map((episodeKey) =>
          getWatchProgress(id, episodeKey),
        ),
      );

      if (isCancelled) return;

      const progress = progressResults.find(Boolean);
      if (
        progress &&
        shouldShowContinueWatching(progress.currentTime, progress.duration)
      ) {
        setSavedProgress(progress);
        setShowContinueWatching(true);
      }
    };

    loadSavedProgress().catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [clearAutoPlayTimers, currentEp, id]);

  useEffect(() => {
    let isCancelled = false;

    const loadImages = async () => {
      if (!id || !item?.tmdb) return;
      const {
        posterUrl,
        backdropUrl,
        overview: tmdbOverview,
      } = await fetchTMDBImages(item.tmdb);

      if (isCancelled) return;

      setPosterUrl(posterUrl);
      setBackdropUrl(backdropUrl);
      setOverview(tmdbOverview);
    };

    const cancelIdle = runWhenIdle(loadImages);
    return () => {
      isCancelled = true;
      cancelIdle();
    };
  }, [id, item?.tmdb]);

  useEffect(() => {
    if (!item) return undefined;

    setShowSecondaryContent(false);
    return runWhenIdle(() => setShowSecondaryContent(true));
  }, [item]);

  // ✅ Khi chọn tập → cập nhật state và URL
  const handleSelectEpisode = useCallback(
    (ep) => {
      selectEpisode(ep);

      // cập nhật URL param
      const searchParams = new URLSearchParams(search);
      searchParams.set("ep", getEpisodeIdentity(ep));
      navigate(
        {
          pathname,
          search: searchParams.toString(),
        },
        { replace: true },
      );

      // Cuộn về video
      if (videoRef.current) {
        videoRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    },
    [search, pathname, navigate, selectEpisode],
  );

  // ✅ Navigate to previous episode
  const handlePrevEpisode = useCallback(() => {
    if (currentEpisodeIndex > 0) {
      const prevEp = episodeList[currentEpisodeIndex - 1];
      handleSelectEpisode(prevEp);
    }
  }, [currentEpisodeIndex, episodeList, handleSelectEpisode]);

  // ✅ Navigate to next episode
  const handleNextEpisode = useCallback(() => {
    if (
      currentEpisodeIndex !== -1 &&
      currentEpisodeIndex < episodeList.length - 1
    ) {
      const nextEp = episodeList[currentEpisodeIndex + 1];
      handleSelectEpisode(nextEp);
    }
  }, [currentEpisodeIndex, episodeList, handleSelectEpisode]);

  // ✅ Cancel auto-play
  const handleCancelAutoPlay = useCallback(() => {
    clearAutoPlayTimers();
  }, [clearAutoPlayTimers]);

  // ✅ Handle continue watching
  const handleContinueWatching = useCallback(() => {
    const video = videoRef.current;
    if (video && savedProgress) {
      video.currentTime = savedProgress.currentTime;
      setShowContinueWatching(false);
      setSavedProgress(null);
    }
  }, [savedProgress]);

  // ✅ Handle start from beginning
  const handleStartFromBeginning = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      setShowContinueWatching(false);
      setSavedProgress(null);
    }
  }, []);

  // ✅ Auto-play next episode when video is near end
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hasTriggeredAutoPlay = false;

    const persistCurrentProgress = ({ flush = false } = {}) => {
      const currentVideo = videoRef.current || video;
      if (
        currentVideo &&
        currentEp &&
        item &&
        currentVideo.currentTime > 0 &&
        currentVideo.duration > 0
      ) {
        const savePromise = saveWatchProgress(
          id,
          getEpisodeProgressKey(currentEp),
          currentVideo.currentTime,
          currentVideo.duration,
          {
            title: item.title || item.name,
            poster: poster_url,
            slug: item.slug,
          },
        );

        if (flush) {
          Promise.resolve(savePromise).finally(() => {
            flushWatchHistory();
          });
        }
      }
    };

    const handlePageHide = () => {
      persistCurrentProgress({ flush: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        persistCurrentProgress({ flush: true });
      }
    };

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      const duration = video.duration;

      // Lưu watch progress mỗi 5 giây
      if (currentTime > 0 && duration > 0) {
        if (!saveProgressIntervalRef.current) {
          saveProgressIntervalRef.current = setInterval(() => {
            persistCurrentProgress();
          }, 5000);
        }
      }

      // Kiểm tra nếu video còn 25 giây cuối và chưa trigger
      const remainingTime = duration - currentTime;
      const watchedRatio = duration > 0 ? currentTime / duration : 0;
      if (
        (remainingTime <= 10 || watchedRatio >= 0.95) &&
        !hasTriggeredAutoPlay &&
        autoPlayEnabled
      ) {
        if (
          currentEpisodeIndex !== -1 &&
          currentEpisodeIndex < episodeList.length - 1
        ) {
          hasTriggeredAutoPlay = true;

          // Hiện thông báo tự động phát
          setShowAutoPlayNotice(true);
          setAutoPlayCountdown(10);

          // Countdown interval
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = setInterval(() => {
            setAutoPlayCountdown((prev) => {
              if (prev <= 1) {
                clearAutoPlayTimers();
                handleNextEpisode();
                return null;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
    };

    const handleVideoEnded = () => {
      if (
        autoPlayEnabled &&
        currentEpisodeIndex !== -1 &&
        currentEpisodeIndex < episodeList.length - 1
      ) {
        // Tự động phát tập tiếp theo ngay lập tức khi video kết thúc
        handleNextEpisode();
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleVideoEnded);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      persistCurrentProgress({ flush: true });
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleVideoEnded);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearAutoPlayTimers();

      // Clear save progress interval
      if (saveProgressIntervalRef.current) {
        clearInterval(saveProgressIntervalRef.current);
        saveProgressIntervalRef.current = null;
      }
    };
  }, [
    currentEp,
    item,
    autoPlayEnabled,
    id,
    poster_url,
    episodeList,
    currentEpisodeIndex,
    clearAutoPlayTimers,
    handleNextEpisode,
  ]);

  const isLoadingDetail = !item && !loadError;

  return (
    <>
      {loadError && (
        <div className="container" style={{ padding: "120px 0 60px" }}>
          <h2>{loadError}</h2>
        </div>
      )}
      {isLoadingDetail && <DetailLoading />}
      {item && (
        <>
          <DetailSeo
            item={item}
            movieId={id}
            overview={overview}
            posterUrl={poster_url}
            hasCurrentEpisode={Boolean(currentEp)}
            currentEpisodeIdentity={
              currentEp ? getEpisodeIdentity(currentEp) : ""
            }
            currentEpisodeDisplayName={currentEpisodeDisplayName}
          />

          <div
            className="banner"
            style={{ backgroundImage: `url(${backdrop_url})` }}
          ></div>

          <div className="mb-3 movie-content container">
            <div className="movie-content__poster">
              <div
                className="movie-content__poster__img"
                style={{ backgroundImage: `url(${poster_url})` }}
              ></div>
            </div>
            <div className="movie-content__info">
              <h1 className="title">
                {item.title || item.name}{" "}
                {currentEp ? `- ${currentEpisodeDisplayName}` : ""}
              </h1>
              <div className="genres">{genresList}</div>
              {/* ✅ Thêm các tag thông tin */}
              {movieTags}

              {/* genres, tags, mô tả giữ nguyên */}
              <p className="overview">
                {overview ? overview : item.content?.replace(/<[^>]+>/g, "")}
              </p>
            </div>
          </div>

          <div className="container">
            <div className="section mb-3">
              <WatchSection
                item={item}
                videoRef={videoRef}
                videoSource={videoSource}
                playbackError={playbackError}
                episodeList={episodeList}
                episodeGroups={episodeGroups}
                currentEpisode={currentEp}
                currentEpisodeIndex={currentEpisodeIndex}
                currentEpisodeDisplayName={currentEpisodeDisplayName}
                autoPlayEnabled={autoPlayEnabled}
                showAutoPlayNotice={showAutoPlayNotice}
                autoPlayCountdown={autoPlayCountdown}
                showContinueWatching={showContinueWatching}
                savedProgress={savedProgress}
                onToggleAutoPlay={handleToggleAutoPlay}
                onPrevEpisode={handlePrevEpisode}
                onNextEpisode={handleNextEpisode}
                onCancelAutoPlay={handleCancelAutoPlay}
                onContinueWatching={handleContinueWatching}
                onStartFromBeginning={handleStartFromBeginning}
                onSelectEpisode={handleSelectEpisode}
              />
            </div>

            {showSecondaryContent && (
              <div className="section mb-3">
                <div className="section__header mb-2">
                  <h2>Tương tự</h2>
                </div>
                <SimilarMovies movie={item} />
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default Detail;
