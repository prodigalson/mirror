"use client";

import { useEffect, useState } from "react";
import { PROVIDERS, type ProviderId } from "@/lib/providers";

interface ProvidersResponse {
  anthropic: string | null;
  openai: string | null;
  providerDefault: ProviderId | null;
  serverFallback: boolean;
}

export default function ProvidersSection() {
  const [data, setData] = useState<ProvidersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ProviderId | null>(null);
  const [inputs, setInputs] = useState<Record<ProviderId, string>>({ anthropic: "", openai: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/providers")
      .then((r) => r.json() as Promise<ProvidersResponse>)
      .then((d) => {
        if (mounted) setData(d);
      })
      .catch(() => {
        if (mounted) setError("could not load");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function saveKey(provider: ProviderId) {
    const apiKey = inputs[provider].trim();
    if (!apiKey) return;
    setSaving(provider);
    setError(null);
    try {
      const res = await fetch("/api/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "failed to save key");
        setSaving(null);
        return;
      }
      setInputs((prev) => ({ ...prev, [provider]: "" }));
      setData((prev) =>
        prev ? { ...prev, [provider]: json.preview as string } : prev
      );
    } catch {
      setError("network error");
    } finally {
      setSaving(null);
    }
  }

  async function removeKey(provider: ProviderId) {
    setSaving(provider);
    setError(null);
    try {
      await fetch(`/api/providers?provider=${provider}`, { method: "DELETE" });
      setData((prev) => (prev ? { ...prev, [provider]: null } : prev));
    } finally {
      setSaving(null);
    }
  }

  async function setDefault(provider: ProviderId | null) {
    setError(null);
    try {
      await fetch("/api/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerDefault: provider }),
      });
      setData((prev) => (prev ? { ...prev, providerDefault: provider } : prev));
    } catch {
      setError("network error");
    }
  }

  if (loading) {
    return (
      <section>
        <h2 className="font-serif text-3xl mb-2">AI provider</h2>
        <p className="text-sm text-ink-faint">Loading...</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section>
        <h2 className="font-serif text-3xl mb-2">AI provider</h2>
        <p className="text-sm text-rose-accent">{error || "could not load"}</p>
      </section>
    );
  }

  const anyConfigured = !!(data.anthropic || data.openai);

  return (
    <section>
      <h2 className="font-serif text-3xl mb-2">AI provider</h2>
      <p className="text-ink-muted leading-relaxed mb-6">
        Bring your own key. Mirror bills chat against your Anthropic or OpenAI account, not ours.
        Keys are encrypted at rest and only decrypted server-side when you send a message.
      </p>

      {error && <p className="text-sm text-rose-accent mb-4">{error}</p>}

      <div className="space-y-4">
        {PROVIDERS.map((p) => {
          const configured = p.id === "anthropic" ? data.anthropic : data.openai;
          const busy = saving === p.id;
          return (
            <div
              key={p.id}
              className="p-5 rounded-xl bg-paper-soft/50 border border-thread/40"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-xl">{p.name}</span>
                    {configured && (
                      <span className="text-xs font-mono bg-emerald-accent/20 text-emerald-accent px-2 py-0.5 rounded-full">
                        connected
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-ink-faint mt-0.5">
                    default model: {p.modelLabel}
                  </div>
                </div>
                <a
                  href={p.signupUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-xs text-ink-muted hover:text-ink underline decoration-thread underline-offset-4"
                >
                  get a key
                </a>
              </div>

              {configured ? (
                <div className="flex items-center justify-between">
                  <code className="text-sm text-ink-muted font-mono">{configured}</code>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeKey(p.id)}
                    className="text-xs text-ink-faint hover:text-rose-accent transition disabled:opacity-50"
                  >
                    {busy ? "..." : "remove"}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={inputs[p.id]}
                      onChange={(e) =>
                        setInputs((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                      placeholder={p.keyPlaceholder}
                      className="flex-1 px-3 py-2 rounded-lg bg-paper border border-thread/50 text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink transition font-mono text-sm"
                    />
                    <button
                      type="button"
                      disabled={busy || !inputs[p.id].trim()}
                      onClick={() => saveKey(p.id)}
                      className="px-4 py-2 rounded-lg bg-ink text-paper font-medium hover:bg-ink-muted transition disabled:opacity-40"
                    >
                      {busy ? "testing..." : "save"}
                    </button>
                  </div>
                  <p className="text-xs text-ink-faint mt-2">{p.keyHelp}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {anyConfigured && (
        <div className="mt-6 p-4 rounded-xl bg-paper-soft/30 border border-thread/30">
          <p className="text-xs font-mono uppercase tracking-wider text-ink-faint mb-2">
            Default for new sessions
          </p>
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map((p) => {
              const configured = p.id === "anthropic" ? data.anthropic : data.openai;
              if (!configured) return null;
              const active = data.providerDefault === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDefault(p.id)}
                  className={`px-3 py-1.5 rounded-full text-sm transition border ${
                    active
                      ? "bg-ink text-paper border-ink"
                      : "bg-paper-soft/70 text-ink-muted border-thread/50 hover:border-ink/50 hover:text-ink"
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setDefault(null)}
              className={`px-3 py-1.5 rounded-full text-sm transition border ${
                data.providerDefault === null
                  ? "bg-ink text-paper border-ink"
                  : "bg-paper-soft/70 text-ink-muted border-thread/50 hover:border-ink/50 hover:text-ink"
              }`}
            >
              auto
            </button>
          </div>
        </div>
      )}

      {!anyConfigured && data.serverFallback && (
        <p className="mt-4 text-xs text-ink-faint">
          Note: no personal key yet, using a shared server fallback. Add your own to run on
          your quota.
        </p>
      )}
      {!anyConfigured && !data.serverFallback && (
        <p className="mt-4 text-sm text-rose-accent">
          You need to add at least one key to start chatting.
        </p>
      )}
    </section>
  );
}
