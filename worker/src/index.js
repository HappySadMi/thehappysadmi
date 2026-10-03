/**
 * Happy Sad Mi chatbot Worker.
 *
 * The chatbot is grounded on the team's own site content, fetched live at
 * request time so it cannot drift from data/*.json. See README.md.
 *
 * Endpoints:
 *   GET  /health   liveness + a summary of what content loaded
 *   POST /chat     ask the assistant a question
 *   GET  /prompt   returns the static system prompt, for review
 */

import { loadKnowledge, summarise } from "./knowledge.js";
import { SYSTEM_PROMPT } from "./prompt.js";
import {
  askModel,
  buildMessages,
  screenReply,
  isInstructionProbe,
  containsPersonalData,
  PII_DEFLECTION,
} from "./llm.js";
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
          phase: 3,
          ai: env.AI_MODEL || "default",
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
/* Chat                                                                 */
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

  // --- Input gates: refuse deterministically, before spending neurons ---

  // Instruction extraction. The model is never asked, so nothing can leak.
  if (isInstructionProbe(message)) {

    console.warn("Blocked an instruction-extraction attempt at the input gate.");

    return json(
      env,
      request,
      {
        reply:
          "I can't share internal instructions. Ask me about Happy Sad Mi's " +
          "services, projects or team and I'll help.",
        blocked: true,
        blockedReason: "instruction_probe",
        model: env.AI_MODEL || null,
        knowledge: summarise(knowledge),
      },
      200,
      extraHeaders
    );

  }

  // Visitor-supplied personal data. Keeps PII out of the model entirely and
  // guarantees it is not echoed back.
  if (containsPersonalData(message)) {

    console.warn("Redirected a message containing personal data.");

    return json(
      env,
      request,
      {
        reply: PII_DEFLECTION,
        blocked: true,
        blockedReason: "personal_data",
        model: env.AI_MODEL || null,
        knowledge: summarise(knowledge),
      },
      200,
      extraHeaders
    );

  }

  const messages = buildMessages({
    systemPrompt: SYSTEM_PROMPT,
    knowledge,
    history: sanitiseHistory(history),
    message,
  });

  const started = Date.now();

  try {
    const { reply: rawReply, model } = await askModel(env, { messages });

    // Enforce the no-leak rule here rather than trusting the model to.
    const { reply, blocked } = screenReply(rawReply);

    if (blocked) {
      console.warn("Blocked an attempted instruction leak before responding.");
    }

    return json(
      env,
      request,
      {
        reply,
        model,
        tookMs: Date.now() - started,
        blocked,
        knowledge: summarise(knowledge),
      },
      200,
      extraHeaders
    );
  } catch (error) {
    // Log the detail, never return it.
    console.error("Model call failed:", error);

    const timedOut = /did not respond within/.test(error.message);

    return json(
      env,
      request,
      {
        error: timedOut
          ? "The assistant took too long to respond. Please try again."
          : "The assistant is unavailable right now. Please try again shortly.",
      },
      502,
      extraHeaders
    );
  }
}

/**
 * Keeps only role/content, drops anything else the client may have sent,
 * and caps each turn. Client input is untrusted.
 */
function sanitiseHistory(history) {
  return history
    .filter(
      (turn) =>
        turn &&
        (turn.role === "user" || turn.role === "assistant") &&
        typeof turn.content === "string"
    )
    .map((turn) => ({
      role: turn.role,
      content: turn.content.slice(0, 2000),
    }));
}