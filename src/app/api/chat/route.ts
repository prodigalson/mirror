import { NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db, ensureSchema } from "@/db";
import {
  agentEndpoints,
  messages as messagesTable,
  sessions as sessionsTable,
  users,
  type AgentEndpoint,
} from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { getMode } from "@/lib/modes";
import { searchBrain } from "@/lib/gbrain";
import { callOpenClawAgent } from "@/lib/adapters/openclaw";
import { callWebhookAgent } from "@/lib/adapters/webhook";
import {
  isValidProvider,
  resolveProvider,
  streamProviderChat,
  type ProviderId,
} from "@/lib/providers";

export const runtime = "nodejs";
export const maxDuration = 300;

interface ChatRequest {
  sessionId: string;
  content: string;
}

function buildSystemPrompt(
  modeSystemPrompt: string,
  topic: string,
  snippets: Array<{ title: string; excerpt: string }>
) {
  const parts = [modeSystemPrompt, "", `The topic of this session is: "${topic}"`];
  if (snippets.length > 0) {
    parts.push(
      "",
      "Context from the user's own brain (their past writing, notes, decisions). Use this to sound like them, reference their own prior thoughts, and stay consistent with what they already believe:",
      "",
      ...snippets.map((s) => `--- ${s.title} ---\n${s.excerpt}`),
      "",
      "Do not explicitly cite sources. Weave these in naturally as things they already know."
    );
  }
  return parts.join("\n");
}

function modePreamble(modeId: string, topic: string): string {
  switch (modeId) {
    case "brainstorm":
      return `We're brainstorming "${topic}". Play the generative, creative voice. Speak in first person as me.`;
    case "analyze":
      return `Help me analyze: "${topic}". Be the clear, dispassionate voice in my head. Speak in first person as me.`;
    case "decide":
      return `I'm trying to decide about: "${topic}". Push me toward clarity. Speak in first person as me.`;
    case "process":
      return `I'm processing how I feel about: "${topic}". Witness, don't fix. Reflect in first person as me.`;
    case "future":
      return `Talk to me as my future self, five years from now, on this: "${topic}". First person.`;
    case "critic":
      return `Be my inner critic on this: "${topic}". Steelman the doubts. First person.`;
    default:
      return `Topic: "${topic}". Respond as me, talking to myself.`;
  }
}

export async function POST(req: NextRequest) {
  let payload: ChatRequest;
  try {
    await requireSession();
    await ensureSchema();
    payload = (await req.json()) as ChatRequest;
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { sessionId, content } = payload;
  if (!sessionId || !content) return new Response("Bad request", { status: 400 });

  const sessionRows = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId))
    .limit(1);
  const session = sessionRows[0];
  if (!session) return new Response("Not found", { status: 404 });

  const mode = getMode(session.mode);
  if (!mode) return new Response("Invalid mode", { status: 400 });

  let endpoint: AgentEndpoint | null = null;
  if (session.agentEndpointId) {
    const rows = await db
      .select()
      .from(agentEndpoints)
      .where(
        and(
          eq(agentEndpoints.id, session.agentEndpointId),
          eq(agentEndpoints.userId, session.userId)
        )
      )
      .limit(1);
    endpoint = rows[0] || null;
  }

  const userMessageId = uuid();
  await db.insert(messagesTable).values({
    id: userMessageId,
    sessionId,
    role: "user",
    content,
  });

  const history = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.sessionId, sessionId))
    .orderBy(asc(messagesTable.createdAt));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const assistantId = uuid();
      const emit = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        emit("start", { messageId: assistantId, via: endpoint ? endpoint.name : "claude" });

        let fullText = "";

        if (endpoint) {
          const firstTurn = history.filter((m) => m.role === "user").length === 1;
          const prefixed = firstTurn
            ? `${modePreamble(mode.id, session.topic)}\n\n${content}`
            : content;

          if (endpoint.type === "openclaw") {
            const result = await callOpenClawAgent({
              url: endpoint.url,
              token: endpoint.token,
              sessionKey: endpoint.sessionKey,
              message: prefixed,
              timeoutMs: 180_000,
              signal: req.signal,
            });
            fullText = result.reply;
            for (const chunk of chunkText(fullText, 24)) {
              emit("delta", { text: chunk });
            }
          } else if (endpoint.type === "webhook") {
            const result = await callWebhookAgent(
              {
                url: endpoint.url,
                token: endpoint.token,
                sessionKey: endpoint.sessionKey,
                message: prefixed,
                history: history.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
                mode: mode.id,
                signal: req.signal,
              },
              {
                onDelta: (text) => emit("delta", { text }),
              }
            );
            fullText = result.reply;
          } else {
            throw new Error(`Unsupported agent type: ${endpoint.type}`);
          }
        } else {
          const userRow = (
            await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
          )[0];
          const preferred: ProviderId | null =
            session.provider && isValidProvider(session.provider) ? session.provider : null;
          const resolved = resolveProvider(
            {
              anthropicKey: userRow?.anthropicKey ?? null,
              openaiKey: userRow?.openaiKey ?? null,
              providerDefault: userRow?.providerDefault ?? null,
            },
            preferred
          );
          if (!resolved) {
            throw new Error(
              "No LLM provider configured. Add an Anthropic or OpenAI API key in Settings."
            );
          }

          emit("provider", { provider: resolved.provider, source: resolved.source });

          const shouldFetchContext = history.length <= 1;
          const snippets = shouldFetchContext
            ? await searchBrain(`${session.topic} ${content}`, 4)
            : [];
          const systemPrompt = buildSystemPrompt(mode.systemPrompt, session.topic, snippets);
          const apiMessages = history.map((m) => ({
            role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
            content: m.content,
          }));

          await streamProviderChat({
            provider: resolved.provider,
            apiKey: resolved.apiKey,
            system: systemPrompt,
            messages: apiMessages,
            signal: req.signal,
            onDelta: (text) => {
              fullText += text;
              emit("delta", { text });
            },
          });
        }

        await db.insert(messagesTable).values({
          id: assistantId,
          sessionId,
          role: "assistant",
          content: fullText,
        });

        await db
          .update(sessionsTable)
          .set({ updatedAt: new Date() })
          .where(eq(sessionsTable.id, sessionId));

        emit("done", { messageId: assistantId });
      } catch (e) {
        const message = e instanceof Error ? e.message : "unknown error";
        emit("error", { error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks;
}
