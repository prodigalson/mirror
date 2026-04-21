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
          <a
            href="https://github.com/prodigalson/mirror"
            className="text-ink-muted hover:text-ink transition"
            target="_blank"
            rel="noreferrer noopener"
          >
            GitHub
          </a>
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
            A skill for your agent
          </p>
          <h1 className="font-serif text-5xl md:text-6xl leading-[1.05] text-ink mb-6">
            Chat with yourself.
          </h1>
          <p className="text-lg md:text-xl text-ink-muted leading-relaxed max-w-xl mx-auto mb-10">
            The most honest conversation is the one in your own head. Mirror makes it
            two-sided.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://github.com/prodigalson/mirror#install-the-skill"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-ink text-paper font-medium hover:bg-ink-muted transition"
              target="_blank"
              rel="noreferrer noopener"
            >
              Install the skill
              <span aria-hidden>&rarr;</span>
            </a>
            <Link
              href={session ? "/app" : "/login"}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-paper-soft border border-thread/60 text-ink hover:border-ink/50 transition"
            >
              {session ? "Open web app" : "Or try it in a browser"}
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-10 py-20 border-t border-thread/50">
        <div className="max-w-3xl mx-auto">
          <p className="font-mono text-xs tracking-[0.2em] text-ink-faint uppercase mb-4">
            How it actually works
          </p>
          <div className="space-y-8 text-ink">
            <div className="flex gap-5">
              <div className="font-serif text-3xl text-ink-faint w-10 flex-shrink-0">1.</div>
              <div>
                <h3 className="font-serif text-xl mb-2">Message your agent.</h3>
                <p className="text-ink-muted leading-relaxed">
                  On Telegram, WhatsApp, Signal, Discord, or wherever you already talk to
                  your OpenClaw or Hermes agent, just say{" "}
                  <code className="text-sm bg-paper-soft px-1.5 py-0.5 rounded">
                    mirror session on [what&apos;s on your mind]
                  </code>.
                </p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="font-serif text-3xl text-ink-faint w-10 flex-shrink-0">2.</div>
              <div>
                <h3 className="font-serif text-xl mb-2">Pick a mode.</h3>
                <p className="text-ink-muted leading-relaxed">
                  The agent asks how you want this one to go: brainstorm, analyze, decide,
                  process, future self, or inner critic. Each one is a different voice from
                  inside your own head.
                </p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="font-serif text-3xl text-ink-faint w-10 flex-shrink-0">3.</div>
              <div>
                <h3 className="font-serif text-xl mb-2">Talk to yourself.</h3>
                <p className="text-ink-muted leading-relaxed">
                  The agent pulls context from your gbrain so the other-you sounds like
                  you, then plays that side of the conversation in first person. Text or
                  voice, whatever channel you&apos;re on.
                </p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="font-serif text-3xl text-ink-faint w-10 flex-shrink-0">4.</div>
              <div>
                <h3 className="font-serif text-xl mb-2">It saves to your brain.</h3>
                <p className="text-ink-muted leading-relaxed">
                  When you wrap, the full transcript goes into gbrain as a{" "}
                  <code className="text-sm bg-paper-soft px-1.5 py-0.5 rounded">
                    mirror-session
                  </code>{" "}
                  page. Your inner dialogue becomes part of who your agent remembers you
                  to be.
                </p>
              </div>
            </div>
          </div>
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
            Two ways to run it
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-paper-soft/60 border border-thread/40">
              <h3 className="font-serif text-2xl mb-2">As a skill</h3>
              <p className="text-sm text-ink-muted leading-relaxed mb-4">
                Drop{" "}
                <code className="text-xs bg-paper px-1 py-0.5 rounded">skill/SKILL.md</code>{" "}
                into{" "}
                <code className="text-xs bg-paper px-1 py-0.5 rounded">
                  ~/.openclaw/workspace/skills/mirror/
                </code>{" "}
                and your agent picks it up. Works in whatever chat you already use.
                Recommended.
              </p>
              <a
                href="https://github.com/prodigalson/mirror/blob/main/skill/SKILL.md"
                className="text-sm text-ink underline decoration-thread underline-offset-4"
                target="_blank"
                rel="noreferrer noopener"
              >
                View SKILL.md
              </a>
            </div>
            <div className="p-6 rounded-xl bg-paper-soft/60 border border-thread/40">
              <h3 className="font-serif text-2xl mb-2">As a web app</h3>
              <p className="text-sm text-ink-muted leading-relaxed mb-4">
                If you don&apos;t have an agent set up, or want a shareable URL for a
                browser-only self-chat session, run it here. Pulls from gbrain. Optional
                ElevenLabs voice. Optional bring-your-own agent endpoint.
              </p>
              <Link
                href={session ? "/app" : "/login"}
                className="text-sm text-ink underline decoration-thread underline-offset-4"
              >
                Open the app
              </Link>
            </div>
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
