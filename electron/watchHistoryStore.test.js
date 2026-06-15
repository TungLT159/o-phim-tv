/**
 * @jest-environment node
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const { createWatchHistoryStore } = require("./watchHistoryStore");

describe("watch history file store", () => {
  let dir;
  let filePath;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "ophim-watch-history-"));
    filePath = path.join(dir, "watch-history.json");
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("returns an empty array when the file is missing", async () => {
    const store = createWatchHistoryStore(filePath);

    await expect(store.read()).resolves.toEqual([]);
  });

  test("returns an empty array when the file is malformed", async () => {
    fs.writeFileSync(filePath, "not json");
    const store = createWatchHistoryStore(filePath);

    await expect(store.read()).resolves.toEqual([]);
  });

  test("writes history using the configured JSON file", async () => {
    const history = [{ key: "movie-1", timestamp: 123 }];
    const store = createWatchHistoryStore(filePath);

    await store.write(history);

    expect(JSON.parse(fs.readFileSync(filePath, "utf8"))).toEqual(history);
    expect(fs.existsSync(`${filePath}.tmp`)).toBe(false);
  });

  test("rejects invalid write payloads instead of clearing history", async () => {
    const existingHistory = [{ key: "movie-1" }];
    fs.writeFileSync(filePath, JSON.stringify(existingHistory));
    const store = createWatchHistoryStore(filePath);

    await expect(store.write(null)).rejects.toThrow("Watch history must be an array");

    expect(JSON.parse(fs.readFileSync(filePath, "utf8"))).toEqual(existingHistory);
  });

  test("serializes overlapping writes with the latest write retained", async () => {
    const store = createWatchHistoryStore(filePath);

    await Promise.all([
      store.write([{ key: "first" }]),
      store.write([{ key: "second" }]),
      store.write([{ key: "third" }]),
    ]);

    expect(JSON.parse(fs.readFileSync(filePath, "utf8"))).toEqual([
      { key: "third" },
    ]);
    expect(fs.existsSync(`${filePath}.tmp`)).toBe(false);
  });

  test("clear removes persisted history", async () => {
    fs.writeFileSync(filePath, JSON.stringify([{ key: "movie-1" }]));
    const store = createWatchHistoryStore(filePath);

    await store.clear();

    await expect(store.read()).resolves.toEqual([]);
    expect(fs.existsSync(filePath)).toBe(false);
  });
});
