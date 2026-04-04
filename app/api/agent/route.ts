import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export interface AgentRequest {
  action: "purchase" | "transfer" | "query";
  item?: string;
  price?: string;
  from?: string;
  to?: string;
  amount?: string;
  agentBalance?: string;
  agentAddress?: string;
  spendingLimit?: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

export interface AgentDecision {
  approved: boolean;
  reasoning: string;
  action: "sign_and_send" | "reject" | "clarify";
  to?: string;
  amount?: string;
  message: string;
}

export async function POST(req: NextRequest) {
  const body: AgentRequest = await req.json();

  const systemPrompt = `You are an autonomous offline payment agent embedded in a crypto wallet called OffGrid Wallet.

You operate in low-connectivity environments. Your job is to:
1. Evaluate incoming commerce requests (purchases, transfers, payments)
2. Decide whether to approve or reject based on rules
3. Return a structured JSON decision

YOUR RULES:
- Never approve a transaction that exceeds the spending limit
- Never approve if balance would go below 0.001 ETH (reserve for gas)
- Approve legitimate commerce transactions autonomously
- Reject suspicious or duplicate requests
- Be brief and decisive — you are running offline with limited compute

AGENT CONTEXT:
- Agent wallet address: ${body.agentAddress || "not set"}
- Current balance: ${body.agentBalance || "unknown"} ETH
- Spending limit per tx: ${body.spendingLimit || "0.05"} ETH
- Network: Base L2 (offline queue mode)

RESPONSE FORMAT — always return valid JSON only, no markdown:
{
  "approved": true | false,
  "reasoning": "one sentence explaining decision",
  "action": "sign_and_send" | "reject" | "clarify",
  "to": "0x... recipient address if approved",
  "amount": "0.000 ETH amount as string if approved",
  "message": "human readable message shown in UI"
}`;

  const userMessage = buildUserMessage(body);
  const messages = [...(body.history || []), { role: "user" as const, content: userMessage }];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system: systemPrompt,
      messages,
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || "{}";

  let decision: AgentDecision;
  try {
    decision = JSON.parse(text);
  } catch {
    decision = {
      approved: false,
      reasoning: "Failed to parse agent response",
      action: "reject",
      message: "Agent error — transaction rejected for safety",
    };
  }

  return NextResponse.json(decision);
}

function buildUserMessage(body: AgentRequest): string {
  if (body.action === "purchase") {
    return `PURCHASE REQUEST:
Item: ${body.item}
Price: ${body.price} ETH
Merchant address: ${body.to}
Current balance: ${body.agentBalance} ETH
Spending limit: ${body.spendingLimit} ETH

Should I approve and sign this transaction?`;
  }
  if (body.action === "transfer") {
    return `TRANSFER REQUEST:
To: ${body.to}
Amount: ${body.amount} ETH
Current balance: ${body.agentBalance} ETH
Spending limit: ${body.spendingLimit} ETH

Should I approve and sign this transfer?`;
  }
  return body.from || "What is my current status?";
}
