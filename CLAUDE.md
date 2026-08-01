# CLAUDE.md

## Project Identity

**24edu-demo** — Internal demo: AI-powered university info chatbot with a live admin panel for human takeover of chat sessions. Gemini answers questions grounded in uploaded CSV/Excel data (vector search) with an education-topic Google Search fallback. Admins can monitor sessions in real time and take over from the AI. Students fill a lead form before chatting. Identity is neutral/white-label — no institution name is hardcoded.

Stack: Next.js 14 App Router · TypeScript · Google Gemini · Upstash Redis · Upstash Vector · ioredis (pub/sub) · react-markdown (admin message rendering) · Vitest · Vercel

Blast radius: demo/internal only — no user accounts, Redis data is ephemeral.

---

## Project Config

```
git-strategy: solo
git-auto-commit: true
readme-style: standard
```

---

## Dev Commands

```bash
npm run dev           # dev server on :3000
npm run build         # production build
npm start             # production server
npm test              # run Vitest suite (245 tests)
npm run test:watch    # watch mode
npm run test:coverage # coverage report
npm run lint          # next lint (no config file yet — first run triggers Next's interactive setup)
npm run type-check    # tsc --noEmit
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
| `lib/types.ts` | Canonical types: `SessionMode`, `SessionMessage`, `SessionMeta`, `SourceEntry`, `LeadData`, `SessionRow` |
| `lib/redis.ts` | @upstash/redis client + all Redis key helpers (`sessionMessagesKey`, `leadKey`, etc.) |
| `lib/pubsub.ts` | ioredis subscriber factory (`createSubscriber`) + publish helpers; defines `sessionChannel` |
| `lib/vector.ts` | CSV chunking (5 rows/chunk), Upstash Vector upsert/delete/query; `VECTOR_MIN_SCORE = 0.4`; throws at import if vector env vars are missing |
| `lib/session-actions.ts` | `setSessionMode` — reads messages, sets mode, publishes both channels; used by join/leave/switch-ai routes |
| `lib/sse.ts` | `createChannelSSE` — shared SSE factory wrapping ioredis subscriber; used by both stream endpoints |
| `lib/xlsx-utils.ts` | `xlsxToCSV` — converts Excel workbook to multi-section CSV (`# Sheet: <name>` blocks); `chunkCsv` in vector.ts parses this format |
| `lib/admin-auth.ts` | Token verification for API routes (reads `admin_token` cookie → Redis) |
| `lib/prompts.ts` | Single source of truth for all Gemini system prompt strings; imported by both `app/api/chat/route.ts` and the admin settings Prompts tab |
| `lib/use-theme.ts` | `useTheme()` hook — light/dark state via `document.documentElement.classList` + `localStorage`; default is light, initial state is always `dark=false` until `useEffect` runs |
| `lib/ui-styles.ts` | Shared inline-style constants (`toolbarBtnStyle`, `popoverItemStyle`, `navLinkStyle`) reused across admin/user pages |
| `middleware.ts` | Protects `/admin/*` and `/api/admin/*`; only checks cookie *presence* — actual validity is checked per-route via `verifyAdminToken` |
| `app/layout.tsx` | Root layout; inline `<head>` script sets the `dark` class pre-hydration to avoid theme FOUC |
| `app/(user-area)/UserAreaContext.tsx` | Shared React context for `/chat` and `/profile`; holds `sessions`, `guestId`, `leadSubmitted`, `leadName`, `pendingSession` — loaded once, prevents sidebar reload on page switch |
| `app/(user-area)/layout.tsx` | User-side shell (sidebar + top nav) rendered once across `/chat` and `/profile`; `pendingSession` signals chat page to load a session |
| `app/admin/layout.tsx` | Admin shell: live SSE, browser notifications, unread badge logic, theme toggle |
| `app/admin/settings/page.tsx` | Data/Prompts tabs; Prompts tab renders `lib/prompts.ts` strings read-only in a 1×4 column layout |
| `app/api/chat/route.ts` | Main chat handler: vector search → Gemini → publish SSE; education-topic grounding fallback with follow-up context and contact-query override |
| `app/api/lead/route.ts` | Lead capture: validates 8 fields (UUID, email regex, phone regex), normalises, stores in Redis |
| `app/chat/components/lead-form-data.ts` | Shared lead-form field defs, regexes, and `validate()` — used by `LeadForm.tsx` and `app/(user-area)/profile/page.tsx` |
| `app/chat/constants.ts` | `MODELS` list and `DEFAULT_MODEL` (`gemini-3.5-flash-lite`); re-exports `SessionRow` from `lib/types` |

---

## Domain Rules

- Session mode lifecycle (`SessionMode`: `ai → requested → human → ai`, or `→ ended` from any state): `request-human` transitions `ai`/`null → requested` with guestId-match enforcement (only checked when a guestId is supplied); `switch-ai` (admin-only) forces any mode back to `ai`; `end` (guest-facing) forces `ended` with guestId-match enforcement; `join`/`leave` (admin-only) move to/from `human` via `lib/session-actions.ts`.
- While a session's mode is not `ai`, `POST /api/chat` short-circuits with `{ waiting: true }` and does not call Gemini — messages are still persisted and published.
- Grounding (Google Search) fires when `isEducationRelated(message + recentContext)` is true (last 4 guest turns count as context, and a standalone `\buni\b` shorthand also counts as education-related) AND either local vector chunks are empty OR the message matches the contact-query regex (email/phone/website/etc.) — contact details are never in the CSV data, so contact questions always ground even with local chunks present.
- Model selection is allowlisted: `app/api/chat/route.ts` only honors a client-supplied `model` if it's in `MODELS`; otherwise it silently falls back to `DEFAULT_MODEL` with no error.
- Leads-list `sort` query param is allowlisted (`VALID_SORT_KEYS`); anything else silently falls back to `submittedAt`.
- Phone number validation is enforced by two independent, non-identical regexes: client `PHONE_NUM_RE` (post-digit-stripped, 6–15 chars) in `lead-form-data.ts`, and server `PHONE_RE` (`^[+\d][\d\s\-(). ]{6,19}$`) in `app/api/lead/route.ts` against the combined country-code + digits string — do not assume they're interchangeable.

