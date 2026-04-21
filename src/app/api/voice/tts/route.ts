import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { DEFAULT_VOICE_ID, isElevenLabsConfigured, streamTts } from "@/lib/elevenlabs";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    await requireSession();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!isElevenLabsConfigured()) {
    return Response.json({ error: "voice not configured" }, { status: 503 });
  }

  const body = (await req.json()) as { text?: string; voiceId?: string };
  const text = (body.text || "").trim();
  if (!text) return Response.json({ error: "text required" }, { status: 400 });
  if (text.length > 2500) {
    return Response.json({ error: "text too long (>2500)" }, { status: 413 });
  }

  try {
    const upstream = await streamTts({
      text,
      voiceId: body.voiceId || DEFAULT_VOICE_ID,
      signal: req.signal,
    });

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
