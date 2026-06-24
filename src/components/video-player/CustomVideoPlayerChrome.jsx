import React from "react";
import ThumbnailPreview from "./thumbnail-preview/ThumbnailPreview";

const formatVideoTime = (value) => {
  if (!Number.isFinite(value) || value <= 0) return "00:00";

  const totalSeconds = Math.floor(value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const PictureInPictureIcon = () => (
  <svg
    className="custom-video-player__picture-in-picture-icon"
    data-testid="picture-in-picture-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <rect
      className="custom-video-player__picture-in-picture-screen"
      x="3"
      y="5"
      width="18"
      height="14"
      rx="2"
    />
    <rect
      className="custom-video-player__picture-in-picture-window"
      x="13"
      y="12"
      width="6"
      height="4"
      rx="1"
    />
  </svg>
);

const CustomVideoPlayerChrome = ({
  title,
  episodeLabel,
  episodeNavigation,
  playbackState,
  onSeek,
  onSeekCommit,
  onTogglePlay,
  onSeekBackward,
  onPrevEpisode,
  onNextEpisode,
  onSeekForward,
  canUsePictureInPicture,
  onTogglePictureInPicture,
  episodes,
  onOpenEpisodeList,
  autoPlayEnabled,
  onToggleAutoPlay,
  onTimelineHover,
  onTimelineLeave,
  thumbnailPreview,
  seekPreviewTime,
}) => {
  const {
    showControls,
    isPlaying,
    currentTime,
    duration,
    isPictureInPicture,
  } = playbackState;
  const displayTime = seekPreviewTime !== null && seekPreviewTime !== undefined ? seekPreviewTime : currentTime;
  const displayPercent = duration > 0 ? (displayTime / duration) * 100 : 0;
  const canGoPrevEpisode = Boolean(episodeNavigation?.canGoPrevEpisode);
  const canGoNextEpisode = Boolean(episodeNavigation?.canGoNextEpisode);
  const hasEpisodeNavigation = Boolean(onPrevEpisode || onNextEpisode);
  const hasEpisodeList = Boolean(episodes?.length && onOpenEpisodeList);
  const hasAutoPlayToggle = typeof onToggleAutoPlay === "function";

  return (
    <div
      className="custom-video-player__chrome custom-video-player__chrome--pass-through"
      aria-hidden={!showControls && isPlaying}
    >
      <div className="custom-video-player__meta custom-video-player__meta--pass-through">
        <span>{title || "Đang xem phim"}</span>
        {episodeLabel && <strong>{episodeLabel}</strong>}
      </div>

      <div className="custom-video-player__progress-row" style={{ position: "relative" }}>
        <ThumbnailPreview
          visible={!!thumbnailPreview?.dataURL}
          dataURL={thumbnailPreview?.dataURL}
          time={thumbnailPreview?.time}
          position={thumbnailPreview?.position}
        />
        <span>{formatVideoTime(displayTime)}</span>
        <input
          className="custom-video-player__progress"
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={displayTime}
          onChange={onSeek}
          onMouseUp={onSeekCommit}
          onTouchEnd={onSeekCommit}
          onKeyUp={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") {
              onSeekCommit?.(e);
            }
          }}
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
          style={{ "--progress": `${displayPercent}%` }}
        />
        <span>{formatVideoTime(duration)}</span>
      </div>

      <div className="custom-video-player__controls custom-video-player__controls--primary">
        <button
          className="custom-video-player__control-btn custom-video-player__control-btn--play"
          data-tv-focusable="true"
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? "Tạm dừng" : "Phát"}
        >
          <i className={`bx ${isPlaying ? "bx-pause" : "bx-play"}`} />
        </button>
        <button
          className="custom-video-player__control-btn custom-video-player__control-btn--rewind"
          data-tv-focusable="true"
          type="button"
          onClick={onSeekBackward}
          aria-label="Tua lùi 10 giây"
        >
          <i className="bx bx-rewind" />
          <span>10</span>
        </button>
        <button
          className="custom-video-player__control-btn custom-video-player__control-btn--forward"
          data-tv-focusable="true"
          type="button"
          onClick={onSeekForward}
          aria-label="Tua tới 10 giây"
        >
          <i className="bx bx-fast-forward" />
          <span>10</span>
        </button>
        {hasEpisodeNavigation && (
          <button
            className="custom-video-player__control-btn custom-video-player__control-btn--episode"
            data-tv-focusable="true"
            type="button"
            onClick={onPrevEpisode}
            disabled={!canGoPrevEpisode}
            aria-label="Tập trước"
          >
            <i className="bx bx-skip-previous" />
            <span>Tập trước</span>
          </button>
        )}
        {hasEpisodeNavigation && (
          <button
            className="custom-video-player__control-btn custom-video-player__control-btn--episode"
            data-tv-focusable="true"
            type="button"
            onClick={onNextEpisode}
            disabled={!canGoNextEpisode}
            aria-label="Tập tiếp"
          >
            <span>Tập tiếp</span>
            <i className="bx bx-skip-next" />
          </button>
        )}
        {hasEpisodeList && (
          <button
            className="custom-video-player__control-btn custom-video-player__control-btn--episode-list"
            data-tv-focusable="true"
            type="button"
            onClick={onOpenEpisodeList}
            aria-label="Danh sách tập"
          >
            <i className="bx bx-list-ul" />
            <span>Tập phim</span>
          </button>
        )}
        {hasAutoPlayToggle && (
          <button
            className={`custom-video-player__control-btn custom-video-player__control-btn--autoplay ${autoPlayEnabled ? "is-enabled" : ""}`}
            data-tv-focusable="true"
            type="button"
            onClick={onToggleAutoPlay}
            aria-label={autoPlayEnabled ? "Tắt tự động phát" : "Bật tự động phát"}
            aria-pressed={Boolean(autoPlayEnabled)}
          >
            <i className={`bx ${autoPlayEnabled ? "bx-toggle-right" : "bx-toggle-left"}`} />
            <span>Tự phát</span>
          </button>
        )}
        {canUsePictureInPicture && (
          <button
            className="custom-video-player__control-btn custom-video-player__control-btn--picture-in-picture"
            data-tv-focusable="true"
            type="button"
            onClick={onTogglePictureInPicture}
            aria-label={
              isPictureInPicture ? "Thoát hình trong hình" : "Hình trong hình"
            }
          >
            <PictureInPictureIcon />
          </button>
        )}
      </div>
    </div>
  );
};

export default CustomVideoPlayerChrome;
