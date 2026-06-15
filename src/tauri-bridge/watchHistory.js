import { load } from '@tauri-apps/plugin-store';

let storeInstance = null;

const getStore = async () => {
  if (!storeInstance) {
    storeInstance = await load('watch-history.json', { autoSave: true });
  }
  return storeInstance;
};

export const watchHistoryBridge = {
  read: async () => {
    const store = await getStore();
    const val = await store.get('history');
    return Array.isArray(val) ? val : [];
  },
  write: async (history) => {
    const store = await getStore();
    await store.set('history', history);
  },
  clear: async () => {
    const store = await getStore();
    await store.delete('history');
  },
};
