import React from "react";
import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ContinueWatchingList from "./ContinueWatchingList";
import {
  getRecentInProgressMovies,
  getRecentInProgressMoviesSnapshot,
} from "../../utils/watchHistoryManager";
import { useFocus, useFocusable } from "../../context/FocusContext";
import { fetchTMDBImages } from "../../utils/tmdbImageFetcher";

jest.mock("../../context/FocusContext", () => ({
  FOCUS_KEYS: {
    HOME_HERO_PLAY: "HOME_HERO_PLAY",
  },
  focusKeyForHomeCard: (rowId, index) => `HOME_CARD_${rowId}_${index}`,
  useFocus: jest.fn(() => ({
    focusByKey: jest.fn(),
    rememberContentFocus: jest.fn(),
  })),
  useFocusable: jest.fn(() => ({
    ref: { current: null },
    focused: false,
  })),
}));

jest.mock("../../utils/watchHistoryManager", () => ({
  getRecentInProgressMovies: jest.fn(),
  getRecentInProgressMoviesSnapshot: jest.fn(),
}));

jest.mock("../../utils/tmdbImageFetcher", () => ({
  fetchTMDBImages: jest.fn(),
}));

const WATCH_HISTORY_KEY = "ophim_watch_history:v1";
const mockedGetRecentInProgressMovies = getRecentInProgressMovies;
const mockedGetRecentInProgressMoviesSnapshot = getRecentInProgressMoviesSnapshot;
const mockedFetchTMDBImages = fetchTMDBImages;
let mockRecentInProgressMovies;
let mockRecentInProgressMoviesSnapshot;

const renderContinueWatchingList = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ContinueWatchingList />
    </MemoryRouter>,
  );

const renderTvContinueWatchingList = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ContinueWatchingList tvFocusable row={0} />
    </MemoryRouter>,
  );

const renderTvContinueWatchingListInZone = (zone) =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ContinueWatchingList tvFocusable row={0} zone={zone} />
    </MemoryRouter>,
  );

const renderContinueWatchingSkeleton = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ContinueWatchingList showSkeleton />
    </MemoryRouter>,
  );

const cloneItems = (items) => items.map((item) => ({ ...item, movieInfo: { ...item.movieInfo } }));

const seedHistory = (items) => {
  mockRecentInProgressMovies = cloneItems(items);
  mockRecentInProgressMoviesSnapshot = cloneItems(items);
  localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(items));
};

const makeHistoryItem = ({ movieId = "movie-1", title = "Test Movie" } = {}) => ({
  key: `${movieId}_0:tap-1`,
  movieId,
  episodeName: "0:tap-1",
  currentTime: 120,
  duration: 600,
  percentage: 20,
  timestamp: "2026-05-18T00:00:00.000Z",
  movieInfo: {
    title,
    poster: "/test-poster.jpg",
    slug: movieId,
  },
});

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  mockRecentInProgressMovies = [];
  mockRecentInProgressMoviesSnapshot = [];
  mockedGetRecentInProgressMovies.mockClear();
  mockedGetRecentInProgressMoviesSnapshot.mockClear();
  mockedFetchTMDBImages.mockClear();
  mockedFetchTMDBImages.mockResolvedValue({ posterUrl: "" });
  mockedGetRecentInProgressMovies.mockImplementation(() => new Promise(() => {}));
  mockedGetRecentInProgressMoviesSnapshot.mockImplementation(() =>
    cloneItems(mockRecentInProgressMoviesSnapshot),
  );
  localStorage.clear();
  useFocus.mockClear();
  useFocus.mockImplementation(() => ({
    focusByKey: jest.fn(),
    rememberContentFocus: jest.fn(),
  }));
  useFocusable.mockClear();
  useFocusable.mockImplementation(() => ({
    ref: { current: null },
    focused: false,
  }));
});

test("renders nothing when there is no in-progress history", async () => {
  seedHistory([]);
  mockedGetRecentInProgressMovies.mockResolvedValueOnce([]);

  renderContinueWatchingList();

  await waitFor(() => {
    expect(screen.queryByRole("heading", { name: "Tiếp tục xem" })).not.toBeInTheDocument();
  });
});

