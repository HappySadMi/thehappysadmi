/**
 * Knowledge assembly.
 *
 * Primary path: fetch the site's own data/*.json at request time so the
 * chatbot can never say something the website does not say.
 *
 * Secondary path: a generated snapshot committed alongside this file. Used
 * only when the live fetch fails, so the bot degrades to slightly stale
 * content instead of being useless.
 *
 * Regenerate the snapshot with:
 *   node worker/scripts/build-knowledge.mjs
 */

import { SITE_PROSE } from "./prose.js";
import SNAPSHOT from "./snapshot.js";

const DATA_FILES = ["services", "portfolio", "team", "testimonials"];

export class ContentUnavailable extends Error {}

/** Fetches and assembles the full knowledge payload. */
export async function loadKnowledge(env, { cache = caches.default } = {}) {
  const siteUrl = trimSlash(env.SITE_URL);
  const ttl = Number(env.CONTENT_CACHE_TTL) || 300;

  if (!siteUrl) {
    return {
      source: "snapshot",
      degraded: true,
      reason: "SITE_URL is not set on the Worker",
      ...SNAPSHOT,
      prose: SITE_PROSE,
    };
  }

  // Edge-cache the whole assembled payload, not each file separately.
  const cacheKey = new Request(`https://hsm-chatbot.internal/kb?v=${ttl}`);
  const cached = await cache.match(cacheKey);
  if (cached) return { ...(await cached.json()), source: "live-cache" };

  try {
    const results = await Promise.all(
      DATA_FILES.map(async (name) => {
        const res = await fetch(`${siteUrl}/data/${name}.json`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          throw new ContentUnavailable(
            `data/${name}.json returned HTTP ${res.status}`
          );
        }
        const body = await res.json();
        if (!Array.isArray(body)) {
          throw new ContentUnavailable(`data/${name}.json was not an array`);
        }
        return body;
      })
    );

    const [services, portfolio, team, testimonials] = results;

    const payload = {
      degraded: false,
      reason: null,
      services,
      portfolio,
      team,
      testimonials,
      prose: SITE_PROSE,
    };

    const ttlSeconds = Math.max(60, Math.min(ttl, 3600));
    await cache.put(
      cacheKey,
      new Response(JSON.stringify(payload), {
        headers: {
          "Content-Type": "application/json",
          // Cloudflare requires Cache-Control for cache.put to persist.
          "Cache-Control": `public, max-age=${ttlSeconds}`,
        },
      })
    );

    return { ...payload, source: "live" };
  } catch (error) {
    console.warn("Live content fetch failed, using snapshot:", error.message);
    return {
      source: "snapshot",
      degraded: true,
      reason: `Live fetch failed: ${error.message}`,
      ...SNAPSHOT,
      prose: SITE_PROSE,
    };
  }
}

/** Counts for the health endpoint, so we can assert content actually loaded. */
export function summarise(knowledge) {
  return {
    source: knowledge.source,
    degraded: knowledge.degraded,
    reason: knowledge.reason,
    counts: {
      services: knowledge.services?.length ?? 0,
      portfolio: knowledge.portfolio?.length ?? 0,
      team: knowledge.team?.length ?? 0,
      testimonials: knowledge.testimonials?.length ?? 0,
    },
  };
}

function trimSlash(url) {
  if (!url) return "";
  return String(url).replace(/\/+$/, "");
}