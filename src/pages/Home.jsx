import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import tmdbApi, { movieType } from "../api/tmdbApi";
import ContinueWatchingList from "../components/continue-watching-list/ContinueWatchingList";
import ContentRow from "../components/content-row/ContentRow";
import TvHero from "../components/tv-hero/TvHero";

const TV_ROWS = [
  { title: "Phim mới cập nhật", type: movieType.phimMoi },
  { title: "Phim bộ", type: movieType.phimBo },
  { title: "Phim chiếu rạp", type: movieType.phimChieuRap },
  { title: "Phim lẻ", type: movieType.phimLe },
  { title: "Hoạt hình", type: movieType.phimHoatHinh },
  { title: "TV Shows", type: "tv-shows" },
  { title: "Phim Vietsub", type: "phim-vietsub" },
  { title: "Phim Thuyết minh", type: "phim-thuyet-minh" },
  { title: "Phim bộ đang chiếu", type: "phim-bo-dang-chieu" },
  { title: "Phim bộ hoàn thành", type: "phim-bo-hoan-thanh" },
  { title: "Phim sắp chiếu", type: "phim-sap-chieu" },
];

const COUNTRY_ROWS = [
  { title: "Phim Việt Nam", type: "viet-nam" },
  { title: "Phim Hàn Quốc", type: "han-quoc" },
  { title: "Phim Âu Mỹ", type: "au-my" },
  { title: "Phim Nhật Bản", type: "nhat-ban" },
  { title: "Phim Trung Quốc", type: "trung-quoc" },
];

const GENRE_ROWS = [
  { title: "Hành Động", type: "hanh-dong" },
  { title: "Tình Cảm", type: "tinh-cam" },
  { title: "Hài Hước", type: "hai-huoc" },
  { title: "Kinh Dị", type: "kinh-di" },
  { title: "Viễn Tưởng", type: "vien-tuong" },
  { title: "Võ Thuật", type: "vo-thuat" },
];

const TV_CONTINUE_WATCHING_ROW = 1;
const TV_CONTENT_ROW_START = 2;

export default function Home() {
  const [heroMovies, setHeroMovies] = useState([]);
  const [rows, setRows] = useState({});

  useEffect(() => {
    const tvPromises = TV_ROWS.map((r) =>
      tmdbApi
        .getMoviesList(r.type, { page: 1, limit: 15 })
        .catch(() => ({ data: { items: [] } })),
    );
    const countryPromises = COUNTRY_ROWS.map((r) =>
      tmdbApi
        .getListByCountry(r.type, { page: 1, limit: 15 })
        .catch(() => ({ data: { items: [] } })),
    );
    const genrePromises = GENRE_ROWS.map((r) =>
      tmdbApi
        .getListByType(r.type, { page: 1, limit: 15 })
        .catch(() => ({ data: { items: [] } })),
    );

    Promise.all([...tvPromises, ...countryPromises, ...genrePromises])
      .then((results) => {
        const map = {};
        const all = results[0].data?.items || [];

        setHeroMovies(all.slice(0, 6));

        [...TV_ROWS, ...COUNTRY_ROWS, ...GENRE_ROWS].forEach((r, i) => {
          map[r.type] = results[i].data?.items || [];
        });
        setRows(map);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="tv-home">
      <Helmet>
        <title>Ổ Phim - TV</title>
      </Helmet>

      <TvHero items={heroMovies} />

      <ContinueWatchingList tvFocusable row={TV_CONTINUE_WATCHING_ROW} />

      {TV_ROWS.map((row, idx) => (
        <ContentRow
          key={row.type}
          title={row.title}
          items={rows[row.type] || []}
          rowId={row.type}
          row={idx + TV_CONTENT_ROW_START}
        />
      ))}
      {COUNTRY_ROWS.map((row, idx) => (
        <ContentRow
          key={row.type}
          title={row.title}
          items={rows[row.type] || []}
          rowId={row.type}
          row={TV_ROWS.length + idx + TV_CONTENT_ROW_START}
        />
      ))}
      {GENRE_ROWS.map((row, idx) => (
        <ContentRow
          key={row.type}
          title={row.title}
          items={rows[row.type] || []}
          rowId={row.type}
          row={
            TV_ROWS.length + COUNTRY_ROWS.length + idx + TV_CONTENT_ROW_START
          }
        />
      ))}
    </div>
  );
}
