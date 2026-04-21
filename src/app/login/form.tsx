"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "login failed" }));
        setError(data.error || "login failed");
        setLoading(false);
        return;
      }
      router.push(nextPath || "/app");
      router.refresh();
    } catch {
      setError("network error");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-ink-faint mb-2">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="username"
          required
          className="w-full px-4 py-3 rounded-lg bg-paper-soft border border-thread/60 text-ink focus:outline-none focus:border-ink transition"
          placeholder="you"
        />
      </div>
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-ink-faint mb-2">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          minLength={6}
          className="w-full px-4 py-3 rounded-lg bg-paper-soft border border-thread/60 text-ink focus:outline-none focus:border-ink transition"
          placeholder="at least 6 characters"
        />
      </div>
      {error && <p className="text-sm text-rose-accent">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg bg-ink text-paper font-medium hover:bg-ink-muted transition disabled:opacity-50"
      >
        {loading ? "..." : "Enter"}
      </button>
    </form>
  );
}
