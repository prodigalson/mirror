export type AgentType = "openclaw" | "webhook";

export interface AgentTypeMeta {
  id: AgentType;
  name: string;
  subtitle: string;
  urlLabel: string;
  urlPlaceholder: string;
  tokenLabel: string;
  tokenPlaceholder: string;
  tokenOptional: boolean;
  sessionKeyLabel: string;
  sessionKeyPlaceholder: string;
  sessionKeyOptional: boolean;
  help: string;
}

export const AGENT_TYPES: AgentTypeMeta[] = [
  {
    id: "openclaw",
    name: "OpenClaw Gateway",
    subtitle: "Connect to your running OpenClaw agent via WebSocket",
    urlLabel: "Gateway URL",
    urlPlaceholder: "ws://127.0.0.1:18789",
    tokenLabel: "Token",
    tokenPlaceholder: "OPENCLAW_GATEWAY_TOKEN (if configured)",
    tokenOptional: true,
    sessionKeyLabel: "Session key",
    sessionKeyPlaceholder: "main",
    sessionKeyOptional: true,
    help: "For remote access, expose your gateway via Tailscale or similar and use the tailnet URL. Token matches your gateway --token flag.",
  },
  {
    id: "webhook",
    name: "Webhook (Hermes / custom)",
    subtitle: "Any HTTPS endpoint that accepts a chat message and returns a reply",
    urlLabel: "Endpoint URL",
    urlPlaceholder: "https://your-agent.example.com/chat",
    tokenLabel: "Bearer token",
    tokenPlaceholder: "optional Authorization token",
    tokenOptional: true,
    sessionKeyLabel: "Session key / thread id",
    sessionKeyPlaceholder: "optional - forwarded as threadId",
    sessionKeyOptional: true,
    help: "Mirror sends POST {message, history, threadId?}. Expects either JSON {reply: string} or Server-Sent Events with text deltas.",
  },
];

export function findAgentType(id: string): AgentTypeMeta | undefined {
  return AGENT_TYPES.find((t) => t.id === id);
}

export function isValidAgentType(id: string): id is AgentType {
  return !!findAgentType(id);
}
