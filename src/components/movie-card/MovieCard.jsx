import "./movie-card.scss";

import Button from "../button/Button";
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchTMDBImages } from "../../utils/tmdbImageFetcher";

const MovieCard = (props) => {
  const item = props.item;

  const link = "/movie/" + item.slug;
  const [poster_url, setPosterUrl] = useState("/poster-mau.png");
  const [rating, setRating] = useState(null);
  const [voteCount, setVoteCount] = useState(null);

  useEffect(() => {
    const loadMovieData = async () => {
      if (!item?.tmdb) return;
      
      // Fetch full TMDB data to get rating
      try {
        const { posterUrl } = await fetchTMDBImages(item.tmdb);
        setPosterUrl(posterUrl);
        
        // Get rating from tmdb object if available
        if (item.tmdb.vote_average) {
          setRating(item.tmdb.vote_average);
          setVoteCount(item.tmdb.vote_count);
        }
      } catch (error) {
        console.error("Error loading movie data:", error);
      }
    };
    loadMovieData();
  }, [item]);

  return (
    <Link to={link}>
      <div
        className="movie-card"
        style={{ backgroundImage: `url(${poster_url})` }}
      >
        {/* Quality Badge */}
        {item.quality && (
          <div className="movie-card__badge quality-badge">
            {item.quality}
          </div>
        )}
        
        {/* Rating Badge */}
        {rating != null && (
          <div className="movie-card__badge rating-badge">
            <i className="bx bxs-star"></i>
            <span>{rating.toFixed(1)}</span>
          </div>
        )}
        
        {/* Overlay with info */}
        <div className="movie-card__overlay">
          <Button>
            <i className="bx bx-play"></i>
          </Button>
          
          <div className="movie-card__info">
            {item.year != null && (
              <span className="movie-card__year">
                <i className="bx bx-calendar"></i> {item.year}
              </span>
            )}
            {voteCount != null && (
              <span className="movie-card__votes">
                <i className="bx bx-user"></i> {voteCount.toLocaleString()}
              </span>
            )}
            {item.view != null && (
              <span className="movie-card__views">
                <i className="bx bx-show"></i> {item.view.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>
      <h3 className="movie-card__title">{item.title || item.name}</h3>
    </Link>
  );
};

export default MovieCard;
