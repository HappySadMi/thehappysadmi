# Happy Sad Mi chatbot Worker

Cloudflare Worker that will power the site chatbot. Deploys to
`https://portfolio.happysadmi.workers.dev`.

**Status: Phase 1 complete — no AI wired up yet.** The Worker currently only
proves the plumbing: correct account, live content fetching, CORS, and input
validation. `/chat` returns the exact payload the model will receive.

## Files

```
wrangler.toml              name, pinned account_id, vars
src/index.js               fetch handler: CORS, routing, validation
src/knowledge.js           live content fetch + edge cache + snapshot fallback
src/prose.js               About story, process steps, tech stack (hand-maintained)
src/prompt.js              short system prompt (~464 tokens)
src/snapshot.js            GENERATED fallback copy of data/*.json
scripts/build-knowledge.mjs  regenerates snapshot.js
.dev.vars.example          local override template
```

## Account

This Worker belongs to **HappySadMi's** Cloudflare account, not the personal
one.

```
email      happysadmi@gmail.com
account_id 010abb6f8110187db697437e1747394c
```

`account_id` is pinned in `wrangler.toml` on purpose, so `wrangler deploy`
cannot land in the wrong account even if you are logged into a different one.

Check which account you are on before deploying:

```bash
npx wrangler whoami
```

## Local development

```bash
cd worker
npx wrangler dev
```

Then:

```bash
curl http://127.0.0.1:8787/health
```

To test against a fixture instead of the live site, copy `.dev.vars.example`
to `.dev.vars` and set `SITE_URL`, or override inline:

```bash
npx wrangler dev --var SITE_URL:http://127.0.0.1:8766
```

## Deploying

```bash
cd worker
npx wrangler whoami          # confirm happysadmi@gmail.com
npx wrangler deploy
```

## Content: how it stays in sync

The Worker fetches the site's own JSON at request time:

```
https://happysadmi.github.io/thehappysadmi/data/*.json
```

So **editing `data/*.json` and pushing requires no Worker change at all.**
There is no build step and no re-deploy to keep the chatbot current — this is
verified by the canary test in the Phase 1 notes.

Results are edge-cached for `CONTENT_CACHE_TTL` seconds (default 300).

If the live fetch fails the Worker falls back to `src/snapshot.js` and reports
`degraded: true` on `/health`. To refresh that snapshot after editing content:

```bash
node worker/scripts/build-knowledge.mjs
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | Service info and phase |
| `GET` | `/health` | Liveness + which content source loaded, with counts |
| `POST` | `/chat` | Phase 1 stub — returns the assembled model payload |
| `GET` | `/prompt` | The static system prompt, for review |

`GET /health` is the useful one:

```json
{
  "ok": true,
  "source": "live",
  "degraded": false,
  "counts": { "services": 5, "portfolio": 4, "team": 5, "testimonials": 3 }
}
```

`source` is one of `live` (fetched this request), `live-cache` (served from the
edge cache) or `snapshot` (fallback).

## Security

- Requests from an origin not in `ALLOWED_ORIGINS` are rejected with 403
  **before** any content fetch happens.
- `Vary: Origin` is set because the response varies by origin.
- CORS echoes only an exact match from the allow-list — never `*`.
- `POST` only, with `message` validated as a non-empty string.
- Messages capped at 800 characters (`413` when exceeded).
- History capped at the last 8 turns.
- Errors are logged server-side and replaced with a generic `500` body, so
  internals are never leaked to the client.
- **No AI yet, so there is no API key to leak.** Phase 3 keeps the model call
  server-side for the same reason.
- Visitor messages are never logged and never persisted.

## Phase 1 verification results

Checked against `wrangler dev`:

| Check | Result |
|---|---|
| Live content fetch from the real Pages URL | `source: live`, counts 5/4/5/3 |
| Edge cache engages on the next request | `source: live-cache` |
| **Anti-staleness canary** | Marker string edited into `data/services.json` appeared in the payload with no rebuild or redeploy |
| Snapshot fallback on dead `SITE_URL` | `degraded: true`, `source: snapshot`, counts intact |
| CORS allows the site origin | correct `Access-Control-Allow-Origin` + `Vary` |
| CORS rejects a foreign origin | 403, no ACAO header |
| Empty / wrong-type / missing message | 400 |
| Invalid JSON body | 400 |
| Oversized message | 413 |
| Unknown path | 404 |
| `GET /chat` | 404 (POST only) |
| System prompt size | ~464 tokens |

## Known gaps before Phase 3

- **No rate limiting.** This is the one deliberate omission so far — the plan
  calls for a Cloudflare WAF rate-limiting rule, or a Durable Object if the
  plan level does not allow one. Phase 2.
- No conversation history is actually used yet (validated, but Phase 1 sends
  nothing to a model).
- `SITE_PROSE` in `src/prose.js` is hand-maintained. If the About copy,
  process steps or tech stack in `index.html` change, update it too.