import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions as sessionsTable } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { getMode, MODES } from "@/lib/modes";
import { isGbrainEnabled } from "@/lib/gbrain";
import NewSession from "./new-session";
import SignOut from "./sign-out";

function timeAgo(iso: string): string {
  const d = new Date(iso.replace(" ", "T") + (iso.includes("Z") ? "" : "Z"));
  const ms = Date.now() - d.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon}mo ago`;
  return `${Math.floor(mon / 12)}y ago`;
}

export default async function AppHome() {
  const user = await requireSession();
  const rows = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.userId, user.userId))
    .orderBy(desc(sessionsTable.updatedAt));

  const gbrainOn = isGbrainEnabled();

  return (
    <main className="flex-1 flex flex-col">
      <header className="px-6 md:px-10 py-5 flex items-center justify-between border-b border-thread/40">
        <Link href="/" className="flex items-center gap-2">
          <MirrorLogo />
          <span className="font-serif text-lg">Mirror</span>
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-ink-faint">
            <span className={`w-1.5 h-1.5 rounded-full ${gbrainOn ? "bg-emerald-accent" : "bg-ink-faint/40"}`} />
            {gbrainOn ? "gbrain connected" : "gbrain offline"}
          </div>
          <span className="text-ink-muted">Hi, {user.name}</span>
          <SignOut />
        </div>
      </header>

      <section className="px-6 md:px-10 py-10 max-w-5xl w-full mx-auto">
        <h1 className="font-serif text-4xl md:text-5xl mb-2">What&apos;s on your mind?</h1>
        <p className="text-ink-muted mb-8">
          Say what you want to think about. Then pick a voice for the other you.
        </p>
        <NewSession modes={MODES} />
      </section>

      {rows.length > 0 && (
        <section className="px-6 md:px-10 pb-16 max-w-5xl w-full mx-auto">
          <h2 className="font-serif text-2xl mb-6">Past sessions</h2>
          <div className="space-y-2">
            {rows.map((row) => {
              const mode = getMode(row.mode);
              return (
                <Link
                  key={row.id}
                  href={`/session/${row.id}`}
                  className="group flex items-center gap-4 p-4 rounded-lg bg-paper-soft/50 border border-thread/30 hover:border-thread hover:bg-paper-soft transition"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: `var(--color-${mode?.accent || "stone"}-accent)` }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink truncate">{row.title}</div>
                    <div className="text-xs font-mono text-ink-faint mt-0.5">
                      {mode?.name} - {timeAgo(row.updatedAt)}
                      {row.savedToBrain && <span className="ml-2 text-emerald-accent">- saved to brain</span>}
                    </div>
                  </div>
                  <span className="text-ink-faint group-hover:text-ink transition" aria-hidden>
                    &rarr;
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}

function MirrorLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
      <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="8" cy="12" r="1.6" fill="currentColor" />
      <circle cx="16" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}
