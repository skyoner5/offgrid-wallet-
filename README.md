# OffGrid Wallet 📡

> Crypto transactions without internet. Sign locally, send via QR or Bluetooth, broadcasts to chain when signal returns.

Built for **OWS Hackathon** · Tracks: Best Offline UX · Best Use of Bluetooth/NFC · Best Mobile Wallet · Best Financial Inclusion

## Live Demo

https://offgrid-wallet.vercel.app

---

## The Problem

1.1 billion people have smartphones but unreliable internet. They're locked out of crypto because every wallet assumes connectivity. Markets, remittances, peer payments — all blocked the moment signal drops.

## The Solution

OffGrid Wallet lets you **sign transactions locally** and broadcast them through whatever channel is available — no internet required at the point of sending.

| Channel | How it works |
|---|---|
| **QR Code** | Tx signed locally → encoded as QR → recipient scans → holds signed tx → broadcasts when online |
| **Bluetooth** | Signed tx payload sent device-to-device over BLE (Android Chrome + Desktop Chrome) |
| **Auto-Sync** | `window online` event triggers automatic broadcast of entire pending queue |

No double-spend risk. Transactions are signed with ethers.js and a locked nonce — the chain sees each tx exactly once.

## How It Works

```
User signs tx locally (ethers.js, nonce locked)
        ↓
Payload compressed + encoded
        ↓
Broadcast via QR scan or Bluetooth
        ↓
Recipient holds raw signed tx in localStorage
        ↓
Internet returns → auto-broadcast to Base RPC
        ↓
Confirmed on-chain ✓
```

## Tech Stack

- **Next.js 14** + TypeScript
- **ethers.js v6** — local transaction signing, nonce management
- **Web Bluetooth API** — BLE device-to-device relay (512-byte chunked transfer)
- **qrcode** — encode signed tx payload as scannable QR
- **html5-qrcode** — camera-based QR scanning
- **localStorage** — offline tx queue, persists across sessions
- **Base L2** — chainId 8453 (mainnet) / 84532 (Sepolia testnet)

## Tracks

- 🏆 Best Offline UX
- 🏆 Best Use of Bluetooth/NFC
- 🏆 Best Mobile Wallet
- 🏆 Best Financial Inclusion

## Run Locally

```bash
git clone https://github.com/skyoner5/offgrid-wallet
cd offgrid-wallet
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **Testing tip:** Switch to Base Sepolia before testing. In `lib/wallet.ts` set:
> ```ts
> const RPC_URL = "https://sepolia.base.org";
> const CHAIN_ID = 84532;
> ```

## Project Structure

```
offgrid-wallet/
├── app/
│   ├── layout.tsx        # Root layout + fonts
│   └── page.tsx          # Main wallet UI
├── components/
│   ├── QRDisplay.tsx     # Renders signed tx as QR
│   └── QRScanner.tsx     # Camera QR scanner
├── lib/
│   ├── wallet.ts         # Signing, queue, broadcast logic
│   ├── bluetooth.ts      # Web Bluetooth BLE relay
│   └── useOnlineStatus.ts # Auto-broadcast on reconnect
└── public/
    └── manifest.json     # PWA manifest
```

## Browser Support

| Feature | Chrome Android | Chrome Desktop | iOS Safari |
|---|---|---|---|
| QR Send/Receive | ✅ | ✅ | ✅ |
| Bluetooth | ✅ | ✅ | ❌ |
| Auto-sync | ✅ | ✅ | ✅ |

iOS Bluetooth blocked by Apple — QR is the fallback on iPhone.

## Built By

[@skyoner5](https://x.com/skyoner5)
