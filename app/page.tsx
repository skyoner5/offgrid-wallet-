"use client";
import { useState, useEffect, useCallback } from "react";
import {
  loadOrCreateWallet,
  signTransaction,
  encodePayloadForQR,
  decodeQRPayload,
  addToQueue,
  loadQueue,
  getLocalNonce,
  incrementLocalNonce,
  QueuedTx,
  SignedTxPayload,
} from "@/lib/wallet";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { bluetoothSupported, sendViaBluetooth } from "@/lib/bluetooth";
import QRDisplay from "@/components/QRDisplay";
import QRScanner from "@/components/QRScanner";

type Tab = "send" | "receive" | "queue";
type SendMode = "qr" | "bluetooth";
type ReceiveMode = "qr" | "bluetooth";

const C = {
  bg: "#080c0a",
  panel: "#111a14",
  border: "#1c2e20",
  green: "#00ff6a",
  greenDim: "#00c450",
  greenMuted: "#1a3d22",
  amber: "#ffb800",
  red: "#ff3b3b",
  text: "#c8e0cc",
  dim: "#4a6450",
};

const mono = "'Share Tech Mono', monospace";
const sans = "system-ui, sans-serif";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.15em", color: C.dim, textTransform: "uppercase" as const, marginBottom: 6 }}>
      {children}
    </div>
  );
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        background: "rgba(0,0,0,0.4)",
        border: `1px solid ${C.border}`,
        borderRadius: 3,
        padding: "11px 12px",
        color: C.text,
        fontFamily: mono,
        fontSize: 13,
        outline: "none",
        boxSizing: "border-box" as const,
        ...props.style,
      }}
    />
  );
}

function Btn({
  children,
  onClick,
  variant = "primary",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "amber";
  disabled?: boolean;
}) {
  const colors = {
    primary: { bg: "rgba(0,255,106,0.08)", border: "rgba(0,255,106,0.35)", color: C.green },
    secondary: { bg: "transparent", border: C.border, color: C.dim },
    amber: { bg: "rgba(255,184,0,0.08)", border: "rgba(255,184,0,0.35)", color: C.amber },
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "13px 16px",
        background: disabled ? "rgba(255,255,255,0.03)" : colors.bg,
        border: `1px solid ${disabled ? C.border : colors.border}`,
        borderRadius: 3,
        color: disabled ? C.dim : colors.color,
        fontFamily: mono,
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: "0.12em",
        textTransform: "uppercase" as const,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s",
      }}
    >
      {children}
    </button>
  );
}

function StatusDot({ status }: { status: QueuedTx["status"] }) {
  const color = { pending: C.amber, broadcasting: C.green, confirmed: C.green, failed: C.red }[status];
  return (
    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
  );
}

function SignalBars({ online }: { online: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3 }}>
      {[6, 10, 14, 18].map((h, i) => (
        <div key={i} style={{ width: 4, height: h, borderRadius: 1, background: online ? C.green : i === 0 ? C.dim : C.greenMuted, boxShadow: online ? `0 0 5px ${C.green}` : "none", transition: "all 0.4s" }} />
      ))}
      <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", marginLeft: 6, color: online ? C.green : C.dim }}>
        {online ? "ONLINE" : "OFFLINE"}
      </span>
    </div>
  );
}

