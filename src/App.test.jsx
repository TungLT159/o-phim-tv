import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import App from "./App";

jest.mock("swiper/css", () => ({}), { virtual: true });
jest.mock("swiper/css/bundle", () => ({}), { virtual: true });

jest.mock("./components/header/TvSidebar", () => () => (
  <aside data-testid="tv-sidebar" />
));

jest.mock("./components/intro-splash/IntroSplash", () => ({ children }) => (
  <div data-testid="intro-splash">{children}</div>
));

jest.mock("./config/Routes", () => () => <main data-testid="tv-routes" />);

jest.mock("./tauri-bridge", () => ({
  isTauri: () => false,
}));

test("renders the TV shell for the root app", () => {
  const { container } = render(<App />);

  expect(screen.getByTestId("intro-splash")).toBeInTheDocument();
  expect(screen.getByTestId("tv-sidebar")).toBeInTheDocument();
  expect(screen.getByTestId("tv-routes")).toBeInTheDocument();
  expect(container.querySelector(".tv-layout")).toBeInTheDocument();
});
