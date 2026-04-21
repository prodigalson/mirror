import { cookies } from "next/headers";
import { clearSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const store = await cookies();
  store.set(clearSessionCookie());
  return Response.json({ ok: true });
}
