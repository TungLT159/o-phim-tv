import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import App from "./App";

jest.mock("swiper/css", () => ({}), { virtual: true });
jest.mock("swiper/css/bundle", () => ({}), { virtual: true });

jest.mock("./components/header/Header", () => function MockHeader() {
  return <header>Header</header>;
});

jest.mock("./components/footer/Footer", () => function MockFooter() {
  return <footer>Footer</footer>;
});

jest.mock("./config/Routes", () => function MockRoutes() {
  return <main>Routes</main>;
});

jest.mock(
  "./components/update-notification/UpdateNotification",
  () => function MockUpdateNotification() {
    return <aside>Update notification</aside>;
  }
);

test("renders update notification in the app shell", () => {
  render(<App />);

  expect(screen.getByText("Update notification")).toBeInTheDocument();
});
