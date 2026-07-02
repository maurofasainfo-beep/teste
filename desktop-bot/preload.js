const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("queueBot", {
  getState: () => ipcRenderer.invoke("bot:get-state"),
  saveConfig: (config) => ipcRenderer.invoke("bot:save-config", config),
  clearConfig: () => ipcRenderer.invoke("bot:clear-config"),
  testConnection: () => ipcRenderer.invoke("bot:test-connection"),
  startBot: () => ipcRenderer.invoke("bot:start"),
  stopBot: () => ipcRenderer.invoke("bot:stop"),
  restartBot: () => ipcRenderer.invoke("bot:restart"),
  resetState: () => ipcRenderer.invoke("bot:reset-state"),
  openWhatsApp: () => ipcRenderer.invoke("bot:open-whatsapp"),
  refreshWhatsAppStatus: () => ipcRenderer.invoke("bot:refresh-whatsapp-status"),
  setAutoStart: (autoStart) => ipcRenderer.invoke("bot:set-auto-start", autoStart),
  onStateUpdated: (callback) => {
    const listener = (_event, snapshot) => callback(snapshot);
    ipcRenderer.on("bot:state-updated", listener);
    return () => ipcRenderer.removeListener("bot:state-updated", listener);
  },
});
