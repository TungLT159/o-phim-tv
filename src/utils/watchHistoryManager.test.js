jest.mock('../tauri-bridge', () => ({
  watchHistoryBridge: {
    read: jest.fn(),
    write: jest.fn(),
    clear: jest.fn(),
  },
  isTauri: jest.fn(() => false),
  navigationBridge: {},
  updatesBridge: {},
  apiBridge: {},
}));

import * as watchHistoryManager from "./watchHistoryManager";

const {
  clearWatchHistory,
  flushWatchHistory,
  getInProgressMovies,
  getRecentInProgressMovies,
  getRecentInProgressMoviesSnapshot,
  getWatchHistory,
  getWatchHistorySnapshot,
  getWatchProgress,
  initializeWatchHistory,
  removeWatchProgress,
  saveWatchProgress,
  shouldShowContinueWatching,
  subscribeWatchHistory,
} = watchHistoryManager;

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
};

beforeEach(async () => {
  localStorage.clear();
  delete window.ophimWatchHistoryStorage;
  await clearWatchHistory();
});

test("shows continue watching from the 1 percent threshold", () => {
  expect(shouldShowContinueWatching(12, 1200)).toBe(true);
  expect(shouldShowContinueWatching(11, 1200)).toBe(false);
});

test("in-progress movies include items from 1 percent through 95 percent", async () => {
  localStorage.setItem(
    "ophim_watch_history:v1",
    JSON.stringify([
      { key: "below", percentage: 0.9 },
      { key: "one", percentage: 1 },
      { key: "ninety-five", percentage: 95 },
      { key: "above", percentage: 95.1 },
    ]),
  );

  await initializeWatchHistory();

  expect((await getInProgressMovies()).map((item) => item.key)).toEqual([
    "one",
    "ninety-five",
  ]);
});

test("in-progress movies derive missing percentage from current time and duration", async () => {
  localStorage.setItem(
    "ophim_watch_history:v1",
    JSON.stringify([
      {
        key: "derived-progress",
        movieId: "derived-progress",
        currentTime: 120,
        duration: 600,
        timestamp: "2026-01-01T00:00:00.000Z",
        movieInfo: { slug: "derived-progress" },
      },
    ]),
  );

  await initializeWatchHistory();

  expect((await getRecentInProgressMovies()).map((item) => item.key)).toEqual([
    "derived-progress",
  ]);
});

test("recent in-progress movies filter range, sort newest first, and dedupe by movie", async () => {
  localStorage.setItem(
    "ophim_watch_history:v1",
    JSON.stringify([
      {
        key: "below",
        movieId: "below-id",
        percentage: 0.9,
        timestamp: "2026-01-05T00:00:00.000Z",
        movieInfo: { slug: "below" },
      },
      {
        key: "movie-a-old",
        movieId: "movie-a-id",
        percentage: 20,
        timestamp: "2026-01-01T00:00:00.000Z",
        movieInfo: { slug: "movie-a" },
      },
      {
        key: "movie-b",
        movieId: "movie-b-id",
        percentage: 30,
        timestamp: "2026-01-03T00:00:00.000Z",
        movieInfo: { slug: "movie-b" },
      },
      {
        key: "movie-a-new",
        movieId: "movie-a-id",
        percentage: 40,
        timestamp: "2026-01-04T00:00:00.000Z",
        movieInfo: { slug: "movie-a" },
      },
      {
        key: "above",
        movieId: "above-id",
        percentage: 95.1,
        timestamp: "2026-01-06T00:00:00.000Z",
        movieInfo: { slug: "above" },
      },
      {
        key: "movie-c",
        movieId: "movie-c-id",
        percentage: 95,
        timestamp: "2026-01-02T00:00:00.000Z",
        movieInfo: { slug: "" },
      },
    ]),
  );

  await initializeWatchHistory();

  expect((await getRecentInProgressMovies()).map((item) => item.key)).toEqual([
    "movie-a-new",
    "movie-b",
    "movie-c",
  ]);
});

test("recent in-progress movies default to 10 newest unique movies", async () => {
  const history = Array.from({ length: 12 }, (_, index) => ({
    key: `movie-${index}`,
    movieId: `movie-${index}`,
    percentage: 50,
    timestamp: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    movieInfo: { slug: `movie-${index}` },
  }));

  localStorage.setItem("ophim_watch_history:v1", JSON.stringify(history));

  await initializeWatchHistory();

  expect((await getRecentInProgressMovies()).map((item) => item.key)).toEqual([
    "movie-11",
    "movie-10",
    "movie-9",
    "movie-8",
    "movie-7",
    "movie-6",
    "movie-5",
    "movie-4",
    "movie-3",
    "movie-2",
  ]);
});

