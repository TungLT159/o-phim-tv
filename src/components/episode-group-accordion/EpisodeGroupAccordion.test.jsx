import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EpisodeGroupAccordion from "./EpisodeGroupAccordion";
import { FocusProvider, useFocusable } from "../../context/FocusContext";

jest.mock("../../tauri-bridge", () => ({
  isTauri: () => true,
}));

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

function TestEpisode({ episode, row, col, zone }) {
  const { ref } = useFocusable(zone, row, col);
  return (
    <button ref={ref} type="button">
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
