// Base types for command/request system
export type CommandType = 'cmd' | 'req';
export type CommandName = keyof typeof COMMANDS | keyof typeof REQUESTS;

// Command definitions - system calls that modify state
export const COMMANDS = {
  selectActiveTrack: { osc: '/rfx/cmd/selectActiveTrack' },
  addFX: { osc: '/rfx/cmd/addFX' },
  removeFX: { osc: '/rfx/cmd/removeFX' },
  moveFX: { osc: '/rfx/cmd/moveFX' },
  toggleFXEnable: { osc: '/rfx/cmd/toggleFXEnable' },
} as const;

// Request definitions - system calls that retrieve state
export const REQUESTS = {
  reqFXCatalogue: { osc: '/rfx/req/reqFXCatalogue' },
  reqFXParams: { osc: '/rfx/req/reqFXParams' },
  reqTrackFXList: { osc: '/rfx/req/reqTrackFXList' },
} as const;

// Acknowledgement response structure
export interface AckResponse {
  status: number; // 0 = OK, 1 = Failed
  code: string; // 'OK' or error description
  commandName: string;
  id: string;
  src: string; // 'Reaper' or source identifier
}

// Command state interface
export interface CommandState {
  id: string;
  name: string;
  type: CommandType;
  params: Record<string, any>;
  status: 'pending' | 'acked' | 'synced' | 'resolved' | 'failed';
  createdAt: number;
  ackReceivedAt?: number;
  syncedAt?: number;
  resolvedAt?: number;
  ackResponse?: AckResponse;
  error?: string;
}

// Sync state structure from reaper_state.json
export interface ReaperState {
  tracks: TrackInfo[];
  timestamp: number;
}

export interface TrackInfo {
  name: string;
  index: number;
  fxChain: FXInfo[];
}

export interface FXInfo {
  id: string;
  name: string;
  fxIndex: number; 
  enabled: boolean;
  params: Record<string, number>;
}