import type { NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions as sessionsTable, messages as messagesTable } from "@/db/schema";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireSession();
  } catch {
    return new Response("Unauthorized", { status: 401 });
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

  return Response.json({ session, messages: msgs });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireSession();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await ctx.params;
  const sessionRows = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, id), eq(sessionsTable.userId, user.userId)))
    .limit(1);
  if (!sessionRows[0]) return new Response("Not found", { status: 404 });

  await db.delete(messagesTable).where(eq(messagesTable.sessionId, id));
  await db.delete(sessionsTable).where(eq(sessionsTable.id, id));

  return Response.json({ ok: true });
}
