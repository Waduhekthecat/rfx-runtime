'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const boot = require('./core/boot.cjs');
const oscRouter = require('./osc/oscRouter.cjs');
const fsManager = require('./file_system/index.cjs');

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    // Load the appropriate URL based on environment
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Initialize subsystems after window is ready
    mainWindow.webContents.on('did-finish-load', () => {
        boot.initialize(mainWindow);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ===== IPC HANDLERS =====

/**
 * Ping test handler
 */
ipcMain.handle('ping', async () => {
    return { ok: true, ts: Date.now() };
});

/**
 * Send raw OSC message to Reaper
 */
ipcMain.handle('osc-send', async (event, address, args = []) => {
    return await oscRouter.sendMessage(address, args);
});

/**
 * Write command to rfx_cmd.txt
 */
ipcMain.handle('write-cmd', async (event, line) => {
    return await fsManager.writeCmd(line);
});

/**
 * Pulse /rfx/cmd/runCommand
 */
ipcMain.handle('pulse-run-command', async () => {
    return await oscRouter.sendMessage('/rfx/cmd/runCommand', []);
});

/**
 * Read Reaper state snapshot
 */
ipcMain.handle('read-snapshot', async () => {
    return await fsManager.readSnapshot();
});

/**
 * Get OSC log
 */
ipcMain.handle('get-osc-log', async () => {
    return oscRouter.getOscLog();
});

/**
 * Get file paths
 */
ipcMain.handle('get-paths', async () => {
    return fsManager.getPaths();
});

/**
 * Execute a command (high-level API)
 * This orchestrates the full workflow: write args -> send OSC -> wait for ack
 */
ipcMain.handle('execute-command', async (event, commandData) => {
    const { id, name, type, params, oscAddress } = commandData;
    
    console.log(`\n[SYSCALL] [${type}] ${name} ${JSON.stringify(params)}`);
    
    try {
        // Step 1: Write command parameters to rfx_cmd.txt if there are params
        if (params && Object.keys(params).length > 0) {
            const cmdLine = JSON.stringify(params);
            const writeResult = await fsManager.writeCmd(cmdLine);
            if (!writeResult.ok) {
                console.error(`[SYSCALL] Failed to write command: ${writeResult.error}`);
                return { ok: false, error: 'Failed to write command file' };
            }
        }
        
        // Step 2: Send OSC command to trigger ReaScript
        const oscResult = await oscRouter.sendMessage(oscAddress, [id]);
        if (!oscResult.ok) {
            console.error('[SYSCALL] Failed to send OSC message');
            return { ok: false, error: 'Failed to send OSC message' };
        }
        
        console.log('[SYSCALL] SEND');
        
        // Note: Acknowledgement will come via OSC and be forwarded to renderer
        // via the 'osc-ack' event in oscRouter
        return { ok: true, id };
        
    } catch (error) {
        console.error('[SYSCALL] Error:', error);
        return { ok: false, error: error.message };
    }
});

/**
 * Sync state from Reaper snapshot
 */
ipcMain.handle('sync-state', async () => {
    const result = await fsManager.readSnapshot();
    if (!result.ok) {
        return { status: 1, code: 'Failed to read snapshot', error: result.error };
    }
    return { status: 0, code: 'OK', state: result.data };
});

// ===== APP LIFECYCLE =====

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    boot.cleanup();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', () => {
    boot.cleanup();
});
