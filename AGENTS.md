# AGENTS.md

## Project Identity

24edu-demo is an internal university-information chatbot with guest lead capture, Gemini answers grounded in uploaded CSV/Excel data, and a live admin panel for human takeover.
Stack: Next.js 14 App Router, React 18, TypeScript, Google Gemini, Upstash Redis/Vector, ioredis, Vitest and Vercel. Guests have browser-local identifiers rather than accounts.

## Project Config

- ship-method: direct
- git-auto-commit: true
- git-merge-strategy: squash
- readme-style: standard

## Dev Commands

- `npm install`; copy `.env.local.example` to `.env.local` and supply the required values.
- `npm run dev`: development server on port 3000.
- `npm run build` then `npm start`: production build/server.
- `npm test`: Vitest suite; `npm run test:watch` and `npm run test:coverage` are available.
- `npm test -- tests/api/chat.test.ts`: focused chat-route tests.
- `npm run type-check`: TypeScript without emitting JavaScript.
- `npm run lint` invokes Next's interactive setup because no ESLint config exists; configure lint before using it unattended.

Required environment keys: `GEMINI_API_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, Redis REST URL/token (`KV_REST_API_URL`/`KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`), `REDIS_URL`, and `UPSTASH_VECTOR_REST_URL`/`UPSTASH_VECTOR_REST_TOKEN`. Redis and vector modules throw at import when their required keys are absent. Tests supply dummy environment values in `vitest.setup.ts`.

## Architecture Pointers

- `lib/types.ts` owns session, message, source and lead types; `lib/redis.ts` owns REST storage and Redis key helpers.
- Two Redis clients are intentional: `@upstash/redis` handles storage and publishing; ioredis creates TCP subscribers in `lib/pubsub.ts`. Both must target the same Redis instance.
- `lib/sse.ts` wraps subscribers for SSE. `lib/use-event-source.ts` reconnects clients after three seconds. Session events carry complete message arrays and mode; global events trigger list refetches.
- `app/api/chat/route.ts` persists the guest turn, queries vector context, selects grounding/prompts/models, calls Gemini and publishes the result.
- Chat prompts live in `lib/prompts.ts`, also displayed read-only by admin Settings. The summary route currently has its own inline prompt.
- `lib/vector.ts` chunks/indexes/queries sources. `lib/xlsx-utils.ts` emits `# Sheet: <name>` CSV sections; vector chunks use `Sheet: <name>`. Preserve this ingestion/display contract.
- `app/(user-area)/UserAreaContext.tsx` shares guest identity, lead status, sessions and `pendingSession` across chat/profile. The layout sends session selections through that context; the chat page guards initialization with a ref.
- `app/chat/components/use-lead-form.ts` and `lead-form-data.ts` serve lead capture and profile editing; profile parsers depend on the stored phone and intake formats.
- `app/admin/layout.tsx` owns global SSE, unread indicators and notifications; session details own takeover, replies and typing events.
- `lib/session-actions.ts` implements join/leave mode writes and both publications. Other transition routes also write mode directly.
- `lib/ui-styles.ts` holds shared inline styles; `lib/use-theme.ts`, root layout and CSS variables coordinate themes.

## Domain Rules

- Modes are `ai | requested | human | ended`. Request-human changes only missing/`ai` to `requested`; admin join/leave/switch-ai force their target modes. Ended is not enforced as terminal by every route.
- In any non-AI mode, chat still stores/publishes the guest message but returns `{ waiting: true }` without calling Gemini.
- Grounding requires education context from the current message and last four guest turns, plus either no relevant vector chunks or a contact query. Standalone `uni` counts; contact keywords do not bypass the education gate.
- Vector chunks contain five non-overlapping data rows plus a header. Query defaults to six results and includes scores `>= 0.4`. Source deletion uses deterministic chunk IDs and stored `chunkCount`.
- Model IDs/default live in `app/chat/constants.ts`. Unknown client models silently use the default. Chat and summary each try the selected model, then remaining allowed models once, without exposing fallback.
- `sessionModelKey` records the initially resolved chat model, not the fallback winner; summary reuses that value when valid.
- Lead submission is the UI gate. Client phone validation checks 6–15 digit-stripped characters; the server separately validates the combined country code/number. They are not interchangeable.
- Phone is stored as `country-code number`; intake is `Month Year`. Lead email is lowercased and selected string fields are trimmed.
- Leads-list sort keys are allowlisted, with invalid keys falling back to `submittedAt`; filtering/sorting/pagination happen after loading leads.

## Hard Safety Rules

- Never print or commit real credential values, including `ADMIN_PASSWORD_HASH`, credential-bearing `REDIS_URL`, or tokens.
- Preserve SHA-256 admin-password verification and the 24-hour Redis/cookie token lifetime.
- Every protected admin handler must verify the token through `verifyAdminToken`; cookie presence in middleware is insufficient. Login is the public exception.
- Keep admin authentication on switch-ai, source mutations and logout, and preserve the existing guest mismatch checks.
- SSE routes must export `runtime = 'nodejs'`; ioredis cannot run in Edge.
- Preserve the global HTTP security headers in `next.config.js`.
- Treat clear-data endpoints and the reindex script as destructive operations against the configured services; do not run them as setup or verification.

## Known Traps

- Middleware checks only admin-cookie presence. Guest session/lead/message/summary reads rely on UUID knowledge, not account authentication; do not describe UUIDs as an authorization system.
- Request-human and end reject ownership mismatches only when both supplied and stored guest IDs exist. Omitting `guestId` skips the comparison; the guest End chat caller currently omits it.
- All three request-human/end/switch-ai routes validate session UUIDs. The guest UI offers Switch to AI, but its endpoint requires admin auth, so ordinary guests receive 401.
- The guest UI blocks AI chat when no sources are uploaded, even though the API can ground education queries without vector matches. `/sources` redirects to `/admin/sources` through middleware.
- Admin session UI enables replies in human mode, but the message API preserves an existing AI mode. Distinguish UI restrictions from server enforcement.
- Messages and source lists use whole-array read/modify/write operations; concurrent writes can race and long conversations grow without trimming.
- Chat quota and generic Gemini failures both return 503 with different body text; summary failures return 500.
- Session clearing removes messages/mode/meta and guest indexes but leaves per-session model keys.
- Theme React state starts light until its effect runs. The root inline head script applies the stored dark class before hydration; preserve both pieces.
- Optimistic sidebar entries need `mode`. Mode colors/labels are duplicated between the guest sidebar and admin layout.
- Excel header helpers are private; test through `xlsxToCSV`. The reindex script duplicates Excel-conversion logic, so changes can drift.
- `scripts/reindex-sources.mjs` deletes existing registered vectors before reading `sources/*.xlsx` and replacing the source list. It needs real service access, a usable sources directory and a Node runtime capable of importing the TypeScript chunker; it is not a routine local verification command.
- `app/legal/*.mdx` are source documents; this scan found no page route rendering them. Their presence is not proof of a published legal surface.
- Vercel config declares Next.js, but deployment triggers and provider protection were not inspected. No repository CI workflow or active Git hook was found.

## Rules

- Follow [.github/links.md](.github/links.md) when editing references, documentation or interface links.

Read and follow the existing local rules before relevant actions:

- `.claude/rules/git.md`
- `.claude/rules/safety.md`

<!-- last-reviewed: 6f4a83130a053c58df8e17bf39573c7ef2fc1e57 -->
