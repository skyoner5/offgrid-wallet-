**
"use client";
import { useState, useEffect, useRef } from "react";
import { askAgent, agentSignAndSend, addLog, AgentLog, AgentDecision } from "@/lib/agent";
import { loadOrCreateWallet, getLocalNonce, incrementLocalNonce, addToQueue, loadQueue, QueuedTx } from "@/lib/wallet";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

const C = {
  bg: "#080c0a", panel: "#0d1410", border: "#1c2e20",
  green: "#00ff6a", greenDim: "#00c450", greenMuted: "#1a3d22",
  amber: "#ffb800", red: "#ff3b3b", text: "#c8e0cc", dim: "#4a6450", blue: "#00b4ff",
};
const mono = "'Share Tech Mono', monospace";
const sans = "system-ui, sans-serif";
const SPENDING_LIMIT = "0.05";

const PRESET_REQUESTS = [
  { label: "☕ Buy Coffee", item: "Coffee at Amara's Cafe", price: "0.001", to: "0x742d35Cc6634C0532900f4A3bA54e5af0d8C3221" },
  { label: "🌾 Pay Farmer", item: "Rice (5kg) at Kofi's Market", price: "0.008", to: "0x3fA8E2b1cD9f0c6584A52c3e9F4d7821bBc1234" },
  { label: "🚌 Bus Fare", item: "Transit pass — Route 14", price: "0.0005", to: "0x9bC4e1A2d3F0c7584A52c3e9F4d7821bBc5678" },
  { label: "💊 Medicine", item: "Malaria meds — Village pharmacy", price: "0.12", to: "0x1aD3e5Cc7834C0532900f4A3bA54e5af0d8C9999" },
];

function TypewriterText({ text, speed = 18 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed(""); setDone(false); let i = 0;
    const t = setInterval(() => { i++; setDisplayed(text.slice(0, i)); if (i >= text.length) { clearInterval(t); setDone(true); } }, speed);
    return () => clearInterval(t);
  }, [text]);
  return <span>{displayed}{!done && <span style={{ opacity: 0.6 }}>█</span>}</span>;
}

function SignalBars({ online }: { online: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3 }}>
      {[6, 10, 14, 18].map((h, i) => <div key={i} style={{ width: 4, height: h, borderRadius: 1, background: online ? C.green : i === 0 ? C.dim : C.greenMuted, boxShadow: online ? `0 0 5px ${C.green}` : "none", transition: "all 0.4s" }} />)}
      <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", marginLeft: 6, color: online ? C.green : C.dim }}>{online ? "ONLINE" : "OFFLINE"}</span>
    </div>
  );
}

function AgentStatus({ thinking }: { thinking: boolean }) {
  const [dot, setDot] = useState(0);
  useEffect(() => { if (!thinking) return; const t = setInterval(() => setDot(d => (d + 1) % 4), 300); return () => clearInterval(t); }, [thinking]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: thinking ? C.amber : C.green, boxShadow: `0 0 10px ${thinking ? C.amber : C.green}`, transition: "all 0.3s" }} />
      <span style={{ fontFamily: mono, fontSize: 11, color: thinking ? C.amber : C.green, letterSpacing: "0.1em" }}>{thinking ? `AGENT THINKING${".".repeat(dot)}` : "AGENT READY"}</span>
    </div>
  );
}

function LogEntry({ log }: { log: AgentLog }) {
  const colors: Record<string, string> = { request: C.blue, decision: log.approved ? C.green : C.red, tx: C.green, error: C.red };
  const icons: Record<string, string> = { request: "→", decision: log.approved ? "✓" : "✗", tx: "⛓", error: "!" };
  return (
    <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 10 }}>
      <span style={{ fontFamily: mono, fontSize: 12, color: colors[log.type], flexShrink: 0, marginTop: 1 }}>{icons[log.type]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 11, color: colors[log.type], lineHeight: 1.6, wordBreak: "break-word" }}>{log.content}</div>
        {log.txHash && <div style={{ fontFamily: mono, fontSize: 9, color: C.dim, marginTop: 3 }}>tx: {log.txHash.slice(0, 16)}...</div>}
        <div style={{ fontFamily: mono, fontSize: 9, color: C.dim, marginTop: 2 }}>{new Date(log.timestamp).toLocaleTimeString()}</div>
      </div>
    </div>
  );
}