export default function WalletPage() {
  const online = useOnlineStatus();
  const [address, setAddress] = useState("");
  const [tab, setTab] = useState<Tab>("send");
  const [sendMode, setSendMode] = useState<SendMode>("qr");
  const [receiveMode, setReceiveMode] = useState<ReceiveMode>("qr");

  // Send form
  const [toAddr, setToAddr] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  // QR state
  const [signedQR, setSignedQR] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedPayload, setScannedPayload] = useState<SignedTxPayload | null>(null);

  // Queue
  const [queue, setQueue] = useState<QueuedTx[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const wallet = loadOrCreateWallet();
    setAddress(wallet.address);
    setQueue(loadQueue());
  }, []);

  const refreshQueue = useCallback(() => {
    setQueue(loadQueue());
  }, []);

  // Refresh queue every 3s
  useEffect(() => {
    const t = setInterval(refreshQueue, 3000);
    return () => clearInterval(t);
  }, [refreshQueue]);

  // ── Sign & generate QR ────────────────────────────────────────────────────

  const handleSign = async () => {
    if (!toAddr || !amount) { setStatus("Enter recipient and amount"); return; }
    setLoading(true);
    setStatus("Signing...");
    try {
      const nonce = getLocalNonce(address);
      const payload = await signTransaction(toAddr, amount, nonce);
      incrementLocalNonce(address);
      const encoded = encodePayloadForQR(payload);
      setSignedQR(encoded);
      setStatus("QR ready — show to recipient");
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
    setLoading(false);
  };

  // ── Send via Bluetooth ────────────────────────────────────────────────────

  const handleBluetooth = async () => {
    if (!toAddr || !amount) { setStatus("Enter recipient and amount"); return; }
    if (!bluetoothSupported()) { setStatus("Bluetooth not supported on this browser"); return; }
    setLoading(true);
    setStatus("Signing...");
    try {
      const nonce = getLocalNonce(address);
      const payload = await signTransaction(toAddr, amount, nonce);
      incrementLocalNonce(address);
      const encoded = encodePayloadForQR(payload);
      setStatus("Select Bluetooth device...");
      await sendViaBluetooth(encoded);
      addToQueue(payload);
      refreshQueue();
      setStatus("Sent via Bluetooth ✓");
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
    setLoading(false);
  };

  // ── Receive: handle scanned QR ────────────────────────────────────────────

  const handleScan = (raw: string) => {
    try {
      const payload = decodeQRPayload(raw);
      setScannedPayload(payload);
      setScanning(false);
      addToQueue(payload);
      refreshQueue();
      setStatus("Transaction received. Will broadcast when online.");
    } catch {
      setStatus("Invalid QR code");
    }
  };

  const pendingCount = queue.filter((t) => t.status === "pending").length;
  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Loading...";

  return (
    <div style={{ background: C.bg, minHeight: "100vh", width: "100%", fontFamily: mono, color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: #4a6450; }
        body { background: #080c0a; }
      `}</style>

      <div style={{ maxWidth: 440, margin: "0 auto", paddingBottom: 90 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 16px 0" }}>
          <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 20, letterSpacing: "0.1em", textTransform: "uppercase", color: C.green, textShadow: `0 0 20px rgba(0,255,106,0.4)` }}>
            Off<span style={{ color: C.dim }}>Grid</span>
          </div>
          <SignalBars online={online} />
        </div>

        {/* Address card */}
        <div style={{ margin: "14px 14px 0", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, padding: "14px 16px" }}>
          <Label>Your Address</Label>
          <div style={{ fontSize: 13, color: C.text, wordBreak: "break-all", lineHeight: 1.6 }}>{address}</div>
          <div style={{ marginTop: 8, fontSize: 11, color: online ? C.green : C.amber }}>
            {online ? "● Connected — pending txs broadcasting" : "● Offline — txs will queue until connected"}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, margin: "14px 14px 0", border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden" }}>
          {(["send", "receive", "queue"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "12px 4px",
                background: tab === t ? "rgba(0,255,106,0.08)" : C.panel,
                border: "none",
                borderRight: t !== "queue" ? `1px solid ${C.border}` : "none",
                color: tab === t ? C.green : C.dim,
                fontFamily: mono,
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {t}{t === "queue" && pendingCount > 0 ? ` (${pendingCount})` : ""}
            </button>
          ))}
        </div>

        <div style={{ margin: "12px 14px 0", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* ── SEND TAB ── */}
          {tab === "send" && (
            <>
              {/* Mode toggle */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(["qr", "bluetooth"] as SendMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setSendMode(m); setSignedQR(null); setStatus(""); }}
                    style={{
                      padding: "12px 8px",
                      background: sendMode === m ? "rgba(0,255,106,0.08)" : C.panel,
                      border: `1px solid ${sendMode === m ? C.green : C.border}`,
                      borderRadius: 4,
                      color: sendMode === m ? C.green : C.dim,
                      fontFamily: mono,
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    {m === "qr" ? "◻ QR Code" : "⊛ Bluetooth"}
                  </button>
                ))}
              </div>

              {/* Form */}
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <Label>Recipient Address</Label>
                  <Input
                    placeholder="0x..."
                    value={toAddr}
                    onChange={(e) => setToAddr(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Amount (ETH)</Label>
                  <Input
                    type="number"
                    placeholder="0.0000"
                    step="0.0001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Memo (optional)</Label>
                  <Input
                    placeholder="market goods, rent..."
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                  />
                </div>

                {sendMode === "qr" ? (
                  <Btn onClick={handleSign} disabled={loading}>
                    {loading ? "Signing..." : "◻ Sign & Generate QR"}
                  </Btn>
                ) : (
                  <Btn onClick={handleBluetooth} disabled={loading}>
                    {loading ? "Connecting..." : "⊛ Sign & Send via Bluetooth"}
                  </Btn>
                )}

                {status && (
                  <div style={{ fontFamily: mono, fontSize: 11, color: status.startsWith("Error") ? C.red : C.green, lineHeight: 1.6 }}>
                    {status}
                  </div>
                )}
              </div>

              {/* QR output */}
              {signedQR && (
                <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                  <Label>Show this QR to recipient</Label>
                  <QRDisplay data={signedQR} size={220} />
                  <div style={{ fontFamily: mono, fontSize: 10, color: C.dim, textAlign: "center", lineHeight: 1.7 }}>
                    Signed tx encoded in QR.<br />
                    Recipient scans → holds → broadcasts when online.
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── RECEIVE TAB ── */}
          {tab === "receive" && (
            <>
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontFamily: mono, fontSize: 11, color: C.dim, lineHeight: 1.7 }}>
                  Scan the sender's QR code to receive their signed transaction. It will be stored locally and broadcast to the chain when you go online.
                </div>
                {!scanning && !scannedPayload && (
                  <Btn onClick={() => setScanning(true)}>◻ Scan QR Code</Btn>
                )}
                {scanning && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                    <QRScanner onScan={handleScan} onError={(e) => setStatus(e)} />
                    <Btn variant="secondary" onClick={() => setScanning(false)}>Cancel</Btn>
                  </div>
                )}
                {scannedPayload && (
                  <div style={{ background: "rgba(0,255,106,0.06)", border: `1px solid rgba(0,255,106,0.2)`, borderRadius: 3, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ color: C.green, fontSize: 12 }}>✓ Transaction received</div>
                    <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.7 }}>
                      From: {scannedPayload.from.slice(0, 10)}...{scannedPayload.from.slice(-6)}<br />
                      To: {scannedPayload.to.slice(0, 10)}...{scannedPayload.to.slice(-6)}<br />
                      Amount: {scannedPayload.value} ETH<br />
                      Status: {online ? "Broadcasting now..." : "Queued — waiting for signal"}
                    </div>
                    <Btn variant="secondary" onClick={() => { setScannedPayload(null); setStatus(""); }}>Scan Another</Btn>
                  </div>
                )}
                {status && (
                  <div style={{ fontFamily: mono, fontSize: 11, color: status.startsWith("Error") || status.startsWith("Invalid") ? C.red : C.green }}>
                    {status}
                  </div>
                )}
              </div>

              {/* Your receive QR */}
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <Label>Your address — share to receive</Label>
                {address && <QRDisplay data={address} size={180} />}
                <div style={{ fontFamily: mono, fontSize: 10, color: C.dim, wordBreak: "break-all", textAlign: "center", maxWidth: 300, lineHeight: 1.7 }}>
                  {address}
                </div>
              </div>
            </>
          )}

          {/* ── QUEUE TAB ── */}
          {tab === "queue" && (
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderBottom: `1px solid ${C.border}`, background: "rgba(0,0,0,0.2)" }}>
                <span style={{ fontFamily: sans, fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase" }}>Sync Queue</span>
                <span style={{ fontFamily: mono, fontSize: 9, padding: "3px 8px", borderRadius: 2, background: pendingCount > 0 ? "rgba(255,184,0,0.1)" : "rgba(0,255,106,0.1)", color: pendingCount > 0 ? C.amber : C.green, border: `1px solid ${pendingCount > 0 ? "rgba(255,184,0,0.2)" : "rgba(0,255,106,0.2)"}` }}>
                  {pendingCount} PENDING
                </span>
              </div>
              {queue.length === 0 && (
                <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: C.dim, textAlign: "center" }}>
                  No transactions yet
                </div>
              )}
              {queue.map((tx, i) => (
                <div key={tx.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: i < queue.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <StatusDot status={tx.status} />
                    <div>
                      <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 13 }}>
                        → {tx.to.slice(0, 8)}...{tx.to.slice(-4)}
                      </div>
                      <div style={{ fontFamily: mono, fontSize: 9, color: C.dim, marginTop: 2 }}>
                        {tx.status.toUpperCase()} · nonce {tx.nonce}
                        {tx.txHash ? ` · ${tx.txHash.slice(0, 10)}...` : ""}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: mono, fontSize: 12 }}>{tx.value} ETH</div>
                    <div style={{ fontFamily: mono, fontSize: 9, color: C.dim, marginTop: 2 }}>
                      {new Date(tx.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 440, background: "#0d1410", borderTop: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "repeat(3,1fr)", padding: "6px 8px 10px", zIndex: 50 }}>
        {([["send", "◈", "SEND"], ["receive", "⊡", "RECEIVE"], ["queue", "⊟", "QUEUE"]] as [Tab, string, string][]).map(([t, icon, name]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 4px", border: "none", background: tab === t ? "rgba(0,255,106,0.06)" : "transparent", borderRadius: 4, cursor: "pointer" }}
          >
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span style={{ fontFamily: mono, fontSize: 9, color: tab === t ? C.green : C.dim, letterSpacing: "0.08em" }}>
              {name}{t === "queue" && pendingCount > 0 ? ` (${pendingCount})` : ""}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
