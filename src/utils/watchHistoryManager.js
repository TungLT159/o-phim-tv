/**
 * Watch History Manager
 * Quản lý lịch sử xem phim với Electron storage hoặc localStorage fallback
 */

import { watchHistoryBridge, isTauri } from '../tauri-bridge';

const WATCH_HISTORY_KEY = 'ophim_watch_history:v1';
const LEGACY_WATCH_HISTORY_KEY = 'ophim_watch_history';
const MAX_HISTORY_ITEMS = 100; // Giới hạn số lượng phim lưu

let watchHistoryCache = [];
let initialized = false;
let initializationPromise = null;
let pendingWrite = Promise.resolve();
let writeInProgress = false;
const listeners = new Set();

const getElectronStorage = () => {
  if (isTauri()) {
    return watchHistoryBridge;
  }
  const storage = typeof window !== 'undefined' ? window.ophimWatchHistoryStorage : null;
  if (
    storage &&
    typeof storage.read === 'function' &&
    typeof storage.write === 'function' &&
    typeof storage.clear === 'function'
  ) {
    return storage;
  }
  return null;
};

const getTimestampTime = item => {
  const time = new Date(item?.timestamp).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
};

const readLocalStorageKey = key => {
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error reading watch history:', error);
    return [];
  }
};

const readLocalStorageHistory = () => [
  ...readLocalStorageKey(WATCH_HISTORY_KEY),
  ...readLocalStorageKey(LEGACY_WATCH_HISTORY_KEY),
];

const hasLocalStorageHistory = () => Boolean(
  localStorage.getItem(WATCH_HISTORY_KEY) || localStorage.getItem(LEGACY_WATCH_HISTORY_KEY),
);

const clearLocalStorageHistory = () => {
  localStorage.removeItem(WATCH_HISTORY_KEY);
  localStorage.removeItem(LEGACY_WATCH_HISTORY_KEY);
};

const normalizeHistory = history => {
  const itemsByKey = new Map();

  (Array.isArray(history) ? history : []).forEach(item => {
    if (!item || !item.key) {
      return;
    }

    const existing = itemsByKey.get(item.key);

    if (!existing || getTimestampTime(item) > getTimestampTime(existing)) {
      itemsByKey.set(item.key, item);
    }
  });

  return Array.from(itemsByKey.values())
    .sort((a, b) => getTimestampTime(b) - getTimestampTime(a))
    .slice(0, MAX_HISTORY_ITEMS);
};

const notifyListeners = () => {
  const snapshot = getWatchHistorySnapshot();
  listeners.forEach(listener => listener(snapshot));
};

const queueOperation = operation => {
  const run = () => {
    writeInProgress = true;

    let result;
    try {
      result = operation();
    } catch (error) {
      result = Promise.reject(error);
    }

    return Promise.resolve(result)
      .then(() => true)
      .catch(error => {
        console.error('Error writing watch history:', error);
        return false;
      })
      .finally(() => {
        writeInProgress = false;
      });
  };

  pendingWrite = writeInProgress ? pendingWrite.catch(() => undefined).then(run) : run();

  return pendingWrite;
};

const persistCache = () => {
  const storage = getElectronStorage();
  const snapshot = getWatchHistorySnapshot();

  if (storage) {
    return queueOperation(() => storage.write(snapshot));
  }

  return queueOperation(() => {
    localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(snapshot));
    localStorage.removeItem(LEGACY_WATCH_HISTORY_KEY);
  });
};

const ensureInitialized = async () => {
  if (!initialized) {
    await initializeWatchHistory();
  }
};

const doInitializeWatchHistory = async () => {
  const storage = getElectronStorage();
  const localHistory = readLocalStorageHistory();
  const shouldMigrateLocalHistory = storage && hasLocalStorageHistory();
  let storedHistory = [];

  if (storage) {
    try {
      const history = await storage.read();
      storedHistory = Array.isArray(history) ? history : [];
    } catch (error) {
      console.error('Error reading watch history:', error);
    }
  } else {
    storedHistory = localHistory;
  }

  watchHistoryCache = normalizeHistory([...storedHistory, ...(storage ? localHistory : [])]);
  initialized = true;

  if (shouldMigrateLocalHistory) {
    const didPersist = await persistCache();
    if (didPersist) {
      clearLocalStorageHistory();
    }
  } else if (!storage && hasLocalStorageHistory()) {
    await persistCache();
  }

  notifyListeners();
};

/**
 * Khởi tạo watch history từ Electron storage hoặc localStorage fallback
 * @returns {Promise<void>}
 */
export const initializeWatchHistory = async () => {
  if (!initializationPromise) {
    initializationPromise = doInitializeWatchHistory().finally(() => {
      initializationPromise = null;
    });
  }

  return initializationPromise;
};

/**
 * Lấy toàn bộ watch history
 * @returns {Promise<Array>} Array of watch history items
 */
export const getWatchHistory = async () => {
  await ensureInitialized();
  return getWatchHistorySnapshot();
};

/**
 * Lấy snapshot đồng bộ của watch history cache
 * @returns {Array} Array of watch history items
 */
export const getWatchHistorySnapshot = () => watchHistoryCache.map(item => ({ ...item }));

/**
 * Lưu thời lượng xem của một phim
 * @param {string} movieId - ID của phim
 * @param {string} episodeName - Tên tập phim
 * @param {number} currentTime - Thời gian hiện tại (giây)
 * @param {number} duration - Tổng thời lượng video (giây)
 * @param {object} movieInfo - Thông tin phim (title, poster, etc.)
 * @returns {Promise<void>}
 */
