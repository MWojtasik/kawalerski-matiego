# CLAUDE.md

Tournament web app for Mati's bachelor party — pool 🎱, darts 🎯, ping-pong 🏓.
Guests self-register from their phones, the organizer draws groups, everyone
enters match results live; a general classification crowns the champion.

**Language policy:** code, comments, commits — English. All UI copy — Polish
(casual, party tone, emojis welcome).

## Stack

- Next.js (App Router) + TypeScript + Tailwind v4
- Deployed to **Cloudflare Workers** via `@opennextjs/cloudflare` (OpenNext)
- **Cloudflare D1** (SQLite) for all state, binding `DB`, migrations in `migrations/`
- SWR polling every 4 s = "live" updates; no websockets, no auth
- Tests: vitest, only for the pure logic in `src/lib/tournament.ts`

## Architecture

- `src/lib/tournament.ts` — ALL tournament rules as pure functions (group
  split, round-robin, standings + tiebreaks, playoff seeding, placements,
  general classification points 10/7/5/4/2/1). Keep new rules here, unit-tested.
- `src/lib/state.ts` — assembles the full `TournamentState` from D1; the single
  `GET /api/state` payload drives every view.
- `src/lib/db.ts` — D1 helpers; `getEnv()` exposes `DB` + `ADMIN_PIN`.
- `src/app/api/*` — route handlers: `players` (register/delete), `draw`
  (PIN-guarded, requires every discipline to have ≥4 players), `matches/[id]/result`
  (winner-only, auto-creates semis → third+final when a stage completes),
  `reset` (PIN-guarded).
- `src/app/*` — client pages: `/` dashboard, `/setup` self-registration + draw,
  `/d/[slug]` groups + bracket, `/general` ranking.
- Device identity = `localStorage` player id (`useMyPlayerId`), no accounts.

## Key rules

- Match result is only who won (no scores). Group points = wins; ties broken by
  head-to-head within the tied subset; a full circle stays unresolved (players
  replay in real life and edit a result).
- Draw: target group size 3/4/5 → 1–4 groups per discipline (players who opted
  in only). Playoff always takes 4: 1 group → top 4; 2 groups → A1-B2/B1-A2;
  3 groups → winners + best runner-up (avoids own-group winner); 4 → winners.
- Group results freeze once the playoff starts; semi results freeze once the
  final exists. Escape hatch = PIN-guarded reset.

## Commands

```bash
npm run dev                                        # local dev (local D1 via miniflare)
npm test                                           # vitest on tournament logic
npx tsc --noEmit && npx eslint src test            # rest of the quality gate
npx wrangler d1 migrations apply kawalerski --local    # after adding a migration
npm run deploy                                     # build (OpenNext) + wrangler deploy
```

Quality gate before any commit: tsc + eslint + vitest, all green.

## Production

- URLs: https://kawalerski-matiego.pl, https://www.kawalerski-matiego.pl
  (Worker custom domains), https://kawalerski-matiego.mwojtasik167.workers.dev
- D1 database `kawalerski` (id in `wrangler.jsonc`); remote migrations:
  `npx wrangler d1 migrations apply kawalerski --remote`
- `ADMIN_PIN` is a Worker secret (`npx wrangler secret put ADMIN_PIN`); locally
  it lives in `.dev.vars` (gitignored). Guards draw + reset only.
- Keep `workers_dev: true` in `wrangler.jsonc` — adding `routes` silently
  disables workers.dev otherwise (bit us once).
- Production data is real guest signups — never reset or seed prod casually.

## Gotchas

- `wrangler.jsonc` `WORKER_SELF_REFERENCE` service name must equal the worker name.
- eslint config imports flat configs from `eslint-config-next/*` directly
  (the FlatCompat scaffold version crashes with eslint-config-next 16).
- Multiple Claude sessions may share the local D1 (`.wrangler/state/`) — the
  dev DB can contain someone's manual test tournament; don't assume it's empty.
