import { ethers } from "ethers";

export interface SignedTxPayload {
  signedTx: string;
  from: string;
  to: string;
  value: string; // in ETH
  nonce: number;
  chainId: number;
  timestamp: number;
}

export interface QueuedTx extends SignedTxPayload {
  id: string;
  status: "pending" | "broadcasting" | "confirmed" | "failed";
  txHash?: string;
}

const STORAGE_KEY = "offgrid_queue";
const WALLET_KEY = "offgrid_wallet";

// Base mainnet RPC — swap for testnet during dev
const RPC_URL = "https://mainnet.base.org";
const CHAIN_ID = 8453;

// ─── Wallet ──────────────────────────────────────────────────────────────────

export function loadOrCreateWallet(): ethers.Wallet {
  if (typeof window === "undefined") throw new Error("Browser only");
  const stored = localStorage.getItem(WALLET_KEY);
  if (stored) {
    const { privateKey } = JSON.parse(stored);
    return new ethers.Wallet(privateKey);
  }
  const wallet = ethers.Wallet.createRandom();
  localStorage.setItem(WALLET_KEY, JSON.stringify({ privateKey: wallet.privateKey }));
  return wallet;
}

export function getAddress(): string {
  const wallet = loadOrCreateWallet();
  return wallet.address;
}

// ─── Sign ─────────────────────────────────────────────────────────────────────

export async function signTransaction(
  toAddress: string,
  amountEth: string,
  nonce: number
): Promise<SignedTxPayload> {
  const wallet = loadOrCreateWallet();
  const value = ethers.parseEther(amountEth);

  const tx = {
    to: toAddress,
    value,
    nonce,
    gasLimit: 21000n,
    maxFeePerGas: ethers.parseUnits("0.1", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("0.01", "gwei"),
    chainId: CHAIN_ID,
    type: 2,
  };

  const signedTx = await wallet.signTransaction(tx);

  return {
    signedTx,
    from: wallet.address,
    to: toAddress,
    value: amountEth,
    nonce,
    chainId: CHAIN_ID,
    timestamp: Date.now(),
  };
}

// ─── Nonce ────────────────────────────────────────────────────────────────────

export async function fetchNonce(address: string): Promise<number> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return await provider.getTransactionCount(address, "latest");
}

// Offline nonce tracking — increments locally so multiple txs can be queued
export function getLocalNonce(address: string): number {
  const key = `offgrid_nonce_${address.toLowerCase()}`;
  const stored = localStorage.getItem(key);
  return stored ? parseInt(stored) : 0;
}

export function incrementLocalNonce(address: string): void {
  const key = `offgrid_nonce_${address.toLowerCase()}`;
  const current = getLocalNonce(address);
  localStorage.setItem(key, String(current + 1));
}

export async function syncNonceFromChain(address: string): Promise<void> {
  try {
    const onChainNonce = await fetchNonce(address);
    const key = `offgrid_nonce_${address.toLowerCase()}`;
    localStorage.setItem(key, String(onChainNonce));
  } catch {
    // offline — keep local nonce
  }
}

// ─── Queue ────────────────────────────────────────────────────────────────────

export function loadQueue(): QueuedTx[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveQueue(queue: QueuedTx[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function addToQueue(payload: SignedTxPayload): QueuedTx {
  const queue = loadQueue();
  const tx: QueuedTx = {
    ...payload,
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    status: "pending",
  };
  queue.push(tx);
  saveQueue(queue);
  return tx;
}

export function updateTxStatus(
  id: string,
  status: QueuedTx["status"],
  txHash?: string
): void {
  const queue = loadQueue();
  const idx = queue.findIndex((t) => t.id === id);
  if (idx !== -1) {
    queue[idx].status = status;
    if (txHash) queue[idx].txHash = txHash;
    saveQueue(queue);
  }
}

// ─── Broadcast ────────────────────────────────────────────────────────────────

export async function broadcastTx(tx: QueuedTx): Promise<string> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const response = await provider.broadcastTransaction(tx.signedTx);
  return response.hash;
}

export async function broadcastQueue(): Promise<void> {
  const queue = loadQueue();
  const pending = queue.filter((tx) => tx.status === "pending");
  for (const tx of pending) {
    try {
      updateTxStatus(tx.id, "broadcasting");
      const hash = await broadcastTx(tx);
      updateTxStatus(tx.id, "confirmed", hash);
    } catch (err) {
      console.error("Broadcast failed:", err);
      updateTxStatus(tx.id, "failed");
    }
  }
}

// ─── QR encoding ─────────────────────────────────────────────────────────────

export function encodePayloadForQR(payload: SignedTxPayload): string {
  // Compact JSON — signed tx is the critical field
  return JSON.stringify({
    s: payload.signedTx,
    f: payload.from,
    t: payload.to,
    v: payload.value,
    n: payload.nonce,
    c: payload.chainId,
    ts: payload.timestamp,
  });
}

export function decodeQRPayload(raw: string): SignedTxPayload {
  const d = JSON.parse(raw);
  return {
    signedTx: d.s,
    from: d.f,
    to: d.t,
    value: d.v,
    nonce: d.n,
    chainId: d.c,
    timestamp: d.ts,
  };
}
