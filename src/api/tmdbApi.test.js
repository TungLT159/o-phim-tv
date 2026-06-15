import axios from "axios";
import axiosClient from "./axiosClient";
import tmdbApi from "./tmdbApi";

jest.mock("axios");
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

test("detail falls back to upstream when local API returns HTML", async () => {
  axios.get.mockResolvedValue({ data: "<html>index</html>" });
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

test("detail keeps valid local wrapped response", async () => {
  axios.get.mockResolvedValue({ data: upstreamDetail });

  const response = await tmdbApi.detail("movie", "cuoc-chien-sinh-tu-ii", {
    params: {},
  });

  expect(response.data.item.slug).toBe("cuoc-chien-sinh-tu-ii");
  expect(axiosClient.get).not.toHaveBeenCalled();
});

test("detail falls back to upstream when local API response lacks data item", async () => {
  axios.get.mockResolvedValue({ data: { data: {} } });
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

test("episode falls back to upstream detail when local API returns HTML", async () => {
  axios.get.mockResolvedValue({ data: "<html>index</html>" });
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

test("episode falls back to upstream detail when local API shape is invalid", async () => {
  axios.get.mockResolvedValue({ data: { name: "1" } });
  axiosClient.get.mockResolvedValue(upstreamDetail);

  const episode = await tmdbApi.episode("cuoc-chien-sinh-tu-ii", "tap-1", 0);

  expect(episode.playlistUrl).toBeNull();
  expect(episode.link_m3u8).toBe("https://video.example/tap-1.m3u8");
  expect(axiosClient.get).toHaveBeenCalledWith(
    "/v1/api/phim/cuoc-chien-sinh-tu-ii",
  );
});

test("episode keeps valid local API response", async () => {
  const localEpisode = {
    name: "1",
    slug: "tap-1",
    link_m3u8: "https://local.example/tap-1.m3u8",
    link_embed: "https://local.example/tap-1",
    playlistUrl: "https://local.example/tap-1.m3u8",
  };
  axios.get.mockResolvedValue({ data: localEpisode });

  const episode = await tmdbApi.episode("cuoc-chien-sinh-tu-ii", "tap-1", 0);

  expect(episode).toEqual(localEpisode);
  expect(axiosClient.get).not.toHaveBeenCalled();
});
