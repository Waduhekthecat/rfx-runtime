'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Placeholder for OSC router import
// const oscRouter = require('./path/to/oscRouter');

// Placeholder for file system manager import
// const fsManager = require('./path/to/fsManager');

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    win.loadFile('index.html');
}

ipcMain.on('execute-command', (event, arg) => {
    // Placeholder for command execution
    console.log(`Received command: ${arg}`);
    // Execute command logic here
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
