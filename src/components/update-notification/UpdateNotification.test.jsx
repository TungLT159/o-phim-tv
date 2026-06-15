import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import UpdateNotification from "./UpdateNotification";

jest.mock('../../tauri-bridge', () => ({
  updatesBridge: {
    check: jest.fn(),
    download: jest.fn(),
    install: jest.fn(),
    getState: jest.fn().mockResolvedValue({ status: 'idle' }),
    onStateChange: jest.fn(() => jest.fn()),
  },
  isTauri: jest.fn(() => false),
  watchHistoryBridge: {},
  navigationBridge: {},
  apiBridge: {},
}));

afterEach(() => {
  delete window.ophimUpdates;
});

test("does not render outside Electron", () => {
  render(<UpdateNotification />);

  expect(screen.queryByText(/cập nhật/i)).not.toBeInTheDocument();
});

test("shows available update and starts download", async () => {
  window.ophimUpdates = {
    check: jest.fn(),
    download: jest.fn(),
    install: jest.fn(),
    getState: jest.fn().mockResolvedValue({ status: "available", version: "0.2.0" }),
    onStateChange: jest.fn(() => jest.fn()),
  };

  render(<UpdateNotification />);

  expect(await screen.findByText(/có bản cập nhật mới/i)).toBeInTheDocument();
  expect(screen.getByText(/0.2.0/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /tải cập nhật/i }));

  expect(window.ophimUpdates.download).toHaveBeenCalledTimes(1);
});

test("shows downloaded update and installs on request", async () => {
  let stateListener;
  window.ophimUpdates = {
    check: jest.fn(),
    download: jest.fn(),
    install: jest.fn(),
    getState: jest.fn().mockResolvedValue({ status: "idle" }),
    onStateChange: jest.fn((listener) => {
      stateListener = listener;
      return jest.fn();
    }),
  };

  render(<UpdateNotification />);

  act(() => {
    stateListener({ status: "downloaded", version: "0.2.0" });
  });

  await waitFor(() => {
    expect(screen.getByText(/sẵn sàng cài đặt/i)).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: /khởi động lại/i }));

  expect(window.ophimUpdates.install).toHaveBeenCalledTimes(1);
});
