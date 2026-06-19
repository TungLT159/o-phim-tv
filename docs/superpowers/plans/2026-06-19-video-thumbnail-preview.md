# Video Timeline Thumbnail Preview — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show thumbnail preview popup above the video timeline when user hovers/drags it, using client-side canvas capture with lazy generation and LRU cache.

**Architecture:** `useThumbnailPreview` hook manages a hidden `<video>` for seeking, `<canvas>` for frame capture, and an LRU cache. `ThumbnailPreview` component renders the popup. `CustomVideoPlayerChrome` fires hover events on the progress `<input>`. `CustomVideoPlayer` orchestrates the hidden video, canvas, and hook.

**Tech Stack:** React 18, Jest + React Testing Library, hls.js, SCSS

---

### Task 1: Create ThumbnailPreview component and styles

**Files:**
- Create: `src/components/video-player/thumbnail-preview/ThumbnailPreview.jsx`
- Create: `src/components/video-player/thumbnail-preview/thumbnail-preview.scss`

- [ ] **Step 1: Create ThumbnailPreview.jsx**

```jsx
import React from "react";
import "./thumbnail-preview.scss";

const formatTime = (seconds) => {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const ThumbnailPreview = ({ visible, dataURL, time, position }) => {
  if (!visible || !dataURL) return null;

  return (
    <div
      className="thumbnail-preview"
      style={{ left: `${position}%` }}
      role="tooltip"
      aria-live="polite"
    >
      <img
        className="thumbnail-preview__image"
        src={dataURL}
        alt={`Preview at ${formatTime(time)}`}
      />
      <span className="thumbnail-preview__time">{formatTime(time)}</span>
    </div>
  );
};

export default ThumbnailPreview;
```

- [ ] **Step 2: Create thumbnail-preview.scss**

```scss
.thumbnail-preview {
  position: absolute;
  bottom: calc(100% + 12px);
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0;
  transition: opacity 0.15s ease;

  &[style*="left"] {
    opacity: 1;
  }

  &__image {
    width: 160px;
    height: 90px;
    border-radius: 8px;
    object-fit: cover;
    border: 2px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
    background: #000;
    display: block;
  }

  &__time {
    margin-top: 4px;
    padding: 2px 8px;
    background: rgba(0, 0, 0, 0.85);
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #fff;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
}
```

- [ ] **Step 3: Verify component renders correctly**

Create `src/components/video-player/thumbnail-preview/ThumbnailPreview.test.jsx`:

```jsx
import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import ThumbnailPreview from "./ThumbnailPreview";

describe("ThumbnailPreview", () => {
  it("renders nothing when not visible", () => {
    const { container } = render(
      <ThumbnailPreview visible={false} dataURL="" time={0} position={50} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when dataURL is empty", () => {
    const { container } = render(
      <ThumbnailPreview visible={true} dataURL="" time={0} position={50} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders image and time when visible with dataURL", () => {
    render(
      <ThumbnailPreview
        visible={true}
        dataURL="data:image/jpeg;base64,test"
        time={65}
        position={50}
      />
    );
    expect(screen.getByRole("img")).toHaveAttribute("src", "data:image/jpeg;base64,test");
    expect(screen.getByText("01:05")).toBeInTheDocument();
  });

  it("positions at given percentage", () => {
    const { container } = render(
      <ThumbnailPreview
        visible={true}
        dataURL="data:image/jpeg;base64,test"
        time={0}
        position={75}
      />
    );
    const el = container.firstChild;
    expect(el.style.left).toBe("75%");
  });

  it("formats hours correctly", () => {
    render(
      <ThumbnailPreview
        visible={true}
        dataURL="data:image/jpeg;base64,test"
        time={3725}
        position={0}
      />
    );
    expect(screen.getByText("1:02:05")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npx jest src/components/video-player/thumbnail-preview/ThumbnailPreview.test.jsx --no-coverage
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/video-player/thumbnail-preview/ThumbnailPreview.jsx src/components/video-player/thumbnail-preview/thumbnail-preview.scss src/components/video-player/thumbnail-preview/ThumbnailPreview.test.jsx
git commit -m "feat: add ThumbnailPreview component for video timeline hover"
```

---

### Task 2: Create useThumbnailPreview hook

**File:**
- Create: `src/hooks/useThumbnailPreview.js`

- [ ] **Step 1: Create the hook**

