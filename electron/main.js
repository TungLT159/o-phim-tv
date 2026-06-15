const path = require("path");
const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { startAppServer } = require("../server");
const { createUpdateService } = require("./updateService");
const { createWatchHistoryStore } = require("./watchHistoryStore");

const appIcon = path.join(__dirname, "..", "build", "logo.png");

let mainWindow;
let appServer;
let updateService;
let watchHistoryStore;

function getMainWindow() {
  return mainWindow;
}

function getUpdateService() {
  if (!updateService) {
    updateService = createUpdateService({ app, getWindow: getMainWindow });
  }
  return updateService;
}

function getWatchHistoryStore() {
  if (!watchHistoryStore) {
    watchHistoryStore = createWatchHistoryStore(path.join(app.getPath("userData"), "watch-history.json"));
  }
  return watchHistoryStore;
}

function registerWatchHistoryHandlers() {
  ipcMain.handle("watch-history:read", () => getWatchHistoryStore().read());
  ipcMain.handle("watch-history:write", (_event, history) => getWatchHistoryStore().write(history));
  ipcMain.handle("watch-history:clear", () => getWatchHistoryStore().clear());
}

function getNavigationWindow() {
  return BrowserWindow.getFocusedWindow?.() || mainWindow;
}

function getNavigationState() {
  const window = getNavigationWindow();

  return {
    canGoBack: Boolean(window?.webContents?.canGoBack?.()),
    canGoForward: Boolean(window?.webContents?.canGoForward?.()),
  };
}

function sendNavigationState(window = mainWindow) {
  window?.webContents?.send?.("navigation:state-changed", getNavigationState());
}

function registerNavigationHandlers() {
  ipcMain.handle("navigation:back", () => {
    const window = getNavigationWindow();
    if (window?.webContents?.canGoBack?.()) {
      window.webContents.goBack();
    }
    return getNavigationState();
  });

  ipcMain.handle("navigation:forward", () => {
    const window = getNavigationWindow();
    if (window?.webContents?.canGoForward?.()) {
      window.webContents.goForward();
    }
    return getNavigationState();
  });

  ipcMain.handle("navigation:reload", () => {
    getNavigationWindow()?.webContents?.reload?.();
    return getNavigationState();
  });

  ipcMain.handle("navigation:get-state", () => getNavigationState());
}

function registerUpdateHandlers() {
  ipcMain.handle("updates:check", () => getUpdateService().checkForUpdates());
  ipcMain.handle("updates:download", () => getUpdateService().downloadUpdate());
  ipcMain.handle("updates:install", () => getUpdateService().installUpdate());
  ipcMain.handle("updates:get-state", () => getUpdateService().getState());
}

async function createMainWindow() {
  appServer = await startAppServer({
    port: 0,
    buildDir: path.join(__dirname, "..", "build"),
  });

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: "#000000",
    icon: appIcon,
    title: "O Phim",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents?.on?.("did-navigate", () => sendNavigationState(mainWindow));
  mainWindow.webContents?.on?.("did-navigate-in-page", () => sendNavigationState(mainWindow));
  mainWindow.webContents?.on?.("did-finish-load", () => sendNavigationState(mainWindow));

  await mainWindow.loadURL(appServer.url);
  getUpdateService().checkForUpdates().catch((error) => {
    console.error(error);
  });
}

registerWatchHistoryHandlers();
registerNavigationHandlers();
registerUpdateHandlers();

async function closeAppServer() {
  if (!appServer) return;
  const currentServer = appServer;
  appServer = null;
  await currentServer.close();
}

app.whenReady().then(() => {
  createMainWindow().catch((error) => {
    dialog.showErrorBox("Khong the khoi dong O Phim", error.message);
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow().catch((error) => {
      dialog.showErrorBox("Khong the khoi dong O Phim", error.message);
      app.quit();
    });
  }
});

app.on("before-quit", (event) => {
  if (!appServer) return;
  event.preventDefault();
  closeAppServer()
    .catch((error) => {
      console.error(error);
    })
    .finally(() => {
      app.quit();
    });
});

module.exports = {
  createMainWindow,
  getNavigationState,
  registerNavigationHandlers,
  registerUpdateHandlers,
  registerWatchHistoryHandlers,
};
