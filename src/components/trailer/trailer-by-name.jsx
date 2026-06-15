import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";

function TrailerByName({ movieName }) {
  const [trailerUrl, setTrailerUrl] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function fetchTrailer() {
      try {
        // 1. Tìm phim theo tên
        const searchData = await axiosClient.get(
          `https://api.themoviedb.org/3/search/movie?api_key=${process.env.REACT_APP_TMDB_API_KEY}&query=${encodeURIComponent(
            movieName,
          )}&language=en-US`,
        );

        if (isCancelled || searchData.results.length === 0) return;

        // Lấy id của phim đầu tiên
        const movieId = searchData.results[0].id;

        // 2. Lấy video (trailer) của phim đó
        const videosData = await axiosClient.get(
          `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${process.env.REACT_APP_TMDB_API_KEY}&language=en-US`,
        );

        const trailer = videosData.results.find(
          (vid) => vid.type === "Trailer" && vid.site === "YouTube",
        );

        if (trailer && !isCancelled) {
          setTrailerUrl(`https://www.youtube.com/embed/${trailer.key}`);
        }
      } catch (error) {
        console.error("Lỗi khi lấy trailer:", error);
      }
    }

    fetchTrailer();
    return () => {
      isCancelled = true;
    };
  }, [movieName]);

  return trailerUrl ? (
    <iframe
      width="560"
      height="315"
      src={trailerUrl.replace("watch?v=", "embed/")}
      title={`Trailer ${movieName}`}
      frameBorder="0"
      allowFullScreen
    />
  ) : (
    <p>Không tìm thấy trailer cho {movieName}</p>
  );
}

export default TrailerByName;
