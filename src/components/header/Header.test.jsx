import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Header from "./Header";

jest.mock("../../assets/logo.png", () => "logo.png");

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
  delete window.ophimNavigation;
});

test("does not render desktop navigation controls outside Electron", () => {
  renderHeader();

  expect(screen.queryByLabelText("Quay lại")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Tiến tới")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Tải lại")).not.toBeInTheDocument();
});

test("renders Electron navigation controls and calls bridge actions", async () => {
  const unsubscribe = jest.fn();
  window.ophimNavigation = {
    back: jest.fn(),
    forward: jest.fn(),
    reload: jest.fn(),
    getState: jest.fn().mockResolvedValue({ canGoBack: true, canGoForward: false }),
    onStateChange: jest.fn(() => unsubscribe),
  };

  renderHeader();

  const backButton = await screen.findByLabelText("Quay lại");
  const forwardButton = screen.getByLabelText("Tiến tới");
  const reloadButton = screen.getByLabelText("Tải lại");

  expect(backButton).toBeEnabled();
  expect(forwardButton).toBeDisabled();

  fireEvent.click(backButton);
  fireEvent.click(forwardButton);
  fireEvent.click(reloadButton);

  expect(window.ophimNavigation.back).toHaveBeenCalledTimes(1);
  expect(window.ophimNavigation.forward).not.toHaveBeenCalled();
  expect(window.ophimNavigation.reload).toHaveBeenCalledTimes(1);
  expect(window.ophimNavigation.onStateChange).toHaveBeenCalledWith(expect.any(Function));
});

test("updates Electron navigation button state from bridge events", async () => {
  let stateListener;
  window.ophimNavigation = {
    back: jest.fn(),
    forward: jest.fn(),
    reload: jest.fn(),
    getState: jest.fn().mockResolvedValue({ canGoBack: false, canGoForward: false }),
    onStateChange: jest.fn((listener) => {
      stateListener = listener;
      return jest.fn();
    }),
  };

  renderHeader();

  const backButton = await screen.findByLabelText("Quay lại");
  const forwardButton = screen.getByLabelText("Tiến tới");

  expect(backButton).toBeDisabled();
  expect(forwardButton).toBeDisabled();

  act(() => {
    stateListener({ canGoBack: true, canGoForward: true });
  });

  await waitFor(() => {
    expect(backButton).toBeEnabled();
    expect(forwardButton).toBeEnabled();
  });
});
