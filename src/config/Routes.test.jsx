import React from "react";
import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import AppRoutes from "./Routes";

jest.mock("../pages/Home", () => () => <div data-testid="home-page" />);
jest.mock("../pages/TvSearch", () => () => <div data-testid="tv-search-page" />);
jest.mock("../pages/detail/TvDetail", () => () => <div data-testid="tv-detail-page" />);

const renderRoute = async (route) => {
  render(
    <MemoryRouter initialEntries={[route]}>
      <AppRoutes />
    </MemoryRouter>
  );

  await act(async () => {});
};

test("renders the TV home route", async () => {
  await renderRoute("/");

  expect(screen.getByTestId("home-page")).toBeInTheDocument();
});

test("renders the TV search route", async () => {
  await renderRoute("/tim-kiem");

  expect(screen.getByTestId("tv-search-page")).toBeInTheDocument();
});

test("renders the TV detail route", async () => {
  await renderRoute("/movie/test-movie");

  expect(screen.getByTestId("tv-detail-page")).toBeInTheDocument();
});

test("does not render a page for removed legacy catalog routes", async () => {
  const originalWarn = console.warn;
  const warnSpy = jest.spyOn(console, "warn").mockImplementation((...args) => {
    if (String(args[0] || "").includes("No routes matched location")) {
      return;
    }

    originalWarn(...args);
  });

  try {
    await renderRoute("/danh-sach/phim-moi");
  } finally {
    warnSpy.mockRestore();
  }

  expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
  expect(screen.queryByTestId("tv-search-page")).not.toBeInTheDocument();
  expect(screen.queryByTestId("tv-detail-page")).not.toBeInTheDocument();
});
