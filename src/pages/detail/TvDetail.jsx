import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import tmdbApi from '../../api/tmdbApi';
import apiConfig from '../../api/apiConfig';
import { fetchTMDBImages } from '../../utils/tmdbImageFetcher';
import { useMovieDetail } from './useMovieDetail';
import { useEpisodeCatalog } from './useEpisodeCatalog';
import CustomVideoPlayer from '../../components/video-player/CustomVideoPlayer';
import ContentRow from '../../components/content-row/ContentRow';
import EpisodeListItem from '../../components/episode-list-item/EpisodeListItem';
import EpisodeGroupAccordion from '../../components/episode-group-accordion/EpisodeGroupAccordion';
import { FOCUS_KEYS, useFocus, useFocusable } from '../../context/FocusContext';
import { formatEpisodeDisplayName } from '../../utils/episodeDisplayName';
import { buildEpisodeDisplayGroups } from '../../utils/episodeChunkGroups';
import {
  flushWatchHistory,
  getWatchProgress,
  saveWatchProgress,
  shouldShowContinueWatching,
} from '../../utils/watchHistoryManager';
import './tv-detail.scss';

const AUTOPLAY_PREFERENCE_KEY = 'ophim:auto-play-enabled';

const getEpisodeProgressKey = (episode) => episode?.episodeKey || episode?.name || '';

const readAutoPlayPreference = () => {
  try {
    return window.localStorage?.getItem(AUTOPLAY_PREFERENCE_KEY) !== 'false';
  } catch (error) {
    return true;
  }
};

const writeAutoPlayPreference = (enabled) => {
  try {
    window.localStorage?.setItem(AUTOPLAY_PREFERENCE_KEY, String(enabled));
  } catch (error) {
    // Keep the current session state even when persistent storage is unavailable.
  }
};

function PlayButton({ label, onClick, onFocus, shouldFocusSelf = false }) {
  const hasFocusedSelfRef = useRef(false);
  const upwardFocusIntentRef = useRef(false);
  const { ref, focused, focusSelf } = useFocusable({
    focusKey: FOCUS_KEYS.DETAIL_PLAY,
    onEnterPress: onClick,
    onArrowPress: (direction) => {
      if (direction !== 'up') return true;
      upwardFocusIntentRef.current = true;
      return false;
    },
  });

  const handleFocus = useCallback(() => {
    const shouldAlignButton = upwardFocusIntentRef.current;
    upwardFocusIntentRef.current = false;
    onFocus?.({ alignButton: shouldAlignButton, target: ref.current });
  }, [onFocus, ref]);

  useEffect(() => {
    if (!shouldFocusSelf || hasFocusedSelfRef.current) return;
    hasFocusedSelfRef.current = true;
    focusSelf?.();
  }, [focusSelf, shouldFocusSelf]);

  useEffect(() => {
    if (!focused) return;
    handleFocus();
  }, [focused, handleFocus]);

  return (
    <button
      ref={ref}
      type="button"
      className={`tv-detail__play-btn ${focused ? 'tv-detail__play-btn--focused' : ''}`}
      onClick={onClick}
      onFocus={handleFocus}
    >
      <i className="bx bx-play" /> {label}
    </button>
  );
}

