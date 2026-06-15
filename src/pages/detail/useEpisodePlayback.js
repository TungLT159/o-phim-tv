import { useEffect, useState } from "react";
import Hls from "hls.js";
import {
  getEpisodeLink,
  prefetchEpisodeLink,
} from "../../utils/episodeLinkManager";

const PLAYBACK_LINK_ERROR = "Không tìm thấy link phát video.";
const PLAYBACK_VIDEO_ERROR = "Không thể phát video.";

const hlsConfig = {
  enableWorker: true,
  lowLatencyMode: false,
  maxBufferLength: 60,
  maxMaxBufferLength: 120,
  backBufferLength: 30,
};

export const useEpisodePlayback = ({
  movieId,
  episode,
  nextEpisode,
  videoRef,
}) => {
  const [playbackError, setPlaybackError] = useState(null);

  useEffect(() => {
    const video = videoRef.current;
    const episodeName = episode?.slug || episode?.name;

    if (!video || !movieId || !episodeName) {
      setPlaybackError(null);
      return undefined;
    }

    let isCancelled = false;
    let hls = null;
    let canPlayHandler = null;
    let hasPrefetchedNext = false;

    const prefetchNextEpisode = () => {
      const nextEpisodeName = nextEpisode?.slug || nextEpisode?.name;

      if (hasPrefetchedNext || !movieId || !nextEpisodeName) return;

      hasPrefetchedNext = true;
      prefetchEpisodeLink(
        movieId,
        nextEpisodeName,
        nextEpisode.episodeGroupIndex,
      ).catch(() => {});
    };

    const playAndPrefetchNext = () => {
      if (isCancelled) return;

      video.play().catch(() => {});
      prefetchNextEpisode();
    };

    const loadVideoSource = async () => {
      setPlaybackError(null);
      if (isCancelled) return;

      try {
        const episodeLink = await getEpisodeLink(
          movieId,
          episodeName,
          episode.episodeGroupIndex,
        );

        if (isCancelled) return;

        const sourceUrl = episodeLink?.playlistUrl || episodeLink?.link_m3u8;

        if (!sourceUrl && !episodeLink?.link_embed) {
          setPlaybackError(PLAYBACK_LINK_ERROR);
          return;
        }

        if (sourceUrl && Hls.isSupported()) {
          video.removeAttribute("src");
          video.load();

          hls = new Hls(hlsConfig);
          hls.loadSource(sourceUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, playAndPrefetchNext);
          hls.on(Hls.Events.ERROR, (event, data) => {
            if (!isCancelled && data?.fatal) {
              setPlaybackError(PLAYBACK_VIDEO_ERROR);
            }
          });
          return;
        }

        const canPlayNativeHls =
          sourceUrl && video.canPlayType("application/vnd.apple.mpegurl");
        const playbackUrl = canPlayNativeHls ? sourceUrl : episodeLink?.link_embed;

        if (!playbackUrl) {
          setPlaybackError(PLAYBACK_LINK_ERROR);
          return;
        }

        video.src = playbackUrl;
        video.load();
        canPlayHandler = playAndPrefetchNext;
        video.addEventListener("canplay", canPlayHandler, { once: true });
      } catch (error) {
        if (!isCancelled) {
          setPlaybackError(PLAYBACK_VIDEO_ERROR);
        }
      }
    };

    void loadVideoSource();

    return () => {
      isCancelled = true;

      if (canPlayHandler) {
        video.removeEventListener("canplay", canPlayHandler);
      }

      if (hls) {
        hls.destroy();
      }
    };
  }, [movieId, episode, nextEpisode, videoRef]);

  return { playbackError };
};
