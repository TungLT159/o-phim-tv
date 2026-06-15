import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

import "./movie-list.scss";
import { Autoplay, Navigation } from "swiper/modules";

import { SwiperSlide, Swiper } from "swiper/react";

// import { Link } from 'react-router-dom';
// import Button from '../button/Button';
import tmdbApi from "../../api/tmdbApi";
// import apiConfig from '../../api/apiConfig';
import MovieCard from "../movie-card/MovieCard";

const MovieList = (props) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const showPlaceholders = loading || items.length === 0;
  const navigationId = props.type.replace(/[^a-zA-Z0-9_-]/g, "-");
  const prevButtonClass = `movie-list__button-prev-${navigationId}`;
  const nextButtonClass = `movie-list__button-next-${navigationId}`;

  /**
   * Lấy danh sách phim
   */
  useEffect(() => {
    let isMounted = true;

    const getList = async () => {
      setLoading(true);

      try {
        let response = null;
        const params = {};

        if (props.type !== "similar") {
          response = await tmdbApi.getMoviesList(props.type, { params });
        } else {
          // console.log(props.category);
          response = await tmdbApi.getListByType(props.category);
        }

        if (isMounted) {
          setItems(response.data.items || []);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    getList();

    return () => {
      isMounted = false;
    };
  }, [props.type, props.category]);

  return (
    <div
      className={`movie-list${loading ? " movie-list--loading" : ""}${!loading && items.length === 0 ? " movie-list--empty" : ""}`}
      data-testid="movie-list-carousel"
    >
      <Swiper
        modules={[Navigation, Autoplay]}
        grabCursor={true}
        spaceBetween={10}
        slidesPerView={"auto"}
        autoplay={{ delay: 4000 }}
        navigation={{
          nextEl: `.${nextButtonClass}`,
          prevEl: `.${prevButtonClass}`,
        }}
      >
        {showPlaceholders
          ? Array.from({ length: 6 }).map((_, i) => (
              <SwiperSlide key={`movie-list-skeleton-${i}`}>
                <div
                  className="movie-list__skeleton-card"
                  data-testid="movie-list-skeleton-card"
                >
                  <div className="movie-list__skeleton-poster" />
                  <div className="movie-list__skeleton-title" />
                </div>
              </SwiperSlide>
            ))
          : items.map((item, i) => (
              <SwiperSlide key={item.slug || item.id || i}>
                <MovieCard item={item} category={props.category} />
              </SwiperSlide>
            ))}
      </Swiper>
      <div className={`movie-list__button-prev ${prevButtonClass} swiper-button-prev`}>
        <i className="bx bx-chevron-left"></i>
      </div>
      <div className={`movie-list__button-next ${nextButtonClass} swiper-button-next`}>
        <i className="bx bx-chevron-right"></i>
      </div>
    </div>
  );
};

MovieList.propTypes = {
  category: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
};

export default MovieList;
