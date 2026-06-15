import React, { useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiConfig from '../../api/apiConfig';
import './content-row.scss';

const posterUrl = (item) => {
  if (item.thumb_url) return `https://img.ophim.live/uploads/movies/${item.thumb_url}`;
  if (item.poster_url) return item.poster_url;
  return '/poster-mau.png';
};

const ContentRow = ({ title, items = [], rowId }) => {
  const rowRef = useRef(null);

  const scroll = useCallback((direction) => {
    const el = rowRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  if (!items.length) return null;

  return (
    <section className="content-row" aria-label={title}>
      <div className="content-row__header">
        <h2 className="content-row__title">{title}</h2>
        <div className="content-row__arrows" aria-hidden="true">
          <button
            type="button"
            className="content-row__arrow"
            tabIndex="-1"
            onClick={() => scroll('left')}
            aria-label="Cuộn trái"
          >
            <i className="bx bx-chevron-left" />
          </button>
          <button
            type="button"
            className="content-row__arrow"
            tabIndex="-1"
            onClick={() => scroll('right')}
            aria-label="Cuộn phải"
          >
            <i className="bx bx-chevron-right" />
          </button>
        </div>
      </div>

      <div className="content-row__track" ref={rowRef}>
        {items.map((item, idx) => (
          <Link
            key={item.slug || idx}
            to={`/movie/${item.slug}`}
            className="content-row__card"
            tabIndex="0"
            data-row={rowId}
            data-index={idx}
          >
            <div className="content-row__poster">
              <img
                src={posterUrl(item)}
                alt={item.name || item.title || ''}
                loading="lazy"
              />
              {(item.episode_current || item.quality) && (
                <span className="content-row__badge">
                  {item.episode_current || item.quality}
                </span>
              )}
            </div>
            <div className="content-row__info">
              <span className="content-row__name">
                {item.name || item.title}
              </span>
              {item.year && (
                <span className="content-row__year">{item.year}</span>
              )}
            </div>
            <div className="content-row__focus-ring" aria-hidden="true" />
          </Link>
        ))}
      </div>

      <div className="content-row__edge-left" aria-hidden="true" />
      <div className="content-row__edge-right" aria-hidden="true" />
    </section>
  );
};

export default ContentRow;
