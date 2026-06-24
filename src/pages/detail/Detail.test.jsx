import React from "react";
import "@testing-library/jest-dom";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import Detail from "./Detail";
import tmdbApi from "../../api/tmdbApi";
import { clearAllEpisodeLinks } from "../../utils/episodeLinkManager";
import { clearWatchHistory } from "../../utils/watchHistoryManager";

const mockCustomVideoPlayer = jest.fn();

jest.mock("hls.js", () => ({
  isSupported: () => false,
}));

jest.mock("../../api/tmdbApi", () => ({
  detail: jest.fn(),
  episode: jest.fn(() => Promise.resolve({ playlistUrl: null })),
}));

jest.mock("../../utils/tmdbImageFetcher", () => ({
  fetchTMDBImages: jest.fn(() =>
    Promise.resolve({
      posterUrl: "/poster.jpg",
      backdropUrl: "/backdrop.jpg",
      overview: "",
    }),
  ),
}));

jest.mock("../../components/similar-movies/SimilarMovies", () => () => (
  <div>Similar movies loaded</div>
));

jest.mock("../../components/video-player/CustomVideoPlayer", () => ({
  __esModule: true,
  default: (props) => mockCustomVideoPlayer(props),
  shouldUseNativeControls: jest.fn(() => false),
}));

jest.mock(
  "../../components/episode-scroll/EpisodeScroll",
  () =>
    ({ episodes, onSelectEpisode }) => (
      <button type="button" onClick={() => onSelectEpisode(episodes[1])}>
        Chọn tập 2
      </button>
    ),
);

jest.mock("react-helmet", () => ({
  Helmet: ({ children }) => <>{children}</>,
}));

const NavigateToEpisodeButton = () => {
  const navigate = useNavigate();

  return (
    <button type="button" onClick={() => navigate("?ep=0:tap-2")}>
      Đi tới tập 2
    </button>
  );
};

const NavigateToMovieButton = () => {
  const navigate = useNavigate();

  return (
    <button type="button" onClick={() => navigate("/movie/next-movie")}>
      Đi tới phim mới
    </button>
  );
};

const movieDetail = {
  title: "Test Movie",
  name: "Test Movie",
  content: "Test content",
  episode_current: "Tập 2",
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

const renderDetail = (initialEntry = "/movie/test-movie") =>
  render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/:category/:id" element={<Detail />} />
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
  clearAllEpisodeLinks();
  await clearWatchHistory();
  mockCustomVideoPlayer.mockClear();
  mockCustomVideoPlayer.mockImplementation(({ videoRef }) => (
    <video ref={videoRef} data-testid="video-player" />
  ));
  localStorage.clear();
  window.scrollTo = jest.fn();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  window.HTMLMediaElement.prototype.load = jest.fn();
  tmdbApi.detail.mockResolvedValue({ data: { item: movieDetail } });
  tmdbApi.episode.mockResolvedValue({ playlistUrl: "/video.m3u8" });
});

afterEach(() => {
  jest.useRealTimers();
});

