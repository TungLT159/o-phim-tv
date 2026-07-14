import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FocusProvider } from "../context/FocusContext";

const mockGetMoviesList = jest.fn();
const mockGetListByCountry = jest.fn();
const mockGetListByType = jest.fn();
const mockWatchHistoryKey = "ophim_watch_history:v1";

jest.mock("react-helmet", () => ({
  Helmet: ({ children }) => <>{children}</>,
}));

jest.mock(
  "swiper/react",
  () => ({
    Swiper: ({ children }) => <div>{children}</div>,
    SwiperSlide: ({ children }) => <div>{children({ isActive: true })}</div>,
  }),
  { virtual: true },
);

jest.mock(
  "swiper/modules",
  () => ({
    Autoplay: {},
  }),
  { virtual: true },
);

jest.mock("../api/axiosClient", () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: { item: { name: "Hero Detail" } } })),
  },
}));

jest.mock("../utils/tmdbImageFetcher", () => ({
  fetchTMDBImages: jest.fn(() => Promise.resolve({ backdropUrl: "", posterUrl: "", overview: "" })),
}));

jest.mock("@noriginmedia/norigin-spatial-navigation", () => {
  const React = require("react");
  const registry = new Map();
  const configs = new Map();
  let currentFocusKey = null;

  const handleKeyDown = (event) => {
    const directions = {
      ArrowDown: "down",
      ArrowUp: "up",
      ArrowLeft: "left",
      ArrowRight: "right",
    };
    const direction = directions[event.key];
    if (!direction || !currentFocusKey) return;
    configs.get(currentFocusKey)?.onArrowPress?.(direction);
  };

  const setFocus = (focusKey) => {
    currentFocusKey = focusKey;
    const target = registry.get(focusKey) || globalThis.document?.querySelector?.(
      `[data-home-content-card-focus-key="${focusKey}"]`,
    );
    target?.focus?.();
    return Promise.resolve();
  };

  return {
    __esModule: true,
    destroy: () => {
      registry.clear();
      configs.clear();
      currentFocusKey = null;
      globalThis.window?.removeEventListener("keydown", handleKeyDown);
    },
    doesFocusableExist: (focusKey) => (
      registry.has(focusKey) ||
      Boolean(globalThis.document?.querySelector?.(`[data-home-content-card-focus-key="${focusKey}"]`))
    ),
    getCurrentFocusKey: jest.fn(() => currentFocusKey),
    init: () => globalThis.window?.addEventListener("keydown", handleKeyDown),
    setFocus,
    useFocusable: useFocusableMock,
  };

  function useFocusableMock({ focusKey, onArrowPress, onEnterPress } = {}) {
      const focusHandlers = React.useRef(new Map());
      const ref = React.useMemo(() => {
        const callbackRef = (node) => {
          const previous = callbackRef.current;
          if (previous && focusHandlers.current.has(previous)) {
            previous.removeEventListener("focus", focusHandlers.current.get(previous));
            focusHandlers.current.delete(previous);
          }
          callbackRef.current = node;
          if (!focusKey || !node) return;
          const handleFocus = () => {
            currentFocusKey = focusKey;
          };
          registry.set(focusKey, node);
          configs.set(focusKey, { onArrowPress, onEnterPress });
          node.addEventListener("focus", handleFocus);
          focusHandlers.current.set(node, handleFocus);
        };
        callbackRef.current = null;
        return callbackRef;
      }, [focusKey, onArrowPress, onEnterPress]);

      React.useEffect(() => {
        return () => {
          registry.delete(focusKey);
          configs.delete(focusKey);
          focusHandlers.current.forEach((handler, element) => {
            element.removeEventListener("focus", handler);
          });
          focusHandlers.current.clear();
        };
      }, [focusKey]);

      return {
        ref,
        focused: currentFocusKey === focusKey,
        hasFocusedChild: false,
        focusKey,
        focusSelf: () => setFocus(focusKey),
        onArrowPress,
        onEnterPress,
      };
  }
});

jest.mock("../components/continue-watching-list/ContinueWatchingList", () => (props) => {
  const history = JSON.parse(global.localStorage.getItem(mockWatchHistoryKey) || "[]");

  if (history.length === 0) {
    return null;
  }

  return (
    <section
      data-testid="continue-watching-list"
      data-tv-focusable={props.tvFocusable ? "true" : "false"}
      data-row={props.row ?? ""}
    >
      <h2>Tiếp tục xem</h2>
    </section>
  );
});

jest.mock("../api/tmdbApi", () => ({
  __esModule: true,
  default: {
    getMoviesList: mockGetMoviesList,
    getListByCountry: mockGetListByCountry,
    getListByType: mockGetListByType,
  },
  movieType: {
    phimMoi: "phim-moi",
    phimChieuRap: "phim-chieu-rap",
    phimHoatHinh: "hoat-hinh",
    phimLe: "phim-le",
    phimBo: "phim-bo",
  },
}));

