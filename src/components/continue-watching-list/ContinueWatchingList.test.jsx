import React from "react";
import fs from "fs";
import path from "path";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import ContinueWatchingList from "./ContinueWatchingList";
import {
  getRecentInProgressMovies,
  getRecentInProgressMoviesSnapshot,
  removeWatchProgress,
} from "../../utils/watchHistoryManager";

jest.mock("../../utils/watchHistoryManager", () => ({
  getRecentInProgressMovies: jest.fn(),
  getRecentInProgressMoviesSnapshot: jest.fn(),
  removeWatchProgress: jest.fn(),
}));

const AUTOPLAY_MODULE_MARKER = "autoplay-module";
const NAVIGATION_MODULE_MARKER = "navigation-module";
let mockSwiper;

jest.mock(
  "swiper/react",
  () => ({
    Swiper: ({
      autoplay,
      children,
      className,
      grabCursor,
      modules,
      onSwiper,
      slidesPerView,
      spaceBetween,
      ...props
    }) => {
      onSwiper?.(mockSwiper);

      return (
        <div
          {...props}
          className={className ? `swiper ${className}` : "swiper"}
          data-has-autoplay-module={
            modules?.includes(AUTOPLAY_MODULE_MARKER) ? "true" : "false"
          }
          data-has-navigation-module={
            modules?.includes(NAVIGATION_MODULE_MARKER) ? "true" : "false"
          }
          data-navigation-next={props.navigation?.nextEl || ""}
          data-navigation-prev={props.navigation?.prevEl || ""}
          data-slides-per-view={slidesPerView}
        >
          {children}
        </div>
      );
    },
    SwiperSlide: ({ children }) => <div className="swiper-slide">{children}</div>,
  }),
  { virtual: true },
);

jest.mock(
  "swiper/modules",
  () => ({
    Autoplay: AUTOPLAY_MODULE_MARKER,
    Navigation: NAVIGATION_MODULE_MARKER,
  }),
  { virtual: true },
);

const WATCH_HISTORY_KEY = "ophim_watch_history:v1";
const mockedGetRecentInProgressMovies = getRecentInProgressMovies;
const mockedGetRecentInProgressMoviesSnapshot = getRecentInProgressMoviesSnapshot;
const mockedRemoveWatchProgress = removeWatchProgress;
let mockRecentInProgressMovies;
let mockRecentInProgressMoviesSnapshot;
const styles = fs.readFileSync(
  path.join(__dirname, "continue-watching-list.scss"),
  "utf8",
);

const renderContinueWatchingList = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ContinueWatchingList />
    </MemoryRouter>,
  );

const renderContinueWatchingSkeleton = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ContinueWatchingList showSkeleton />
    </MemoryRouter>,
  );

const LocationDisplay = () => {
  const location = useLocation();

  return <div data-testid="location-display">{`${location.pathname}${location.search}`}</div>;
};

