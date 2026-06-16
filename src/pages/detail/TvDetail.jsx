import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import tmdbApi from '../../api/tmdbApi';
import { fetchTMDBImages } from '../../utils/tmdbImageFetcher';
import { useMovieDetail } from './useMovieDetail';
import { useEpisodeCatalog } from './useEpisodeCatalog';
import { useEpisodePlayback } from './useEpisodePlayback';
import CustomVideoPlayer from '../../components/video-player/CustomVideoPlayer';
import ContentRow from '../../components/content-row/ContentRow';
import { useFocusable, useFocus } from '../../context/FocusContext';
import { formatEpisodeDisplayName } from '../../utils/episodeDisplayName';
import '../detail/detail.scss';
import './tv-detail.scss';

function GroupDropdown({ groups, selected, onChange }) {
  if (groups.length <= 1) return null;
  return (
    <div className="tv-detail__season-select">
      <label className="tv-detail__season-label">Phần:</label>
      <select
        value={selected}
        onChange={e => onChange(Number(e.target.value))}
        className="tv-detail__season-dropdown"
      >
        {groups.map((g, i) => (
          <option key={i} value={i}>{g.title}</option>
        ))}
      </select>
    </div>
  );
}

function PlayButton({ label, onClick }) {
  const { ref, focused } = useFocusable(1, 1, 0);
  return (
    <button ref={ref} className={`tv-detail__play-btn ${focused ? 'tv-detail__play-btn--focused' : ''}`} onClick={onClick}>
      <i className="bx bx-play" /> {label}
    </button>
  );
}

function EpisodeButton({ ep, label, row, col, onClick, selected }) {
  const { ref, focused } = useFocusable(1, row, col);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={`tv-detail__ep-btn ${selected ? 'tv-detail__ep-btn--active' : ''} ${focused ? 'tv-detail__ep-btn--focused' : ''}`}
    >
      {label || ep.name}
    </button>
  );
}

export default function TvDetail() {
  const { id } = useParams();
  const location = useLocation();
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [backdrop, setBackdrop] = useState('');
  const [overview, setOverview] = useState('');
  const [similar, setSimilar] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(0);

  const query = new URLSearchParams(location.search);
  const epParam = query.get('ep') || '';

  const { item, loadError } = useMovieDetail('movie', id);
  const movie = item;

  const {
    allEpisodeGroups,
    episodeList,
    currentEpisode,
    currentEpisodeIndex,
    selectEpisode,
  } = useEpisodeCatalog({ item: movie, initialEpisodeParam: epParam });

  const currentEp = currentEpisode;
  const nextEp = episodeList[currentEpisodeIndex + 1];
  const { playbackError } = useEpisodePlayback({ movieId: id, episode: currentEp, nextEpisode: nextEp, videoRef });

  // Set initial group based on current episode
  useEffect(() => {
    if (currentEp && allEpisodeGroups.length > 1) {
      const gIdx = currentEp.episodeGroupIndex;
      if (gIdx !== undefined && gIdx !== selectedGroup) {
        setSelectedGroup(gIdx);
      }
    }
  }, [currentEp]);

  useEffect(() => {
    if (!movie?.tmdb) return;
    fetchTMDBImages(movie.tmdb).then(({ backdropUrl, overview: desc }) => {
      if (backdropUrl) setBackdrop(backdropUrl);
      if (desc) setOverview(desc);
    });
  }, [movie]);

  useEffect(() => {
    if (!movie?.tmdb?.id) return;
    const type = movie.tmdb.type || 'movie';
    tmdbApi.similar(type, movie.tmdb.id).then(res => {
      setSimilar(res.data?.items || res.data?.results || []);
    }).catch(() => {});
  }, [movie]);

  const handlePlay = useCallback(() => setPlaying(true), []);
  const handleClose = useCallback(() => setPlaying(false), []);

  // Auto-focus Play button on load
  useEffect(() => {
    const timer = setTimeout(() => {
      const btn = document.querySelector('.tv-detail__play-btn');
      if (btn) btn.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, [id]);

  if (loadError) {
    return <div className="tv-detail tv-detail--error"><i className="bx bx-error-circle" /><p>{loadError}</p></div>;
  }
  if (!movie) {
    return <div className="tv-detail tv-detail--loading"><i className="bx bx-loader-alt bx-spin" /><p>Đang tải...</p></div>;
  }

  const currentGroup = allEpisodeGroups[selectedGroup];
  const groupEpisodes = currentGroup?.episodes || [];
  const isSeries = episodeList.length > 1;

  return (
    <div className="tv-detail">
      {playing && (
        <div className="tv-detail__player">
          <button className="tv-detail__player-close" onClick={handleClose} autoFocus>
            <i className="bx bx-arrow-back" /> Quay lại
          </button>
          <CustomVideoPlayer
            ref={videoRef}
            src={currentEp?.link_m3u8 || currentEp?.link_embed}
            movieId={id}
            episodeName={currentEp?.name}
            episodeSlug={currentEp?.slug}
            episodeList={episodeList}
            episodeGroups={allEpisodeGroups}
            movieTitle={movie.name}
            movieSlug={movie.slug}
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

        {isSeries && allEpisodeGroups.length > 0 && (
          <div className="tv-detail__episodes">
            <h3 className="tv-detail__section-title">Tập phim</h3>

            <GroupDropdown
              groups={allEpisodeGroups}
              selected={selectedGroup}
              onChange={setSelectedGroup}
            />

            <div className="tv-detail__ep-list">
              {groupEpisodes.map((ep, idx) => (
                <EpisodeButton
                  key={ep.episodeKey || ep.slug || ep.name}
                  ep={ep}
                  label={formatEpisodeDisplayName(ep.name)}
                  row={110 + Math.floor(idx / 6)}
                  col={idx % 6}
                  selected={currentEp?.episodeKey === ep.episodeKey || currentEp?.slug === ep.slug || currentEp?.name === ep.name}
                  onClick={() => selectEpisode(ep)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {similar.length > 0 && (
        <ContentRow title="Phim tương tự" items={similar.map(s => ({ ...s, name: s.title || s.name }))} rowId="similar" row={200} />
      )}
    </div>
  );
}
