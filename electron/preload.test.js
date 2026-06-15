/**
 * @jest-environment node
 */

describe("preload bridges", () => {
  let exposed;
  let ipcRenderer;

  beforeEach(() => {
    jest.resetModules();
    exposed = new Map();
    ipcRenderer = {
      invoke: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      removeListener: jest.fn(),
    };

    jest.doMock("electron", () => ({
      contextBridge: {
        exposeInMainWorld: jest.fn((name, api) => {
          exposed.set(name, api);
        }),
      },
      ipcRenderer,
    }));
  });

  afterEach(() => {
    jest.dontMock("electron");
  });

  test("exposes watch history storage methods through ipc", async () => {
    require("./preload");

    const api = exposed.get("ophimWatchHistoryStorage");

    await api.read();
    await api.write([{ key: "movie-1" }]);
    await api.clear();

    expect(ipcRenderer.invoke).toHaveBeenNthCalledWith(1, "watch-history:read");
    expect(ipcRenderer.invoke).toHaveBeenNthCalledWith(2, "watch-history:write", [{ key: "movie-1" }]);
    expect(ipcRenderer.invoke).toHaveBeenNthCalledWith(3, "watch-history:clear");
  });

  test("exposes navigation controls through ipc", async () => {
    require("./preload");

    const api = exposed.get("ophimNavigation");
    const listener = jest.fn();

    await api.back();
    await api.forward();
    await api.reload();
    await api.getState();
    const unsubscribe = api.onStateChange(listener);

    expect(ipcRenderer.invoke).toHaveBeenNthCalledWith(1, "navigation:back");
    expect(ipcRenderer.invoke).toHaveBeenNthCalledWith(2, "navigation:forward");
    expect(ipcRenderer.invoke).toHaveBeenNthCalledWith(3, "navigation:reload");
    expect(ipcRenderer.invoke).toHaveBeenNthCalledWith(4, "navigation:get-state");
    expect(ipcRenderer.on).toHaveBeenCalledWith("navigation:state-changed", expect.any(Function));

    const wrappedListener = ipcRenderer.on.mock.calls[0][1];
    wrappedListener({}, { canGoBack: true, canGoForward: false });
    expect(listener).toHaveBeenCalledWith({ canGoBack: true, canGoForward: false });

    unsubscribe();
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith("navigation:state-changed", wrappedListener);
  });

  test("exposes update controls through ipc", async () => {
    require("./preload");

    const api = exposed.get("ophimUpdates");
    const listener = jest.fn();

    await api.check();
    await api.download();
    await api.install();
    await api.getState();
    const unsubscribe = api.onStateChange(listener);

    expect(ipcRenderer.invoke).toHaveBeenNthCalledWith(1, "updates:check");
    expect(ipcRenderer.invoke).toHaveBeenNthCalledWith(2, "updates:download");
    expect(ipcRenderer.invoke).toHaveBeenNthCalledWith(3, "updates:install");
    expect(ipcRenderer.invoke).toHaveBeenNthCalledWith(4, "updates:get-state");
    expect(ipcRenderer.on).toHaveBeenCalledWith("updates:state-changed", expect.any(Function));

    const wrappedListener = ipcRenderer.on.mock.calls[0][1];
    wrappedListener({}, { status: "available", version: "0.2.0" });
    expect(listener).toHaveBeenCalledWith({ status: "available", version: "0.2.0" });

    unsubscribe();
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith("updates:state-changed", wrappedListener);
  });
});
