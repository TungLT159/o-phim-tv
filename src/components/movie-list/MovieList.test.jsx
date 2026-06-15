import React from "react";
import fs from "fs";
import path from "path";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MovieList from "./MovieList";
import tmdbApi from "../../api/tmdbApi";

const styles = fs.readFileSync(path.join(__dirname, "movie-list.scss"), "utf8");
const AUTOPLAY_MODULE_MARKER = "autoplay-module";
const NAVIGATION_MODULE_MARKER = "navigation-module";

jest.mock(
  "swiper/react",
  () => ({
    Swiper: ({ children, className, modules, navigation }) => (
      <div
        className={className ? `swiper ${className}` : "swiper"}
        data-has-navigation-module={
          modules?.includes(NAVIGATION_MODULE_MARKER) ? "true" : "false"
        }
        data-navigation-next={navigation?.nextEl || ""}
        data-navigation-prev={navigation?.prevEl || ""}
      >
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
    Autoplay: AUTOPLAY_MODULE_MARKER,
    Navigation: NAVIGATION_MODULE_MARKER,
  }),
  { virtual: true },
);

jest.mock("../../api/tmdbApi", () => ({
  getMoviesList: jest.fn(),
  getListByType: jest.fn(),
}));

jest.mock("../../utils/tmdbImageFetcher", () => ({
  fetchTMDBImages: jest.fn().mockResolvedValue({ posterUrl: "/poster-mau.png" }),
}));

const renderMovieList = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <MovieList category="movie" type="popular" />
    </MemoryRouter>,
  );

const renderTwoMovieLists = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <MovieList category="movie" type="phim-moi" />
      <MovieList category="movie" type="phim-le" />
    </MemoryRouter>,
  );

test("reserves carousel card space while movies are loading", () => {
  tmdbApi.getMoviesList.mockReturnValue(new Promise(() => {}));

  renderMovieList();

  const placeholders = screen.getAllByTestId("movie-list-skeleton-card");
  expect(placeholders).toHaveLength(6);
  expect(screen.getByTestId("movie-list-carousel")).toHaveClass("movie-list--loading");
});

test("keeps placeholder card space when the movie response is empty", async () => {
  tmdbApi.getMoviesList.mockResolvedValue({ data: { items: [] } });

  renderMovieList();

  await waitFor(() =>
    expect(screen.getByTestId("movie-list-carousel")).toHaveClass(
      "movie-list--empty",
    ),
  );

  const placeholders = screen.getAllByTestId("movie-list-skeleton-card");
  expect(placeholders).toHaveLength(6);
  expect(screen.getByTestId("movie-list-carousel")).toHaveClass("movie-list--empty");
});

test("movie carousel reserves top clearance for hover lift", () => {
  expect(styles).toMatch(/\.movie-list\s*\{[\s\S]*?\.swiper\s*\{[\s\S]*?padding:\s*1\.5rem\s+0/);
  expect(styles).not.toMatch(/\.swiper-container\s*\{[\s\S]*?padding:\s*1rem\s+0/);
});

test("movie carousel renders RankingSection-style navigation buttons", async () => {
  tmdbApi.getMoviesList.mockResolvedValue({ data: { items: [] } });

  renderMovieList();

  await waitFor(() =>
    expect(screen.getByTestId("movie-list-carousel")).toHaveClass(
      "movie-list--empty",
    ),
  );

  const carousel = document.querySelector(".movie-list .swiper");
  expect(carousel).toHaveAttribute("data-has-navigation-module", "true");
  expect(carousel).toHaveAttribute("data-navigation-prev", ".movie-list__button-prev-popular");
  expect(carousel).toHaveAttribute("data-navigation-next", ".movie-list__button-next-popular");
  expect(document.querySelector(".movie-list__button-prev .bx-chevron-left")).toBeInTheDocument();
  expect(document.querySelector(".movie-list__button-next .bx-chevron-right")).toBeInTheDocument();
});

test("movie carousel reserves horizontal lanes for navigation buttons", () => {
  expect(styles).toMatch(/\.movie-list\s*\{[\s\S]*?padding:\s*0\.5rem\s+60px/);
  expect(styles).toMatch(/@include tablet\s*\{[\s\S]*?padding:\s*0\.5rem\s+50px/);
  expect(styles).toMatch(/@include mobile\s*\{[\s\S]*?padding:\s*0\.5rem\s+15px/);
});

test("movie carousel hides navigation buttons on mobile while keeping padding", () => {
  const buttonStyles = styles.match(
    /\.swiper-button-prev,\s*\.swiper-button-next\s*\{([\s\S]*?)\n    \}/,
  )?.[1];

  expect(styles).toMatch(/@include mobile\s*\{\s*padding:\s*0\.5rem\s+15px/);
  expect(buttonStyles).toMatch(/@include mobile\s*\{[\s\S]*?display:\s*none/);
});

test("movie carousel keeps Swiper content inside the navigation lanes", () => {
  const swiperBlock = styles.match(/\.swiper\s*\{[\s\S]*?\n    \}/)?.[0];

  expect(swiperBlock).not.toMatch(/margin:\s*0\s+-/);
});

test("each movie carousel instance uses unique navigation selectors", async () => {
  tmdbApi.getMoviesList.mockResolvedValue({ data: { items: [] } });

  renderTwoMovieLists();

  await waitFor(() =>
    expect(screen.getAllByTestId("movie-list-carousel")[0]).toHaveClass(
      "movie-list--empty",
    ),
  );

  const carousels = document.querySelectorAll(".movie-list .swiper");
  expect(carousels).toHaveLength(2);
  expect(carousels[0]).toHaveAttribute(
    "data-navigation-prev",
    ".movie-list__button-prev-phim-moi",
  );
  expect(carousels[0]).toHaveAttribute(
    "data-navigation-next",
    ".movie-list__button-next-phim-moi",
  );
  expect(carousels[1]).toHaveAttribute(
    "data-navigation-prev",
    ".movie-list__button-prev-phim-le",
  );
  expect(carousels[1]).toHaveAttribute(
    "data-navigation-next",
    ".movie-list__button-next-phim-le",
  );
  expect(document.querySelectorAll(".movie-list__button-prev")).toHaveLength(2);
  expect(document.querySelectorAll(".movie-list__button-next")).toHaveLength(2);
});
