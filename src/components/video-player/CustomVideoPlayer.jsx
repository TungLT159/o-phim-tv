import React, { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { formatEpisodeDisplayName } from "../../utils/episodeDisplayName";
import {
  calculatePlaybackFps,
  getPlaybackQualitySnapshot,
} from "../../utils/videoPlaybackMetrics";
import {
  getEpisodeLink,
} from "../../utils/episodeLinkManager";
import CustomVideoPlayerChrome from "./CustomVideoPlayerChrome";
import EpisodeSidebar from "./episode-sidebar/EpisodeSidebar";
import InfoOverlay from "./info-overlay/InfoOverlay";
import AutoplayCard from "./autoplay-card/AutoplayCard";
import SeekTooltip from './seek-tooltip/SeekTooltip';
import useThumbnailPreview from "../../hooks/useThumbnailPreview";
import "./custom-video-player.scss";

export const shouldUseNativeControls = () => {
  return false;
};

const shouldShowFpsDebug = () => {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debugFps") === "1";
};

const formatFpsMetric = (value) => {
  if (!Number.isFinite(value)) return "0.0";
  return value.toFixed(1);
};

const focusElement = (root, selector) => {
  const el = root?.querySelector(selector);
  if (el && !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true") {
    el.focus();
    return true;
  }
  return false;
};

const isVisibleFocusable = (element) => {
  if (!element || element.hasAttribute("disabled") || element.getAttribute("aria-hidden") === "true") {
    return false;
  }

  return element.offsetParent !== null || element.getClientRects?.().length > 0 || process.env.NODE_ENV === "test";
};

const getCenter = (element) => {
  if (!element) return null;

  const rect = element.getBoundingClientRect?.();
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
};

const moveFocusByPosition = (elements, direction) => {
  if (!elements.length) return;

  const currentIndex = elements.indexOf(document.activeElement);
  const currentElement = currentIndex >= 0 ? elements[currentIndex] : null;
  const currentCenter = getCenter(currentElement);

  if (currentCenter) {
    const candidates = elements
      .filter((element) => element !== currentElement)
      .map((element) => {
        const center = getCenter(element);
        if (!center) return null;
        const currentRow = Number(currentElement?.dataset?.focusRow);
        const targetRow = Number(element?.dataset?.focusRow);
        return {
          element,
          sameFocusRow: Number.isFinite(currentRow) && currentRow === targetRow,
          dx: center.x - currentCenter.x,
          dy: center.y - currentCenter.y,
        };
      })
      .filter(Boolean)
      .filter(({ dx, dy }) => {
        if (direction === "ArrowDown") return dy > 1;
        if (direction === "ArrowUp") return dy < -1;
        if (direction === "ArrowRight") return dx > 1;
        if (direction === "ArrowLeft") return dx < -1;
        return false;
      })
      .sort((a, b) => {
        const aPrimary = direction === "ArrowDown" || direction === "ArrowUp" ? Math.abs(a.dy) : Math.abs(a.dx);
        const bPrimary = direction === "ArrowDown" || direction === "ArrowUp" ? Math.abs(b.dy) : Math.abs(b.dx);
        const aSecondary = direction === "ArrowDown" || direction === "ArrowUp" ? Math.abs(a.dx) : Math.abs(a.dy);
        const bSecondary = direction === "ArrowDown" || direction === "ArrowUp" ? Math.abs(b.dx) : Math.abs(b.dy);
        return aPrimary - bPrimary || aSecondary - bSecondary;
      });

    const candidate =
      direction === "ArrowLeft" || direction === "ArrowRight"
        ? candidates.find(({ sameFocusRow }) => sameFocusRow)
        : candidates[0];

    if (candidate) {
      candidate.element.focus();
      return;
    }
  }

  const nextIndex = currentIndex < 0
    ? 0
    : Math.min(Math.max(currentIndex + (direction === "ArrowUp" || direction === "ArrowLeft" ? -1 : 1), 0), elements.length - 1);
  elements[nextIndex]?.focus();
};

const CustomVideoPlayer = ({
  videoRef: externalVideoRef,
  title,
  episodeName: externalEpisodeName,
  episodeGroupTitle,
  canGoPrevEpisode = false,
  canGoNextEpisode = false,
  nextEpisodeName,
  showAutoPlayNotice = false,
  autoPlayCountdown = null,
  autoPlayDuration = 10,
  autoPlayEnabled = false,
  onPrevEpisode,
  onNextEpisode,
  onCancelAutoPlay,
  onToggleAutoPlay,
  episodes = [],
  episodeGroups = [],
  currentEpisode,
  onSelectEpisode,
  movieId,
  episode,
  autoFullscreen = false,
  onClose,
}) => {
  const internalVideoRef = useRef(null);
  const videoRef = externalVideoRef || internalVideoRef;
  const thumbnailVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const selfContained = Boolean(movieId && episode);
  const episodeName = externalEpisodeName || episode?.name;
  const episodeIdentity = episode?.episodeKey || episode?.slug || episodeName || "";
  const previousEpisodeIdentityRef = useRef(episodeIdentity);
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [seekTooltip, setSeekTooltip] = useState({
    visible: false,
    currentTime: 0,
    position: 0,
  });
  const seekAccelerationRef = useRef({
    startTime: null,
    intervalId: null,
  });
  const tvAutoPlayTimerRef = useRef(null);
  const tvAutoPlayTriggeredRef = useRef(false);
  const nextEpisodeTriggeredRef = useRef(false);
  const resumeAfterSeekRef = useRef(null);
  const seekWasPlayingRef = useRef(false);
  const remoteSeekActiveRef = useRef(false);
  const [tvAutoPlayCountdown, setTvAutoPlayCountdown] = useState(null);
  const [seekPreviewTime, setSeekPreviewTime] = useState(null);
  const isSeekingRef = useRef(false);
  const seekTargetRef = useRef(0);

  const {
    preview: thumbnailPreview,
    requestPreview: requestThumbnail,
    cancelRequest: cancelThumbnail,
    setSource: setThumbnailSource,
  } = useThumbnailPreview(thumbnailVideoRef, canvasRef, duration);

  const getVideo = useCallback(() => videoRef?.current, [videoRef]);

  const stopAndClearVideo = useCallback((video) => {
    if (!video) return;

    video.pause?.();
    video.removeAttribute?.("src");
    video.load?.();
  }, []);

  const clearTvAutoPlayTimer = useCallback(() => {
    if (tvAutoPlayTimerRef.current) {
      clearInterval(tvAutoPlayTimerRef.current);
      tvAutoPlayTimerRef.current = null;
    }
    setTvAutoPlayCountdown(null);
  }, []);

  const triggerNextEpisodeOnce = useCallback(() => {
    if (nextEpisodeTriggeredRef.current) return false;
    nextEpisodeTriggeredRef.current = true;
    clearTvAutoPlayTimer();
    onNextEpisode?.();
    return true;
  }, [clearTvAutoPlayTimer, onNextEpisode]);

  const updateSeekTooltip = useCallback((time) => {
    const video = getVideo();
    if (!video || !video.duration) return;
    
    const position = (time / video.duration) * 100;
    setSeekTooltip({
      visible: true,
      currentTime: time,
      position,
    });
  }, [getVideo]);

  const hideSeekTooltip = useCallback(() => {
    setSeekTooltip(prev => ({ ...prev, visible: false }));
  }, []);

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

  const clearResumeAfterSeek = useCallback(() => {
    const pending = resumeAfterSeekRef.current;
    if (pending) {
      pending.video.removeEventListener("seeked", pending.handler);
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
      pending.restore(false);
      resumeAfterSeekRef.current = null;
    }
  }, []);

  useEffect(() => {
    const video = videoRef?.current;
    return () => {
      clearResumeAfterSeek();
      clearTvAutoPlayTimer();
      stopAndClearVideo(video);
    };
  }, [clearResumeAfterSeek, clearTvAutoPlayTimer, stopAndClearVideo, videoRef]);

  const seekToTime = useCallback(
    (time, { resumePlayback = false, forceResumePlayback = false } = {}) => {
      const video = getVideo();
      if (!video) return null;

      clearResumeAfterSeek();

      const dur = video.duration || duration || 0;
      const nextTime = Math.min(Math.max(Number(time) || 0, 0), dur);
      const previousVolume = video.volume;
      const wasMuted = video.muted;
      const shouldResume = resumePlayback && (forceResumePlayback || !video.paused);

      if (shouldResume) {
        let restored = false;
        const restoreAudioState = (shouldPlay) => {
          if (restored) return;
          restored = true;
          video.volume = previousVolume;
          video.muted = wasMuted;
          if (resumeAfterSeekRef.current?.timeoutId) {
            clearTimeout(resumeAfterSeekRef.current.timeoutId);
          }
          resumeAfterSeekRef.current = null;
          if (shouldPlay) {
            video.play?.().catch?.(() => setHasError(true));
          }
        };

        const resumePlaybackAfterSeek = () => {
          restoreAudioState(true);
        };

        const fallbackTimeoutId = setTimeout(() => {
          video.removeEventListener("seeked", resumePlaybackAfterSeek);
          restoreAudioState(true);
        }, 1200);

        resumeAfterSeekRef.current = {
          video,
          handler: resumePlaybackAfterSeek,
          previousVolume,
          wasMuted,
          timeoutId: fallbackTimeoutId,
          restore: restoreAudioState,
        };
        video.addEventListener("seeked", resumePlaybackAfterSeek, { once: true });
        video.pause?.();
        video.muted = true;
        video.volume = 0;
      }

      video.currentTime = nextTime;
      if (!shouldResume) {
        video.volume = previousVolume;
        video.muted = wasMuted;
      }
      return nextTime;
    },
    [clearResumeAfterSeek, duration, getVideo],
  );

  const seekBy = useCallback(
    (seconds) => {
      const video = getVideo();
      if (!video) return;

      const nextTime = seekToTime(video.currentTime + seconds, { resumePlayback: true });
      if (nextTime === null) return;
      setCurrentTime(nextTime);
      updateSeekTooltip(nextTime);
      setShowControls(true);
      revealControls();
    },
    [getVideo, revealControls, seekToTime, updateSeekTooltip],
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

  const commitSeek = useCallback(
    (time) => {
      const nextTime = seekToTime(time, { resumePlayback: true });
      if (nextTime === null) return;
      setCurrentTime(nextTime);
      setSeekPreviewTime(null);
      setShowControls(true);
      revealControls();
    },
    [revealControls, seekToTime],
  );

  const handleSeekPreview = useCallback(
    (event) => {
      const nextTime = Number(event.target.value);
      setSeekPreviewTime(nextTime);
      setShowControls(true);
      revealControls();
    },
    [revealControls],
  );

  const handleSeekCommit = useCallback(
    (event) => {
      commitSeek(event.target.value);
    },
    [commitSeek],
  );

  const handleTimelineHover = useCallback(
    (time, positionPercent) => {
      requestThumbnail(time, positionPercent);
    },
    [requestThumbnail],
  );

  const handleTimelineLeave = useCallback(() => {
    cancelThumbnail();
  }, [cancelThumbnail]);

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

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    revealControls();
  }, [revealControls]);

  const handleEpisodeSelect = useCallback(
    (selectedEpisode) => {
      onSelectEpisode?.(selectedEpisode);
      closeSidebar();
    },
    [closeSidebar, onSelectEpisode],
  );

  const focusFirstPlayerControl = useCallback(() => {
    const root = playerRef.current;
    if (!root) return;
    const centerPlayBtn = root.querySelector(".custom-video-player__center-play");
    if (isVisibleFocusable(centerPlayBtn)) {
      centerPlayBtn.focus();
      return;
    }

    const playBtn = root.querySelector(".custom-video-player__control-btn--play");
    if (playBtn && !playBtn.hasAttribute("disabled")) {
      playBtn.focus();
    }
  }, []);

  const moveControlFocus = useCallback((direction) => {
    const root = playerRef.current;
    if (!root) return;
    const buttons = Array.from(root.querySelectorAll(
      '.custom-video-player__controls button:not(:disabled)'
    )).filter(isVisibleFocusable);
    if (!buttons.length) return;
    const currentIndex = buttons.indexOf(document.activeElement);
    if (currentIndex >= 0) {
      const nextIndex = Math.min(Math.max(currentIndex + direction, 0), buttons.length - 1);
      buttons[nextIndex]?.focus();
    } else {
      buttons[0]?.focus();
    }
  }, []);

  const focusFirstSidebarControl = useCallback(() => {
    const sidebar = playerRef.current?.querySelector('.episode-sidebar');
    if (!sidebar) return false;

    const buttons = Array.from(sidebar.querySelectorAll('button:not(:disabled)'))
      .filter(isVisibleFocusable);
    const preferredButton = buttons.find((button) => button.classList?.contains('episode-sidebar__item'));
    const target = preferredButton || buttons[0];

    if (!target) return false;
    target.focus();
    return true;
  }, []);

  const focusTimeline = useCallback(() => {
    return focusElement(playerRef.current, ".custom-video-player__progress");
  }, []);

  const focusAutoplayCardButton = useCallback((direction) => {
    const root = playerRef.current;
    if (!root) return false;

    const autoplayCard = root.querySelector('.autoplay-card');
    if (!autoplayCard) return false;

    const buttons = Array.from(autoplayCard.querySelectorAll('button:not(:disabled)'))
      .filter(isVisibleFocusable);
    if (!buttons.length) return false;

    const currentIndex = buttons.indexOf(document.activeElement);
    if (currentIndex === -1) {
      buttons[0]?.focus();
      return true;
    }

    const nextIndex = direction > 0
      ? Math.min(currentIndex + 1, buttons.length - 1)
      : Math.max(currentIndex - 1, 0);
    buttons[nextIndex]?.focus();
    return true;
  }, []);

  const handleAutoplayCardKeyDown = useCallback((event) => {
    const root = playerRef.current;
    if (!root?.querySelector('.autoplay-card')) return false;

    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
      focusAutoplayCardButton(direction);
      return true;
    }

    if (event.key === "Enter" || event.key === " ") {
      const autoplayCard = root.querySelector('.autoplay-card');
      if (!autoplayCard.contains(document.activeElement)) {
        event.preventDefault();
        event.stopPropagation();
        focusAutoplayCardButton(0);
        return true;
      }
    }

    return false;
  }, [focusAutoplayCardButton]);

  const clearSeekAccelerationState = useCallback(() => {
    if (seekAccelerationRef.current.intervalId) {
      clearInterval(seekAccelerationRef.current.intervalId);
    }
    seekAccelerationRef.current.startTime = null;
    seekAccelerationRef.current.intervalId = null;
    remoteSeekActiveRef.current = false;
    seekWasPlayingRef.current = false;
    isSeekingRef.current = false;
    seekTargetRef.current = 0;
  }, []);

  const startSeekAcceleration = useCallback((direction) => {
    const video = getVideo();
    const dur = video?.duration || duration;
    if (!dur) return;
    if (seekAccelerationRef.current.startTime) return;
    if (seekAccelerationRef.current.intervalId) {
      clearInterval(seekAccelerationRef.current.intervalId);
      seekAccelerationRef.current.intervalId = null;
    }

    const startTime = Date.now();
    seekAccelerationRef.current.startTime = startTime;
    remoteSeekActiveRef.current = true;
    isSeekingRef.current = true;
    seekWasPlayingRef.current = !video.paused;
    seekTargetRef.current = video?.currentTime || 0;

    seekTargetRef.current = Math.min(Math.max(seekTargetRef.current + direction * 10, 0), dur);
    setSeekPreviewTime(seekTargetRef.current);
    updateSeekTooltip(seekTargetRef.current);

    seekAccelerationRef.current.intervalId = setInterval(() => {
      const elapsed = Date.now() - startTime;

      let stepSeconds;
      if (elapsed < 1000) stepSeconds = 10;
      else if (elapsed < 2000) stepSeconds = 25;
      else stepSeconds = 60;

      seekTargetRef.current = Math.min(Math.max(seekTargetRef.current + direction * stepSeconds, 0), dur);

      setSeekPreviewTime(seekTargetRef.current);
      updateSeekTooltip(seekTargetRef.current);

    }, 150);
  }, [getVideo, duration, updateSeekTooltip]);

  const stopSeekAcceleration = useCallback(() => {
    if (!remoteSeekActiveRef.current) return;

    if (seekAccelerationRef.current.intervalId) {
      clearInterval(seekAccelerationRef.current.intervalId);
    }

    const video = getVideo();
    const finalTarget = seekTargetRef.current;
    if (video && finalTarget >= 0) {
      seekToTime(finalTarget, {
        resumePlayback: true,
        forceResumePlayback: seekWasPlayingRef.current,
      });
      setCurrentTime(finalTarget);
    }

    clearSeekAccelerationState();

    setTimeout(() => {
      setSeekPreviewTime(null);
      hideSeekTooltip();
    }, 500);
  }, [clearSeekAccelerationState, getVideo, hideSeekTooltip, seekToTime]);

  useEffect(() => {
    const video = getVideo();
    if (!video) return undefined;

    const syncPlayback = () => {
      setIsPlaying(!video.paused);
      revealControls();
    };
    const syncTime = () => {
      const currentVideoTime = video.currentTime || 0;
      const videoDuration = video.duration || 0;

      if (
        selfContained &&
        autoPlayEnabled &&
        canGoNextEpisode &&
        videoDuration > 0 &&
        !tvAutoPlayTriggeredRef.current
      ) {
        const remainingTime = videoDuration - currentVideoTime;
        const watchedRatio = currentVideoTime / videoDuration;

        if (remainingTime <= 10 || watchedRatio >= 0.95) {
          tvAutoPlayTriggeredRef.current = true;
          setTvAutoPlayCountdown(10);
          tvAutoPlayTimerRef.current = setInterval(() => {
            setTvAutoPlayCountdown((prev) => {
              if (prev <= 1) {
                if (tvAutoPlayTimerRef.current) {
                  clearInterval(tvAutoPlayTimerRef.current);
                  tvAutoPlayTimerRef.current = null;
                }
                triggerNextEpisodeOnce();
                return null;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }

      if (timeUpdateFrameRef.current) return;

      timeUpdateFrameRef.current = requestAnimationFrame(() => {
        if (!isSeekingRef.current) {
          setCurrentTime(video.currentTime || 0);
        }
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
    const handleEnded = () => {
      if (selfContained && autoPlayEnabled && canGoNextEpisode && !tvAutoPlayTriggeredRef.current) {
        triggerNextEpisodeOnce();
      }
    };
    const handleEnterPictureInPicture = () => setIsPictureInPicture(true);
    const handleLeavePictureInPicture = () => setIsPictureInPicture(false);

    video.controls = useNativeControls;
    setCanUsePictureInPicture(
      Boolean(
        document.pictureInPictureEnabled && video.requestPictureInPicture,
      ),
    );

    video.addEventListener("play", syncPlayback);
    video.addEventListener("pause", syncPlayback);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("timeupdate", syncTime);
    video.addEventListener("durationchange", syncDuration);
    video.addEventListener("loadedmetadata", handleReady);
    video.addEventListener("canplay", handleReady);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("error", handleError);
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
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("timeupdate", syncTime);
      video.removeEventListener("durationchange", syncDuration);
      video.removeEventListener("loadedmetadata", handleReady);
      video.removeEventListener("canplay", handleReady);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("error", handleError);
      video.removeEventListener(
        "enterpictureinpicture",
        handleEnterPictureInPicture,
      );
      video.removeEventListener(
        "leavepictureinpicture",
        handleLeavePictureInPicture,
      );
      clearTvAutoPlayTimer();
      clearHideControlsTimer();
      if (timeUpdateFrameRef.current) {
        cancelAnimationFrame(timeUpdateFrameRef.current);
        timeUpdateFrameRef.current = null;
      }
      if (seekFeedbackTimerRef.current) {
        clearTimeout(seekFeedbackTimerRef.current);
      }
      clearSeekAccelerationState();
    };
  }, [autoPlayEnabled, canGoNextEpisode, clearHideControlsTimer, clearSeekAccelerationState, clearTvAutoPlayTimer, getVideo, revealControls, selfContained, triggerNextEpisodeOnce, useNativeControls]);

  useEffect(() => {
    if (previousEpisodeIdentityRef.current === episodeIdentity) {
      return;
    }

    previousEpisodeIdentityRef.current = episodeIdentity;
    tvAutoPlayTriggeredRef.current = false;
    nextEpisodeTriggeredRef.current = false;
    clearTvAutoPlayTimer();
    clearResumeAfterSeek();
    clearSeekAccelerationState();
    setCurrentTime(0);
    setDuration(0);
    setSeekPreviewTime(null);
    setSeekFeedback(null);
    hideSeekTooltip();
  }, [episodeIdentity, clearResumeAfterSeek, clearSeekAccelerationState, clearTvAutoPlayTimer, hideSeekTooltip]);

  const handleTvCancelAutoPlay = useCallback(() => {
    tvAutoPlayTriggeredRef.current = true;
    clearTvAutoPlayTimer();
    onCancelAutoPlay?.();
  }, [clearTvAutoPlayTimer, onCancelAutoPlay]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === playerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const timer = setTimeout(focusFirstPlayerControl, 0);
    return () => clearTimeout(timer);
  }, [focusFirstPlayerControl]);



  useEffect(() => {
    const handleKeyDown = (event) => {
      const isPlayerKeyEvent =
        event.target?.closest?.('.custom-video-player') ||
        playerRef.current?.contains(document.activeElement) ||
        Boolean(playerRef.current);
      if (!isPlayerKeyEvent) return;

      if (sidebarOpen) {
        const sidebar = playerRef.current?.querySelector('.episode-sidebar');
        const sidebarContainsFocus = Boolean(sidebar?.contains(document.activeElement));

        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
          event.preventDefault();
          event.stopPropagation();

          const items = Array.from(sidebar?.querySelectorAll('button:not(:disabled)') || [])
            .filter(isVisibleFocusable);

          if (!sidebarContainsFocus) {
            focusFirstSidebarControl();
          } else {
            moveFocusByPosition(items, event.key);
          }
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();

          if (sidebarContainsFocus) {
            document.activeElement?.click?.();
          } else {
            focusFirstSidebarControl();
          }
        } else if (event.key === "Backspace" || event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          closeSidebar();
        }
        return;
      }

      if (handleAutoplayCardKeyDown(event)) return;

      const activeElement = document.activeElement;
      const keyTarget = playerRef.current?.contains(activeElement) ? activeElement : event.target;
      const tagName = keyTarget?.tagName;
      const isTimelineFocused = keyTarget?.classList?.contains('custom-video-player__progress');
      if (
        !isTimelineFocused && (
          tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          keyTarget?.isContentEditable
        )
      ) {
        return;
      }

      const isInControls = document.activeElement?.closest('.custom-video-player__controls');
      const shouldUseControlNavigation = Boolean(isInControls);
      const isCloseBtn = document.activeElement?.closest('.custom-video-player__close-btn');
      const autoplayCard = document.activeElement?.closest('.autoplay-card');

      if (autoplayCard && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        const buttons = Array.from(autoplayCard.querySelectorAll('button:not(:disabled)'));
        const currentIndex = buttons.indexOf(document.activeElement);
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const nextIndex = Math.min(Math.max(currentIndex + direction, 0), buttons.length - 1);
        buttons[nextIndex]?.focus();
        return;
      }

      if (
        [" ", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      ) {
        event.preventDefault();
      }

      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) &&
        (!playerRef.current?.contains(document.activeElement) || (isPlaying && !showControls))
      ) {
        revealControls();
        focusFirstPlayerControl();
        return;
      }

      switch (event.key) {
        case "Enter":
        case " ": {
          if (playerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) {
            document.activeElement.click?.();
          } else {
            togglePlay();
          }
          break;
        }
        case "ArrowLeft":
          if (shouldUseControlNavigation) {
            moveControlFocus(-1);
          } else {
            startSeekAcceleration(-1);
          }
          revealControls();
          break;
        case "ArrowRight":
          if (shouldUseControlNavigation) {
            moveControlFocus(1);
          } else {
            startSeekAcceleration(1);
          }
          revealControls();
          break;
        case "ArrowUp":
          revealControls();
          if (isTimelineFocused) {
            const centerPlayBtn = playerRef.current?.querySelector(".custom-video-player__center-play");
            if (!isVisibleFocusable(centerPlayBtn)) {
              focusElement(playerRef.current, ".custom-video-player__close-btn");
            } else {
              centerPlayBtn.focus();
            }
          } else if (isInControls) {
            focusTimeline();
          } else if (isCloseBtn) {
            const cp = playerRef.current?.querySelector(".custom-video-player__center-play");
            if (cp && cp.offsetParent !== null) cp.focus();
          }
          break;
        case "ArrowDown":
          revealControls();
          if (isTimelineFocused) {
            focusElement(playerRef.current, ".custom-video-player__control-btn--play");
          } else if (isCloseBtn) {
            focusElement(playerRef.current, ".custom-video-player__progress");
          } else if (!isInControls) {
            focusElement(playerRef.current, ".custom-video-player__control-btn--play");
          }
          break;
        case "Backspace":
        case "Escape":
          event.preventDefault();
          if (sidebarOpen) {
            closeSidebar();
          } else {
            onClose?.();
          }
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        stopSeekAcceleration();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [closeSidebar, sidebarOpen, onClose, revealControls, togglePlay, startSeekAcceleration, stopSeekAcceleration, moveControlFocus, focusFirstPlayerControl, focusFirstSidebarControl, focusTimeline, handleAutoplayCardKeyDown, isPlaying, showControls]);

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

  const [selfPlaybackError, setSelfPlaybackError] = useState(null);

  useEffect(() => {
    if (!selfContained) return;

    const video = videoRef.current;
    const epName = episode?.slug || episode?.name;
    console.log('[CustomVideoPlayer] self-contained effect running', { selfContained, hasVideo: !!video, epName, movieId });
    
    if (!video || !epName) return;

    video.play?.()?.catch?.(() => {});

    let cancelled = false;
    let hls = null;
    let canPlayHandler = null;
    let manifestTimeout = null;

    const playAndPrefetch = () => {
      if (cancelled) return;
      console.log('[CustomVideoPlayer] playing video');
      video.play().catch((e) => console.error('[CustomVideoPlayer] play error:', e));
    };

    const loadSource = async () => {
      setSelfPlaybackError(null);
      setIsLoading(true);
      setHasError(false);
      
      try {
        let sourceUrl = episode?.link_m3u8;
        let embedUrl = episode?.link_embed;

        if (!sourceUrl && !embedUrl) {
          console.log('[CustomVideoPlayer] no direct link_m3u8 on episode, fetching via API...');
          const link = await getEpisodeLink(
            movieId,
            epName,
            episode.episodeGroupIndex,
          );
          console.log('[CustomVideoPlayer] got episode link', { hasPlaylist: !!link?.playlistUrl, hasM3u8: !!link?.link_m3u8, hasEmbed: !!link?.link_embed });
          if (cancelled) return;
          sourceUrl = link?.playlistUrl || link?.link_m3u8;
          embedUrl = link?.link_embed;
        } else {
          console.log('[CustomVideoPlayer] using direct link_m3u8 from episode', sourceUrl?.substring(0, 80));
        }

        if (!sourceUrl && !embedUrl) {
          setSelfPlaybackError("Không tìm thấy link phát video.");
          setIsLoading(false);
          return;
        }

        // Log video element state
        console.log('[CustomVideoPlayer] Video element state', {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          readyState: video.readyState,
          networkState: video.networkState
        });

        if (sourceUrl && Hls.isSupported()) {
          console.log('[CustomVideoPlayer] setting up HLS.js', sourceUrl.substring(0, 80));
          video.removeAttribute("src");
          video.load();

          hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            maxBufferLength: 60,
            maxMaxBufferLength: 120,
            backBufferLength: 30,
            // Thêm config để xử lý video tốt hơn
            debug: false,
            startPosition: -1,
            autoStartLoad: true,
            capLevelToPlayerSize: true,
          });
          
          manifestTimeout = setTimeout(() => {
            if (cancelled) return;
            console.error('[CustomVideoPlayer] HLS manifest timeout, trying direct src');
            if (hls) { hls.destroy(); hls = null; }
            video.src = sourceUrl;
            video.load();
            video.play().catch((e) => console.error('[CustomVideoPlayer] direct play error:', e));
          }, 15000);
          
          hls.loadSource(sourceUrl);
          hls.attachMedia(video);

          if (sourceUrl) {
            setThumbnailSource(sourceUrl, true);
          }

          hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            clearTimeout(manifestTimeout);
            console.log('[CustomVideoPlayer] HLS manifest parsed', {
              levels: data.levels?.length,
              firstLevel: data.levels?.[0],
              audioTracks: data.audioTracks?.length,
              hasVideo: data.levels?.some(l => l.videoCodec),
              hasAudio: data.levels?.some(l => l.audioCodec)
            });
            playAndPrefetch();
          });
          
          hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
            console.log('[CustomVideoPlayer] Level loaded', {
              level: data.level,
              details: {
                totalduration: data.details.totalduration,
                live: data.details.live,
                targetduration: data.details.targetduration
              }
            });
          });
          
          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('[CustomVideoPlayer] HLS error', {
              type: data.type,
              details: data.details,
              fatal: data.fatal,
              url: data.url,
              reason: data.reason,
              level: data.level
            });
            
            if (data.fatal) {
              clearTimeout(manifestTimeout);
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.error('[CustomVideoPlayer] Fatal network error, trying to recover');
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.error('[CustomVideoPlayer] Fatal media error, trying to recover');
                  hls.recoverMediaError();
                  break;
                default:
                  if (!cancelled) {
                    setSelfPlaybackError("Không thể phát video. Lỗi: " + (data.details || "Unknown"));
                  }
                  break;
              }
            }
          });
          return;
        }

        const nativeHls =
          sourceUrl && video.canPlayType("application/vnd.apple.mpegurl");
        const playbackUrl = nativeHls ? sourceUrl : embedUrl;

        console.log('[CustomVideoPlayer] native HLS fallback', { nativeHls, playbackUrl: playbackUrl?.substring(0, 80) });

        if (!playbackUrl) {
          setSelfPlaybackError("Không tìm thấy link phát video.");
          setIsLoading(false);
          return;
        }

        video.src = playbackUrl;
        video.load();
        if (playbackUrl) {
          setThumbnailSource(playbackUrl, false);
        }
        canPlayHandler = playAndPrefetch;
        video.addEventListener("canplay", canPlayHandler, { once: true });
      } catch (err) {
        console.error('[CustomVideoPlayer] load error:', err);
        if (!cancelled) {
          setSelfPlaybackError("Không thể phát video. Lỗi: " + (err.message || "Unknown"));
          setIsLoading(false);
        }
      }
    };

    loadSource();

    return () => {
      cancelled = true;
      if (canPlayHandler) {
        video.removeEventListener("canplay", canPlayHandler);
      }
      if (manifestTimeout) {
        clearTimeout(manifestTimeout);
      }
      if (hls) {
        hls.destroy();
      }
      stopAndClearVideo(video);
    };
  }, [selfContained, movieId, episode, videoRef, setThumbnailSource, stopAndClearVideo]);

  useEffect(() => {
    const video = videoRef?.current;
    if (!video || selfContained) return;
    const syncSource = () => {
      const src = video.src || video.currentSrc;
      if (src && src !== window.location.href) {
        const isHls = /\.m3u8($|\?)/.test(src) || video.canPlayType("application/vnd.apple.mpegurl");
        setThumbnailSource(src, Boolean(isHls));
      }
    };
    syncSource();
    video.addEventListener("loadedmetadata", syncSource, { once: true });
    return () => video.removeEventListener("loadedmetadata", syncSource);
  }, [selfContained, videoRef, setThumbnailSource]);

  useEffect(() => {
    if (!autoFullscreen) return;

    const timer = setTimeout(() => {
      const player = playerRef.current;
      if (!player) return;
      if (document.fullscreenElement) return;
      if (player.requestFullscreen) {
        player.requestFullscreen().catch((err) => {
          console.log('[CustomVideoPlayer] Fullscreen not supported or denied:', err);
        });
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [autoFullscreen]);

  const effectiveError = selfPlaybackError || hasError;

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
        {onClose && (
          <button
            className="custom-video-player__close-btn"
            type="button"
            onClick={onClose}
            aria-label="Quay lại"
          >
            <i className="bx bx-arrow-back" /> Quay lại
          </button>
        )}
        {fpsDebugOverlay}
      </div>
    );
  }

  const episodeLabel = episodeName
    ? [episodeGroupTitle, formatEpisodeDisplayName(episodeName)]
        .filter(Boolean)
        .join(" - ")
    : "";
  const effectiveAutoPlayCountdown = selfContained ? tvAutoPlayCountdown : autoPlayCountdown;
  const shouldShowCustomAutoPlayNotice =
    (showAutoPlayNotice || (selfContained && tvAutoPlayCountdown !== null)) &&
    effectiveAutoPlayCountdown !== null &&
    onNextEpisode;
  const effectiveCurrentEpisode = currentEpisode || episode;
  const hasEpisodeDialog = episodes.length > 0 && onSelectEpisode;

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
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        webkit-playsinline="true"
        controlsList="nodownload"
        preload="auto"
        crossOrigin="anonymous"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      >
        Trình duyệt của bạn không hỗ trợ video HTML5.
      </video>

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

      {onClose && (
        <button
          className="custom-video-player__close-btn"
          data-tv-focusable="true"
          type="button"
          onClick={onClose}
          aria-label="Quay lại"
        >
          <i className="bx bx-arrow-back" /> Quay lại
        </button>
      )}

      <EpisodeSidebar
        episodes={episodes}
        episodeGroups={episodeGroups}
        currentEpisode={effectiveCurrentEpisode}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        onSelectEpisode={handleEpisodeSelect}
      />

      <InfoOverlay
        title={title}
        episodeName={episodeLabel}
        description=""
        isVisible={!isPlaying && !effectiveError}
      />

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

      {isLoading && !effectiveError && (
        <div className="custom-video-player__state custom-video-player__state--loading">
          <span className="custom-video-player__spinner" />
          <span>Đang tải video…</span>
        </div>
      )}

      {effectiveError && (
        <div className="custom-video-player__state custom-video-player__state--error">
          <i className="bx bx-error-circle" />
          <strong>Không thể phát video</strong>
          <span>{effectiveError}</span>
        </div>
      )}

      {!isPlaying && !effectiveError && (
        <button
          className="custom-video-player__center-play"
          data-tv-focusable="true"
          type="button"
          onClick={handleCenterPlayClick}
          aria-label="Phát video"
        >
          <i className="bx bx-play" />
        </button>
      )}

      {shouldShowCustomAutoPlayNotice && (
        <AutoplayCard
          nextEpisode={{ name: nextEpisodeName }}
          countdown={effectiveAutoPlayCountdown}
          autoPlayDuration={autoPlayDuration}
          isVisible={shouldShowCustomAutoPlayNotice}
          onPlayNow={selfContained ? triggerNextEpisodeOnce : onNextEpisode}
          onCancel={selfContained ? handleTvCancelAutoPlay : onCancelAutoPlay}
        />
      )}

      {fpsDebugOverlay}

      <div className="custom-video-player__progress-wrapper">
        <SeekTooltip
          visible={seekTooltip.visible}
          currentTime={seekTooltip.currentTime}
          duration={duration}
          position={seekTooltip.position}
        />
      </div>

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
          isFullscreen,
          isPictureInPicture,
        }}
        canUsePictureInPicture={canUsePictureInPicture}
        episodes={episodes}
        onSeek={handleSeekPreview}
        onSeekCommit={handleSeekCommit}
        onTogglePlay={togglePlay}
        onSeekBackward={() => seekBy(-10)}
        onSeekForward={() => seekBy(10)}
        onPrevEpisode={onPrevEpisode}
        onNextEpisode={onNextEpisode}
        onTogglePictureInPicture={togglePictureInPicture}
        onOpenEpisodeList={hasEpisodeDialog ? () => setSidebarOpen(true) : undefined}
        autoPlayEnabled={autoPlayEnabled}
        onToggleAutoPlay={onToggleAutoPlay}
        onTimelineHover={handleTimelineHover}
        onTimelineLeave={handleTimelineLeave}
        thumbnailPreview={thumbnailPreview}
        seekPreviewTime={seekPreviewTime}
      />
    </div>
  );
};

export default CustomVideoPlayer;
