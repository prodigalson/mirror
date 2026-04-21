import { notFound } from "next/navigation";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions as sessionsTable, messages as messagesTable } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { getMode } from "@/lib/modes";
import { isGbrainEnabled } from "@/lib/gbrain";
import Chat from "./chat";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSession();
  const { id } = await params;

  const sessionRows = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, id), eq(sessionsTable.userId, user.userId)))
    .limit(1);
  const session = sessionRows[0];
  if (!session) notFound();

  const mode = getMode(session.mode);
  if (!mode) notFound();

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.sessionId, id))
    .orderBy(asc(messagesTable.createdAt));

  const gbrainOn = isGbrainEnabled();

  return (
    <main className="flex-1 flex flex-col">
      <header className="px-6 md:px-10 py-4 flex items-center justify-between border-b border-thread/40 bg-paper/80 backdrop-blur-md sticky top-0 z-10">
        <Link href="/app" className="text-sm text-ink-muted hover:text-ink transition flex items-center gap-2">
          <span aria-hidden>&larr;</span> Sessions
        </Link>
        <div className="flex items-center gap-3">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: `var(--color-${mode.accent}-accent)` }}
          />
          <span className="font-serif text-lg">{mode.name}</span>
        </div>
        <div className="w-20" />
      </header>

      <Chat
        session={session}
        mode={mode}
        initialMessages={msgs}
        gbrainEnabled={gbrainOn}
      />
    </main>
  );
}
