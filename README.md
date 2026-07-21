# 24edu-demo

Internal demo: AI-powered data analyst chatbot with live admin monitoring and human takeover.

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Background

Upload CSV or Excel files as a knowledge base. Guests chat with a Gemini-powered AI that answers questions grounded in the uploaded data via vector search. Admins can watch sessions in real time, type alongside the AI, and take over the conversation entirely when needed — then hand it back.

Two surfaces:

- **`/chat`** — guest-facing chat interface with session history and browser notifications
- **`/admin`** — password-protected panel for live session monitoring, human handoff, source management, and settings

## Install

**Prerequisites:** Node.js 18+, an Upstash account (Redis + Vector index), a Google Gemini API key.

```bash
npm install
cp .env.local.example .env.local
# fill in all variables — see below
npm run dev
```

**Environment variables** (`.env.local`):

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key |
| `KV_REST_API_URL` | Upstash Redis REST URL (from Vercel integration or dashboard) |
| `KV_REST_API_TOKEN` | Upstash Redis REST token |
| `REDIS_URL` | Upstash Redis TCP URL for pub/sub — `rediss://default:<token>@<host>:<port>` |
| `UPSTASH_VECTOR_REST_URL` | Upstash Vector index REST URL |
| `UPSTASH_VECTOR_REST_TOKEN` | Upstash Vector index REST token |
| `ADMIN_USERNAME` | Admin login username |
| `ADMIN_PASSWORD_HASH` | SHA-256 hex digest of the admin password |

To generate `ADMIN_PASSWORD_HASH`:
```bash
echo -n "yourpassword" | shasum -a 256
```

## Usage

**Guest chat**

Open `/chat`. Messages are answered by Gemini using any uploaded data sources. If no sources are loaded, the AI prompts the guest to upload one. Guests can request a human agent at any time.

**Admin panel**

Go to `/admin` and log in. From there you can:

- **Sessions** — watch active chats live, join a session to type alongside the AI, or take full control (`human` mode) and release it back to AI when done.
- **Sources** — upload CSV or Excel files. Each file is chunked (5 rows/chunk) and indexed into Upstash Vector. Delete individual sources to remove their vectors.
- **Settings** — configure the Gemini model and system prompt used for AI responses.

**Deployment**

The project is linked to Vercel (`vercel deploy`). The Upstash Redis and Vector integrations can be provisioned directly from the Vercel dashboard.

## Contributing

Internal project — not open for external contributions.

## License

Private. All rights reserved.

<!-- last-reviewed: 3c8e2068a839016deb50e46d14aa7a261a9dac85 -->
