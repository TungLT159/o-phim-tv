import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FocusProvider, useFocus, useFocusable } from "./FocusContext";

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

test("focuses the default hero target when it registers after provider mount", async () => {
  function DelayedHeroButton() {
    const [ready, setReady] = React.useState(false);

    React.useEffect(() => {
      setReady(true);
    }, []);

    if (!ready) return null;

    return <TvButton row={0} col={0}>Xem ngay</TvButton>;
  }

  render(
    <FocusProvider>
      <DelayedHeroButton />
    </FocusProvider>,
  );

  await waitFor(() => expect(screen.getByRole("button", { name: "Xem ngay" })).toHaveFocus());
});

test("focuses the late active target when another element already has DOM focus", async () => {
  function DelayedHeroButton() {
    const [ready, setReady] = React.useState(false);

    React.useEffect(() => {
      screen.getByRole("textbox", { name: "Search" }).focus();
      setReady(true);
    }, []);

    if (!ready) return null;

    return <TvButton row={0} col={0}>Xem ngay</TvButton>;
  }

  render(
    <FocusProvider>
      <input aria-label="Search" />
      <DelayedHeroButton />
    </FocusProvider>,
  );

  await waitFor(() => expect(screen.getByRole("button", { name: "Xem ngay" })).toHaveFocus());
});

test("focuses the active target when its DOM node appears after the hook mounts", async () => {
  function LoadingThenButton() {
    const { ref } = useFocusable(1, 0, 0);
    const [ready, setReady] = React.useState(false);

    React.useEffect(() => {
      screen.getByRole("textbox", { name: "Search" }).focus();
      setReady(true);
    }, []);

    if (!ready) return null;

    return <button ref={ref} type="button">Xem ngay</button>;
  }

  render(
    <FocusProvider>
      <input aria-label="Search" />
      <LoadingThenButton />
    </FocusProvider>,
  );

  await waitFor(() => expect(screen.getByRole("button", { name: "Xem ngay" })).toHaveFocus());
});

test("does not steal focus from text input on active target re-render", async () => {
  function ReRenderingActiveButton() {
    const { ref } = useFocusable(1, 0, 0);
    const [label, setLabel] = React.useState("Xem ngay");

    React.useEffect(() => {
      const timer = setTimeout(() => setLabel("Xem ngay cập nhật"), 0);
      return () => clearTimeout(timer);
    }, []);

    return <button ref={ref} type="button">{label}</button>;
  }

  render(
    <FocusProvider>
      <input aria-label="Search" />
      <ReRenderingActiveButton />
    </FocusProvider>,
  );

  await waitFor(() => expect(screen.getByRole("button", { name: "Xem ngay" })).toHaveFocus());

  const input = screen.getByRole("textbox", { name: "Search" });
  input.focus();

  await screen.findByRole("button", { name: "Xem ngay cập nhật" });

  expect(input).toHaveFocus();
});

test("does not steal focus from player controls on active target re-render", async () => {
  let updateActiveButton;

  function ReRenderingActiveButton() {
    const { ref } = useFocusable(1, 0, 0);
    const [label, setLabel] = React.useState("Xem ngay");

    React.useEffect(() => {
      updateActiveButton = () => setLabel("Xem ngay cập nhật");
      return () => {
        updateActiveButton = undefined;
      };
    }, []);

    return <button ref={ref} type="button">{label}</button>;
  }

  render(
    <FocusProvider>
      <ReRenderingActiveButton />
      <div className="custom-video-player">
        <button type="button">Tua lùi 10 giây</button>
      </div>
    </FocusProvider>,
  );

  await waitFor(() => expect(screen.getByRole("button", { name: "Xem ngay" })).toHaveFocus());

  const playerControl = screen.getByRole("button", { name: "Tua lùi 10 giây" });
  playerControl.focus();

  act(() => {
    updateActiveButton();
  });

  await screen.findByRole("button", { name: "Xem ngay cập nhật" });

  expect(playerControl).toHaveFocus();
});

test("refocuses a previously synced target when navigation returns to it from another row", async () => {
  render(
    <FocusProvider>
      <input aria-label="Search" />
      <PositionedTvButton row={0} col={0} rect={{ left: 500, top: 100, width: 120, height: 50 }}>
        Xem ngay
      </PositionedTvButton>
      <PositionedTvButton row={2} col={0} rect={{ left: 500, top: 500, width: 120, height: 50 }}>
        Phim 1
      </PositionedTvButton>
    </FocusProvider>,
  );

  const heroButton = await screen.findByRole("button", { name: "Xem ngay" });
  await waitFor(() => expect(heroButton).toHaveFocus());

  fireEvent.keyDown(document, { key: "ArrowDown" });
  expect(screen.getByRole("button", { name: "Phim 1" })).toHaveFocus();

  screen.getByRole("textbox", { name: "Search" }).focus();

  fireEvent.keyDown(document, { key: "ArrowUp" });

  await waitFor(() => expect(heroButton).toHaveFocus());
});

test("does not fall back to sidebar while the default hero target is still loading", async () => {
  function PendingHeroTarget() {
    useFocusable(1, 0, 0);
    return null;
  }

  function FocusStateProbe() {
    const { state } = useFocus();
    return <div data-testid="focus-state">{`${state.zone}-${state.row}-${state.col}`}</div>;
  }


  render(
    <FocusProvider>
      <FocusStateProbe />
      <PositionedTvButton zone={0} row={0} col={0} rect={{ left: 0, top: 100, width: 60, height: 52 }}>
        Trang chủ
      </PositionedTvButton>
      <PendingHeroTarget />
    </FocusProvider>,
  );

  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(screen.getByTestId("focus-state")).toHaveTextContent("1-0-0");
  expect(screen.getByRole("button", { name: "Trang chủ" })).not.toHaveFocus();
});

