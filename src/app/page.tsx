import Link from "next/link";
import { getSession } from "@/lib/auth";
import { MODES } from "@/lib/modes";

export default async function Home() {
  const session = await getSession();

  return (
    <main className="flex-1 flex flex-col">
      <header className="px-6 md:px-10 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MirrorLogo />
          <span className="font-serif text-xl text-ink">Mirror</span>
        </div>
        <nav className="flex items-center gap-5 text-sm">
          {session ? (
            <Link href="/app" className="text-ink hover:text-amber-accent transition">
              Your sessions &rarr;
            </Link>
          ) : (
            <Link href="/login" className="text-ink-muted hover:text-ink transition">
              Sign in
            </Link>
          )}
        </nav>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-2xl">
          <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase mb-6">
            A quiet place to think out loud
          </p>
          <h1 className="font-serif text-5xl md:text-6xl leading-[1.05] text-ink mb-6">
            Chat with yourself.
          </h1>
          <p className="text-lg md:text-xl text-ink-muted leading-relaxed max-w-xl mx-auto mb-10">
            The most honest conversation is the one in your own head. Mirror makes that
            conversation two-sided, so you can brainstorm, untangle a decision, or just
            sit with how you feel, in dialogue.
          </p>
          <Link
            href={session ? "/app" : "/login"}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-ink text-paper font-medium hover:bg-ink-muted transition"
          >
            {session ? "Continue" : "Begin"}
            <span aria-hidden>&rarr;</span>
          </Link>
        </div>
      </section>

      <section className="px-6 md:px-10 py-20 border-t border-thread/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-3xl text-ink mb-2">Six versions of you.</h2>
          <p className="text-ink-muted mb-10 max-w-xl">
            Pick a voice for the other side of the conversation. They each listen
            differently.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODES.map((mode) => (
              <div
                key={mode.id}
                className="p-5 rounded-xl bg-paper-soft/70 border border-thread/40 backdrop-blur-sm"
              >
                <div
                  className="w-2 h-2 rounded-full mb-3"
                  style={{ background: `var(--color-${mode.accent}-accent)` }}
                />
                <h3 className="font-serif text-xl mb-1">{mode.name}</h3>
                <p className="text-xs font-mono uppercase tracking-wider text-ink-faint mb-3">
                  {mode.tagline}
                </p>
                <p className="text-sm text-ink-muted leading-relaxed">{mode.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-10 py-20 border-t border-thread/50">
        <div className="max-w-3xl mx-auto">
          <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase mb-4">
            Powered by your gbrain
          </p>
          <h2 className="font-serif text-3xl text-ink mb-5 leading-tight">
            It sounds like you because it listens to you.
          </h2>
          <p className="text-ink-muted leading-relaxed mb-5">
            Connect your{" "}
            <a
              href="https://github.com/garrytan/gbrain"
              className="underline decoration-thread underline-offset-4 hover:text-ink"
              target="_blank"
              rel="noreferrer noopener"
            >
              gbrain
            </a>
            {" "}and Mirror pulls from your own past writing to shape how the other you
            talks back. Your notes, your decisions, your voice. When a session ends, it
            saves back to your brain as a page, so your inner dialogue becomes part of
            who you are remembered to be.
          </p>
          <div className="text-sm text-ink-faint font-mono">
            Optional. Works without it too.
          </div>
        </div>
      </section>

      <footer className="px-6 md:px-10 py-8 border-t border-thread/50 text-xs text-ink-faint flex flex-wrap items-center justify-between gap-4">
        <span>Mirror - a self-chat companion</span>
        <span className="font-mono">made with gbrain</span>
      </footer>
    </main>
  );
}

function MirrorLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
      <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="8" cy="12" r="1.6" fill="currentColor" />
      <circle cx="16" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}
