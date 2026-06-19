import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
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

test("initializes focus to the first registered TV item when the default row is absent", async () => {
  render(
    <FocusProvider>
      <TvButton row={1} col={0}>Phát</TvButton>
      <TvButton row={110} col={0}>Tập 1</TvButton>
    </FocusProvider>,
  );

  expect(await screen.findByRole("button", { name: "Phát" })).toHaveFocus();
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

  expect(await screen.findByRole("button", { name: "Phát" })).toHaveFocus();

  fireEvent.keyDown(document, { key: "ArrowDown" });
  expect(screen.getByRole("button", { name: "Tập 1" })).toHaveFocus();

  fireEvent.keyDown(document, { key: "ArrowRight" });
  expect(screen.getByRole("button", { name: "Tập 2" })).toHaveFocus();

  fireEvent.keyDown(document, { key: "Enter" });
  expect(selectEpisode).toHaveBeenCalledWith("2");
});
