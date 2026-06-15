import React, { useCallback, useEffect, useRef, useState } from "react";
import { formatEpisodeDisplayName } from "../../utils/episodeDisplayName";
import {
  calculatePlaybackFps,
  getPlaybackQualitySnapshot,
} from "../../utils/videoPlaybackMetrics";
import CustomVideoPlayerChrome from "./CustomVideoPlayerChrome";
import "./custom-video-player.scss";

export const shouldUseNativeControls = () => {
  if (typeof window === "undefined" || !window.matchMedia) return false;

  const userAgent = window.navigator?.userAgent || "";
  const isKnownTvBrowser =
    /android tv|smart-tv|smarttv|googletv|tizen|webos|appletv|apple tv|roku|aft|fire tv|crkey/i.test(
      userAgent,
    );
  const maxTouchPoints = window.navigator?.maxTouchPoints || 0;
  const viewportWidth = window.innerWidth || 0;
  const viewportHeight = window.innerHeight || 0;
  const isLargeNonTouchScreen =
    maxTouchPoints === 0 && Math.max(viewportWidth, viewportHeight) >= 1280;

  if (isKnownTvBrowser || isLargeNonTouchScreen) return false;

  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(hover: none)").matches
  );
};

const shouldShowFpsDebug = () => {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debugFps") === "1";
};

const formatFpsMetric = (value) => {
  if (!Number.isFinite(value)) return "0.0";
  return value.toFixed(1);
};