export const saveWatchProgress = (movieId, episodeName, currentTime, duration, movieInfo = {}) => {
  if (!initialized) {
    return initializeWatchHistory().then(() => saveWatchProgress(
      movieId,
      episodeName,
      currentTime,
      duration,
      movieInfo,
    ));
  }

  const key = `${movieId}_${episodeName}`;
  const existingItem = watchHistoryCache.find(item => item.key === key);
  const tmdb = movieInfo.tmdb ?? existingItem?.movieInfo?.tmdb;
  const storedMovieInfo = {
    title: movieInfo.title || '',
    poster: movieInfo.poster || '',
    slug: movieInfo.slug || '',
    ...(tmdb ? { tmdb } : {}),
  };
  const watchItem = {
    key,
    movieId,
    episodeName,
    currentTime,
    duration,
    percentage: duration > 0 ? (currentTime / duration) * 100 : 0,
    timestamp: new Date().toISOString(),
    movieInfo: storedMovieInfo,
  };

  watchHistoryCache = normalizeHistory([
    watchItem,
    ...watchHistoryCache.filter(item => item.key !== key),
  ]);
  notifyListeners();

  return persistCache();
};

/**
 * Lấy thời lượng xem của một phim cụ thể
 * @param {string} movieId - ID của phim
 * @param {string} episodeName - Tên tập phim
 * @returns {Promise<object|null>} Watch progress object hoặc null
 */
export const getWatchProgress = async (movieId, episodeName) => {
  await ensureInitialized();

  const key = `${movieId}_${episodeName}`;
  return getWatchHistorySnapshot().find(item => item.key === key) || null;
};

/**
 * Xóa watch progress của một phim
 * @param {string} movieId - ID của phim
 * @param {string} episodeName - Tên tập phim
 * @returns {Promise<void>}
 */
export const removeWatchProgress = (movieId, episodeName) => {
  if (!initialized) {
    return initializeWatchHistory().then(() => removeWatchProgress(movieId, episodeName));
  }

  const key = `${movieId}_${episodeName}`;
  watchHistoryCache = watchHistoryCache.filter(item => item.key !== key);
  notifyListeners();

  return persistCache();
};

/**
 * Xóa toàn bộ watch history
 * @returns {Promise<void>}
 */
export const clearWatchHistory = async () => {
  watchHistoryCache = [];
  initialized = false;
  initializationPromise = null;
  clearLocalStorageHistory();
  notifyListeners();

  const storage = getElectronStorage();
  if (storage) {
    return queueOperation(() => storage.clear());
  }

  return flushWatchHistory();
};

/**
 * Kiểm tra xem có nên hiển thị thông báo tiếp tục xem không
 * @param {number} currentTime - Thời gian đã xem (giây)
 * @param {number} duration - Tổng thời lượng (giây)
 * @returns {boolean}
 */
export const shouldShowContinueWatching = (currentTime, duration) => {
  if (!currentTime || !duration) return false;

  const percentage = (currentTime / duration) * 100;

  // Chỉ hiển thị nếu đã xem từ 1% đến 95%
  // Không hiển thị nếu mới bắt đầu hoặc đã xem gần hết
  return percentage >= 1 && percentage <= 95;
};

const getWatchPercentage = item => {
  const storedPercentage = Number(item.percentage);

  if (Number.isFinite(storedPercentage) && storedPercentage > 0) {
    return storedPercentage;
  }

  const currentTime = Number(item.currentTime);
  const duration = Number(item.duration);

  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) {
    return 0;
  }

  return (currentTime / duration) * 100;
};

const normalizeWatchItem = item => ({
  ...item,
  percentage: getWatchPercentage(item),
});

/**
 * Format thời gian từ giây sang HH:MM:SS hoặc MM:SS
 * @param {number} seconds - Số giây
 * @returns {string} Formatted time string
 */
export const formatTime = seconds => {
  if (!seconds || isNaN(seconds)) return '00:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Lấy danh sách phim đang xem (chưa xem xong)
 * @returns {Promise<Array>} Array of in-progress movies
 */
export const getInProgressMovies = async () => {
  await ensureInitialized();

  return getWatchHistorySnapshot()
    .map(normalizeWatchItem)
    .filter(item => {
      const percentage = getWatchPercentage(item);
      return percentage >= 1 && percentage <= 95;
    })
    .slice(0, 20); // Lấy tối đa 20 phim
};

const getRecentInProgressMoviesFromHistory = (history, limit = 10) => {
  const seenMovies = new Set();

  return history
    .map(normalizeWatchItem)
    .filter(item => {
      const percentage = getWatchPercentage(item);
      return percentage >= 1 && percentage <= 95;
    })
    .sort((a, b) => getTimestampTime(b) - getTimestampTime(a))
    .filter(item => {
      const movieKey = item.movieInfo?.slug || item.movieId;

      if (seenMovies.has(movieKey)) {
        return false;
      }

      seenMovies.add(movieKey);
      return true;
    })
    .slice(0, limit);
};

export const getRecentInProgressMovies = async (limit = 10) => {
  await ensureInitialized();
  return getRecentInProgressMoviesSnapshot(limit);
};

export const getRecentInProgressMoviesSnapshot = (limit = 10) => getRecentInProgressMoviesFromHistory(
  getWatchHistorySnapshot(),
  limit,
);

export const subscribeWatchHistory = listener => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const flushWatchHistory = () => pendingWrite;
