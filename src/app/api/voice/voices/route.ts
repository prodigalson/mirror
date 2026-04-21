import { isElevenLabsConfigured, listVoices } from "@/lib/elevenlabs";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireSession();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!isElevenLabsConfigured()) {
    return Response.json({ configured: false, voices: [] });
  }

  try {
    const voices = await listVoices();
    return Response.json({
      configured: true,
      voices: voices.map((v) => ({
        id: v.voice_id,
        name: v.name,
        category: v.category,
        previewUrl: v.preview_url,
      })),
    });
  } catch (e) {
    return Response.json(
      { configured: true, voices: [], error: (e as Error).message },
      { status: 500 }
    );
  }
}
