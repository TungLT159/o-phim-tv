import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiConfig from '../../api/apiConfig';
import './tv-hero.scss';

const heroPoster = (item) => {
  if (item.thumb_url) return `https://img.ophim.live/uploads/movies/${item.thumb_url}`;
  if (item.poster_url) return item.poster_url;
  return '/poster-mau.png';
};

const TvHero = ({ items = [] }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  const activeItem = items[activeIdx] || null;

  const next = useCallback(() => {
    if (items.length > 1) {
      setActiveIdx((prev) => (prev + 1) % items.length);
    }
  }, [items.length]);

  const prev = useCallback(() => {
    if (items.length > 1) {
      setActiveIdx((prev) => (prev - 1 + items.length) % items.length);
    }
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1 || focused) return;
    const timer = setInterval(next, 8000);
    return () => clearInterval(timer);
  }, [items.length, focused, next]);

  // Keyboard navigation for remote
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      next();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      prev();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeItem) navigate(`/movie/${activeItem.slug}`);
    }
  }, [activeItem, navigate, next, prev]);

  if (!activeItem) return null;

  return (
    <section
      className={`tv-hero ${focused ? 'tv-hero--focused' : ''}`}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={handleKeyDown}
      tabIndex="0"
      aria-label="Phim nổi bật"
    >
      {/* Background poster */}
      <div
        className="tv-hero__bg"
        style={{ backgroundImage: `url(${heroPoster(activeItem)})` }}
      />

      {/* Gradient overlays */}
      <div className="tv-hero__gradient-left" />
      <div className="tv-hero__gradient-bottom" />

      {/* Content */}
      <div className="tv-hero__content">
        {activeItem.logo || activeItem.title ? (
          <div className="tv-hero__brand">
            {activeItem.logo ? (
              <img src={activeItem.logo} alt="" className="tv-hero__logo" />
            ) : (
              <h1 className="tv-hero__title">{activeItem.name || activeItem.title}</h1>
            )}
          </div>
        ) : null}

        <div className="tv-hero__meta">
          {activeItem.year && <span>{activeItem.year}</span>}
          {activeItem.episode_current && (
            <span>{activeItem.episode_current}</span>
          )}
          {activeItem.quality && <span className="tv-hero__quality">{activeItem.quality}</span>}
          {activeItem.lang && <span>{activeItem.lang}</span>}
        </div>

        {activeItem.description && (
          <p className="tv-hero__desc">{activeItem.description}</p>
        )}

        {activeItem.categories && (
          <div className="tv-hero__categories">
            {activeItem.categories.map((cat) => (
              <span key={cat} className="tv-hero__category-tag">{cat}</span>
            ))}
          </div>
        )}

        <div className="tv-hero__actions">
          <button
            type="button"
            className="tv-hero__play-btn"
            onClick={() => navigate(`/movie/${activeItem.slug}`)}
          >
            <i className="bx bx-play" /> Xem ngay
          </button>
        </div>
      </div>

      {/* Navigation dots */}
      {items.length > 1 && (
        <div className="tv-hero__dots">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`tv-hero__dot ${i === activeIdx ? 'tv-hero__dot--active' : ''}`}
              onClick={() => setActiveIdx(i)}
              aria-label={`Phim ${i + 1}`}
              tabIndex="-1"
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default TvHero;
