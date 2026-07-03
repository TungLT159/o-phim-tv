import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './index';

const API_BASE = process.env.REACT_APP_API_URL || '';

export const apiBridge = {
  fetchMovieDetail: async (id) => {
    if (isTauri()) {
      return invoke('fetch_movie_detail', { id });
    }
    const res = await fetch(`${API_BASE}/api/phim/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  fetchEpisode: async (id, name, group) => {
    if (isTauri()) {
      return invoke('fetch_episode', { id, name, group: group ?? null });
    }
    const params = new URLSearchParams({ name });
    if (group !== undefined && group !== null) params.set('group', group);
    const res = await fetch(`${API_BASE}/api/phim/${id}/episode?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  createStreamToken: async (url) => {
    if (isTauri()) {
      return invoke('create_stream_token', { url });
    }
    const res = await fetch(`${API_BASE}/api/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  fetchHlsAsset: async (url, responseType) => {
    if (isTauri()) {
      return invoke('fetch_hls_asset', { url, responseType });
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (responseType === 'arraybuffer') {
      return { data: Array.from(new Uint8Array(await res.arrayBuffer())), finalUrl: res.url };
    }
    return { data: await res.text(), finalUrl: res.url };
  },

  startDownload: async (slug, ep, quality) => {
    if (isTauri()) {
      return invoke('start_download', { slug, ep, quality });
    }
    const params = new URLSearchParams({ slug, ep });
    if (quality) params.set('quality', quality);
    const res = await fetch(`${API_BASE}/api/download/start?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  getDownloadStatus: async (jobId) => {
    if (isTauri()) {
      return invoke('get_download_status', { jobId });
    }
    const res = await fetch(`${API_BASE}/api/download/status?id=${jobId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  cancelDownload: async (jobId) => {
    if (isTauri()) {
      return invoke('cancel_download', { jobId });
    }
    const res = await fetch(`${API_BASE}/api/download/cancel?id=${jobId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  downloadFile: async (jobId) => {
    if (isTauri()) {
      return invoke('download_file', { jobId });
    }
    const res = await fetch(`${API_BASE}/api/download/file?id=${jobId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
  },
};