test("uses the snapshot for immediate render before the async history load resolves", async () => {
  const asyncHistoryLoaded = Promise.resolve([makeHistoryItem({ movieId: "movie-2", title: "Async Movie" })]);
  seedHistory([makeHistoryItem({ movieId: "movie-1", title: "Snapshot Movie" })]);
  mockedGetRecentInProgressMovies.mockReturnValueOnce(asyncHistoryLoaded);

  renderContinueWatchingList();

  expect(screen.getByText("Snapshot Movie")).toBeInTheDocument();
  expect(mockedGetRecentInProgressMoviesSnapshot).toHaveBeenCalledWith(10);
  expect(mockedGetRecentInProgressMovies).toHaveBeenCalledWith(10);
  expect(await screen.findByText("Async Movie")).toBeInTheDocument();
  expect(screen.queryByText("Snapshot Movie")).not.toBeInTheDocument();
});

test("keeps the section mounted until async load confirms there are no items", async () => {
  let resolveLoad;
  seedHistory([]);
  mockedGetRecentInProgressMovies.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveLoad = resolve;
    }),
  );

  renderContinueWatchingList();

  expect(screen.getByRole("heading", { name: "Tiếp tục xem" })).toBeInTheDocument();

  await act(async () => {
    resolveLoad([]);
  });

  await waitFor(() => {
    expect(screen.queryByRole("heading", { name: "Tiếp tục xem" })).not.toBeInTheDocument();
  });
});

test("renders a continue watching card linked to the resume episode", () => {
  seedHistory([
    {
      movieId: "movie-1",
      episodeName: "0:tap-1",
      currentTime: 120,
      duration: 600,
      percentage: 20,
      timestamp: "2026-05-18T00:00:00.000Z",
      movieInfo: {
        title: "Test Movie",
        poster: "/test-poster.jpg",
        slug: "test-movie",
      },
    },
  ]);

  renderContinueWatchingList();

  expect(screen.getByLabelText("Tiếp tục xem")).toHaveClass("content-row");
  expect(screen.getByRole("link", { name: /Test Movie/i })).toHaveClass("content-row__card");
  expect(screen.getByText("Test Movie")).toHaveClass("content-row__name");
  expect(screen.getByText("Tập 1")).toHaveClass("content-row__year");
  expect(screen.getByText("Đã xem 20%")).toHaveClass("content-row__badge");
  expect(screen.getByRole("link", { name: /Test Movie/i })).toHaveAttribute(
    "href",
    "/movie/test-movie?ep=0%3Atap-1",
  );
});

test("does not register TV focus targets during default rendering", () => {
  seedHistory([
    makeHistoryItem({ movieId: "movie-1", title: "First Movie" }),
    makeHistoryItem({ movieId: "movie-2", title: "Second Movie" }),
  ]);

  renderContinueWatchingList();

  expect(useFocusable).not.toHaveBeenCalled();
});

test("registers continue watching cards as TV focus targets through ContentRow", () => {
  seedHistory([
    makeHistoryItem({ movieId: "movie-1", title: "First Movie" }),
    makeHistoryItem({ movieId: "movie-2", title: "Second Movie" }),
  ]);

  renderTvContinueWatchingList();

  expect(useFocusable).toHaveBeenCalledTimes(2);
  expect(useFocusable).toHaveBeenCalledWith(expect.objectContaining({
    focusKey: "HOME_CARD_continue-watching_0",
  }));
  expect(useFocusable).toHaveBeenCalledWith(expect.objectContaining({
    focusKey: "HOME_CARD_continue-watching_1",
  }));
});

test("keeps continue watching TV focus keys stable with a custom zone", () => {
  seedHistory([
    makeHistoryItem({ movieId: "movie-1", title: "First Movie" }),
    makeHistoryItem({ movieId: "movie-2", title: "Second Movie" }),
  ]);

  renderTvContinueWatchingListInZone(5);

  expect(useFocusable).toHaveBeenCalledTimes(2);
  expect(useFocusable).toHaveBeenCalledWith(expect.objectContaining({
    focusKey: "HOME_CARD_continue-watching_0",
  }));
  expect(useFocusable).toHaveBeenCalledWith(expect.objectContaining({
    focusKey: "HOME_CARD_continue-watching_1",
  }));
});

