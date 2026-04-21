import { getSession } from "@/lib/auth";
import { isGbrainEnabled } from "@/lib/gbrain";
import { isElevenLabsConfigured } from "@/lib/elevenlabs";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  return Response.json({
    user: session,
    gbrainEnabled: isGbrainEnabled(),
    voiceConfigured: isElevenLabsConfigured(),
  });
}
