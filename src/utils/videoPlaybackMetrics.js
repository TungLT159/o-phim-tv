export const getPlaybackQualitySnapshot = (
  video,
  timestamp = performance.now(),
) => {
  if (!video?.getVideoPlaybackQuality) return null;

  const quality = video.getVideoPlaybackQuality();

  return {
    timestamp,
    totalVideoFrames: quality.totalVideoFrames || 0,
    droppedVideoFrames: quality.droppedVideoFrames || 0,
  };
};

export const calculatePlaybackFps = (previous, current) => {
  if (!previous || !current) return null;

  const elapsedSeconds = (current.timestamp - previous.timestamp) / 1000;
  if (elapsedSeconds <= 0) return null;

  const renderedFrames = Math.max(
    0,
    current.totalVideoFrames - previous.totalVideoFrames,
  );
  const droppedFrames = Math.max(
    0,
    current.droppedVideoFrames - previous.droppedVideoFrames,
  );
  return {
    fps: renderedFrames / elapsedSeconds,
    droppedFps: droppedFrames / elapsedSeconds,
    droppedFramePercent:
      renderedFrames > 0 ? (droppedFrames / renderedFrames) * 100 : 0,
    renderedFrames,
    droppedFrames,
    elapsedSeconds,
  };
};
