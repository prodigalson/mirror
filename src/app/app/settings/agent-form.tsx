"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentTypeMeta } from "@/lib/agents";

export default function AgentForm({ types }: { types: AgentTypeMeta[] }) {
  const router = useRouter();
  const [type, setType] = useState(types[0].id);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [sessionKey, setSessionKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = useMemo(() => types.find((t) => t.id === type) || types[0], [type, types]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          url: url.trim(),
          token: token.trim() || null,
          sessionKey: sessionKey.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "failed" }));
        setError(data.error || "failed to add");
        setLoading(false);
        return;
      }
      setName("");
      setUrl("");
      setToken("");
      setSessionKey("");
      router.refresh();
    } catch {
      setError("network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 p-5 rounded-xl bg-paper-soft/50 border border-thread/40">
      <div className="flex flex-wrap gap-2">
        {types.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(t.id)}
            className={`px-3 py-1.5 rounded-full text-sm transition border ${
              type === t.id
                ? "bg-ink text-paper border-ink"
                : "bg-paper border-thread/50 text-ink-muted hover:text-ink hover:border-ink/50"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <p className="text-sm text-ink-muted">{meta.subtitle}</p>

      <LabeledInput label="Name" value={name} onChange={setName} placeholder="my main agent" required />
      <LabeledInput
        label={meta.urlLabel}
        value={url}
        onChange={setUrl}
        placeholder={meta.urlPlaceholder}
        required
      />
      <LabeledInput
        label={meta.tokenLabel}
        value={token}
        onChange={setToken}
        placeholder={meta.tokenPlaceholder}
        type="password"
        required={!meta.tokenOptional}
      />
      <LabeledInput
        label={meta.sessionKeyLabel}
        value={sessionKey}
        onChange={setSessionKey}
        placeholder={meta.sessionKeyPlaceholder}
        required={!meta.sessionKeyOptional}
      />

      <p className="text-xs text-ink-faint leading-relaxed">{meta.help}</p>

      {error && <p className="text-sm text-rose-accent">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || !name.trim() || !url.trim()}
          className="px-5 py-2 rounded-full bg-ink text-paper font-medium hover:bg-ink-muted transition disabled:opacity-40"
        >
          {loading ? "..." : "Add agent"}
        </button>
      </div>
    </form>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-mono uppercase tracking-wider text-ink-faint mb-1.5">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 rounded-lg bg-paper border border-thread/50 text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink transition"
      />
    </label>
  );
}
