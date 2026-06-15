import React, { useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import PageHeader from "../components/page-header/PageHeader";
import { Helmet } from "react-helmet";
import MovieGrid from "../components/movie-grid/MovieGrid";

const typeTitles = {
  "phim-chieu-rap": "Phim chiếu rạp",
  "phim-moi": "Phim mới",
  "hoat-hinh": "Phim hoạt hình",
  "phim-le": "Phim lẻ",
  search: "Tìm kiếm phim",
};

const Catalog = () => {
  const { category, keyword } = useParams();
  const { pathname } = useLocation();
  const title = keyword
    ? `Kết quả tìm kiếm cho "${keyword}"`
    : category && typeTitles[category]
      ? typeTitles[category]
      : "Danh sách phim";
  
  useEffect(() => {
    // Scroll to top when component mounts or route changes
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <>
      <Helmet>
        <title>{`${title} | Ổ Phim Online HD`}</title>
        <meta
          name="description"
          content={`Khám phá ${title.toLowerCase()} chất lượng cao, cập nhật liên tục. Xem phim online miễn phí, không quảng cáo tại Ổ Phim.`}
        />
        <meta name="keywords" content={`${title.toLowerCase()}, xem phim online, phim HD, phim miễn phí`} />
        <link rel="canonical" href={window.location.href} />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${title} | Ổ Phim Online HD`} />
        <meta property="og:description" content={`Kho phim: ${title}. Cập nhật nhanh chóng, xem miễn phí chất lượng HD.`} />
        <meta property="og:image" content={`${window.location.origin}/poster-mau.png`} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:site_name" content="Ổ Phim" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${title} | Ổ Phim Online HD`} />
        <meta name="twitter:description" content={`Khám phá ${title.toLowerCase()} chất lượng cao, cập nhật liên tục`} />
        <meta name="twitter:image" content={`${window.location.origin}/poster-mau.png`} />
      </Helmet>
      <PageHeader></PageHeader>
      <div className="container" style={{ maxWidth: "100%" }}>
        <div className="section mb-3">
          <MovieGrid category="Movie" keyword={keyword} />
        </div>
      </div>
    </>
  );
};

export default Catalog;
