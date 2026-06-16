import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './content-row.scss';
import { useFocusable } from '../../context/FocusContext';
import { fetchTMDBImages } from '../../utils/tmdbImageFetcher';

const FALLBACK = '/poster-mau.png';

function FocusCard({ item, row, col }) {
  const { ref, focused } = useFocusable(1, row, col);
  const [poster, setPoster] = useState(FALLBACK);

  useEffect(() => {
    if (!item?.tmdb) return;
    fetchTMDBImages(item.tmdb).then(({ posterUrl }) => {
      if (posterUrl) setPoster(posterUrl);
    });
  }, [item]);

  return (
    <Link
      to={`/movie/${item.slug}`}
      className={`content-row__card ${focused ? 'content-row__card--focused' : ''}`}
      ref={ref}
    >
      <div className="content-row__poster">
        <img src={poster} alt={item.name || item.title || ''} loading="lazy" />
        {(item.episode_current || item.quality) && (
          <span className="content-row__badge">{item.episode_current || item.quality}</span>
        )}
      </div>
      <div className="content-row__info">
        <span className="content-row__name">{item.name || item.title}</span>
        {item.year && <span className="content-row__year">{item.year}</span>}
      </div>
      <div className="content-row__focus-ring" aria-hidden="true" />
    </Link>
  );
}

const ContentRow = ({ title, items = [], rowId, row }) => {
  if (!items.length) return null;

  return (
    <section className="content-row" aria-label={title}>
      <div className="content-row__header">
        <h2 className="content-row__title">{title}</h2>
      </div>
      <div className="content-row__track">
        {items.slice(0, 12).map((item, idx) => (
          <FocusCard key={item.slug || idx} item={item} row={row} col={idx} />
        ))}
      </div>
    </section>
  );
};

export default ContentRow;
