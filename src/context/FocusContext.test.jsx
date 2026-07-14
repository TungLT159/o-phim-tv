import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  destroy,
  init,
  setFocus,
  useFocusable as useNoriginFocusable,
} from "@noriginmedia/norigin-spatial-navigation";
import { FocusProvider, useFocus, useFocusable } from "./FocusContext";

jest.mock("../tauri-bridge", () => ({
  isTauri: () => true,
}));

jest.mock("@noriginmedia/norigin-spatial-navigation", () => {
  const React = require("react");
  const registry = new Map();

  const setFocus = jest.fn((focusKey) => {
    registry.get(focusKey)?.focus?.();
    return Promise.resolve();
  });

  return {
    __esModule: true,
    destroy: jest.fn(() => registry.clear()),
    doesFocusableExist: jest.fn((focusKey) => registry.has(focusKey)),
    getCurrentFocusKey: jest.fn(() => "TV_1_0_0"),
    init: jest.fn(),
    setFocus,
    useFocusable: jest.fn(({ focusKey } = {}) => {
      const ref = React.useRef(null);

      React.useEffect(() => {
        if (!focusKey || !ref.current) return undefined;
        registry.set(focusKey, ref.current);
        return () => registry.delete(focusKey);
      });

      return {
        ref,
        focused: false,
        hasFocusedChild: false,
        focusKey,
        focusSelf: () => setFocus(focusKey),
      };
    }),
  };
});

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
});

function TvButton({ row, col, children, onClick = jest.fn() }) {
  const { ref } = useFocusable(1, row, col);
  return (
    <button ref={ref} type="button" onClick={onClick}>
      {children}
    </button>
  );
}

test("sets DOM focus on the first registered Norigin-compatible target", async () => {
  render(
    <FocusProvider>
      <TvButton row={0} col={0}>Xem ngay</TvButton>
    </FocusProvider>,
  );

  await waitFor(() => expect(screen.getByRole("button", { name: "Xem ngay" })).toHaveFocus());
});

test("initializes Norigin once with DOM focus enabled", () => {
  const { rerender } = render(
    <FocusProvider>
      <TvButton row={0} col={0}>Xem ngay</TvButton>
    </FocusProvider>,
  );

  rerender(
    <FocusProvider>
      <TvButton row={0} col={0}>Xem ngay</TvButton>
      <TvButton row={1} col={0}>Tiếp tục xem</TvButton>
    </FocusProvider>,
  );

  expect(init).toHaveBeenCalledTimes(1);
  expect(init).toHaveBeenCalledWith(expect.objectContaining({ shouldFocusDOMNode: true }));
});

test("maps legacy grid coordinates to stable Norigin focus keys", () => {
  render(
    <FocusProvider>
      <TvButton row={2} col={3}>Phim</TvButton>
    </FocusProvider>,
  );

  expect(useNoriginFocusable).toHaveBeenCalledWith(expect.objectContaining({ focusKey: "TV_1_2_3" }));
});

test("legacy useFocusable returns its own coordinates", () => {
  function CoordinateProbe() {
    const { ref, zone, row, col } = useFocusable(1, 2, 3);
    return <button ref={ref} type="button">{`${zone}-${row}-${col}`}</button>;
  }

  render(
    <FocusProvider>
      <CoordinateProbe />
      <TvButton row={0} col={0}>Xem ngay</TvButton>
    </FocusProvider>,
  );

  expect(screen.getByRole("button", { name: "1-2-3" })).toBeInTheDocument();
});

test("skipToZone does not sync state when target focusable is missing", () => {
  function SkipProbe() {
    const { state, skipToZone } = useFocus();
    return (
      <button type="button" onClick={() => skipToZone(9, 9, 9)}>
        {`${state.zone}-${state.row}-${state.col}`}
      </button>
    );
  }

  render(
    <FocusProvider>
      <TvButton row={0} col={0}>Xem ngay</TvButton>
      <SkipProbe />
    </FocusProvider>,
  );

  setFocus.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "1-0-0" }));

  expect(setFocus).not.toHaveBeenCalledWith("TV_9_9_9");
  expect(screen.getByRole("button", { name: "1-0-0" })).toBeInTheDocument();
});

test("does not navigate back for Backspace or Escape from a focused text input", () => {
  const historyBackSpy = jest.spyOn(window.history, "back").mockImplementation(() => {});

  render(
    <FocusProvider>
      <input aria-label="Search" />
    </FocusProvider>,
  );

  const input = screen.getByRole("textbox", { name: "Search" });
  input.focus();

  fireEvent.keyDown(window, { key: "Backspace" });
  fireEvent.keyDown(window, { key: "Escape" });

  expect(input).toHaveFocus();
  expect(historyBackSpy).not.toHaveBeenCalled();

  historyBackSpy.mockRestore();
});

test("does not navigate back for Backspace or Escape from player controls", () => {
  const historyBackSpy = jest.spyOn(window.history, "back").mockImplementation(() => {});

  render(
    <FocusProvider>
      <div className="custom-video-player">
        <button type="button">Tua lùi 10 giây</button>
      </div>
    </FocusProvider>,
  );

  const playerControl = screen.getByRole("button", { name: "Tua lùi 10 giây" });
  playerControl.focus();

  fireEvent.keyDown(window, { key: "Backspace" });
  fireEvent.keyDown(window, { key: "Escape" });

  expect(playerControl).toHaveFocus();
  expect(historyBackSpy).not.toHaveBeenCalled();

  historyBackSpy.mockRestore();
});

test("destroys Norigin between tests only in test mode", () => {
  const { unmount } = render(
    <FocusProvider>
      <TvButton row={0} col={0}>Xem ngay</TvButton>
    </FocusProvider>,
  );

  unmount();

  expect(destroy).toHaveBeenCalledTimes(1);
});