const renderContinueWatchingListWithLocation = () =>
  render(
    <MemoryRouter
      initialEntries={["/"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="/"
          element={
            <>
              <ContinueWatchingList />
              <LocationDisplay />
            </>
          }
        />
        <Route path="/movie/:slug" element={<LocationDisplay />} />
      </Routes>
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
  mockSwiper = {
    autoplay: {
      start: jest.fn(),
      stop: jest.fn(),
    },
  };
  mockRecentInProgressMovies = [];
  mockRecentInProgressMoviesSnapshot = [];
  mockedGetRecentInProgressMovies.mockImplementation(() => new Promise(() => {}));
  mockedGetRecentInProgressMoviesSnapshot.mockImplementation(() =>
    cloneItems(mockRecentInProgressMoviesSnapshot),
  );
  mockedRemoveWatchProgress.mockImplementation((movieId, episodeName) => {
    const key = `${movieId}_${episodeName}`;
    mockRecentInProgressMovies = mockRecentInProgressMovies.filter((item) => item.key !== key);
    mockRecentInProgressMoviesSnapshot = mockRecentInProgressMoviesSnapshot.filter(
      (item) => item.key !== key,
    );
    localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(cloneItems(mockRecentInProgressMovies)));
    return Promise.resolve();
  });
  localStorage.clear();
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

test("does not let a late initial load restore an optimistically removed item", async () => {
  let resolveInitialLoad;
  const removedItem = makeHistoryItem({ movieId: "movie-1", title: "Removed Movie" });
  seedHistory([removedItem]);
  mockedGetRecentInProgressMovies
    .mockReturnValueOnce(
      new Promise((resolve) => {
        resolveInitialLoad = resolve;
      }),
    )
    .mockResolvedValueOnce([]);

  renderContinueWatchingList();

  fireEvent.contextMenu(screen.getByRole("link", { name: /Removed Movie/i }), {
    clientX: 30,
    clientY: 60,
  });
  fireEvent.click(screen.getByRole("menuitem", { name: "Xóa khỏi danh sách" }));

  expect(screen.queryByText("Removed Movie")).not.toBeInTheDocument();

  await act(async () => {
    resolveInitialLoad([removedItem]);
  });

  expect(screen.queryByText("Removed Movie")).not.toBeInTheDocument();
  expect(mockedGetRecentInProgressMovies).toHaveBeenCalledTimes(2);
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

  const heading = screen.getByRole("heading", { name: "Tiếp tục xem" });
  expect(heading).toBeInTheDocument();
  expect(heading.closest(".section__header.mb-2")).toBeInTheDocument();
  expect(heading.closest("section")).toHaveClass(
    "section",
    "mb-3",
    "continue-watching-list",
  );
  expect(screen.getByText("Test Movie")).toBeInTheDocument();
  expect(screen.getByText("Tập đang xem: Tập 1")).toBeInTheDocument();
  expect(screen.getByText("Đã xem 20%")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Test Movie/i })).toHaveAttribute(
    "href",
    "/movie/test-movie?ep=0%3Atap-1",
  );
  expect(screen.getByTestId("continue-watching-carousel")).toHaveAttribute(
    "data-slides-per-view",
    "auto",
  );
  expect(screen.getByTestId("continue-watching-carousel")).toHaveAttribute(
    "data-has-autoplay-module",
    "true",
  );
  expect(screen.getByTestId("continue-watching-carousel")).toHaveAttribute(
    "data-has-navigation-module",
    "true",
  );
  expect(screen.getByTestId("continue-watching-carousel")).toHaveAttribute(
    "data-navigation-prev",
    ".continue-watching-list__button-prev",
  );
  expect(screen.getByTestId("continue-watching-carousel")).toHaveAttribute(
    "data-navigation-next",
    ".continue-watching-list__button-next",
  );
  expect(
    document.querySelector(".continue-watching-list__button-prev .bx-chevron-left"),
  ).toBeInTheDocument();
  expect(
    document.querySelector(".continue-watching-list__button-next .bx-chevron-right"),
  ).toBeInTheDocument();
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

test("renders responsive skeleton cards while loading", () => {
  seedHistory([]);

  renderContinueWatchingSkeleton();

  expect(screen.getByRole("heading", { name: "Tiếp tục xem" })).toBeInTheDocument();
  expect(screen.getAllByTestId("continue-watching-skeleton-card")).toHaveLength(6);
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.queryByRole("menuitem", { name: "Xóa khỏi danh sách" })).not.toBeInTheDocument();
});

test("removes a continue watching card from the context menu", () => {
  seedHistory([
    {
      key: "movie-1_0:tap-1",
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

  fireEvent.contextMenu(screen.getByRole("link", { name: /Test Movie/i }), {
    clientX: 30,
    clientY: 60,
  });
  fireEvent.click(screen.getByRole("menuitem", { name: "Xóa khỏi danh sách" }));

  expect(screen.queryByText("Test Movie")).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(WATCH_HISTORY_KEY))).toEqual([]);
});

test("pauses autoplay while the context menu is open", () => {
  seedHistory([
    {
      key: "movie-1_0:tap-1",
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

  fireEvent.contextMenu(screen.getByRole("link", { name: /Test Movie/i }), {
    clientX: 30,
    clientY: 60,
  });
  expect(mockSwiper.autoplay.stop).toHaveBeenCalledTimes(1);

  fireEvent.click(document.body);

  expect(mockSwiper.autoplay.start).toHaveBeenCalledTimes(1);
});

test("keeps the selected card visually active while the menu is open", () => {
  seedHistory([
    {
      key: "movie-1_0:tap-1",
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

  const link = screen.getByRole("link", { name: /Test Movie/i });
  fireEvent.contextMenu(link, { clientX: 30, clientY: 60 });

  expect(link).toHaveClass("continue-watching-list__card--menu-open");
});

test("shows a trash icon in the remove menu action", () => {
  seedHistory([
    {
      key: "movie-1_0:tap-1",
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

  fireEvent.contextMenu(screen.getByRole("link", { name: /Test Movie/i }), {
    clientX: 30,
    clientY: 60,
  });

  expect(
    screen.getByRole("menuitem", { name: "Xóa khỏi danh sách" }).querySelector(".bx-trash"),
  ).toBeInTheDocument();
});

test("opens the remove menu after a touch long press", () => {
  jest.useFakeTimers();

  try {
    seedHistory([
      {
        key: "movie-1_0:tap-1",
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

    fireEvent.touchStart(screen.getByRole("link", { name: /Test Movie/i }), {
      touches: [{ clientX: 30, clientY: 60 }],
    });
    act(() => {
      jest.advanceTimersByTime(500);
    });
    fireEvent.click(screen.getByRole("menuitem", { name: "Xóa khỏi danh sách" }));

    expect(screen.queryByText("Test Movie")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(WATCH_HISTORY_KEY))).toEqual([]);
  } finally {
    jest.useRealTimers();
  }
});

test("does not navigate from the follow-up click after a touch long press", () => {
  jest.useFakeTimers();

  try {
    seedHistory([
      {
        key: "movie-1_0:tap-1",
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

    renderContinueWatchingListWithLocation();

    const link = screen.getByRole("link", { name: /Test Movie/i });
    fireEvent.touchStart(link, {
      touches: [{ clientX: 30, clientY: 60 }],
    });
    act(() => {
      jest.advanceTimersByTime(500);
    });
    fireEvent.click(link);

    expect(screen.getByTestId("location-display")).toHaveTextContent("/");
  } finally {
    jest.useRealTimers();
  }
});

test("keeps the touch long-press menu open after the follow-up click", () => {
  jest.useFakeTimers();

  try {
    seedHistory([
      {
        key: "movie-1_0:tap-1",
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

    const link = screen.getByRole("link", { name: /Test Movie/i });
    fireEvent.touchStart(link, {
      touches: [{ clientX: 30, clientY: 60 }],
    });
    act(() => {
      jest.advanceTimersByTime(500);
    });
    fireEvent.click(link);

    expect(screen.getByRole("menuitem", { name: "Xóa khỏi danh sách" })).toBeInTheDocument();
  } finally {
    jest.useRealTimers();
  }
});

test("allows normal navigation after closing a touch long-press menu with Escape", () => {
  jest.useFakeTimers();

  try {
    seedHistory([
      {
        key: "movie-1_0:tap-1",
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

    renderContinueWatchingListWithLocation();

    const link = screen.getByRole("link", { name: /Test Movie/i });
    fireEvent.touchStart(link, {
      touches: [{ clientX: 30, clientY: 60 }],
    });
    act(() => {
      jest.advanceTimersByTime(500);
    });
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(link);

    expect(screen.getByTestId("location-display")).toHaveTextContent(
      "/movie/test-movie?ep=0%3Atap-1",
    );
  } finally {
    jest.useRealTimers();
  }
});

test("closes the context menu when clicking outside", () => {
  seedHistory([
    {
      key: "movie-1_0:tap-1",
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

  fireEvent.contextMenu(screen.getByRole("link", { name: /Test Movie/i }), {
    clientX: 30,
    clientY: 60,
  });
  fireEvent.click(document.body);

  expect(screen.queryByRole("menuitem", { name: "Xóa khỏi danh sách" })).not.toBeInTheDocument();
});

test("closes the context menu when pressing Escape", () => {
  seedHistory([
    {
      key: "movie-1_0:tap-1",
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

  fireEvent.contextMenu(screen.getByRole("link", { name: /Test Movie/i }), {
    clientX: 30,
    clientY: 60,
  });
  fireEvent.keyDown(document, { key: "Escape" });

  expect(screen.queryByRole("menuitem", { name: "Xóa khỏi danh sách" })).not.toBeInTheDocument();
});

test("keeps keyboard events inside the context menu from bubbling", () => {
  seedHistory([
    {
      key: "movie-1_0:tap-1",
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
  const handleDocumentKeyDown = jest.fn();
  document.addEventListener("keydown", handleDocumentKeyDown);

  try {
    renderContinueWatchingList();

    fireEvent.contextMenu(screen.getByRole("link", { name: /Test Movie/i }), {
      clientX: 30,
      clientY: 60,
    });
    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });

    expect(handleDocumentKeyDown).not.toHaveBeenCalled();
  } finally {
    document.removeEventListener("keydown", handleDocumentKeyDown);
  }
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

test("matches movie card visual style tokens while keeping continue controls", () => {
  expect(styles).toMatch(/\.continue-watching-list\s*\{/);
  expect(styles).toMatch(/&__poster[\s\S]*aspect-ratio:\s*2\s*\/\s*3/);
  expect(styles).toMatch(/&__poster[\s\S]*border-radius:\s*16px/);
  expect(styles).toMatch(/&__poster[\s\S]*margin-bottom:\s*1\.25rem/);
  expect(styles).toMatch(/&__poster[\s\S]*box-shadow:\s*0 8px 24px rgba\(0, 0, 0, 0\.4\)/);
  expect(styles).toMatch(/&__card[\s\S]*transform:\s*translateY\(-12px\) scale\(1\.03\)/);
  expect(styles).toMatch(/&__card--menu-open[\s\S]*transform:\s*translateY\(-12px\) scale\(1\.03\)/);
  expect(styles).toMatch(/&__title[\s\S]*margin:\s*0/);
  expect(styles).toMatch(/&__title[\s\S]*display:\s*-webkit-box/);
  expect(styles).toMatch(/&__title[\s\S]*-webkit-line-clamp:\s*2/);
  expect(styles).toMatch(/&__title[\s\S]*min-height:\s*2\.8em/);
  expect(styles).toMatch(/&__episode-text[\s\S]*white-space:\s*nowrap/);
  expect(styles).toMatch(/&__progress-bar[\s\S]*height:\s*5px/);
  expect(styles).toMatch(/&__card[\s\S]*-webkit-touch-callout:\s*none/);
  expect(styles).toMatch(/&__context-menu[\s\S]*position:\s*fixed/);
  expect(styles).toMatch(/&__context-menu[\s\S]*z-index:\s*1000/);
  expect(styles).toMatch(/&__context-menu[\s\S]*\.bx-trash[\s\S]*color:\s*#ff6b8a/);
  expect(styles).toMatch(/&__skeleton-track[\s\S]*display:\s*flex/);
  expect(styles).toMatch(/&__skeleton-track[\s\S]*@media\s*\(min-width:\s*640px\)\s*\{[\s\S]*?gap:\s*15px/);
  expect(styles).toMatch(/&__skeleton-track[\s\S]*@media\s*\(min-width:\s*768px\)\s*\{[\s\S]*?gap:\s*20px/);
  expect(styles).toMatch(/&__skeleton-card\s*\{[\s\S]*?width:\s*100%/);
  expect(styles).toMatch(/&__skeleton-card\s*\{[\s\S]*?@media\s*\(min-width:\s*640px\)\s*\{[\s\S]*?width:\s*calc\(50% - 7\.5px\)/);
  expect(styles).toMatch(/&__skeleton-card\s*\{[\s\S]*?@media\s*\(min-width:\s*768px\)\s*\{[\s\S]*?width:\s*calc\(33\.333333% - 13\.333333px\)/);
  expect(styles).toMatch(/&__skeleton-card\s*\{[\s\S]*?@media\s*\(min-width:\s*1024px\)\s*\{[\s\S]*?width:\s*calc\(25% - 15px\)/);
  expect(styles).toMatch(/&__skeleton-card\s*\{[\s\S]*?@media\s*\(min-width:\s*1280px\)\s*\{[\s\S]*?width:\s*calc\(20% - 16px\)/);
  expect(styles).not.toMatch(/continue-watching-list__skeleton-card:nth-child/);
});

test("continue watching carousel reserves top clearance for hover lift", () => {
  expect(styles).toMatch(/&__carousel\s*\{[\s\S]*?padding:\s*1\.5rem\s+0/);
});

test("continue watching carousel reserves horizontal lanes for navigation buttons", () => {
  expect(styles).toMatch(/&__carousel-wrapper\s*\{[\s\S]*?padding:\s*0\s+60px/);
  expect(styles).toMatch(/@include tablet\s*\{[\s\S]*?padding:\s*0\s+50px/);
  expect(styles).toMatch(/@include mobile\s*\{[\s\S]*?padding:\s*0\s+15px/);
});

test("hides carousel navigation buttons on mobile while keeping carousel breathing room", () => {
  const mobileWrapperStyles = styles.match(/&__carousel-wrapper\s*\{[\s\S]*?@include mobile\s*\{([\s\S]*?)\n\s*\}/)?.[1];
  const buttonStyles = styles.match(
    /\.swiper-button-prev,\s*\.swiper-button-next\s*\{([\s\S]*?)\n  \}/,
  )?.[1];

  expect(mobileWrapperStyles).toMatch(/padding:\s*0\s+15px/);
  expect(buttonStyles).toMatch(/@include mobile\s*\{[\s\S]*?display:\s*none/);
});
