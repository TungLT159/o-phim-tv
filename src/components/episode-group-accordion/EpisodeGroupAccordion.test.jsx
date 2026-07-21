import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import EpisodeGroupAccordion from "./EpisodeGroupAccordion";
import { FocusProvider, useFocusable } from "../../context/FocusContext";

jest.mock("../../tauri-bridge", () => ({
  isTauri: () => true,
}));

jest.mock("@noriginmedia/norigin-spatial-navigation", () => {
  const React = require("react");
  const registry = new Map();
  const configs = new Map();
  let currentFocusKey = null;

  const setFocus = jest.fn((focusKey) => {
    currentFocusKey = focusKey;
    registry.get(focusKey)?.focus?.();
    return Promise.resolve();
  });

  const handleKeyDown = (event) => {
    const directions = {
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
    };
    const direction = directions[event.key];
    if (!direction || !currentFocusKey) return;
    configs.get(currentFocusKey)?.onArrowPress?.(direction);
  };

  return {
    __esModule: true,
    destroy: jest.fn(() => {
      registry.clear();
      configs.clear();
      currentFocusKey = null;
      globalThis.window?.removeEventListener("keydown", handleKeyDown);
      globalThis.document?.removeEventListener("keydown", handleKeyDown);
    }),
    doesFocusableExist: jest.fn((focusKey) => registry.has(focusKey)),
    getCurrentFocusKey: jest.fn(() => currentFocusKey),
    init: jest.fn(() => {
      globalThis.window?.addEventListener("keydown", handleKeyDown);
      globalThis.document?.addEventListener("keydown", handleKeyDown);
    }),
    setFocus,
    useFocusable: jest.fn((config = {}) => {
      const ref = React.useRef(null);
      const { focusKey } = config;

      React.useEffect(() => {
        if (!focusKey || !ref.current) return undefined;
        const element = ref.current;
        const handleFocus = () => {
          currentFocusKey = focusKey;
        };
        registry.set(focusKey, element);
        configs.set(focusKey, config);
        element.addEventListener("focus", handleFocus);
        return () => {
          element.removeEventListener("focus", handleFocus);
          registry.delete(focusKey);
          configs.delete(focusKey);
        };
      });

      return {
        ref,
        focused: currentFocusKey === focusKey,
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

function TestEpisode({ episode, row, col, zone, focusKey, onArrowPress }) {
  const { ref } = useFocusable({
    focusKey: focusKey || `TV_${zone}_${row}_${col}`,
    onArrowPress,
  });
  return (
    <button
      ref={ref}
      type="button"
      data-focus-key={focusKey || `TV_${zone}_${row}_${col}`}
      onKeyDown={(event) => {
        const directionByKey = {
          ArrowDown: "down",
          ArrowLeft: "left",
          ArrowRight: "right",
          ArrowUp: "up",
        };
        const direction = directionByKey[event.key];
        if (!direction) return;
        event.preventDefault();
        onArrowPress?.(direction);
      }}
    >
      {episode.name}
    </button>
  );
}

const groups = [
  { title: "Phần 1", episodes: [{ name: "Tập 1" }, { name: "Tập 2" }] },
  { title: "Phần 2", episodes: [{ name: "Tập 3" }] },
];

test("remote Enter toggles the focused episode group exactly once", async () => {
  render(
    <FocusProvider>
      <EpisodeGroupAccordion
        groups={groups}
        currentEpisode={null}
        zone={1}
        baseRow={0}
        columns={2}
        renderEpisode={(episode, row, col) => (
          <TestEpisode key={episode.name} episode={episode} row={row} col={col} zone={1} />
        )}
      />
    </FocusProvider>,
  );

  await waitFor(() => expect(screen.getByRole("button", { name: /Phần 1/ })).toHaveFocus());

  fireEvent.keyDown(screen.getByRole("button", { name: /Phần 1/ }), { key: "Enter" });

  expect(screen.getByRole("button", { name: "Tập 1" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Phần 1/ })).toHaveAttribute("aria-expanded", "true");
});

test("ArrowDown from an open group header focuses the first visible episode", async () => {
  render(
    <FocusProvider>
      <EpisodeGroupAccordion
        groups={groups}
        currentEpisode={null}
        zone={1}
        baseRow={0}
        columns={2}
        renderEpisode={(episode, row, col, meta) => (
          <TestEpisode key={episode.name} episode={episode} row={row} col={col} zone={1} {...meta} />
        )}
      />
    </FocusProvider>,
  );

  const header = await screen.findByRole("button", { name: /Phần 1/ });
  fireEvent.click(header);
  act(() => {
    header.focus();
  });

  fireEvent.keyDown(header, { key: "ArrowDown" });

  await waitFor(() => expect(screen.getByRole("button", { name: "Tập 1" })).toHaveFocus());
});

test("episode arrows follow the rendered detail grid columns", async () => {
  const gridGroups = [
    {
      title: "Phần 1",
      episodes: [
        { name: "Tập 1" },
        { name: "Tập 2" },
        { name: "Tập 3" },
        { name: "Tập 4" },
        { name: "Tập 5" },
      ],
    },
  ];

  render(
    <FocusProvider>
      <EpisodeGroupAccordion
        groups={gridGroups}
        currentEpisode={null}
        zone={1}
        baseRow={10}
        columns={4}
        renderEpisode={(episode, row, col, meta) => (
          <TestEpisode key={episode.name} episode={episode} row={row} col={col} zone={1} {...meta} />
        )}
      />
    </FocusProvider>,
  );

  fireEvent.click(await screen.findByRole("button", { name: /Phần 1/ }));
  const episodeOne = screen.getByRole("button", { name: "Tập 1" });
  act(() => {
    episodeOne.focus();
  });

  fireEvent.keyDown(episodeOne, { key: "ArrowRight" });
  await waitFor(() => expect(screen.getByRole("button", { name: "Tập 2" })).toHaveFocus());

  act(() => {
    episodeOne.focus();
  });
  fireEvent.keyDown(episodeOne, { key: "ArrowDown" });
  await waitFor(() => expect(screen.getByRole("button", { name: "Tập 5" })).toHaveFocus());
});

test("episode arrows stay on the current item when the rendered grid has no target", async () => {
  const gridGroups = [
    {
      title: "Phần 1",
      episodes: [
        { name: "Tập 1" },
        { name: "Tập 2" },
        { name: "Tập 3" },
        { name: "Tập 4" },
        { name: "Tập 5" },
      ],
    },
  ];

  render(
    <FocusProvider>
      <EpisodeGroupAccordion
        groups={gridGroups}
        currentEpisode={null}
        zone={1}
        baseRow={10}
        columns={4}
        renderEpisode={(episode, row, col, meta) => (
          <TestEpisode key={episode.name} episode={episode} row={row} col={col} zone={1} {...meta} />
        )}
      />
    </FocusProvider>,
  );

  fireEvent.click(await screen.findByRole("button", { name: /Phần 1/ }));
  const episodeFive = screen.getByRole("button", { name: "Tập 5" });
  act(() => {
    episodeFive.focus();
  });

  fireEvent.keyDown(episodeFive, { key: "ArrowRight" });
  expect(episodeFive).toHaveFocus();

  fireEvent.keyDown(episodeFive, { key: "ArrowDown" });
  expect(episodeFive).toHaveFocus();
});

test("ArrowDown from the bottom episode row focuses the next group header when present", async () => {
  render(
    <FocusProvider>
      <EpisodeGroupAccordion
        groups={groups}
        currentEpisode={null}
        zone={1}
        baseRow={0}
        columns={2}
        renderEpisode={(episode, row, col, meta) => (
          <TestEpisode key={episode.name} episode={episode} row={row} col={col} zone={1} {...meta} />
        )}
      />
    </FocusProvider>,
  );

  fireEvent.click(await screen.findByRole("button", { name: /Phần 1/ }));
  const episodeTwo = screen.getByRole("button", { name: "Tập 2" });
  act(() => {
    episodeTwo.focus();
  });

  fireEvent.keyDown(episodeTwo, { key: "ArrowDown" });

  await waitFor(() => expect(screen.getByRole("button", { name: /Phần 2/ })).toHaveFocus());
});

test("episode horizontal arrows do not wrap across rendered grid rows", async () => {
  const gridGroups = [
    {
      title: "Phần 1",
      episodes: [
        { name: "Tập 1" },
        { name: "Tập 2" },
        { name: "Tập 3" },
        { name: "Tập 4" },
        { name: "Tập 5" },
      ],
    },
  ];

  render(
    <FocusProvider>
      <EpisodeGroupAccordion
        groups={gridGroups}
        currentEpisode={null}
        zone={1}
        baseRow={10}
        columns={4}
        renderEpisode={(episode, row, col, meta) => (
          <TestEpisode key={episode.name} episode={episode} row={row} col={col} zone={1} {...meta} />
        )}
      />
    </FocusProvider>,
  );

  fireEvent.click(await screen.findByRole("button", { name: /Phần 1/ }));
  const episodeFour = screen.getByRole("button", { name: "Tập 4" });
  const episodeFive = screen.getByRole("button", { name: "Tập 5" });

  act(() => {
    episodeFour.focus();
  });
  fireEvent.keyDown(episodeFour, { key: "ArrowRight" });
  expect(episodeFour).toHaveFocus();

  act(() => {
    episodeFive.focus();
  });
  fireEvent.keyDown(episodeFive, { key: "ArrowLeft" });
  expect(episodeFive).toHaveFocus();
});