test("does not fall back to sidebar before the default hero target mounts", async () => {
  function FocusStateProbe() {
    const { state } = useFocus();
    return <div data-testid="focus-state">{`${state.zone}-${state.row}-${state.col}`}</div>;
  }

  render(
    <FocusProvider>
      <FocusStateProbe />
      <PositionedTvButton zone={0} row={0} col={0} rect={{ left: 0, top: 100, width: 60, height: 52 }}>
        Trang chủ
      </PositionedTvButton>
    </FocusProvider>,
  );

  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(screen.getByTestId("focus-state")).toHaveTextContent("1-0-0");
  expect(screen.getByRole("button", { name: "Trang chủ" })).not.toHaveFocus();
});

test("does not fall back to continue watching while the default hero target is still loading", async () => {
  function PendingHeroTarget() {
    useFocusable(1, 0, 0);
    return null;
  }

  function FocusStateProbe() {
    const { state } = useFocus();
    return <div data-testid="focus-state">{`${state.zone}-${state.row}-${state.col}`}</div>;
  }

  render(
    <FocusProvider>
      <FocusStateProbe />
      <PositionedTvButton row={1} col={0} rect={{ left: 240, top: 360, width: 160, height: 240 }}>
        Tiếp tục xem
      </PositionedTvButton>
      <PendingHeroTarget />
    </FocusProvider>,
  );

  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(screen.getByTestId("focus-state")).toHaveTextContent("1-0-0");
  expect(screen.getByRole("button", { name: "Tiếp tục xem" })).not.toHaveFocus();
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

test("aligns the top hero row to the start when focus returns from lower rows", async () => {
  render(
    <FocusProvider>
      <PositionedTvButton row={0} col={0} rect={{ left: 500, top: 100, width: 120, height: 50 }}>
        Xem ngay
      </PositionedTvButton>
      <PositionedTvButton row={2} col={0} rect={{ left: 500, top: 500, width: 120, height: 50 }}>
        Phim 1
      </PositionedTvButton>
    </FocusProvider>,
  );

  await waitFor(() => expect(screen.getByRole("button", { name: "Xem ngay" })).toHaveFocus());

  fireEvent.keyDown(document, { key: "ArrowDown" });
  expect(screen.getByRole("button", { name: "Phim 1" })).toHaveFocus();

  window.HTMLElement.prototype.scrollIntoView.mockClear();
  fireEvent.keyDown(document, { key: "ArrowUp" });

  await waitFor(() => expect(screen.getByRole("button", { name: "Xem ngay" })).toHaveFocus());
  expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith(
    expect.objectContaining({ block: "start" }),
  );
});

test("scrolls the top-row section container to the start when focus returns from lower rows", async () => {
  const rootScrollIntoView = jest.fn();
  const buttonScrollIntoView = jest.fn();

  function HeroButton() {
    const { ref } = useFocusable(1, 0, 0);

    return (
      <section data-focus-scroll-root="true" ref={(node) => {
        if (node) node.scrollIntoView = rootScrollIntoView;
      }}>
        <button ref={(node) => {
          ref.current = node;
          if (node) {
            node.scrollIntoView = buttonScrollIntoView;
            node.getBoundingClientRect = jest.fn(() => ({
              left: 500,
              top: 100,
              right: 620,
              bottom: 150,
              width: 120,
              height: 50,
              x: 500,
              y: 100,
              toJSON: () => {},
            }));
          }
        }} type="button">Xem ngay</button>
      </section>
    );
  }

  render(
    <FocusProvider>
      <HeroButton />
      <PositionedTvButton row={2} col={0} rect={{ left: 500, top: 500, width: 120, height: 50 }}>
        Phim 1
      </PositionedTvButton>
    </FocusProvider>,
  );

  await waitFor(() => expect(screen.getByRole("button", { name: "Xem ngay" })).toHaveFocus());

  fireEvent.keyDown(document, { key: "ArrowDown" });
  expect(screen.getByRole("button", { name: "Phim 1" })).toHaveFocus();

  rootScrollIntoView.mockClear();
  buttonScrollIntoView.mockClear();
  fireEvent.keyDown(document, { key: "ArrowUp" });

  await waitFor(() => expect(screen.getByRole("button", { name: "Xem ngay" })).toHaveFocus());
  expect(rootScrollIntoView).toHaveBeenCalledWith(
    expect.objectContaining({ block: "start" }),
  );
  expect(buttonScrollIntoView).not.toHaveBeenCalled();
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

test("restores the last content row when returning from the sidebar", async () => {
  render(
    <FocusProvider>
      <PositionedTvButton zone={0} row={0} col={0} rect={{ left: 0, top: 100, width: 64, height: 50 }}>
        Sidebar Home
      </PositionedTvButton>
      <PositionedTvButton row={0} col={0} rect={{ left: 240, top: 100, width: 120, height: 50 }}>
        Hero
      </PositionedTvButton>
      <PositionedTvButton row={5} col={0} rect={{ left: 240, top: 520, width: 120, height: 50 }}>
        Saved Row Item
      </PositionedTvButton>
    </FocusProvider>,
  );

  await waitFor(() => expect(screen.getByRole("button", { name: "Hero" })).toHaveFocus());

  fireEvent.keyDown(document, { key: "ArrowDown" });
  expect(screen.getByRole("button", { name: "Saved Row Item" })).toHaveFocus();

  fireEvent.keyDown(document, { key: "ArrowLeft" });
  expect(screen.getByRole("button", { name: "Sidebar Home" })).toHaveFocus();

  fireEvent.keyDown(document, { key: "ArrowRight" });

  expect(screen.getByRole("button", { name: "Saved Row Item" })).toHaveFocus();
});
