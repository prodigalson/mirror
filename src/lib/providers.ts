import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { decryptSecret } from "@/lib/crypto";

export type ProviderId = "anthropic" | "openai";

export interface ProviderMeta {
  id: ProviderId;
  name: string;
  keyPlaceholder: string;
  keyPrefix: string;
  keyHelp: string;
  signupUrl: string;
  model: string;
  modelLabel: string;
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    keyPlaceholder: "sk-ant-...",
    keyPrefix: "sk-ant-",
    keyHelp: "Get a key at console.anthropic.com. Billed against your Anthropic account, not ours.",
    signupUrl: "https://console.anthropic.com/settings/keys",
    model: "claude-sonnet-4-6",
    modelLabel: "Claude Sonnet 4.6",
  },
  {
    id: "openai",
    name: "OpenAI",
    keyPlaceholder: "sk-...",
    keyPrefix: "sk-",
    keyHelp: "Get a key at platform.openai.com. Billed against your OpenAI account, not ours.",
    signupUrl: "https://platform.openai.com/api-keys",
    model: "gpt-5.1",
    modelLabel: "GPT-5.1",
  },
];

export function isValidProvider(id: string): id is ProviderId {
  return id === "anthropic" || id === "openai";
}

export function findProvider(id: string): ProviderMeta | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export interface UserProviderRow {
  anthropicKey: string | null;
  openaiKey: string | null;
  providerDefault: string | null;
}

export interface ResolvedProvider {
  provider: ProviderId;
  apiKey: string;
  source: "user" | "server";
}

export function resolveProvider(
  row: UserProviderRow,
  preferred?: ProviderId | null
): ResolvedProvider | null {
  const pick = (p: ProviderId): ResolvedProvider | null => {
    if (p === "anthropic" && row.anthropicKey) {
      return { provider: "anthropic", apiKey: decryptSecret(row.anthropicKey), source: "user" };
    }
    if (p === "openai" && row.openaiKey) {
      return { provider: "openai", apiKey: decryptSecret(row.openaiKey), source: "user" };
    }
    return null;
  };

  if (preferred) {
    const found = pick(preferred);
    if (found) return found;
  }

  const def = row.providerDefault;
  if (def === "anthropic" || def === "openai") {
    const found = pick(def);
    if (found) return found;
  }

  const any = pick("anthropic") || pick("openai");
  if (any) return any;

  const serverKey = process.env.ANTHROPIC_API_KEY;
  if (serverKey) {
    return { provider: "anthropic", apiKey: serverKey, source: "server" };
  }

  return null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamOpts {
  provider: ProviderId;
  apiKey: string;
  system: string;
  messages: ChatMessage[];
  onDelta: (text: string) => void;
  signal?: AbortSignal;
  maxTokens?: number;
}

export async function streamProviderChat(opts: StreamOpts): Promise<void> {
  if (opts.provider === "anthropic") {
    const client = new Anthropic({ apiKey: opts.apiKey });
    const meta = findProvider("anthropic")!;
    const response = await client.messages.stream({
      model: meta.model,
      max_tokens: opts.maxTokens ?? 1024,
      system: opts.system,
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    for await (const chunk of response) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        opts.onDelta(chunk.delta.text);
      }
    }
    return;
  }

  const client = new OpenAI({ apiKey: opts.apiKey });
  const meta = findProvider("openai")!;
  const stream = await client.chat.completions.create({
    model: meta.model,
    stream: true,
    max_tokens: opts.maxTokens ?? 1024,
    messages: [
      { role: "system", content: opts.system },
      ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });
  for await (const event of stream) {
    const text = event.choices?.[0]?.delta?.content;
    if (typeof text === "string" && text.length > 0) opts.onDelta(text);
  }
}

export async function testProviderKey(provider: ProviderId, apiKey: string): Promise<boolean> {
  try {
    if (provider === "anthropic") {
      const client = new Anthropic({ apiKey });
      await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 5,
        messages: [{ role: "user", content: "hi" }],
      });
      return true;
    }
    const client = new OpenAI({ apiKey });
    await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 5,
      messages: [{ role: "user", content: "hi" }],
    });
    return true;
  } catch {
    return false;
  }
}
