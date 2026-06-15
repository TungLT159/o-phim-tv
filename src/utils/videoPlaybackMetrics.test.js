import {
  calculatePlaybackFps,
  getPlaybackQualitySnapshot,
} from "./videoPlaybackMetrics";

test("calculates playback fps and dropped frame percentage", () => {
  const previous = {
    timestamp: 1000,
    totalVideoFrames: 120,
    droppedVideoFrames: 3,
  };
  const current = {
    timestamp: 3000,
    totalVideoFrames: 180,
    droppedVideoFrames: 6,
  };

  expect(calculatePlaybackFps(previous, current)).toEqual({
    fps: 30,
    droppedFps: 1.5,
    droppedFramePercent: 5,
    renderedFrames: 60,
    droppedFrames: 3,
    elapsedSeconds: 2,
  });
});

test("returns null when playback quality is unavailable", () => {
  expect(getPlaybackQualitySnapshot({})).toBeNull();
});

test("reads playback quality from a video element", () => {
  const video = {
    getVideoPlaybackQuality: () => ({
      totalVideoFrames: 240,
      droppedVideoFrames: 12,
    }),
  };

  const snapshot = getPlaybackQualitySnapshot(video, 5000);

  expect(snapshot).toEqual({
    timestamp: 5000,
    totalVideoFrames: 240,
    droppedVideoFrames: 12,
  });
});
