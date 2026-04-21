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
- Postgres with Drizzle ORM (reuses your gbrain database by default)

## Run locally

```bash
bun install
cp .env.example .env.local
# edit .env.local to add ANTHROPIC_API_KEY, JWT_SECRET, DATABASE_URL
bun run dev
```

Tables are created automatically on first request. Open http://localhost:3000 and sign up with any name + password.

## Connect gbrain

Mirror reads from your gbrain Postgres. By default it uses `DATABASE_URL`; if your gbrain is on a different DB, set `GBRAIN_DATABASE_URL`.

When connected, Mirror:

1. Searches your brain when you start a session and weaves relevant excerpts into the other-you's context
2. Lets you save each completed session back to your brain as a `mirror-session` page

## Deploy to Vercel

Set these environment variables in the Vercel project:

- `ANTHROPIC_API_KEY`
- `JWT_SECRET` (any long random string)
- `DATABASE_URL` (your gbrain postgres URL works perfectly - Mirror uses separate `mirror_*` tables)

That's it. Push, it deploys, tables self-initialize on first request.
