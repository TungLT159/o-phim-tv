const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ophimWatchHistoryStorage", {
  read: () => ipcRenderer.invoke("watch-history:read"),
  write: (history) => ipcRenderer.invoke("watch-history:write", history),
  clear: () => ipcRenderer.invoke("watch-history:clear"),
});

contextBridge.exposeInMainWorld("ophimNavigation", {
  back: () => ipcRenderer.invoke("navigation:back"),
  forward: () => ipcRenderer.invoke("navigation:forward"),
  reload: () => ipcRenderer.invoke("navigation:reload"),
  getState: () => ipcRenderer.invoke("navigation:get-state"),
  onStateChange: (listener) => {
    const wrappedListener = (_event, state) => listener(state);
    ipcRenderer.on("navigation:state-changed", wrappedListener);
    return () => ipcRenderer.removeListener("navigation:state-changed", wrappedListener);
  },
});

contextBridge.exposeInMainWorld("ophimUpdates", {
  check: () => ipcRenderer.invoke("updates:check"),
  download: () => ipcRenderer.invoke("updates:download"),
  install: () => ipcRenderer.invoke("updates:install"),
  getState: () => ipcRenderer.invoke("updates:get-state"),
  onStateChange: (listener) => {
    const wrappedListener = (_event, state) => listener(state);
    ipcRenderer.on("updates:state-changed", wrappedListener);
    return () => ipcRenderer.removeListener("updates:state-changed", wrappedListener);
  },
});
