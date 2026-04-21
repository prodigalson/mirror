export interface WebhookCallOpts {
  url: string;
  token?: string | null;
  sessionKey?: string | null;
  message: string;
  history: Array<{ role: string; content: string }>;
  mode?: string;
  signal?: AbortSignal;
}

export interface WebhookCallResult {
  reply: string;
  stream?: ReadableStream<string>;
}

export interface WebhookStreamCallback {
  onDelta: (text: string) => void;
}

export async function callWebhookAgent(
  opts: WebhookCallOpts,
  stream?: WebhookStreamCallback
): Promise<WebhookCallResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  const body = JSON.stringify({
    message: opts.message,
    history: opts.history,
    threadId: opts.sessionKey || undefined,
    sessionKey: opts.sessionKey || undefined,
    mode: opts.mode,
  });

  const res = await fetch(opts.url, {
    method: "POST",
    headers,
    body,
    signal: opts.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`webhook returned ${res.status}: ${text.slice(0, 200)}`);
  }

  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("text/event-stream") && res.body) {
    let full = "";
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";
      for (const block of parts) {
        const lines = block.split("\n");
        let data = "";
        for (const line of lines) {
          if (line.startsWith("data:")) data += line.slice(5).trimStart();
        }
        if (!data || data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const delta = extractDelta(parsed);
          if (delta) {
            full += delta;
            stream?.onDelta(delta);
          }
        } catch {
          full += data;
          stream?.onDelta(data);
        }
      }
    }
    return { reply: full };
  }

  const json = (await res.json()) as unknown;
  const reply = extractReply(json);
  if (!reply) {
    throw new Error("webhook response had no 'reply', 'message', or 'text' field");
  }
  if (stream) stream.onDelta(reply);
  return { reply };
}

function extractReply(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    for (const key of ["reply", "message", "text", "content", "response", "output"]) {
      const candidate = obj[key];
      if (typeof candidate === "string" && candidate.trim()) return candidate;
    }
    if (obj.choices && Array.isArray(obj.choices)) {
      const first = obj.choices[0] as Record<string, unknown> | undefined;
      if (first) {
        const msg = first.message as Record<string, unknown> | undefined;
        const text = first.text;
        if (msg && typeof msg.content === "string") return msg.content;
        if (typeof text === "string") return text;
      }
    }
  }
  return "";
}

function extractDelta(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    for (const key of ["delta", "text", "content", "chunk"]) {
      const candidate = obj[key];
      if (typeof candidate === "string") return candidate;
    }
    if (obj.choices && Array.isArray(obj.choices)) {
      const first = obj.choices[0] as Record<string, unknown> | undefined;
      if (first) {
        const delta = first.delta as Record<string, unknown> | undefined;
        if (delta && typeof delta.content === "string") return delta.content;
      }
    }
  }
  return "";
}
