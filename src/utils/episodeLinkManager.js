/**
 * Episode Link Manager
 * Quản lý việc lấy link xem phim một cách an toàn
 * Không lộ tất cả link ngay từ đầu, chỉ lấy khi người dùng click play
 */

import tmdbApi from '../api/tmdbApi';

/**
 * Cache để lưu episode links đã lấy
 * Tránh fetch nhiều lần cùng một episode
 */
const linkCache = new Map();

const getCacheKey = (movieId, episodeName, episodeGroupIndex) =>
  `${movieId}_${episodeGroupIndex ?? ""}_${episodeName}`;

/**
 * Lấy link xem của một episode cụ thể
 * @param {string} movieId - ID của phim
 * @param {string} episodeName - Tên tập phim
 * @returns {Promise<object>} Object chứa {link_m3u8, link_embed}
 */
export const getEpisodeLink = async (movieId, episodeName, episodeGroupIndex) => {
  const cacheKey = getCacheKey(movieId, episodeName, episodeGroupIndex);

  // Kiểm tra cache
  if (linkCache.has(cacheKey)) {
    return linkCache.get(cacheKey);
  }

  const linkPromise = tmdbApi
    .episode(movieId, episodeName, episodeGroupIndex)
    .then((links) => links || { playlistUrl: null })
    .catch((error) => {
      linkCache.delete(cacheKey);
      console.error(`Error fetching episode link for ${movieId}/${episodeName}:`, error);
      return { playlistUrl: null };
    });

  linkCache.set(cacheKey, linkPromise);
  return linkPromise;
};

export const prefetchEpisodeLink = (movieId, episodeName, episodeGroupIndex) => {
  if (!movieId || !episodeName) {
    return Promise.resolve({ playlistUrl: null });
  }

  return getEpisodeLink(movieId, episodeName, episodeGroupIndex);
};

/**
 * Xóa cache của một episode
 * @param {string} movieId - ID của phim
 * @param {string} episodeName - Tên tập phim
 */
export const clearEpisodeLinkCache = (movieId, episodeName, episodeGroupIndex) => {
  const cacheKey = getCacheKey(movieId, episodeName, episodeGroupIndex);
  linkCache.delete(cacheKey);
};

/**
 * Xóa toàn bộ cache
 */
export const clearAllEpisodeLinks = () => {
  linkCache.clear();
};

/**
 * Lấy kích thước cache (debug)
 */
export const getCacheSizeInfo = () => {
  return `Episode links cached: ${linkCache.size}`;
};
