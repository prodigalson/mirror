# Mirror

A quiet place to think out loud. Mirror is a gbrain-aware OpenClaw skill that facilitates an inner dialogue with you, right in whatever chat you already use to talk to your agent. It also ships as a standalone web app if you don't have an agent yet.

## What it is

The most honest conversation you ever have is in your own head. Mirror makes that conversation two-sided: you speak, another version of you replies. Pick the voice of the other self:

- **Brainstorm** - generative, playful, builds on ideas
- **Analyze** - calm, names assumptions, sees the structure
- **Decide** - pushes you toward conviction
- **Process** - sits with how you feel, no fixing
- **Future self** - the you from five years ahead writes back
- **Inner critic** - steelmans the doubts so you can look at them

Sessions save back to gbrain as `mirror-session` pages, so your inner dialogue becomes part of what your agent remembers you to be.

---

## Install the skill (recommended)

If you're already running [OpenClaw](https://openclaw.ai) or another agent that reads Claude-style skills:

```bash
# from this repo
mkdir -p ~/.openclaw/workspace/skills/mirror
cp skill/SKILL.md ~/.openclaw/workspace/skills/mirror/SKILL.md

# verify
openclaw skills list | grep mirror     # should show "✓ ready"
```

Then, in your usual chat channel (Telegram, WhatsApp, Signal, Discord, iMessage, or the OpenClaw CLI):

> mirror session on whether I should write more in public

The skill takes over, asks what mode you want, pulls context from your gbrain, drives the conversation, and saves the transcript to your brain when you wrap. Works with voice channels too - the agent's native voice pipeline does the talking.

**Requirements:** `gbrain` CLI on the same host (the skill shells out to it for context and saving).

## Run the web app (alternative)

Standalone Next.js app - useful if you don't have an agent set up, want a shareable link, or want to bring your own external agent endpoint (OpenClaw gateway, Hermes, or any webhook) without touching a CLI.

```bash
bun install
cp .env.example .env.local
# edit to add ANTHROPIC_API_KEY, JWT_SECRET, DATABASE_URL, and optionally ELEVENLABS_API_KEY
bun run dev
```

Open http://localhost:3000 and sign up. Tables self-initialize on first request.

### Features in the web app

- Same six modes as the skill
- gbrain context pull + save-to-brain (set `GBRAIN_DATABASE_URL` or reuse `DATABASE_URL`)
- Voice in and voice out via ElevenLabs (set `ELEVENLABS_API_KEY`)
- External agent endpoints: route a session through your OpenClaw gateway or a webhook instead of Claude direct

### Stack

- Next.js 16 (App Router, Turbopack), React 19, Tailwind 4
- Anthropic SDK with streaming, Claude Sonnet 4.6
- Postgres + Drizzle (reuses your gbrain database by default)
- ElevenLabs for STT (Scribe v1) and TTS (Turbo v2.5)

### Deploy to Vercel

```
ANTHROPIC_API_KEY       - required
JWT_SECRET              - any long random string
DATABASE_URL            - your gbrain postgres URL works (Mirror uses separate mirror_* tables)
ELEVENLABS_API_KEY      - optional, enables voice mode
GBRAIN_DATABASE_URL     - optional, if separate from DATABASE_URL
```

Push, it deploys, tables self-initialize on first request.
