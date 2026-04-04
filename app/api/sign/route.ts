import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

export const runtime = "nodejs";

const RPC_URL = process.env.RPC_URL || "https://sepolia.base.org";
const CHAIN_ID = parseInt(process.env.CHAIN_ID || "84532");

export async function POST(req: NextRequest) {
  const { to, amount, privateKey, nonce } = await req.json();

  if (!to || !amount || !privateKey) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const wallet = new ethers.Wallet(privateKey);
    const value = ethers.parseEther(amount);

    const tx = {
      to,
      value,
      nonce: nonce || 0,
      gasLimit: 21000n,
      maxFeePerGas: ethers.parseUnits("0.1", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("0.01", "gwei"),
      chainId: CHAIN_ID,
      type: 2,
    };

    const signedTx = await wallet.signTransaction(tx);

    let txHash: string | null = null;
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const response = await provider.broadcastTransaction(signedTx);
      txHash = response.hash;
    } catch {
      // offline — return signed tx for queue
    }

    return NextResponse.json({
      signedTx,
      txHash,
      from: wallet.address,
      to,
      amount,
      nonce,
      chainId: CHAIN_ID,
      queued: !txHash,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
        }