const CustomVideoPlayer = ({
  videoRef,
  title,
  episodeName,
  episodeGroupTitle,
  canGoPrevEpisode = false,
  canGoNextEpisode = false,
  nextEpisodeName,
  showAutoPlayNotice = false,
  autoPlayCountdown = null,
  autoPlayDuration = 10,
  onPrevEpisode,
  onNextEpisode,
  onCancelAutoPlay,
}) => {
  const playerRef = useRef(null);
  const hideControlsTimerRef = useRef(null);
  const ignoreNextClickRef = useRef(false);
  const lastTapRef = useRef({ side: null, time: 0 });
  const seekFeedbackTimerRef = useRef(null);
  const timeUpdateFrameRef = useRef(null);
  const playbackQualitySnapshotRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [canUsePictureInPicture, setCanUsePictureInPicture] = useState(false);
  const [seekFeedback, setSeekFeedback] = useState(null);
  const [useNativeControls] = useState(shouldUseNativeControls);
  const [showFpsDebug] = useState(shouldShowFpsDebug);
  const [fpsDebugMetrics, setFpsDebugMetrics] = useState(null);

  const getVideo = useCallback(() => videoRef?.current, [videoRef]);

  const clearHideControlsTimer = useCallback(() => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = null;
    }
  }, []);

  const revealControls = useCallback(() => {
    const video = getVideo();
    setShowControls(true);
    clearHideControlsTimer();

    if (video && !video.paused) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  }, [clearHideControlsTimer, getVideo]);

  const togglePlay = useCallback(() => {
    const video = getVideo();
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => setHasError(true));
    } else {
      video.pause();
    }
  }, [getVideo]);

  const seekBy = useCallback(
    (seconds) => {
      const video = getVideo();
      if (!video) return;

      const nextTime = Math.min(
        Math.max(video.currentTime + seconds, 0),
        video.duration || 0,
      );
      video.currentTime = nextTime;
      setCurrentTime(nextTime);
      revealControls();
    },
    [getVideo, revealControls],
  );

  const showSeekFeedback = useCallback((side, label) => {
    if (seekFeedbackTimerRef.current) {
      clearTimeout(seekFeedbackTimerRef.current);
    }

    setSeekFeedback({ side, label });
    seekFeedbackTimerRef.current = setTimeout(() => {
      setSeekFeedback(null);
      seekFeedbackTimerRef.current = null;
    }, 650);
  }, []);

  const handleSurfaceTap = useCallback(
    (event) => {
      if (!playerRef.current) return;
      if (event.target.closest?.(".custom-video-player__chrome")) return;
      ignoreNextClickRef.current = true;

      const point = event.touches?.[0] || event.changedTouches?.[0] || event;
      if (typeof point.clientX !== "number") return;

      const bounds = playerRef.current.getBoundingClientRect();
      const side =
        point.clientX - bounds.left < bounds.width / 2 ? "left" : "right";
      const now = Date.now();
      const isDoubleTap =
        lastTapRef.current.side === side &&
        now - lastTapRef.current.time <= 300;

      if (isDoubleTap) {
        const seconds = side === "left" ? -10 : 10;
        seekBy(seconds);
        showSeekFeedback(side, seconds > 0 ? "+10s" : "-10s");
        lastTapRef.current = { side: null, time: 0 };
        return;
      }

      lastTapRef.current = { side, time: now };
      revealControls();
    },
    [revealControls, seekBy, showSeekFeedback],
  );

  const handleSurfaceClick = useCallback(() => {
    if (ignoreNextClickRef.current) {
      ignoreNextClickRef.current = false;
      return;
    }

    togglePlay();
  }, [togglePlay]);

  const handleSeek = useCallback(
    (event) => {
      const video = getVideo();
      if (!video) return;

      const nextTime = Number(event.target.value);
      video.currentTime = nextTime;
      setCurrentTime(nextTime);
    },
    [getVideo],
  );

  const toggleMute = useCallback(() => {
    const video = getVideo();
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, [getVideo]);

  const handleVolumeChange = useCallback(
    (event) => {
      const video = getVideo();
      if (!video) return;

      const nextVolume = Number(event.target.value);
      video.volume = nextVolume;
      video.muted = nextVolume === 0;
      setVolume(nextVolume);
      setIsMuted(video.muted);
    },
    [getVideo],
  );

  const toggleFullscreen = useCallback(() => {
    const player = playerRef.current;
    const video = getVideo();
    if (!player) return;

    if (!document.fullscreenElement) {
      if (player.requestFullscreen) {
        player.requestFullscreen();
      } else if (video?.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      } else {
        video?.requestFullscreen?.();
      }
    } else {
      document.exitFullscreen?.();
    }
  }, [getVideo]);

  const togglePictureInPicture = useCallback(() => {
    const video = getVideo();
    if (!document.pictureInPictureEnabled || !video?.requestPictureInPicture) {
      return;
    }

    const pictureInPictureRequest =
      document.pictureInPictureElement === video
        ? document.exitPictureInPicture?.()
        : video.requestPictureInPicture();

    pictureInPictureRequest?.catch?.(() => {});
  }, [getVideo]);

  const handleCenterPlayClick = useCallback(
    (event) => {
      event.stopPropagation();
      ignoreNextClickRef.current = false;
      togglePlay();
    },
    [togglePlay],
  );

  useEffect(() => {
    const video = getVideo();
    if (!video) return undefined;

    const syncPlayback = () => {
      setIsPlaying(!video.paused);
      revealControls();
    };
    const syncTime = () => {
      if (timeUpdateFrameRef.current) return;

      timeUpdateFrameRef.current = requestAnimationFrame(() => {
        setCurrentTime(video.currentTime || 0);
        timeUpdateFrameRef.current = null;
      });
    };
    const syncDuration = () => setDuration(video.duration || 0);
    const handleWaiting = () => setIsLoading(true);
    const handleReady = () => {
      setIsLoading(false);
      setHasError(false);
      setDuration(video.duration || 0);
    };
    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
    };
    const syncVolume = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    const handleEnterPictureInPicture = () => setIsPictureInPicture(true);
    const handleLeavePictureInPicture = () => setIsPictureInPicture(false);

    video.controls = useNativeControls;
    setCanUsePictureInPicture(
      Boolean(
        document.pictureInPictureEnabled && video.requestPictureInPicture,
      ),
    );
    syncVolume();

    video.addEventListener("play", syncPlayback);
    video.addEventListener("pause", syncPlayback);
    video.addEventListener("timeupdate", syncTime);
    video.addEventListener("durationchange", syncDuration);
    video.addEventListener("loadedmetadata", handleReady);
    video.addEventListener("canplay", handleReady);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("error", handleError);
    video.addEventListener("volumechange", syncVolume);
    video.addEventListener(
      "enterpictureinpicture",
      handleEnterPictureInPicture,
    );
    video.addEventListener(
      "leavepictureinpicture",
      handleLeavePictureInPicture,
    );

    return () => {
      video.removeEventListener("play", syncPlayback);
      video.removeEventListener("pause", syncPlayback);
      video.removeEventListener("timeupdate", syncTime);
      video.removeEventListener("durationchange", syncDuration);
      video.removeEventListener("loadedmetadata", handleReady);
      video.removeEventListener("canplay", handleReady);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("error", handleError);
      video.removeEventListener("volumechange", syncVolume);
      video.removeEventListener(
        "enterpictureinpicture",
        handleEnterPictureInPicture,
      );
      video.removeEventListener(
        "leavepictureinpicture",
        handleLeavePictureInPicture,
      );
      clearHideControlsTimer();
      if (timeUpdateFrameRef.current) {
        cancelAnimationFrame(timeUpdateFrameRef.current);
        timeUpdateFrameRef.current = null;
      }
      if (seekFeedbackTimerRef.current) {
        clearTimeout(seekFeedbackTimerRef.current);
      }
    };
  }, [clearHideControlsTimer, getVideo, revealControls, useNativeControls]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === playerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const tagName = event.target?.tagName;
      if (
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        event.target?.isContentEditable
      ) {
        return;
      }

      if (
        [" ", "ArrowLeft", "ArrowRight", "m", "M", "f", "F"].includes(event.key)
      ) {
        event.preventDefault();
      }

      switch (event.key) {
        case " ":
          togglePlay();
          break;
        case "ArrowLeft":
          seekBy(-10);
          break;
        case "ArrowRight":
          seekBy(10);
          break;
        case "m":
        case "M":
          toggleMute();
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [seekBy, toggleFullscreen, toggleMute, togglePlay]);

  useEffect(() => {
    if (!showFpsDebug) return undefined;

    const updatePlaybackMetrics = () => {
      const video = getVideo();
      const snapshot = getPlaybackQualitySnapshot(video);

      if (!snapshot) {
        setFpsDebugMetrics({ unsupported: true });
        return;
      }

      const metrics = calculatePlaybackFps(
        playbackQualitySnapshotRef.current,
        snapshot,
      );
      playbackQualitySnapshotRef.current = snapshot;

      if (metrics) {
        setFpsDebugMetrics(metrics);
      }
    };

    updatePlaybackMetrics();
    const intervalId = setInterval(updatePlaybackMetrics, 2000);

    return () => {
      clearInterval(intervalId);
      playbackQualitySnapshotRef.current = null;
    };
  }, [getVideo, showFpsDebug]);

  const fpsDebugOverlay = showFpsDebug ? (
    <div className="custom-video-player__fps-debug" aria-live="polite">
      <strong>FPS debug</strong>
      {fpsDebugMetrics?.unsupported ? (
        <span>Playback metrics unsupported</span>
      ) : fpsDebugMetrics ? (
        <>
          <span>FPS: {formatFpsMetric(fpsDebugMetrics.fps)}</span>
          <span>Drop: {formatFpsMetric(fpsDebugMetrics.droppedFps)} fps</span>
          <span>
            Frames: {fpsDebugMetrics.renderedFrames}/
            {fpsDebugMetrics.droppedFrames} dropped
          </span>
        </>
      ) : (
        <span>Collecting metrics…</span>
      )}
    </div>
  ) : null;

  if (useNativeControls) {
    return (
      <div
        ref={playerRef}
        className="custom-video-player custom-video-player--native"
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          controls
          controlsList="nodownload"
        >
          Trình duyệt của bạn không hỗ trợ video HTML5.
        </video>
        {fpsDebugOverlay}
      </div>
    );
  }

  const episodeLabel = episodeName
    ? [episodeGroupTitle, formatEpisodeDisplayName(episodeName)]
        .filter(Boolean)
        .join(" - ")
    : "";
  const nextEpisodeLabel = nextEpisodeName
    ? formatEpisodeDisplayName(nextEpisodeName)
    : "Tập tiếp theo";
  const shouldShowCustomAutoPlayNotice =
    showAutoPlayNotice && autoPlayCountdown !== null && onNextEpisode;

  return (
    <div
      ref={playerRef}
      className={`custom-video-player ${
        showControls || !isPlaying ? "is-active" : "is-idle"
      }`}
      onMouseMove={revealControls}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onTouchStart={handleSurfaceTap}
    >
      <video ref={videoRef} autoPlay playsInline controlsList="nodownload">
        Trình duyệt của bạn không hỗ trợ video HTML5.
      </video>

      <button
        className="custom-video-player__hit-area"
        type="button"
        onClick={handleSurfaceClick}
        aria-label={isPlaying ? "Tạm dừng" : "Phát"}
      />

      {seekFeedback && (
        <div
          className={`custom-video-player__seek-feedback custom-video-player__seek-feedback--${seekFeedback.side}`}
        >
          <span>{seekFeedback.label}</span>
        </div>
      )}

      {isLoading && !hasError && (
        <div className="custom-video-player__state custom-video-player__state--loading">
          <span className="custom-video-player__spinner" />
          <span>Đang tải video…</span>
        </div>
      )}

      {hasError && (
        <div className="custom-video-player__state custom-video-player__state--error">
          <i className="bx bx-error-circle" />
          <strong>Không thể phát video</strong>
          <span>Vui lòng thử lại sau hoặc chọn tập khác.</span>
        </div>
      )}

      {!isPlaying && !hasError && (
        <button
          className="custom-video-player__center-play"
          type="button"
          onClick={handleCenterPlayClick}
          aria-label="Phát video"
        >
          <i className="bx bx-play" />
        </button>
      )}

      {shouldShowCustomAutoPlayNotice && (
        <div className="custom-video-player__autoplay-card" role="status">
          <div className="custom-video-player__autoplay-copy">
            <span>Tiếp theo</span>
            <strong>{nextEpisodeLabel}</strong>
            <small>Tập sẽ tự phát sau ít giây nữa</small>
          </div>
          <div className="custom-video-player__autoplay-actions">
            <button
              className="custom-video-player__autoplay-action custom-video-player__autoplay-action--play"
              type="button"
              onClick={onNextEpisode}
              aria-label="Phát tập tiếp theo ngay"
              style={{ "--autoplay-duration": `${autoPlayDuration}s` }}
            >
              <span>Phát ngay</span>
            </button>
            <button
              className="custom-video-player__autoplay-action custom-video-player__autoplay-action--cancel"
              type="button"
              onClick={onCancelAutoPlay}
              aria-label="Hủy tự động phát"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {fpsDebugOverlay}

      <CustomVideoPlayerChrome
        title={title}
        episodeLabel={episodeLabel}
        episodeNavigation={{
          canGoPrevEpisode,
          canGoNextEpisode,
        }}
        playbackState={{
          showControls,
          isPlaying,
          currentTime,
          duration,
          volume,
          isMuted,
          isFullscreen,
          isPictureInPicture,
        }}
        canUsePictureInPicture={canUsePictureInPicture}
        onSeek={handleSeek}
        onTogglePlay={togglePlay}
        onSeekBackward={() => seekBy(-10)}
        onSeekForward={() => seekBy(10)}
        onPrevEpisode={onPrevEpisode}
        onNextEpisode={onNextEpisode}
        onToggleMute={toggleMute}
        onVolumeChange={handleVolumeChange}
        onTogglePictureInPicture={togglePictureInPicture}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  );
};

export default CustomVideoPlayer;
