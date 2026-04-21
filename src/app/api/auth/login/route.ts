import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db, ensureSchema } from "@/db";
import { users } from "@/db/schema";
import { comparePassword, hashPassword, sessionCookie, signToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  await ensureSchema();
  const body = (await req.json()) as { name?: string; password?: string };
  const name = (body.name || "").trim().toLowerCase();
  const password = body.password || "";

  if (!name || !password) {
    return Response.json({ error: "name and password required" }, { status: 400 });
  }

  let existing = (await db.select().from(users).where(eq(users.name, name)).limit(1))[0];

  if (!existing) {
    if (password.length < 6) {
      return Response.json({ error: "password must be at least 6 characters" }, { status: 400 });
    }
    const id = uuid();
    const passwordHash = await hashPassword(password);
    await db.insert(users).values({ id, name, passwordHash });
    existing = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
  } else {
    const ok = await comparePassword(password, existing.passwordHash);
    if (!ok) return Response.json({ error: "wrong password" }, { status: 401 });
  }

  const token = await signToken({ userId: existing.id, name: existing.name });
  const cookie = sessionCookie(token);
  const store = await cookies();
  store.set(cookie);

  return Response.json({ ok: true });
}
