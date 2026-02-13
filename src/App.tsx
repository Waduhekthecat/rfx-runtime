import { useState, useEffect } from "react";
import "./App.css";
import { commands, requests, initializeSyscall, getAllCommandStates } from "./syscall";
import type { CommandState } from "./types";

export default function App() {
  const [msg, setMsg] = useState<string>("");
  const [commandHistory, setCommandHistory] = useState<CommandState[]>([]);

  useEffect(() => {
    // Initialize syscall system on mount
    initializeSyscall();

    // Update command history periodically
    const interval = setInterval(() => {
      setCommandHistory(getAllCommandStates());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  async function testPing() {
    const res = await window.rfx?.ping?.();
    setMsg(res ? JSON.stringify(res) : "no bridge");
  }

  async function testAddFX() {
    // Example: Add "Amped Roots" FX to track "FX_2A" at index 0
    await commands.addFX({
      trackName: "FX_2A",
      fxId: "Amped Roots",
      fxIndex: 0,
    });
  }

  async function testRemoveFX() {
    await commands.removeFX({
      trackName: "FX_2A",
      fxIndex: 0,
    });
  }

  async function testGetPaths() {
    const paths = await window.rfx.getPaths();
    setMsg(JSON.stringify(paths, null, 2));
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1>RFX Runtime - Reaper Control</h1>
      
      <div style={{ marginBottom: 24 }}>
        <h2>Test Controls</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={testPing}>Ping Electron</button>
          <button onClick={testGetPaths}>Get File Paths</button>
          <button onClick={testAddFX}>Add FX (Test)</button>
          <button onClick={testRemoveFX}>Remove FX (Test)</button>
        </div>
        {msg && (
          <pre style={{ 
            marginTop: 16, 
            padding: 12, 
            background: "#f5f5f5", 
            borderRadius: 4,
            fontSize: 12,
          }}>
            {msg}
          </pre>
        )}
      </div>

      <div>
        <h2>Command History</h2>
        <div style={{ 
          maxHeight: 400, 
          overflowY: "auto",
          border: "1px solid #ccc",
          borderRadius: 4,
        }}>
          {commandHistory.length === 0 ? (
            <div style={{ padding: 16, textAlign: "center", color: "#666" }}>
              No commands executed yet
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f0f0f0", position: "sticky", top: 0 }}>
                  <th style={{ padding: 8, textAlign: "left" }}>Time</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Type</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Command</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Status</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Params</th>
                </tr>
              </thead>
              <tbody>
                {commandHistory.map((cmd) => (
                  <tr key={cmd.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: 8, fontSize: 11 }}>
                      {new Date(cmd.createdAt).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: 8 }}>
                      <span style={{
                        padding: "2px 6px",
                        borderRadius: 3,
                        fontSize: 11,
                        background: cmd.type === "cmd" ? "#e3f2fd" : "#fff3e0",
                      }}>
                        {cmd.type}
                      </span>
                    </td>
                    <td style={{ padding: 8, fontWeight: 500 }}>{cmd.name}</td>
                    <td style={{ padding: 8 }}>
                      <span style={{
                        padding: "2px 6px",
                        borderRadius: 3,
                        fontSize: 11,
                        background: 
                          cmd.status === "resolved" ? "#c8e6c9" :
                          cmd.status === "failed" ? "#ffcdd2" :
                          cmd.status === "synced" ? "#b3e5fc" :
                          cmd.status === "acked" ? "#ffe0b2" :
                          "#f5f5f5",
                      }}>
                        {cmd.status}
                      </span>
                    </td>
                    <td style={{ padding: 8, fontSize: 11 }}>
                      {JSON.stringify(cmd.params)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24, fontSize: 12, color: "#666" }}>
        <p><strong>Note:</strong> Open the browser console (F12) to see SYSCALL logs.</p>
        <p>Commands communicate with Reaper via OSC messages and file I/O.</p>
      </div>
    </div>
  );
}

