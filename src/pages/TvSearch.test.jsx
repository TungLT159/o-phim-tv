import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TvSearch from "./TvSearch";
import { FocusProvider } from "../context/FocusContext";
import tmdbApi from "../api/tmdbApi";
import {
  clearTvSearchSession,
  getTvSearchSession,
  saveTvSearchSession,
} from "../utils/tvSearchSessionCache";

jest.mock("../api/tmdbApi", () => ({
  search: jest.fn(),
}));

jest.mock("../utils/tmdbImageFetcher", () => ({
  fetchTMDBImages: jest.fn(() => Promise.resolve({ posterUrl: null })),
}));

jest.mock("../tauri-bridge", () => ({
  isTauri: () => true,
}));

const originalScrollYDescriptor = Object.getOwnPropertyDescriptor(window, "scrollY");

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

afterEach(() => {
  if (originalScrollYDescriptor) {
    Object.defineProperty(window, "scrollY", originalScrollYDescriptor);
  } else {
    delete window.scrollY;
  }
  clearTvSearchSession();
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

const makeResults = (count) =>
  Array.from({ length: count }, (_, index) => ({
    slug: `movie-${index + 1}`,
    name: `Movie ${index + 1}`,
  }));

const createDeferredSearch = () => {
  let resolve;
  const promise = new Promise((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
};

const focusElement = (element) => {
  act(() => {
    element.focus();
  });
};

test("stores search results in the session cache", async () => {
  tmdbApi.search.mockResolvedValue({ data: { items: makeResults(2) } });
  render(<MemoryRouter><FocusProvider><TvSearch /></FocusProvider></MemoryRouter>);
  const input = screen.getByPlaceholderText("Nhập tên phim...");
  fireEvent.change(input, { target: { value: "movie" } });
  await waitFor(() => expect(screen.getByText("Movie 2")).toBeInTheDocument());
  expect(getTvSearchSession()).toMatchObject({ query: "movie", results: makeResults(2), searched: true });
});

test("hydrates cached search results on remount without calling the API again", async () => {
  tmdbApi.search.mockResolvedValue({ data: { items: makeResults(2) } });
  const firstRender = render(<MemoryRouter><FocusProvider><TvSearch /></FocusProvider></MemoryRouter>);
  const input = screen.getByPlaceholderText("Nhập tên phim...");
  fireEvent.change(input, { target: { value: "movie" } });
  await waitFor(() => expect(screen.getByText("Movie 2")).toBeInTheDocument());
  expect(tmdbApi.search).toHaveBeenCalledTimes(1);
  firstRender.unmount();
  tmdbApi.search.mockClear();
  render(<MemoryRouter><FocusProvider><TvSearch /></FocusProvider></MemoryRouter>);
  expect(screen.getByPlaceholderText("Nhập tên phim...")).toHaveValue("movie");
  expect(screen.getByText("Movie 1")).toBeInTheDocument();
  expect(screen.getByText("Movie 2")).toBeInTheDocument();
  expect(tmdbApi.search).not.toHaveBeenCalled();
});

test("records focused result and restores focus and scroll on remount", async () => {
  const scrollToSpy = jest.spyOn(window, "scrollTo").mockImplementation(() => {});
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    writable: true,
    value: 480,
  });
  tmdbApi.search.mockResolvedValue({ data: { items: makeResults(3) } });

  const firstRender = render(<MemoryRouter><FocusProvider><TvSearch /></FocusProvider></MemoryRouter>);
  const input = screen.getByPlaceholderText("Nhập tên phim...");
  fireEvent.change(input, { target: { value: "movie" } });
  await waitFor(() => expect(screen.getByText("Movie 2")).toBeInTheDocument());

  const secondCard = screen.getByText("Movie 2").closest("a");
  fireEvent.focus(secondCard);
  fireEvent.click(secondCard);
  expect(getTvSearchSession()).toMatchObject({ lastFocusedSlug: "movie-2", scrollY: 480 });

  firstRender.unmount();
  render(<MemoryRouter><FocusProvider><TvSearch /></FocusProvider></MemoryRouter>);

  await waitFor(() => expect(screen.getByText("Movie 2").closest("a")).toHaveFocus());
  expect(scrollToSpy).toHaveBeenCalledWith(0, 480);
});

test("does not reapply cached focus or scroll after typing a new search", async () => {
  const scrollToSpy = jest.spyOn(window, "scrollTo").mockImplementation(() => {});
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    writable: true,
    value: 480,
  });
  saveTvSearchSession({
    query: "movie",
    results: makeResults(3),
    searched: true,
    lastFocusedSlug: "movie-2",
    scrollY: 480,
  });
  tmdbApi.search.mockResolvedValue({
    data: { items: [{ slug: "fresh-movie", name: "Fresh Movie" }] },
  });

  render(<MemoryRouter><FocusProvider><TvSearch /></FocusProvider></MemoryRouter>);

  await waitFor(() => expect(screen.getByText("Movie 2").closest("a")).toHaveFocus());
  expect(scrollToSpy).toHaveBeenCalledTimes(1);

  const input = screen.getByPlaceholderText("Nhập tên phim...");
  focusElement(input);
  fireEvent.change(input, { target: { value: "fresh" } });

  await waitFor(() => expect(screen.getByText("Fresh Movie")).toBeInTheDocument());
  expect(input).toHaveFocus();
  expect(scrollToSpy).toHaveBeenCalledTimes(1);
});

