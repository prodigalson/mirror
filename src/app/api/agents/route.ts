import type { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db, ensureSchema } from "@/db";
import { agentEndpoints } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { isValidAgentType } from "@/lib/agents";

export const runtime = "nodejs";

type Row = typeof agentEndpoints.$inferSelect;

function redact(row: Row) {
  return { ...row, token: row.token ? "***" : null };
}

export async function GET() {
  let user;
  try {
    user = await requireSession();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
  await ensureSchema();

  const rows = await db
    .select()
    .from(agentEndpoints)
    .where(eq(agentEndpoints.userId, user.userId))
    .orderBy(desc(agentEndpoints.createdAt));

  return Response.json({ endpoints: rows.map(redact) });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireSession();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
  await ensureSchema();

  const body = (await req.json()) as {
    name?: string;
    type?: string;
    url?: string;
    token?: string | null;
    sessionKey?: string | null;
  };

  const name = (body.name || "").trim();
  const type = (body.type || "").trim();
  const url = (body.url || "").trim();

  if (!name || !type || !url) {
    return Response.json({ error: "name, type, and url are required" }, { status: 400 });
  }
  if (!isValidAgentType(type)) {
    return Response.json({ error: `unknown type: ${type}` }, { status: 400 });
  }

  if (type === "openclaw") {
    if (!/^wss?:\/\//.test(url)) {
      return Response.json({ error: "OpenClaw URL must start with ws:// or wss://" }, { status: 400 });
    }
  } else if (type === "webhook") {
    if (!/^https?:\/\//.test(url)) {
      return Response.json({ error: "Webhook URL must start with http(s)://" }, { status: 400 });
    }
  }

  const id = uuid();
  await db.insert(agentEndpoints).values({
    id,
    userId: user.userId,
    name,
    type,
    url,
    token: body.token || null,
    sessionKey: body.sessionKey || null,
  });

  return Response.json({ id });
}
