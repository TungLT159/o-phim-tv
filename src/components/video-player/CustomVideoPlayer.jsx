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

const PLAYER_FOCUSABLE_SELECTOR = [
  ".custom-video-player__close-btn",
  ".custom-video-player__center-play",
  ".custom-video-player__chrome button:not(:disabled)",
  ".custom-video-player__autoplay-card button:not(:disabled)",
].join(", ");

const DIALOG_FOCUSABLE_SELECTOR = ".custom-video-player__episode-dialog button:not(:disabled)";

const getFocusableElements = (root, dialogOpen) => {
  if (!root) return [];
  const selector = dialogOpen ? DIALOG_FOCUSABLE_SELECTOR : PLAYER_FOCUSABLE_SELECTOR;
  return Array.from(root.querySelectorAll(selector)).filter((element) => {
    if (element.classList.contains("custom-video-player__hit-area")) return false;
    return !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true";
  });
};

const focusByOffset = (root, dialogOpen, offset) => {
  const focusables = getFocusableElements(root, dialogOpen);
  if (!focusables.length) return;

  const activeIndex = focusables.indexOf(document.activeElement);
  const nextIndex = activeIndex >= 0
    ? Math.min(Math.max(activeIndex + offset, 0), focusables.length - 1)
    : 0;
  focusables[nextIndex]?.focus();
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
  currentEpisode,
  onSelectEpisode,
  movieId,
  episode,
  autoFullscreen = false,
  onClose,
}) => {
  const internalVideoRef = useRef(null);
  const videoRef = externalVideoRef || internalVideoRef;
  const selfContained = Boolean(movieId && episode);
  const episodeName = externalEpisodeName || episode?.name;
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const toggleMute = useCallback(() => {
    const video = getVideo();
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
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
    const focusables = getFocusableElements(root, false);
    const preferred = focusables.find((element) =>
      element.classList.contains("custom-video-player__control-btn--play"),
    );
    (preferred || focusables[0])?.focus();
  }, []);

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
    const timer = setTimeout(focusFirstPlayerControl, 0);
    return () => clearTimeout(timer);
  }, [focusFirstPlayerControl]);



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
        [" ", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "m", "M"].includes(event.key)
      ) {
        event.preventDefault();
      }

      switch (event.key) {
        case "Enter": {
          const focused = document.activeElement;
          if (playerRef.current?.contains(focused) && focused !== document.body) {
            focused.click?.();
          } else {
            focusFirstPlayerControl();
          }
          break;
        }
        case " ":
          if (playerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) {
            document.activeElement.click?.();
          } else {
            togglePlay();
          }
          break;
        case "ArrowLeft":
        case "ArrowUp":
          revealControls();
          focusByOffset(playerRef.current, false, -1);
          break;
        case "ArrowRight":
        case "ArrowDown":
          revealControls();
          focusByOffset(playerRef.current, false, 1);
          break;
        case "m":
        case "M":
          toggleMute();
          break;
        case "Backspace":
          event.preventDefault();
          if (sidebarOpen) {
            closeSidebar();
          } else {
            onClose?.();
          }
          break;
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

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeSidebar, sidebarOpen, focusFirstPlayerControl, onClose, revealControls, toggleMute, togglePlay]);

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

    video.play().catch(() => {});

    let cancelled = false;
    let hls = null;
    let canPlayHandler = null;

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
          
          let manifestTimeout = setTimeout(() => {
            console.error('[CustomVideoPlayer] HLS manifest timeout, trying direct src');
            if (hls) { hls.destroy(); hls = null; }
            video.src = sourceUrl;
            video.load();
            video.play().catch((e) => console.error('[CustomVideoPlayer] direct play error:', e));
          }, 15000);
          
          hls.loadSource(sourceUrl);
          hls.attachMedia(video);
          
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
      if (hls) {
        hls.destroy();
      }
    };
  }, [selfContained, movieId, episode, videoRef]);

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
  const shouldShowCustomAutoPlayNotice =
    showAutoPlayNotice && autoPlayCountdown !== null && onNextEpisode;
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
          countdown={autoPlayCountdown}
          autoPlayDuration={autoPlayDuration}
          isVisible={shouldShowCustomAutoPlayNotice}
          onPlayNow={onNextEpisode}
          onCancel={onCancelAutoPlay}
        />
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
        episodes={episodes}
        onSeek={handleSeek}
        onTogglePlay={togglePlay}
        onSeekBackward={() => seekBy(-10)}
        onSeekForward={() => seekBy(10)}
        onPrevEpisode={onPrevEpisode}
        onNextEpisode={onNextEpisode}
        onToggleMute={toggleMute}
        onVolumeChange={handleVolumeChange}
        onTogglePictureInPicture={togglePictureInPicture}
        onOpenEpisodeList={hasEpisodeDialog ? () => setSidebarOpen(true) : undefined}
        autoPlayEnabled={autoPlayEnabled}
        onToggleAutoPlay={onToggleAutoPlay}
      />
    </div>
  );
};

export default CustomVideoPlayer;
