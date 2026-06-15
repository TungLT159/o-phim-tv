import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { OutlineButton } from "../components/button/Button";
import HeroSlide from "../components/hero-slide/HeroSlide";
import MovieList from "../components/movie-list/MovieList";
import RankingSection from "../components/ranking-section/RankingSection";
import ContinueWatchingList from "../components/continue-watching-list/ContinueWatchingList";
import ContentRow from "../components/content-row/ContentRow";
import TvHero from "../components/tv-hero/TvHero";
import { category, movieType } from "../api/tmdbApi";
import tmdbApi from "../api/tmdbApi";
import { Helmet } from "react-helmet";
import { isTauri } from "../tauri-bridge";

function TvHome() {
  const [heroMovies, setHeroMovies] = useState([]);
  const [newMovies, setNewMovies] = useState([]);
  const [seriesMovies, setSeriesMovies] = useState([]);
  const [singleMovies, setSingleMovies] = useState([]);
  const [cartoonMovies, setCartoonMovies] = useState([]);
  const [theaterMovies, setTheaterMovies] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [res1, res2, res3, res4, res5] = await Promise.all([
          tmdbApi.getMoviesList(movieType.phimMoi, { page: 1, limit: 15 }),
          tmdbApi.getMoviesList(movieType.phimBo, { page: 1, limit: 15 }),
          tmdbApi.getMoviesList(movieType.phimLe, { page: 1, limit: 15 }),
          tmdbApi.getMoviesList(movieType.phimHoatHinh, { page: 1, limit: 15 }),
          tmdbApi.getMoviesList(movieType.phimChieuRap, { page: 1, limit: 15 }),
        ]);

        const newItems = res1.data?.items || [];
        setHeroMovies(newItems.slice(0, 6));
        setNewMovies(newItems);
        setSeriesMovies(res2.data?.items || []);
        setSingleMovies(res3.data?.items || []);
        setCartoonMovies(res4.data?.items || []);
        setTheaterMovies(res5.data?.items || []);
      } catch (e) {
        console.error("TV home fetch error:", e);
      }
    };
    fetchAll();
  }, []);

  return (
    <div className="tv-home">
      <Helmet>
        <title>O Phim - TV</title>
      </Helmet>

      <TvHero items={heroMovies} />

      <ContentRow title="Phim mới cập nhật" items={newMovies} rowId="new" />
      <ContentRow title="Phim bộ" items={seriesMovies} rowId="series" />
      <ContentRow title="Phim chiếu rạp" items={theaterMovies} rowId="theater" />
      <ContentRow title="Phim lẻ" items={singleMovies} rowId="single" />
      <ContentRow title="Hoạt hình" items={cartoonMovies} rowId="cartoon" />
    </div>
  );
}

export default function Home() {
  const isTv = isTauri();

  const [topRatedMovies, setTopRatedMovies] = useState([]);
  const [topViewedMovies, setTopViewedMovies] = useState([]);

  useEffect(() => {
    if (isTv) return;
    const fetchRankingData = async () => {
      try {
        const res = await tmdbApi.getMoviesList(movieType.phimMoi, { page: 1, limit: 30 });
        const movies = res.data?.items || [];

        const rated = [...movies]
          .filter((m) => m.tmdb?.vote_average)
          .sort((a, b) => (b.tmdb?.vote_average || 0) - (a.tmdb?.vote_average || 0))
          .slice(0, 10);
        setTopRatedMovies(rated);

        let viewed = movies
          .filter((m) => m.view || m.views || m.view_count)
          .sort((a, b) => (b.view || b.views || b.view_count || 0) - (a.view || a.views || a.view_count || 0))
          .slice(0, 10);

        if (!viewed.length) {
          viewed = [...movies]
            .filter((m) => m.tmdb?.popularity)
            .sort((a, b) => (b.tmdb?.popularity || 0) - (a.tmdb?.popularity || 0))
            .slice(0, 10);
        }
        if (!viewed.length) viewed = movies.slice(0, 10);
        setTopViewedMovies(viewed);
      } catch (e) { console.error(e); }
    };
    fetchRankingData();
  }, [isTv]);

  if (isTv) return <TvHome />;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Ổ Phim",
    url: window.location.origin,
    description: "Xem phim online miễn phí chất lượng HD",
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
        <meta name="description" content="Xem phim online miễn phí chất lượng HD" />
        <meta name="keywords" content="xem phim online, phim HD" />
        <link rel="canonical" href={window.location.origin} />
        <meta property="og:title" content="Ổ Phim" />
        <meta property="og:description" content="Kho phim online miễn phí" />
        <meta property="og:image" content={`${window.location.origin}/poster-mau.png`} />
        <meta property="og:url" content={window.location.origin} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <HeroSlide />

      <div className="container">
        <div className="ranking-sections">
          <RankingSection title="Top Phim Đánh Giá Cao" movies={topRatedMovies} icon="bx bxs-star" type="Theo điểm TMDB" />
          <RankingSection title="Top Phim Xem Nhiều" movies={topViewedMovies} icon="bx bxs-hot" type="Theo lượt xem" />
        </div>
      </div>

      <ContinueWatchingList />

      <div className="section mb-3">
        <div className="section__header mb-2">
          <h2>Phim chiếu rạp</h2>
          <Link to={`/danh-sach/${movieType.phimChieuRap}`}><OutlineButton>Xem thêm</OutlineButton></Link>
        </div>
        <MovieList category={category.movie} type={movieType.phimChieuRap} />
      </div>

      <div className="section mb-3">
        <div className="section__header mb-2">
          <h2>Phim mới</h2>
          <Link to={`/danh-sach/${movieType.phimMoi}`}><OutlineButton>Xem thêm</OutlineButton></Link>
        </div>
        <MovieList category={category.movie} type={movieType.phimMoi} />
      </div>

      <div className="section mb-3">
        <div className="section__header mb-2">
          <h2>Phim hoạt hình</h2>
          <Link to={`/danh-sach/${movieType.phimHoatHinh}`}><OutlineButton>Xem thêm</OutlineButton></Link>
        </div>
        <MovieList category={category.movie} type={movieType.phimHoatHinh} />
      </div>

      <div className="section mb-3">
        <div className="section__header mb-2">
          <h2>Phim lẻ</h2>
          <Link to={`/danh-sach/${movieType.phimLe}`}><OutlineButton>Xem thêm</OutlineButton></Link>
        </div>
        <MovieList category={category.movie} type={movieType.phimLe} />
      </div>
    </div>
  );
}
