/**
 * Happy Sad Mi chatbot Worker -- Phase 1.
 *
 * No AI is wired up yet. This phase exists to prove the plumbing before a
 * model is involved:
 *
 *   - the Worker is deployed to the right Cloudflare account
 *   - the live site content can actually be fetched and cached
 *   - CORS is pinned to our origin and rejects everything else
 *   - the assembled knowledge payload is correct and complete
 *
 * Endpoints:
 *   GET  /health   liveness + a summary of what content loaded
 *   POST /chat     returns the exact payload the model will receive
 *   GET  /prompt   returns the static system prompt, for review
 */

import { loadKnowledge, summarise } from "./knowledge.js";
import { SYSTEM_PROMPT } from "./prompt.js";
import { checkRateLimit, rateLimitHeaders, RateLimiter } from "./ratelimit.js";

// Re-exported so Wrangler can find the Durable Object class in the entry module.
export { RateLimiter };

const MAX_MESSAGE_CHARS = 800;
const MAX_HISTORY_TURNS = 8;

/* ------------------------------------------------------------------ */
/* CORS                                                                */
/* ------------------------------------------------------------------ */

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Echoes the Origin only when it is explicitly allowed. `Vary: Origin` is
 * required because the response varies by origin -- without it a shared
 * cache could serve one origin's response to another.
 */
function corsHeaders(env, request, extra = {}) {
  const origin = request.headers.get("Origin");
  const allowed = allowedOrigins(env);

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    ...extra,
  };

  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function json(env, request, body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(env, request, extra),
  });
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env, request) });
    }

    // Reject anything from an origin we do not control. Done before any
    // other work so a foreign site cannot even reach the content fetch.
    const origin = request.headers.get("Origin");
    if (origin && !allowedOrigins(env).includes(origin)) {
      return json(env, request, { error: "Origin not allowed." }, 403);
    }

    try {
      if (url.pathname === "/prompt" && request.method === "GET") {
        return json(env, request, {
          systemPrompt: SYSTEM_PROMPT,
          approximateTokens: Math.round(SYSTEM_PROMPT.length / 4),
        });
      }

      if (url.pathname === "/health" && request.method === "GET") {
        const knowledge = await loadKnowledge(env);
        return json(env, request, {
          ok: !knowledge.degraded,
          ...summarise(knowledge),
          siteUrl: env.SITE_URL,
          allowedOrigins: allowedOrigins(env),
        });
      }

      if (url.pathname === "/chat" && request.method === "POST") {
        // Only the endpoint that costs money is limited. /health and
        // /prompt are cheap and staying reachable makes debugging easier.
        const limit = await checkRateLimit(env, request);

        if (!limit.allowed) {
          return json(
            env,
            request,
            {
              error: "Too many requests. Please wait a moment and try again.",
              retryAfter: limit.retryAfterSeconds,
            },
            429,
            rateLimitHeaders(limit)
          );
        }

        return handleChat(env, request, rateLimitHeaders(limit));
      }

      if (url.pathname === "/" && request.method === "GET") {
        return json(env, request, {
          name: "happysadmi-chatbot",
          phase: 1,
          ai: "not wired up yet",
          endpoints: ["GET /health", "POST /chat", "GET /prompt"],
        });
      }

      return json(env, request, { error: "Not found." }, 404);
    } catch (error) {
      // Log the detail server-side, but never return it. The reference
      // implementation leaked error.message to the client.
      console.error("Unhandled error:", error);
      return json(env, request, { error: "Internal error." }, 500);
    }
  },
};

/* ------------------------------------------------------------------ */
/* Chat (Phase 1 stub)                                                 */
/* ------------------------------------------------------------------ */

async function handleChat(env, request, extraHeaders = {}) {
  let body;

  try {
    body = await request.json();
  } catch {
    return json(env, request, { error: "Invalid JSON body." }, 400);
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!message) {
    return json(
      env,
      request,
      { error: "A non-empty \"message\" string is required." },
      400,
      extraHeaders
    );
  }

  if (message.length > MAX_MESSAGE_CHARS) {
    return json(
      env,
      request,
      { error: `Message too long (max ${MAX_MESSAGE_CHARS} characters).` },
      413,
      extraHeaders
    );
  }

  const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY_TURNS) : [];

  const knowledge = await loadKnowledge(env);

  // Phase 1: no model call. Return exactly what Phase 3 will send, so the
  // assembled context and the prompt can be reviewed before spending on
  // inference.
  return json(env, request, {
    phase: 1,
    ai: "not wired up yet",
    received: { message, historyTurns: history.length },
    knowledge: summarise(knowledge),
    siteContent: {
      services: knowledge.services,
      portfolio: knowledge.portfolio,
      team: knowledge.team,
      testimonials: knowledge.testimonials,
      prose: knowledge.prose,
    },
    systemPrompt: SYSTEM_PROMPT,
  }, 200, extraHeaders);
}