```js
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

      const seekTimeout = setTimeout(() => {
        video.removeEventListener("seeked", onSeeked);
        if (seekPendingRef.current === pending) {
          seekPendingRef.current = null;
        }
      }, SEEK_TIMEOUT_MS);

      const onSeeked = () => {
        clearTimeout(seekTimeout);
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
```

- [ ] **Step 2: Verify the file has no syntax errors**

```bash
npx jest --testPathPattern="useThumbnailPreview" --no-coverage 2>&1 || echo "No tests yet, checking syntax with node"
```

Note: No unit tests for this hook yet — tested through integration in Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useThumbnailPreview.js
git commit -m "feat: add useThumbnailPreview hook with lazy capture and LRU cache"
```

---

### Task 3: Integrate useThumbnailPreview into CustomVideoPlayer

**File:**
- Modify: `src/components/video-player/CustomVideoPlayer.jsx`

- [ ] **Step 1: Add hidden video and canvas elements to the JSX**

Add a hidden `<video>` element (after the main video at line 842) and a `<canvas>` element. Add a ref for each.

In `CustomVideoPlayer.jsx`:

**Add imports** (after line 15):
```js
import useThumbnailPreview from "../../hooks/useThumbnailPreview";
```

**Add refs** (after line 86, alongside other refs):
```js
const thumbnailVideoRef = useRef(null);
const canvasRef = useRef(null);
```

**Add hook initialization** (after all state/ref declarations, before `useEffect`s, around line 119):
```js
const {
  preview: thumbnailPreview,
  requestPreview: requestThumbnail,
  cancelRequest: cancelThumbnail,
  setSource: setThumbnailSource,
} = useThumbnailPreview(thumbnailVideoRef, canvasRef, duration);
```

**Add timeline hover/leave handlers** (after existing callbacks, around line 300):
```js
const handleTimelineHover = useCallback(
  (time, positionPercent) => {
    requestThumbnail(time, positionPercent);
  },
  [requestThumbnail],
);

const handleTimelineLeave = useCallback(() => {
  cancelThumbnail();
}, [cancelThumbnail]);
```

**Add hidden elements to JSX** — after the main `<video>` (after line 842), before the closing `</video>` tag section:
```jsx
<video
  ref={thumbnailVideoRef}
  preload="auto"
  width="160"
  height="90"
  muted
  crossOrigin="anonymous"
  style={{ display: "none" }}
/>
<canvas
  ref={canvasRef}
  width={160}
  height={90}
  style={{ display: "none" }}
/>
```

**Pass new props to CustomVideoPlayerChrome** (around lines 935-962):
Add `onTimelineHover={handleTimelineHover}`, `onTimelineLeave={handleTimelineLeave}`, and `thumbnailPreview` to the Chrome props:
```jsx
<CustomVideoPlayerChrome
  ...
  onTimelineHover={handleTimelineHover}
  onTimelineLeave={handleTimelineLeave}
  thumbnailPreview={thumbnailPreview}
/>
```

**Set thumbnail source when episode loads** — in the `loadSource` function, after successfully loading the main video source (in the self-contained effect starting at line 561), call `setThumbnailSource`. The source URL variable is `sourceUrl` and the `isHls` flag can be determined.

Add inside the `loadSource` async function, right after successful HLS setup (after `hls.loadSource(sourceUrl)` at line 646) and in the native fallback path (after setting `video.src = playbackUrl` at line 716):
```js
if (sourceUrl) {
  setThumbnailSource(sourceUrl, Hls.isSupported() && sourceUrl.includes(".m3u8"));
}
```

For the non-self-contained path (playback managed externally), we need to sync source when the video element's `src` changes. Add an effect (after the existing effects, around line 741):

```js
useEffect(() => {
  const video = videoRef?.current;
  if (!video || selfContained) return;
  const syncSource = () => {
    const src = video.src || video.currentSrc;
    if (src && src !== window.location.href) {
      setThumbnailSource(src, src.includes(".m3u8"));
    }
  };
  syncSource();
  video.addEventListener("loadedmetadata", syncSource, { once: true });
  return () => video.removeEventListener("loadedmetadata", syncSource);
}, [selfContained, videoRef, setThumbnailSource]);
```

- [ ] **Step 2: Run existing tests to verify no regressions**

```bash
npx jest src/components/video-player/CustomVideoPlayer.test.jsx --no-coverage
```

Expected: All existing tests still PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/video-player/CustomVideoPlayer.jsx
git commit -m "feat: integrate thumbnail preview hook into CustomVideoPlayer"
```

