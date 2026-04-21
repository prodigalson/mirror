"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Mode } from "@/lib/modes";
import type { Message, Session } from "@/db/schema";

interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

function messageFromDb(m: Message): UIMessage {
  return {
    id: m.id,
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  };
}

export default function Chat({
  session,
  mode,
  initialMessages,
  gbrainEnabled,
}: {
  session: Session;
  mode: Mode;
  initialMessages: Message[];
  gbrainEnabled: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages.map(messageFromDb));
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSlug, setSavedSlug] = useState<string | null>(session.brainSlug);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    composerRef.current?.focus();
  }, []);

  async function send() {
    const content = input.trim();
    if (!content || sending) return;
    setInput("");
    setError(null);
    setSending(true);

    const tempUserId = `tmp-${Date.now()}`;
    const tempAssistantId = `tmp-a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempUserId, role: "user", content },
      { id: tempAssistantId, role: "assistant", content: "", streaming: true },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, content }),
      });

      if (!res.ok || !res.body) {
        setError("Something broke. Try again.");
        setMessages((prev) => prev.filter((m) => m.id !== tempAssistantId));
        setSending(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        for (const evt of events) {
          const lines = evt.split("\n");
          let eventType = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            else if (line.startsWith("data: ")) data = line.slice(6);
          }
          if (!data) continue;
          try {
            const parsed = JSON.parse(data);
            if (eventType === "delta" && parsed.text) {
              full += parsed.text;
              setMessages((prev) =>
                prev.map((m) => (m.id === tempAssistantId ? { ...m, content: full } : m))
              );
            } else if (eventType === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempAssistantId ? { ...m, streaming: false } : m
                )
              );
            } else if (eventType === "error") {
              setError(parsed.error || "Error streaming response");
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch {
      setError("Network error. Try again.");
      setMessages((prev) => prev.filter((m) => m.id !== tempAssistantId));
    } finally {
      setSending(false);
      router.refresh();
    }
  }

  async function saveToBrain() {
    if (saving || savedSlug) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${session.id}/save-to-brain`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not save.");
        setSaving(false);
        return;
      }
      const data = (await res.json()) as { slug: string };
      setSavedSlug(data.slug);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
          <div className="text-center pb-4">
            <p className="font-mono text-xs uppercase tracking-wider text-ink-faint mb-2">
              {mode.tagline}
            </p>
            <p className="text-lg font-serif text-ink leading-snug max-w-lg mx-auto">
              &ldquo;{session.topic}&rdquo;
            </p>
          </div>

          {messages.length === 0 && (
            <div className="text-center text-ink-muted text-sm py-10">
              <p className="max-w-md mx-auto leading-relaxed">
                Start wherever you are. The other you will meet you there.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} accent={mode.accent} />
          ))}

          <div ref={scrollRef} />
        </div>
      </div>

      <div className="border-t border-thread/40 bg-paper/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-4">
          {error && <p className="text-sm text-rose-accent mb-2">{error}</p>}
          <div className="flex items-end gap-2">
            <textarea
              ref={composerRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Say what you're thinking. Cmd+Enter to send."
              rows={2}
              className="flex-1 px-4 py-3 rounded-xl bg-paper-soft/70 border border-thread/40 text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink transition resize-none"
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || !input.trim()}
              className="px-4 py-3 rounded-xl bg-ink text-paper font-medium hover:bg-ink-muted transition disabled:opacity-40"
            >
              {sending ? <Thinking /> : "Send"}
            </button>
          </div>
          <div className="flex items-center justify-between mt-3 text-xs">
            <span className="text-ink-faint">
              {messages.length} {messages.length === 1 ? "message" : "messages"}
            </span>
            {gbrainEnabled && messages.length >= 2 && (
              <button
                type="button"
                onClick={saveToBrain}
                disabled={saving || !!savedSlug}
                className="text-ink-muted hover:text-ink transition disabled:opacity-60"
              >
                {savedSlug ? "- saved to brain" : saving ? "saving..." : "save this to brain"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, accent }: { message: UIMessage; accent: string }) {
  const isUser = message.role === "user";
  return (
    <div className={`fade-in-up flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "text-right" : "text-left"}`}>
        <div
          className={`text-xs font-mono uppercase tracking-wider mb-1.5 ${
            isUser ? "text-ink-faint" : ""
          }`}
          style={!isUser ? { color: `var(--color-${accent}-accent)` } : undefined}
        >
          {isUser ? "me" : "also me"}
        </div>
        <div
          className={`inline-block px-4 py-3 rounded-2xl leading-relaxed prose-chat whitespace-pre-wrap break-words ${
            isUser
              ? "bg-ink text-paper rounded-br-sm"
              : "bg-paper-soft border border-thread/50 text-ink rounded-bl-sm"
          }`}
        >
          {message.content || (message.streaming ? <Thinking /> : "")}
        </div>
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <span className="dot-think inline-flex items-center" aria-label="thinking">
      <span />
      <span />
      <span />
    </span>
  );
}
