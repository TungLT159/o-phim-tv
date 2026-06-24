import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TvSearch from "./TvSearch";
import { FocusProvider } from "../context/FocusContext";
import tmdbApi from "../api/tmdbApi";

jest.mock("../api/tmdbApi", () => ({
  search: jest.fn(),
}));

jest.mock("../utils/tmdbImageFetcher", () => ({
  fetchTMDBImages: jest.fn(() => Promise.resolve({ posterUrl: null })),
}));

jest.mock("../tauri-bridge", () => ({
  isTauri: () => true,
}));

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

const makeResults = (count) =>
  Array.from({ length: count }, (_, index) => ({
    slug: `movie-${index + 1}`,
    name: `Movie ${index + 1}`,
  }));

test("keeps focus in the search input while typing and rendering results", async () => {
  tmdbApi.search.mockResolvedValue({
    data: {
      items: [{ slug: "movie-1", name: "Movie 1" }],
    },
  });

  render(
    <MemoryRouter>
      <FocusProvider>
        <TvSearch />
      </FocusProvider>
    </MemoryRouter>,
  );

  const input = screen.getByPlaceholderText("Nhập tên phim...");
  input.focus();

  fireEvent.change(input, { target: { value: "a" } });

  await waitFor(() => expect(screen.getByText("Movie 1")).toBeInTheDocument());
  expect(input).toHaveFocus();
});

test("moves focus from the search input to the first result on ArrowDown", async () => {
  tmdbApi.search.mockResolvedValue({
    data: { items: makeResults(3) },
  });

  render(
    <MemoryRouter>
      <FocusProvider>
        <TvSearch />
      </FocusProvider>
    </MemoryRouter>,
  );

  const input = screen.getByPlaceholderText("Nhập tên phim...");
  input.focus();
  fireEvent.change(input, { target: { value: "movie" } });

  await waitFor(() => expect(screen.getByText("Movie 1")).toBeInTheDocument());

  fireEvent.keyDown(input, { key: "ArrowDown" });

  expect(screen.getByText("Movie 1").closest("a")).toHaveFocus();

  fireEvent.keyDown(document, { key: "ArrowRight" });

  await waitFor(() => expect(screen.getByText("Movie 2").closest("a")).toHaveFocus());
});

test("keeps editing keys inside the focused search input", async () => {
  const historyBackSpy = jest.spyOn(window.history, "back").mockImplementation(() => {});
  tmdbApi.search.mockResolvedValue({
    data: { items: makeResults(1) },
  });

  render(
    <MemoryRouter>
      <FocusProvider>
        <TvSearch />
      </FocusProvider>
    </MemoryRouter>,
  );

  const input = screen.getByPlaceholderText("Nhập tên phim...");
  input.focus();
  fireEvent.change(input, { target: { value: "movie" } });

  await waitFor(() => expect(screen.getByText("Movie 1")).toBeInTheDocument());

  ["Backspace", " ", "Enter", "Escape", "a"].forEach((key) => {
    fireEvent.keyDown(input, { key });
    expect(input).toHaveFocus();
  });

  expect(historyBackSpy).not.toHaveBeenCalled();
  historyBackSpy.mockRestore();
});

test("moves focus from the first result row back to the search input on ArrowUp", async () => {
  tmdbApi.search.mockResolvedValue({
    data: { items: makeResults(3) },
  });

  render(
    <MemoryRouter>
      <FocusProvider>
        <TvSearch />
      </FocusProvider>
    </MemoryRouter>,
  );

  const input = screen.getByPlaceholderText("Nhập tên phim...");
  fireEvent.change(input, { target: { value: "movie" } });

  await waitFor(() => expect(screen.getByText("Movie 1")).toBeInTheDocument());

  const firstCard = screen.getByText("Movie 1").closest("a");
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(firstCard).toHaveFocus();

  fireEvent.keyDown(firstCard, { key: "ArrowUp" });

  expect(input).toHaveFocus();
});

