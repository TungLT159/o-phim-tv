import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockGetMoviesList = jest.fn();

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
  },
  category: {
    movie: "movie",
  },
  movieType: {
    phimMoi: "phim-moi",
    phimChieuRap: "phim-chieu-rap",
    phimHoatHinh: "hoat-hinh",
    phimLe: "phim-le",
  },
}));

const Home = require("./Home").default;

const WATCH_HISTORY_KEY = "ophim_watch_history:v1";

const seedHistory = () => {
  localStorage.setItem(
    WATCH_HISTORY_KEY,
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
  mockGetMoviesList.mockReturnValue(new Promise(() => {}));
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
