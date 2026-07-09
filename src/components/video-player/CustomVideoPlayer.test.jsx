import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CustomVideoPlayer from "./CustomVideoPlayer";
import { FocusProvider } from "../../context/FocusContext";
import { getEpisodeLink } from "../../utils/episodeLinkManager";

let mockHlsIsSupported = false;
let mockHlsInstances = [];

jest.mock("hls.js", () => {
  return {
    __esModule: true,
    default: class MockHls {
      constructor(config) {
        this.config = config;
        this.handlers = {};
        mockHlsInstances.push(this);
      }

      static isSupported() {
        return mockHlsIsSupported;
      }

      static Events = {
        MANIFEST_PARSED: "manifestParsed",
        LEVEL_LOADED: "levelLoaded",
        ERROR: "error",
      };

      static ErrorTypes = {
        NETWORK_ERROR: "networkError",
        MEDIA_ERROR: "mediaError",
      };

      loadSource = jest.fn();
      attachMedia = jest.fn();
      on = jest.fn((event, handler) => {
        this.handlers[event] = handler;
      });
      destroy = jest.fn();
      startLoad = jest.fn();
      recoverMediaError = jest.fn();
    },
  };
});

jest.mock("../../utils/episodeLinkManager", () => ({
  getEpisodeLink: jest.fn(),
}));

const originalMatchMedia = window.matchMedia;
const originalUserAgent = window.navigator.userAgent;
const originalMaxTouchPoints = window.navigator.maxTouchPoints;
const originalInnerWidth = window.innerWidth;
const originalInnerHeight = window.innerHeight;
const originalRequestAnimationFrame = window.requestAnimationFrame;
const originalCancelAnimationFrame = window.cancelAnimationFrame;
const originalMediaPlay = HTMLMediaElement.prototype.play;
const originalMediaPause = HTMLMediaElement.prototype.pause;
const originalMediaLoad = HTMLMediaElement.prototype.load;
const originalCanPlayType = HTMLMediaElement.prototype.canPlayType;
const originalVisibilityState = Object.getOwnPropertyDescriptor(
  document,
  "visibilityState",
);
const originalPictureInPictureEnabled = Object.getOwnPropertyDescriptor(
  document,
  "pictureInPictureEnabled",
);
const originalRequestPictureInPicture =
  HTMLVideoElement.prototype.requestPictureInPicture;

beforeEach(() => {
  mockHlsIsSupported = false;
  mockHlsInstances = [];
  getEpisodeLink.mockReset();
  HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
  HTMLMediaElement.prototype.pause = jest.fn();
  HTMLMediaElement.prototype.load = jest.fn();
});

afterEach(() => {
  jest.useRealTimers();
  window.history.pushState({}, "", "/");
  window.matchMedia = originalMatchMedia;
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: originalUserAgent,
  });
  Object.defineProperty(window.navigator, "maxTouchPoints", {
    configurable: true,
    value: originalMaxTouchPoints,
  });
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: originalInnerWidth,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: originalInnerHeight,
  });
  window.requestAnimationFrame = originalRequestAnimationFrame;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
  HTMLMediaElement.prototype.play = originalMediaPlay;
  HTMLMediaElement.prototype.pause = originalMediaPause;
  HTMLMediaElement.prototype.load = originalMediaLoad;
  HTMLMediaElement.prototype.canPlayType = originalCanPlayType;
  if (originalVisibilityState) {
    Object.defineProperty(document, "visibilityState", originalVisibilityState);
  } else {
    delete document.visibilityState;
  }
  if (originalPictureInPictureEnabled) {
    Object.defineProperty(
      document,
      "pictureInPictureEnabled",
      originalPictureInPictureEnabled,
    );
  } else {
    delete document.pictureInPictureEnabled;
  }
  if (originalRequestPictureInPicture) {
    HTMLVideoElement.prototype.requestPictureInPicture =
      originalRequestPictureInPicture;
  } else {
    delete HTMLVideoElement.prototype.requestPictureInPicture;
  }
});

const setDebugFpsQuery = () => {
  window.history.pushState({}, "", "?debugFps=1");
};

const setMediaProperty = (element, property, value) => {
  Object.defineProperty(element, property, {
    configurable: true,
    value,
    writable: true,
  });
};

const mockCoarsePointer = (matches) => {
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: query.includes("pointer: coarse") ? matches : false,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
};

const mockInputMedia = ({ coarsePointer = false, hoverNone = false } = {}) => {
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches:
      (query.includes("pointer: coarse") && coarsePointer) ||
      (query.includes("hover: none") && hoverNone),
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
};

const mockUserAgent = (userAgent) => {
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: userAgent,
  });
};

const mockViewport = ({ width, height, maxTouchPoints = 0 }) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });
  Object.defineProperty(window.navigator, "maxTouchPoints", {
    configurable: true,
    value: maxTouchPoints,
  });
};

const mockPictureInPictureSupport = ({
  documentEnabled = true,
  videoEnabled = true,
  requestPictureInPicture = jest.fn(() => Promise.resolve()),
} = {}) => {
  Object.defineProperty(document, "pictureInPictureEnabled", {
    configurable: true,
    value: documentEnabled,
  });

  if (videoEnabled) {
    HTMLVideoElement.prototype.requestPictureInPicture =
      requestPictureInPicture;
  } else {
    delete HTMLVideoElement.prototype.requestPictureInPicture;
  }
};

const renderWithFocusProvider = (ui) => render(<FocusProvider>{ui}</FocusProvider>);

const renderPlayer = () => {
  const videoRef = React.createRef();
  const view = render(
    <CustomVideoPlayer
      videoRef={videoRef}
      title="Test Movie"
      episodeName="1"
    />,
  );
  const video = view.container.querySelector("video");

  setMediaProperty(video, "duration", 120);
  setMediaProperty(video, "paused", true);
  video.play = jest.fn(() => {
    setMediaProperty(video, "paused", false);
    fireEvent(video, new Event("play"));
    return Promise.resolve();
  });
  video.pause = jest.fn(() => {
    setMediaProperty(video, "paused", true);
    fireEvent(video, new Event("pause"));
  });
  video.load = jest.fn();

  fireEvent(video, new Event("loadedmetadata"));

  return { ...view, video };
};

const renderPlayerWithEpisodeName = (episodeName) => {
  const videoRef = React.createRef();
  return render(
    <CustomVideoPlayer
      videoRef={videoRef}
      title="Test Movie"
      episodeName={episodeName}
    />,
  );
};

const renderPlayerWithEpisodeMeta = ({ episodeName, episodeGroupTitle }) => {
  const videoRef = React.createRef();
  return render(
    <CustomVideoPlayer
      videoRef={videoRef}
      title="Test Movie"
      episodeName={episodeName}
      episodeGroupTitle={episodeGroupTitle}
    />,
  );
};

const renderPlayerWithEpisodeControls = (props = {}) => {
  const videoRef = React.createRef();
  const defaultProps = {
    canGoPrevEpisode: true,
    canGoNextEpisode: true,
    nextEpisodeName: "2",
    onPrevEpisode: jest.fn(),
    onNextEpisode: jest.fn(),
    onCancelAutoPlay: jest.fn(),
  };
  const playerProps = { ...defaultProps, ...props };
  const view = render(
    <CustomVideoPlayer
      videoRef={videoRef}
      title="Test Movie"
      episodeName="1"
      {...playerProps}
    />,
  );

  return { ...view, playerProps };
};

