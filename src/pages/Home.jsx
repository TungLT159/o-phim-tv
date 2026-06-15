import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { OutlineButton } from "../components/button/Button";
import HeroSlide from "../components/hero-slide/HeroSlide";
import MovieList from "../components/movie-list/MovieList";
import RankingSection from "../components/ranking-section/RankingSection";
import ContinueWatchingList from "../components/continue-watching-list/ContinueWatchingList";
import { category, movieType } from "../api/tmdbApi";
import tmdbApi from "../api/tmdbApi";
import { Helmet } from "react-helmet";

export default function Home() {
  const [topRatedMovies, setTopRatedMovies] = useState([]);
  const [topViewedMovies, setTopViewedMovies] = useState([]);

  useEffect(() => {
    const fetchRankingData = async () => {
      try {
        // Fetch phim mới để lấy top rated (sắp xếp theo rating)
        const newMoviesResponse = await tmdbApi.getMoviesList(
          movieType.phimMoi,
          {
            page: 1,
            limit: 30,
          },
        );

        const movies = newMoviesResponse.data?.items || [];

        // Sort by TMDB rating
        const sortedByRating = [...movies]
          .filter((m) => m.tmdb?.vote_average)
          .sort(
            (a, b) => (b.tmdb?.vote_average || 0) - (a.tmdb?.vote_average || 0),
          )
          .slice(0, 10);

        setTopRatedMovies(sortedByRating);
        console.log("✅ Top rated movies:", sortedByRating.length);

        // Sort by views - thử nhiều cách khác nhau
        let sortedByViews = [];

        // Cách 1: Kiểm tra trường view
        const moviesWithViews = movies.filter(
          (m) => m.view || m.views || m.view_count,
        );

        if (moviesWithViews.length > 0) {
          sortedByViews = moviesWithViews
            .sort((a, b) => {
              const viewA = a.view || a.views || a.view_count || 0;
              const viewB = b.view || b.views || b.view_count || 0;
              return viewB - viewA;
            })
            .slice(0, 10);
          console.log(
            "✅ Top viewed movies (by view field):",
            sortedByViews.length,
          );
        } else {
          // Cách 2: Nếu không có view, dùng phim có TMDB popularity cao
          sortedByViews = [...movies]
            .filter((m) => m.tmdb?.popularity)
            .sort(
              (a, b) => (b.tmdb?.popularity || 0) - (a.tmdb?.popularity || 0),
            )
            .slice(0, 10);
          console.log(
            "⚠️ No view data, using TMDB popularity:",
            sortedByViews.length,
          );
        }

        // Cách 3: Fallback cuối cùng - dùng phim mới nhất
        if (sortedByViews.length === 0) {
          sortedByViews = movies.slice(0, 10);
          console.log(
            "⚠️ Using latest movies as fallback:",
            sortedByViews.length,
          );
        }

        setTopViewedMovies(sortedByViews);
      } catch (error) {
        console.error("❌ Error fetching ranking data:", error);
      }
    };

    fetchRankingData();
  }, []);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Ổ Phim",
    url: window.location.origin,
    description:
      "Xem phim online miễn phí chất lượng HD, phim chiếu rạp, phim lẻ, phim bộ, phim hoạt hình mới nhất",
    potentialAction: {
      "@type": "SearchAction",
      target: `${window.location.origin}/movie/search/{search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div>
      <Helmet>
        <title>Ổ Phim - Xem Phim Online Miễn Phí Chất Lượng HD</title>
        <meta
          name="description"
          content="Xem phim online miễn phí chất lượng HD. Cập nhật nhanh nhất các bộ phim chiếu rạp, phim lẻ, phim bộ, phim hoạt hình và phim mới 2026. Xem phim không quảng cáo."
        />
        <meta
          name="keywords"
          content="xem phim online, phim HD, phim chiếu rạp, phim lẻ, phim bộ, phim hoạt hình, phim mới 2026, xem phim miễn phí"
        />
        <link rel="canonical" href={window.location.origin} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="Ổ Phim - Xem Phim Online Miễn Phí Chất Lượng HD"
        />
        <meta
          property="og:description"
          content="Kho phim online miễn phí chất lượng HD - Phim chiếu rạp, phim lẻ, phim bộ, phim hoạt hình và nhiều thể loại khác."
        />
        <meta
          property="og:image"
          content={`${window.location.origin}/poster-mau.png`}
        />
        <meta property="og:url" content={window.location.origin} />
        <meta property="og:site_name" content="Ổ Phim" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Ổ Phim - Xem Phim Online Miễn Phí Chất Lượng HD"
        />
        <meta
          name="twitter:description"
          content="Kho phim online miễn phí chất lượng HD - Phim chiếu rạp, phim lẻ, phim bộ, phim hoạt hình"
        />
        <meta
          name="twitter:image"
          content={`${window.location.origin}/poster-mau.png`}
        />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <HeroSlide />

      {/* Ranking Sections */}
      <div className="container">
        <div className="ranking-sections">
          <RankingSection
            title="Top Phim Đánh Giá Cao"
            movies={topRatedMovies}
            icon="bx bxs-star"
            type="Theo điểm TMDB"
          />

          <RankingSection
            title="Top Phim Xem Nhiều"
            movies={topViewedMovies}
            icon="bx bxs-hot"
            type="Theo lượt xem"
          />

          {/* <RankingSection
            title="Phim Đang Hot"
            movies={popularMovies}
            icon="bx bxs-flame"
            type="Phim chiếu rạp"
          /> */}
        </div>
      </div>

      <ContinueWatchingList />

      <div className="section mb-3">
        <div className="section__header mb-2">
          <h2>Phim chiếu rạp</h2>
          <Link to={`/danh-sach/${movieType.phimChieuRap}`}>
            <OutlineButton>Xem thêm</OutlineButton>
          </Link>
        </div>
        <MovieList category={category.movie} type={movieType.phimChieuRap} />
      </div>

      <div className="section mb-3">
        <div className="section__header mb-2">
          <h2>Phim mới</h2>
          <Link to={`/danh-sach/${movieType.phimMoi}`}>
            <OutlineButton>Xem thêm</OutlineButton>
          </Link>
        </div>
        <MovieList category={category.movie} type={movieType.phimMoi} />
      </div>

      <div className="section mb-3">
        <div className="section__header mb-2">
          <h2>Phim hoạt hình</h2>
          <Link to={`/danh-sach/${movieType.phimHoatHinh}`}>
            <OutlineButton>Xem thêm</OutlineButton>
          </Link>
        </div>
        <MovieList category={category.movie} type={movieType.phimHoatHinh} />
      </div>

      <div className="section mb-3">
        <div className="section__header mb-2">
          <h2>Phim lẻ</h2>
          <Link to={`/danh-sach/${movieType.phimLe}`}>
            <OutlineButton>Xem thêm</OutlineButton>
          </Link>
        </div>
        <MovieList category={category.movie} type={movieType.phimLe} />
      </div>
    </div>
  );
}