test("recent in-progress movies sort missing and invalid timestamps after valid timestamps", async () => {
  localStorage.setItem(
    "ophim_watch_history:v1",
    JSON.stringify([
      {
        key: "invalid-timestamp",
        movieId: "invalid-timestamp",
        percentage: 50,
        timestamp: "not-a-date",
        movieInfo: { slug: "invalid-timestamp" },
      },
      {
        key: "missing-timestamp",
        movieId: "missing-timestamp",
        percentage: 50,
        movieInfo: { slug: "missing-timestamp" },
      },
      {
        key: "valid-newer",
        movieId: "valid-newer",
        percentage: 50,
        timestamp: "2026-01-02T00:00:00.000Z",
        movieInfo: { slug: "valid-newer" },
      },
      {
        key: "valid-older",
        movieId: "valid-older",
        percentage: 50,
        timestamp: "2026-01-01T00:00:00.000Z",
        movieInfo: { slug: "valid-older" },
      },
      {
        key: "valid-pre-1970",
        movieId: "valid-pre-1970",
        percentage: 50,
        timestamp: "1969-12-31T23:59:59.000Z",
        movieInfo: { slug: "valid-pre-1970" },
      },
    ]),
  );

  await initializeWatchHistory();

  expect((await getRecentInProgressMovies()).map((item) => item.key)).toEqual([
    "valid-newer",
    "valid-older",
    "valid-pre-1970",
    "invalid-timestamp",
    "missing-timestamp",
  ]);
});

test("initializes from Electron storage and exposes synchronous snapshots", async () => {
  window.ophimWatchHistoryStorage = {
    read: jest.fn().mockResolvedValue([
      {
        key: "movie-a_ep-1",
        movieId: "movie-a",
        episodeName: "ep-1",
        percentage: 25,
        timestamp: "2026-01-01T00:00:00.000Z",
        movieInfo: { slug: "movie-a" },
      },
    ]),
    write: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  };

  await initializeWatchHistory();

  expect(await getWatchHistory()).toEqual(getWatchHistorySnapshot());
  expect(getRecentInProgressMoviesSnapshot().map((item) => item.key)).toEqual([
    "movie-a_ep-1",
  ]);
});

test("migrates localStorage histories to Electron storage with newest duplicate and 100 item cap", async () => {
  const oldDuplicate = {
    key: "duplicate",
    movieId: "duplicate-old",
    percentage: 20,
    timestamp: "2026-01-01T00:00:00.000Z",
  };
  const newDuplicate = {
    key: "duplicate",
    movieId: "duplicate-new",
    percentage: 30,
    timestamp: "2026-02-01T00:00:00.000Z",
  };
  const legacyItems = Array.from({ length: 101 }, (_, index) => ({
    key: `legacy-${index}`,
    movieId: `legacy-${index}`,
    percentage: 50,
    timestamp: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
  }));

  localStorage.setItem(
    "ophim_watch_history:v1",
    JSON.stringify([oldDuplicate, ...legacyItems]),
  );
  localStorage.setItem(
    "ophim_watch_history",
    JSON.stringify([newDuplicate]),
  );

  window.ophimWatchHistoryStorage = {
    read: jest.fn().mockResolvedValue([
      {
        key: "electron-only",
        movieId: "electron-only",
        percentage: 50,
        timestamp: "2027-01-01T00:00:00.000Z",
      },
    ]),
    write: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  };

  await initializeWatchHistory();
  await flushWatchHistory();

  const history = getWatchHistorySnapshot();

  expect(history).toHaveLength(100);
  expect(history[0].key).toBe("electron-only");
  expect(history.find((item) => item.key === "duplicate")?.movieId).toBe(
    "duplicate-new",
  );
  expect(window.ophimWatchHistoryStorage.write).toHaveBeenCalledWith(history);
  expect(localStorage.getItem("ophim_watch_history:v1")).toBeNull();
  expect(localStorage.getItem("ophim_watch_history")).toBeNull();
});

test("keeps localStorage history when Electron migration write fails", async () => {
  const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  const localHistory = [
    {
      key: "movie-a_ep-1",
      movieId: "movie-a",
      episodeName: "ep-1",
      percentage: 25,
      timestamp: "2026-01-01T00:00:00.000Z",
    },
  ];

  localStorage.setItem("ophim_watch_history:v1", JSON.stringify(localHistory));
  window.ophimWatchHistoryStorage = {
    read: jest.fn().mockResolvedValue([]),
    write: jest.fn().mockRejectedValue(new Error("disk full")),
    clear: jest.fn().mockResolvedValue(undefined),
  };

  await initializeWatchHistory();
  await flushWatchHistory();

  expect(consoleErrorSpy).toHaveBeenCalledWith(
    "Error writing watch history:",
    expect.any(Error),
  );
  expect(localStorage.getItem("ophim_watch_history:v1")).toBe(
    JSON.stringify(localHistory),
  );
  expect(localStorage.getItem("ophim_watch_history")).toBeNull();

  consoleErrorSpy.mockRestore();
});

