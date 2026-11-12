# 24edu-demo

AI university chatbot with lead capture, uploaded knowledge sources, and live human takeover.

An internal demo built with Next.js, TypeScript, Google Gemini, and Upstash. Guests ask about university programmes after submitting their contact and education details. Administrators manage sources, monitor conversations, and take over from the AI.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [How it works](#how-it-works)
- [Development](#development)
- [Limitations](#limitations)
- [Contributing](#contributing)
- [License](#license)

## Install

### Dependencies

- Node.js 22.12 or later within the 22.x release line, or Node.js 24+, with npm. These versions satisfy the locked application and test-tool requirements.
- A Google Gemini API key with access to the models listed in [app/chat/constants.ts](app/chat/constants.ts).
- An Upstash Redis database with REST credentials and a TLS TCP connection URL.
- An Upstash Vector index configured to accept text for embedding.

The Redis REST and TCP connections must point to the same database. REST handles storage and publishing; ioredis subscribes to updates over TCP.

### Setup

From the repository root:

```sh
npm ci
cp .env.local.example .env.local
```

Fill in [.env.local.example](.env.local.example)'s keys in your local copy:

| Variable | Value |
| --- | --- |
| `GEMINI_API_KEY` | Gemini API key |
| `ADMIN_USERNAME` | Admin login name |
| `ADMIN_PASSWORD_HASH` | SHA-256 hexadecimal digest of your chosen admin password |
| `KV_REST_API_URL` | Redis REST endpoint |
| `KV_REST_API_TOKEN` | Redis REST token |
| `REDIS_URL` | TLS TCP URL for the same Redis database |
| `UPSTASH_VECTOR_REST_URL` | Vector index endpoint |
| `UPSTASH_VECTOR_REST_TOKEN` | Vector index token |

`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are accepted as alternatives to the two `KV_REST_*` keys. Store the password digest, rather than the plaintext password. Keep real credentials in the ignored `.env.local` file.

## Usage

Start the development server:

```sh
npm run dev
```

Open [localhost:3000](http://localhost:3000); the root redirects to `/chat`.

1. Open `/admin` and log in with the configured admin username and the password whose digest you stored.
2. Open **Sources** and upload a CSV, XLSX, or XLS file. Excel conversion happens in the browser and supports multiple sheets.
3. Open `/chat`, complete the lead form, and ask a question about the uploaded programmes. At least one source must be uploaded before the guest UI enables AI chat.
4. To handle a conversation yourself, open it in the admin panel and take over. Release it to return control to the AI.

| Page | Purpose |
| --- | --- |
| `/chat` | Lead capture, questions, conversation history, human-agent requests, and summaries |
| `/profile` | Update the guest's contact and education details |
| `/admin` | Monitor sessions and open conversations for takeover |
| `/admin/sources` | Upload, inspect, and delete knowledge sources |
| `/admin/leads` | Search and sort leads; export CSV, JSON, or Excel |
| `/admin/settings` | Clear stored data or inspect the chat prompts |

Guests use a browser-local identifier rather than an account. Theme preference and guest identity persist in local storage. Admin tokens expire after 24 hours.

For a production build and local server:

```sh
npm run build
npm start
```

The repository declares Next.js as its Vercel framework. Configure the same environment variables in the deployment environment; deployment itself is separate from the commands above.

## How it works

- Source uploads become five-row chunks with headers in Upstash Vector. Retrieval returns up to six chunks with a similarity score of at least 0.4.
- Gemini answers from those excerpts. Education-related questions can use Google Search when no relevant chunks exist, or when contact details are requested. Recent guest turns supply follow-up context.
- Session messages, leads, source metadata, and admin tokens are stored in Redis. SSE delivers updates to guest and admin screens.
- Session modes are `ai`, `requested`, `human`, and `ended`. While mode is not `ai`, messages are still stored but Gemini is not called.
- Chat and summary requests try the selected allowlisted model, then remaining configured models if it fails.

See [AGENTS.md](AGENTS.md) for implementation pointers and development constraints.

## Development

```sh
npm test
npm test -- tests/api/chat.test.ts
npm run type-check
```

`npm run test:watch` starts watch mode; `npm run test:coverage` produces coverage reports. The Vitest suite uses mocked integrations and dummy environment values from [vitest.setup.ts](vitest.setup.ts).

`npm run lint` currently opens Next.js's interactive ESLint setup because no ESLint configuration is committed. Configure it before using that command unattended.

## Limitations

- This is an internal demo. Guest-facing reads rely on UUID knowledge, and ownership checks on request-human/end are conditional on a supplied guest ID. They are not an account-authentication boundary.
- The guest **Switch to AI** control calls an admin-authenticated endpoint, so an ordinary guest receives an authorization error. Admin handback is available.
- Message arrays are rewritten in full; concurrent writes can race and long conversations increase payload size.
- Model fallback is silent. The stored session model identifies the initially selected model rather than the one that eventually answered.
- Clearing sessions, leads, or sources in Settings deletes service data. The reindex script also deletes existing registered vectors before rebuilding; it is not a setup or test command.
- AI answers may be incomplete or inaccurate. Verify programme details with the institution before relying on them.

## Contributing

Pull requests are welcome. To report a problem, ask a question or suggest an improvement, [open an issue](https://github.com/myowinthein/24edu-demo/issues/new/choose).

## License

24edu-demo is licensed under the [MIT License](LICENSE). © 2026 Myo Win Thein.

<!-- last-reviewed: 26c2f6a12b4534b0e8e2da9c2d2812bdfd4450d3 -->
