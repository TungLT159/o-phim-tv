import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TvHero from "./TvHero";
import tmdbApi from "../../api/tmdbApi";
import axiosClient from "../../api/axiosClient";
import { FOCUS_KEYS, useFocus, useFocusable } from "../../context/FocusContext";

jest.mock("../../api/tmdbApi", () => ({
  __esModule: true,
  default: {
    getMoviesList: jest.fn(),
  },
  movieType: {
    phimChieuRap: "phim-chieu-rap",
  },
}));

jest.mock("../../api/axiosClient", () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: { item: { name: "Hero Detail" } } })),
  },
}));

jest.mock("../../utils/tmdbImageFetcher", () => ({
  fetchTMDBImages: jest.fn(() => Promise.resolve({ backdropUrl: "", overview: "" })),
}));

jest.mock("../../context/FocusContext", () => ({
  FOCUS_KEYS: {
    HOME_HERO_PLAY: "HOME_HERO_PLAY",
  },
  useFocus: jest.fn(),
  useFocusable: jest.fn(),
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

const renderTvHero = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <TvHero />
    </MemoryRouter>,
  );

beforeEach(() => {
  jest.useRealTimers();
  tmdbApi.getMoviesList.mockResolvedValue({
    data: {
      items: [
        {
          _id: "hero-1",
          slug: "hero-movie",
          name: "Hero Movie",
        },
      ],
    },
  });
  useFocus.mockReturnValue({ focusByKey: jest.fn(), getLastNavigationDirection: jest.fn() });
  useFocusable.mockReturnValue({ ref: { current: null }, focused: false });
  axiosClient.get.mockResolvedValue({ data: { item: { name: "Hero Detail" } } });
  window.scrollTo = jest.fn();
  window.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };
});

afterEach(() => {
  jest.useRealTimers();
});

test("scrolls to the top when the TV hero play button receives focus", async () => {
  renderTvHero();

  const playButton = await screen.findByRole("button", { name: "Xem ngay" });
  fireEvent.focus(playButton);

  await waitFor(() => {
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});

test("scrolls to the top when remote focus returns to the TV hero play button", async () => {
  useFocusable.mockReturnValue({ ref: { current: null }, focused: true });

  renderTvHero();

  await screen.findByRole("button", { name: "Xem ngay" });

  await waitFor(() => {
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});

test("exposes the hero play focus key for DOM focus fallback", async () => {
  renderTvHero();

  expect(await screen.findByRole("button", { name: "Xem ngay" })).toHaveAttribute(
    "data-focus-key",
    FOCUS_KEYS.HOME_HERO_PLAY,
  );
});

test("aligns the hero play button near the top after upward remote navigation", async () => {
  const focusRef = { current: null };
  useFocusable.mockReturnValue({ ref: focusRef, focused: false });
  window.HTMLElement.prototype.scrollIntoView = jest.fn();

  renderTvHero();

  const playButton = await screen.findByRole("button", { name: "Xem ngay" });
  focusRef.current = playButton;
  const focusConfig = useFocusable.mock.calls.find(([config]) => (
    config?.focusKey === FOCUS_KEYS.HOME_HERO_PLAY
  ))?.[0];

  expect(focusConfig).toBeDefined();
  window.scrollTo.mockClear();
  expect(focusConfig.onArrowPress("up")).toBe(false);
  fireEvent.focus(playButton);

  expect(playButton.scrollIntoView).toHaveBeenCalledWith({
    behavior: "smooth",
    block: "start",
    inline: "nearest",
  });
  expect(window.scrollTo).not.toHaveBeenCalled();
});

test("aligns the hero play button near the top when focus arrives from below", async () => {
  const focusRef = { current: null };
  useFocus.mockReturnValue({
    focusByKey: jest.fn(),
    getLastNavigationDirection: jest.fn(() => "up"),
  });
  useFocusable.mockReturnValue({ ref: focusRef, focused: false });
  window.HTMLElement.prototype.scrollIntoView = jest.fn();

  renderTvHero();

  const playButton = await screen.findByRole("button", { name: "Xem ngay" });
  focusRef.current = playButton;
  fireEvent.focus(playButton);

  expect(playButton.scrollIntoView).toHaveBeenCalledWith({
    behavior: "smooth",
    block: "start",
    inline: "nearest",
  });
  expect(window.scrollTo).not.toHaveBeenCalled();
});