export default function AgentPage() {
  const online = useOnlineStatus();
  const [address, setAddress] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [balance] = useState("0.0821");
  const [thinking, setThinking] = useState(false);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [queue, setQueue] = useState<QueuedTx[]>([]);
  const [customTo, setCustomTo] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [customItem, setCustomItem] = useState("");
  const [lastDecision, setLastDecision] = useState<AgentDecision | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const wallet = loadOrCreateWallet(); setAddress(wallet.address); setPrivateKey(wallet.privateKey); setQueue(loadQueue()); }, []);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const appendLog = (log: Omit<AgentLog, "id" | "timestamp">) => { setLogs(prev => addLog(prev, log)); };

  const handleRequest = async (item: string, price: string, to: string) => {
    if (thinking) return;
    setThinking(true); setLastDecision(null);
    appendLog({ type: "request", content: `Purchase request: "${item}" for ${price} ETH` });
    try {
      const decision = await askAgent({ action: "purchase", item, price, to, agentBalance: balance, agentAddress: address, spendingLimit: SPENDING_LIMIT });
      setLastDecision(decision);
      appendLog({ type: "decision", approved: decision.approved, content: `Agent: ${decision.message} — ${decision.reasoning}` });
      if (decision.approved && decision.action === "sign_and_send") {
        const nonce = getLocalNonce(address);
        const result = await agentSignAndSend(to, price, privateKey, nonce);
        incrementLocalNonce(address);
        if (result.txHash) {
          appendLog({ type: "tx", content: `Broadcast confirmed on Base`, txHash: result.txHash, approved: true });
        } else if (result.signedTx) {
          addToQueue({ signedTx: result.signedTx, from: address, to, value: price, nonce, chainId: result.chainId, timestamp: Date.now() });
          setQueue(loadQueue());
          appendLog({ type: "tx", content: `Signed tx queued offline — will broadcast when signal returns`, approved: true });
        }
      }
    } catch (err: any) { appendLog({ type: "error", content: `Agent error: ${err.message}` }); }
    setThinking(false);
  };

  const handleCustom = () => {
    if (!customTo || !customAmount) return;
    handleRequest(customItem || "Custom transfer", customAmount, customTo);
    setCustomTo(""); setCustomAmount(""); setCustomItem("");
  };

  const pendingCount = queue.filter(t => t.status === "pending").length;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", width: "100%", fontFamily: mono }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } input::placeholder { color: #4a6450; } body { background: #080c0a; } ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #1c2e20; }`}</style>
      <div style={{ maxWidth: 440, margin: "0 auto", paddingBottom: 40 }}>
        <div style={{ padding: "16px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 18, letterSpacing: "0.1em", textTransform: "uppercase", color: C.green, textShadow: `0 0 20px rgba(0,255,106,0.4)` }}>Off<span style={{ color: C.dim }}>Grid</span> <span style={{ color: C.amber, fontSize: 14 }}>AGENT</span></div>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.1em", marginTop: 2 }}>AUTONOMOUS OFFLINE COMMERCE</div>
          </div>
          <SignalBars online={online} />
        </div>
        <div style={{ margin: "12px 14px 0", padding: "12px 14px", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <AgentStatus thinking={thinking} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.1em" }}>BALANCE</div>
            <div style={{ fontSize: 14, color: C.green, fontWeight: 700 }}>{balance} ETH</div>
          </div>
        </div>
        <div style={{ margin: "10px 14px 0", padding: "10px 14px", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4 }}>
          <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.15em", marginBottom: 4 }}>AGENT WALLET</div>
          <div style={{ fontSize: 10, color: C.text, wordBreak: "break-all", lineHeight: 1.6 }}>{address || "Initializing..."}</div>
          <div style={{ fontSize: 9, color: C.dim, marginTop: 6 }}>Spending limit: <span style={{ color: C.amber }}>{SPENDING_LIMIT} ETH/tx</span> · {pendingCount} pending sync</div>
        </div>
        <div style={{ margin: "12px 14px 0" }}>
          <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.15em", marginBottom: 8 }}>COMMERCE REQUESTS</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {PRESET_REQUESTS.map((r) => (
              <button key={r.label} onClick={() => handleRequest(r.item, r.price, r.to)} disabled={thinking} style={{ padding: "12px 10px", background: thinking ? "rgba(255,255,255,0.02)" : C.panel, border: `1px solid ${C.border}`, borderRadius: 4, color: thinking ? C.dim : C.text, fontFamily: mono, fontSize: 11, cursor: thinking ? "not-allowed" : "pointer", textAlign: "left", transition: "all 0.2s", display: "flex", flexDirection: "column", gap: 4 }}>
                <span>{r.label}</span>
                <span style={{ color: C.amber, fontSize: 10 }}>{r.price} ETH</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ margin: "12px 14px 0", padding: 14, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.15em" }}>CUSTOM REQUEST</div>
          <input placeholder="Item description (optional)" value={customItem} onChange={e => setCustomItem(e.target.value)} style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: `1px solid ${C.border}`, borderRadius: 3, padding: "9px 12px", color: C.text, fontFamily: mono, fontSize: 12, outline: "none" }} />
          <input placeholder="Recipient 0x..." value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: `1px solid ${C.border}`, borderRadius: 3, padding: "9px 12px", color: C.text, fontFamily: mono, fontSize: 12, outline: "none" }} />
          <input placeholder="Amount in ETH" type="number" step="0.0001" value={customAmount} onChange={e => setCustomAmount(e.target.value)} style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: `1px solid ${C.border}`, borderRadius: 3, padding: "9px 12px", color: C.text, fontFamily: mono, fontSize: 12, outline: "none" }} />
          <button onClick={handleCustom} disabled={thinking || !customTo || !customAmount} style={{ width: "100%", padding: "12px", background: "rgba(0,255,106,0.08)", border: `1px solid rgba(0,255,106,0.3)`, borderRadius: 3, color: C.green, fontFamily: mono, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}>⊛ Submit to Agent</button>
        </div>
        {lastDecision && (
          <div style={{ margin: "12px 14px 0", padding: "14px", background: lastDecision.approved ? "rgba(0,255,106,0.06)" : "rgba(255,59,59,0.06)", border: `1px solid ${lastDecision.approved ? "rgba(0,255,106,0.25)" : "rgba(255,59,59,0.25)"}`, borderRadius: 4 }}>
            <div style={{ fontSize: 10, color: lastDecision.approved ? C.green : C.red, letterSpacing: "0.15em", marginBottom: 6 }}>{lastDecision.approved ? "✓ AGENT APPROVED" : "✗ AGENT REJECTED"}</div>
            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.7 }}><TypewriterText text={lastDecision.message} /></div>
            {lastDecision.approved && lastDecision.amount && <div style={{ marginTop: 8, fontSize: 11, color: C.dim }}>{lastDecision.amount} ETH → {lastDecision.to?.slice(0, 10)}...<br />{online ? "Broadcasting to Base mainnet" : "Queued — broadcasts when signal returns"}</div>}
          </div>
        )}
        <div style={{ margin: "12px 14px 0", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, background: "rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: sans, fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>Agent Log</span>
            <span style={{ fontSize: 9, color: C.dim, letterSpacing: "0.1em" }}>{logs.length} ENTRIES</span>
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {logs.length === 0 && <div style={{ padding: 20, fontSize: 11, color: C.dim, textAlign: "center" }}>No activity yet — submit a commerce request above</div>}
            {logs.map(log => <LogEntry key={log.id} log={log} />)}
            <div ref={logsEndRef} />
          </div>
        </div>
        {queue.length > 0 && (
          <div style={{ margin: "12px 14px 0", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, background: "rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: sans, fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>Offline Queue</span>
              <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 2, background: "rgba(255,184,0,0.1)", color: C.amber, border: "1px solid rgba(255,184,0,0.2)", letterSpacing: "0.1em" }}>{pendingCount} PENDING</span>
            </div>
            {queue.slice(-3).map((tx, i) => (
              <div key={tx.id} style={{ padding: "10px 14px", borderBottom: i < 2 ? `1px solid ${C.border}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, color: C.text }}>→ {tx.to.slice(0, 10)}...{tx.to.slice(-4)}</div>
                  <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>{tx.status.toUpperCase()} · nonce {tx.nonce}</div>
                </div>
                <div style={{ fontSize: 12, color: tx.status === "confirmed" ? C.green : C.amber }}>{tx.value} ETH</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ margin: "16px 14px 0", textAlign: "center" }}>
          <a href="/" style={{ fontFamily: mono, fontSize: 10, color: C.dim, textDecoration: "none", letterSpacing: "0.1em" }}>← BACK TO WALLET</a>
        </div>
      </div>
    </div>
  );
}
```
