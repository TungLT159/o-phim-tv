import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Autoplay } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import tmdbApi, { movieType } from '../../api/tmdbApi';
import { fetchTMDBImages } from '../../utils/tmdbImageFetcher';
import axiosClient from '../../api/axiosClient';
import { FOCUS_KEYS, useFocus, useFocusable } from '../../context/FocusContext';
import './tv-hero.scss';

const HeroItem = ({ item, focusRef, focused, onPlayButtonFocus }) => {
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [backdropUrl, setBackdropUrl] = useState('');
  const [overview, setOverview] = useState('');

  useEffect(() => {
    if (!item.slug) return;
    Promise.resolve(axiosClient.get(`https://ophim1.com/v1/api/phim/${item.slug}`))
      .then((res) => {
        if (res?.data) setMovie(res.data);
      })
      .catch(() => {});
  }, [item.slug]);

  useEffect(() => {
    if (!item?.tmdb) return;
    fetchTMDBImages(item.tmdb).then(({ backdropUrl: bg, overview: desc }) => {
      if (bg) setBackdropUrl(bg);
      if (desc) setOverview(desc);
    });
  }, [item]);

  const description =
    overview ||
    movie?.seoOnPage?.descriptionHead?.replace(/<[^>]+>/g, '') ||
    '';

  const handlePlay = useCallback(() => {
    navigate(`/movie/${item.slug}`);
  }, [item.slug, navigate]);

  return (
    <div
      className="tv-hero__slide"
      style={{ backgroundImage: backdropUrl ? `url(${backdropUrl})` : 'none' }}
    >
      <div className="tv-hero__gradient-left" />
      <div className="tv-hero__gradient-bottom" />

      <div className="tv-hero__content">
        <h1 className="tv-hero__title">
          {movie?.item?.name || item.name || ''}
        </h1>

        <div className="tv-hero__meta">
          {item.year && <span>{item.year}</span>}
          {item.quality && <span className="tv-hero__quality">{item.quality}</span>}
          {item.lang && <span>{item.lang}</span>}
          {item.episode_current && <span>{item.episode_current}</span>}
        </div>

        {description && <p className="tv-hero__desc">{description}</p>}

        <div className="tv-hero__actions">
          <button
            ref={focusRef}
            type="button"
            className={`tv-hero__play-btn ${focused ? 'tv-hero__play-btn--focused' : ''}`}
            onClick={handlePlay}
            onFocus={onPlayButtonFocus}
            aria-label="Xem ngay"
            data-focus-key={FOCUS_KEYS.HOME_HERO_PLAY}
          >
            <i className="bx bx-play" />
            <span>Xem ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const TvHero = ({ items: providedItems = [] }) => {
  const [fetchedItems, setFetchedItems] = useState([]);
  const items = providedItems.length ? providedItems : fetchedItems;
  const hasFocusedInitiallyRef = useRef(false);
  const upwardFocusIntentRef = useRef(false);
  const { focusByKey, getLastNavigationDirection } = useFocus();
  const { ref, focused, focusSelf } = useFocusable({
    focusKey: FOCUS_KEYS.HOME_HERO_PLAY,
    onEnterPress: () => ref.current?.click?.(),
    onArrowPress: (direction) => {
      if (direction === 'up') {
        upwardFocusIntentRef.current = true;
        return false;
      }
      if (direction !== 'down') return true;
      const firstContentCardFocusKey = document.querySelector(
        '[data-home-content-card-focus-key]',
      )?.getAttribute('data-home-content-card-focus-key');

      return firstContentCardFocusKey ? !focusByKey(firstContentCardFocusKey) : true;
    },
  });

  const handlePlayButtonFocus = useCallback(() => {
    const shouldAlignButton = upwardFocusIntentRef.current || getLastNavigationDirection?.() === 'up';
    upwardFocusIntentRef.current = false;

    window.requestAnimationFrame?.(() => {
      if (shouldAlignButton) {
        ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start', inline: 'nearest' });
        return;
      }

      window.scrollTo?.({ top: 0, behavior: 'smooth' });
    });
  }, [getLastNavigationDirection, ref]);

  useEffect(() => {
    if (!focused) return;

    handlePlayButtonFocus();
  }, [focused, handlePlayButtonFocus]);

  useEffect(() => {
    if (!items.length || hasFocusedInitiallyRef.current) return;
    hasFocusedInitiallyRef.current = true;
    focusSelf?.();
    ref.current?.focus?.();
  }, [focusSelf, items.length, ref]);

  useEffect(() => {
    if (providedItems.length) return;

    tmdbApi
      .getMoviesList(movieType.phimChieuRap, { page: 1 })
      .then((res) => {
        const movies = res.data?.items || [];
        setFetchedItems(movies.slice(0, 8));
      })
      .catch(() => {});
  }, [providedItems.length]);

  if (!items.length) return null;

  return (
    <div
      className={`tv-hero ${focused ? 'tv-hero--focused' : ''}`}
      aria-label="Phim nổi bật"
      data-focus-scroll-root="true"
    >
      <Swiper
        modules={[Autoplay]}
        grabCursor={false}
        spaceBetween={0}
        slidesPerView={1}
        autoplay={{ delay: 8000, disableOnInteraction: false }}
        allowTouchMove={false}
      >
        {items.map((item) => (
          <SwiperSlide key={item._id || item.slug}>
            {({ isActive }) =>
              isActive ? (
                <HeroItem
                  item={item}
                  focusRef={ref}
                  focused={focused}
                  onPlayButtonFocus={handlePlayButtonFocus}
                />
              ) : null
            }
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default TvHero;
