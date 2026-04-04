"use client";
import { useState, useEffect } from "react";
import { decodeQRPayload, addToQueue, loadOrCreateWallet } from "@/lib/wallet";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import QRScanner from "@/components/QRScanner";
import QRDisplay from "@/components/QRDisplay";

const C = { bg: "#080c0a", panel: "#0d1410", border: "#1c2e20", green: "#00ff6a", greenDim: "#00c450", amber: "#ffb800", red: "#ff3b3b", text: "#c8e0cc", dim: "#4a6450" };
const mono = "'Share Tech Mono', monospace";
const sans = "system-ui, sans-serif";
const PRODUCTS = [
  { id: "1", name: "Rice (5kg)", price: "0.008", emoji: "🌾" },
  { id: "2", name: "Water (20L)", price: "0.003", emoji: "💧" },
  { id: "3", name: "Coffee", price: "0.001", emoji: "☕" },
  { id: "4", name: "Bus Fare", price: "0.0005", emoji: "🚌" },
  { id: "5", name: "Medicine (basic)", price: "0.005", emoji: "💊" },
  { id: "6", name: "Phone Charge", price: "0.0002", emoji: "🔋" },
];
interface Sale { id: string; product: string; amount: string; from: string; timestamp: number; status: "confirmed" | "pending"; }

function SignalBars({ online }: { online: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3 }}>
      {[6, 10, 14, 18].map((h, i) => <div key={i} style={{ width: 4, height: h, borderRadius: 1, background: online ? C.green : i === 0 ? C.dim : "#1a3d22", transition: "all 0.4s", boxShadow: online ? `0 0 5px ${C.green}` : "none" }} />)}
      <span style={{ fontFamily: mono, fontSize: 10, marginLeft: 6, color: online ? C.green : C.dim, letterSpacing: "0.1em" }}>{online ? "ONLINE" : "OFFLINE"}</span>
    </div>
  );
}

