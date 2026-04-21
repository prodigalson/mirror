"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Endpoint {
  id: string;
  name: string;
  type: string;
  url: string;
  token: string | null;
  sessionKey: string | null;
}

export default function AgentList({ endpoints }: { endpoints: Endpoint[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  if (endpoints.length === 0) {
    return (
      <p className="text-sm text-ink-faint italic">No agents connected yet. Add one below.</p>
    );
  }

  async function onDelete(id: string) {
    setBusy(id);
    try {
      await fetch(`/api/agents/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      {endpoints.map((e) => (
        <div
          key={e.id}
          className="flex items-center gap-4 p-4 rounded-lg bg-paper-soft/60 border border-thread/40"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-ink">{e.name}</span>
              <span className="text-xs font-mono uppercase tracking-wider text-ink-faint">
                {e.type}
              </span>
            </div>
            <div className="text-xs text-ink-faint font-mono truncate mt-1">{e.url}</div>
            {e.sessionKey && (
              <div className="text-xs text-ink-faint mt-0.5">session: {e.sessionKey}</div>
            )}
          </div>
          <button
            type="button"
            disabled={busy === e.id}
            onClick={() => onDelete(e.id)}
            className="text-xs text-ink-faint hover:text-rose-accent transition disabled:opacity-50"
          >
            {busy === e.id ? "..." : "remove"}
          </button>
        </div>
      ))}
    </div>
  );
}
