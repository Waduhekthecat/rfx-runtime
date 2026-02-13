const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const osc = require("osc");
const fs = require("fs");

const isDev = !app.isPackaged;

// ---- CONFIG (match your REAPER OSC ports) ----
const REAPER_OSC_HOST = "127.0.0.1";
const REAPER_OSC_IN_PORT = 8000;   // Electron -> REAPER (REAPER listens here)
const ELECTRON_OSC_IN_PORT = 19090; // REAPER -> Electron (Electron listens here)

// Example paths (adjust if yours differ)
function getReaperResourcePath() {
  // macOS typical REAPER resource path
  return path.join(process.env.HOME, "Library/Application Support/REAPER");
}
function cmdFilePath() {
  return path.join(getReaperResourcePath(), "rfx_cmd.txt");
}
function snapshotPath() {
  return path.join(getReaperResourcePath(), "rfx_chains_snapshot.json");
}

// ---- OSC OUT (Electron -> REAPER) ----
function createOscOut() {
  const udpPort = new osc.UDPPort({
    remoteAddress: REAPER_OSC_HOST,
    remotePort: REAPER_OSC_IN_PORT,
    metadata: true,
  });

  udpPort.open();
  udpPort.on("ready", () => console.log(`[oscOut] ready -> ${REAPER_OSC_HOST}:${REAPER_OSC_IN_PORT}`));

  function send(address, args = []) {
    udpPort.send({
      address,
      args: args.map((a) => {
        if (typeof a === "number") return { type: "f", value: a };
        if (typeof a === "boolean") return { type: "i", value: a ? 1 : 0 };
        return { type: "s", value: String(a) };
      }),
    });
  }

  return { udpPort, send };
}

// ---- OSC IN (REAPER -> Electron) ----
function createOscIn(onMessage) {
  const udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: ELECTRON_OSC_IN_PORT,
    metadata: true,
  });

  udpPort.open();
  udpPort.on("ready", () => console.log(`[oscIn] listening on :${ELECTRON_OSC_IN_PORT}`));
  udpPort.on("message", (msg) => {
    const args = (msg.args ?? []).map((a) => a.value);
    onMessage({ address: msg.address, args, raw: msg });
  });

  return { udpPort };
}

let oscOut;
let lastOscMessages = [];

function pushOscLog(entry) {
  lastOscMessages.unshift({ ...entry, ts: Date.now() });
  lastOscMessages = lastOscMessages.slice(0, 200);
}

function readJsonSafe(p) {
  try {
    const raw = fs.readFileSync(p, "utf-8");
    return { ok: true, data: JSON.parse(raw) };
  } catch (e) {
    return { ok: false, error: String(e), path: p };
  }
}

function writeCmd(line) {
  const p = cmdFilePath();
  fs.writeFileSync(p, String(line).trim() + "\n", "utf-8");
  return { ok: true, path: p };
}

// ---- IPC API exposed to Debug UI ----
function registerIpc() {
  ipcMain.handle("rfx:oscSend", async (_evt, { address, args }) => {
    oscOut.send(address, args ?? []);
    return { ok: true };
  });

  ipcMain.handle("rfx:writeCmd", async (_evt, { line }) => {
    return writeCmd(line);
  });

  ipcMain.handle("rfx:pulseRunCommand", async () => {
    // you can change this address to whatever your REAPER mapping expects
    oscOut.send("/rfx/cmd/runCommand", [1]);
    return { ok: true };
  });

  ipcMain.handle("rfx:readSnapshot", async () => {
    return readJsonSafe(snapshotPath());
  });

  ipcMain.handle("rfx:getOscLog", async () => {
    return { ok: true, items: lastOscMessages };
  });

  ipcMain.handle("rfx:getPaths", async () => {
    return { ok: true, cmdFile: cmdFilePath(), snapshot: snapshotPath() };
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  oscOut = createOscOut();
  createOscIn((m) => {
    pushOscLog({ dir: "in", address: m.address, args: m.args });
    console.log("[oscIn]", m.address, m.args);
  });

  registerIpc();
  createWindow();
});
