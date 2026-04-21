"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Mode } from "@/lib/modes";

interface AgentOption {
  id: string;
  name: string;
  type: string;
}

export default function NewSession({
  modes,
  agents,
}: {
  modes: Mode[];
  agents: AgentOption[];
}) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<string>(modes[0].id);
  const [agentId, setAgentId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onStart() {
    const clean = topic.trim();
    if (!clean) {
      setError("Say something first.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: clean,
          mode,
          agentEndpointId: agentId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not start.");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { id: string };
      router.push(`/session/${data.id}`);
    } catch {
      setError("network error");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="I've been stuck on whether to..."
          rows={3}
          className="w-full px-5 py-4 rounded-xl bg-paper-soft/70 border border-thread/50 text-ink placeholder:text-ink-faint text-lg leading-relaxed focus:outline-none focus:border-ink focus:bg-paper-soft transition resize-none"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`px-3.5 py-1.5 rounded-full text-sm transition border ${
              mode === m.id
                ? "bg-ink text-paper border-ink"
                : "bg-paper-soft/70 text-ink-muted border-thread/50 hover:border-ink/50 hover:text-ink"
            }`}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle"
              style={{ background: mode === m.id ? "currentColor" : `var(--color-${m.accent}-accent)` }}
            />
            {m.name}
          </button>
        ))}
      </div>

      <div>
        <p className="text-xs font-mono uppercase tracking-wider text-ink-faint mb-2">
          Who replies
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAgentId("")}
            className={`px-3 py-1.5 rounded-full text-sm transition border ${
              agentId === ""
                ? "bg-ink text-paper border-ink"
                : "bg-paper-soft/70 text-ink-muted border-thread/50 hover:border-ink/50 hover:text-ink"
            }`}
          >
            Claude (default)
          </button>
          {agents.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAgentId(a.id)}
              className={`px-3 py-1.5 rounded-full text-sm transition border ${
                agentId === a.id
                  ? "bg-ink text-paper border-ink"
                  : "bg-paper-soft/70 text-ink-muted border-thread/50 hover:border-ink/50 hover:text-ink"
              }`}
              title={a.type}
            >
              {a.name}{" "}
              <span className="text-xs opacity-60 font-mono ml-1">{a.type}</span>
            </button>
          ))}
          {agents.length === 0 && (
            <Link
              href="/app/settings"
              className="text-sm text-ink-faint hover:text-ink underline decoration-thread underline-offset-4 transition"
            >
              + connect your own agent
            </Link>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-rose-accent">{error}</p>}
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-faint font-mono">
          {modes.find((m) => m.id === mode)?.tagline}
        </p>
        <button
          type="button"
          onClick={onStart}
          disabled={loading || !topic.trim()}
          className="px-5 py-2.5 rounded-full bg-ink text-paper font-medium hover:bg-ink-muted transition disabled:opacity-40"
        >
          {loading ? "..." : "Begin"}
        </button>
      </div>
    </div>
  );
}
