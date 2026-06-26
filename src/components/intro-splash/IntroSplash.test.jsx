import React from "react";
import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";
import IntroSplash from "./IntroSplash";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test("shows the branded intro before rendering children", () => {
  render(
    <IntroSplash>
      <main>Home content</main>
    </IntroSplash>,
  );

  const logo = screen.getByRole("img", { name: /o phim/i });

  expect(logo).toHaveAttribute("src", "/logo512.png");
  expect(screen.queryByText("Home content")).not.toBeInTheDocument();
});

test("starts fading after the intro duration", () => {
  render(
    <IntroSplash duration={1800} fadeDuration={250}>
      <main>Home content</main>
    </IntroSplash>,
  );

  act(() => {
    jest.advanceTimersByTime(1800);
  });

  expect(screen.getByTestId("intro-splash")).toHaveClass("intro-splash--leaving");
  expect(screen.queryByText("Home content")).not.toBeInTheDocument();
});

test("renders children after the intro and fade durations finish", () => {
  render(
    <IntroSplash duration={1800} fadeDuration={250}>
      <main>Home content</main>
    </IntroSplash>,
  );

  act(() => {
    jest.advanceTimersByTime(2050);
  });

  expect(screen.queryByTestId("intro-splash")).not.toBeInTheDocument();
  expect(screen.getByText("Home content")).toBeInTheDocument();
});

test("keeps wrapped content unavailable until the intro is done", () => {
  render(
    <IntroSplash duration={10} fadeDuration={5}>
      <button>Focusable TV item</button>
    </IntroSplash>,
  );

  expect(screen.queryByRole("button", { name: /focusable tv item/i })).not.toBeInTheDocument();

  act(() => {
    jest.advanceTimersByTime(15);
  });

  expect(screen.getByRole("button", { name: /focusable tv item/i })).toBeInTheDocument();
});
