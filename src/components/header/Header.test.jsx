import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Header from "./Header";

jest.mock("../../assets/logo.png", () => "logo.png");

jest.mock('../../tauri-bridge', () => ({
  navigationBridge: {
    back: () => undefined,
    forward: () => undefined,
    reload: () => undefined,
    getState: jest.fn(() => Promise.resolve({ canGoBack: true, canGoForward: false })),
    onStateChange: () => () => undefined,
  },
  isTauri: () => false,
  watchHistoryBridge: {},
  updatesBridge: {},
  apiBridge: {},
}));

beforeEach(() => {
  const { navigationBridge } = require('../../tauri-bridge');
  jest.spyOn(navigationBridge, 'back').mockReturnValue();
  jest.spyOn(navigationBridge, 'forward').mockReturnValue();
  jest.spyOn(navigationBridge, 'reload').mockReturnValue();
  jest.spyOn(navigationBridge, 'getState').mockReturnValue(Promise.resolve({ canGoBack: true, canGoForward: false }));
  jest.spyOn(navigationBridge, 'onStateChange').mockReturnValue(() => undefined);
});

jest.mock("./useHeaderSearch", () => () => ({
  keyword: "",
  suggestions: [],
  showSuggestions: false,
  isSearching: false,
  suggestionPosition: { top: 0, left: 0, width: 0 },
  searchRef: { current: null },
  handleSearchChange: jest.fn(),
  handleSearchFocus: jest.fn(),
  goToSearch: jest.fn((event) => event?.preventDefault?.()),
  handleSuggestionClick: jest.fn(),
  handleTouchStart: jest.fn(),
  handleTouchEnd: jest.fn(),
}));

const renderHeader = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Header />
    </MemoryRouter>,
  );

afterEach(() => {
  jest.restoreAllMocks();
});

test("renders desktop navigation controls via bridge", async () => {
  renderHeader();

  expect(await screen.findByLabelText("Quay lại")).toBeInTheDocument();
  expect(screen.getByLabelText("Tiến tới")).toBeInTheDocument();
  expect(screen.getByLabelText("Tải lại")).toBeInTheDocument();
});

test("calls bridge navigation methods on click", async () => {
  const { navigationBridge } = require('../../tauri-bridge');

  renderHeader();

  const backButton = await screen.findByLabelText("Quay lại");
  const forwardButton = screen.getByLabelText("Tiến tới");
  const reloadButton = screen.getByLabelText("Tải lại");

  expect(backButton).toBeEnabled();
  expect(forwardButton).toBeDisabled();

  fireEvent.click(backButton);
  fireEvent.click(forwardButton);
  fireEvent.click(reloadButton);

  expect(navigationBridge.back).toHaveBeenCalledTimes(1);
  expect(navigationBridge.forward).not.toHaveBeenCalled();
  expect(navigationBridge.reload).toHaveBeenCalledTimes(1);
  expect(navigationBridge.onStateChange).toHaveBeenCalledWith(expect.any(Function));
});

test("updates navigation button state from bridge events", async () => {
  const { navigationBridge } = require('../../tauri-bridge');

  navigationBridge.getState
    .mockReturnValueOnce(Promise.resolve({ canGoBack: false, canGoForward: false }))
    .mockReturnValue(Promise.resolve({ canGoBack: false, canGoForward: false }));

  renderHeader();

  const backButton = await screen.findByLabelText("Quay lại");
  const forwardButton = screen.getByLabelText("Tiến tới");

  expect(backButton).toBeDisabled();
  expect(forwardButton).toBeDisabled();

  const listener = navigationBridge.onStateChange.mock.calls[0][0];

  act(() => {
    listener({ canGoBack: true, canGoForward: true });
  });

  await waitFor(() => {
    expect(backButton).toBeEnabled();
    expect(forwardButton).toBeEnabled();
  });
});
