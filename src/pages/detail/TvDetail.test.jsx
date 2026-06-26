import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TvDetail from "./TvDetail";
import tmdbApi from "../../api/tmdbApi";
import { fetchTMDBImages } from "../../utils/tmdbImageFetcher";
import {
  clearWatchHistory,
  getRecentInProgressMovies,
} from "../../utils/watchHistoryManager";

const mockCustomVideoPlayer = jest.fn();

const movieDetail = {
  name: "Test Movie",
  origin_name: "Test Movie Original",
  tmdb: { id: 999, type: "movie" },
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
      <Routes>
        <Route path="/movie/:id" element={<TvDetail />} />
      </Routes>
    </MemoryRouter>,
  );

const setMediaProperty = (element, property, value) => {
  Object.defineProperty(element, property, {
    configurable: true,
    writable: true,
    value,
  });
};

beforeEach(async () => {
  await clearWatchHistory();
  mockCustomVideoPlayer.mockClear();
  mockCustomVideoPlayer.mockImplementation(({ videoRef }) => (
    <video ref={videoRef} data-testid="video-player" />
  ));
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
