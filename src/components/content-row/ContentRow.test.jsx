import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ContentRow from "./ContentRow";
import { useFocus, useFocusable } from "../../context/FocusContext";
import { fetchTMDBImages } from "../../utils/tmdbImageFetcher";

jest.mock("../../context/FocusContext", () => ({
  FOCUS_KEYS: {
    HOME_HERO_PLAY: "HOME_HERO_PLAY",
  },
  focusKeyForHomeCard: (rowId, index) => `HOME_CARD_${rowId}_${index}`,
  useFocusable: jest.fn(),
  useFocus: jest.fn(() => ({
    focusByKey: jest.fn(),
    rememberContentFocus: jest.fn(),
  })),
}));

jest.mock("../../utils/tmdbImageFetcher", () => ({
  fetchTMDBImages: jest.fn(),
}));

const renderContentRow = (props) =>
  render(
    <MemoryRouter>
      <ContentRow {...props} />
    </MemoryRouter>,
  );

const createDeferred = () => {
  let resolve;
  const promise = new Promise((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
};

beforeEach(() => {
  useFocusable.mockClear();
  useFocus.mockClear();
  fetchTMDBImages.mockClear();
  useFocusable.mockReturnValue({ ref: { current: null }, focused: false });
  useFocus.mockReturnValue({
    focusByKey: jest.fn(),
    rememberContentFocus: jest.fn(),
  });
  fetchTMDBImages.mockResolvedValue({ posterUrl: "/tmdb-poster.jpg" });
});

test("renders existing content row defaults", async () => {
  renderContentRow({
    title: "Phim mới cập nhật",
    row: 3,
    items: [
      {
        slug: "default-movie",
        name: "Default Movie",
        episode_current: "Tập 4",
        year: 2026,
        tmdb: { id: 123, type: "movie" },
      },
    ],
  });

  expect(screen.getByLabelText("Phim mới cập nhật")).toHaveClass("content-row");
  expect(screen.getByRole("link", { name: /Default Movie/i })).toHaveAttribute(
    "href",
    "/movie/default-movie",
  );
  expect(screen.getByText("Tập 4")).toHaveClass("content-row__badge");
  expect(screen.getByText("2026")).toHaveClass("content-row__year");
  expect(useFocusable).toHaveBeenCalledWith(expect.objectContaining({
    focusKey: "HOME_CARD_3_0",
  }));

  await waitFor(() => {
    expect(screen.getByRole("img", { name: "Default Movie" })).toHaveAttribute(
      "src",
      "/tmdb-poster.jpg",
    );
  });
});

test("uses a custom TV focus zone when provided", () => {
  renderContentRow({
    title: "Custom Zone",
    row: 4,
    zone: 5,
    items: [
      {
        slug: "zone-movie",
        name: "Zone Movie",
      },
    ],
  });

  expect(useFocusable).toHaveBeenCalledWith(expect.objectContaining({
    focusKey: "HOME_CARD_4_0",
  }));
});

test("routes ArrowUp from the first home row back to the hero play button", () => {
  const focusByKey = jest.fn(() => true);
  useFocus.mockReturnValue({
    focusByKey,
    rememberContentFocus: jest.fn(),
  });

  renderContentRow({
    title: "Tiếp tục xem",
    row: 1,
    rowId: "continue-watching",
    items: [
      {
        slug: "resume-movie",
        name: "Resume Movie",
      },
    ],
  });

  const focusConfig = useFocusable.mock.calls.find(([config]) => (
    config?.focusKey === "HOME_CARD_continue-watching_0"
  ))?.[0];

  expect(focusConfig).toBeDefined();
  expect(focusConfig.onArrowPress("up")).toBe(false);
  expect(focusByKey).toHaveBeenCalledWith("HOME_HERO_PLAY", { direction: "up" });
});

test("routes DOM ArrowUp from continue watching cards back to the hero play button", () => {
  const focusByKey = jest.fn(() => true);
  useFocus.mockReturnValue({
    focusByKey,
    rememberContentFocus: jest.fn(),
  });

  renderContentRow({
    title: "Tiếp tục xem",
    row: 1,
    rowId: "continue-watching",
    items: [
      {
        slug: "resume-movie",
        name: "Resume Movie",
      },
    ],
  });

  const card = screen.getByRole("link", { name: /Resume Movie/i });

  expect(fireEvent.keyDown(card, { key: "ArrowUp" })).toBe(false);
  expect(focusByKey).toHaveBeenCalledWith("HOME_HERO_PLAY", { direction: "up" });
});

test("routes ArrowUp from the first mounted home row back to the hero play button", () => {
  const focusByKey = jest.fn(() => true);
  useFocus.mockReturnValue({
    focusByKey,
    rememberContentFocus: jest.fn(),
  });

  renderContentRow({
    title: "Phim mới cập nhật",
    row: 2,
    rowId: "phim-moi",
    items: [
      {
        slug: "first-mounted-movie",
        name: "First Mounted Movie",
      },
    ],
  });

  const focusConfig = useFocusable.mock.calls.find(([config]) => (
    config?.focusKey === "HOME_CARD_phim-moi_0"
  ))?.[0];

  expect(focusConfig).toBeDefined();
  expect(focusConfig.onArrowPress("up")).toBe(false);
  expect(focusByKey).toHaveBeenCalledWith("HOME_HERO_PLAY", { direction: "up" });
});

test("handles ArrowUp from the first mounted home row when hero focus is unavailable", () => {
  const focusByKey = jest.fn(() => false);
  useFocus.mockReturnValue({
    focusByKey,
    rememberContentFocus: jest.fn(),
  });

  renderContentRow({
    title: "Tiếp tục xem",
    row: 1,
    rowId: "continue-watching",
    items: [
      {
        slug: "resume-movie",
        name: "Resume Movie",
      },
    ],
  });

  const focusConfig = useFocusable.mock.calls.find(([config]) => (
    config?.focusKey === "HOME_CARD_continue-watching_0"
  ))?.[0];

  expect(focusConfig).toBeDefined();
  expect(focusConfig.onArrowPress("up")).toBe(false);
  expect(focusByKey).toHaveBeenCalledWith("HOME_HERO_PLAY", { direction: "up" });
});

test("uses the default poster for normal rows without stored poster or TMDB", () => {
  renderContentRow({
    title: "No Poster Row",
    row: 1,
    items: [
      {
        slug: "no-poster",
        name: "No Poster",
      },
    ],
  });

  expect(screen.getByRole("img", { name: "No Poster" })).toHaveAttribute(
    "src",
    "/poster-mau.png",
  );
  expect(fetchTMDBImages).not.toHaveBeenCalled();
});

test("does not register focus targets when TV focus is disabled", () => {
  renderContentRow({
    title: "Pointer Only",
    row: 4,
    tvFocusable: false,
    items: [
      {
        slug: "pointer-movie",
        name: "Pointer Movie",
      },
    ],
  });

  expect(screen.getByRole("link", { name: /Pointer Movie/i })).toHaveClass("content-row__card");
  expect(useFocusable).not.toHaveBeenCalled();
});

test("uses item keys so same-slug cards can render without duplicate key warnings", () => {
  const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  try {
    renderContentRow({
      title: "Continue Episodes",
      row: 2,
      items: [
        {
          key: "shared-slug_0:tap-1",
          slug: "shared-slug",
          name: "Shared Movie Episode 1",
        },
        {
          key: "shared-slug_0:tap-2",
          slug: "shared-slug",
          name: "Shared Movie Episode 2",
        },
      ],
    });

    expect(screen.getByText("Shared Movie Episode 1")).toBeInTheDocument();
    expect(screen.getByText("Shared Movie Episode 2")).toBeInTheDocument();
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Encountered two children with the same key"),
      expect.anything(),
      expect.anything(),
    );
  } finally {
    consoleErrorSpy.mockRestore();
  }
});

test("supports custom card URL, badge, subtitle, and fallback poster", async () => {
  const tmdbRequest = createDeferred();
  fetchTMDBImages.mockReturnValue(tmdbRequest.promise);

  renderContentRow({
    title: "Tiếp tục xem",
    row: 0,
    items: [
      {
        slug: "resume-movie",
        name: "Resume Movie",
        episodeName: "0:tap-2",
        progressBadge: "Đã xem 20%",
        episodeSubtitle: "Tập 2",
        poster: "/stored-poster.jpg",
        tmdb: { id: 456, type: "movie" },
      },
    ],
    getItemUrl: (item) => `/movie/${item.slug}?ep=${encodeURIComponent(item.episodeName)}`,
    getItemBadge: (item) => item.progressBadge,
    getItemSubtitle: (item) => item.episodeSubtitle,
    getFallbackPoster: (item) => item.poster,
  });

  expect(screen.getByRole("link", { name: /Resume Movie/i })).toHaveClass("content-row__card");
  expect(screen.getByRole("link", { name: /Resume Movie/i })).toHaveAttribute(
    "href",
    "/movie/resume-movie?ep=0%3Atap-2",
  );
  expect(screen.getByText("Đã xem 20%")).toHaveClass("content-row__badge");
  expect(screen.getByText("Tập 2")).toHaveClass("content-row__year");
  expect(fetchTMDBImages).toHaveBeenCalledWith({ id: 456, type: "movie" });

  await act(async () => {
    tmdbRequest.resolve({ posterUrl: "" });
  });

  await waitFor(() => {
    expect(screen.getByRole("img", { name: "Resume Movie" })).toHaveAttribute(
      "src",
      "/stored-poster.jpg",
    );
  });
});

test("keeps custom fallback poster when TMDB returns default poster fallback", async () => {
  const tmdbRequest = createDeferred();
  fetchTMDBImages.mockReturnValue(tmdbRequest.promise);

  renderContentRow({
    title: "Tiếp tục xem",
    row: 0,
    items: [
      {
        slug: "resume-movie",
        name: "Resume Movie",
        poster: "/stored-poster.jpg",
        tmdb: { id: 456, type: "movie" },
      },
    ],
    getFallbackPoster: (item) => item.poster,
  });

  await act(async () => {
    tmdbRequest.resolve({ posterUrl: "/poster-mau.png" });
  });

  await waitFor(() => {
    expect(screen.getByRole("img", { name: "Resume Movie" })).toHaveAttribute(
      "src",
      "/stored-poster.jpg",
    );
  });
});

test("ignores stale TMDB poster responses after item changes", async () => {
  const firstRequest = createDeferred();
  const secondRequest = createDeferred();
  fetchTMDBImages
    .mockReturnValueOnce(firstRequest.promise)
    .mockReturnValueOnce(secondRequest.promise);

  const firstProps = {
    title: "Tiếp tục xem",
    row: 0,
    items: [
      {
        slug: "resume-movie",
        name: "Resume Movie",
        poster: "/first-fallback.jpg",
        tmdb: { id: 111, type: "movie" },
      },
    ],
    getFallbackPoster: (item) => item.poster,
  };
  const secondProps = {
    ...firstProps,
    items: [
      {
        slug: "resume-movie",
        name: "Resume Movie Updated",
        poster: "/second-fallback.jpg",
        tmdb: { id: 222, type: "movie" },
      },
    ],
  };

  const { rerender } = renderContentRow(firstProps);

  rerender(
    <MemoryRouter>
      <ContentRow {...secondProps} />
    </MemoryRouter>,
  );

  await act(async () => {
    secondRequest.resolve({ posterUrl: "/second-tmdb.jpg" });
  });

  await waitFor(() => {
    expect(screen.getByRole("img", { name: "Resume Movie Updated" })).toHaveAttribute(
      "src",
      "/second-tmdb.jpg",
    );
  });

  await act(async () => {
    firstRequest.resolve({ posterUrl: "/first-tmdb.jpg" });
  });

  expect(screen.getByRole("img", { name: "Resume Movie Updated" })).toHaveAttribute(
    "src",
    "/second-tmdb.jpg",
  );
});
