import { useState, useEffect } from "react";
import axiosClient from "../api/axiosClient";
import apiConfig from "../api/apiConfig";

/**
 * TMDB Image Fetcher
 * Hàm chung để lấy hình ảnh từ TMDB API
 */

const TMDB_API_KEY = process.env.REACT_APP_TMDB_API_KEY;
const FALLBACK_POSTER = "/poster-mau.png";

/**
 * Fetch TMDB movie/TV details và trả về URLs hình ảnh
 * @param {object} tmdbInfo - Object chứa {id, type} từ TMDB
 * @returns {Promise<object>} Object chứa {posterUrl, backdropUrl, overview}
 */
export const fetchTMDBImages = async (tmdbInfo) => {
  if (!tmdbInfo?.id) {
    return {
      posterUrl: FALLBACK_POSTER,
      backdropUrl: "",
      overview: "",
    };
  }

  try {
    const type = tmdbInfo.type || "movie";
    const response = await axiosClient.get(
      `https://api.themoviedb.org/3/${type}/${tmdbInfo.id}?api_key=${TMDB_API_KEY}&language=vi-VN`,
    );

    return {
      posterUrl: response.poster_path
        ? apiConfig.w500Image(response.poster_path)
        : FALLBACK_POSTER,
      backdropUrl: response.backdrop_path
        ? apiConfig.w500Image(response.backdrop_path)
        : "",
      overview: response.overview || "",
    };
  } catch (error) {
    console.error("Error fetching TMDB images:", error);
    return {
      posterUrl: FALLBACK_POSTER,
      backdropUrl: "",
      overview: "",
    };
  }
};

/**
 * Fetch chỉ poster URL từ TMDB
 * @param {object} tmdbInfo - Object chứa {id, type} từ TMDB
 * @returns {Promise<string>} Poster URL
 */
export const fetchTMDBPoster = async (tmdbInfo) => {
  const { posterUrl } = await fetchTMDBImages(tmdbInfo);
  return posterUrl;
};

/**
 * Fetch TMDB images cho nhiều items cùng lúc (batch)
 * @param {Array} items - Array các items có thuộc tính tmdb
 * @returns {Promise<Array>} Array items với thêm thuộc tính tmdb_poster, tmdb_backdrop
 */
export const fetchTMDBImagesForItems = async (items) => {
  if (!items || items.length === 0) return [];

  return await Promise.all(
    items.map(async (item) => {
      if (!item.tmdb?.id) {
        return {
          ...item,
          tmdb_poster: FALLBACK_POSTER,
          tmdb_backdrop: "",
        };
      }

      try {
        const { posterUrl, backdropUrl, overview } = await fetchTMDBImages(
          item.tmdb,
        );
        return {
          ...item,
          tmdb_poster: posterUrl,
          tmdb_backdrop: backdropUrl,
          tmdb_overview: overview,
        };
      } catch (error) {
        console.error(
          `Error fetching TMDB image for item ${item.slug}:`,
          error,
        );
        return {
          ...item,
          tmdb_poster: FALLBACK_POSTER,
          tmdb_backdrop: "",
        };
      }
    }),
  );
};

/**
 * Get profile image URL cho cast/crew
 * @param {string} profilePath - Profile path từ TMDB
 * @returns {string} Profile image URL
 */
export const getTMDBProfileImage = (profilePath) => {
  if (!profilePath) return FALLBACK_POSTER;
  return apiConfig.w500Image(profilePath);
};

/**
 * Custom hook để fetch TMDB images với React state management
 * @param {object} tmdbInfo - Object chứa {id, type} từ TMDB
 * @returns {object} {posterUrl, backdropUrl, overview, loading, error}
 */
export const useTMDBImages = (tmdbInfo) => {
  const tmdbId = tmdbInfo?.id;
  const tmdbType = tmdbInfo?.type;
  const [state, setState] = useState({
    posterUrl: FALLBACK_POSTER,
    backdropUrl: "",
    overview: "",
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const loadImages = async () => {
      if (!tmdbId) {
        setState({
          posterUrl: FALLBACK_POSTER,
          backdropUrl: "",
          overview: "",
          loading: false,
          error: null,
        });
        return;
      }

      try {
        const result = await fetchTMDBImages({ id: tmdbId, type: tmdbType });
        if (isMounted) {
          setState({
            ...result,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        if (isMounted) {
          setState({
            posterUrl: FALLBACK_POSTER,
            backdropUrl: "",
            overview: "",
            loading: false,
            error: error.message,
          });
        }
      }
    };

    loadImages();

    return () => {
      isMounted = false;
    };
  }, [tmdbId, tmdbType]);

  return state;
};
