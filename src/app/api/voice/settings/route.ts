import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureSchema } from "@/db";
import { users } from "@/db/schema";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
  await ensureSchema();

  const row = (await db.select().from(users).where(eq(users.id, session.userId)).limit(1))[0];
  return Response.json({
    voiceEnabled: row?.voiceEnabled ?? false,
    voiceId: row?.voiceId ?? null,
  });
}

export async function PUT(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
  await ensureSchema();

  const body = (await req.json()) as { voiceEnabled?: boolean; voiceId?: string | null };
  const updates: { voiceEnabled?: boolean; voiceId?: string | null } = {};
  if (typeof body.voiceEnabled === "boolean") updates.voiceEnabled = body.voiceEnabled;
  if (typeof body.voiceId === "string") updates.voiceId = body.voiceId || null;
  if (body.voiceId === null) updates.voiceId = null;

  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, session.userId));
  }

  return Response.json({ ok: true });
}
