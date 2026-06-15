import React from "react";
import "@testing-library/jest-dom";
import fs from "fs";
import path from "path";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RankingSection from "./RankingSection";
import { fetchTMDBImages } from "../../utils/tmdbImageFetcher";

jest.mock(
  "swiper/react",
  () => ({
    Swiper: ({ children, className, breakpoints, slidesPerView }) => (
      <div
        className={className ? `swiper ${className}` : "swiper"}
        data-breakpoints={JSON.stringify(breakpoints)}
        data-slides-per-view={slidesPerView}
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
    Navigation: {},
    Pagination: {},
    Autoplay: {},
  }),
  { virtual: true },
);

jest.mock("swiper/css", () => ({}), { virtual: true });
jest.mock("swiper/css/bundle", () => ({}), { virtual: true });

jest.mock("../../utils/tmdbImageFetcher", () => ({
  fetchTMDBImages: jest.fn(),
}));

const movies = [
  { slug: "first", name: "First", tmdb: { id: 1 } },
  { slug: "second", name: "Second", tmdb: { id: 2 } },
];

const renderRankingSection = (props) =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RankingSection
        title="Top phim"
        icon="bx bx-trending-up"
        type="weekly"
        {...props}
      />
    </MemoryRouter>,
  );

const rankingSectionStyles = fs.readFileSync(
  path.join(__dirname, "ranking-section.scss"),
  "utf8",
);

const expectSkeletonBreakpoint = (styles, minWidth, width) => {
  const blockPattern = new RegExp(
    `&__skeleton-card\\s*\\{[\\s\\S]*?@media\\s*\\(min-width:\\s*${minWidth}px\\)\\s*\\{[\\s\\S]*?width:\\s*${width}`,
  );

  expect(styles).toMatch(blockPattern);
};

test("ranking skeleton widths mirror Swiper slidesPerView without hiding cards", () => {
  expect(rankingSectionStyles).toMatch(
    /&__loading-slider\s*\{[\s\S]*?display:\s*flex[\s\S]*?overflow:\s*hidden/,
  );
  expect(rankingSectionStyles).not.toMatch(/ranking-section__skeleton-card:nth-child/);

  expectSkeletonBreakpoint(rankingSectionStyles, 640, "calc\\(50% - 7\\.5px\\)");
  expectSkeletonBreakpoint(rankingSectionStyles, 768, "calc\\(33\\.333333% - 13\\.333333px\\)");
  expectSkeletonBreakpoint(rankingSectionStyles, 1024, "calc\\(25% - 15px\\)");
  expectSkeletonBreakpoint(rankingSectionStyles, 1280, "calc\\(20% - 16px\\)");
});

test("ranking carousel uses auto poster widths to fill the viewport", async () => {
  fetchTMDBImages.mockResolvedValue({ posterUrl: "/poster.jpg" });

  renderRankingSection({ movies });

  expect(await screen.findByText("First")).toBeInTheDocument();
  expect(document.querySelector(".ranking-slider")).toHaveAttribute(
    "data-slides-per-view",
    "auto",
  );
  expect(rankingSectionStyles).toMatch(
    /\.ranking-slider\s*\{[\s\S]*?\.swiper-slide\s*\{[\s\S]*?width:\s*calc\(20% - 16px\)/,
  );
});

test("ranking slide width CSS avoids unsupported calc multiplication and division", () => {
  expect(rankingSectionStyles).not.toMatch(
    /\.ranking-slider[\s\S]*?width:\s*calc\([^;]*[*/][^;]*\)/,
  );
});

test("ranking card visual tokens align with movie card posters", () => {
  const rankingCardBlock = rankingSectionStyles.match(
    /\.ranking-card\s*\{[\s\S]*?&__rank\s*\{/,
  )?.[0];
  const posterBlock = rankingSectionStyles.match(
    /&__poster\s*\{[\s\S]*?img\s*\{/,
  )?.[0];
  const infoBlock = rankingSectionStyles.match(
    /&__info\s*\{[\s\S]*?\}/,
  )?.[0];
  const titleBlock = rankingSectionStyles.match(
    /&__title\s*\{[\s\S]*?\}/,
  )?.[0];

  expect(rankingCardBlock).toMatch(/border-radius:\s*16px/);
  expect(rankingCardBlock).toMatch(/overflow:\s*visible/);
  expect(rankingCardBlock).toMatch(/background:\s*transparent/);
  expect(rankingCardBlock).toMatch(/box-shadow:\s*0 8px 24px rgba\(0, 0, 0, 0\.4\)/);
  expect(rankingCardBlock).not.toMatch(/border:\s*1px solid/);

  expect(posterBlock).toMatch(/aspect-ratio:\s*2\s*\/\s*3/);
  expect(posterBlock).toMatch(/border-radius:\s*16px/);
  expect(posterBlock).toMatch(/box-shadow:\s*0 8px 24px rgba\(0, 0, 0, 0\.4\)/);

  expect(infoBlock).not.toMatch(/background:\s*linear-gradient/);
  expect(titleBlock).toMatch(/margin:\s*0 0 0\.5rem 0/);
  expect(titleBlock).toMatch(/-webkit-line-clamp:\s*2/);
});

test("ranking carousel keeps auto slide sizing at every breakpoint", async () => {
  fetchTMDBImages.mockResolvedValue({ posterUrl: "/poster.jpg" });

  renderRankingSection({ movies });

  expect(await screen.findByText("First")).toBeInTheDocument();

  const breakpoints = JSON.parse(
    document.querySelector(".ranking-slider").dataset.breakpoints,
  );
  expect(breakpoints).toMatchObject({
    640: { slidesPerView: "auto" },
    768: { slidesPerView: "auto" },
    1024: { slidesPerView: "auto" },
    1280: { slidesPerView: "auto" },
  });
});

test("ranking carousel reserves top clearance for hover lift", () => {
  expect(rankingSectionStyles).toMatch(/\.ranking-slider\s*\{[\s\S]*?padding:\s*1\.5rem\s+0\s+3rem/);
});

test("reserves ranking card space while movie images are loading", () => {
  fetchTMDBImages.mockReturnValue(new Promise(() => {}));

  renderRankingSection({ movies });

  const placeholders = screen.getAllByTestId("ranking-skeleton-card");
  expect(placeholders).toHaveLength(5);
  expect(screen.getByTestId("ranking-slider-placeholder")).toHaveClass(
    "ranking-section__loading-slider",
  );
});

test.each([undefined, []])(
  "reserves ranking card space when movies is %s",
  (emptyMovies) => {
    renderRankingSection({ movies: emptyMovies });

    expect(screen.getAllByTestId("ranking-skeleton-card")).toHaveLength(5);
    expect(screen.getByTestId("ranking-slider-placeholder")).toHaveClass(
      "ranking-section__loading-slider",
    );
  },
);

test("shows ranking placeholders again while changed movies load", async () => {
  fetchTMDBImages.mockResolvedValueOnce({ posterUrl: "/first.jpg" });

  const { rerender } = renderRankingSection({ movies: [movies[0]] });

  await screen.findByText("First");

  fetchTMDBImages.mockReturnValue(new Promise(() => {}));

  rerender(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RankingSection
        title="Top phim"
        icon="bx bx-trending-up"
        type="weekly"
        movies={[movies[1]]}
      />
    </MemoryRouter>,
  );

  await waitFor(() =>
    expect(screen.getAllByTestId("ranking-skeleton-card")).toHaveLength(5),
  );
});
