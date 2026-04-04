import { AgentRequest, AgentDecision } from "@/app/api/agent/route";
export type { AgentDecision };

export async function askAgent(request: AgentRequest): Promise<AgentDecision> {
  const res = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
  return res.json();
}

export async function agentSignAndSend(to: string, amount: string, privateKey: string, nonce: number) {
  const res = await fetch("/api/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to, amount, privateKey, nonce }) });
  return res.json();
}

export interface AgentLog {
  id: string; timestamp: number;
  type: "request" | "decision" | "tx" | "error";
  content: string; approved?: boolean; txHash?: string; amount?: string; to?: string;
}

export function addLog(logs: AgentLog[], log: Omit<AgentLog, "id" | "timestamp">): AgentLog[] {
  return [...logs, { ...log, id: Math.random().toString(36).slice(2), timestamp: Date.now() }];
}
