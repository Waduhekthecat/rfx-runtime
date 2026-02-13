// file_system/index.cjs
'use strict';

const fs = require('fs').promises;
const path = require('path');
const { getCmdFilePath, getSnapshotFilePath } = require('../core/paths.cjs');

/**
 * Write command line to rfx_cmd.txt
 * @param {string} line - Command line to write
 * @returns {Promise<{ok: boolean, path: string, error?: string}>}
 */
async function writeCmd(line) {
  const cmdPath = getCmdFilePath();
  try {
    // Ensure directory exists
    await fs.mkdir(path.dirname(cmdPath), { recursive: true });
    // Write command line (overwrites previous command)
    await fs.writeFile(cmdPath, line + '\n', 'utf8');
    return { ok: true, path: cmdPath };
  } catch (error) {
    console.error('[File System] Failed to write command:', error);
    return { ok: false, path: cmdPath, error: error.message };
  }
}

/**
 * Read state snapshot from reaper_state.json
 * @returns {Promise<{ok: boolean, data?: any, error?: string, path?: string}>}
 */
async function readSnapshot() {
  const snapshotPath = getSnapshotFilePath();
  try {
    const content = await fs.readFile(snapshotPath, 'utf8');
    const data = JSON.parse(content);
    return { ok: true, data, path: snapshotPath };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { ok: false, error: 'Snapshot file not found', path: snapshotPath };
    }
    console.error('[File System] Failed to read snapshot:', error);
    return { ok: false, error: error.message, path: snapshotPath };
  }
}

/**
 * Get file paths for debugging/info
 */
function getPaths() {
  return {
    ok: true,
    cmdFile: getCmdFilePath(),
    snapshot: getSnapshotFilePath(),
  };
}

module.exports = {
  writeCmd,
  readSnapshot,
  getPaths,
};