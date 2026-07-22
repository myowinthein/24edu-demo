# 24edu-demo

AI-powered university chatbot with lead capture, live session monitoring, and human-agent takeover.

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Background

Upload CSV or Excel files as a knowledge base. Before chatting, each guest completes a lead form (name, email, phone, country, education level, intended program and intake). Gemini then answers their questions grounded in the uploaded data via vector search. When local data is thin, education-related questions fall back to Google Search grounding automatically.

Admins monitor all sessions in real time, can type alongside the AI without taking it offline, or switch to full human control and hand back when done. AI-generated session summaries are available on demand.

Three surfaces:

- **`/chat`** — lead form gate → chat interface with session history and end-conversation
- **`/profile`** — guests can update their lead details after initial submission
- **`/admin`** — password-protected panel for live sessions, sources, leads, and settings

## Install

**Prerequisites:** Node.js 18+, an Upstash account (Redis + Vector index), a Google Gemini API key.

```bash
npm install
cp .env.local.example .env.local
# fill in all variables (see below)
npm run dev
```

**Environment variables** (`.env.local`):

| Variable | Description |
|---|---|
| `ADMIN_USERNAME` | Admin login username |
| `ADMIN_PASSWORD_HASH` | SHA-256 hex digest of the admin password |
| `GEMINI_API_KEY` | Google AI Studio API key |
| `KV_REST_API_URL` | Upstash Redis REST URL |
| `KV_REST_API_TOKEN` | Upstash Redis REST token |
| `REDIS_URL` | Upstash Redis TCP URL for pub/sub — `rediss://default:<token>@<host>:<port>` |
| `UPSTASH_VECTOR_REST_URL` | Upstash Vector index REST URL |
| `UPSTASH_VECTOR_REST_TOKEN` | Upstash Vector index REST token |

To generate `ADMIN_PASSWORD_HASH`:
```bash
echo -n "yourpassword" | shasum -a 256
```

All variables are required. The app throws on startup if any are missing.

## Usage

**Guest chat**

Open `/chat`. Complete the lead form (name, contact details, study preferences), then start chatting. Gemini answers using uploaded data sources. Guests can request a human agent or end the conversation at any time. Previous sessions appear in the sidebar.

**Profile**

Open `/profile` (or use the sidebar link). Guests can update any lead details submitted during the initial form.

**Admin panel**

Go to `/admin` and log in. From there you can:

- **Sessions** — monitor active chats live, join a session to type alongside the AI, or take full control (`human` mode) and release it back to AI when done. Generate an AI summary of any session.
- **Sources** — upload CSV or Excel files. Each file is chunked and indexed into Upstash Vector. View rows in a paginated table, delete individual sources to remove their vectors. Multi-sheet Excel files are fully supported.
- **Leads** — browse captured lead data with filtering, sorting, and pagination.
- **Settings** — configure the Gemini model and system prompt. Clear sessions, leads, or sources independently.

**Deployment**

Deploy to Vercel (`vercel deploy`). Provision Upstash Redis and Vector directly from the Vercel dashboard.

## Contributing

Internal project — not open for external contributions.

## License

Private. All rights reserved.

<!-- last-reviewed: b4138bd83ea16e2e99b1f75291a8578a4ba407a4 -->
