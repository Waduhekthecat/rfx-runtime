export {};

type RfxOscArg = string | number | boolean;

interface RfxOscLogItem {
  ts: number;
  dir: "in" | "out";
  address: string;
  args: RfxOscArg[];
}

interface RfxSnapshotResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  path?: string;
}

interface RfxPathsResult {
  ok: boolean;
  cmdFile: string;
  snapshot: string;
}

interface RfxOscLogResult {
  ok: boolean;
  items: RfxOscLogItem[];
}

interface RfxApi {
  // ---- RAW PIPE ----

  /** Send raw OSC message to REAPER */
  oscSend(address: string, args?: RfxOscArg[]): Promise<{ ok: boolean }>;

  /** Write single-line command to rfx_cmd.txt */
  writeCmd(line: string): Promise<{ ok: boolean; path: string }>;

  /** Pulse /rfx/cmd/runCommand */
  pulseRunCommand(): Promise<{ ok: boolean }>;

  /** Read REAPER snapshot JSON */
  readSnapshot(): Promise<RfxSnapshotResult>;

  /** Get recent OSC inbound log */
  getOscLog(): Promise<RfxOscLogResult>;

  /** Get resolved file paths for cmd + snapshot */
  getPaths(): Promise<RfxPathsResult>;
}

declare global {
  interface Window {
    rfx: RfxApi;
  }
}
