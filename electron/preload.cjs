'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Expose the electronAPI to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
    invokeCommand: (command, ...args) => ipcRenderer.invoke(command, ...args),
    onCmdAck: (callback) => ipcRenderer.on('command-ack', (event, ...args) => callback(...args)),
});
