const BASE_URL = "https://api.elevenlabs.io";
export const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George - warm, grounded, widely available default

export function isElevenLabsConfigured(): boolean {
  return !!process.env.ELEVENLABS_API_KEY;
}

function apiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  return key;
}

export interface VoiceSummary {
  voice_id: string;
  name: string;
  category?: string;
  preview_url?: string | null;
  labels?: Record<string, string>;
}

export async function listVoices(): Promise<VoiceSummary[]> {
  const res = await fetch(`${BASE_URL}/v2/voices?page_size=100&sort=name`, {
    headers: { "xi-api-key": apiKey() },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ElevenLabs voices: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { voices?: VoiceSummary[] };
  return data.voices || [];
}

export interface TtsOpts {
  text: string;
  voiceId: string;
  modelId?: string;
  outputFormat?: string;
  stability?: number;
  similarityBoost?: number;
  signal?: AbortSignal;
}

export async function streamTts(opts: TtsOpts): Promise<Response> {
  const voiceId = opts.voiceId || DEFAULT_VOICE_ID;
  const outputFormat = opts.outputFormat || "mp3_44100_128";
  const url = `${BASE_URL}/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=${outputFormat}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey(),
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: opts.text,
      model_id: opts.modelId || "eleven_turbo_v2_5",
      voice_settings: {
        stability: opts.stability ?? 0.45,
        similarity_boost: opts.similarityBoost ?? 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS: ${res.status} ${text.slice(0, 200)}`);
  }
  return res;
}

export interface SttResult {
  text: string;
  language_code?: string;
}

export async function transcribe(file: Blob, filename = "audio.webm"): Promise<SttResult> {
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("file", file, filename);

  const res = await fetch(`${BASE_URL}/v1/speech-to-text`, {
    method: "POST",
    headers: { "xi-api-key": apiKey() },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ElevenLabs STT: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as SttResult;
  return data;
}
