"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Mode } from "@/lib/modes";
import type { Message, Session } from "@/db/schema";
import { useVoice } from "./use-voice";

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
  voiceConfigured,
  voiceEnabledDefault,
  voiceIdDefault,
}: {
  session: Session;
  mode: Mode;
  initialMessages: Message[];
  gbrainEnabled: boolean;
  voiceConfigured: boolean;
  voiceEnabledDefault: boolean;
  voiceIdDefault: string | null;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages.map(messageFromDb));
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSlug, setSavedSlug] = useState<string | null>(session.brainSlug);
  const [error, setError] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState<boolean>(voiceConfigured && voiceEnabledDefault);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const voice = useVoice({
    voiceId: voiceIdDefault,
    enabled: voiceOn,
    onTranscript: (text) => {
      setInput("");
      void send(text);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    composerRef.current?.focus();
  }, []);

  async function send(overrideText?: string) {
    const content = (overrideText ?? input).trim();
    if (!content || sending) return;
    if (!overrideText) setInput("");
    setError(null);
    setSending(true);
    voice.stopSpeaking();

    const tempUserId = `tmp-${Date.now()}`;
    const tempAssistantId = `tmp-a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempUserId, role: "user", content },
      { id: tempAssistantId, role: "assistant", content: "", streaming: true },
    ]);

    let spokenOffset = 0;
    let full = "";
    const flushSentences = (final: boolean) => {
      if (!voiceOn) return;
      while (spokenOffset < full.length) {
        const remaining = full.slice(spokenOffset);
        let boundary = -1;
        if (final) {
          boundary = remaining.length;
        } else {
          const match = remaining.match(/[.!?\n][)\]"'"'']?(?:\s|$)/);
          if (match && match.index !== undefined) boundary = match.index + match[0].length;
        }
        if (boundary <= 0) break;
        const chunk = remaining.slice(0, boundary).trim();
        spokenOffset += boundary;
        if (chunk.length >= 2) void voice.speak(chunk);
      }
    };

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
              flushSentences(false);
            } else if (eventType === "done") {
              flushSentences(true);
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

  function toggleMic() {
    if (voice.state === "listening") voice.stopRecording();
    else void voice.startRecording();
  }

  function toggleVoice() {
    const next = !voiceOn;
    setVoiceOn(next);
    if (!next) voice.stopSpeaking();
    void fetch("/api/voice/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voiceEnabled: next }),
    });
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
                {voiceConfigured && (
                  <>
                    <br />
                    <span className="text-ink-faint">
                      Tap the mic to speak instead of type.
                    </span>
                  </>
                )}
              </p>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              accent={mode.accent}
              speaking={voice.state === "speaking" && m.role === "assistant" && m.streaming === false}
            />
          ))}

          <div ref={scrollRef} />
        </div>
      </div>

      <div className="border-t border-thread/40 bg-paper/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-4">
          {error && <p className="text-sm text-rose-accent mb-2">{error}</p>}
          {voice.error && <p className="text-sm text-rose-accent mb-2">{voice.error}</p>}

          {voice.state !== "idle" && (
            <div className="mb-2 flex items-center gap-2 text-xs text-ink-muted">
              <span className="inline-flex gap-1">
                <VoiceOrb state={voice.state} accent={mode.accent} />
              </span>
              <span>
                {voice.state === "listening" && "listening..."}
                {voice.state === "transcribing" && "transcribing..."}
                {voice.state === "speaking" && "speaking..."}
              </span>
              {voice.state === "speaking" && (
                <button
                  type="button"
                  onClick={voice.stopSpeaking}
                  className="ml-auto text-xs text-ink-faint hover:text-ink transition"
                >
                  stop
                </button>
              )}
            </div>
          )}

          <div className="flex items-end gap-2">
            {voiceConfigured && (
              <button
                type="button"
                onClick={toggleMic}
                disabled={voice.state === "transcribing"}
                title={voice.state === "listening" ? "stop recording" : "start recording"}
                className={`flex items-center justify-center w-12 h-12 rounded-full border transition ${
                  voice.state === "listening"
                    ? "bg-rose-accent text-paper border-rose-accent animate-pulse"
                    : "bg-paper-soft border-thread/50 text-ink hover:border-ink/50"
                }`}
              >
                <MicIcon />
              </button>
            )}
            <textarea
              ref={composerRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={
                voiceConfigured ? "Type or tap the mic. Cmd+Enter to send." : "Say what you're thinking. Cmd+Enter to send."
              }
              rows={2}
              className="flex-1 px-4 py-3 rounded-xl bg-paper-soft/70 border border-thread/40 text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink transition resize-none"
            />
            <button
              type="button"
              onClick={() => void send()}
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
            <div className="flex items-center gap-4">
              {voiceConfigured && (
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`flex items-center gap-1.5 transition ${
                    voiceOn ? "text-ink" : "text-ink-faint hover:text-ink"
                  }`}
                  title="toggle voice replies"
                >
                  <SpeakerIcon muted={!voiceOn} />
                  {voiceOn ? "voice on" : "voice off"}
                </button>
              )}
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
    </div>
  );
}

function MessageBubble({
  message,
  accent,
  speaking,
}: {
  message: UIMessage;
  accent: string;
  speaking?: boolean;
}) {
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
          {isUser ? "me" : speaking ? "also me - speaking" : "also me"}
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

function VoiceOrb({ state, accent }: { state: "listening" | "transcribing" | "speaking" | "idle"; accent: string }) {
  const color = state === "listening" ? "var(--color-rose-accent)" : `var(--color-${accent}-accent)`;
  return (
    <span
      className="inline-block w-2 h-2 rounded-full"
      style={{
        background: color,
        animation: state === "idle" ? undefined : "think 1.2s infinite",
      }}
    />
  );
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 11v1a7 7 0 0 0 14 0v-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SpeakerIcon({ muted }: { muted?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 10v4h3l5 4V6L7 10H4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      {!muted && (
        <>
          <path d="M16 8c1.5 1.3 2 2.7 2 4s-.5 2.7-2 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M19 6c2.5 2 3 4 3 6s-.5 4-3 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </>
      )}
      {muted && <line x1="17" y1="8" x2="23" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
      {muted && <line x1="23" y1="8" x2="17" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
    </svg>
  );
}