test("updates cache synchronously before Electron writes settle", async () => {
  const writeDeferred = createDeferred();
  window.ophimWatchHistoryStorage = {
    read: jest.fn().mockResolvedValue([]),
    write: jest.fn().mockReturnValue(writeDeferred.promise),
    clear: jest.fn().mockResolvedValue(undefined),
  };

  await initializeWatchHistory();
  const savePromise = saveWatchProgress("movie-a", "ep-1", 120, 600, {
    title: "Movie A",
    slug: "movie-a",
  });

  expect(getWatchHistorySnapshot()).toHaveLength(1);
  expect(await getWatchProgress("movie-a", "ep-1")).toMatchObject({
    key: "movie-a_ep-1",
    percentage: 20,
  });

  writeDeferred.resolve();
  await savePromise;
});

test("shares first initialization across concurrent saves", async () => {
  const readDeferred = createDeferred();
  window.ophimWatchHistoryStorage = {
    read: jest.fn().mockReturnValue(readDeferred.promise),
    write: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  };

  const firstSave = saveWatchProgress("movie-a", "ep-1", 60, 600);
  const secondSave = saveWatchProgress("movie-b", "ep-1", 120, 600);

  expect(window.ophimWatchHistoryStorage.read).toHaveBeenCalledTimes(1);

  readDeferred.resolve([]);
  await Promise.all([firstSave, secondSave]);
  await flushWatchHistory();

  expect(getWatchHistorySnapshot().map((item) => item.key)).toEqual([
    "movie-b_ep-1",
    "movie-a_ep-1",
  ]);
  expect(window.ophimWatchHistoryStorage.write.mock.calls.at(-1)[0].map((item) => item.key)).toEqual([
    "movie-b_ep-1",
    "movie-a_ep-1",
  ]);
});

test("preserves saves started while migration write is pending", async () => {
  const migrationWrite = createDeferred();
  localStorage.setItem(
    "ophim_watch_history:v1",
    JSON.stringify([
      {
        key: "migrated_ep-1",
        movieId: "migrated",
        episodeName: "ep-1",
        percentage: 25,
        timestamp: "2026-01-01T00:00:00.000Z",
      },
    ]),
  );
  window.ophimWatchHistoryStorage = {
    read: jest.fn().mockResolvedValue([]),
    write: jest
      .fn()
      .mockReturnValueOnce(migrationWrite.promise)
      .mockResolvedValueOnce(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  };

  const initializePromise = initializeWatchHistory();
  await Promise.resolve();
  await Promise.resolve();
  const savePromise = saveWatchProgress("movie-a", "ep-1", 60, 600);

  migrationWrite.resolve();
  await Promise.all([initializePromise, savePromise]);
  await flushWatchHistory();

  expect(window.ophimWatchHistoryStorage.write).toHaveBeenCalledTimes(2);
  expect(window.ophimWatchHistoryStorage.write.mock.calls[1][0].map((item) => item.key)).toEqual([
    "movie-a_ep-1",
    "migrated_ep-1",
  ]);
  expect(localStorage.getItem("ophim_watch_history:v1")).toBeNull();
});

test("serializes pending Electron writes and flushes the final state", async () => {
  const firstWrite = createDeferred();
  window.ophimWatchHistoryStorage = {
    read: jest.fn().mockResolvedValue([]),
    write: jest
      .fn()
      .mockReturnValueOnce(firstWrite.promise)
      .mockResolvedValueOnce(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  };

  await initializeWatchHistory();
  const firstSave = saveWatchProgress("movie-a", "ep-1", 60, 600);
  const secondSave = saveWatchProgress("movie-b", "ep-1", 120, 600);

  expect(window.ophimWatchHistoryStorage.write).toHaveBeenCalledTimes(1);

  firstWrite.resolve();
  await Promise.all([firstSave, secondSave]);
  await flushWatchHistory();

  expect(window.ophimWatchHistoryStorage.write).toHaveBeenCalledTimes(2);
  expect(window.ophimWatchHistoryStorage.write.mock.calls[1][0].map((item) => item.key)).toEqual([
    "movie-b_ep-1",
    "movie-a_ep-1",
  ]);
});

test("notifies subscribers when cache changes", async () => {
  await initializeWatchHistory();
  const listener = jest.fn();
  const unsubscribe = subscribeWatchHistory(listener);

  await saveWatchProgress("movie-a", "ep-1", 60, 600);

  expect(listener).toHaveBeenCalledWith(getWatchHistorySnapshot());

  unsubscribe();
  await saveWatchProgress("movie-b", "ep-1", 60, 600);

  expect(listener).toHaveBeenCalledTimes(1);
});

test("uses localStorage fallback when Electron storage is unavailable", async () => {
  await initializeWatchHistory();

  await saveWatchProgress("movie-a", "ep-1", 60, 600);
  await removeWatchProgress("movie-a", "ep-1");

  expect(getWatchHistorySnapshot()).toEqual([]);
  expect(JSON.parse(localStorage.getItem("ophim_watch_history:v1"))).toEqual([]);

  await saveWatchProgress("movie-b", "ep-1", 120, 600);
  await clearWatchHistory();

  expect(getWatchHistorySnapshot()).toEqual([]);
  expect(localStorage.getItem("ophim_watch_history:v1")).toBeNull();
});
