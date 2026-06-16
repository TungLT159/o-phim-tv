import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Autoplay } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import tmdbApi, { movieType } from '../../api/tmdbApi';
import { fetchTMDBImages } from '../../utils/tmdbImageFetcher';
import axiosClient from '../../api/axiosClient';
import { useFocusable } from '../../context/FocusContext';
import './tv-hero.scss';

const HeroItem = ({ item }) => {
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [backdropUrl, setBackdropUrl] = useState('');
  const [overview, setOverview] = useState('');

  useEffect(() => {
    if (!item.slug) return;
    axiosClient
      .get(`https://ophim1.com/v1/api/phim/${item.slug}`)
      .then((res) => setMovie(res.data))
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

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      navigate(`/movie/${item.slug}`);
    }
  }, [item.slug, navigate]);

  return (
    <div
      className="tv-hero__slide"
      style={{ backgroundImage: backdropUrl ? `url(${backdropUrl})` : 'none' }}
      onKeyDown={handleKeyDown}
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
            type="button"
            className="tv-hero__play-btn"
            onClick={handlePlay}
            aria-label="Xem ngay"
          >
            <i className="bx bx-play" />
            <span>Xem ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const TvHero = () => {
  const [items, setItems] = useState([]);
  const { ref, focused } = useFocusable(1, 0, 0);

  useEffect(() => {
    tmdbApi
      .getMoviesList(movieType.phimChieuRap, { page: 1 })
      .then((res) => {
        const movies = res.data?.items || [];
        setItems(movies.slice(0, 8));
      })
      .catch(() => {});
  }, []);

  if (!items.length) return null;

  return (
    <div className={`tv-hero ${focused ? 'tv-hero--focused' : ''}`} ref={ref} aria-label="Phim nổi bật">
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
              isActive ? <HeroItem item={item} /> : null
            }
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default TvHero;
