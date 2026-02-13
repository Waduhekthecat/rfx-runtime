// paths.cjs
'use strict';

const path = require('path');
const os = require('os');

/**
 * Configuration for Reaper resource folder paths
 * In production, these should be configurable via environment variables or config file
 */
function getReaperResourcePath() {
  // Check for environment variable override
  if (process.env.REAPER_RESOURCE_PATH) {
    return process.env.REAPER_RESOURCE_PATH;
  }

  // Default paths based on platform
  switch (os.platform()) {
    case 'darwin': // macOS
      return path.join(os.homedir(), 'Library', 'Application Support', 'REAPER');
    case 'win32': // Windows
      return path.join(process.env.APPDATA || '', 'REAPER');
    case 'linux':
      return path.join(os.homedir(), '.config', 'REAPER');
    default:
      return path.join(os.homedir(), '.config', 'REAPER');
  }
}

/**
 * Get path to command file where Electron writes commands for Reaper
 */
function getCmdFilePath() {
  return path.join(getReaperResourcePath(), 'rfx_cmd.txt');
}

/**
 * Get path to state snapshot file where Reaper writes state for Electron
 */
function getSnapshotFilePath() {
  return path.join(getReaperResourcePath(), 'reaper_state.json');
}

module.exports = {
  getReaperResourcePath,
  getCmdFilePath,
  getSnapshotFilePath,
};