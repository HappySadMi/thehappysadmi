# Happy Sad Mi chatbot Worker

Cloudflare Worker that will power the site chatbot. Deploys to
`https://portfolio.happysadmi.workers.dev`.

**Status: Phase 2 complete — rate limiting is in, no AI yet.** The Worker proves
the plumbing and now enforces per-IP rate limits. `/chat` returns the exact
payload the model will receive.

## Files

```
wrangler.toml              name, pinned account_id, vars, Durable Object binding
src/index.js               fetch handler: CORS, routing, rate limit, validation
src/knowledge.js           live content fetch + edge cache + snapshot fallback
src/ratelimit.js           token-bucket Durable Object + in-isolate fallback
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

## Rate limiting

`POST /chat` is rate limited per client IP with a token bucket:

```
RATE_LIMIT_PER_MINUTE = 20   sustained
RATE_LIMIT_BURST     = 10   bucket depth
```

Exceeding it returns `429` with `Retry-After`, and `X-RateLimit-Limit` /
`X-RateLimit-Remaining` are sent on successful responses too. `GET /health`
and `GET /prompt` are not limited, so the endpoint stays debuggable.

Tune both values in `wrangler.toml` under `[vars]` — no code change needed.

### Why it lives in the Worker

The plan originally preferred a **Cloudflare WAF rate-limiting rule**, which
runs at the edge before the Worker and is cheaper. That turned out not to be
available here:

- WAF rate limiting is a **zone** feature, and this account has **no zone**
  (it uses `workers.dev` only)
- the account is on the **Workers Free plan** (no subscription)

So enforcement lives in the Worker, using **one Durable Object per IP** via
`idFromName(ip)`. A plain module-level `Map` was rejected: Workers are
stateless across isolates, so it would only throttle whichever isolate
happened to be serving an attacker.

If a DO binding is ever missing, `checkRateLimit()` falls back to an
in-isolate bucket rather than failing, so a misconfigured deployment loses
accuracy instead of breaking the endpoint.

### Carrier NAT caveat

The limit is keyed on IP alone. Many Philippine mobile subscribers share one
public IP behind carrier NAT, so a tight limit would lock out real visitors
mid-conversation. `20/min` with a `10` burst is deliberately generous. Raise
it if legitimate users ever report being throttled.

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

## Verification results

Checked against `wrangler dev` (Phases 1 and 2):

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
| **Burst of 30 rapid requests, one IP** | 11 allowed, 19 × `429` with `Retry-After: 2` |
| **Per-IP isolation** | A second IP got its own full bucket (exactly 10), while the exhausted one stayed blocked |
| **Bucket drains deterministically** | Fresh IP drained after exactly 10 requests (= `RATE_LIMIT_BURST`) |
| **Refill rate measured** | 5 requests allowed after a 15s wait → **19 req/min observed** against a 20/min target |
| **Durable Object actually engaged** | Three separate SQLite state files created under `portfolio-RateLimiter/`, one per test IP — confirming the DO path, not the in-isolate fallback |

## Known gaps before Phase 3

- No conversation history is used yet (validated, but nothing is sent to a
  model yet).
- `SITE_PROSE` in `src/prose.js` is hand-maintained. If the About copy,
  process steps or tech stack in `index.html` change, update it too.
- Durable Objects are assumed available on the Workers Free plan. This works
  locally, but the first real deploy is what confirms it on the account.
- **Not deployed yet.** `portfolio.happysadmi.workers.dev` still 404s.