import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockGetMoviesList = jest.fn();
const mockGetListByCountry = jest.fn();
const mockGetListByType = jest.fn();
const mockIsTauri = jest.fn(() => false);
const mockWatchHistoryKey = "ophim_watch_history:v1";

jest.mock("react-helmet", () => ({
  Helmet: ({ children }) => <>{children}</>,
}));

jest.mock("../components/hero-slide/HeroSlide", () => () => <div>HeroSlide</div>);

jest.mock("../components/movie-list/MovieList", () => () => <div>MovieList</div>);

jest.mock("../components/ranking-section/RankingSection", () => ({ title }) => (
  <section>
    <h2>{title}</h2>
  </section>
));

jest.mock("../tauri-bridge", () => ({
  isTauri: () => mockIsTauri(),
}));

jest.mock("../components/tv-hero/TvHero", () => ({ items }) => (
  <section data-testid="tv-hero">{items.length}</section>
));

jest.mock("../components/content-row/ContentRow", () => ({ title, row, rowId, items }) => (
  <section data-testid="content-row" data-row={row} data-row-id={rowId}>
    <h2>{title}</h2>
    <span data-testid={`content-row-count-${rowId}`}>{items.length}</span>
  </section>
));

jest.mock("../components/continue-watching-list/ContinueWatchingList", () => (props) => {
  const history = JSON.parse(global.localStorage.getItem(mockWatchHistoryKey) || "[]");

  if (!mockIsTauri() && history.length === 0) {
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

jest.mock(
  "swiper/react",
  () => ({
    Swiper: ({
      autoplay,
      children,
      className,
      grabCursor,
      modules,
      navigation,
      onSwiper,
      slidesPerView,
      spaceBetween,
      ...props
    }) => (
      <div {...props} className={className ? `swiper ${className}` : "swiper"}>
        {children}
      </div>
    ),
    SwiperSlide: ({ children }) => <div className="swiper-slide">{children}</div>,
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

jest.mock("../api/tmdbApi", () => ({
  __esModule: true,
  default: {
    getMoviesList: mockGetMoviesList,
    getListByCountry: mockGetListByCountry,
    getListByType: mockGetListByType,
  },
  category: {
    movie: "movie",
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
      <Home />
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  mockGetMoviesList.mockClear();
  mockGetListByCountry.mockClear();
  mockGetListByType.mockClear();
  mockIsTauri.mockClear();
  mockGetMoviesList.mockReturnValue(new Promise(() => {}));
  mockGetListByCountry.mockResolvedValue({ data: { items: [] } });
  mockGetListByType.mockResolvedValue({ data: { items: [] } });
  mockIsTauri.mockReturnValue(false);
});

test("renders continue watching before theatrical movies when watch history exists", async () => {
  seedHistory();

  renderHome();

  const continueWatchingHeading = await screen.findByRole("heading", {
    name: "Tiếp tục xem",
  });
  const theatricalHeading = screen.getByRole("heading", { name: "Phim chiếu rạp" });

  await waitFor(() => {
    expect(
      continueWatchingHeading.compareDocumentPosition(theatricalHeading)
        & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

test("renders TV continue watching as the first focus row and offsets content rows", async () => {
  mockIsTauri.mockReturnValue(true);
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

  await waitFor(() => {
    expect(screen.getByTestId("content-row-count-phim-moi")).toHaveTextContent("1");
  });

  const continueWatching = screen.getByTestId("continue-watching-list");
  expect(continueWatching).toHaveAttribute("data-tv-focusable", "true");
  expect(continueWatching).toHaveAttribute("data-row", "0");

  const rows = await screen.findAllByTestId("content-row");
  expect(rows[0]).toHaveAttribute("data-row", "1");
  expect(rows[0]).toHaveAttribute("data-row-id", "phim-moi");
});
