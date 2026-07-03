import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockGetMoviesList = jest.fn();
const mockGetListByCountry = jest.fn();
const mockGetListByType = jest.fn();
const mockWatchHistoryKey = "ophim_watch_history:v1";

jest.mock("react-helmet", () => ({
  Helmet: ({ children }) => <>{children}</>,
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
      <Home />
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
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

  await waitFor(() => {
    expect(screen.getByTestId("content-row-count-phim-moi")).toHaveTextContent("1");
  });

  expect(screen.getByTestId("tv-hero")).toHaveTextContent("1");

  const rows = await screen.findAllByTestId("content-row");
  expect(rows[0]).toHaveAttribute("data-row", "2");
  expect(rows[0]).toHaveAttribute("data-row-id", "phim-moi");
});

test("renders continue watching row before theatrical heading", async () => {
  seedHistory();

  renderHome();

  const continueWatchingHeading = await screen.findByRole("heading", {
    name: "Tiếp tục xem",
  });
  const theatricalHeading = screen.getByRole("heading", { name: "Phim chiếu rạp" });

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
