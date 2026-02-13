// syscall.ts - High-level system call interface for commands and requests
import { COMMANDS, REQUESTS, CommandState, AckResponse } from './types';

/**
 * Generate unique ID for command tracking
 */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Command state store (simple in-memory for now)
 */
const commandStates = new Map<string, CommandState>();

/**
 * Get command state by ID
 */
export function getCommandState(id: string): CommandState | undefined {
  return commandStates.get(id);
}

/**
 * Get all command states
 */
export function getAllCommandStates(): CommandState[] {
  return Array.from(commandStates.values());
}

/**
 * Execute a command with full lifecycle tracking
 */
async function executeCommand(
  name: keyof typeof COMMANDS,
  params: Record<string, any>,
  source: string = 'Frontend'
): Promise<CommandState> {
  const id = generateId();
  const command = COMMANDS[name];
  const oscAddress = command.osc;

  // Create command state
  const state: CommandState = {
    id,
    name,
    type: 'cmd',
    params,
    status: 'pending',
    createdAt: Date.now(),
  };

  commandStates.set(id, state);

  // Log syscall
  const paramStr = Object.entries(params)
    .map(([key, value]) => {
      if (typeof value === 'string' && value.includes(' ')) {
        return `${key}="${value}"`;
      }
      return `${key}=${value}`;
    })
    .join(' ');
  console.log(`\nSYSCALL [cmd] ${name} ${paramStr} src=${source}`);

  try {
    // Execute command via IPC
    const result = await window.rfx.executeCommand({
      id,
      name,
      type: 'cmd',
      params,
      oscAddress,
    });

    if (!result.ok) {
      state.status = 'failed';
      state.error = result.error || 'Command execution failed';
      console.error(`[SYSCALL] ${name} failed: ${state.error}`);
      return state;
    }

    console.log('SEND');

    return state;
  } catch (error) {
    state.status = 'failed';
    state.error = error instanceof Error ? error.message : String(error);
    console.error(`[SYSCALL] ${name} error:`, error);
    return state;
  }
}

/**
 * Execute a request with full lifecycle tracking
 */
async function executeRequest(
  name: keyof typeof REQUESTS,
  params: Record<string, any> = {},
  source: string = 'Frontend'
): Promise<CommandState> {
  const id = generateId();
  const request = REQUESTS[name];
  const oscAddress = request.osc;

  // Create command state
  const state: CommandState = {
    id,
    name,
    type: 'req',
    params,
    status: 'pending',
    createdAt: Date.now(),
  };

  commandStates.set(id, state);

  // Log syscall
  const paramStr = Object.entries(params)
    .map(([key, value]) => {
      if (typeof value === 'string' && value.includes(' ')) {
        return `${key}="${value}"`;
      }
      return `${key}=${value}`;
    })
    .join(' ');
  console.log(`\nSYSCALL [req] ${name} ${paramStr} src=${source}`);

  try {
    // Execute request via IPC
    const result = await window.rfx.executeCommand({
      id,
      name,
      type: 'req',
      params,
      oscAddress,
    });

    if (!result.ok) {
      state.status = 'failed';
      state.error = result.error || 'Request execution failed';
      console.error(`[SYSCALL] ${name} failed: ${state.error}`);
      return state;
    }

    console.log('SEND');

    return state;
  } catch (error) {
    state.status = 'failed';
    state.error = error instanceof Error ? error.message : String(error);
    console.error(`[SYSCALL] ${name} error:`, error);
    return state;
  }
}

/**
 * Handle acknowledgement from Reaper
 */
export function handleAcknowledgement(ack: AckResponse) {
  const state = commandStates.get(ack.id);
  if (!state) {
    console.warn(`[ACK] Received ack for unknown command: ${ack.id}`);
    return;
  }

  state.status = 'acked';
  state.ackReceivedAt = Date.now();
  state.ackResponse = ack;

  if (ack.status === 0) {
    console.log(`[ACK] ${state.name} acknowledged: ${ack.code}`);

    // Trigger state sync
    syncStateAfterAck(state);
  } else {
    state.status = 'failed';
    state.error = ack.code;
    console.error(`[ACK] ${state.name} failed: ${ack.code}`);
    console.log(`[RESOLUTION] ${state.name} status=${ack.status} code="${ack.code}"`);
  }
}

/**
 * Sync state after successful acknowledgement
 */
async function syncStateAfterAck(state: CommandState) {
  try {
    const result = await window.rfx.syncState();

    if (result.status === 0) {
      state.status = 'synced';
      state.syncedAt = Date.now();
      console.log(`[SYNC] State synchronized successfully`);

      // Mark as resolved
      state.status = 'resolved';
      state.resolvedAt = Date.now();
      console.log(`[RESOLUTION] ${state.name} status=0 code="OK"`);
    } else {
      state.status = 'failed';
      state.error = result.code;
      console.error(`[SYNC] Failed: ${result.code}`);
      console.log(`[RESOLUTION] ${state.name} status=1 code="${result.code}"`);
    }
  } catch (error) {
    state.status = 'failed';
    state.error = error instanceof Error ? error.message : String(error);
    console.error('[SYNC] Error:', error);
    console.log(`[RESOLUTION] ${state.name} status=1 code="Sync error"`);
  }
}

// ===== PUBLIC API =====

/**
 * Commands - modify state in Reaper
 */
export const commands = {
  selectActiveTrack: (params: { trackName: string }) =>
    executeCommand('selectActiveTrack', params),

  addFX: (params: { trackName: string; fxId: string; fxIndex: number }) =>
    executeCommand('addFX', params),

  removeFX: (params: { trackName: string; fxIndex: number }) =>
    executeCommand('removeFX', params),

  moveFX: (params: { trackName: string; fromIndex: number; toIndex: number }) =>
    executeCommand('moveFX', params),

  toggleFXEnable: (params: { trackName: string; fxIndex: number }) =>
    executeCommand('toggleFXEnable', params),
};

/**
 * Requests - query state from Reaper
 */
export const requests = {
  reqFXCatalogue: () => executeRequest('reqFXCatalogue'),

  reqFXParams: (params: { trackName: string; fxIndex: number }) =>
    executeRequest('reqFXParams', params),

  reqTrackFXList: (params: { trackName: string }) =>
    executeRequest('reqTrackFXList', params),
};

/**
 * Initialize syscall system - set up event listeners
 */
export function initializeSyscall() {
  // Listen for OSC acknowledgements
  window.rfx.onOscAck((ack: AckResponse) => {
    handleAcknowledgement(ack);
  });

  console.log('[Syscall] Initialized');
}
