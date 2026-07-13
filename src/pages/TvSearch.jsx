import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import tmdbApi from '../api/tmdbApi';
import { useFocus, useFocusable } from '../context/FocusContext';
import { fetchTMDBImages } from '../utils/tmdbImageFetcher';
import {
  clearTvSearchSession,
  getTvSearchSession,
  saveTvSearchSession,
} from '../utils/tvSearchSessionCache';
import './tv-search.scss';

const DEFAULT_COLS = 5;
const FALLBACK = '/poster-mau.png';

function FocusCard({ item, row, col, onFirstRowArrowUp, onRememberResult }) {
  const { ref, focused } = useFocusable(1, row, col);
  const [poster, setPoster] = useState(FALLBACK);
  const [hasDomFocus, setHasDomFocus] = useState(false);

  const rememberResult = useCallback(() => {
    onRememberResult?.(item?.slug || '');
  }, [item?.slug, onRememberResult]);

  const handleKeyDown = useCallback((event) => {
    if (event.key !== 'ArrowUp' || row !== 1) return;
    event.preventDefault();
    event.stopPropagation();
    onFirstRowArrowUp?.();
  }, [onFirstRowArrowUp, row]);

  useEffect(() => {
    let active = true;

    setPoster(FALLBACK);
    if (!item?.tmdb) {
      return () => {
        active = false;
      };
    }

    fetchTMDBImages(item.tmdb).then(({ posterUrl }) => {
      if (active && posterUrl) setPoster(posterUrl);
    });

    return () => {
      active = false;
    };
  }, [item?.tmdb]);

  return (
    <Link
      to={`/movie/${item.slug}`}
      ref={ref}
      className={`tv-search-card ${focused && hasDomFocus ? 'tv-search-card--focused' : ''}`}
      data-search-result-slug={item.slug || ''}
      onClick={rememberResult}
      onKeyDown={handleKeyDown}
      onFocus={() => {
        setHasDomFocus(true);
        rememberResult();
      }}
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
  const initialSessionRef = useRef(null);
  if (initialSessionRef.current === null) {
    initialSessionRef.current = getTvSearchSession();
  }
  const initialSession = initialSessionRef.current;
  const [query, setQuery] = useState(initialSession.query);
  const [results, setResults] = useState(initialSession.results);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(initialSession.searched);
  const [gridCols, setGridCols] = useState(DEFAULT_COLS);
  const inputRef = useRef(null);
  const gridRef = useRef(null);
  const typingFocusLockRef = useRef(false);
  const latestSearchRequestIdRef = useRef(0);
  const hasRestoredSessionRef = useRef(false);
  const { skipToZone, setFocusPosition } = useFocus();

  useEffect(() => {
    const shouldAutoFocusInput = !initialSession.lastFocusedSlug && !initialSession.scrollY;
    const focusTimer = shouldAutoFocusInput
      ? setTimeout(() => inputRef.current?.focus(), 400)
      : null;

    return () => {
      if (focusTimer) clearTimeout(focusTimer);
      latestSearchRequestIdRef.current += 1;
    };
  }, [initialSession.lastFocusedSlug, initialSession.scrollY]);

  const handleSearch = useCallback(async (val) => {
    const nextQuery = val;
    typingFocusLockRef.current = document.activeElement === inputRef.current;
    setQuery(nextQuery);
    if (!nextQuery.trim()) {
      latestSearchRequestIdRef.current += 1;
      setResults([]);
      setSearched(false);
      setLoading(false);
      clearTvSearchSession();
      return;
    }
    const requestId = latestSearchRequestIdRef.current + 1;
    latestSearchRequestIdRef.current = requestId;
    setLoading(true);
    setSearched(true);
    try {
      const res = await tmdbApi.search('movie', { keyword: nextQuery, limit: 30 });
      if (requestId !== latestSearchRequestIdRef.current) return;
      const nextResults = res.data?.items || [];
      setResults(nextResults);
      saveTvSearchSession({
        query: nextQuery,
        results: nextResults,
        searched: true,
        lastFocusedSlug: '',
        scrollY: 0,
      });
    } catch {
      if (requestId !== latestSearchRequestIdRef.current) return;
      setResults([]);
      saveTvSearchSession({
        query: nextQuery,
        results: [],
        searched: true,
        lastFocusedSlug: '',
        scrollY: 0,
      });
    } finally {
      if (requestId === latestSearchRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!typingFocusLockRef.current) return undefined;
    const timer = setTimeout(() => {
      inputRef.current?.focus?.();
    }, 0);
    return () => clearTimeout(timer);
  }, [query, results.length, loading]);

  const focusFirstResult = useCallback(() => {
    const firstCard = gridRef.current?.querySelector?.('.tv-search-card');
    firstCard?.focus?.();
  }, []);

  const focusSearchInput = useCallback(() => {
    inputRef.current?.focus?.();
  }, []);

  const handleSearchInputFocus = useCallback(() => {
    setFocusPosition(1, 0, 0);
  }, [setFocusPosition]);

  const rememberResult = useCallback((slug) => {
    saveTvSearchSession({ lastFocusedSlug: slug, scrollY: window.scrollY || 0 });
  }, []);

  useEffect(() => {
    if (results.length === 0) return undefined;
    if (hasRestoredSessionRef.current) return undefined;

    const { lastFocusedSlug, scrollY } = initialSessionRef.current;
    if (!lastFocusedSlug && !scrollY) return undefined;
    hasRestoredSessionRef.current = true;

    const restoreTimer = setTimeout(() => {
      if (scrollY > 0) {
        window.scrollTo?.(0, scrollY);
      }

      if (lastFocusedSlug) {
        const cards = Array.from(gridRef.current?.querySelectorAll?.('.tv-search-card') || []);
        const focusedResult = cards.find((card) => card.dataset.searchResultSlug === lastFocusedSlug);
        if (focusedResult) {
          focusedResult.focus?.();
          return;
        }
      }

      inputRef.current?.focus?.();
    }, 0);

    return () => clearTimeout(restoreTimer);
  }, [results.length]);

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
    typingFocusLockRef.current = false;
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
          onFocus={handleSearchInputFocus}
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
                  onRememberResult={rememberResult}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
