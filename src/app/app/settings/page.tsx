import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, ensureSchema } from "@/db";
import { agentEndpoints } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { AGENT_TYPES } from "@/lib/agents";
import AgentForm from "./agent-form";
import AgentList from "./agent-list";
import VoiceSection from "./voice-section";

export default async function SettingsPage() {
  await ensureSchema();
  const user = await requireSession();

  const rows = await db
    .select()
    .from(agentEndpoints)
    .where(eq(agentEndpoints.userId, user.userId))
    .orderBy(desc(agentEndpoints.createdAt));

  return (
    <main className="flex-1 flex flex-col">
      <header className="px-6 md:px-10 py-5 flex items-center justify-between border-b border-thread/40">
        <Link href="/app" className="text-sm text-ink-muted hover:text-ink transition flex items-center gap-2">
          <span aria-hidden>&larr;</span> Back
        </Link>
        <h1 className="font-serif text-lg">Settings</h1>
        <div className="w-12" />
      </header>

      <div className="px-6 md:px-10 py-10 max-w-3xl w-full mx-auto space-y-12">
        <VoiceSection />

        <section>
          <h2 className="font-serif text-3xl mb-2">Talk to your own agent</h2>
          <p className="text-ink-muted leading-relaxed mb-6">
            Connect an external agent so the other-you in Mirror is your actual OpenClaw or Hermes instance,
            with all your brain, memory, and tools. Otherwise, Mirror uses Claude directly.
          </p>

          <AgentList endpoints={rows.map((r) => ({ ...r, token: r.token ? "***" : null }))} />
        </section>

        <section>
          <h2 className="font-serif text-2xl mb-2">Add an agent</h2>
          <p className="text-sm text-ink-muted mb-5">
            Your token is stored server-side and never sent back to the browser.
          </p>
          <AgentForm types={AGENT_TYPES} />
        </section>

        <section className="text-sm text-ink-muted leading-relaxed border-t border-thread/40 pt-8">
          <h3 className="font-serif text-lg text-ink mb-2">How it works</h3>
          <ul className="space-y-2 list-disc list-inside">
            <li>
              <strong>OpenClaw Gateway:</strong> Mirror runs{" "}
              <code className="text-xs bg-paper-soft px-1 py-0.5 rounded">
                openclaw gateway call agent
              </code>{" "}
              as a subprocess against your gateway URL. The <code className="text-xs bg-paper-soft px-1 py-0.5 rounded">openclaw</code> CLI must be
              installed on the machine running Mirror (so works great when you{" "}
              <code className="text-xs bg-paper-soft px-1 py-0.5 rounded">bun run dev</code> locally).
            </li>
            <li>
              <strong>Webhook:</strong> Mirror POSTs{" "}
              <code className="text-xs bg-paper-soft px-1 py-0.5 rounded">
                {"{ message, history, threadId, mode }"}
              </code>{" "}
              to your URL and expects either JSON <code className="text-xs bg-paper-soft px-1 py-0.5 rounded">{"{ reply }"}</code> or SSE deltas. Use
              this to wrap a Hermes agent, an internal API, or anything else that speaks HTTP.
            </li>
            <li>
              <strong>When picked per session:</strong> Mirror prefixes your first message with the mode framing
              (brainstorm, analyze, etc.) and forwards the rest of the conversation as-is.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
