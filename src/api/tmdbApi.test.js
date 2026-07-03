import axiosClient from "./axiosClient";
import tmdbApi from "./tmdbApi";

jest.mock("./axiosClient", () => ({
  get: jest.fn(),
}));

const upstreamDetail = {
  data: {
    item: {
      slug: "cuoc-chien-sinh-tu-ii",
      episodes: [
        {
          server_data: [
            {
              name: "1",
              slug: "tap-1",
              link_m3u8: "https://video.example/tap-1.m3u8",
              link_embed: "https://embed.example/tap-1",
            },
          ],
        },
      ],
    },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

test("detail reads movie detail from upstream API", async () => {
  axiosClient.get.mockResolvedValue(upstreamDetail);

  const response = await tmdbApi.detail("movie", "cuoc-chien-sinh-tu-ii", {
    params: {},
  });

  expect(response.data.item.slug).toBe("cuoc-chien-sinh-tu-ii");
  expect(axiosClient.get).toHaveBeenCalledWith(
    "/v1/api/phim/cuoc-chien-sinh-tu-ii",
    { params: {} },
  );
});

test("episode reads playback links from upstream detail", async () => {
  axiosClient.get.mockResolvedValue(upstreamDetail);

  const episode = await tmdbApi.episode("cuoc-chien-sinh-tu-ii", "tap-1", 0);

  expect(episode).toEqual({
    name: "1",
    slug: "tap-1",
    link_m3u8: "https://video.example/tap-1.m3u8",
    link_embed: "https://embed.example/tap-1",
    playlistUrl: null,
  });
  expect(axiosClient.get).toHaveBeenCalledWith(
    "/v1/api/phim/cuoc-chien-sinh-tu-ii",
  );
});
