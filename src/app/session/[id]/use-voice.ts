"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceState = "idle" | "listening" | "transcribing" | "speaking";

interface PlaybackJob {
  id: number;
  text: string;
  url: string | null;
  ready: boolean;
  error: boolean;
}

export function useVoice(opts: {
  voiceId: string | null;
  enabled: boolean;
  onTranscript: (text: string) => void;
}) {
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<PlaybackJob[]>([]);
  const jobSeq = useRef(0);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    audioRef.current = new Audio();
    audioRef.current.preload = "auto";
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const stopAllPlayback = useCallback(() => {
    for (const job of queueRef.current) {
      if (job.url) URL.revokeObjectURL(job.url);
    }
    queueRef.current = [];
    isPlayingRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
    }
  }, []);

  const playNextRef = useRef<() => void>(() => {});

  useEffect(() => {
    const run = async () => {
      if (isPlayingRef.current) return;
      const audio = audioRef.current;
      if (!audio) return;

      while (queueRef.current.length > 0) {
        const head = queueRef.current[0];
        if (!head.ready) return;
        if (head.error || !head.url) {
          queueRef.current.shift();
          continue;
        }
        break;
      }

      const next = queueRef.current[0];
      if (!next || !next.url) {
        setState((s) => (s === "speaking" ? "idle" : s));
        return;
      }

      isPlayingRef.current = true;
      setState("speaking");
      audio.src = next.url;
      try {
        await audio.play();
      } catch {
        isPlayingRef.current = false;
        setError("Audio playback blocked - tap anywhere to enable");
        return;
      }
      const onEnded = () => {
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("error", onEnded);
        const done = queueRef.current.shift();
        if (done?.url) URL.revokeObjectURL(done.url);
        isPlayingRef.current = false;
        setTimeout(() => playNextRef.current(), 0);
      };
      audio.addEventListener("ended", onEnded, { once: true });
      audio.addEventListener("error", onEnded, { once: true });
    };
    playNextRef.current = () => {
      void run();
    };
  }, []);

  const playNext = useCallback(() => {
    playNextRef.current();
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!opts.enabled) return;
      const clean = text.trim();
      if (!clean) return;
      const id = ++jobSeq.current;
      const job: PlaybackJob = { id, text: clean, url: null, ready: false, error: false };
      queueRef.current.push(job);

      try {
        const res = await fetch("/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: clean, voiceId: opts.voiceId }),
        });
        if (!res.ok) {
          job.error = true;
          job.ready = true;
          playNext();
          return;
        }
        const blob = await res.blob();
        job.url = URL.createObjectURL(blob);
        job.ready = true;
        playNext();
      } catch {
        job.error = true;
        job.ready = true;
        playNext();
      }
    },
    [opts.enabled, opts.voiceId, playNext]
  );

  const startRecording = useCallback(async () => {
    if (state === "listening") return;
    setError(null);
    stopAllPlayback();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime =
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        const stream = streamRef.current;
        if (stream) {
          for (const t of stream.getTracks()) t.stop();
          streamRef.current = null;
        }
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        if (blob.size < 1000) {
          setState("idle");
          return;
        }
        setState("transcribing");
        try {
          const form = new FormData();
          form.append("audio", blob, "audio.webm");
          const res = await fetch("/api/voice/stt", { method: "POST", body: form });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setError(data.error || "transcription failed");
            setState("idle");
            return;
          }
          const data = (await res.json()) as { text?: string };
          const text = (data.text || "").trim();
          setState("idle");
          if (text) opts.onTranscript(text);
        } catch {
          setError("could not reach transcription service");
          setState("idle");
        }
      };
      rec.start();
      setState("listening");
    } catch (e) {
      const message = (e as Error).message || "mic access denied";
      setError(message);
      setState("idle");
    }
  }, [state, opts, stopAllPlayback]);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    }
  }, []);

  useEffect(() => {
    return () => {
      stopAllPlayback();
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
      const stream = streamRef.current;
      if (stream) for (const t of stream.getTracks()) t.stop();
    };
  }, [stopAllPlayback]);

  return {
    state,
    error,
    startRecording,
    stopRecording,
    speak,
    stopSpeaking: stopAllPlayback,
  };
}
