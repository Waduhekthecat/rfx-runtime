const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("rfx", {
  oscSend: (address, args) => ipcRenderer.invoke("rfx:oscSend", { address, args }),
  writeCmd: (line) => ipcRenderer.invoke("rfx:writeCmd", { line }),
  pulseRunCommand: () => ipcRenderer.invoke("rfx:pulseRunCommand"),
  readSnapshot: () => ipcRenderer.invoke("rfx:readSnapshot"),
  getOscLog: () => ipcRenderer.invoke("rfx:getOscLog"),
  getPaths: () => ipcRenderer.invoke("rfx:getPaths"),
});
