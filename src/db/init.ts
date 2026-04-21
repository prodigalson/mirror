import postgres from "postgres";

let initPromise: Promise<void> | null = null;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "mirror_users" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "gbrain_context" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "mirror_agent_endpoints" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "mirror_users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "url" text NOT NULL,
  "token" text,
  "session_key" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "mirror_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "mirror_users"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "mode" text NOT NULL,
  "topic" text NOT NULL,
  "agent_endpoint_id" text REFERENCES "mirror_agent_endpoints"("id") ON DELETE SET NULL,
  "saved_to_brain" boolean DEFAULT false NOT NULL,
  "brain_slug" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "mirror_sessions" ADD COLUMN IF NOT EXISTS "agent_endpoint_id" text REFERENCES "mirror_agent_endpoints"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "mirror_messages" (
  "id" text PRIMARY KEY NOT NULL,
  "session_id" text NOT NULL REFERENCES "mirror_sessions"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mirror_sessions_user ON mirror_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_mirror_sessions_updated ON mirror_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_mirror_messages_session ON mirror_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_mirror_agent_endpoints_user ON mirror_agent_endpoints(user_id);
`;

export function ensureSchema(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const url = process.env.DATABASE_URL || process.env.GBRAIN_DATABASE_URL;
    if (!url) return;
    const sql = postgres(url, { max: 1 });
    try {
      await sql.unsafe(SCHEMA_SQL);
    } finally {
      await sql.end({ timeout: 5 });
    }
  })().catch((e) => {
    initPromise = null;
    throw e;
  });

  return initPromise;
}
