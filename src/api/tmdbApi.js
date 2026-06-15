import axiosClient from "./axiosClient";
import axios from "axios";

export const category = {
  movie: "movie",
  tv: "tv",
};

export const movieType = {
  phimChieuRap: "phim-chieu-rap",
  phimMoi: "phim-moi",
  phimHoatHinh: "hoat-hinh",
  phimLe: "phim-le",
  phimBo: "phim-bo",
};

export const tvType = {
  popular: "popular",
  top_rated: "top_rated",
  on_the_air: "on_the_air",
};

const hasDetailItem = (response) => Boolean(response?.data?.item);

const hasEpisodeShape = (episode) => (
  episode &&
  typeof episode === "object" &&
  !Array.isArray(episode) &&
  ("link_m3u8" in episode || "link_embed" in episode || "playlistUrl" in episode)
);

const getEpisodeFromUpstream = async (id, episodeName, episodeGroupIndex) => {
  const response = await axiosClient.get("/v1/api/phim/" + id);
  const serverGroups = response.data?.item?.episodes || [];
  const hasGroupIndex = episodeGroupIndex !== null && episodeGroupIndex !== undefined && episodeGroupIndex !== "";
  const server = hasGroupIndex && Number.isInteger(Number(episodeGroupIndex))
    ? serverGroups[Number(episodeGroupIndex)]
    : null;
  const episodes = server
    ? server.server_data || []
    : serverGroups.flatMap((group) => group.server_data || []);
  const episode = episodes.find(
    (ep) => ep.name === episodeName || ep.slug === episodeName,
  );

  return {
    name: episode?.name,
    slug: episode?.slug,
    link_m3u8: episode?.link_m3u8 || null,
    link_embed: episode?.link_embed || null,
    playlistUrl: null,
  };
};

const tmdbApi = {
  getMoviesList: (type, params = {}) => {
    const url = `/v1/api/danh-sach/${type}`;
    return axiosClient.get(url, { params });
  },

  getListByType: (type, params) => {
    const url = "/v1/api/the-loai/" + type;
    return axiosClient.get(url, { params });
  },
  getListByCountry: (type, params) => {
    const url = "/v1/api/quoc-gia/" + type;
    return axiosClient.get(url, { params });
  },
  getVideos: (cate, id) => {
    // const url = category[cate] + '/' + id + '/videos';
    // return axiosClient.get(url, {params: {}});
    const url = "/v1/api/phim/" + id;
    return axiosClient.get(url);
  },
  getImage: (cate, id) => {
    const url = `/v1/api/phim/${id}/images`;
    return axiosClient.get(url);
  },
  search: (cate, params) => {
    const url = `/v1/api/tim-kiem`;
    return axiosClient.get(url, { params }); // ✅ bọc vào { params }
  },
  detail: (cate, id, params) => {
    const url = "/api/phim/" + id;
    return axios.get(url, params)
      .then((response) => {
        if (hasDetailItem(response.data)) return response.data;
        return axiosClient.get("/v1/api/phim/" + id, params);
      })
      .catch(() => axiosClient.get("/v1/api/phim/" + id, params));
  },
  episode: (id, episodeName, episodeGroupIndex) => {
    const url = "/api/phim/" + id + "/episode";
    return axios
      .get(url, { params: { name: episodeName, group: episodeGroupIndex } })
      .then((response) => {
        if (hasEpisodeShape(response.data)) return response.data;
        return getEpisodeFromUpstream(id, episodeName, episodeGroupIndex);
      })
      .catch(() => getEpisodeFromUpstream(id, episodeName, episodeGroupIndex));
  },
  credits: (cate, id) => {
    const url = `/v1/api/phim/${id}/peoples`;
    return axiosClient.get(url, { params: {} });
  },
  similar: (cate, id) => {
    const url = category[cate] + "/" + id + "/similar";
    return axiosClient.get(url, { params: {} });
  },
};

export default tmdbApi;