---

## Behavior Rules

- Commit automatically after every completed task (solo mode, no PRs).
- Tests exist — run `npm test` after non-trivial code changes; fix failures before committing.
- API routes that open SSE connections **must** export `runtime = 'nodejs'` — Edge runtime cannot use ioredis.
- Do not introduce a third Redis client; the two-client pattern (REST + ioredis) is intentional.
- Lead form (`app/chat/components/LeadForm.tsx`) gates the chat UI until `leadSubmitted === true`; the layout hides the sidebar during this state.
- Gemini system prompt strings live only in `lib/prompts.ts`, imported by both the chat route and the settings Prompts tab — do not hardcode or duplicate prompt text elsewhere, or the read-only settings display will drift from what's actually sent to Gemini.
- Shared inline styles belong in `lib/ui-styles.ts`, not ad hoc per-component objects.

---

## Hard Safety Rules

- Never log or expose `ADMIN_PASSWORD_HASH`, `REDIS_URL`, or any `*_TOKEN` values.
- Admin login stores a SHA-256 hash, not plaintext; never revert this to plaintext comparison.
- Admin session tokens expire in 24 h (Redis `ex: 86400`); do not extend without deliberate decision.
- `app/api/session/[id]/request-human` and `app/api/session/[id]/end` enforce guestId ownership (403 if mismatch); do not weaken this check.
- `app/api/session/[id]/switch-ai` requires admin auth (`verifyAdminToken`) — without it, anyone could flip a session back to AI away from a human agent.
- `app/api/admin/logout` requires admin auth before deleting the Redis session token.
- `middleware.ts` only checks admin-cookie presence, not validity — every `/api/admin/*` route must independently call `verifyAdminToken`; do not rely on middleware alone.
- HTTP security headers are set globally in `next.config.js` (`X-Frame-Options`, HSTS, etc.) — don't remove without deliberate reason.

---

## Known Traps

- **Two Redis clients are required.** `@upstash/redis` (REST) cannot `subscribe`; ioredis (TCP) is used only for pub/sub. `REDIS_URL` must point to the same Upstash instance via a `rediss://` URL.
- **SSE routes need `runtime = 'nodejs'`.** Missing this export causes silent failure on Vercel Edge.
- **Session messages stored as full arrays.** Each write to Redis replaces the entire message array for a session. Long sessions accumulate payload; consider trimming if this becomes a problem.
- **Vector score threshold is 0.4, inclusive.** `queryRelevantChunks` keeps `score >= VECTOR_MIN_SCORE`; a chunk scoring exactly 0.4 is included. Below-threshold results are silently dropped; low-quality data or off-topic questions return zero chunks and Gemini falls back to "no data loaded".
- **`pendingSession` is the layout→page signal.** The user-area layout cannot pass props to child pages in Next.js App Router. `UserAreaContext.pendingSession` (`string | 'new' | null`) is the only channel between the sidebar (in layout) and the chat page. An `initialized` ref in the chat page prevents double-init on re-render.
- **`xlsx-utils` functions are private.** `toCSVCell`, `toCSVRow`, `headerScore`, `findHeaderIdx`, `buildHeader` are not exported — test them indirectly through `xlsxToCSV`.
- **Optimistic `SessionRow` updates must include `mode`.** The chat page builds an optimistic sidebar entry for a brand-new session before the server round-trip completes; omitting `mode` breaks the mode-dot indicator (previously fixed once already).
- **Theme FOUC avoidance depends on the inline script in `app/layout.tsx`'s `<head>`.** `useTheme()`'s initial React state is always light (`dark=false`) until `useEffect` runs, so SSR/first paint is always light regardless of stored preference — that's by design, not a bug, but don't "fix" it by reading `localStorage` in a `useState` initializer (breaks SSR).
- **`request-human` doesn't validate `params.id` against `UUID_RE`**, unlike `end` and `switch-ai` — an inconsistency to be aware of if touching any of the three session-mode-transition routes.
- **Mode dot colors/labels are duplicated** between `app/chat/components/ChatSidebar.tsx` and `app/admin/layout.tsx` with no shared constant — a future palette change must be applied in both places.
- **Quota (429) and generic Gemini errors both return HTTP 503.** They're only distinguishable by response body text (`isQuota` check in `app/api/chat/route.ts`), not status code.
- **No ESLint config file exists** even though `npm run lint` is wired up — first invocation of `next lint` triggers Next's interactive setup prompt, which will hang in a non-interactive/CI context.

## Rules

This project follows the rules shipped in claude-helm:
- ~/.claude/plugins/marketplaces/claude-helm/rules/git.md
- ~/.claude/plugins/marketplaces/claude-helm/rules/safety.md

At the start of every session, check whether the paths above exist on this machine.
If either is missing, inform the user: "helm rules are referenced in CLAUDE.md but the
plugin is not installed on this machine. Install it with: /plugin install claude-helm"

<!-- last-reviewed: 3cb8e38cd0f92636eeb149949f7d0601e100534f -->