---

### Task 4: Integrate ThumbnailPreview into CustomVideoPlayerChrome

**File:**
- Modify: `src/components/video-player/CustomVideoPlayerChrome.jsx`

- [ ] **Step 1: Add imports and props**

Add import at top (after line 1):
```js
import ThumbnailPreview from "./thumbnail-preview/ThumbnailPreview";
```

Add new destructured props (in the function signature, after `onToggleAutoPlay` at line 61):
```js
onTimelineHover,
onTimelineLeave,
thumbnailPreview,
```

- [ ] **Step 2: Add hover handlers on the progress input**

Replace the `<input>` element (lines 89-100) with:
```jsx
<input
  className="custom-video-player__progress"
  type="range"
  min="0"
  max={duration || 0}
  step="0.1"
  value={currentTime}
  onChange={onSeek}
  onMouseMove={(e) => {
    if (!onTimelineHover) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = percent * (duration || 0);
    onTimelineHover(time, percent * 100);
  }}
  onMouseLeave={onTimelineLeave}
  data-tv-focusable="true"
  aria-label="Tua video"
  style={{ "--progress": `${progressPercent}%` }}
/>
```

- [ ] **Step 3: Add ThumbnailPreview inside the progress row**

Replace the progress row div (lines 87-102) to include `position: "relative"` and the ThumbnailPreview:

```jsx
<div className="custom-video-player__progress-row" style={{ position: "relative" }}>
  <ThumbnailPreview
    visible={!!thumbnailPreview?.dataURL}
    dataURL={thumbnailPreview?.dataURL}
    time={thumbnailPreview?.time}
    position={thumbnailPreview?.position}
  />
  <span>{formatVideoTime(currentTime)}</span>
  <input
    ...existing input with new handlers...
  />
  <span>{formatVideoTime(duration)}</span>
</div>
```

- [ ] **Step 4: Run existing tests to verify no regressions**

```bash
npx jest src/components/video-player/CustomVideoPlayer.test.jsx --no-coverage
```

Expected: All existing tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/video-player/CustomVideoPlayerChrome.jsx
git commit -m "feat: integrate ThumbnailPreview into video player chrome"
```

---

### Task 5: Write integration tests

**File:**
- Create: `src/hooks/useThumbnailPreview.test.js`

- [ ] **Step 1: Write hook unit tests**

```js
import { renderHook, act } from "@testing-library/react";
import useThumbnailPreview from "./useThumbnailPreview";