export default function StorefrontPage() {
  const online = useOnlineStatus();
  const [address, setAddress] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<typeof PRODUCTS[0] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [view, setView] = useState<"shop" | "receive" | "sales">("shop");
  const [totalETH, setTotalETH] = useState("0.0000");

  useEffect(() => { const wallet = loadOrCreateWallet(); setAddress(wallet.address); }, []);
  useEffect(() => { setTotalETH(sales.reduce((sum, s) => sum + parseFloat(s.amount), 0).toFixed(6)); }, [sales]);

  const handleScan = (raw: string) => {
    try {
      const payload = decodeQRPayload(raw);
      const sale: Sale = { id: Math.random().toString(36).slice(2), product: selectedProduct?.name || "Unknown item", amount: payload.value, from: payload.from, timestamp: Date.now(), status: online ? "confirmed" : "pending" };
      addToQueue(payload);
      setSales(prev => [sale, ...prev]);
      setLastSale(sale); setScanning(false); setSelectedProduct(null);
    } catch { alert("Invalid payment QR"); }
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", width: "100%", fontFamily: mono }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } body { background: #080c0a; }`}</style>
      <div style={{ maxWidth: 440, margin: "0 auto", paddingBottom: 80 }}>
        <div style={{ padding: "16px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 18, letterSpacing: "0.1em", textTransform: "uppercase", color: C.green }}>Off<span style={{ color: C.dim }}>Grid</span> <span style={{ color: "#00b4ff", fontSize: 14 }}>STORE</span></div>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.1em", marginTop: 2 }}>OFFLINE MERCHANT TERMINAL</div>
          </div>
          <SignalBars online={online} />
        </div>
        <div style={{ margin: "12px 14px 0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[["SALES", sales.length.toString()], ["TOTAL", `${totalETH} ETH`], ["STATUS", online ? "SYNCED" : "OFFLINE"]].map(([label, value]) => (
            <div key={label} style={{ padding: "10px 12px", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4 }}>
              <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.15em", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 12, color: label === "STATUS" ? (online ? C.green : C.amber) : C.text, fontWeight: 700 }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ margin: "12px 14px 0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden" }}>
          {(["shop", "receive", "sales"] as const).map(t => (
            <button key={t} onClick={() => setView(t)} style={{ padding: "11px 4px", background: view === t ? "rgba(0,255,106,0.08)" : C.panel, border: "none", borderRight: t !== "sales" ? `1px solid ${C.border}` : "none", color: view === t ? C.green : C.dim, fontFamily: mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>{t}</button>
          ))}
        </div>
        <div style={{ margin: "12px 14px 0", display: "flex", flexDirection: "column", gap: 12 }}>
          {view === "shop" && (
            <>
              <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.15em" }}>SELECT ITEM TO SELL</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {PRODUCTS.map(p => (
                  <button key={p.id} onClick={() => { setSelectedProduct(p); setView("receive"); }} style={{ padding: "14px 12px", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontFamily: mono, fontSize: 12, cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 22 }}>{p.emoji}</span>
                    <span>{p.name}</span>
                    <span style={{ color: C.amber, fontSize: 11 }}>{p.price} ETH</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {view === "receive" && (
            <>
              {selectedProduct && <div style={{ padding: "12px 14px", background: "rgba(0,255,106,0.06)", border: `1px solid rgba(0,255,106,0.2)`, borderRadius: 4 }}><div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.15em", marginBottom: 4 }}>SELLING</div><div style={{ fontSize: 14, color: C.green }}>{selectedProduct.emoji} {selectedProduct.name}</div><div style={{ fontSize: 12, color: C.amber, marginTop: 2 }}>{selectedProduct.price} ETH</div></div>}
              {lastSale && <div style={{ padding: 14, background: "rgba(0,255,106,0.06)", border: `1px solid rgba(0,255,106,0.3)`, borderRadius: 4 }}><div style={{ fontSize: 10, color: C.green, letterSpacing: "0.15em", marginBottom: 6 }}>✓ PAYMENT RECEIVED</div><div style={{ fontSize: 11, color: C.text, lineHeight: 1.7 }}>{lastSale.product}<br />{lastSale.amount} ETH<br />From: {lastSale.from.slice(0, 10)}...<br />{online ? "Confirmed on-chain" : "Queued — will confirm when online"}</div></div>}
              <div style={{ padding: 14, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.15em" }}>SCAN BUYER'S QR TO RECEIVE PAYMENT</div>
                {!scanning ? <button onClick={() => setScanning(true)} style={{ width: "100%", padding: 13, background: "rgba(0,255,106,0.08)", border: `1px solid rgba(0,255,106,0.3)`, borderRadius: 3, color: C.green, fontFamily: mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>◻ Scan Payment QR</button> : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}><QRScanner onScan={handleScan} /><button onClick={() => setScanning(false)} style={{ fontFamily: mono, fontSize: 10, color: C.dim, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 3, padding: "8px 16px", cursor: "pointer" }}>Cancel</button></div>}
              </div>
              <div style={{ padding: 16, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.15em" }}>YOUR MERCHANT ADDRESS</div>
                {address && <QRDisplay data={address} size={160} />}
                <div style={{ fontSize: 10, color: C.dim, wordBreak: "break-all", textAlign: "center", lineHeight: 1.6 }}>{address}</div>
              </div>
            </>
          )}
          {view === "sales" && (
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, background: "rgba(0,0,0,0.2)" }}><span style={{ fontFamily: sans, fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>Sales Log</span></div>
              {sales.length === 0 && <div style={{ padding: 20, fontSize: 11, color: C.dim, textAlign: "center" }}>No sales yet</div>}
              {sales.map((s, i) => (
                <div key={s.id} style={{ padding: "11px 14px", borderBottom: i < sales.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontSize: 12, color: C.text }}>{s.product}</div><div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>{s.from.slice(0, 10)}... · {new Date(s.timestamp).toLocaleTimeString()}</div></div>
                  <div style={{ textAlign: "right" }}><div style={{ fontSize: 12, color: C.green }}>{s.amount} ETH</div><div style={{ fontSize: 9, color: s.status === "confirmed" ? C.green : C.amber, marginTop: 2 }}>{s.status.toUpperCase()}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ margin: "16px 14px 0", display: "flex", gap: 8 }}>
          <a href="/agent" style={{ flex: 1, padding: "11px", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 3, color: C.dim, fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", textDecoration: "none", textAlign: "center", display: "block" }}>⊛ AGENT</a>
          <a href="/" style={{ flex: 1, padding: "11px", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 3, color: C.dim, fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", textDecoration: "none", textAlign: "center", display: "block" }}>◈ WALLET</a>
        </div>
      </div>
    </div>
  );
              }
