export { watchHistoryBridge } from './watchHistory';
export { navigationBridge } from './navigation';
export { updatesBridge } from './updates';
export { apiBridge } from './api';

export const isTauri = () => typeof window !== 'undefined' && window.__TAURI__ !== undefined;
