import { formatEpisodeDisplayName } from "./episodeDisplayName";

test("adds episode prefix for numeric episode names", () => {
  expect(formatEpisodeDisplayName("1")).toBe("Tập 1");
});

test("does not duplicate episode prefix when name already has it", () => {
  expect(formatEpisodeDisplayName("Tập 1")).toBe("Tập 1");
  expect(formatEpisodeDisplayName("tập 2")).toBe("tập 2");
});

test("trims episode display names", () => {
  expect(formatEpisodeDisplayName("  Tập 3  ")).toBe("Tập 3");
});
