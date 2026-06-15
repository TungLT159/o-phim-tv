import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import axiosClient from "../../api/axiosClient";
import MovieCard from "../movie-card/MovieCard";
import "./similar-movies.scss";

const SimilarMovies = ({ movie }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const getSimilarMovies = async () => {
      if (!movie) return;

      setLoading(true);
      let allMovies = [];
      const seenIds = new Set([movie._id]); // Loại bỏ phim hiện tại

      try {
        // 1. Ưu tiên 1: Tìm theo tên phim (phần 1, 2, 3...)
        if (movie.name) {
          const baseName = movie.name
            .replace(/\s*\(.*?\)\s*/g, "") // Loại bỏ (2024), (Season 1)...
            .replace(/\s*-\s*Phần\s*\d+/gi, "") // Loại bỏ "- Phần 1"
            .replace(/\s*Season\s*\d+/gi, "") // Loại bỏ "Season 1"
            .replace(/\s*Tập\s*\d+/gi, "") // Loại bỏ "Tập 1"
            .trim();

          try {
            const nameResponse = await axiosClient.get(
              `/v1/api/tim-kiem?keyword=${encodeURIComponent(baseName)}&limit=10`,
            );

            if (nameResponse.data?.items) {
              nameResponse.data.items.forEach((item) => {
                if (!seenIds.has(item._id)) {
                  allMovies.push({ ...item, priority: 1 });
                  seenIds.add(item._id);
                }
              });
            }
          } catch (error) {
            console.log("Không tìm thấy phim theo tên:", error);
          }
        }

        // 2. Ưu tiên 2: Phim liên quan (nếu API hỗ trợ)
        // Ophim API không có endpoint này, skip

        // 3. Ưu tiên 3: Tìm theo từ khóa
        if (movie.name && allMovies.length < 20) {
          const keywords = movie.name
            .split(/[\s\-:]+/)
            .filter((word) => word.length > 3)
            .slice(0, 3); // Lấy 3 từ khóa đầu

          const keywordResults = await Promise.all(
            keywords.map(async (keyword) => {
              try {
                const keywordResponse = await axiosClient.get(
                  `/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=8`,
                );

                return keywordResponse.data?.items || [];
              } catch (error) {
                console.log(
                  `Không tìm thấy phim theo từ khóa "${keyword}":`,
                  error,
                );
                return [];
              }
            }),
          );

          keywordResults.forEach((items) => {
            items.forEach((item) => {
              if (!seenIds.has(item._id) && allMovies.length < 20) {
                allMovies.push({ ...item, priority: 3 });
                seenIds.add(item._id);
              }
            });
          });
        }

        // 4. Ưu tiên 4: Tìm theo thể loại
        if (
          movie.category &&
          movie.category.length > 0 &&
          allMovies.length < 20
        ) {
          // Lấy tối đa 3 thể loại đầu tiên
          const categories = movie.category.slice(0, 3);

          const categoryResults = await Promise.all(
            categories.map(async (cat) => {
              try {
                const categoryResponse = await axiosClient.get(
                  `/v1/api/the-loai/${cat.slug}?page=1&limit=12`,
                );

                return categoryResponse.data?.items || [];
              } catch (error) {
                console.log(
                  `Không tìm thấy phim theo thể loại "${cat.name}":`,
                  error,
                );
                return [];
              }
            }),
          );

          categoryResults.forEach((items) => {
            items.forEach((item) => {
              if (!seenIds.has(item._id) && allMovies.length < 20) {
                allMovies.push({ ...item, priority: 4 });
                seenIds.add(item._id);
              }
            });
          });
        }

        // 5. Sắp xếp theo độ ưu tiên và điểm đánh giá
        allMovies.sort((a, b) => {
          // Ưu tiên theo priority trước
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          // Sau đó theo rating
          const ratingA = a.tmdb?.vote_average || 0;
          const ratingB = b.tmdb?.vote_average || 0;
          return ratingB - ratingA;
        });

        // Lấy tối đa 20 phim
        if (isCancelled) return;
        setItems(allMovies.slice(0, 20));
      } catch (error) {
        if (isCancelled) return;
        console.error("Lỗi khi lấy phim tương tự:", error);
      } finally {
        if (isCancelled) return;
        setLoading(false);
      }
    };

    getSimilarMovies();

    return () => {
      isCancelled = true;
    };
  }, [movie]);

  if (loading) {
    return (
      <div className="similar-movies-loading">
        <i className="bx bx-loader-alt bx-spin"></i>
        <p>Đang tải phim tương tự...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="similar-movies-empty">
        <i className="bx bx-movie"></i>
        <p>Không tìm thấy phim tương tự</p>
      </div>
    );
  }

  return (
    <div className="similar-movies">
      <Swiper
        modules={[Autoplay]}
        grabCursor={true}
        spaceBetween={10}
        slidesPerView={"auto"}
        autoplay={{ delay: 4000 }}
      >
        {items.map((item) => (
          <SwiperSlide key={item._id ?? item.slug}>
            <MovieCard item={item} category={item.category?.[0]?.slug} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

SimilarMovies.propTypes = {
  movie: PropTypes.object.isRequired,
};

export default SimilarMovies;
