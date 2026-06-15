const apiConfig = {
  baseUrl: "https://ophim1.com/",
  apiKey: process.env.REACT_APP_TMDB_API_KEY,
  originalImage: (imgPath) =>
    `https://img.ophim.live/uploads/movies/${imgPath}`,
  w500Image: (imgPath) => `https://image.tmdb.org/t/p/w500/${imgPath}`,
};

export default apiConfig;
