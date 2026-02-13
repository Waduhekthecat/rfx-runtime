'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Expose the rfx API to the renderer
contextBridge.exposeInMainWorld('rfx', {
    // ==== Basic test ====
    ping: () => ipcRenderer.invoke('ping'),

    // ==== RAW PIPE ====
    
    /** Send raw OSC message to REAPER */
    oscSend: (address, args = []) => ipcRenderer.invoke('osc-send', address, args),
    
    /** Write single-line command to rfx_cmd.txt */
    writeCmd: (line) => ipcRenderer.invoke('write-cmd', line),
    
    /** Pulse /rfx/cmd/runCommand */
    pulseRunCommand: () => ipcRenderer.invoke('pulse-run-command'),
    
    /** Read REAPER snapshot JSON */
    readSnapshot: () => ipcRenderer.invoke('read-snapshot'),
    
    /** Get recent OSC inbound log */
    getOscLog: () => ipcRenderer.invoke('get-osc-log'),
    
    /** Get resolved file paths for cmd + snapshot */
    getPaths: () => ipcRenderer.invoke('get-paths'),

    // ==== HIGH-LEVEL COMMAND API ====
    
    /** Execute a command (orchestrates full workflow) */
    executeCommand: (commandData) => ipcRenderer.invoke('execute-command', commandData),
    
    /** Sync state from Reaper */
    syncState: () => ipcRenderer.invoke('sync-state'),

    // ==== EVENT LISTENERS ====
    
    /** Listen for OSC acknowledgements from Reaper */
    onOscAck: (callback) => {
        const listener = (event, data) => callback(data);
        ipcRenderer.on('osc-ack', listener);
        // Return cleanup function
        return () => ipcRenderer.removeListener('osc-ack', listener);
    },
});
