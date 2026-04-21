import type { NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions as sessionsTable, messages as messagesTable } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { isGbrainEnabled, saveSessionToBrain } from "@/lib/gbrain";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireSession();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!isGbrainEnabled()) {
    return Response.json({ error: "gbrain not configured" }, { status: 400 });
  }

  const { id } = await ctx.params;
  const sessionRows = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, id), eq(sessionsTable.userId, user.userId)))
    .limit(1);
  const session = sessionRows[0];
  if (!session) return new Response("Not found", { status: 404 });

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.sessionId, id))
    .orderBy(asc(messagesTable.createdAt));

  if (msgs.length === 0) return Response.json({ error: "empty session" }, { status: 400 });

  const slug = await saveSessionToBrain({
    title: session.title,
    mode: session.mode,
    topic: session.topic,
    messages: msgs.map((m) => ({ role: m.role, content: m.content })),
  });

  if (!slug) return Response.json({ error: "save failed" }, { status: 500 });

  await db
    .update(sessionsTable)
    .set({ savedToBrain: true, brainSlug: slug })
    .where(eq(sessionsTable.id, id));

  return Response.json({ slug });
}
