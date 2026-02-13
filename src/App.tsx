import { useState } from "react";
import "./App.css";

export default function App() {
  const [msg, setMsg] = useState<string>("");

  async function test() {
    const res = await window.rfx?.ping?.();
    setMsg(res ? JSON.stringify(res) : "no bridge");
  }

  return (
    <div style={{ padding: 16 }}>
      <button onClick={test}>Ping Electron</button>
      <pre>{msg}</pre>
    </div>
  );
}
