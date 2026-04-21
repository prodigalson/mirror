# Mirror

A quiet place to think out loud. A chat app where you talk to yourself, powered by [gbrain](https://github.com/garrytan/gbrain).

## What it is

The most honest conversation you ever have is in your own head. Mirror makes that conversation two-sided: you type, and another version of you replies. Pick the voice of the other self:

- **Brainstorm** - generative, playful, builds on ideas
- **Analyze** - calm, names assumptions, sees the structure
- **Decide** - pushes you toward conviction
- **Process** - sits with how you feel, no fixing
- **Future self** - the you from five years ahead writes back
- **Inner critic** - steelmans the doubts so you can look at them

Connect your gbrain and Mirror pulls context from your own past writing, so the other you actually sounds like you. When a session ends, save it back to the brain as a page.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19, Tailwind 4
- Anthropic API (Claude Sonnet 4.6) with streaming
- SQLite via libsql/Turso for session storage
- Drizzle ORM
- gbrain postgres for context + persistence (optional)

## Run locally

```bash
bun install
cp .env.example .env.local
# edit .env.local to add ANTHROPIC_API_KEY and JWT_SECRET
bun run db:migrate
bun run dev
```

Open http://localhost:3000 and sign up with any name + password (first login creates your account).

## Connect gbrain

Set `GBRAIN_DATABASE_URL` to your gbrain Postgres connection string. Mirror will:

1. Search your gbrain pages when you start a session, mix relevant excerpts into the other-you's context
2. Let you save each completed session as a `mirror-session` page in your brain

Without `GBRAIN_DATABASE_URL`, Mirror still works - the other-you just doesn't have access to your past writing.

## Deploy

Works out of the box on Vercel. Set these environment variables:

- `ANTHROPIC_API_KEY`
- `JWT_SECRET` (any long random string)
- `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` (create a free DB at turso.tech)
- `GBRAIN_DATABASE_URL` (optional)

Run migrations against your Turso DB once: `TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... bun run db:migrate`
