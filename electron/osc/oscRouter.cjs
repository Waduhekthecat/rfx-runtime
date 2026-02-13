// osc/oscRouter.cjs
'use strict';

const osc = require('node-osc');

// OSC Configuration
const REAPER_HOST = process.env.REAPER_OSC_HOST || '127.0.0.1';
const REAPER_PORT = parseInt(process.env.REAPER_OSC_PORT || '8000', 10);
const ELECTRON_PORT = parseInt(process.env.ELECTRON_OSC_PORT || '8001', 10);

let oscClient = null;
let oscServer = null;
let mainWindow = null;
let oscLog = [];
const MAX_LOG_SIZE = 100;

/**
 * Log an OSC message
 */
function logOscMessage(dir, address, args = []) {
  const item = {
    ts: Date.now(),
    dir,
    address,
    args,
  };
  oscLog.push(item);
  if (oscLog.length > MAX_LOG_SIZE) {
    oscLog.shift();
  }
}

/**
 * Initialize OSC client and server
 * @param {BrowserWindow} window - Main window for sending IPC messages
 */
function initialize(window) {
  mainWindow = window;

  // Create OSC client for sending to Reaper
  oscClient = new osc.Client(REAPER_HOST, REAPER_PORT);
  console.log(`[OSC] Client initialized -> ${REAPER_HOST}:${REAPER_PORT}`);

  // Create OSC server for receiving from Reaper
  oscServer = new osc.Server(ELECTRON_PORT, '0.0.0.0');
  console.log(`[OSC] Server listening on port ${ELECTRON_PORT}`);

  // Handle incoming OSC messages from Reaper
  oscServer.on('message', (msg) => {
    const [address, ...args] = msg;
    logOscMessage('in', address, args);
    console.log(`[OSC] <- ${address}`, args);

    // Route acknowledgement messages
    if (address.startsWith('/rfx/ack/')) {
      handleAcknowledgement(address, args);
    }
  });

  oscServer.on('error', (err) => {
    console.error('[OSC] Server error:', err);
  });
}

/**
 * Send OSC message to Reaper
 * @param {string} address - OSC address
 * @param {Array} args - OSC arguments
 * @returns {Promise<{ok: boolean}>}
 */
async function sendMessage(address, args = []) {
  return new Promise((resolve) => {
    if (!oscClient) {
      console.error('[OSC] Client not initialized');
      resolve({ ok: false });
      return;
    }

    try {
      oscClient.send(address, ...args, () => {
        logOscMessage('out', address, args);
        console.log(`[OSC] -> ${address}`, args);
        resolve({ ok: true });
      });
    } catch (error) {
      console.error('[OSC] Send error:', error);
      resolve({ ok: false });
    }
  });
}

/**
 * Handle acknowledgement messages from Reaper
 * @param {string} address - OSC address (e.g., /rfx/ack/addFX)
 * @param {Array} args - [id, status, code, ...stateData]
 */
function handleAcknowledgement(address, args) {
  // Extract command name from address (e.g., /rfx/ack/addFX -> addFX)
  const commandName = address.replace('/rfx/ack/', '');
  
  const [id, status, code, ...stateData] = args;
  
  const ackResponse = {
    commandName,
    id: String(id || ''),
    status: Number(status) || 0,
    code: String(code || 'OK'),
    src: 'Reaper',
    stateData: stateData.length > 0 ? stateData : undefined,
  };

  // Forward to renderer process
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('osc-ack', ackResponse);
  }
}

/**
 * Get recent OSC log
 */
function getOscLog() {
  return {
    ok: true,
    items: [...oscLog],
  };
}

/**
 * Cleanup OSC connections
 */
function cleanup() {
  if (oscClient) {
    oscClient.close();
    oscClient = null;
  }
  if (oscServer) {
    oscServer.close();
    oscServer = null;
  }
  console.log('[OSC] Cleaned up');
}

module.exports = {
  initialize,
  sendMessage,
  getOscLog,
  cleanup,
}; 