const renderPlayerWithEpisodeDialog = (props = {}) => {
  const videoRef = React.createRef();
  const defaultProps = {
    episodes: [
      { name: "1", slug: "tap-1", episodeKey: "0:tap-1" },
      { name: "2", slug: "tap-2", episodeKey: "0:tap-2" },
    ],
    currentEpisode: { name: "1", slug: "tap-1", episodeKey: "0:tap-1" },
    onSelectEpisode: jest.fn(),
  };
  const playerProps = { ...defaultProps, ...props };
  const view = renderWithFocusProvider(
    <CustomVideoPlayer
      videoRef={videoRef}
      title="Test Movie"
      episodeName="1"
      {...playerProps}
    />,
  );

  return { ...view, playerProps };
};

const mockPlayerBounds = (container) => {
  const player = container.querySelector(".custom-video-player");
  player.getBoundingClientRect = jest.fn(() => ({
    left: 0,
    right: 200,
    top: 0,
    bottom: 100,
    width: 200,
    height: 100,
  }));
  return player;
};

test("renders title, episode, and custom controls", () => {
  const { container } = renderPlayer();

  expect(screen.getAllByText("Test Movie").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Tập 1").length).toBeGreaterThan(0);
  expect(screen.getAllByLabelText("Phát").length).toBeGreaterThan(0);
  expect(screen.getByLabelText("Tua video")).toBeInTheDocument();
  expect(container.querySelector(".custom-video-player__controls")).toHaveClass(
    "custom-video-player__controls--primary",
  );
  expect(container.querySelector(".custom-video-player__chrome")).toHaveClass(
    "custom-video-player__chrome--pass-through",
  );
  expect(container.querySelector(".custom-video-player__meta")).toHaveClass(
    "custom-video-player__meta--pass-through",
  );
});

test("stops and clears video playback on unmount without forcing a media reload", () => {
  const videoRef = React.createRef();
  const view = renderWithFocusProvider(
    <CustomVideoPlayer
      videoRef={videoRef}
      title="Test Movie"
      episodeName="1"
    />,
  );
  const video = view.container.querySelector("video");
  const removeAttributeSpy = jest.spyOn(video, "removeAttribute");
  video.pause = jest.fn();
  video.load = jest.fn();
  video.src = "https://example.com/episode.mp4";
  setMediaProperty(video, "paused", false);

  view.unmount();

  expect(video.pause).toHaveBeenCalledTimes(1);
  expect(removeAttributeSpy).toHaveBeenCalledWith("src");
  expect(video.load).not.toHaveBeenCalled();
});

test("restores default audio level after app lifecycle cleanup", () => {
  const videoRef = React.createRef();
  const view = renderWithFocusProvider(
    <CustomVideoPlayer
      videoRef={videoRef}
      title="Test Movie"
      episodeName="1"
    />,
  );
  const video = view.container.querySelector("video");
  video.pause = jest.fn();
  video.load = jest.fn();
  video.src = "https://example.com/episode.mp4";
  video.volume = 0;
  video.muted = true;
  setMediaProperty(video, "paused", false);
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "hidden",
  });

  document.dispatchEvent(new Event("visibilitychange"));

  expect(video.muted).toBe(false);
  expect(video.volume).toBe(1);
});

test("stops and clears video playback when the app is hidden", () => {
  const videoRef = React.createRef();
  const view = renderWithFocusProvider(
    <CustomVideoPlayer
      videoRef={videoRef}
      title="Test Movie"
      episodeName="1"
    />,
  );
  const video = view.container.querySelector("video");
  const removeAttributeSpy = jest.spyOn(video, "removeAttribute");
  video.pause = jest.fn();
  video.load = jest.fn();
  video.src = "https://example.com/episode.mp4";
  setMediaProperty(video, "paused", false);
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "hidden",
  });

  document.dispatchEvent(new Event("visibilitychange"));

  expect(video.pause).toHaveBeenCalledTimes(1);
  expect(removeAttributeSpy).toHaveBeenCalledWith("src");
  expect(video.load).toHaveBeenCalledTimes(1);
});

test("stops and clears video playback when the page is hidden", () => {
  const videoRef = React.createRef();
  const view = renderWithFocusProvider(
    <CustomVideoPlayer
      videoRef={videoRef}
      title="Test Movie"
      episodeName="1"
    />,
  );
  const video = view.container.querySelector("video");
  const removeAttributeSpy = jest.spyOn(video, "removeAttribute");
  video.pause = jest.fn();
  video.load = jest.fn();
  video.src = "https://example.com/episode.mp4";
  setMediaProperty(video, "paused", false);

  window.dispatchEvent(new Event("pagehide"));

  expect(video.pause).toHaveBeenCalledTimes(1);
  expect(removeAttributeSpy).toHaveBeenCalledWith("src");
  expect(video.load).toHaveBeenCalledTimes(1);
});

test("renders custom episode navigation controls", () => {
  renderPlayerWithEpisodeControls();

  expect(screen.getByLabelText("Tập trước")).toBeInTheDocument();
  expect(screen.getByLabelText("Tập tiếp")).toBeInTheDocument();
});

test("calls episode navigation handlers from custom controls", () => {
  const { playerProps } = renderPlayerWithEpisodeControls();

  fireEvent.click(screen.getByLabelText("Tập trước"));
  fireEvent.click(screen.getByLabelText("Tập tiếp"));

  expect(playerProps.onPrevEpisode).toHaveBeenCalledTimes(1);
  expect(playerProps.onNextEpisode).toHaveBeenCalledTimes(1);
});

test("disables unavailable custom episode navigation controls", () => {
  renderPlayerWithEpisodeControls({
    canGoPrevEpisode: false,
    canGoNextEpisode: false,
  });

  expect(screen.getByLabelText("Tập trước")).toBeDisabled();
  expect(screen.getByLabelText("Tập tiếp")).toBeDisabled();
});

test("keeps custom episode controls on coarse pointer devices", () => {
  mockCoarsePointer(true);

  renderPlayerWithEpisodeControls();

  expect(screen.getByLabelText("Tập trước")).toBeInTheDocument();
  expect(screen.getByLabelText("Tập tiếp")).toBeInTheDocument();
});

test("renders custom auto-next overlay with progress fill", () => {
  const { container } = renderPlayerWithEpisodeControls({
    showAutoPlayNotice: true,
    autoPlayCountdown: 5,
    autoPlayDuration: 10,
  });

  expect(screen.getByText("Tiếp theo")).toBeInTheDocument();
  expect(screen.getByText("Tập 2")).toBeInTheDocument();
  expect(screen.getByLabelText("Phát tập tiếp theo ngay")).toBeInTheDocument();
  expect(screen.getByLabelText("Hủy tự động phát")).toBeInTheDocument();
  expect(
    container.querySelector(".autoplay-card__button--play"),
  ).toHaveStyle({
    "--autoplay-duration": "10s",
  });
});

test("custom auto-next overlay plays now and cancels", () => {
  const { playerProps } = renderPlayerWithEpisodeControls({
    showAutoPlayNotice: true,
    autoPlayCountdown: 5,
    autoPlayDuration: 10,
  });

  fireEvent.click(screen.getByLabelText("Phát tập tiếp theo ngay"));
  fireEvent.click(screen.getByLabelText("Hủy tự động phát"));

  expect(playerProps.onNextEpisode).toHaveBeenCalledTimes(1);
  expect(playerProps.onCancelAutoPlay).toHaveBeenCalledTimes(1);
});