export default function TvDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [playing, setPlaying] = useState(false);
  const [similar, setSimilar] = useState([]);
  const [tmdbBackdrop, setTmdbBackdrop] = useState('');
  const [tmdbOverview, setTmdbOverview] = useState('');
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(readAutoPlayPreference);
  const [savedProgress, setSavedProgress] = useState(null);
  const { focusByKey, getLastNavigationDirection } = useFocus();
  const videoRef = useRef(null);

  const query = new URLSearchParams(location.search);
  const epParam = query.get('ep') || '';

  const { item, loadError } = useMovieDetail('movie', id);
  const movie = item;

  const {
    allEpisodeGroups,
    episodeList,
    currentEpisode,
    selectEpisode,
  } = useEpisodeCatalog(movie, epParam);

  const currentEp = currentEpisode;
  const currentEpisodeIndex = useMemo(() => {
    if (!currentEp || !episodeList.length) return -1;

    return episodeList.findIndex((episode) => {
      const episodeIdentity = episode.episodeKey || episode.slug || episode.name;
      const currentIdentity = currentEp.episodeKey || currentEp.slug || currentEp.name;
      return episodeIdentity === currentIdentity;
    });
  }, [currentEp, episodeList]);
  const canGoPrevEpisode = currentEpisodeIndex > 0;
  const canGoNextEpisode = currentEpisodeIndex !== -1 && currentEpisodeIndex < episodeList.length - 1;
  const displayEpisodeGroups = useMemo(
    () => buildEpisodeDisplayGroups(allEpisodeGroups, 50),
    [allEpisodeGroups],
  );

  const fallbackBackdrop = useMemo(() => {
    const imagePath = movie?.thumb_url || movie?.poster_url;
    return imagePath ? apiConfig.originalImage(imagePath) : '';
  }, [movie]);

  useEffect(() => {
    let isCancelled = false;

    setTmdbBackdrop('');
    setTmdbOverview('');

    if (!movie?.tmdb) return undefined;

    fetchTMDBImages(movie.tmdb)
      .then(({ backdropUrl, overview }) => {
        if (isCancelled) return;
        setTmdbBackdrop(backdropUrl || '');
        setTmdbOverview(overview || '');
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [movie]);

  const backdrop = tmdbBackdrop || fallbackBackdrop;
  const description = tmdbOverview || movie?.content?.replace(/<[^>]+>/g, '');

  useEffect(() => {
    if (!movie?.slug) return;
    tmdbApi.similar('movie', movie.slug).then(res => {
      setSimilar(res.data?.items || res.data?.results || []);
    }).catch(() => {});
  }, [movie]);

  const handlePlay = useCallback(() => {
    setPlaying(true);
    window.history.pushState({ playerOpen: true }, '');
  }, []);

  useEffect(() => {
    let isCancelled = false;

    setSavedProgress(null);

    if (!currentEp) return undefined;

    getWatchProgress(id, getEpisodeProgressKey(currentEp))
      .then((progress) => {
        if (isCancelled) return;

        if (progress && shouldShowContinueWatching(progress.currentTime, progress.duration)) {
          setSavedProgress(progress);
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [currentEp, id]);

  useEffect(() => {
    if (!playing || !savedProgress) return;

    const video = videoRef.current;
    if (video) {
      video.currentTime = savedProgress.currentTime;
    }
  }, [playing, savedProgress]);

  useEffect(() => {
    if (!playing || !currentEp || !movie) return undefined;

    const video = videoRef.current;
    if (!video) return undefined;

    const persistCurrentProgress = ({ flush = false } = {}) => {
      const currentVideo = videoRef.current || video;

      if (
        !currentVideo ||
        currentVideo.currentTime <= 0 ||
        currentVideo.duration <= 0
      ) {
        return;
      }

      const savePromise = saveWatchProgress(
        id,
        getEpisodeProgressKey(currentEp),
        currentVideo.currentTime,
        currentVideo.duration,
        {
          title: movie.name || movie.origin_name,
          poster: movie.poster_url || movie.poster || movie.thumb_url || '',
          slug: movie.slug || id,
          tmdb: movie.tmdb,
        },
      );

      if (flush) {
        Promise.resolve(savePromise).finally(() => {
          flushWatchHistory();
        });
      }
    };

    const handleTimeUpdate = () => persistCurrentProgress();
    const handlePageHide = () => persistCurrentProgress({ flush: true });
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistCurrentProgress({ flush: true });
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      persistCurrentProgress({ flush: true });
      video.removeEventListener('timeupdate', handleTimeUpdate);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentEp, id, movie, playing]);

  const handlePlayButtonFocus = useCallback(({ alignButton = false, target } = {}) => {
    const shouldAlignButton = alignButton || getLastNavigationDirection?.() === 'up';

    window.requestAnimationFrame?.(() => {
      if (shouldAlignButton) {
        target?.scrollIntoView?.({ behavior: 'smooth', block: 'start', inline: 'nearest' });
        return;
      }

      window.scrollTo?.({ top: 0, behavior: 'smooth' });
    });
  }, [getLastNavigationDirection]);

  const handleEpisodeClick = useCallback((ep) => {
    selectEpisode(ep);
    setPlaying(true);
    window.history.pushState({ playerOpen: true }, '');
  }, [selectEpisode]);

  const handlePrevEpisode = useCallback(() => {
    if (!canGoPrevEpisode) return;
    selectEpisode(episodeList[currentEpisodeIndex - 1]);
  }, [canGoPrevEpisode, currentEpisodeIndex, episodeList, selectEpisode]);

  const handleNextEpisode = useCallback(() => {
    if (!canGoNextEpisode) return;
    selectEpisode(episodeList[currentEpisodeIndex + 1]);
  }, [canGoNextEpisode, currentEpisodeIndex, episodeList, selectEpisode]);

  const handleToggleAutoPlay = useCallback(() => {
    setAutoPlayEnabled((value) => {
      const nextValue = !value;
      writeAutoPlayPreference(nextValue);
      return nextValue;
    });
  }, []);
  
  const handleClose = useCallback(() => {
    setPlaying(false);
    focusByKey(FOCUS_KEYS.DETAIL_PLAY);
  }, [focusByKey]);

  useEffect(() => {
    if (!playing) return;

    const handlePopState = (event) => {
      if (playing) {
        setPlaying(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [playing]);

  if (loadError) {
    return <div className="tv-detail tv-detail--error"><i className="bx bx-error-circle" /><p>{loadError}</p></div>;
  }
  if (!movie) {
    return <div className="tv-detail tv-detail--loading"><i className="bx bx-loader-alt bx-spin" /><p>Đang tải...</p></div>;
  }

  const isSeries = episodeList.length > 0;

  const renderTvDetailEpisode = (ep, row, col, focusMeta) => {
    const isCurrent = currentEp?.episodeKey === ep.episodeKey || currentEp?.slug === ep.slug || currentEp?.name === ep.name;
    return (
      <EpisodeListItem
        key={ep.episodeKey || ep.slug || ep.name}
        episode={ep}
        zone={1}
        row={row}
        col={col}
        focusKey={focusMeta?.focusKey}
        onArrowPress={focusMeta?.onArrowPress}
        isCurrent={isCurrent}
        onClick={() => handleEpisodeClick(ep)}
      />
    );
  };

  return (
    <div className="tv-detail" data-focus-scroll-root="true">
      {playing && (
        <div className="tv-detail__player">
          <CustomVideoPlayer
            videoRef={videoRef}
            movieId={id}
            episode={currentEp}
            title={movie.name}
            episodes={episodeList}
            episodeGroups={displayEpisodeGroups}
            currentEpisode={currentEp}
            onSelectEpisode={selectEpisode}
            canGoPrevEpisode={canGoPrevEpisode}
            onPrevEpisode={handlePrevEpisode}
            canGoNextEpisode={canGoNextEpisode}
            nextEpisodeName={canGoNextEpisode ? episodeList[currentEpisodeIndex + 1]?.name : undefined}
            onNextEpisode={handleNextEpisode}
            autoPlayEnabled={autoPlayEnabled}
            onToggleAutoPlay={handleToggleAutoPlay}
            onClose={handleClose}
          />
        </div>
      )}

      <div className="tv-detail__hero" style={{ backgroundImage: backdrop ? `url(${backdrop})` : 'none' }}>
        <div className="tv-detail__hero-gradient" />
      </div>

      <div className="tv-detail__info">
        <h1 className="tv-detail__title">{movie.name || movie.origin_name}</h1>
        {movie.origin_name && movie.origin_name !== movie.name && (
          <h2 className="tv-detail__subtitle">{movie.origin_name}</h2>
        )}

        <div className="tv-detail__meta">
          {movie.year && <span>{movie.year}</span>}
          {movie.quality && <span className="tv-detail__quality">{movie.quality}</span>}
          {movie.lang && <span>{movie.lang}</span>}
          {movie.time && <span>{movie.time}</span>}
          {isSeries && <span>{episodeList.length} tập</span>}
        </div>

        <div className="tv-detail__actions">
          <PlayButton
            label={`${savedProgress ? 'Xem tiếp' : 'Phát'} ${currentEp ? formatEpisodeDisplayName(currentEp.name) : ''}`}
            onClick={handlePlay}
            onFocus={handlePlayButtonFocus}
            shouldFocusSelf={Boolean(currentEp || episodeList.length)}
          />
        </div>

        <div className="tv-detail__categories">
          {movie.category?.map(c => c.name).filter(Boolean).map(cat => (
            <span key={cat} className="tv-detail__tag">{cat}</span>
          ))}
          {movie.country?.map(c => c.name).filter(Boolean).map(c => (
            <span key={c} className="tv-detail__tag">{c}</span>
          ))}
        </div>

        {description && (
          <p className="tv-detail__desc">{description}</p>
        )}
      </div>

      {isSeries && displayEpisodeGroups.length > 0 && (
        <div className="tv-detail__episodes">
          <h3 className="tv-detail__section-title">Tập phim</h3>

          <EpisodeGroupAccordion
            groups={displayEpisodeGroups}
            currentEpisode={currentEp}
            zone={1}
            baseRow={10}
            columns={4}
            renderEpisode={renderTvDetailEpisode}
          />
        </div>
      )}

      {similar.length > 0 && (
        <ContentRow title="Phim tương tự" items={similar.map(s => ({ ...s, name: s.title || s.name }))} rowId="similar" row={200} />
      )}
    </div>
  );
}
