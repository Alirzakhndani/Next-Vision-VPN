const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nextVisionVpn", {
  connect: (server, settings) => ipcRenderer.invoke("vpn:connect", server, settings),
  disconnect: () => ipcRenderer.invoke("vpn:disconnect"),
  status: () => ipcRenderer.invoke("vpn:status"),
  platform: process.platform,
});
