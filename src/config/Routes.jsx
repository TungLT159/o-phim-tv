import React, { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

const Home = lazy(() => import("../pages/Home"));
const TvDetail = lazy(() => import("../pages/detail/TvDetail"));
const TvSearch = lazy(() => import("../pages/TvSearch"));

const PageLoader = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      fontSize: "1.5rem",
      color: "#fff",
    }}
  >
    <div>Đang tải...</div>
  </div>
);

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tim-kiem" element={<TvSearch />} />
        <Route path="/movie/:id" element={<TvDetail />} />
      </Routes>
    </Suspense>
  );
}
