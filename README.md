# 24edu-demo

AI-powered university chatbot with lead capture, live session monitoring, and human-agent takeover.

## Table of Contents

- [Background](#background)
- [Architecture](#architecture)
- [Install](#install)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Background

Upload CSV or Excel files as a knowledge base. Before chatting, each guest completes a lead form (name, email, phone, country, education level, intended programme and intake). Gemini answers their questions grounded in the uploaded data via vector search. When local data is thin, education-related questions fall back automatically to Google Search grounding.

Admins monitor all sessions in real time, can type alongside the AI without taking it offline, or switch to full human control and hand back when done. AI-generated session summaries are available on demand.

Three surfaces:

- **`/chat`**: lead form gate → chat interface with session history
- **`/profile`**: guests can update their lead details after initial submission
- **`/admin`**: password-protected panel for live sessions, sources, leads, and settings

## Architecture

### Data flow: guest message

```
Guest types message
  → POST /api/chat
      ├─ queryRelevantChunks()        vector search (Upstash Vector, threshold 0.4)
      │
      ├─ chunks found?
      │   yes → systemPrompt: "answer from data only"
      │   no  + education topic? → systemPrompt: "use Google Search"
      │          (contact query overrides: always grounds even with chunks)
      │
      ├─ Gemini generateContent()     model + systemInstruction + chat history
      │
      ├─ redis.set(messages)          persist updated message array
      └─ publish(sessionChannel)      SSE fans out to admin + guest streams
```

### Real-time layer

Two Redis clients run side-by-side, a deliberate architectural decision:

| Client | Package | Used for |
|---|---|---|
| REST client | `@upstash/redis` | All reads/writes (sessions, leads, sources, tokens) |
| TCP client | `ioredis` | Pub/sub only; REST cannot `subscribe` |

Admin and guest UIs both hold an open SSE connection. When a session changes (new message, mode switch, typing indicator), the API route publishes to Redis; `createChannelSSE` in `lib/sse.ts` fans the event out to all subscribers without polling.

SSE routes export `runtime = 'nodejs'`; Edge runtime cannot use ioredis.

### Grounding: two-layer guard

Google Search only fires when **both** conditions are true:

1. `queryRelevantChunks()` returns empty **or** the query is contact-related (email, phone, website)
2. `isEducationRelated()` matches the message + last 4 guest turns

This prevents the AI from web-searching off-topic questions (weather, news, etc.) while still answering "what is the tuition fee?" when the CSV has no fee data.

### Session mode state machine

```
ai  ──(guest requests human)──▶  requested  ──(admin joins)──▶  human
 ▲                                                                  │
 └──────────────────────(admin releases / switch-ai)───────────────┘
                                    │
                              ended (terminal)
```

Mode is stored as a Redis key. `setSessionMode()` in `lib/session-actions.ts` is the single function that reads messages, writes the new mode, and publishes both the session channel and the global sessions list. No other code touches mode directly.

### Vector ingestion

```
Upload CSV / Excel
  → xlsxToCSV()        multi-sheet Excel → single CSV with # Sheet: headers
  → chunkCsv()         5-row sliding chunks with header prepended to each
  → upsert()           Upstash Vector (chunk text + sourceId metadata)
```

Deleting a source removes all vectors by sourceId filter, leaving no orphaned embeddings.

### Key files

| File | Role |
|---|---|
| `lib/types.ts` | Canonical types: `SessionMode`, `SessionMessage`, `SessionRow`, `LeadData` |
| `lib/redis.ts` | REST client + all key helpers (`sessionMessagesKey`, `leadKey`, …) |
| `lib/pubsub.ts` | ioredis subscriber factory + publish helpers |
| `lib/vector.ts` | CSV chunking, Upstash Vector upsert / delete / query |
| `lib/sse.ts` | Shared SSE factory wrapping ioredis subscriber |
| `lib/session-actions.ts` | `setSessionMode`: single source of truth for mode transitions |
| `lib/prompts.ts` | Gemini system prompt variants (imported by chat route + settings page) |
| `lib/xlsx-utils.ts` | Excel → CSV conversion, header detection, multi-sheet support |
| `middleware.ts` | Protects `/admin/*` and `/api/admin/*`, redirects to login |
| `app/api/chat/route.ts` | Main chat handler: vector → Gemini → publish |
| `app/(user-area)/UserAreaContext.tsx` | Shared React context preventing sidebar reload on page switch |

### Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router, React 18, TypeScript 5 |
| AI | Google Gemini (`@google/generative-ai`) |
| Vector store | Upstash Vector |
| Session store | Upstash Redis (REST) |
| Pub/sub | Upstash Redis (ioredis TCP) |
| File parsing | xlsx |
| Markdown rendering | react-markdown + remark-gfm |
| Testing | Vitest (245 tests) |
| Deployment | Vercel |

## Install

**Prerequisites:** Node.js 18+, an Upstash account (Redis + Vector index), a Google Gemini API key.

```bash
npm install
cp .env.local.example .env.local
# fill in all variables (see table below)
npm run dev
```

**Environment variables** (`.env.local`):

| Variable | Description |
|---|---|
| `ADMIN_USERNAME` | Admin login username |
| `ADMIN_PASSWORD_HASH` | SHA-256 hex of the admin password |
| `GEMINI_API_KEY` | Google AI Studio API key |
| `KV_REST_API_URL` | Upstash Redis REST URL |
| `KV_REST_API_TOKEN` | Upstash Redis REST token |
| `REDIS_URL` | Upstash Redis TCP URL: `rediss://default:<token>@<host>:<port>` |
| `UPSTASH_VECTOR_REST_URL` | Upstash Vector REST URL |
| `UPSTASH_VECTOR_REST_TOKEN` | Upstash Vector REST token |

Generate `ADMIN_PASSWORD_HASH`:

```bash
echo -n "yourpassword" | shasum -a 256
```

All variables are required. The app throws on startup if any are missing.

## Usage

**Guest chat**

Open `/chat`. Complete the lead form, then start chatting. Gemini answers using uploaded data sources and falls back to Google Search for education topics not covered by the data. Guests can request a human agent or end the session at any time. Previous sessions appear in the sidebar with a status dot indicating who they are currently talking to.

**Profile**

Open `/profile`. Guests can update any lead details submitted during the initial form.

**Admin panel**

Go to `/admin` and log in. From there:

- **Sessions**: monitor active chats live, join a session to type alongside the AI, or take full control (`human` mode) and release back to AI when done. Request AI-generated summaries per session.
- **Sources**: upload CSV or Excel files. Files are chunked into 5-row segments and indexed into Upstash Vector. View rows in a paginated table, delete individual sources to remove their vectors. Multi-sheet Excel is fully supported.
- **Leads**: browse captured lead data with filtering, sorting, and pagination.
- **Settings → Data**: clear sessions, leads, or sources independently with live counts.
- **Settings → Prompts**: view the exact system prompts sent to Gemini for each query scenario (read-only).

The UI supports light and dark mode, toggled from the navigation bar.

**Tests**

```bash
npm test              # run all 245 tests
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

**Deploy**

```bash
vercel deploy
```

Provision Upstash Redis and Vector directly from the Vercel dashboard.

## Contributing

Internal demo project, not open for external contributions.

## License

Private. All rights reserved.

<!-- last-reviewed: cdeabb71d996fe062c193e9eae488c5f462152c3 -->
