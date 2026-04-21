import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureSchema } from "@/db";
import { users } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { encryptSecret, decryptSecret, maskKey } from "@/lib/crypto";
import { isValidProvider, testProviderKey } from "@/lib/providers";

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
  const anthropicPreview = row?.anthropicKey ? safeMask(row.anthropicKey) : null;
  const openaiPreview = row?.openaiKey ? safeMask(row.openaiKey) : null;
  return Response.json({
    anthropic: anthropicPreview,
    openai: openaiPreview,
    providerDefault: row?.providerDefault ?? null,
    serverFallback: !!process.env.ANTHROPIC_API_KEY,
  });
}

function safeMask(encrypted: string): string {
  try {
    return maskKey(decryptSecret(encrypted));
  } catch {
    return "***";
  }
}

export async function PUT(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
  await ensureSchema();

  const body = (await req.json()) as {
    provider?: string;
    apiKey?: string;
    providerDefault?: string | null;
  };

  if (body.providerDefault !== undefined) {
    const val = body.providerDefault;
    if (val === null || val === "") {
      await db
        .update(users)
        .set({ providerDefault: null })
        .where(eq(users.id, session.userId));
      return Response.json({ ok: true });
    }
    if (!isValidProvider(val)) {
      return Response.json({ error: "invalid providerDefault" }, { status: 400 });
    }
    await db.update(users).set({ providerDefault: val }).where(eq(users.id, session.userId));
    return Response.json({ ok: true });
  }

  const provider = body.provider;
  const apiKey = (body.apiKey || "").trim();
  if (!provider || !isValidProvider(provider)) {
    return Response.json({ error: "provider must be 'anthropic' or 'openai'" }, { status: 400 });
  }
  if (!apiKey) {
    return Response.json({ error: "apiKey required" }, { status: 400 });
  }

  const ok = await testProviderKey(provider, apiKey);
  if (!ok) {
    return Response.json({ error: "key failed validation against the provider" }, { status: 400 });
  }

  const encrypted = encryptSecret(apiKey);
  const field = provider === "anthropic" ? "anthropicKey" : "openaiKey";
  await db
    .update(users)
    .set({ [field]: encrypted })
    .where(eq(users.id, session.userId));

  return Response.json({ ok: true, preview: maskKey(apiKey) });
}

export async function DELETE(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
  await ensureSchema();

  const url = new URL(req.url);
  const provider = url.searchParams.get("provider");
  if (!provider || !isValidProvider(provider)) {
    return Response.json({ error: "provider required" }, { status: 400 });
  }
  const field = provider === "anthropic" ? "anthropicKey" : "openaiKey";
  await db
    .update(users)
    .set({ [field]: null })
    .where(eq(users.id, session.userId));
  return Response.json({ ok: true });
}