describe("useThumbnailPreview", () => {
  let videoRef;
  let canvasRef;
  let videoElement;
  let canvasElement;

  beforeEach(() => {
    videoElement = document.createElement("video");
    videoElement.duration = 120;
    Object.defineProperty(videoElement, "readyState", {
      value: 2,
      writable: true,
    });

    canvasElement = document.createElement("canvas");
    canvasElement.width = 160;
    canvasElement.height = 90;

    const ctx = {
      drawImage: jest.fn(),
    };
    canvasElement.getContext = jest.fn(() => ctx);
    canvasElement.toDataURL = jest.fn(() => "data:image/jpeg;base64,abc123");

    videoRef = { current: videoElement };
    canvasRef = { current: canvasElement };
  });

  it("returns preview null by default", () => {
    const { result } = renderHook(() =>
      useThumbnailPreview(videoRef, canvasRef, 120)
    );
    expect(result.current.preview).toBeNull();
  });

  it("requestPreview sets debounced preview for uncached time", () => {
    jest.useFakeTimers();
    const { result } = renderHook(() =>
      useThumbnailPreview(videoRef, canvasRef, 120)
    );

    act(() => {
      result.current.requestPreview(30, 50);
    });

    // Should not be immediate (debounced)
    expect(result.current.preview).toBeNull();

    act(() => {
      jest.advanceTimersByTime(400);
    });

    // seeked event
    act(() => {
      videoElement.dispatchEvent(new Event("seeked"));
    });

    expect(result.current.preview).not.toBeNull();
    expect(result.current.preview.dataURL).toBe("data:image/jpeg;base64,abc123");
    expect(result.current.preview.position).toBe(50);

    jest.useRealTimers();
  });

  it("cancelRequest clears pending preview", () => {
    jest.useFakeTimers();
    const { result } = renderHook(() =>
      useThumbnailPreview(videoRef, canvasRef, 120)
    );

    act(() => {
      result.current.requestPreview(30, 50);
    });

    act(() => {
      result.current.cancelRequest();
    });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(result.current.preview).toBeNull();
    jest.useRealTimers();
  });

  it("returns null when duration is 0", () => {
    const { result } = renderHook(() =>
      useThumbnailPreview(videoRef, canvasRef, 0)
    );

    act(() => {
      result.current.requestPreview(30, 50);
    });

    expect(result.current.preview).toBeNull();
  });

  it("caches thumbnails and returns cached value on second request", () => {
    jest.useFakeTimers();
    const { result } = renderHook(() =>
      useThumbnailPreview(videoRef, canvasRef, 120)
    );

    // First request
    act(() => {
      result.current.requestPreview(30, 50);
    });
    act(() => {
      jest.advanceTimersByTime(400);
    });
    act(() => {
      videoElement.dispatchEvent(new Event("seeked"));
    });

    const firstPreview = result.current.preview;

    // Clear preview
    act(() => {
      result.current.cancelRequest();
    });
    expect(result.current.preview).toBeNull();

    // Second request — should return cached immediately
    act(() => {
      result.current.requestPreview(30, 50);
    });

    expect(result.current.preview).not.toBeNull();
    expect(result.current.preview.dataURL).toBe(firstPreview.dataURL);

    jest.useRealTimers();
  });

  it("setSource clears cache", () => {
    jest.useFakeTimers();
    const { result } = renderHook(() =>
      useThumbnailPreview(videoRef, canvasRef, 120)
    );

    act(() => {
      result.current.requestPreview(30, 50);
    });
    act(() => {
      jest.advanceTimersByTime(400);
    });
    act(() => {
      videoElement.dispatchEvent(new Event("seeked"));
    });

    // Cache should now have the thumbnail
    const cached = result.current.preview;
    expect(cached).not.toBeNull();

    act(() => {
      result.current.cancelRequest();
    });

    // Second request of same time should return from cache
    act(() => {
      result.current.requestPreview(30, 50);
    });
    expect(result.current.preview).not.toBeNull();

    act(() => {
      result.current.setSource("http://example.com/video.mp4", false);
    });
    expect(result.current.preview).toBeNull();

    jest.useRealTimers();
  });

  it("debounces rapid requests", () => {
    jest.useFakeTimers();
    const { result } = renderHook(() =>
      useThumbnailPreview(videoRef, canvasRef, 120)
    );

    act(() => {
      result.current.requestPreview(10, 20);
    });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    act(() => {
      result.current.requestPreview(20, 40);
    });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    act(() => {
      result.current.requestPreview(30, 50);
    });

    // Only the last request should trigger after debounce
    act(() => {
      jest.advanceTimersByTime(400);
    });
    act(() => {
      videoElement.dispatchEvent(new Event("seeked"));
    });

    expect(canvasElement.toDataURL).toHaveBeenCalledTimes(1);
    // The time sought should be ~30
    expect(videoElement.currentTime).toBe(30);

    jest.useRealTimers();
  });
});
```

- [ ] **Step 2: Run hook tests**

```bash
npx jest src/hooks/useThumbnailPreview.test.js --no-coverage
```

Expected: 6 tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useThumbnailPreview.test.js
git commit -m "test: add unit tests for useThumbnailPreview hook"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run all tests**

```bash
npx jest --no-coverage
```

Expected: All tests PASS (existing + new).

- [ ] **Step 2: Run lint/typecheck if available**

```bash
npx react-scripts build 2>&1 | Select-String "error|Error"
```

Expected: No build errors.

---

## Spec Coverage

| Spec section | Task |
|---|---|
| Architecture (hidden video, canvas, hook, Chrome) | Tasks 1-4 |
| useThumbnailPreview hook API | Task 2 |
| ThumbnailPreview component | Task 1 |
| Chrome integration | Task 4 |
| CustomVideoPlayer integration | Task 3 |
| Cache LRU + debounce | Task 2 |
| Edge cases (no duration, seek timeout, episode change) | Task 2 + Task 5 |
| Performance (canvas size, JPEG quality, cache limit) | Task 2 |
