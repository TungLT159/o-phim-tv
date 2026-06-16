import React, { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

const Home = lazy(() => import("../pages/Home"));
const Catalog = lazy(() => import("../pages/Catalog"));
const TvDetail = lazy(() => import("../pages/detail/TvDetail"));
const TvSearch = lazy(() => import("../pages/TvSearch"));

function MovieRoute() {
  return <TvDetail />;
}

// Loading fallback component
const PageLoader = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '1.5rem',
    color: '#fff'
  }}>
    <div>Đang tải…</div>
  </div>
);

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tim-kiem" element={<TvSearch />} />
        <Route path="/:category/search/:keyword" element={<Catalog />} />
        <Route path="/movie/:id" element={<MovieRoute />} />
        <Route path="/:category/:type" element={<Catalog />} />
        
        {/* fallback route */}
        {/* <Route path="*" element={<Navigate to="/" replace />} /> */}
      </Routes>
    </Suspense>
  );
}
