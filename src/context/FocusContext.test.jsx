import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FocusProvider, useFocusable } from "./FocusContext";

jest.mock("../tauri-bridge", () => ({
  isTauri: () => true,
}));

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

function TvButton({ row, col, children, onClick = jest.fn() }) {
  const { ref } = useFocusable(1, row, col);
  return (
    <button ref={ref} type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function PositionedTvButton({ zone = 1, row, col, rect, children }) {
  const { ref } = useFocusable(zone, row, col);

  React.useEffect(() => {
    if (!ref.current) return;
    ref.current.getBoundingClientRect = jest.fn(() => ({
      left: rect.left,
      top: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      width: rect.width,
      height: rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => {},
    }));
  }, [rect, ref]);

  return (
    <button ref={ref} type="button">
      {children}
    </button>
  );
}

test("initializes focus to the first registered TV item when the default row is absent", async () => {
  render(
    <FocusProvider>
      <TvButton row={1} col={0}>Phát</TvButton>
      <TvButton row={110} col={0}>Tập 1</TvButton>
    </FocusProvider>,
  );

  await waitFor(() => expect(screen.getByRole("button", { name: "Phát" })).toHaveFocus());
});

test("moves from detail play button into episode rows and activates selected episode", async () => {
  const selectEpisode = jest.fn();
  render(
    <FocusProvider>
      <TvButton row={1} col={0}>Phát</TvButton>
      <TvButton row={110} col={0} onClick={() => selectEpisode("1")}>Tập 1</TvButton>
      <TvButton row={110} col={1} onClick={() => selectEpisode("2")}>Tập 2</TvButton>
    </FocusProvider>,
  );

  await waitFor(() => expect(screen.getByRole("button", { name: "Phát" })).toHaveFocus());

  fireEvent.keyDown(document, { key: "ArrowDown" });
  expect(screen.getByRole("button", { name: "Tập 1" })).toHaveFocus();

  fireEvent.keyDown(document, { key: "ArrowRight" });
  expect(screen.getByRole("button", { name: "Tập 2" })).toHaveFocus();

  fireEvent.keyDown(document, { key: "Enter" });
  expect(selectEpisode).toHaveBeenCalledWith("2");
});

test("remote arrows follow the nearest real UI position instead of only row and column numbers", async () => {
  render(
    <FocusProvider>
      <PositionedTvButton row={0} col={0} rect={{ left: 500, top: 100, width: 120, height: 50 }}>
        Phát
      </PositionedTvButton>
      <PositionedTvButton row={10} col={0} rect={{ left: 80, top: 240, width: 100, height: 50 }}>
        Tập 1
      </PositionedTvButton>
      <PositionedTvButton row={10} col={1} rect={{ left: 500, top: 240, width: 100, height: 50 }}>
        Tập 2
      </PositionedTvButton>
    </FocusProvider>,
  );

  await waitFor(() => expect(screen.getByRole("button", { name: "Phát" })).toHaveFocus());

  fireEvent.keyDown(document, { key: "ArrowDown" });

  expect(screen.getByRole("button", { name: "Tập 2" })).toHaveFocus();
});

test("horizontal navigation stays in the current UI row before considering lower rows", async () => {
  render(
    <FocusProvider>
      <PositionedTvButton row={1} col={0} rect={{ left: 80, top: 100, width: 100, height: 50 }}>
        Row 1 Item 1
      </PositionedTvButton>
      <PositionedTvButton row={1} col={1} rect={{ left: 900, top: 100, width: 100, height: 50 }}>
        Row 1 Item 2
      </PositionedTvButton>
      <PositionedTvButton row={2} col={0} rect={{ left: 140, top: 240, width: 100, height: 50 }}>
        Row 2 Item 1
      </PositionedTvButton>
    </FocusProvider>,
  );

  await waitFor(() => expect(screen.getByRole("button", { name: "Row 1 Item 1" })).toHaveFocus());

  fireEvent.keyDown(document, { key: "ArrowRight" });

  expect(screen.getByRole("button", { name: "Row 1 Item 2" })).toHaveFocus();
});

test("horizontal navigation follows the visual row when logical grid rows are stale", async () => {
  render(
    <FocusProvider>
      <PositionedTvButton row={1} col={0} rect={{ left: 80, top: 100, width: 100, height: 50 }}>
        Visual Row Item 1
      </PositionedTvButton>
      <PositionedTvButton row={2} col={0} rect={{ left: 240, top: 100, width: 100, height: 50 }}>
        Visual Row Item 2
      </PositionedTvButton>
      <PositionedTvButton row={1} col={1} rect={{ left: 80, top: 240, width: 100, height: 50 }}>
        Lower Row Item
      </PositionedTvButton>
    </FocusProvider>,
  );

  await waitFor(() => expect(screen.getByRole("button", { name: "Visual Row Item 1" })).toHaveFocus());

  fireEvent.keyDown(document, { key: "ArrowRight" });

  expect(screen.getByRole("button", { name: "Visual Row Item 2" })).toHaveFocus();
});