test("keeps focus in the search input after returning from the first result row", async () => {
  tmdbApi.search.mockResolvedValue({
    data: { items: makeResults(3) },
  });

  render(
    <MemoryRouter>
      <FocusProvider>
        <TvSearch />
      </FocusProvider>
    </MemoryRouter>,
  );

  const input = screen.getByPlaceholderText("Nhập tên phim...");
  fireEvent.change(input, { target: { value: "movie" } });

  await waitFor(() => expect(screen.getByText("Movie 1")).toBeInTheDocument());

  const firstCard = screen.getByText("Movie 1").closest("a");
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(firstCard).toHaveFocus();
  expect(firstCard).toHaveClass("tv-search-card--focused");

  fireEvent.keyDown(firstCard, { key: "ArrowUp" });
  expect(input).toHaveFocus();
  expect(firstCard).not.toHaveClass("tv-search-card--focused");

  fireEvent.keyDown(input, { key: "ArrowRight" });
  expect(input).toHaveFocus();

  fireEvent.keyDown(input, { key: "ArrowLeft" });
  expect(input).toHaveFocus();

  fireEvent.keyDown(input, { key: "ArrowUp" });
  expect(input).toHaveFocus();
});

test("uses the rendered grid column count so ArrowDown can reach later visible rows", async () => {
  tmdbApi.search.mockResolvedValue({
    data: { items: makeResults(6) },
  });

  render(
    <MemoryRouter>
      <FocusProvider>
        <TvSearch />
      </FocusProvider>
    </MemoryRouter>,
  );

  const input = screen.getByPlaceholderText("Nhập tên phim...");
  input.focus();
  fireEvent.change(input, { target: { value: "movie" } });

  await waitFor(() => expect(screen.getByText("Movie 6")).toBeInTheDocument());

  const cards = screen.getAllByText(/Movie \d+/).map((title) => title.closest("a"));
  cards.forEach((card, index) => {
    card.getBoundingClientRect = jest.fn(() => ({
      left: (index % 3) * 100,
      right: (index % 3) * 100 + 80,
      top: Math.floor(index / 3) * 160,
      bottom: Math.floor(index / 3) * 160 + 120,
      width: 80,
      height: 120,
    }));
  });
  fireEvent(window, new Event("resize"));

  input.focus();
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(cards[0]).toHaveFocus();

  fireEvent.keyDown(document, { key: "ArrowDown" });

  await waitFor(() => expect(cards[3]).toHaveFocus());
});

test("scrolls newly focused lower result rows into view while moving down", async () => {
  tmdbApi.search.mockResolvedValue({
    data: { items: makeResults(8) },
  });

  render(
    <MemoryRouter>
      <FocusProvider>
        <TvSearch />
      </FocusProvider>
    </MemoryRouter>,
  );

  const input = screen.getByPlaceholderText("Nhập tên phim...");
  input.focus();
  fireEvent.change(input, { target: { value: "movie" } });

  await waitFor(() => expect(screen.getByText("Movie 8")).toBeInTheDocument());

  const cards = screen.getAllByText(/Movie \d+/).map((title) => title.closest("a"));
  cards.forEach((card, index) => {
    card.scrollIntoView = jest.fn();
    card.getBoundingClientRect = jest.fn(() => ({
      left: (index % 4) * 100,
      right: (index % 4) * 100 + 80,
      top: Math.floor(index / 4) * 180,
      bottom: Math.floor(index / 4) * 180 + 120,
      width: 80,
      height: 120,
    }));
  });
  fireEvent(window, new Event("resize"));

  fireEvent.keyDown(input, { key: "ArrowDown" });
  await waitFor(() => expect(cards[0]).toHaveFocus());

  cards.forEach((card) => card.scrollIntoView.mockClear());
  fireEvent.keyDown(document, { key: "ArrowDown" });

  await waitFor(() => expect(cards[4]).toHaveFocus());
  expect(cards[4].scrollIntoView).toHaveBeenCalledWith(
    expect.objectContaining({ block: "center" }),
  );
});
