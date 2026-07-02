import {
  clearTvSearchSession,
  getTvSearchSession,
  saveTvSearchSession,
} from "./tvSearchSessionCache";

describe("tvSearchSessionCache", () => {
  afterEach(() => {
    clearTvSearchSession();
  });

  test("returns an empty session by default", () => {
    expect(getTvSearchSession()).toEqual({
      query: "",
      results: [],
      searched: false,
      lastFocusedSlug: "",
      scrollY: 0,
    });
  });

  test("merges patches into the current session", () => {
    saveTvSearchSession({
      query: "avatar",
      results: [{ slug: "avatar", name: "Avatar" }],
      searched: true,
    });

    saveTvSearchSession({
      lastFocusedSlug: "avatar",
      scrollY: 320,
    });

    expect(getTvSearchSession()).toEqual({
      query: "avatar",
      results: [{ slug: "avatar", name: "Avatar" }],
      searched: true,
      lastFocusedSlug: "avatar",
      scrollY: 320,
    });
  });

  test("does not expose mutable result references", () => {
    const result = { slug: "movie-1", name: "Movie 1" };
    saveTvSearchSession({ results: [result] });

    const snapshot = getTvSearchSession();
    snapshot.results.push({ slug: "movie-2", name: "Movie 2" });

    expect(getTvSearchSession().results).toEqual([result]);
  });

  test("does not expose mutable result entry references", () => {
    saveTvSearchSession({ results: [{ slug: "movie-1", name: "Movie 1" }] });

    const snapshot = getTvSearchSession();
    snapshot.results[0].name = "Changed Movie";

    expect(getTvSearchSession().results).toEqual([
      { slug: "movie-1", name: "Movie 1" },
    ]);
  });

  test("does not keep mutable references from saved results", () => {
    const result = { slug: "movie-1", name: "Movie 1" };
    saveTvSearchSession({ results: [result] });

    result.name = "Changed Movie";

    expect(getTvSearchSession().results).toEqual([
      { slug: "movie-1", name: "Movie 1" },
    ]);
  });

  test("normalizes invalid patch values", () => {
    saveTvSearchSession({
      query: null,
      results: null,
      searched: "yes",
      lastFocusedSlug: null,
      scrollY: -20,
    });

    expect(getTvSearchSession()).toEqual({
      query: "",
      results: [],
      searched: false,
      lastFocusedSlug: "",
      scrollY: 0,
    });
  });

  test("clears the session", () => {
    saveTvSearchSession({
      query: "avatar",
      results: [{ slug: "avatar", name: "Avatar" }],
      searched: true,
      lastFocusedSlug: "avatar",
      scrollY: 320,
    });

    clearTvSearchSession();

    expect(getTvSearchSession()).toEqual({
      query: "",
      results: [],
      searched: false,
      lastFocusedSlug: "",
      scrollY: 0,
    });
  });
});
