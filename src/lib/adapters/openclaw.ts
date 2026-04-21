import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

export interface OpenClawCallOpts {
  url: string;
  token?: string | null;
  sessionKey?: string | null;
  message: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface OpenClawCallResult {
  reply: string;
  raw?: unknown;
}

export async function callOpenClawAgent(opts: OpenClawCallOpts): Promise<OpenClawCallResult> {
  const sessionKey = opts.sessionKey?.trim() || "agent:main:main";
  const idempotencyKey = `mirror-${randomUUID()}`;
  const timeoutMs = Math.max(5000, Math.min(opts.timeoutMs ?? 90_000, 300_000));

  const params = {
    message: opts.message,
    sessionKey,
    idempotencyKey,
  };

  const args = [
    "gateway",
    "call",
    "agent",
    "--params",
    JSON.stringify(params),
    "--expect-final",
    "--json",
    "--timeout",
    String(timeoutMs),
    "--url",
    opts.url,
  ];
  if (opts.token) args.push("--token", opts.token);

  return new Promise<OpenClawCallResult>((resolve, reject) => {
    const child = spawn("openclaw", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const kill = () => {
      if (!child.killed) {
        try {
          child.kill("SIGTERM");
        } catch {
          // ignore
        }
      }
    };

    const abortHandler = () => {
      if (settled) return;
      settled = true;
      kill();
      reject(new Error("aborted"));
    };

    if (opts.signal) {
      if (opts.signal.aborted) return abortHandler();
      opts.signal.addEventListener("abort", abortHandler, { once: true });
    }

    child.stdout.on("data", (b: Buffer) => {
      stdout += b.toString();
    });
    child.stderr.on("data", (b: Buffer) => {
      stderr += b.toString();
    });
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      opts.signal?.removeEventListener("abort", abortHandler);
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(
          new Error(
            "openclaw CLI not found on the server. Install it with `npm i -g openclaw` on the machine running Mirror."
          )
        );
        return;
      }
      reject(err);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      opts.signal?.removeEventListener("abort", abortHandler);

      if (code !== 0) {
        const tail = stderr.trim().split(/\r?\n/).slice(-3).join("\n") || stdout.trim().slice(-500);
        reject(new Error(`openclaw exited with code ${code}: ${tail}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        const reply =
          parsed?.result?.meta?.finalAssistantVisibleText ??
          parsed?.result?.meta?.finalAssistantRawText ??
          parsed?.finalAssistantVisibleText ??
          "";
        const clean = String(reply).trim();
        if (!clean) {
          reject(new Error("openclaw returned no reply text"));
          return;
        }
        resolve({ reply: clean, raw: parsed });
      } catch (e) {
        reject(new Error(`failed to parse openclaw output: ${(e as Error).message}`));
      }
    });
  });
}
