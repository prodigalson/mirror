import postgres from "postgres";

let _sql: ReturnType<typeof postgres> | null = null;

function getSql() {
  const url = process.env.GBRAIN_DATABASE_URL;
  if (!url) return null;
  if (_sql) return _sql;
  _sql = postgres(url, { max: 2, idle_timeout: 10, connect_timeout: 6 });
  return _sql;
}

export function isGbrainEnabled(): boolean {
  return !!process.env.GBRAIN_DATABASE_URL;
}

export interface BrainSnippet {
  slug: string;
  title: string;
  type: string;
  excerpt: string;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).replace(/\s+\S*$/, "") + "...";
}

export async function searchBrain(query: string, limit = 5): Promise<BrainSnippet[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2)
      .slice(0, 6);
    if (terms.length === 0) return [];

    const tsQuery = terms.map((t) => t.replace(/[^a-z0-9]/g, "")).filter(Boolean).join(" | ");
    if (!tsQuery) return [];

    const rows = await sql<
      Array<{ slug: string; title: string; type: string; compiled_truth: string }>
    >`
      SELECT slug, title, type, compiled_truth
      FROM pages
      WHERE to_tsvector('english', title || ' ' || coalesce(compiled_truth,'')) @@ to_tsquery('english', ${tsQuery})
      ORDER BY ts_rank(to_tsvector('english', title || ' ' || coalesce(compiled_truth,'')), to_tsquery('english', ${tsQuery})) DESC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      type: r.type,
      excerpt: truncate(r.compiled_truth || "", 500),
    }));
  } catch (e) {
    console.error("gbrain search failed:", e);
    return [];
  }
}

export interface SaveSessionArgs {
  title: string;
  mode: string;
  topic: string;
  messages: Array<{ role: string; content: string }>;
}

export async function saveSessionToBrain(args: SaveSessionArgs): Promise<string | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const base = slugify(args.title || args.topic);
    const slug = `mirror-sessions/${today}-${base || "session"}`;

    const body = [
      `---`,
      `title: ${JSON.stringify(args.title)}`,
      `type: mirror-session`,
      `mode: ${args.mode}`,
      `date: ${today}`,
      `tags: [mirror, self-chat, ${args.mode}]`,
      `---`,
      ``,
      `# ${args.title}`,
      ``,
      `**Mode:** ${args.mode}`,
      `**Topic:** ${args.topic}`,
      `**Date:** ${today}`,
      ``,
      `## Transcript`,
      ``,
      ...args.messages.map((m) => {
        const speaker = m.role === "user" ? "Me" : "The other me";
        return `**${speaker}:**\n\n${m.content}\n`;
      }),
    ].join("\n");

    const hash = await simpleHash(body);

    await sql`
      INSERT INTO pages (slug, type, title, compiled_truth, frontmatter, content_hash)
      VALUES (${slug}, 'mirror-session', ${args.title}, ${body}, ${sql.json({ mode: args.mode, topic: args.topic, date: today })}, ${hash})
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        compiled_truth = EXCLUDED.compiled_truth,
        frontmatter = EXCLUDED.frontmatter,
        content_hash = EXCLUDED.content_hash,
        updated_at = now()
    `;

    return slug;
  } catch (e) {
    console.error("gbrain save failed:", e);
    return null;
  }
}

async function simpleHash(s: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const data = new TextEncoder().encode(s);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16);
  }
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h.toString(16);
}
