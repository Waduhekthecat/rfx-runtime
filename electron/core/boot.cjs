// boot.cjs
'use strict';

const oscRouter = require('../osc/oscRouter.cjs');

/**
 * Initialize all subsystems on app startup
 * @param {BrowserWindow} mainWindow - The main window
 */
function initialize(mainWindow) {
  console.log('[Boot] Initializing RFX Runtime subsystems...');
  
  // Initialize OSC router
  oscRouter.initialize(mainWindow);
  
  console.log('[Boot] All subsystems initialized');
}

/**
 * Cleanup on app shutdown
 */
function cleanup() {
  console.log('[Boot] Cleaning up subsystems...');
  oscRouter.cleanup();
}

module.exports = {
  initialize,
  cleanup,
};
