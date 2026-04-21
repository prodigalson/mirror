import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { isElevenLabsConfigured, transcribe } from "@/lib/elevenlabs";

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

  const form = await req.formData();
  const file = form.get("audio");
  if (!(file instanceof Blob)) {
    return Response.json({ error: "audio blob required" }, { status: 400 });
  }
  if (file.size < 1000) {
    return Response.json({ error: "recording too short" }, { status: 400 });
  }

  try {
    const filename =
      typeof (file as File).name === "string" && (file as File).name.length > 0
        ? (file as File).name
        : "audio.webm";
    const result = await transcribe(file, filename);
    return Response.json({ text: result.text, languageCode: result.language_code });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
