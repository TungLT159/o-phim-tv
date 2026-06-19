import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";

const MAX_CACHE = 100;
const THUMBNAIL_INTERVAL = 5;
const DEBOUNCE_MS = 400;
const CANVAS_WIDTH = 160;
const CANVAS_HEIGHT = 90;
const SEEK_TIMEOUT_MS = 5000;

const getCacheKey = (time) => Math.floor(time / THUMBNAIL_INTERVAL) * THUMBNAIL_INTERVAL;

const useThumbnailPreview = (thumbnailVideoRef, canvasRef, duration) => {
  const cacheRef = useRef(new Map());
  const accessOrderRef = useRef([]);
  const debounceRef = useRef(null);
  const hlsRef = useRef(null);
  const seekPendingRef = useRef(null);
  const seekTimeoutRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const addToCache = useCallback((key, dataURL) => {
    if (cacheRef.current.has(key)) return;
    if (cacheRef.current.size >= MAX_CACHE) {
      const oldest = accessOrderRef.current.shift();
      cacheRef.current.delete(oldest);
    }
    cacheRef.current.set(key, dataURL);
    accessOrderRef.current.push(key);
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    accessOrderRef.current = [];
  }, []);

  const generateThumbnail = useCallback(
    (time, positionPercent) => {
      const video = thumbnailVideoRef?.current;
      const canvas = canvasRef?.current;
      if (!video || !canvas) return;
      if (video.readyState < 2) return;

      const key = getCacheKey(time);

      if (cacheRef.current.has(key)) {
        const idx = accessOrderRef.current.indexOf(key);
        if (idx !== -1) {
          accessOrderRef.current.splice(idx, 1);
          accessOrderRef.current.push(key);
        }
        setPreview({
          dataURL: cacheRef.current.get(key),
          time: key,
          position: positionPercent,
        });
        return;
      }

      if (seekPendingRef.current) {
        seekPendingRef.current.abort = true;
      }

      const pending = { abort: false };
      seekPendingRef.current = pending;

      seekTimeoutRef.current = setTimeout(() => {
        video.removeEventListener("seeked", onSeeked);
        seekTimeoutRef.current = null;
        if (seekPendingRef.current === pending) {
          seekPendingRef.current = null;
        }
      }, SEEK_TIMEOUT_MS);

      const onSeeked = () => {
        if (seekTimeoutRef.current) {
          clearTimeout(seekTimeoutRef.current);
          seekTimeoutRef.current = null;
        }
        if (pending.abort) return;
        if (seekPendingRef.current !== pending) return;
        seekPendingRef.current = null;

        try {
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          const dataURL = canvas.toDataURL("image/jpeg", 0.7);
          addToCache(key, dataURL);
          setPreview({ dataURL, time: key, position: positionPercent });
        } catch {
          // canvas tainted or video not ready — silently skip
        }
      };

      video.addEventListener("seeked", onSeeked, { once: true });
      video.currentTime = time;
    },
    [thumbnailVideoRef, canvasRef, addToCache],
  );

  const requestPreview = useCallback(
    (time, positionPercent) => {
      if (!duration || duration <= 0) return;

      const key = getCacheKey(time);

      if (cacheRef.current.has(key)) {
        const idx = accessOrderRef.current.indexOf(key);
        if (idx !== -1) {
          accessOrderRef.current.splice(idx, 1);
          accessOrderRef.current.push(key);
        }
        setPreview({
          dataURL: cacheRef.current.get(key),
          time: key,
          position: positionPercent,
        });
        return;
      }

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        generateThumbnail(time, positionPercent);
      }, DEBOUNCE_MS);
    },
    [duration, generateThumbnail],
  );

  const cancelRequest = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (seekPendingRef.current) {
      seekPendingRef.current.abort = true;
      seekPendingRef.current = null;
    }
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = null;
    }
    setPreview(null);
  }, []);

  const setSource = useCallback(
    (sourceUrl, isHlsSource) => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      clearCache();
      cancelRequest();

      const video = thumbnailVideoRef?.current;
      if (!video || !sourceUrl) return;

      if (isHlsSource && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: false,
          autoStartLoad: true,
          maxBufferLength: 30,
        });
        hls.loadSource(sourceUrl);
        hls.attachMedia(video);
        hlsRef.current = hls;
      } else {
        video.removeAttribute("src");
        video.load();
        video.src = sourceUrl;
      }
    },
    [thumbnailVideoRef, clearCache, cancelRequest],
  );

  useEffect(() => {
    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (seekPendingRef.current) {
        seekPendingRef.current.abort = true;
      }
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
    };
  }, []);

  return {
    preview,
    requestPreview,
    cancelRequest,
    setSource,
  };
};

export default useThumbnailPreview;
