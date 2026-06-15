import { formatEpisodeGroupTitle } from "./episodeGroupTitle";

test("uses server_name directly as the episode tab title", () => {
  expect(formatEpisodeGroupTitle("1", 0)).toBe("1");
  expect(formatEpisodeGroupTitle("Vietsub", 1)).toBe("Vietsub");
});

test("falls back to a part title when server_name is blank", () => {
  expect(formatEpisodeGroupTitle("", 1)).toBe("Phần 2");
  expect(formatEpisodeGroupTitle(null, 2)).toBe("Phần 3");
});
