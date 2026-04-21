"use client";

import { useEffect, useRef, useState } from "react";

interface Voice {
  id: string;
  name: string;
  category?: string;
  previewUrl?: string | null;
}

interface VoiceSettingsResponse {
  voiceEnabled: boolean;
  voiceId: string | null;
}

interface VoicesResponse {
  configured: boolean;
  voices: Voice[];
  error?: string;
}

export default function VoiceSection() {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [settings, setSettings] = useState<VoiceSettingsResponse>({
    voiceEnabled: false,
    voiceId: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch("/api/voice/voices").then((r) => r.json() as Promise<VoicesResponse>),
      fetch("/api/voice/settings").then((r) => r.json() as Promise<VoiceSettingsResponse>),
    ])
      .then(([voicesRes, settingsRes]) => {
        if (!mounted) return;
        setConfigured(voicesRes.configured);
        setVoices(voicesRes.voices || []);
        if (voicesRes.error) setError(voicesRes.error);
        setSettings(settingsRes);
      })
      .catch(() => {
        if (mounted) setError("could not load voice settings");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function saveSettings(next: Partial<VoiceSettingsResponse>) {
    const merged = { ...settings, ...next };
    setSettings(merged);
    setSaving(true);
    try {
      await fetch("/api/voice/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    } finally {
      setSaving(false);
    }
  }

  async function preview(voiceId: string) {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const v = voices.find((x) => x.id === voiceId);
    if (v?.previewUrl) {
      const a = new Audio(v.previewUrl);
      audioRef.current = a;
      setPreviewId(voiceId);
      a.onended = () => setPreviewId(null);
      a.onerror = () => setPreviewId(null);
      try {
        await a.play();
        return;
      } catch {
        audioRef.current = null;
        setPreviewId(null);
      }
    }
    // fallback: synthesize a short sample via Mirror's TTS
    setPreviewId(voiceId);
    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Hi. This is the voice you picked to talk back to you.",
          voiceId,
        }),
      });
      if (!res.ok) {
        setPreviewId(null);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      audioRef.current = a;
      a.onended = () => {
        URL.revokeObjectURL(url);
        setPreviewId(null);
      };
      a.onerror = () => {
        URL.revokeObjectURL(url);
        setPreviewId(null);
      };
      await a.play();
    } catch {
      setPreviewId(null);
    }
  }

  if (loading) {
    return (
      <section>
        <h2 className="font-serif text-3xl mb-2">Voice</h2>
        <p className="text-sm text-ink-faint">Loading...</p>
      </section>
    );
  }

  if (!configured) {
    return (
      <section>
        <h2 className="font-serif text-3xl mb-2">Voice</h2>
        <p className="text-ink-muted leading-relaxed">
          Talk to yourself out loud. Mirror uses ElevenLabs for speech-to-text and text-to-speech, so your
          side of the conversation can be spoken and the other-you can speak back.
        </p>
        <p className="mt-4 text-sm text-ink-faint">
          Not configured. Set the <code className="bg-paper-soft px-1 py-0.5 rounded">ELEVENLABS_API_KEY</code>{" "}
          environment variable to enable voice.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2 gap-4">
        <h2 className="font-serif text-3xl">Voice</h2>
        <label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer">
          <input
            type="checkbox"
            checked={settings.voiceEnabled}
            onChange={(e) => saveSettings({ voiceEnabled: e.target.checked })}
            className="accent-ink w-4 h-4"
          />
          default voice on
        </label>
      </div>
      <p className="text-ink-muted leading-relaxed mb-6">
        Pick a voice for the other-you to speak with. You can toggle voice on or off per session with the
        speaker icon in the chat. Your voice input is transcribed via ElevenLabs Scribe.
      </p>

      {error && <p className="text-sm text-rose-accent mb-4">{error}</p>}

      <div className="grid sm:grid-cols-2 gap-2">
        {voices.map((v) => {
          const picked = settings.voiceId === v.id;
          return (
            <div
              key={v.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                picked
                  ? "bg-paper-soft border-ink"
                  : "bg-paper-soft/40 border-thread/40 hover:border-thread"
              }`}
            >
              <button
                type="button"
                onClick={() => void saveSettings({ voiceId: v.id })}
                className="flex-1 text-left"
              >
                <div className="font-medium text-sm">{v.name}</div>
                {v.category && (
                  <div className="text-xs font-mono uppercase tracking-wider text-ink-faint mt-0.5">
                    {v.category}
                  </div>
                )}
              </button>
              <button
                type="button"
                onClick={() => void preview(v.id)}
                className="text-xs px-2 py-1 rounded-full border border-thread/50 text-ink-muted hover:text-ink hover:border-ink/50 transition"
              >
                {previewId === v.id ? "..." : "preview"}
              </button>
            </div>
          );
        })}
      </div>

      {saving && <p className="text-xs text-ink-faint mt-3">saving...</p>}
    </section>
  );
}
