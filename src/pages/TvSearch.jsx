import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import tmdbApi from '../api/tmdbApi';
import { useFocus, useFocusable } from '../context/FocusContext';
import { fetchTMDBImages } from '../utils/tmdbImageFetcher';
import './tv-search.scss';

const DEFAULT_COLS = 5;
const FALLBACK = '/poster-mau.png';

function FocusCard({ item, row, col, onFirstRowArrowUp }) {
  const { ref, focused } = useFocusable(1, row, col);
  const [poster, setPoster] = useState(FALLBACK);
  const [hasDomFocus, setHasDomFocus] = useState(false);

  const handleKeyDown = useCallback((event) => {
    if (event.key !== 'ArrowUp' || row !== 1) return;
    event.preventDefault();
    event.stopPropagation();
    onFirstRowArrowUp?.();
  }, [onFirstRowArrowUp, row]);

  useEffect(() => {
    if (!item?.tmdb) return;
    fetchTMDBImages(item.tmdb).then(({ posterUrl }) => {
      if (posterUrl) setPoster(posterUrl);
    });
  }, [item]);

  return (
    <Link
      to={`/movie/${item.slug}`}
      ref={ref}
      className={`tv-search-card ${focused && hasDomFocus ? 'tv-search-card--focused' : ''}`}
      onKeyDown={handleKeyDown}
      onFocus={() => setHasDomFocus(true)}
      onBlur={() => setHasDomFocus(false)}
    >
      <div className="tv-search-card__poster">
        <img src={poster} alt={item.name || ''} loading="lazy" />
        {item.quality && <span className="tv-search-card__quality">{item.quality}</span>}
        {item.episode_current && <span className="tv-search-card__ep">{item.episode_current}</span>}
      </div>
      <div className="tv-search-card__title">{item.name || item.title}</div>
      {item.year && <div className="tv-search-card__year">{item.year}</div>}
    </Link>
  );
}

export default function TvSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [gridCols, setGridCols] = useState(DEFAULT_COLS);
  const inputRef = useRef(null);
  const gridRef = useRef(null);
  const { skipToZone } = useFocus();

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 400);
  }, []);

  const handleSearch = useCallback(async (val) => {
    setQuery(val);
    if (!val.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const res = await tmdbApi.search('movie', { keyword: val, limit: 30 });
      setResults(res.data?.items || []);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  const focusFirstResult = useCallback(() => {
    const firstCard = gridRef.current?.querySelector?.('.tv-search-card');
    firstCard?.focus?.();
  }, []);

  const focusSearchInput = useCallback(() => {
    inputRef.current?.focus?.();
  }, []);

  const updateGridColumns = useCallback(() => {
    const cards = Array.from(gridRef.current?.querySelectorAll?.('.tv-search-card') || []);
    if (cards.length < 2) {
      setGridCols(DEFAULT_COLS);
      return;
    }

    const firstTop = cards[0].getBoundingClientRect().top;
    const columns = cards.filter((card) => (
      Math.abs(card.getBoundingClientRect().top - firstTop) < 2
    )).length;

    const nextGridCols = columns || DEFAULT_COLS;
    setGridCols((currentGridCols) => (
      currentGridCols === nextGridCols ? currentGridCols : nextGridCols
    ));
  }, []);

  useLayoutEffect(() => {
    updateGridColumns();

    window.addEventListener('resize', updateGridColumns);
    return () => {
      window.removeEventListener('resize', updateGridColumns);
    };
  }, [results, updateGridColumns]);

  const handleInputKeyDown = useCallback((event) => {
    event.stopPropagation();

    if (event.key !== 'ArrowDown' || results.length === 0) return;

    event.preventDefault();
    skipToZone(1, 1, 0);
    focusFirstResult();
  }, [focusFirstResult, results.length, skipToZone]);

  return (
    <div className="tv-search">
      <div className="tv-search__bar">
        <i className="bx bx-search tv-search__bar-icon" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Nhập tên phim..."
          className="tv-search__input"
        />
        {query && (
          <button type="button" className="tv-search__clear" onClick={() => handleSearch('')}>
            <i className="bx bx-x" />
          </button>
        )}
      </div>

      {loading && (
        <div className="tv-search__loading"><i className="bx bx-loader-alt bx-spin" /><span>Đang tìm...</span></div>
      )}

      {searched && !loading && results.length === 0 && (
        <div className="tv-search__empty"><i className="bx bx-search-alt" /><span>Không tìm thấy phim</span></div>
      )}

      {results.length > 0 && (
        <>
          <h2 className="tv-search__count">{results.length} kết quả</h2>
          <div className="tv-search-grid" ref={gridRef}>
            {results.map((item, idx) => {
              const row = 1 + Math.floor(idx / gridCols);
              const col = idx % gridCols;

              return (
                <FocusCard
                  key={item.slug || idx}
                  item={item}
                  row={row}
                  col={col}
                  onFirstRowArrowUp={focusSearchInput}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
