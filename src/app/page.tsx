import Link from "next/link";
import { MODES } from "@/lib/modes";

const steps = [
  {
    number: "1.",
    title: "Message your agent.",
    body: (
      <>
        On Telegram, WhatsApp, Signal, Discord, or wherever you already talk to your
        OpenClaw or Hermes agent, just say{" "}
        <code className="text-sm bg-paper-200 px-1.5 py-0.5 rounded">
          mirror session on [what&apos;s on your mind]
        </code>
        .
      </>
    ),
  },
  {
    number: "2.",
    title: "Pick a mode.",
    body: "The agent asks how you want this one to go: brainstorm, analyze, decide, process, future self, or inner critic. Each one is a different voice from inside your own head.",
  },
  {
    number: "3.",
    title: "Talk to yourself.",
    body: "The agent pulls context from your gbrain so the other-you sounds like you, then plays that side of the conversation in first person. Text or voice, whatever channel you're on.",
  },
  {
    number: "4.",
    title: "It saves to your brain.",
    body: (
      <>
        When you wrap, the full transcript goes into gbrain as a{" "}
        <code className="text-sm bg-paper-200 px-1.5 py-0.5 rounded">
          mirror-session
        </code>{" "}
        page. Your inner dialogue becomes part of who your agent remembers you to be.
      </>
    ),
  },
];

export default async function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-paper-100 text-paper-900 subtle-grain overflow-hidden">
      <header className="w-full px-6 py-8 flex justify-between items-center max-w-7xl mx-auto z-10">
        <Link
          href="/"
          className="flex items-center gap-2 font-serif text-2xl tracking-tight text-paper-900 italic font-medium"
        >
          <MirrorLogo />
          <span>Mirror</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-paper-800/70">
          <a
            href="https://github.com/prodigalson/mirror"
            className="hover:text-paper-900 transition-colors"
            target="_blank"
            rel="noreferrer noopener"
          >
            GitHub
          </a>
        </nav>
      </header>

      <section className="flex-grow flex flex-col items-center pt-12 pb-28">
        <MirrorHeroImage />

        <div className="max-w-3xl mx-auto px-6 text-center z-10">
          <h1 className="font-serif text-5xl md:text-7xl font-normal tracking-tight leading-[1.05] mb-6 text-paper-900">
            Chat with yourself.
          </h1>
          <p className="text-lg md:text-xl text-paper-800/60 font-light max-w-xl mx-auto mb-10 leading-relaxed">
            Mirror is an AI agent that simulates being you so you can have a deeper
            conversation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/prodigalson/mirror#install-the-skill"
              className="bg-paper-900 text-white px-8 py-3.5 rounded-full text-sm font-medium tracking-wide hover:bg-paper-800 transition-all shadow-lg shadow-paper-900/10 hover:shadow-paper-900/20 w-full sm:w-auto"
              target="_blank"
              rel="noreferrer noopener"
            >
              Install the skill
              <span aria-hidden> &rarr;</span>
            </a>
          </div>
        </div>

        <HowItWorks />
        <ModesSection />
        <RunOptions />
      </section>

      <footer className="border-t border-paper-300/50 mt-auto py-12 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="font-serif text-xl italic text-paper-900">
            Mirror - a self-chat companion
          </span>
          <span className="font-mono text-sm text-paper-800/40">made with gbrain</span>
        </div>
      </footer>
    </main>
  );
}

function MirrorHeroImage() {
  return (
    <div className="relative mb-16 px-4">
      <div className="w-[200px] h-[340px] md:w-[260px] md:h-[440px] relative z-10 rounded-[1000px] shadow-2xl overflow-hidden bg-paper-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/reflect-mirror.png"
          alt="Elegant oval gold-framed mirror"
          className="w-full h-full object-cover rounded-[1000px]"
        />
        <div className="mirror-glare absolute inset-0 pointer-events-none" aria-hidden="true" />
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <section className="w-full max-w-3xl mx-auto px-6 mt-40 z-10">
      <p className="font-mono text-xs tracking-[0.2em] text-paper-800/40 uppercase mb-8 text-center md:text-left">
        How it actually works
      </p>
      <div className="space-y-8 text-paper-900">
        {steps.map((step) => (
          <article key={step.number} className="flex gap-5">
            <div className="font-serif text-3xl text-paper-800/30 w-10 flex-shrink-0">
              {step.number}
            </div>
            <div>
              <h3 className="font-serif text-2xl mb-2 text-paper-900">{step.title}</h3>
              <p className="text-paper-800/60 leading-relaxed font-light">{step.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ModesSection() {
  return (
    <section className="w-full max-w-5xl mx-auto px-6 mt-40 z-10">
      <h2 className="font-serif text-4xl text-paper-900 mb-2">Six versions of you.</h2>
      <p className="text-paper-800/60 mb-10 max-w-xl font-light">
        Pick a voice for the other side of the conversation. They each listen differently.
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODES.map((mode) => (
          <article
            key={mode.id}
            className="p-5 rounded-lg bg-paper-50/50 border border-paper-300/60 backdrop-blur-sm shadow-mirror"
          >
            <div
              className="w-2 h-2 rounded-full mb-3"
              style={{ background: `var(--color-${mode.accent}-accent)` }}
            />
            <h3 className="font-serif text-2xl mb-1 text-paper-900">{mode.name}</h3>
            <p className="text-xs font-mono uppercase tracking-wider text-paper-800/40 mb-3">
              {mode.tagline}
            </p>
            <p className="text-sm text-paper-800/60 leading-relaxed font-light">
              {mode.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function RunOptions() {
  return (
    <section className="w-full max-w-3xl mx-auto px-6 mt-40 z-10">
      <p className="font-mono text-xs tracking-[0.2em] text-paper-800/40 uppercase mb-8 text-center md:text-left">
        Run it as a skill
      </p>
      <div className="grid gap-6">
        <article className="p-6 rounded-lg bg-paper-50/50 border border-paper-300/60 shadow-mirror">
          <h3 className="font-serif text-3xl mb-2 text-paper-900">As a skill</h3>
          <p className="text-sm text-paper-800/60 leading-relaxed mb-4 font-light">
            Drop <code className="text-xs bg-paper-200 px-1 py-0.5 rounded">skill/SKILL.md</code>{" "}
            into{" "}
            <code className="text-xs bg-paper-200 px-1 py-0.5 rounded">
              ~/.openclaw/workspace/skills/mirror/
            </code>{" "}
            and your agent picks it up. Works in whatever chat you already use.
            Recommended.
          </p>
          <a
            href="https://github.com/prodigalson/mirror/blob/main/skill/SKILL.md"
            className="text-sm text-paper-900 underline decoration-paper-300 underline-offset-4"
            target="_blank"
            rel="noreferrer noopener"
          >
            View SKILL.md
          </a>
        </article>
      </div>
    </section>
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
