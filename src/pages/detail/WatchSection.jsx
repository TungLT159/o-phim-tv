import EpisodeScroll from "../../components/episode-scroll/EpisodeScroll";
import CustomVideoPlayer, {
  shouldUseNativeControls,
} from "../../components/video-player/CustomVideoPlayer";
import { formatEpisodeDisplayName } from "../../utils/episodeDisplayName";
import { formatTime } from "../../utils/watchHistoryManager";
import DownloadButton from "../../components/download-button/DownloadButton";

const WatchSection = ({
  item,
  videoRef,
  videoSource,
  playbackError,
  episodeList,
  episodeGroups,
  currentEpisode,
  currentEpisodeIndex,
  currentEpisodeDisplayName,
  autoPlayEnabled,
  showAutoPlayNotice,
  autoPlayCountdown,
  showContinueWatching,
  savedProgress,
  onToggleAutoPlay,
  onPrevEpisode,
  onNextEpisode,
  onCancelAutoPlay,
  onContinueWatching,
  onStartFromBeginning,
  onSelectEpisode,
}) => {
  const canGoPrevEpisode = currentEpisodeIndex > 0;
  const canGoNextEpisode =
    currentEpisodeIndex !== -1 && currentEpisodeIndex < episodeList.length - 1;
  const nextEpisode = canGoNextEpisode
    ? episodeList[currentEpisodeIndex + 1]
    : null;
  const useLegacyEpisodeUi = shouldUseNativeControls();

  return (
    <div className="watch-section">
      <div className="video-player">
        <div
          className="video-wrapper"
          data-playback-error={playbackError || undefined}
        >
          {item.episode_current === "Trailer" ? (
            <iframe
              src={videoSource}
              title="video-player"
              frameBorder="0"
              allowFullScreen
            ></iframe>
          ) : (
            <CustomVideoPlayer
              videoRef={videoRef}
              title={item.title || item.name}
              episodeName={currentEpisode?.name}
              episodeGroupTitle={currentEpisode?.episodeGroupTitle}
              canGoPrevEpisode={canGoPrevEpisode}
              canGoNextEpisode={canGoNextEpisode}
              nextEpisodeName={nextEpisode?.name}
              showAutoPlayNotice={showAutoPlayNotice}
              autoPlayCountdown={autoPlayCountdown}
              autoPlayDuration={10}
              autoPlayEnabled={autoPlayEnabled}
              onPrevEpisode={onPrevEpisode}
              onNextEpisode={onNextEpisode}
              onCancelAutoPlay={onCancelAutoPlay}
              onToggleAutoPlay={onToggleAutoPlay}
              episodes={episodeList}
              episodeGroups={episodeGroups}
              currentEpisode={currentEpisode}
              onSelectEpisode={onSelectEpisode}
            />
          )}
        </div>
        {playbackError && (
          <p className="playback-error" role="alert">
            {playbackError}
          </p>
        )}
      </div>
      <div className="download-section">
        <DownloadButton item={item} currentEpisode={currentEpisode} />
      </div>
      {item.episode_current !== "Trailer" && episodeList.length > 0 && (
        <>
          {/* Auto-play Toggle */}
          <div className="autoplay-toggle-container">
            <label className="autoplay-toggle">
              <input
                type="checkbox"
                checked={autoPlayEnabled}
                onChange={onToggleAutoPlay}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">
                <i className="bx bx-play-circle"></i>
                Tự động phát tập tiếp theo
              </span>
            </label>
          </div>

          {useLegacyEpisodeUi && (
            <>
              {/* Next/Prev Episode Navigation */}
              <div className="episode-navigation">
                <button
                  className="episode-nav-btn prev"
                  onClick={onPrevEpisode}
                  disabled={!canGoPrevEpisode}
                >
                  <i className="bx bx-chevron-left"></i>
                  <span>Tập trước</span>
                </button>

                <div className="current-episode-info">
                  <span className="episode-label">Đang xem:</span>
                  <span className="episode-number">
                    {currentEpisodeDisplayName}
                  </span>
                </div>

                <button
                  className="episode-nav-btn next"
                  onClick={onNextEpisode}
                  disabled={!canGoNextEpisode}
                >
                  <span>Tập tiếp</span>
                  <i className="bx bx-chevron-right"></i>
                </button>
              </div>
            </>
          )}

          {/* Auto-play Notice */}
          {useLegacyEpisodeUi &&
            showAutoPlayNotice &&
            autoPlayCountdown !== null && (
              <div className="autoplay-notice">
                <div className="autoplay-content">
                  <i className="bx bx-play-circle"></i>
                  <div className="autoplay-text">
                    <p className="autoplay-title">Tự động phát tập tiếp theo</p>
                    <p className="autoplay-countdown">
                      {formatEpisodeDisplayName(nextEpisode?.name)} sẽ phát sau{" "}
                      {autoPlayCountdown} giây
                    </p>
                  </div>
                  <button
                    className="autoplay-cancel"
                    onClick={onCancelAutoPlay}
                  >
                    <i className="bx bx-x"></i>
                    Hủy
                  </button>
                </div>
                <div className="autoplay-progress">
                  <div
                    className="autoplay-progress-bar"
                    style={{
                      width: `${((10 - autoPlayCountdown) / 10) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}

          {/* Continue Watching Notice */}
          {showContinueWatching && savedProgress && (
            <div className="continue-watching-notice">
              <div className="continue-watching-content">
                <i className="bx bx-time-five"></i>
                <div className="continue-watching-text">
                  <p className="continue-watching-title">
                    Tiếp tục xem từ {formatTime(savedProgress.currentTime)}?
                  </p>
                  <p className="continue-watching-info">
                    Bạn đã xem đến {Math.round(savedProgress.percentage)}% của
                    tập này
                  </p>
                </div>
                <div className="continue-watching-actions">
                  <button className="continue-btn" onClick={onContinueWatching}>
                    <i className="bx bx-play"></i>
                    Tiếp tục
                  </button>
                  <button
                    className="restart-btn"
                    onClick={onStartFromBeginning}
                  >
                    <i className="bx bx-revision"></i>
                    Xem lại từ đầu
                  </button>
                </div>
              </div>
            </div>
          )}

          <EpisodeScroll
            episodes={episodeList}
            episodeGroups={episodeGroups}
            currentEpisode={currentEpisode}
            onSelectEpisode={onSelectEpisode}
          />
        </>
      )}
    </div>
  );
};

export default WatchSection;
