import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TvDetail from "./TvDetail";
import { FocusProvider } from "../../context/FocusContext";
import tmdbApi from "../../api/tmdbApi";
import { fetchTMDBImages } from "../../utils/tmdbImageFetcher";
import {
  clearWatchHistory,
  getRecentInProgressMovies,
} from "../../utils/watchHistoryManager";

const mockCustomVideoPlayer = jest.fn();
const AUTOPLAY_PREFERENCE_KEY = "ophim:auto-play-enabled";

const movieDetail = {
  name: "Test Movie",
  origin_name: "Test Movie Original",
  tmdb: { id: 999, type: "movie" },
  thumb_url: "ophim-thumb.jpg",
  poster_url: "ophim-poster.jpg",
  content: "<p>OPhim description</p>",
  episodes: [
    {
      server_name: "Vietsub",
      server_data: [
        { name: "1", slug: "tap-1" },
        { name: "2", slug: "tap-2" },
      ],
    },
  ],
};

jest.mock("../../api/tmdbApi", () => ({
  detail: jest.fn(),
  similar: jest.fn(() => Promise.resolve({ data: { items: [] } })),
}));

jest.mock("../../utils/tmdbImageFetcher", () => ({
  fetchTMDBImages: jest.fn(() =>
    Promise.resolve({ backdropUrl: "", overview: "" }),
  ),
}));

jest.mock("@noriginmedia/norigin-spatial-navigation", () => {
  const React = require("react");
  const registry = new Map();
  let currentFocusKey = null;

  const setFocus = (focusKey) => {
    currentFocusKey = focusKey;
    registry.get(focusKey)?.focus?.();
  };

  return {
    __esModule: true,
    destroy: () => {
      registry.clear();
      currentFocusKey = null;
    },
    doesFocusableExist: (focusKey) => registry.has(focusKey),
    getCurrentFocusKey: jest.fn(() => currentFocusKey),
    init: jest.fn(),
    setFocus,
    useFocusable: ({ focusKey } = {}) => {
      const ref = React.useMemo(() => {
        const callbackRef = (node) => {
          callbackRef.current = node;
          if (node && focusKey) registry.set(focusKey, node);
        };
        callbackRef.current = null;
        return callbackRef;
      }, [focusKey]);

      React.useEffect(() => () => {
        registry.delete(focusKey);
      }, [focusKey]);

      return {
        ref,
        focused: currentFocusKey === focusKey,
        hasFocusedChild: false,
        focusSelf: () => setFocus(focusKey),
      };
    },
  };
});

jest.mock("../../components/video-player/CustomVideoPlayer", () => ({
  __esModule: true,
  default: (props) => mockCustomVideoPlayer(props),
}));

jest.mock("../../components/content-row/ContentRow", () => () => null);
jest.mock("../../components/episode-list-item/EpisodeListItem", () => () => null);
jest.mock("../../components/episode-group-accordion/EpisodeGroupAccordion", () => () => null);

const renderTvDetail = (initialEntry = "/movie/test-movie?ep=0:tap-2") =>
  render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <FocusProvider>
        <Routes>
          <Route path="/movie/:id" element={<TvDetail />} />
        </Routes>
      </FocusProvider>
    </MemoryRouter>,
  );

const setMediaProperty = (element, property, value) => {
  Object.defineProperty(element, property, {
    configurable: true,
    writable: true,
    value,
  });
};

const mockPlayerWithAutoplayToggle = () => {
  mockCustomVideoPlayer.mockImplementation(({
    videoRef,
    autoPlayEnabled,
    onToggleAutoPlay,
  }) => (
    <div>
      <video ref={videoRef} data-testid="video-player" />
      <button
        type="button"
        aria-label={autoPlayEnabled ? "Tắt tự động phát" : "Bật tự động phát"}
        aria-pressed={Boolean(autoPlayEnabled)}
        onClick={onToggleAutoPlay}
      >
        Autoplay
      </button>
    </div>
  ));
};

