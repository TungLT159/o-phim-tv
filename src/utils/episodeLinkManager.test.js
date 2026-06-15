import tmdbApi from "../api/tmdbApi";
import {
  clearAllEpisodeLinks,
  getEpisodeLink,
  prefetchEpisodeLink,
} from "./episodeLinkManager";

jest.mock("../api/tmdbApi", () => ({
  episode: jest.fn(),
}));

beforeEach(() => {
  clearAllEpisodeLinks();
  tmdbApi.episode.mockReset();
});

test("deduplicates concurrent getEpisodeLink calls for the same episode", async () => {
  tmdbApi.episode.mockResolvedValue({ playlistUrl: "/tap-1.m3u8" });

  const [firstLink, secondLink] = await Promise.all([
    getEpisodeLink("movie-1", "tap-1", 0),
    getEpisodeLink("movie-1", "tap-1", 0),
  ]);

  expect(tmdbApi.episode).toHaveBeenCalledTimes(1);
  expect(tmdbApi.episode).toHaveBeenCalledWith("movie-1", "tap-1", 0);
  expect(firstLink).toEqual({ playlistUrl: "/tap-1.m3u8" });
  expect(secondLink).toEqual({ playlistUrl: "/tap-1.m3u8" });
});

test("prefetchEpisodeLink stores the link for a later getEpisodeLink call", async () => {
  tmdbApi.episode.mockResolvedValue({ playlistUrl: "/tap-2.m3u8" });

  await expect(prefetchEpisodeLink("movie-1", "tap-2", 0)).resolves.toEqual({
    playlistUrl: "/tap-2.m3u8",
  });
  await expect(getEpisodeLink("movie-1", "tap-2", 0)).resolves.toEqual({
    playlistUrl: "/tap-2.m3u8",
  });

  expect(tmdbApi.episode).toHaveBeenCalledTimes(1);
  expect(tmdbApi.episode).toHaveBeenCalledWith("movie-1", "tap-2", 0);
});