const Home = require("./Home").default;

const seedHistory = () => {
  localStorage.setItem(
    mockWatchHistoryKey,
    JSON.stringify([
      {
        movieId: "movie-1",
        episodeName: "tap-1",
        currentTime: 120,
        duration: 600,
        percentage: 20,
        timestamp: "2026-05-18T00:00:00.000Z",
        movieInfo: {
          slug: "test-movie",
          title: "Test Movie",
          poster: "/test-poster.jpg",
        },
      },
    ]),
  );
};

const renderHome = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <FocusProvider>
        <Home />
      </FocusProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  window.scrollTo = jest.fn();
  window.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };
  mockGetMoviesList.mockClear();
  mockGetListByCountry.mockClear();
  mockGetListByType.mockClear();
  mockGetMoviesList.mockReturnValue(new Promise(() => {}));
  mockGetListByCountry.mockResolvedValue({ data: { items: [] } });
  mockGetListByType.mockResolvedValue({ data: { items: [] } });
});

test("renders TV home rows without requiring Tauri detection", async () => {
  mockGetMoviesList.mockResolvedValue({
    data: {
      items: [
        {
          slug: "tv-movie-1",
          name: "TV Movie 1",
        },
      ],
    },
  });

  renderHome();

  expect(await screen.findByRole("heading", { name: "Phim mới cập nhật" })).toBeInTheDocument();
  expect(await screen.findByRole("heading", { name: "TV Movie 1" })).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: /TV Movie 1/i })[0]).toHaveClass("content-row__card");
});

test("moves focus from the hero play button to the first content card on ArrowDown", async () => {
  mockGetMoviesList.mockResolvedValue({
    data: {
      items: [
        {
          _id: "tv-movie-1",
          slug: "tv-movie-1",
          name: "TV Movie 1",
        },
      ],
    },
  });

  renderHome();

  const heroButton = await screen.findByRole("button", { name: "Xem ngay" });
  await waitFor(() => expect(heroButton).toHaveFocus());
  const spatialNavigation = require("@noriginmedia/norigin-spatial-navigation");
  await waitFor(() => expect(spatialNavigation.doesFocusableExist("HOME_CARD_phim-moi_0")).toBe(true));

  fireEvent.keyDown(window, { key: "ArrowDown" });

  const firstContentCard = screen.getAllByRole("link", { name: /TV Movie 1/i })[0];
  await waitFor(() => expect(firstContentCard).toHaveFocus());
  const sidebarHome = screen.queryByRole("link", { name: "Trang chủ" });
  if (sidebarHome) {
    expect(sidebarHome).not.toHaveFocus();
  }
});

test("moves ArrowDown from hero to the first mounted content row with real items", async () => {
  mockGetMoviesList.mockImplementation((type) => {
    if (type === "phim-moi") {
      return Promise.resolve({ data: { items: [] } });
    }

    return Promise.resolve({
      data: {
        items: [
          {
            _id: `tv-movie-${type}`,
            slug: `tv-movie-${type}`,
            name: `TV Movie ${type}`,
          },
        ],
      },
    });
  });

  renderHome();

  const heroButton = await screen.findByRole("button", { name: "Xem ngay" });
  await waitFor(() => expect(heroButton).toHaveFocus());

  await screen.findByRole("heading", { name: "Phim bộ" });
  const firstMountedCard = document.querySelector('[data-home-content-card-focus-key="HOME_CARD_phim-bo_0"]');
  expect(firstMountedCard).toBeInTheDocument();
  expect(firstMountedCard).toHaveAttribute("data-home-content-card-focus-key", "HOME_CARD_phim-bo_0");

  fireEvent.keyDown(window, { key: "ArrowDown" });

  await waitFor(() => expect(firstMountedCard).toHaveFocus());
});

test("renders continue watching row before theatrical heading", async () => {
  seedHistory();
  mockGetMoviesList.mockResolvedValue({
    data: {
      items: [
        {
          _id: "tv-movie-1",
          slug: "tv-movie-1",
          name: "TV Movie 1",
        },
      ],
    },
  });

  renderHome();

  const continueWatchingHeading = await screen.findByRole("heading", {
    name: "Tiếp tục xem",
  });
  const theatricalHeading = await screen.findByRole("heading", { name: "Phim chiếu rạp" });

  const continueWatching = screen.getByTestId("continue-watching-list");
  expect(continueWatching).toHaveAttribute("data-tv-focusable", "true");
  expect(continueWatching).toHaveAttribute("data-row", "1");

  await waitFor(() => {
    expect(
      continueWatchingHeading.compareDocumentPosition(theatricalHeading)
        & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