test("reserves the detail layout while movie data is loading", () => {
  tmdbApi.detail.mockImplementation(() => new Promise(() => {}));

  const { container } = render(
    <MemoryRouter
      initialEntries={["/movie/test-movie"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/:category/:id" element={<Detail />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(
    screen.getByRole("status", { name: "Đang tải phim" }),
  ).toBeInTheDocument();
  expect(container.querySelector(".banner")).toBeInTheDocument();
  expect(container.querySelector(".movie-content")).toBeInTheDocument();
  expect(container.querySelector(".video-wrapper")).toBeInTheDocument();
});

test("saved progress prefers group-aware episode keys over legacy episode names", async () => {
  localStorage.setItem(
    "ophim_watch_history:v1",
    JSON.stringify([
      {
        key: "test-movie_0:tap-1",
        movieId: "test-movie",
        episodeName: "0:tap-1",
        currentTime: 240,
        duration: 1200,
        percentage: 20,
      },
      {
        key: "test-movie_1",
        movieId: "test-movie",
        episodeName: "1",
        currentTime: 120,
        duration: 1200,
        percentage: 10,
      },
    ]),
  );

  render(
    <MemoryRouter
      initialEntries={["/movie/test-movie?ep=0:tap-1"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/:category/:id" element={<Detail />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByText(/Tiếp tục xem từ/)).toHaveTextContent(
    "Tiếp tục xem từ 04:00?",
  );
});

test("passes episode navigation props to the custom video player", async () => {
  renderDetail("/movie/test-movie?ep=0:tap-1");

  await waitFor(() => expect(mockCustomVideoPlayer).toHaveBeenCalled());

  expect(mockCustomVideoPlayer.mock.calls.at(-1)[0]).toEqual(
    expect.objectContaining({
      canGoPrevEpisode: false,
      canGoNextEpisode: true,
      nextEpisodeName: "2",
      autoPlayDuration: 10,
      autoPlayEnabled: true,
      onPrevEpisode: expect.any(Function),
      onNextEpisode: expect.any(Function),
      onCancelAutoPlay: expect.any(Function),
      onToggleAutoPlay: expect.any(Function),
    }),
  );
});

test("custom video player auto-play toggle controls the existing setting", async () => {
  renderDetail("/movie/test-movie?ep=0:tap-1");

  await waitFor(() => expect(mockCustomVideoPlayer).toHaveBeenCalled());

  act(() => {
    mockCustomVideoPlayer.mock.calls.at(-1)[0].onToggleAutoPlay();
  });

  expect(mockCustomVideoPlayer.mock.calls.at(-1)[0]).toEqual(
    expect.objectContaining({
      autoPlayEnabled: false,
    }),
  );
});

test("starts autoplay countdown when a long video reaches 95 percent watched", async () => {
  renderDetail("/movie/test-movie?ep=0:tap-1");

  const video = await screen.findByTestId("video-player");
  setMediaProperty(video, "duration", 1200);
  setMediaProperty(video, "currentTime", 1140);

  fireEvent(video, new Event("timeupdate"));

  await waitFor(() =>
    expect(mockCustomVideoPlayer.mock.calls.at(-1)[0]).toEqual(
      expect.objectContaining({
        showAutoPlayNotice: true,
        autoPlayCountdown: 10,
      }),
    ),
  );
});

test("advances to the next episode when the autoplay countdown finishes", async () => {
  jest.useFakeTimers();
  const { unmount } = renderDetail("/movie/test-movie?ep=0:tap-1");

  const video = await screen.findByTestId("video-player");
  setMediaProperty(video, "duration", 1200);
  setMediaProperty(video, "currentTime", 1140);

  fireEvent(video, new Event("timeupdate"));

  await waitFor(() =>
    expect(mockCustomVideoPlayer.mock.calls.at(-1)[0]).toEqual(
      expect.objectContaining({
        showAutoPlayNotice: true,
        autoPlayCountdown: 10,
      }),
    ),
  );

  act(() => {
    jest.advanceTimersByTime(10000);
  });

  await waitFor(() =>
    expect(mockCustomVideoPlayer.mock.calls.at(-1)[0]).toEqual(
      expect.objectContaining({
        episodeName: "2",
      }),
    ),
  );

  setMediaProperty(video, "currentTime", 0);
  setMediaProperty(video, "duration", 0);
  unmount();
  localStorage.clear();
  jest.useRealTimers();
});

test("does not start autoplay countdown before the minimum 10-second window", async () => {
  renderDetail("/movie/test-movie?ep=0:tap-1");

  const video = await screen.findByTestId("video-player");
  setMediaProperty(video, "duration", 100);
  setMediaProperty(video, "currentTime", 89.5);

  fireEvent(video, new Event("timeupdate"));

  expect(mockCustomVideoPlayer.mock.calls.at(-1)[0]).toEqual(
    expect.objectContaining({
      showAutoPlayNotice: false,
      autoPlayCountdown: null,
    }),
  );
});

test("hides the download button by default", async () => {
  renderDetail("/movie/test-movie?ep=0:tap-1");

  await screen.findByTestId("video-player");

  expect(
    screen.queryByRole("button", { name: /Tải về/i }),
  ).not.toBeInTheDocument();
});

test("shows the download button when download query param is enabled", async () => {
  renderDetail("/movie/test-movie?ep=0:tap-1&download=1");

  await screen.findByTestId("video-player");

  expect(screen.getByRole("button", { name: /Tải về/i })).toBeInTheDocument();
});

test("shows saved progress notice for progress at the 1 percent threshold", async () => {
  localStorage.setItem(
    "ophim_watch_history:v1",
    JSON.stringify([
      {
        key: "test-movie_0:tap-1",
        movieId: "test-movie",
        episodeName: "0:tap-1",
        currentTime: 12,
        duration: 1200,
        percentage: 1,
      },
    ]),
  );

  renderDetail("/movie/test-movie?ep=0:tap-1");

  expect(await screen.findByText(/Tiếp tục xem từ/)).toHaveTextContent(
    "Tiếp tục xem từ 00:12?",
  );
});

test("selecting an episode updates the URL without refetching movie detail", async () => {
  render(
    <MemoryRouter
      initialEntries={["/movie/test-movie"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/:category/:id" element={<Detail />} />
      </Routes>
    </MemoryRouter>,
  );

  await screen.findByText("Chọn tập 2");
  expect(tmdbApi.detail).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByText("Chọn tập 2"));

  await waitFor(() => expect(tmdbApi.detail).toHaveBeenCalledTimes(1));
});

test("defers similar movies until after the critical video area renders", async () => {
  render(
    <MemoryRouter
      initialEntries={["/movie/test-movie"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/:category/:id" element={<Detail />} />
      </Routes>
    </MemoryRouter>,
  );

  await screen.findByTestId("video-player");

  expect(screen.queryByText("Similar movies loaded")).not.toBeInTheDocument();
});

test("URL episode changes load saved progress for the new episode", async () => {
  localStorage.setItem(
    "ophim_watch_history:v1",
    JSON.stringify([
      {
        key: "test-movie_2",
        movieId: "test-movie",
        episodeName: "2",
        currentTime: 120,
        duration: 1200,
        percentage: 10,
      },
    ]),
  );

  render(
    <MemoryRouter
      initialEntries={["/movie/test-movie"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="/:category/:id"
          element={
            <>
              <NavigateToEpisodeButton />
              <Detail />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

  await screen.findByText("Đi tới tập 2");
  expect(screen.queryByText(/Tiếp tục xem từ/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByText("Đi tới tập 2"));

  expect(await screen.findByText(/Tiếp tục xem từ/)).toHaveTextContent(
    "Tiếp tục xem từ 02:00?",
  );
});

test("saves final watch progress on unmount before the 5-second interval", async () => {
  const { unmount } = renderDetail();

  const video = await screen.findByTestId("video-player");
  setMediaProperty(video, "currentTime", 123);
  setMediaProperty(video, "duration", 1200);

  fireEvent(video, new Event("timeupdate"));
  unmount();

  const history = JSON.parse(localStorage.getItem("ophim_watch_history:v1"));
  expect(history[0]).toMatchObject({
    key: "test-movie_0:tap-1",
    movieId: "test-movie",
    episodeName: "0:tap-1",
    currentTime: 123,
    duration: 1200,
  });
});

test("saves final watch progress on pagehide before the 5-second interval", async () => {
  renderDetail();

  const video = await screen.findByTestId("video-player");
  setMediaProperty(video, "currentTime", 234);
  setMediaProperty(video, "duration", 1200);

  fireEvent(video, new Event("timeupdate"));

  act(() => {
    window.dispatchEvent(new Event("pagehide"));
  });

  const history = JSON.parse(localStorage.getItem("ophim_watch_history:v1"));
  expect(history[0]).toMatchObject({
    key: "test-movie_0:tap-1",
    currentTime: 234,
    duration: 1200,
  });
});

test("shows a playback error when the current episode has no playable link", async () => {
  tmdbApi.episode.mockResolvedValue({ playlistUrl: null, link_embed: null });

  render(
    <MemoryRouter
      initialEntries={["/movie/test-movie"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/:category/:id" element={<Detail />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(
    await screen.findByText("Không tìm thấy link phát video."),
  ).toBeInTheDocument();
});

test("route id changes do not request old episode slug for the new movie while detail is pending", async () => {
  tmdbApi.detail
    .mockResolvedValueOnce({ data: { item: movieDetail } })
    .mockImplementationOnce(() => new Promise(() => {}));

  render(
    <MemoryRouter
      initialEntries={["/movie/test-movie"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="/:category/:id"
          element={
            <>
              <NavigateToMovieButton />
              <Detail />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

  await screen.findByTestId("video-player");

  fireEvent.click(screen.getByText("Đi tới phim mới"));

  await waitFor(() => expect(tmdbApi.detail).toHaveBeenCalledTimes(2));

  expect(tmdbApi.episode).not.toHaveBeenCalledWith("next-movie", "tap-1", 0);
});
