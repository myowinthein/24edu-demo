# CLAUDE.md

## Project Identity

**24edu-demo** — Internal demo: AI-powered university info chatbot with a live admin panel for human takeover of chat sessions. Gemini answers questions grounded in uploaded CSV/Excel data (vector search) with an education-topic Google Search fallback. Admins can monitor sessions in real time and take over from the AI. Students fill a lead form before chatting.

Stack: Next.js 14 App Router · TypeScript · Google Gemini · Upstash Redis · Upstash Vector · ioredis (pub/sub) · Vitest · Vercel

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
npm run dev           # dev server on :3000
npm run build         # production build
npm start             # production server
npm test              # run Vitest suite (170 tests)
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

Required env vars (`.env.local.example` is complete — all vars are listed there):
```
GEMINI_API_KEY
KV_REST_API_URL / UPSTASH_REDIS_REST_URL   # @upstash/redis REST
KV_REST_API_TOKEN / UPSTASH_REDIS_REST_TOKEN
REDIS_URL                                  # ioredis TCP (rediss://default:token@host:port)
UPSTASH_VECTOR_REST_URL
UPSTASH_VECTOR_REST_TOKEN
ADMIN_USERNAME
ADMIN_PASSWORD_HASH                        # SHA-256 hex of the admin password
```

---

## Architecture Pointers

| File | Why it matters |
|------|----------------|
| `lib/types.ts` | Canonical types: `SessionMode`, `SessionMessage`, `SessionMeta`, `SourceEntry`, `LeadData` |
| `lib/redis.ts` | @upstash/redis client + all Redis key helpers (`sessionMessagesKey`, `leadKey`, etc.) |
| `lib/pubsub.ts` | ioredis subscriber factory (`createSubscriber`) + publish helpers; defines `sessionChannel` |
| `lib/vector.ts` | CSV chunking (5 rows/chunk), Upstash Vector upsert/delete/query; `VECTOR_MIN_SCORE = 0.4` |
| `lib/session-actions.ts` | `setSessionMode` — reads messages, sets mode, publishes both channels; used by join/leave/switch-ai routes |
| `lib/sse.ts` | `createChannelSSE` — shared SSE factory wrapping ioredis subscriber; used by both stream endpoints |
| `lib/xlsx-utils.ts` | `xlsxToCSV` — converts Excel workbook to multi-section CSV (`# Sheet: <name>` blocks); `chunkCsv` in vector.ts parses this format |
| `lib/admin-auth.ts` | Token verification for API routes (reads `admin_token` cookie → Redis) |
| `middleware.ts` | Protects `/admin/*` and `/api/admin/*`; redirects unauthenticated to `/admin/login` |
| `app/(user-area)/UserAreaContext.tsx` | Shared React context for `/chat` and `/profile`; holds `sessions`, `guestId`, `leadSubmitted`, `leadName`, `pendingSession` — loaded once, prevents sidebar reload on page switch |
| `app/(user-area)/layout.tsx` | User-side shell (sidebar + top nav) rendered once across `/chat` and `/profile`; `pendingSession` signals chat page to load a session |
| `app/admin/layout.tsx` | Admin shell: live SSE, browser notifications, unread badge logic |
| `app/api/chat/route.ts` | Main chat handler: vector search → Gemini → publish SSE; education-keyword grounding fallback when local data is empty |
| `app/api/lead/route.ts` | Lead capture: validates 8 fields (UUID, email regex, phone regex), normalises, stores in Redis |
| `app/chat/constants.ts` | `MODELS` list and `DEFAULT_MODEL` (`gemini-3.5-flash-lite`); source of truth for the model picker |

---

## Behavior Rules

- Commit automatically after every completed task (solo mode, no PRs).
- Tests exist — run `npm test` after non-trivial code changes; fix failures before committing.
- API routes that open SSE connections **must** export `runtime = 'nodejs'` — Edge runtime cannot use ioredis.
- Do not introduce a third Redis client; the two-client pattern (REST + ioredis) is intentional.
- Lead form (`app/chat/components/LeadForm.tsx`) gates the chat UI until `leadSubmitted === true`; the layout hides the sidebar during this state.

---

## Hard Safety Rules

- Never log or expose `ADMIN_PASSWORD_HASH`, `REDIS_URL`, or any `*_TOKEN` values.
- Admin login stores a SHA-256 hash, not plaintext; never revert this to plaintext comparison.
- Admin session tokens expire in 24 h (Redis `ex: 86400`); do not extend without deliberate decision.
- `app/api/session/[id]/request-human` enforces guestId ownership (403 if mismatch); do not weaken this check.

---

## Known Traps

- **Two Redis clients are required.** `@upstash/redis` (REST) cannot `subscribe`; ioredis (TCP) is used only for pub/sub. `REDIS_URL` must point to the same Upstash instance via a `rediss://` URL.
- **SSE routes need `runtime = 'nodejs'`.** Missing this export causes silent failure on Vercel Edge.
- **Session messages stored as full arrays.** Each write to Redis replaces the entire message array for a session. Long sessions accumulate payload; consider trimming if this becomes a problem.
- **Vector score threshold is 0.4** (in `queryRelevantChunks`). Results below this are silently dropped; low-quality data or off-topic questions return zero chunks and Gemini falls back to "no data loaded".
- **`pendingSession` is the layout→page signal.** The user-area layout cannot pass props to child pages in Next.js App Router. `UserAreaContext.pendingSession` (`string | 'new' | null`) is the only channel between the sidebar (in layout) and the chat page. An `initialized` ref in the chat page prevents double-init on re-render.
- **Grounding is a two-layer guard.** Google Search only fires when `queryRelevantChunks` returns empty AND `isEducationRelated(message)` is true. The keyword list is hardcoded in `app/api/chat/route.ts`; adding non-education keywords there will expand grounding scope unintentionally.
- **xlsx-utils functions are private.** `toCSVCell`, `toCSVRow`, `headerScore`, `findHeaderIdx`, `buildHeader` are not exported — test them indirectly through `xlsxToCSV`.

## Rules

This project follows the rules shipped in claude-helm:
- ~/.claude/plugins/marketplaces/claude-helm/rules/git.md
- ~/.claude/plugins/marketplaces/claude-helm/rules/safety.md

At the start of every session, check whether the paths above exist on this machine.
If either is missing, inform the user: "helm rules are referenced in CLAUDE.md but the
plugin is not installed on this machine. Install it with: /plugin install claude-helm"

<!-- last-reviewed: b4138bd83ea16e2e99b1f75291a8578a4ba407a4 -->
