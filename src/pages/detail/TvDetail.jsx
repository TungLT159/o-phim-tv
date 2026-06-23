import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import tmdbApi from '../../api/tmdbApi';
import { fetchTMDBImages } from '../../utils/tmdbImageFetcher';
import { useMovieDetail } from './useMovieDetail';
import { useEpisodeCatalog } from './useEpisodeCatalog';
import CustomVideoPlayer from '../../components/video-player/CustomVideoPlayer';
import ContentRow from '../../components/content-row/ContentRow';
import EpisodeListItem from '../../components/episode-list-item/EpisodeListItem';
import EpisodeGroupAccordion from '../../components/episode-group-accordion/EpisodeGroupAccordion';
import { useFocusable } from '../../context/FocusContext';
import { formatEpisodeDisplayName } from '../../utils/episodeDisplayName';
import { buildEpisodeDisplayGroups } from '../../utils/episodeChunkGroups';
import '../detail/detail.scss';
import './tv-detail.scss';

function PlayButton({ label, onClick }) {
  const { ref, focused } = useFocusable(1, 0, 0);
  return (
    <button ref={ref} className={`tv-detail__play-btn ${focused ? 'tv-detail__play-btn--focused' : ''}`} onClick={onClick}>
      <i className="bx bx-play" /> {label}
    </button>
  );
}

export default function TvDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [playing, setPlaying] = useState(false);
  const [backdrop, setBackdrop] = useState('');
  const [overview, setOverview] = useState('');
  const [similar, setSimilar] = useState([]);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);

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
  const displayEpisodeGroups = useMemo(
    () => buildEpisodeDisplayGroups(allEpisodeGroups, 50),
    [allEpisodeGroups],
  );

  useEffect(() => {
    if (!movie?.tmdb) return;
    fetchTMDBImages(movie.tmdb).then(({ backdropUrl, overview: desc }) => {
      if (backdropUrl) setBackdrop(backdropUrl);
      if (desc) setOverview(desc);
    });
  }, [movie]);

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

  const handleEpisodeClick = useCallback((ep) => {
    selectEpisode(ep);
    setPlaying(true);
    window.history.pushState({ playerOpen: true }, '');
  }, [selectEpisode]);
  
  const handleClose = useCallback(() => setPlaying(false), []);

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

  const renderTvDetailEpisode = (ep, row, col) => {
    const isCurrent = currentEp?.episodeKey === ep.episodeKey || currentEp?.slug === ep.slug || currentEp?.name === ep.name;
    return (
      <EpisodeListItem
        key={ep.episodeKey || ep.slug || ep.name}
        episode={ep}
        zone={1}
        row={row}
        col={col}
        isCurrent={isCurrent}
        onClick={() => handleEpisodeClick(ep)}
      />
    );
  };

  return (
    <div className="tv-detail">
      {playing && (
        <div className="tv-detail__player">
          <CustomVideoPlayer
            movieId={id}
            episode={currentEp}
            title={movie.name}
            episodes={episodeList}
            episodeGroups={displayEpisodeGroups}
            currentEpisode={currentEp}
            onSelectEpisode={selectEpisode}
            autoPlayEnabled={autoPlayEnabled}
            onToggleAutoPlay={() => setAutoPlayEnabled((value) => !value)}
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
            label={`Phát ${currentEp ? formatEpisodeDisplayName(currentEp.name) : ''}`}
            onClick={handlePlay}
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

        {(overview || movie.content) && (
          <p className="tv-detail__desc">{overview || movie.content?.replace(/<[^>]+>/g, '')}</p>
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
