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

interface ProvidersInfo {
  anthropic: boolean;
  openai: boolean;
  default: string | null;
}

type TalkTo =
  | { kind: "provider"; id: "anthropic" | "openai" | "auto" }
  | { kind: "agent"; id: string };

export default function NewSession({
  modes,
  agents,
  providers,
}: {
  modes: Mode[];
  agents: AgentOption[];
  providers: ProvidersInfo;
}) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<string>(modes[0].id);
  const initialTalkTo: TalkTo = providers.anthropic || providers.openai
    ? { kind: "provider", id: "auto" }
    : agents[0]
      ? { kind: "agent", id: agents[0].id }
      : { kind: "provider", id: "auto" };
  const [talkTo, setTalkTo] = useState<TalkTo>(initialTalkTo);
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
      const body: Record<string, unknown> = { topic: clean, mode };
      if (talkTo.kind === "agent") {
        body.agentEndpointId = talkTo.id;
      } else if (talkTo.kind === "provider" && talkTo.id !== "auto") {
        body.provider = talkTo.id;
      }
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
          {(providers.anthropic || providers.openai) && (
            <PillButton
              active={talkTo.kind === "provider" && talkTo.id === "auto"}
              onClick={() => setTalkTo({ kind: "provider", id: "auto" })}
            >
              your default
            </PillButton>
          )}
          {providers.anthropic && (
            <PillButton
              active={talkTo.kind === "provider" && talkTo.id === "anthropic"}
              onClick={() => setTalkTo({ kind: "provider", id: "anthropic" })}
            >
              Claude (your key)
            </PillButton>
          )}
          {providers.openai && (
            <PillButton
              active={talkTo.kind === "provider" && talkTo.id === "openai"}
              onClick={() => setTalkTo({ kind: "provider", id: "openai" })}
            >
              OpenAI (your key)
            </PillButton>
          )}
          {agents.map((a) => (
            <PillButton
              key={a.id}
              active={talkTo.kind === "agent" && talkTo.id === a.id}
              onClick={() => setTalkTo({ kind: "agent", id: a.id })}
              title={a.type}
            >
              {a.name}{" "}
              <span className="text-xs opacity-60 font-mono ml-1">{a.type}</span>
            </PillButton>
          ))}
          {!providers.anthropic && !providers.openai && agents.length === 0 && (
            <Link
              href="/app/settings"
              className="text-sm text-ink-faint hover:text-ink underline decoration-thread underline-offset-4 transition"
            >
              + add a provider key or agent
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

function PillButton({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-3 py-1.5 rounded-full text-sm transition border ${
        active
          ? "bg-ink text-paper border-ink"
          : "bg-paper-soft/70 text-ink-muted border-thread/50 hover:border-ink/50 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