test("clears cached search state when the clear button is clicked", async () => {
  tmdbApi.search.mockResolvedValue({ data: { items: makeResults(1) } });
  render(<MemoryRouter><FocusProvider><TvSearch /></FocusProvider></MemoryRouter>);
  fireEvent.change(screen.getByPlaceholderText("Nhập tên phim..."), { target: { value: "movie" } });
  await waitFor(() => expect(screen.getByText("Movie 1")).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByPlaceholderText("Nhập tên phim...")).toHaveValue("");
  expect(screen.queryByText("Movie 1")).not.toBeInTheDocument();
  expect(getTvSearchSession()).toEqual({ query: "", results: [], searched: false, lastFocusedSlug: "", scrollY: 0 });
});

test("keeps newer search results when an older request resolves later", async () => {
  const olderSearch = createDeferredSearch();
  const newerSearch = createDeferredSearch();
  const newerResults = [{ slug: "newer-movie", name: "Newer Movie" }];
  const olderResults = [{ slug: "older-movie", name: "Older Movie" }];
  tmdbApi.search
    .mockReturnValueOnce(olderSearch.promise)
    .mockReturnValueOnce(newerSearch.promise);

  render(<MemoryRouter><FocusProvider><TvSearch /></FocusProvider></MemoryRouter>);
  const input = screen.getByPlaceholderText("Nhập tên phim...");

  fireEvent.change(input, { target: { value: "old" } });
  fireEvent.change(input, { target: { value: "new" } });
  await act(async () => {
    newerSearch.resolve({ data: { items: newerResults } });
    await Promise.resolve();
  });

  await waitFor(() => expect(screen.getByText("Newer Movie")).toBeInTheDocument());
  expect(getTvSearchSession()).toMatchObject({ query: "new", results: newerResults, searched: true });

  await act(async () => {
    olderSearch.resolve({ data: { items: olderResults } });
    await Promise.resolve();
  });

  await waitFor(() => expect(screen.queryByText("Older Movie")).not.toBeInTheDocument());
  expect(screen.getByText("Newer Movie")).toBeInTheDocument();
  expect(getTvSearchSession()).toMatchObject({ query: "new", results: newerResults, searched: true });
});

test("keeps search state empty when clearing before a pending request resolves", async () => {
  const pendingSearch = createDeferredSearch();
  const pendingResults = [{ slug: "pending-movie", name: "Pending Movie" }];
  tmdbApi.search.mockReturnValue(pendingSearch.promise);

  render(<MemoryRouter><FocusProvider><TvSearch /></FocusProvider></MemoryRouter>);
  const input = screen.getByPlaceholderText("Nhập tên phim...");

  fireEvent.change(input, { target: { value: "movie" } });
  fireEvent.click(screen.getByRole("button"));
  await act(async () => {
    pendingSearch.resolve({ data: { items: pendingResults } });
    await Promise.resolve();
  });

  await waitFor(() => expect(screen.queryByText("Pending Movie")).not.toBeInTheDocument());
  expect(input).toHaveValue("");
  expect(screen.queryByText("Đang tìm...")).not.toBeInTheDocument();
  expect(getTvSearchSession()).toEqual({ query: "", results: [], searched: false, lastFocusedSlug: "", scrollY: 0 });
});

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
  focusElement(input);

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
  focusElement(input);
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
  focusElement(input);
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

test("keeps focus in the search input when new results replace the previously focused first row", async () => {
  tmdbApi.search
    .mockResolvedValueOnce({ data: { items: makeResults(3) } })
    .mockResolvedValueOnce({ data: { items: [{ slug: "fresh-movie", name: "Fresh Movie" }] } });

  render(
    <MemoryRouter>
      <FocusProvider>
        <TvSearch />
      </FocusProvider>
    </MemoryRouter>,
  );

  const input = screen.getByPlaceholderText("Nhập tên phim...");
  focusElement(input);
  fireEvent.change(input, { target: { value: "movie" } });

  await waitFor(() => expect(screen.getByText("Movie 1")).toBeInTheDocument());

  fireEvent.keyDown(input, { key: "ArrowDown" });
  const firstCard = screen.getByText("Movie 1").closest("a");
  expect(firstCard).toHaveFocus();

  fireEvent.keyDown(firstCard, { key: "ArrowUp" });
  expect(input).toHaveFocus();

  fireEvent.change(input, { target: { value: "fresh" } });

  await waitFor(() => expect(screen.getByText("Fresh Movie")).toBeInTheDocument());
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
  focusElement(input);
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

  focusElement(input);
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
  focusElement(input);
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
