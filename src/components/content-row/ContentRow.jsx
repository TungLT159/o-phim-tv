import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './content-row.scss';
import { FOCUS_KEYS, focusKeyForHomeCard, useFocus, useFocusable } from '../../context/FocusContext';
import { fetchTMDBImages } from '../../utils/tmdbImageFetcher';

const FALLBACK = '/poster-mau.png';

const getDefaultItemUrl = (item) => `/movie/${item.slug}`;
const getDefaultItemBadge = (item) => item.episode_current || item.quality;
const getDefaultItemSubtitle = (item) => item.year;
const getDefaultFallbackPoster = () => FALLBACK;
const shouldUseFetchedPoster = (posterUrl, fallbackPoster) =>
  posterUrl && !(posterUrl === FALLBACK && fallbackPoster !== FALLBACK);

const isInFirstMountedContentRow = (cardElement) => {
  const currentRow = cardElement?.closest?.('.content-row');
  if (!currentRow) return false;

  const firstMountedRow = Array.from(document.querySelectorAll('.content-row'))
    .find((rowElement) => rowElement.querySelector('[data-home-content-card-focus-key]'));

  return firstMountedRow === currentRow;
};

function ContentCardContent({
  item,
  getItemUrl = getDefaultItemUrl,
  getItemBadge = getDefaultItemBadge,
  getItemSubtitle = getDefaultItemSubtitle,
  getFallbackPoster = getDefaultFallbackPoster,
  cardRef,
  focused = false,
  focusKey,
  onKeyDown,
}) {
  const fallbackPoster = getFallbackPoster(item) || FALLBACK;
  const badge = getItemBadge(item);
  const subtitle = getItemSubtitle(item);
  const [poster, setPoster] = useState(fallbackPoster);

  useEffect(() => {
    let isCurrent = true;

    setPoster(fallbackPoster);
    if (!item?.tmdb) return () => {
      isCurrent = false;
    };

    fetchTMDBImages(item.tmdb).then(({ posterUrl }) => {
      if (!isCurrent) return;
      setPoster(shouldUseFetchedPoster(posterUrl, fallbackPoster) ? posterUrl : fallbackPoster);
    });

    return () => {
      isCurrent = false;
    };
  }, [item, fallbackPoster]);

  useEffect(() => {
    if (focused && cardRef.current) {
      cardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [focused, cardRef]);

  return (
    <Link
      to={getItemUrl(item)}
      className={`content-row__card ${focused ? 'content-row__card--focused' : ''}`}
      ref={cardRef}
      data-home-content-card-focus-key={focusKey}
      onKeyDown={onKeyDown}
    >
      <div className="content-row__poster">
        <img src={poster} alt={item.name || item.title || ''} loading="lazy" />
        {badge && <span className="content-row__badge">{badge}</span>}
      </div>
      <div className="content-row__info">
        <span className="content-row__name">{item.name || item.title}</span>
        {subtitle && <span className="content-row__year">{subtitle}</span>}
      </div>
    </Link>
  );
}

function FocusableContentCard({ row, rowId, col, zone = 1, ...props }) {
  const focusKey = focusKeyForHomeCard(rowId || row, col);
  const { focusByKey, rememberContentFocus } = useFocus();
  const moveUpToHero = useCallback(() => {
    const cardElement = document.querySelector(`[data-home-content-card-focus-key="${focusKey}"]`);
    if (!isInFirstMountedContentRow(cardElement)) return false;

    focusByKey?.(FOCUS_KEYS.HOME_HERO_PLAY, { direction: 'up' });
    return true;
  }, [focusByKey, focusKey]);
  const { ref, focused } = useFocusable({
    focusKey,
    onFocus: () => rememberContentFocus?.(focusKey),
    onEnterPress: () => ref.current?.click?.(),
    onArrowPress: (direction) => {
      if (direction !== 'up') return true;
      return moveUpToHero() ? false : true;
    },
  });

  const handleKeyDown = useCallback((event) => {
    if (event.key !== 'ArrowUp') return;
    if (!moveUpToHero()) return;

    event.preventDefault();
    event.stopPropagation();
  }, [moveUpToHero]);

  return <ContentCardContent {...props} cardRef={ref} focused={focused} focusKey={focusKey} onKeyDown={handleKeyDown} />;
}

function PlainContentCard(props) {
  const ref = useRef(null);

  return <ContentCardContent {...props} cardRef={ref} focused={false} />;
}

const ContentRow = ({
  title,
  items = [],
  rowId,
  row,
  getItemUrl,
  getItemBadge,
  getItemSubtitle,
  getFallbackPoster,
  tvFocusable = true,
  zone = 1,
}) => {
  if (!items.length) return null;

  return (
    <section className="content-row" aria-label={title}>
      <div className="content-row__header">
        <h2 className="content-row__title">{title}</h2>
      </div>
      <div className="content-row__track">
        {items.slice(0, 12).map((item, idx) => {
          const CardComponent = tvFocusable ? FocusableContentCard : PlainContentCard;

          return (
            <CardComponent
              key={item.key || item.slug || idx}
              item={item}
              rowId={rowId}
              row={row}
              col={idx}
              getItemUrl={getItemUrl}
              getItemBadge={getItemBadge}
              getItemSubtitle={getItemSubtitle}
              getFallbackPoster={getFallbackPoster}
              zone={zone}
            />
          );
        })}
      </div>
    </section>
  );
};

export default ContentRow;