beforeEach(async () => {
  await clearWatchHistory();
  mockCustomVideoPlayer.mockClear();
  mockCustomVideoPlayer.mockImplementation(({ videoRef, onClose }) => {
    React.useEffect(() => {
      const handleKeyDown = (event) => {
        if (event.key === "Backspace" || event.key === "Escape") {
          onClose?.();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    return (
      <div className="custom-video-player">
        <video ref={videoRef} data-testid="video-player" />
      </div>
    );
  });
  localStorage.clear();
  tmdbApi.detail.mockResolvedValue({ data: { item: movieDetail } });
  tmdbApi.similar.mockResolvedValue({ data: { items: [] } });
  fetchTMDBImages.mockResolvedValue({ backdropUrl: "", overview: "" });
  window.history.pushState = jest.fn();
  window.scrollTo = jest.fn();
  window.HTMLMediaElement.prototype.load = jest.fn();
  window.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };
});

afterEach(() => {
  jest.useRealTimers();
});

test("passes previous episode props when TV detail starts on a later episode", async () => {
  renderTvDetail();

  fireEvent.click(await screen.findByRole("button", { name: /Phát Tập 2/i }));

  await waitFor(() => expect(mockCustomVideoPlayer).toHaveBeenCalled());

  const playerProps = mockCustomVideoPlayer.mock.calls.at(-1)[0];

  expect(playerProps).toEqual(
    expect.objectContaining({
      canGoPrevEpisode: true,
      canGoNextEpisode: false,
      onPrevEpisode: expect.any(Function),
      onNextEpisode: expect.any(Function),
    }),
  );
});

test("enables autoplay by default when no saved preference exists", async () => {
  renderTvDetail();

  fireEvent.click(await screen.findByRole("button", { name: /Phát Tập 2/i }));

  await waitFor(() => expect(mockCustomVideoPlayer).toHaveBeenCalled());

  const playerProps = mockCustomVideoPlayer.mock.calls.at(-1)[0];

  expect(playerProps.autoPlayEnabled).toBe(true);
});

test("uses the saved disabled autoplay preference", async () => {
  localStorage.setItem(AUTOPLAY_PREFERENCE_KEY, "false");

  renderTvDetail();

  fireEvent.click(await screen.findByRole("button", { name: /Phát Tập 2/i }));

  await waitFor(() => expect(mockCustomVideoPlayer).toHaveBeenCalled());

  const playerProps = mockCustomVideoPlayer.mock.calls.at(-1)[0];

  expect(playerProps.autoPlayEnabled).toBe(false);
});

test("persists autoplay preference when the player toggle changes", async () => {
  mockPlayerWithAutoplayToggle();

  renderTvDetail();

  fireEvent.click(await screen.findByRole("button", { name: /Phát Tập 2/i }));

  fireEvent.click(await screen.findByRole("button", { name: "Tắt tự động phát" }));

  await screen.findByRole("button", { name: "Bật tự động phát" });

  expect(localStorage.getItem(AUTOPLAY_PREFERENCE_KEY)).toBe("false");

  fireEvent.click(screen.getByRole("button", { name: "Bật tự động phát" }));
  await screen.findByRole("button", { name: "Tắt tự động phát" });
  expect(localStorage.getItem(AUTOPLAY_PREFERENCE_KEY)).toBe("true");
});

test("keeps autoplay usable when localStorage throws", async () => {
  const getItemSpy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("storage read failed");
  });
  const setItemSpy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("storage write failed");
  });
  try {
    mockPlayerWithAutoplayToggle();

    renderTvDetail();
    fireEvent.click(await screen.findByRole("button", { name: /Phát Tập 2/i }));

    expect(await screen.findByRole("button", { name: "Tắt tự động phát" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Tắt tự động phát" }));

    expect(await screen.findByRole("button", { name: "Bật tự động phát" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  } finally {
    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  }
});

test("scrolls TV detail to the hero when the play button receives focus", async () => {
  renderTvDetail();
  const playButton = await screen.findByRole("button", { name: /Phát/ });

  fireEvent.focus(playButton);

  await waitFor(() => {
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});

test("marks the TV detail page as the scroll root for returning to the play button", async () => {
  renderTvDetail();

  await screen.findByRole("button", { name: /Phát/ });

  expect(document.querySelector(".tv-detail")).toHaveAttribute(
    "data-focus-scroll-root",
    "true",
  );
});

test("returns focus to the detail play button after closing player", async () => {
  renderTvDetail();

  const playButton = await screen.findByRole("button", { name: /Phát|Xem tiếp/i });
  await waitFor(() => expect(playButton).toHaveFocus());

  fireEvent.click(playButton);
  fireEvent.keyDown(window, { key: "Backspace" });

  await waitFor(() => expect(playButton).toHaveFocus());
});

test("uses the TMDB backdrop on TV detail when available", async () => {
  fetchTMDBImages.mockResolvedValue({
    backdropUrl: "https://image.tmdb.org/t/p/original/backdrop.jpg",
    overview: "TMDB overview",
  });

  renderTvDetail();

  await screen.findByRole("button", { name: /Phát/ });

  await waitFor(() => {
    expect(fetchTMDBImages).toHaveBeenCalledWith({ id: 999, type: "movie" });
    expect(document.querySelector(".tv-detail__hero")).toHaveStyle({
      backgroundImage: 'url("https://image.tmdb.org/t/p/original/backdrop.jpg")',
    });
  });
  expect(screen.getByText("TMDB overview")).toBeInTheDocument();
});

test("falls back to OPhim artwork when TMDB has no backdrop", async () => {
  fetchTMDBImages.mockResolvedValue({ backdropUrl: "", overview: "" });

  renderTvDetail();

  await screen.findByRole("button", { name: /Phát/ });

  await waitFor(() => {
    expect(document.querySelector(".tv-detail__hero")).toHaveStyle({
      backgroundImage: 'url("https://img.ophim.live/uploads/movies/ophim-thumb.jpg")',
    });
  });
  expect(screen.getByText("OPhim description")).toBeInTheDocument();
});

test("persists TV detail progress so home can show continue watching after leaving", async () => {
  const { unmount } = renderTvDetail("/movie/test-movie?ep=0:tap-1");

  fireEvent.click(await screen.findByRole("button", { name: /Phát Tập 1/i }));

  const video = await screen.findByTestId("video-player");
  setMediaProperty(video, "currentTime", 180);
  setMediaProperty(video, "duration", 1200);
  fireEvent.timeUpdate(video);

  unmount();

  await waitFor(async () => {
    expect(await getRecentInProgressMovies()).toEqual([
      expect.objectContaining({
        movieId: "test-movie",
        episodeName: "0:tap-1",
        currentTime: 180,
        duration: 1200,
        movieInfo: expect.objectContaining({
          title: "Test Movie",
          slug: "test-movie",
          tmdb: { id: 999, type: "movie" },
        }),
      }),
    ]);
  });
});

test("labels the TV detail play button as continue watching when saved progress exists", async () => {
  localStorage.setItem(
    "ophim_watch_history:v1",
    JSON.stringify([
      {
        key: "test-movie_0:tap-2",
        movieId: "test-movie",
        episodeName: "0:tap-2",
        currentTime: 240,
        duration: 1200,
        percentage: 20,
        timestamp: "2026-05-18T00:00:00.000Z",
        movieInfo: { title: "Test Movie", slug: "test-movie" },
      },
    ]),
  );

  renderTvDetail("/movie/test-movie?ep=0:tap-2");

  expect(await screen.findByRole("button", { name: /Xem tiếp Tập 2/i })).toBeInTheDocument();
});
