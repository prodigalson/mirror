import { NextRequest } from "next/server";
import { eq, asc } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "@/db";
import { messages as messagesTable, sessions as sessionsTable } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { getMode } from "@/lib/modes";
import { searchBrain } from "@/lib/gbrain";
import { getAnthropic, MODEL } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatRequest {
  sessionId: string;
  content: string;
}

function buildSystemPrompt(modeSystemPrompt: string, topic: string, snippets: Array<{ title: string; excerpt: string }>) {
  const parts = [
    modeSystemPrompt,
    "",
    `The topic of this session is: "${topic}"`,
  ];
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

export async function POST(req: NextRequest) {
  let payload: ChatRequest;
  try {
    await requireSession();
    payload = (await req.json()) as ChatRequest;
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { sessionId, content } = payload;
  if (!sessionId || !content) {
    return new Response("Bad request", { status: 400 });
  }

  const sessionRows = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
  const session = sessionRows[0];
  if (!session) return new Response("Not found", { status: 404 });

  const mode = getMode(session.mode);
  if (!mode) return new Response("Invalid mode", { status: 400 });

  const userMessage = {
    id: uuid(),
    sessionId,
    role: "user",
    content,
  };
  await db.insert(messagesTable).values(userMessage);

  const history = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.sessionId, sessionId))
    .orderBy(asc(messagesTable.createdAt));

  const existingMessageCount = history.length - 1;
  const shouldFetchContext = existingMessageCount <= 1;
  const snippets = shouldFetchContext ? await searchBrain(`${session.topic} ${content}`, 4) : [];
  const systemPrompt = buildSystemPrompt(mode.systemPrompt, session.topic, snippets);

  const apiMessages = history.map((m) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));

  const client = getAnthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const assistantId = uuid();
      let fullText = "";
      try {
        controller.enqueue(encoder.encode(`event: start\ndata: ${JSON.stringify({ messageId: assistantId })}\n\n`));
        const response = await client.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          system: systemPrompt,
          messages: apiMessages,
        });

        for await (const chunk of response) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            const t = chunk.delta.text;
            fullText += t;
            controller.enqueue(encoder.encode(`event: delta\ndata: ${JSON.stringify({ text: t })}\n\n`));
          }
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

        controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ messageId: assistantId })}\n\n`));
      } catch (e) {
        const message = e instanceof Error ? e.message : "unknown error";
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`));
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
