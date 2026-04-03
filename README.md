# OffGrid Wallet 📡

> Crypto transactions without internet. Bluetooth, QR, SMS — syncs when signal returns.

Built for **OWS Hackathon** · Tracks: Best Offline UX · Best Use of Bluetooth/NFC · Best Mobile Wallet · Best Financial Inclusion

---

## The Problem

1.1 billion people have smartphones but unreliable internet. They're locked out of crypto because every wallet assumes connectivity. Markets, remittances, peer payments — all blocked the moment signal drops.

## The Solution

OffGrid Wallet lets you **sign and send transactions locally**, then broadcast through whatever channel is available:

| Channel | How it works |
|---|---|
| **Bluetooth** | Direct device-to-device signed tx relay |
| **QR Code** | Compressed signed tx encoded into scannable QR |
| **SMS Fallback** | Base64-encoded tx split across SMS segments |
| **Auto-Sync** | Queue broadcasts to chain the moment internet returns |

No double-spend risk. Transactions are signed locally with a locked nonce — the chain sees it once when connectivity is restored.

## How It Works

```
User signs tx locally (nonce locked)
        ↓
Payload compressed + encoded
        ↓
Broadcast via BT / QR / SMS
        ↓
Recipient holds signed payload
        ↓
Internet returns → broadcast to chain
        ↓
Confirmed ✓
```

## Tracks

- 🏆 Best Offline UX
- 🏆 Best Use of Bluetooth/NFC
- 🏆 Best Mobile Wallet
- 🏆 Best Financial Inclusion

## Tech Stack

- Next.js + TypeScript
- Web Bluetooth API
- QR encoding (signed tx payload)
- SMS relay (encoded segments)
- Ethers.js (local signing)
- Base L2

## Run Locally

```bash
git clone https://github.com/skyoner5/offgrid-wallet
cd offgrid-wallet
npm install
npm run dev
```

## Built By

[@skyoner5](https://x.com/skyoner5)
