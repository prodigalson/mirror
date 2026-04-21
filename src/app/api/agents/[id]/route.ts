import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { agentEndpoints } from "@/db/schema";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireSession();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await ctx.params;
  const rows = await db
    .select()
    .from(agentEndpoints)
    .where(and(eq(agentEndpoints.id, id), eq(agentEndpoints.userId, user.userId)))
    .limit(1);

  if (!rows[0]) return new Response("Not found", { status: 404 });

  await db.delete(agentEndpoints).where(eq(agentEndpoints.id, id));
  return Response.json({ ok: true });
}
