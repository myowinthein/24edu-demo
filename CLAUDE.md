# CLAUDE.md

## Project Identity

**24edu-demo** — Internal demo: AI-powered data analyst chatbot with a live admin panel for human takeover of chat sessions. Gemini answers user questions grounded in uploaded CSV/Excel data (vector search). Admins can monitor sessions in real time and take over from the AI.

Stack: Next.js 14 App Router · TypeScript · Google Gemini · Upstash Redis · Upstash Vector · ioredis (pub/sub) · Vercel

Blast radius: demo/internal only — no user accounts, Redis data is ephemeral.

---

## Project Config

```
git-strategy: solo
git-auto-commit: true
```

---

## Dev Commands

```bash
npm run dev       # dev server on :3000
npm run build     # production build
npm start         # production server
```

Required env vars (see `.env.local.example` for partial list):
```
GEMINI_API_KEY
KV_REST_API_URL / UPSTASH_REDIS_REST_URL   # @upstash/redis REST
KV_REST_API_TOKEN / UPSTASH_REDIS_REST_TOKEN
REDIS_URL                                  # ioredis TCP (e.g. rediss://default:token@host:port)
UPSTASH_VECTOR_REST_URL
UPSTASH_VECTOR_REST_TOKEN
ADMIN_USERNAME
ADMIN_PASSWORD_HASH                        # SHA-256 hex of the admin password
```

---

## Architecture Pointers

| File | Why it matters |
|------|----------------|
| `lib/types.ts` | Canonical types: `SessionMode`, `SessionMessage`, `SessionMeta`, `SourceEntry` |
| `lib/redis.ts` | @upstash/redis client + all Redis key helpers (`sessionMessagesKey`, etc.) |
| `lib/pubsub.ts` | ioredis subscriber factory (`createSubscriber`) + publish helpers |
| `lib/vector.ts` | CSV chunking (5 rows/chunk), Upstash Vector upsert/delete/query |
| `lib/admin-auth.ts` | Token verification for API routes (reads `admin_token` cookie → Redis) |
| `middleware.ts` | Protects `/admin/*` and `/api/admin/*`; redirects unauthenticated to `/admin/login` |
| `app/api/chat/route.ts` | Main chat handler: vector search → Gemini → publish SSE; respects session mode |
| `app/api/session/[id]/stream/route.ts` | User-facing SSE endpoint (ioredis subscriber per connection) |
| `app/api/admin/sessions/stream/route.ts` | Admin global SSE (session list updates) |
| `app/admin/layout.tsx` | Admin shell with live SSE, browser notifications, unread badge logic |

---

## Behavior Rules

- Commit automatically after every completed task (solo mode, no PRs).
- No tests exist; verify UI changes by running the dev server.
- API routes that open SSE connections **must** export `runtime = 'nodejs'` — Edge runtime cannot use ioredis.
- Do not introduce a third Redis client; the two-client pattern (REST + ioredis) is intentional.

---

## Hard Safety Rules

- Never log or expose `ADMIN_PASSWORD_HASH`, `REDIS_URL`, or any `*_TOKEN` values.
- Admin login stores a SHA-256 hash, not plaintext; never revert this to plaintext comparison.
- Admin session tokens expire in 24 h (Redis `ex: 86400`); do not extend without deliberate decision.

---

## Known Traps

- **Two Redis clients are required.** `@upstash/redis` (REST) cannot `subscribe`; ioredis (TCP) is used only for pub/sub. `REDIS_URL` must point to the same Upstash instance via a `rediss://` URL.
- **SSE routes need `runtime = 'nodejs'`.** Missing this export causes silent failure on Vercel Edge.
- **`.env.local.example` is incomplete** — it lists only `GEMINI_API_KEY` and `KV_*`. `REDIS_URL`, `UPSTASH_VECTOR_*`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD_HASH` are also required but undocumented there.
- **Session messages stored as full arrays.** Each write to Redis replaces the entire message array for a session. Long sessions accumulate payload; consider trimming if this becomes a problem.
- **Vector score threshold is 0.4** (in `queryRelevantChunks`). Results below this are silently dropped; low-quality data or off-topic questions return zero chunks and Gemini falls back to a "no data loaded" message.

## Rules

This project follows the rules shipped in claude-helm:
- ~/.claude/plugins/marketplaces/claude-helm/rules/git.md
- ~/.claude/plugins/marketplaces/claude-helm/rules/safety.md

At the start of every session, check whether the paths above exist on this machine.
If either is missing, inform the user: "helm rules are referenced in CLAUDE.md but the
plugin is not installed on this machine. Install it with: /plugin install claude-helm"

<!-- last-reviewed: 1dceb0d -->
