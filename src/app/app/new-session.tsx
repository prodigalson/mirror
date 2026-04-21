"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Mode } from "@/lib/modes";

export default function NewSession({ modes }: { modes: Mode[] }) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<string>(modes[0].id);
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
        body: JSON.stringify({ topic: clean, mode }),
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