test("remote Backspace closes the custom player", () => {
  const onClose = jest.fn();
  renderPlayerWithEpisodeControls({ onClose });

  fireEvent.keyDown(window, { key: "Backspace" });

  expect(onClose).toHaveBeenCalledTimes(1);
});

test("renders an autoplay toggle in custom controls", () => {
  const onToggleAutoPlay = jest.fn();
  renderPlayerWithEpisodeControls({
    autoPlayEnabled: true,
    onToggleAutoPlay,
  });

  const toggle = screen.getByRole("button", { name: "Tắt tự động phát" });
  fireEvent.click(toggle);

  expect(onToggleAutoPlay).toHaveBeenCalledTimes(1);
});

test("opens an episode dialog and selects an episode", () => {
  const { playerProps } = renderPlayerWithEpisodeDialog();

  fireEvent.click(screen.getByRole("button", { name: "Danh sách tập" }));

  expect(screen.getByRole("dialog", { name: "Danh sách tập" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Tập 1" })).toHaveAttribute(
    "aria-current",
    "true",
  );

  fireEvent.click(screen.getByRole("button", { name: "Tập 2" }));

  expect(playerProps.onSelectEpisode).toHaveBeenCalledWith(
    playerProps.episodes[1],
  );
});

test("closes the episode dialog with Escape", () => {
  renderPlayerWithEpisodeDialog();

  fireEvent.click(screen.getByRole("button", { name: "Danh sách tập" }));
  fireEvent.keyDown(window, { key: "Escape" });

  expect(screen.queryByRole("dialog", { name: "Danh sách tập" })).not.toBeInTheDocument();
});

test("episode dialog starts on episode 1 and cycles up to close then back down", () => {
  renderPlayerWithEpisodeDialog({
    currentEpisode: { name: "2", slug: "tap-2", episodeKey: "0:tap-2" },
  });

  fireEvent.click(screen.getByRole("button", { name: "Danh sách tập" }));

  const closeButton = screen.getByRole("button", { name: "Đóng danh sách tập" });
  const episodeOne = screen.getByRole("button", { name: "Tập 1" });

  expect(episodeOne).toHaveFocus();

  fireEvent.keyDown(window, { key: "ArrowUp" });
  expect(closeButton).toHaveFocus();

  fireEvent.keyDown(document, { key: "ArrowDown" });
  expect(episodeOne).toHaveFocus();
});

test("episode dialog keeps remote focus inside the popup", () => {
  renderPlayerWithEpisodeDialog();

  fireEvent.click(screen.getByRole("button", { name: "Danh sách tập" }));

  const closeButton = screen.getByRole("button", { name: "Đóng danh sách tập" });
  const episodeOne = screen.getByRole("button", { name: "Tập 1" });
  const episodeTwo = screen.getByRole("button", { name: "Tập 2" });
  const playButton = screen.getByLabelText("Phát video");

  act(() => {
    episodeTwo.focus();
  });
  fireEvent.keyDown(window, { key: "ArrowDown" });
  expect(episodeTwo).toHaveFocus();

  act(() => {
    closeButton.focus();
  });
  fireEvent.keyDown(window, { key: "ArrowUp" });
  expect(closeButton).toHaveFocus();

  // Simulates browser/timing recovery when focus escapes the open modal.
  act(() => {
    playButton.focus();
  });
  fireEvent.keyDown(window, { key: "ArrowRight" });
  expect(episodeOne).toHaveFocus();
});

test("remote Backspace closes only the episode dialog while player remains open", () => {
  const onClose = jest.fn();
  renderPlayerWithEpisodeDialog({ onClose });

  fireEvent.click(screen.getByRole("button", { name: "Danh sách tập" }));
  fireEvent.keyDown(window, { key: "Backspace" });

  expect(screen.queryByRole("dialog", { name: "Danh sách tập" })).not.toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});

test("remote Backspace restores player focus after closing the episode dialog", () => {
  renderPlayerWithEpisodeDialog();

  fireEvent.click(screen.getByRole("button", { name: "Danh sách tập" }));
  expect(screen.getByRole("button", { name: "Tập 1" })).toHaveFocus();

  fireEvent.keyDown(window, { key: "Backspace" });

  expect(screen.queryByRole("dialog", { name: "Danh sách tập" })).not.toBeInTheDocument();
  expect(screen.getByLabelText("Tua video")).toHaveFocus();
});

test("close button restores player focus after closing the episode dialog", () => {
  renderPlayerWithEpisodeDialog();

  fireEvent.click(screen.getByRole("button", { name: "Danh sách tập" }));
  fireEvent.click(screen.getByRole("button", { name: "Đóng danh sách tập" }));

  expect(screen.queryByRole("dialog", { name: "Danh sách tập" })).not.toBeInTheDocument();
  expect(screen.getByLabelText("Tua video")).toHaveFocus();
});

test("keeps custom auto-next overlay on coarse pointer devices", () => {
  mockCoarsePointer(true);

  renderPlayerWithEpisodeControls({
    showAutoPlayNotice: true,
    autoPlayCountdown: 5,
    autoPlayDuration: 10,
  });

  expect(screen.getByText("Tiếp theo")).toBeInTheDocument();
  expect(screen.getByLabelText("Phát tập tiếp theo ngay")).toBeInTheDocument();
});

test("shows FPS debug overlay when debugFps query is enabled", () => {
  setDebugFpsQuery();

  renderPlayer();

  expect(screen.getByText("FPS debug")).toBeInTheDocument();
});

test("shows FPS debug overlay with native video controls", () => {
  mockCoarsePointer(true);
  setDebugFpsQuery();

  renderPlayer();

  expect(screen.getByText("FPS debug")).toBeInTheDocument();
});

test("hides FPS debug overlay by default", () => {
  renderPlayer();

  expect(screen.queryByText("FPS debug")).not.toBeInTheDocument();
});

test("updates FPS debug overlay from playback quality snapshots", () => {
  jest.useFakeTimers();
  setDebugFpsQuery();
  const { video } = renderPlayer();
  let totalVideoFrames = 100;
  let droppedVideoFrames = 2;
  video.getVideoPlaybackQuality = jest.fn(() => ({
    totalVideoFrames,
    droppedVideoFrames,
  }));

  act(() => {
    jest.advanceTimersByTime(2000);
  });
  totalVideoFrames = 160;
  droppedVideoFrames = 6;
  act(() => {
    jest.advanceTimersByTime(2000);
  });

  expect(screen.getByText("FPS: 30.0")).toBeInTheDocument();
  expect(screen.getByText("Drop: 2.0 fps")).toBeInTheDocument();
  expect(screen.getByText("Frames: 60/4 dropped")).toBeInTheDocument();
});

test("shows unsupported FPS debug message when playback quality API is missing", () => {
  setDebugFpsQuery();

  renderPlayer();

  expect(screen.getByText("Playback metrics unsupported")).toBeInTheDocument();
});

test("uses custom video controls on coarse pointer devices", () => {
  mockCoarsePointer(true);

  const { container, video } = renderPlayer();

  expect(video).not.toHaveAttribute("controls");
  expect(
    container.querySelector(".custom-video-player__chrome"),
  ).toBeInTheDocument();
  expect(
    container.querySelector(".custom-video-player__hit-area"),
  ).toBeInTheDocument();
});

test("uses custom controls on TV browsers even when hover is unavailable", () => {
  mockInputMedia({ hoverNone: true });
  mockUserAgent(
    "Mozilla/5.0 (Linux; Android 11; Android TV) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  );

  const { container, video } = renderPlayer();

  expect(video).not.toHaveAttribute("controls");
  expect(
    container.querySelector(".custom-video-player__chrome"),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Tua video")).toBeInTheDocument();
});

test("uses custom controls on large non-touch screens even when hover is unavailable", () => {
  mockInputMedia({ hoverNone: true });
  mockViewport({ width: 1920, height: 1080, maxTouchPoints: 0 });

  const { container, video } = renderPlayer();

  expect(video).not.toHaveAttribute("controls");
  expect(
    container.querySelector(".custom-video-player__chrome"),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Tua video")).toBeInTheDocument();
});

test("does not duplicate episode prefix in player metadata", () => {
  renderPlayerWithEpisodeName("Tập 1");

  expect(screen.getAllByText("Tập 1").length).toBeGreaterThan(0);
  expect(screen.queryByText("Tập Tập 1")).not.toBeInTheDocument();
});

test("renders episode group title in player metadata", () => {
  renderPlayerWithEpisodeMeta({
    episodeName: "1",
    episodeGroupTitle: "Phần 2",
  });

  expect(screen.getAllByText("Phần 2 - Tập 1").length).toBeGreaterThan(0);
});

test("plays video from the center play button", () => {
  const { video } = renderPlayer();

  fireEvent.click(screen.getByLabelText("Phát video"));

  expect(video.play).toHaveBeenCalledTimes(1);
});

test("center play button remains reliable after a prior touch", () => {
  const { container, video } = renderPlayer();
  const player = mockPlayerBounds(container);

  fireEvent.touchStart(player, { touches: [{ clientX: 100 }] });
  fireEvent.click(screen.getByLabelText("Phát video"));

  expect(video.play).toHaveBeenCalledTimes(1);
});

test("renders Picture-in-Picture control when supported", async () => {
  mockPictureInPictureSupport();

  renderPlayer();

  expect(await screen.findByLabelText("Hình trong hình")).toBeInTheDocument();
  const icon = screen.getByTestId("picture-in-picture-icon");

  expect(icon).toBeInTheDocument();
  expect(icon.tagName.toLowerCase()).toBe("svg");
  expect(icon.querySelectorAll("rect")).toHaveLength(2);
  expect(icon.querySelector("path")).not.toBeInTheDocument();
});

test("requests Picture-in-Picture from the control", async () => {
  mockPictureInPictureSupport();
  const { video } = renderPlayer();

  fireEvent.click(await screen.findByLabelText("Hình trong hình"));

  expect(video.requestPictureInPicture).toHaveBeenCalledTimes(1);
});

test("keeps player usable when Picture-in-Picture request is rejected", async () => {
  mockPictureInPictureSupport({
    requestPictureInPicture: jest.fn(() =>
      Promise.reject(new Error("blocked")),
    ),
  });
  const { video } = renderPlayer();

  fireEvent.click(await screen.findByLabelText("Hình trong hình"));
  await act(() => Promise.resolve());

  expect(video.requestPictureInPicture).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Không thể phát video")).not.toBeInTheDocument();
});

test("updates Picture-in-Picture control label from browser events", async () => {
  mockPictureInPictureSupport();
  const { video } = renderPlayer();

  expect(await screen.findByLabelText("Hình trong hình")).toBeInTheDocument();

  fireEvent(video, new Event("enterpictureinpicture"));
  expect(screen.getByLabelText("Thoát hình trong hình")).toBeInTheDocument();

  fireEvent(video, new Event("leavepictureinpicture"));
  expect(screen.getByLabelText("Hình trong hình")).toBeInTheDocument();
});

test("hides Picture-in-Picture control when document support is missing", () => {
  mockPictureInPictureSupport({ documentEnabled: false });

  renderPlayer();

  expect(screen.queryByLabelText("Hình trong hình")).not.toBeInTheDocument();
});

test("hides Picture-in-Picture control when video support is missing", () => {
  mockPictureInPictureSupport({ videoEnabled: false });

  renderPlayer();

  expect(screen.queryByLabelText("Hình trong hình")).not.toBeInTheDocument();
});

test("desktop surface click toggles playback", () => {
  const { video } = renderPlayer();

  fireEvent.click(screen.getAllByLabelText("Phát")[0]);

  expect(video.play).toHaveBeenCalledTimes(1);
});

test("touch surface tap ignores the following synthetic click", () => {
  const { container, video } = renderPlayer();
  const player = mockPlayerBounds(container);

  fireEvent.touchStart(player, { touches: [{ clientX: 100 }] });
  fireEvent.click(screen.getAllByLabelText("Phát")[0]);

  expect(video.play).not.toHaveBeenCalled();
});

test("control play button remains clickable after touch interaction", () => {
  const { container, video } = renderPlayer();
  const player = mockPlayerBounds(container);

  fireEvent.touchStart(player, { touches: [{ clientX: 100 }] });
  fireEvent.click(screen.getAllByLabelText("Phát")[1]);

  expect(video.play).toHaveBeenCalledTimes(1);
});

test("updates video time when seeking", () => {
  const { video } = renderPlayer();
  const progress = screen.getByLabelText("Tua video");

  fireEvent.change(progress, { target: { value: "45" } });
  expect(video.currentTime).toBe(0);

  fireEvent.mouseUp(progress, { target: { value: "45" } });

  expect(video.currentTime).toBe(45);
});

test("keeps audio state while committing a timeline seek", () => {
  const { video } = renderPlayer();
  const progress = screen.getByLabelText("Tua video");
  video.volume = 0.7;
  video.muted = false;

  fireEvent.change(progress, { target: { value: "45" } });
  fireEvent.mouseUp(progress, { target: { value: "45" } });

  expect(video.currentTime).toBe(45);
  expect(video.volume).toBe(0.7);
  expect(video.muted).toBe(false);
});

test("pauses playback while committing a timeline seek and resumes after seeked", () => {
  const { video } = renderPlayer();
  const progress = screen.getByLabelText("Tua video");
  const events = [];
  let currentTimeValue = 0;
  Object.defineProperty(video, "currentTime", {
    configurable: true,
    get: () => currentTimeValue,
    set: (value) => {
      events.push(`seek:${value}`);
      currentTimeValue = value;
    },
  });
  setMediaProperty(video, "paused", false);
  video.pause = jest.fn(() => {
    events.push("pause");
    setMediaProperty(video, "paused", true);
  });
  video.play = jest.fn(() => {
    events.push("play");
    setMediaProperty(video, "paused", false);
    return Promise.resolve();
  });

  fireEvent.change(progress, { target: { value: "45" } });
  fireEvent.mouseUp(progress, { target: { value: "45" } });

  expect(events).toEqual(["pause", "seek:45"]);
  expect(video.play).not.toHaveBeenCalled();

  fireEvent(video, new Event("seeked"));

  expect(video.play).toHaveBeenCalledTimes(1);
  expect(events).toEqual(["pause", "seek:45", "play"]);
});

test("mutes audio while seeking during playback and restores it after seeked", () => {
  const { video } = renderPlayer();
  const progress = screen.getByLabelText("Tua video");
  video.volume = 0.8;
  video.muted = false;
  setMediaProperty(video, "paused", false);

  fireEvent.change(progress, { target: { value: "45" } });
  fireEvent.mouseUp(progress, { target: { value: "45" } });

  expect(video.muted).toBe(true);
  expect(video.volume).toBe(0);

  fireEvent(video, new Event("seeked"));

  expect(video.muted).toBe(false);
  expect(video.volume).toBe(0.8);
});

test("remote OK toggles playback when the center play button is focused", () => {
  const { video } = renderPlayer();
  const centerPlay = screen.getByLabelText("Phát video");
  centerPlay.focus();

  fireEvent.keyDown(window, { key: "Enter" });

  expect(video.play).toHaveBeenCalledTimes(1);
});

test("remote OK toggles playback when no player item is focused", () => {
  const { video } = renderPlayer();
  document.body.focus();

  fireEvent.keyDown(window, { key: "Enter" });

  expect(video.play).toHaveBeenCalledTimes(1);
});

test("focuses the timeline by default when it is available", async () => {
  renderPlayer();

  await waitFor(() => {
    expect(screen.getByLabelText("Tua video")).toHaveFocus();
  });
});

test("does not let delayed default focus steal focus from another player control", () => {
  jest.useFakeTimers();
  renderPlayer();

  screen.getByLabelText("Phát video").focus();

  act(() => {
    jest.advanceTimersByTime(0);
  });

  expect(screen.getByLabelText("Phát video")).toHaveFocus();
});

test("falls back to the play button when the timeline cannot be focused", async () => {
  const querySelectorSpy = jest.spyOn(HTMLElement.prototype, "querySelector");
  querySelectorSpy.mockImplementation(function mockQuerySelector(selector) {
    if (selector === ".custom-video-player__progress") {
      return null;
    }
    return Element.prototype.querySelector.call(this, selector);
  });

  try {
    renderPlayer();

    await waitFor(() => {
      expect(screen.getByLabelText("Phát video")).toHaveFocus();
    });
  } finally {
    querySelectorSpy.mockRestore();
  }
});

test("remote arrow entry focuses the timeline before player controls", () => {
  const { video } = renderPlayer();
  setMediaProperty(video, "paused", false);
  fireEvent(video, new Event("play"));
  document.body.focus();

  fireEvent.keyDown(window, { key: "ArrowDown" });

  expect(screen.getByLabelText("Tua video")).toHaveFocus();
});

test("remote arrows can focus the center play button before playback starts", () => {
  const { video } = renderPlayer();
  const progress = screen.getByLabelText("Tua video");
  progress.focus();

  fireEvent.keyDown(window, { key: "ArrowUp" });

  expect(screen.getByLabelText("Phát video")).toHaveFocus();

  fireEvent.keyDown(window, { key: "Enter" });

  expect(video.play).toHaveBeenCalledTimes(1);
});

test("resumes playback after remote seek when already playing", () => {
  const { video } = renderPlayer();
  const progress = screen.getByLabelText("Tua video");
  let currentTimeValue = 30;
  Object.defineProperty(video, "currentTime", {
    configurable: true,
    get: () => currentTimeValue,
    set: (value) => {
      currentTimeValue = value;
    },
  });
  setMediaProperty(video, "paused", false);
  video.pause = jest.fn(() => {
    setMediaProperty(video, "paused", true);
  });
  video.play = jest.fn(() => {
    setMediaProperty(video, "paused", false);
    return Promise.resolve();
  });
  progress.focus();

  fireEvent.keyDown(window, { key: "ArrowRight" });
  fireEvent.keyUp(window, { key: "ArrowRight" });

  expect(video.pause).toHaveBeenCalledTimes(1);
  expect(video.play).not.toHaveBeenCalled();

  fireEvent(video, new Event("seeked"));

  expect(video.play).toHaveBeenCalledTimes(1);
});

test("remote long-hold seek uses 10, 25, then 60 second steps", () => {
  jest.useFakeTimers();
  const { video } = renderPlayer();
  let currentTimeValue = 0;
  Object.defineProperty(video, "currentTime", {
    configurable: true,
    get: () => currentTimeValue,
    set: (value) => {
      currentTimeValue = value;
    },
  });
  setMediaProperty(video, "duration", 1000);
  fireEvent(video, new Event("durationchange"));
  setMediaProperty(video, "paused", true);

  const progress = screen.getByLabelText("Tua video");
  progress.focus();

  fireEvent.keyDown(window, { key: "ArrowRight" });
  // Keydown starts a preview seek, but video.currentTime is not committed yet.
  expect(currentTimeValue).toBe(0);

  // Initial 10s preview + one under-1s 10s tick = 20s.
  act(() => {
    jest.advanceTimersByTime(150);
  });
  expect(screen.getByDisplayValue("20")).toBeInTheDocument();

  // Next 900ms includes the first tick in the 25s tier, totaling 95s.
  act(() => {
    jest.advanceTimersByTime(900);
  });
  expect(screen.getByDisplayValue("95")).toBeInTheDocument();

  // Next 1050ms includes six more 25s ticks and the first 60s tier tick, totaling 305s.
  act(() => {
    jest.advanceTimersByTime(1050);
  });
  expect(screen.getByDisplayValue("305")).toBeInTheDocument();

  fireEvent.keyUp(window, { key: "ArrowRight" });

  expect(currentTimeValue).toBe(305);
});

test("does not commit a stale remote seek after switching episodes", () => {
  const videoRef = React.createRef();
  const { container, rerender } = render(
    <CustomVideoPlayer
      videoRef={videoRef}
      title="Test Movie"
      episodeName="1"
    />,
  );
  const video = container.querySelector("video");
  setMediaProperty(video, "duration", 120);
  setMediaProperty(video, "currentTime", 40);
  setMediaProperty(video, "paused", true);
  fireEvent(video, new Event("loadedmetadata"));
  const progress = screen.getByLabelText("Tua video");
  progress.focus();

  fireEvent.keyDown(window, { key: "ArrowRight" });

  setMediaProperty(video, "currentTime", 0);
  rerender(
    <CustomVideoPlayer
      videoRef={videoRef}
      title="Test Movie"
      episodeName="2"
    />,
  );
  fireEvent(video, new Event("loadedmetadata"));

  fireEvent.keyUp(window, { key: "ArrowRight" });

  expect(video.currentTime).toBe(0);
});

test("restores audio state if seeked does not fire after a seek", () => {
  jest.useFakeTimers();
  const { video } = renderPlayer();
  setMediaProperty(video, "duration", 120);
  setMediaProperty(video, "currentTime", 20);
  setMediaProperty(video, "paused", false);
  setMediaProperty(video, "volume", 0.7);
  setMediaProperty(video, "muted", false);
  video.play = jest.fn(() => Promise.resolve());
  video.pause = jest.fn();

  const progress = screen.getByLabelText("Tua video");
  fireEvent.change(progress, { target: { value: "40" } });
  fireEvent.mouseUp(progress);

  expect(video.muted).toBe(true);
  expect(video.volume).toBe(0);

  act(() => {
    jest.advanceTimersByTime(1500);
  });

  expect(video.muted).toBe(false);
  expect(video.volume).toBe(0.7);
  expect(video.play).toHaveBeenCalled();
});

test("plays the next episode when playback ends and autoplay is enabled", () => {
  const onNextEpisode = jest.fn();
  const { container } = renderPlayerWithEpisodeControls({
    movieId: "test-movie",
    episode: { name: "1", slug: "tap-1", link_embed: "https://example.com/video.mp4" },
    autoPlayEnabled: true,
    canGoNextEpisode: true,
    onNextEpisode,
  });
  const video = container.querySelector("video");

  fireEvent(video, new Event("ended"));

  expect(onNextEpisode).toHaveBeenCalledTimes(1);
});

test("uses direct HLS source instead of embed URL when hls.js is unsupported", async () => {
  mockHlsIsSupported = false;
  const videoRef = React.createRef();

  render(
    <CustomVideoPlayer
      videoRef={videoRef}
      title="Test Movie"
      movieId="test-movie"
      episode={{
        name: "1",
        slug: "tap-1",
        link_m3u8: "https://cdn.example.com/tap-1.m3u8",
        link_embed: "https://embed.example.com/tap-1",
      }}
    />,
  );

  const video = videoRef.current;
  video.canPlayType = jest.fn(() => "");

  await waitFor(() => {
    expect(video.src).toBe("https://cdn.example.com/tap-1.m3u8");
  });
  expect(video.src).not.toBe("https://embed.example.com/tap-1");
});

test("uses a Tauri-backed HLS loader on Android WebView to avoid browser CORS", async () => {
  mockHlsIsSupported = true;
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: "Mozilla/5.0 (Linux; Android 12; sdk_google_atv_x86) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  });
  const videoRef = React.createRef();

  render(
    <CustomVideoPlayer
      videoRef={videoRef}
      title="Test Movie"
      movieId="test-movie"
      episode={{
        name: "1",
        slug: "tap-1",
        link_m3u8: "https://vip.opstream11.com/20220304/879_6a052982/index.m3u8",
      }}
    />,
  );

  const video = videoRef.current;
  video.canPlayType = jest.fn((type) => (
    type === "application/vnd.apple.mpegurl" ? "maybe" : ""
  ));

  await waitFor(() => {
    expect(mockHlsInstances).toHaveLength(1);
  });
  const playbackHls = mockHlsInstances.find((instance) => instance.config.loader);
  expect(playbackHls.config.enableWorker).toBe(false);
  expect(playbackHls.config.loader).toEqual(expect.any(Function));
  expect(playbackHls.loadSource).toHaveBeenCalledWith(
    "https://vip.opstream11.com/20220304/879_6a052982/index.m3u8",
  );
  expect(video.src).toBe("");
});

test("prefers native HLS on Android TV when the WebView can play it", async () => {
  mockHlsIsSupported = true;
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: "Mozilla/5.0 (Linux; Android 12; sdk_google_atv_x86) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  });
  HTMLMediaElement.prototype.canPlayType = jest.fn((type) => (
    type === "application/vnd.apple.mpegurl" ? "maybe" : ""
  ));
  const videoRef = React.createRef();

  render(
    <CustomVideoPlayer
      videoRef={videoRef}
      title="Test Movie"
      movieId="test-movie"
      episode={{
        name: "1",
        slug: "tap-1",
        link_m3u8: "https://vip.opstream11.com/20220304/879_6a052982/index.m3u8",
      }}
    />,
  );

  await waitFor(() => {
    expect(videoRef.current.src).toBe(
      "https://vip.opstream11.com/20220304/879_6a052982/index.m3u8",
    );
  });
  expect(mockHlsInstances).toHaveLength(0);
  expect(videoRef.current).not.toHaveAttribute("crossorigin");
});

test("falls back to native Android TV HLS when hls.js has an unrecoverable error", async () => {
  mockHlsIsSupported = true;
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: "Mozilla/5.0 (Linux; Android 12; sdk_google_atv_x86) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  });
  HTMLMediaElement.prototype.canPlayType = jest.fn(() => "");
  const videoRef = React.createRef();

  render(
    <CustomVideoPlayer
      videoRef={videoRef}
      title="Test Movie"
      movieId="test-movie"
      episode={{
        name: "1",
        slug: "tap-1",
        link_m3u8: "https://vip.opstream11.com/20220304/879_6a052982/index.m3u8",
      }}
    />,
  );

  await waitFor(() => {
    expect(mockHlsInstances).toHaveLength(1);
  });
  act(() => {
    mockHlsInstances[0].handlers.error("error", {
      type: "otherError",
      details: "bufferAppendError",
      fatal: true,
    });
  });

  expect(mockHlsInstances[0].destroy).toHaveBeenCalledTimes(1);
  expect(videoRef.current.src).toBe(
    "https://vip.opstream11.com/20220304/879_6a052982/index.m3u8",
  );
});

test("preserves the player video attributes used by the existing layout", () => {
  const videoRef = React.createRef();

  render(
    <CustomVideoPlayer
      videoRef={videoRef}
      title="Test Movie"
      movieId="test-movie"
      episode={{ name: "1", slug: "tap-1", link_m3u8: "https://cdn.example.com/tap-1.m3u8" }}
    />,
  );

  const video = videoRef.current;
  expect(video).toHaveAttribute("playsinline");
  expect(video).toHaveAttribute("webkit-playsinline", "true");
  expect(video).toHaveAttribute("preload", "auto");
  expect(video).toHaveAttribute("crossorigin", "anonymous");
});

test("omits crossorigin on Android TV so native HLS can load providers without CORS headers", () => {
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: "Mozilla/5.0 (Linux; Android 12; sdk_google_atv_x86) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  });
  const videoRef = React.createRef();

  render(
    <CustomVideoPlayer
      videoRef={videoRef}
      title="Test Movie"
      movieId="test-movie"
      episode={{ name: "1", slug: "tap-1", link_m3u8: "https://cdn.example.com/tap-1.m3u8" }}
    />,
  );

  const video = videoRef.current;
  expect(video).toHaveAttribute("playsinline");
  expect(video).not.toHaveAttribute("crossorigin");
});

test("shows TV autoplay countdown near the end and focuses play now", () => {
  jest.useFakeTimers();
  const onNextEpisode = jest.fn();
  const { container } = renderPlayerWithEpisodeControls({
    movieId: "test-movie",
    episode: { name: "1", slug: "tap-1", link_embed: "https://example.com/video.mp4" },
    autoPlayEnabled: true,
    canGoNextEpisode: true,
    nextEpisodeName: "2",
    onNextEpisode,
  });
  const video = container.querySelector("video");
  setMediaProperty(video, "duration", 1200);
  setMediaProperty(video, "currentTime", 1140);

  fireEvent(video, new Event("timeupdate"));
  act(() => {
    jest.advanceTimersByTime(0);
  });

  expect(screen.getByText("Tiếp theo")).toBeInTheDocument();
  expect(screen.getByText("Tập 2")).toBeInTheDocument();
  expect(screen.getByText("Tự động phát sau 10 giây")).toBeInTheDocument();
  expect(container.querySelector(".autoplay-card__button-fill")).toHaveStyle({
    animationDuration: "10s",
  });
  expect(screen.getByLabelText("Phát tập tiếp theo ngay")).toHaveFocus();

  act(() => {
    jest.advanceTimersByTime(10000);
  });

  expect(onNextEpisode).toHaveBeenCalledTimes(1);
});

test("TV autoplay countdown and ended event advance only once", () => {
  jest.useFakeTimers();
  const onNextEpisode = jest.fn();
  const { container } = renderPlayerWithEpisodeControls({
    movieId: "test-movie",
    episode: { name: "1", slug: "tap-1", link_embed: "https://example.com/video.mp4" },
    autoPlayEnabled: true,
    canGoNextEpisode: true,
    nextEpisodeName: "2",
    onNextEpisode,
  });
  const video = container.querySelector("video");
  setMediaProperty(video, "duration", 1200);
  setMediaProperty(video, "currentTime", 1140);

  fireEvent(video, new Event("timeupdate"));

  act(() => {
    jest.advanceTimersByTime(10000);
  });
  fireEvent(video, new Event("ended"));

  expect(onNextEpisode).toHaveBeenCalledTimes(1);
});

test("remote can move from TV autoplay play now to cancel", () => {
  jest.useFakeTimers();
  const onNextEpisode = jest.fn();
  const { container } = renderPlayerWithEpisodeControls({
    movieId: "test-movie",
    episode: { name: "1", slug: "tap-1", link_embed: "https://example.com/video.mp4" },
    autoPlayEnabled: true,
    canGoNextEpisode: true,
    nextEpisodeName: "2",
    onNextEpisode,
  });
  const video = container.querySelector("video");
  setMediaProperty(video, "duration", 1200);
  setMediaProperty(video, "currentTime", 1140);

  fireEvent(video, new Event("timeupdate"));
  act(() => {
    jest.advanceTimersByTime(0);
  });

  fireEvent.keyDown(window, { key: "ArrowRight" });
  expect(screen.getByLabelText("Hủy tự động phát")).toHaveFocus();

  fireEvent.keyDown(window, { key: "Enter" });
  expect(screen.queryByText("Tiếp theo")).not.toBeInTheDocument();

  act(() => {
    jest.advanceTimersByTime(10000);
  });

  expect(onNextEpisode).not.toHaveBeenCalled();
});

test("TV focus provider does not steal autoplay card arrow navigation", () => {
  jest.useFakeTimers();
  const onNextEpisode = jest.fn();
  const videoRef = React.createRef();
  const view = renderWithFocusProvider(
    <CustomVideoPlayer
      videoRef={videoRef}
      title="Test Movie"
      episodeName="1"
      movieId="test-movie"
      episode={{ name: "1", slug: "tap-1", link_embed: "https://example.com/video.mp4" }}
      autoPlayEnabled
      canGoNextEpisode
      nextEpisodeName="2"
      onNextEpisode={onNextEpisode}
    />,
  );
  const video = view.container.querySelector("video");
  setMediaProperty(video, "duration", 1200);
  setMediaProperty(video, "currentTime", 1140);

  fireEvent(video, new Event("timeupdate"));
  act(() => {
    jest.advanceTimersByTime(0);
  });

  const playNow = screen.getByLabelText("Phát tập tiếp theo ngay");
  const cancel = screen.getByLabelText("Hủy tự động phát");

  expect(playNow).toHaveFocus();

  fireEvent.keyDown(document, { key: "ArrowRight" });
  expect(cancel).toHaveFocus();

  fireEvent.keyDown(document, { key: "ArrowUp" });
  expect(playNow).toHaveFocus();

  fireEvent.keyDown(document, { key: "ArrowDown" });
  expect(cancel).toHaveFocus();

  fireEvent.keyDown(document, { key: "ArrowLeft" });
  expect(playNow).toHaveFocus();
});

test("remote arrows reveal hidden controls and focus the timeline first", () => {
  jest.useFakeTimers();
  const { container, video } = renderPlayer();

  act(() => {
    video.play();
  });
  act(() => {
    jest.advanceTimersByTime(2500);
  });
  expect(container.querySelector(".custom-video-player")).toHaveClass("is-idle");

  document.body.focus();
  fireEvent.keyDown(window, { key: "ArrowRight" });

  expect(container.querySelector(".custom-video-player")).toHaveClass("is-active");
  expect(screen.getByLabelText("Tua video")).toHaveFocus();
});

test("coalesces frequent video time updates into one animation frame", () => {
  const frameCallbacks = [];
  window.requestAnimationFrame = jest.fn((callback) => {
    frameCallbacks.push(callback);
    return frameCallbacks.length;
  });
  window.cancelAnimationFrame = jest.fn();
  const { video } = renderPlayer();

  video.currentTime = 10;
  fireEvent(video, new Event("timeupdate"));
  video.currentTime = 11;
  fireEvent(video, new Event("timeupdate"));

  expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);

  act(() => {
    frameCallbacks[0]();
  });

  expect(screen.getByText("00:11")).toBeInTheDocument();
});

test("remote left and right seek from the main player area", () => {
  const { video } = renderPlayer();
  let currentTimeValue = 30;
  Object.defineProperty(video, "currentTime", {
    configurable: true,
    get: () => currentTimeValue,
    set: (value) => {
      currentTimeValue = value;
    },
  });
  setMediaProperty(video, "duration", 120);

  screen.getByLabelText("Phát video").focus();

  fireEvent.keyDown(window, { key: "ArrowRight" });
  fireEvent.keyUp(window, { key: "ArrowRight" });

  expect(video.currentTime).toBe(40);
  expect(screen.getByLabelText("Phát video")).toHaveFocus();

  fireEvent.keyDown(window, { key: "ArrowLeft" });
  fireEvent.keyUp(window, { key: "ArrowLeft" });

  expect(video.currentTime).toBe(30);
  expect(screen.getByLabelText("Phát video")).toHaveFocus();
});

test("remote left from main player area commits seek to zero", () => {
  const { video } = renderPlayer();
  let currentTimeValue = 3;
  Object.defineProperty(video, "currentTime", {
    configurable: true,
    get: () => currentTimeValue,
    set: (value) => {
      currentTimeValue = value;
    },
  });
  setMediaProperty(video, "duration", 120);

  screen.getByLabelText("Phát video").focus();

  fireEvent.keyDown(window, { key: "ArrowLeft" });
  fireEvent.keyUp(window, { key: "ArrowLeft" });

  expect(video.currentTime).toBe(0);
  expect(screen.getByLabelText("Phát video")).toHaveFocus();
});

test("repeated remote seek commits the latest target once", () => {
  jest.useFakeTimers();
  const { video } = renderPlayer();
  const seekWrites = [];
  let currentTimeValue = 1000;
  Object.defineProperty(video, "currentTime", {
    configurable: true,
    get: () => currentTimeValue,
    set: (value) => {
      seekWrites.push(value);
      currentTimeValue = value;
    },
  });
  setMediaProperty(video, "duration", 7200);

  screen.getByLabelText("Phát video").focus();

  fireEvent.keyDown(window, { key: "ArrowRight" });
  act(() => {
    jest.advanceTimersByTime(450);
  });
  fireEvent.keyUp(window, { key: "ArrowRight" });

  expect(seekWrites).toEqual([1040]);
});

test("clears remote seek acceleration when unmounting mid seek", () => {
  jest.useFakeTimers();
  const { unmount } = renderPlayer();

  screen.getByLabelText("Phát video").focus();
  fireEvent.keyDown(window, { key: "ArrowRight" });

  unmount();

  act(() => {
    jest.advanceTimersByTime(450);
  });

  expect(jest.getTimerCount()).toBe(0);
});

test("remote down enters lower controls where left and right move focus", () => {
  const { video } = renderPlayer();
  video.currentTime = 30;

  screen.getByLabelText("Phát video").focus();

  fireEvent.keyDown(window, { key: "ArrowDown" });
  expect(screen.getAllByLabelText("Phát")[1]).toHaveFocus();

  fireEvent.keyDown(window, { key: "ArrowRight" });
  expect(screen.getByLabelText("Tua lùi 10 giây")).toHaveFocus();
  expect(video.currentTime).toBe(30);

  fireEvent.keyDown(window, { key: "ArrowLeft" });
  expect(screen.getAllByLabelText("Phát")[1]).toHaveFocus();
  expect(video.currentTime).toBe(30);
});

test("keeps remote focus in lower controls after playback controls auto-hide", () => {
  jest.useFakeTimers();
  const { video } = renderPlayer();
  video.currentTime = 30;

  act(() => {
    video.play();
  });
  act(() => {
    jest.advanceTimersByTime(0);
  });

  screen.getByLabelText("Tua video").focus();
  fireEvent.keyDown(window, { key: "ArrowDown" });
  expect(screen.getAllByLabelText("Tạm dừng")[1]).toHaveFocus();

  act(() => {
    jest.advanceTimersByTime(2500);
  });

  fireEvent.keyDown(window, { key: "ArrowRight" });

  expect(screen.getByLabelText("Tua lùi 10 giây")).toHaveFocus();
  expect(video.currentTime).toBe(30);
});

test("keeps remote focus in lower controls after pointer leaves the player", () => {
  const { container, video } = renderPlayer();
  video.currentTime = 30;

  act(() => {
    video.play();
  });

  screen.getByLabelText("Tua video").focus();
  fireEvent.keyDown(window, { key: "ArrowDown" });
  expect(screen.getAllByLabelText("Tạm dừng")[1]).toHaveFocus();

  fireEvent.mouseLeave(container.querySelector(".custom-video-player"));
  fireEvent.keyDown(window, { key: "ArrowRight" });

  expect(screen.getByLabelText("Tua lùi 10 giây")).toHaveFocus();
  expect(video.currentTime).toBe(30);
});

test("keeps lower control navigation when controls are already hidden", () => {
  jest.useFakeTimers();
  const { container, video } = renderPlayer();
  video.currentTime = 30;

  act(() => {
    video.play();
  });
  act(() => {
    jest.advanceTimersByTime(2500);
  });
  expect(container.querySelector(".custom-video-player")).toHaveClass("is-idle");

  screen.getAllByLabelText("Tạm dừng")[1].focus();
  fireEvent.keyDown(window, { key: "ArrowRight" });

  expect(screen.getByLabelText("Tua lùi 10 giây")).toHaveFocus();
  expect(video.currentTime).toBe(30);
});

test("remote up leaves lower controls so left and right seek again", () => {
  const { video } = renderPlayer();
  let currentTimeValue = 30;
  Object.defineProperty(video, "currentTime", {
    configurable: true,
    get: () => currentTimeValue,
    set: (value) => {
      currentTimeValue = value;
    },
  });
  setMediaProperty(video, "duration", 120);

  screen.getByLabelText("Phát video").focus();

  fireEvent.keyDown(window, { key: "ArrowDown" });
  expect(screen.getAllByLabelText("Phát")[1]).toHaveFocus();

  fireEvent.keyDown(window, { key: "ArrowUp" });
  expect(screen.getByLabelText("Tua video")).toHaveFocus();

  fireEvent.keyDown(window, { key: "ArrowRight" });
  fireEvent.keyUp(window, { key: "ArrowRight" });

  expect(video.currentTime).toBe(40);
});

test("remote right in lower controls moves focus without committing stale seek", () => {
  const { video } = renderPlayer();
  let currentTimeValue = 30;
  Object.defineProperty(video, "currentTime", {
    configurable: true,
    get: () => currentTimeValue,
    set: (value) => {
      currentTimeValue = value;
    },
  });
  setMediaProperty(video, "duration", 120);

  screen.getByLabelText("Phát video").focus();
  fireEvent.keyDown(window, { key: "ArrowRight" });
  fireEvent.keyUp(window, { key: "ArrowRight" });
  currentTimeValue = 30;

  screen.getAllByLabelText("Phát")[1].focus();
  fireEvent.keyDown(window, { key: "ArrowRight" });
  fireEvent.keyUp(window, { key: "ArrowRight" });

  expect(screen.getByLabelText("Tua lùi 10 giây")).toHaveFocus();
  expect(video.currentTime).toBe(30);
});

test("fullscreen player prevents remote arrows from scrolling the page when focus is outside controls", () => {
  renderPlayer();
  document.body.focus();

  const eventWasNotCancelled = fireEvent.keyDown(window, { key: "ArrowDown" });

  expect(eventWasNotCancelled).toBe(false);
});

test("remote arrows move focus inside the episode dialog", () => {
  const { playerProps } = renderPlayerWithEpisodeDialog({
    episodes: [
      { name: "1", slug: "tap-1", episodeKey: "0:tap-1" },
      { name: "2", slug: "tap-2", episodeKey: "0:tap-2" },
      { name: "3", slug: "tap-3", episodeKey: "0:tap-3" },
    ],
  });

  fireEvent.click(screen.getByRole("button", { name: "Danh sách tập" }));
  expect(screen.getByRole("button", { name: "Tập 1" })).toHaveFocus();

  fireEvent.keyDown(window, { key: "ArrowRight" });
  expect(screen.getByRole("button", { name: "Tập 2" })).toHaveFocus();

  fireEvent.keyDown(window, { key: "Enter" });
  expect(playerProps.onSelectEpisode).toHaveBeenCalledWith(playerProps.episodes[1]);
});

test("remote vertical arrows keep visible focus moving through episode dialog items", () => {
  renderPlayerWithEpisodeDialog({
    episodes: [
      { name: "1", slug: "tap-1", episodeKey: "0:tap-1" },
      { name: "2", slug: "tap-2", episodeKey: "0:tap-2" },
      { name: "3", slug: "tap-3", episodeKey: "0:tap-3" },
    ],
  });

  fireEvent.click(screen.getByRole("button", { name: "Danh sách tập" }));
  const episodeOne = screen.getByRole("button", { name: "Tập 1" });
  const episodeTwo = screen.getByRole("button", { name: "Tập 2" });
  const episodeThree = screen.getByRole("button", { name: "Tập 3" });

  expect(episodeOne).toHaveFocus();
  expect(episodeOne).toHaveClass("episode-sidebar__item--focused");

  fireEvent.keyDown(window, { key: "ArrowDown" });
  expect(episodeTwo).toHaveFocus();
  expect(episodeTwo).toHaveClass("episode-sidebar__item--focused");
  expect(episodeOne).not.toHaveClass("episode-sidebar__item--focused");

  fireEvent.keyDown(window, { key: "ArrowDown" });
  expect(episodeThree).toHaveFocus();
  expect(episodeThree).toHaveClass("episode-sidebar__item--focused");
  expect(episodeTwo).not.toHaveClass("episode-sidebar__item--focused");

  fireEvent.keyDown(window, { key: "ArrowUp" });
  expect(episodeTwo).toHaveFocus();
  expect(episodeTwo).toHaveClass("episode-sidebar__item--focused");
  expect(episodeThree).not.toHaveClass("episode-sidebar__item--focused");
});

test("double tap on left half seeks backward 10 seconds", () => {
  const { container, video } = renderPlayer();
  const player = mockPlayerBounds(container);
  video.currentTime = 40;

  fireEvent.touchStart(player, { touches: [{ clientX: 40 }] });
  fireEvent.touchStart(player, { touches: [{ clientX: 40 }] });

  expect(video.currentTime).toBe(30);
  expect(screen.getByText("-10s")).toBeInTheDocument();
});

test("double tap on right half seeks forward 10 seconds", () => {
  const { container, video } = renderPlayer();
  const player = mockPlayerBounds(container);
  video.currentTime = 40;

  fireEvent.touchStart(player, { touches: [{ clientX: 160 }] });
  fireEvent.touchStart(player, { touches: [{ clientX: 160 }] });

  expect(video.currentTime).toBe(50);
  expect(screen.getByText("+10s")).toBeInTheDocument();
});
