import { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "@/db";
import { sessions as sessionsTable } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { getMode } from "@/lib/modes";

export const runtime = "nodejs";

export async function GET() {
  let user;
  try {
    user = await requireSession();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const rows = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.userId, user.userId))
    .orderBy(desc(sessionsTable.updatedAt));

  return Response.json({ sessions: rows });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireSession();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as { mode: string; topic: string };
  const mode = getMode(body.mode);
  if (!mode) return new Response("Invalid mode", { status: 400 });

  const topic = (body.topic || "").trim();
  if (!topic) return new Response("Topic required", { status: 400 });

  const id = uuid();
  const title = topic.length > 80 ? topic.slice(0, 77) + "..." : topic;
  const now = new Date().toISOString();

  await db.insert(sessionsTable).values({
    id,
    userId: user.userId,
    title,
    mode: mode.id,
    topic,
    createdAt: now,
    updatedAt: now,
  });

  return Response.json({ id });
}
