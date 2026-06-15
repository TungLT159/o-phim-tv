/**
 * @jest-environment node
 */

const path = require("path");

describe("Electron main watch history integration", () => {
  let app;
  let BrowserWindow;
  let ipcMain;
  let registeredHandlers;
  let createdWindowOptions;
  let webContents;

  beforeEach(() => {
    jest.resetModules();
    registeredHandlers = new Map();
    createdWindowOptions = undefined;
    webContents = {
      canGoBack: jest.fn(() => false),
      canGoForward: jest.fn(() => false),
      goBack: jest.fn(),
      goForward: jest.fn(),
      reload: jest.fn(),
      send: jest.fn(),
      on: jest.fn(),
    };

    app = {
      getPath: jest.fn(() => "C:\\Users\\test\\AppData\\Roaming\\OPhim"),
      whenReady: jest.fn(() => ({ then: jest.fn() })),
      on: jest.fn(),
      quit: jest.fn(),
    };
    BrowserWindow = jest.fn((options) => {
      createdWindowOptions = options;
      return {
        loadURL: jest.fn(),
        on: jest.fn(),
        setMenuBarVisibility: jest.fn(),
        webContents,
      };
    });
    BrowserWindow.getAllWindows = jest.fn(() => []);
    BrowserWindow.getFocusedWindow = jest.fn(() => null);
    ipcMain = {
      handle: jest.fn((channel, handler) => {
        registeredHandlers.set(channel, handler);
      }),
    };

    jest.doMock("electron", () => ({
      app,
      BrowserWindow,
      dialog: { showErrorBox: jest.fn() },
      ipcMain,
    }));
    jest.doMock("../server", () => ({
      startAppServer: jest.fn().mockResolvedValue({ url: "http://localhost:3000", close: jest.fn() }),
    }));
    jest.doMock("./updateService", () => ({
      createUpdateService: jest.fn(() => ({
        checkForUpdates: jest.fn().mockResolvedValue({ status: "idle" }),
        downloadUpdate: jest.fn(),
        installUpdate: jest.fn(),
        getState: jest.fn(() => ({ status: "idle" })),
        wireAutoUpdaterEvents: jest.fn(),
      })),
    }));
  });

  afterEach(() => {
    jest.dontMock("electron");
    jest.dontMock("../server");
    jest.dontMock("./updateService");
  });

  test("registers watch history ipc handlers", () => {
    require("./main");

    expect(ipcMain.handle).toHaveBeenCalledWith("watch-history:read", expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith("watch-history:write", expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith("watch-history:clear", expect.any(Function));
    expect(registeredHandlers.has("watch-history:read")).toBe(true);
    expect(registeredHandlers.has("watch-history:write")).toBe(true);
    expect(registeredHandlers.has("watch-history:clear")).toBe(true);
  });

  test("registers navigation ipc handlers", () => {
    require("./main");

    expect(ipcMain.handle).toHaveBeenCalledWith("navigation:back", expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith("navigation:forward", expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith("navigation:reload", expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith("navigation:get-state", expect.any(Function));
    expect(registeredHandlers.has("navigation:back")).toBe(true);
    expect(registeredHandlers.has("navigation:forward")).toBe(true);
    expect(registeredHandlers.has("navigation:reload")).toBe(true);
    expect(registeredHandlers.has("navigation:get-state")).toBe(true);
  });

  test("registers update ipc handlers", () => {
    require("./main");

    expect(ipcMain.handle).toHaveBeenCalledWith("updates:check", expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith("updates:download", expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith("updates:install", expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith("updates:get-state", expect.any(Function));
    expect(registeredHandlers.has("updates:check")).toBe(true);
    expect(registeredHandlers.has("updates:download")).toBe(true);
    expect(registeredHandlers.has("updates:install")).toBe(true);
    expect(registeredHandlers.has("updates:get-state")).toBe(true);
  });

  test("creates BrowserWindow with preload and secure webPreferences", async () => {
    const { createMainWindow } = require("./main");

    await createMainWindow();

    expect(createdWindowOptions.webPreferences).toEqual({
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    });
  });

  test("hides the default Electron menu bar", async () => {
    const { createMainWindow } = require("./main");

    await createMainWindow();
    const window = BrowserWindow.mock.results[0].value;

    expect(createdWindowOptions.autoHideMenuBar).toBe(true);
    expect(window.setMenuBarVisibility).toHaveBeenCalledWith(false);
  });

  test("navigation handlers gate back and forward and return state", async () => {
    const { createMainWindow } = require("./main");

    await createMainWindow();
    webContents.canGoBack.mockReturnValue(true);
    webContents.canGoForward.mockReturnValue(false);

    expect(registeredHandlers.get("navigation:back")()).toEqual({
      canGoBack: true,
      canGoForward: false,
    });
    await registeredHandlers.get("navigation:forward")();

    expect(webContents.goBack).toHaveBeenCalledTimes(1);
    expect(webContents.goForward).not.toHaveBeenCalled();
  });

  test("navigation handlers reload and expose current state", async () => {
    const { createMainWindow } = require("./main");

    await createMainWindow();
    webContents.canGoBack.mockReturnValue(true);
    webContents.canGoForward.mockReturnValue(true);

    expect(registeredHandlers.get("navigation:reload")()).toEqual({
      canGoBack: true,
      canGoForward: true,
    });
    expect(registeredHandlers.get("navigation:get-state")()).toEqual({
      canGoBack: true,
      canGoForward: true,
    });

    expect(webContents.reload).toHaveBeenCalledTimes(1);
  });
});
