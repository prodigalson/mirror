import { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "@/db";
import { agentEndpoints, sessions as sessionsTable } from "@/db/schema";
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

  const body = (await req.json()) as {
    mode: string;
    topic: string;
    agentEndpointId?: string | null;
  };
  const mode = getMode(body.mode);
  if (!mode) return new Response("Invalid mode", { status: 400 });

  const topic = (body.topic || "").trim();
  if (!topic) return new Response("Topic required", { status: 400 });

  let agentEndpointId: string | null = null;
  if (body.agentEndpointId) {
    const match = (
      await db
        .select()
        .from(agentEndpoints)
        .where(
          and(
            eq(agentEndpoints.id, body.agentEndpointId),
            eq(agentEndpoints.userId, user.userId)
          )
        )
        .limit(1)
    )[0];
    if (!match) return new Response("Unknown agent endpoint", { status: 400 });
    agentEndpointId = match.id;
  }

  const id = uuid();
  const title = topic.length > 80 ? topic.slice(0, 77) + "..." : topic;

  await db.insert(sessionsTable).values({
    id,
    userId: user.userId,
    title,
    mode: mode.id,
    topic,
    agentEndpointId,
  });

  return Response.json({ id });
}
