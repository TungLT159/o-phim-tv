import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import tmdbApi from '../api/tmdbApi';
import { useFocusable } from '../context/FocusContext';
import './tv-search.scss';

function SearchResult({ item, row, col }) {
  const { ref, focused } = useFocusable(1, row, col);
  return (
    <Link
      to={`/movie/${item.slug}`}
      ref={ref}
      className={`tv-search__card ${focused ? 'tv-search__card--focused' : ''}`}
    >
      <div className="tv-search__poster">
        <img
          src={item.thumb_url ? `https://img.ophim.live/uploads/movies/${item.thumb_url}` : '/poster-mau.png'}
          alt={item.name || ''}
          loading="lazy"
        />
        {item.quality && <span className="tv-search__badge">{item.quality}</span>}
        {item.year && <span className="tv-search__year-badge">{item.year}</span>}
      </div>
      <div className="tv-search__meta">
        <h3 className="tv-search__title">{item.name || item.title}</h3>
        {item.origin_name && item.origin_name !== item.name && (
          <span className="tv-search__origin">{item.origin_name}</span>
        )}
      </div>
    </Link>
  );
}

export default function TvSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 400);
  }, []);

  const handleSearch = useCallback(async (val) => {
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await tmdbApi.search('movie', { keyword: val, limit: 20 });
      setResults(res.data?.items || []);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown' && e.target === inputRef.current && results.length) {
      e.preventDefault();
      // Focus first result
      const card = document.querySelector('.tv-search__card');
      card?.focus();
    }
  }, [results]);

  return (
    <div className="tv-search">
      <div className="tv-search__bar">
        <i className="bx bx-search tv-search__bar-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tên phim..."
          className="tv-search__input"
          enterKeyHint="search"
        />
        {query && (
          <button type="button" className="tv-search__clear" onClick={() => handleSearch('')}>
            <i className="bx bx-x" />
          </button>
        )}
      </div>

      {loading && (
        <div className="tv-search__loading">
          <i className="bx bx-loader-alt bx-spin" />
          <span>Đang tìm...</span>
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <div className="tv-search__empty">
          <i className="bx bx-search-alt" />
          <span>Không tìm thấy phim</span>
        </div>
      )}

      {results.length > 0 && (
        <div className="tv-search__results">
          <h2 className="tv-search__count">{results.length} kết quả</h2>
          <div className="tv-search__grid">
            {results.slice(0, 15).map((item, idx) => (
              <SearchResult key={item.slug || idx} item={item} row={1 + Math.floor(idx / 3)} col={idx % 3} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
