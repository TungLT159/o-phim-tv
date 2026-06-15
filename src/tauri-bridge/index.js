export { watchHistoryBridge } from './watchHistory';
export { navigationBridge } from './navigation';
export { updatesBridge } from './updates';
export { apiBridge } from './api';

export const isTauri = () => {
  if (typeof window === 'undefined') return false;

  try {
    return !!(window.__TAURI__ || window.__TAURI_INTERNALS__ || /android/i.test(navigator.userAgent));
  } catch (e) {
    return false;
  }
};