test("marks the focused TV continue watching card", () => {
  useFocusable.mockImplementation((config = {}) => ({
    ref: { current: null },
    focused: config.focusKey === "HOME_CARD_continue-watching_1",
  }));
  seedHistory([
    makeHistoryItem({ movieId: "movie-1", title: "First Movie" }),
    makeHistoryItem({ movieId: "movie-2", title: "Second Movie" }),
  ]);

  renderTvContinueWatchingList();

  expect(screen.getByRole("link", { name: /First Movie/i })).not.toHaveClass(
    "content-row__card--focused",
  );
  expect(screen.getByRole("link", { name: /Second Movie/i })).toHaveClass(
    "content-row__card--focused",
  );
});

test("scrolls the focused TV continue watching card into view", () => {
  const scrollIntoView = jest.fn();
  const focusedCardRef = {};
  Object.defineProperty(focusedCardRef, "current", {
    get: () => ({ scrollIntoView }),
    set: () => {},
  });
  useFocusable.mockImplementation((config = {}) => ({
    ref: config.focusKey === "HOME_CARD_continue-watching_1" ? focusedCardRef : { current: null },
    focused: config.focusKey === "HOME_CARD_continue-watching_1",
  }));
  seedHistory([
    makeHistoryItem({ movieId: "movie-1", title: "First Movie" }),
    makeHistoryItem({ movieId: "movie-2", title: "Second Movie" }),
  ]);

  renderTvContinueWatchingList();

  expect(scrollIntoView).toHaveBeenCalledWith({
    behavior: "smooth",
    block: "nearest",
    inline: "center",
  });
});

test("renders stored progress that only has current time and duration", () => {
  seedHistory([
    {
      movieId: "movie-1",
      episodeName: "0:tap-1",
      currentTime: 120,
      duration: 600,
      timestamp: "2026-05-18T00:00:00.000Z",
      movieInfo: {
        title: "Test Movie",
        poster: "/test-poster.jpg",
        slug: "test-movie",
      },
    },
  ]);

  renderContinueWatchingList();

  expect(screen.getByText("Test Movie")).toBeInTheDocument();
  expect(screen.getByText("Đã xem 20%")).toBeInTheDocument();
});

test("maps TMDB metadata and stored poster into the ContentRow card", async () => {
  seedHistory([
    {
      movieId: "movie-1",
      episodeName: "0:tap-1",
      currentTime: 120,
      duration: 600,
      percentage: 20,
      timestamp: "2026-05-18T00:00:00.000Z",
      movieInfo: {
        title: "TMDB Movie",
        poster: "/stored-poster.jpg",
        slug: "tmdb-movie",
        tmdb: { id: 123, type: "movie" },
      },
    },
  ]);

  renderContinueWatchingList();

  expect(mockedFetchTMDBImages).toHaveBeenCalledWith({ id: 123, type: "movie" });
  expect(screen.getByRole("img", { name: "TMDB Movie" })).toHaveAttribute(
    "src",
    "/stored-poster.jpg",
  );
});

test("renders responsive skeleton cards while loading", () => {
  seedHistory([]);

  renderContinueWatchingSkeleton();

  expect(screen.getByRole("heading", { name: "Tiếp tục xem" })).toBeInTheDocument();
  expect(screen.getAllByTestId("continue-watching-skeleton-card")).toHaveLength(6);
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.queryByRole("menuitem", { name: "Xóa khỏi danh sách" })).not.toBeInTheDocument();
});

test("rounds progress percentage consistently", () => {
  seedHistory([
    {
      movieId: "movie-1",
      episodeName: "tap-1",
      currentTime: 122,
      duration: 600,
      percentage: 20.4,
      timestamp: "2026-05-18T00:00:00.000Z",
      movieInfo: {
        title: "Rounded Movie",
        poster: "",
        slug: "rounded-movie",
      },
    },
  ]);

  renderContinueWatchingList();

  expect(screen.getByText("Đã xem 20%")).toBeInTheDocument();
});
