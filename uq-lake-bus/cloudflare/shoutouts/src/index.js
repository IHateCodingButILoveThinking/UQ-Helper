const MESSAGE_LIFETIME_SECONDS = 7 * 24 * 60 * 60;
const POST_COOLDOWN_SECONDS = 30;
const DAILY_POST_LIMIT = 20;
const HIDE_AFTER_REPORTS = 3;
const MAX_MESSAGE_LENGTH = 160;

const PLACES = Object.freeze([
  { id: "great-court", label: "Great Court", shortLabel: "Great Court" },
  { id: "central-library", label: "Central Library", shortLabel: "Library" },
  { id: "uq-lakes", label: "UQ Lakes", shortLabel: "UQ Lakes" },
  { id: "student-union", label: "Student Union", shortLabel: "Union" },
  { id: "uq-centre", label: "UQ Centre", shortLabel: "UQ Centre" },
  { id: "hawken", label: "Hawken Engineering", shortLabel: "Hawken" },
  { id: "law", label: "Forgan Smith / Law", shortLabel: "Law" },
]);

const PLACE_IDS = new Set(PLACES.map((place) => place.id));
const ALLOWED_EMOJIS = new Set(["", "👋", "☕", "📚", "🎉", "👀"]);
const REACTION_EMOJIS = new Set(["👍", "❤️", "😂", "🎉", "👀"]);
const AVATAR_COLORS = ["#7452b8", "#2679a7", "#16836b", "#c1646f", "#b06c21", "#5368b6"];
const CLIENT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const LINK_PATTERN = /(?:https?:\/\/|www\.|[\w-]+\.(?:com|net|org|io|app|dev)\b)/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

class HTTPError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env, ctx);
    } catch (error) {
      if (error instanceof HTTPError) {
        return jsonResponse(request, env, { error: error.message }, error.status);
      }

      console.error("Unhandled shout-out API error", error);
      return jsonResponse(
        request,
        env,
        { error: "The shout-out service is unavailable right now." },
        500,
      );
    }
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(cleanExpiredData(env.DB));
  },
};

async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";

  if (request.method === "OPTIONS") {
    if (!isOriginAllowed(request, env)) {
      throw new HTTPError(403, "This website is not allowed to use the API.");
    }
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }

  if (!isOriginAllowed(request, env)) {
    throw new HTTPError(403, "This website is not allowed to use the API.");
  }

  if (request.method === "GET" && (path === "/" || path === "/api/health")) {
    const database = await env.DB.prepare("SELECT 1 AS ready").first();
    return jsonResponse(request, env, {
      service: "UQ Helper Shout Outs",
      status: database?.ready === 1 ? "ok" : "degraded",
      retentionDays: 7,
    });
  }

  if (request.method === "GET" && path === "/api/places") {
    return jsonResponse(request, env, { places: PLACES });
  }

  if (request.method === "GET" && path === "/api/messages") {
    ctx.waitUntil(cleanExpiredData(env.DB));
    return listMessages(request, env, url);
  }

  if (request.method === "GET" && path === "/api/summary") {
    return summarizeMessages(request, env);
  }

  if (request.method === "POST" && path === "/api/messages") {
    return createMessage(request, env);
  }

  const reactionMatch = path.match(/^\/api\/messages\/([0-9a-f-]{36})\/react$/i);
  if (request.method === "POST" && reactionMatch) {
    return reactToMessage(request, env, reactionMatch[1]);
  }

  const reportMatch = path.match(/^\/api\/messages\/([0-9a-f-]{36})\/report$/i);
  if (request.method === "POST" && reportMatch) {
    return reportMessage(request, env, reportMatch[1]);
  }

  throw new HTTPError(404, "Not found.");
}

async function listMessages(request, env, url) {
  const placeId = normalizePlaceId(url.searchParams.get("place"));
  const requestedLimit = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50)
    : 30;
  const now = unixNow();

  const { results = [] } = await env.DB.prepare(
    `SELECT id, place_id, body, emoji, avatar_color, avatar_variant,
            created_at, expires_at, reaction_count
       FROM messages
      WHERE place_id = ? AND expires_at > ? AND report_count < ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
  )
    .bind(placeId, now, HIDE_AFTER_REPORTS, limit)
    .all();

  return jsonResponse(request, env, {
    messages: results.map(serializeMessage),
    placeId,
  });
}

async function summarizeMessages(request, env) {
  const now = unixNow();
  const { results = [] } = await env.DB.prepare(
    `WITH counts AS (
       SELECT place_id, COUNT(*) AS message_count
         FROM messages
        WHERE expires_at > ? AND report_count < ?
        GROUP BY place_id
     )
     SELECT c.message_count,
            m.id, m.place_id, m.body, m.emoji,
            m.avatar_color, m.avatar_variant,
            m.created_at, m.expires_at, m.reaction_count
       FROM counts AS c
       JOIN messages AS m
         ON m.id = (
           SELECT latest.id
             FROM messages AS latest
            WHERE latest.place_id = c.place_id
              AND latest.expires_at > ?
              AND latest.report_count < ?
            ORDER BY latest.created_at DESC, latest.id DESC
            LIMIT 1
         )`,
  )
    .bind(now, HIDE_AFTER_REPORTS, now, HIDE_AFTER_REPORTS)
    .all();

  const summariesByPlace = new Map(
    results.map((row) => [
      row.place_id,
      {
        placeId: row.place_id,
        messageCount: Number(row.message_count ?? 0),
        latest: serializeMessage(row),
      },
    ]),
  );

  return jsonResponse(request, env, {
    generatedAt: new Date(now * 1000).toISOString(),
    summaries: PLACES.map(
      (place) =>
        summariesByPlace.get(place.id) ?? {
          placeId: place.id,
          messageCount: 0,
          latest: null,
        },
    ),
  });
}

async function createMessage(request, env) {
  ensureJsonRequest(request);
  const payload = await readJson(request);
  const placeId = normalizePlaceId(payload.placeId);
  const body = normalizeMessage(payload.message);
  const emoji = normalizePostEmoji(payload.emoji);
  const clientHash = await getClientHash(request);
  const now = unixNow();
  const dayKey = new Date(now * 1000).toISOString().slice(0, 10);

  const rate = await env.DB.prepare(
    "SELECT last_post_at, day_key, daily_count FROM rate_limits WHERE client_hash = ?",
  )
    .bind(clientHash)
    .first();

  if (rate && now - Number(rate.last_post_at) < POST_COOLDOWN_SECONDS) {
    const retryAfter = POST_COOLDOWN_SECONDS - (now - Number(rate.last_post_at));
    throw new HTTPError(429, `Please wait ${retryAfter} seconds before posting again.`);
  }

  const dailyCount = rate?.day_key === dayKey ? Number(rate.daily_count) : 0;
  if (dailyCount >= DAILY_POST_LIMIT) {
    throw new HTTPError(429, "You have reached today’s posting limit.");
  }

  const id = crypto.randomUUID();
  const expiresAt = now + MESSAGE_LIFETIME_SECONDS;
  const randomBytes = crypto.getRandomValues(new Uint8Array(2));
  const avatarColor = AVATAR_COLORS[randomBytes[0] % AVATAR_COLORS.length];
  const avatarVariant = randomBytes[1] % 5;

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO messages
         (id, place_id, body, emoji, avatar_color, avatar_variant, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, placeId, body, emoji, avatarColor, avatarVariant, now, expiresAt),
    env.DB.prepare(
      `INSERT INTO rate_limits (client_hash, last_post_at, day_key, daily_count)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(client_hash) DO UPDATE SET
         last_post_at = excluded.last_post_at,
         day_key = excluded.day_key,
         daily_count = CASE
           WHEN rate_limits.day_key = excluded.day_key THEN rate_limits.daily_count + 1
           ELSE 1
         END`,
    ).bind(clientHash, now, dayKey),
  ]);

  return jsonResponse(
    request,
    env,
    {
      message: serializeMessage({
        id,
        place_id: placeId,
        body,
        emoji,
        avatar_color: avatarColor,
        avatar_variant: avatarVariant,
        created_at: now,
        expires_at: expiresAt,
        reaction_count: 0,
      }),
    },
    201,
  );
}

async function reactToMessage(request, env, messageId) {
  ensureJsonRequest(request);
  const payload = await readJson(request);
  const emoji = String(payload.emoji ?? "");
  if (!REACTION_EMOJIS.has(emoji)) {
    throw new HTTPError(400, "Choose one of the available reactions.");
  }

  const clientHash = await getClientHash(request);
  const exists = await visibleMessageExists(env.DB, messageId);
  if (!exists) throw new HTTPError(404, "This message is no longer available.");

  const insertion = await env.DB.prepare(
    `INSERT OR IGNORE INTO reactions (message_id, client_hash, emoji, created_at)
     VALUES (?, ?, ?, ?)`,
  )
    .bind(messageId, clientHash, emoji, unixNow())
    .run();

  if (Number(insertion.meta?.changes) > 0) {
    await env.DB.prepare(
      "UPDATE messages SET reaction_count = reaction_count + 1 WHERE id = ?",
    )
      .bind(messageId)
      .run();
  }

  const message = await env.DB.prepare(
    "SELECT reaction_count FROM messages WHERE id = ?",
  )
    .bind(messageId)
    .first();

  return jsonResponse(request, env, {
    accepted: Number(insertion.meta?.changes) > 0,
    reactionCount: Number(message?.reaction_count ?? 0),
  });
}

async function reportMessage(request, env, messageId) {
  const clientHash = await getClientHash(request);
  const exists = await visibleMessageExists(env.DB, messageId);
  if (!exists) throw new HTTPError(404, "This message is no longer available.");

  const insertion = await env.DB.prepare(
    `INSERT OR IGNORE INTO reports (message_id, client_hash, created_at)
     VALUES (?, ?, ?)`,
  )
    .bind(messageId, clientHash, unixNow())
    .run();

  if (Number(insertion.meta?.changes) > 0) {
    await env.DB.prepare(
      "UPDATE messages SET report_count = report_count + 1 WHERE id = ?",
    )
      .bind(messageId)
      .run();
  }

  return jsonResponse(request, env, {
    accepted: Number(insertion.meta?.changes) > 0,
  });
}

async function visibleMessageExists(database, messageId) {
  return database
    .prepare(
      "SELECT id FROM messages WHERE id = ? AND expires_at > ? AND report_count < ?",
    )
    .bind(messageId, unixNow(), HIDE_AFTER_REPORTS)
    .first();
}

function normalizePlaceId(value) {
  const placeId = String(value ?? "").trim().toLowerCase();
  if (!PLACE_IDS.has(placeId)) throw new HTTPError(400, "Choose a valid campus place.");
  return placeId;
}

function normalizeMessage(value) {
  const body = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!body) throw new HTTPError(400, "Write a short message first.");
  if ([...body].length > MAX_MESSAGE_LENGTH) {
    throw new HTTPError(400, `Keep the message under ${MAX_MESSAGE_LENGTH} characters.`);
  }
  if (LINK_PATTERN.test(body) || EMAIL_PATTERN.test(body)) {
    throw new HTTPError(400, "Links and contact details are not allowed.");
  }
  return body;
}

function normalizePostEmoji(value) {
  const emoji = String(value ?? "");
  if (!ALLOWED_EMOJIS.has(emoji)) throw new HTTPError(400, "Choose an available emoji.");
  return emoji;
}

function ensureJsonRequest(request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2048) throw new HTTPError(413, "Request is too large.");
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    throw new HTTPError(415, "Send JSON content.");
  }
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HTTPError(400, "Invalid request data.");
  }
}

async function getClientHash(request) {
  const token = request.headers.get("x-shout-client") ?? "";
  if (!CLIENT_TOKEN_PATTERN.test(token)) {
    throw new HTTPError(400, "This device needs a valid anonymous session.");
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function cleanExpiredData(database) {
  const now = unixNow();
  const oldestRateLimit = now - 2 * 24 * 60 * 60;
  await database.batch([
    database.prepare("DELETE FROM messages WHERE expires_at <= ?").bind(now),
    database.prepare("DELETE FROM rate_limits WHERE last_post_at <= ?").bind(oldestRateLimit),
  ]);
}

function serializeMessage(row) {
  return {
    id: row.id,
    placeId: row.place_id,
    message: row.body,
    emoji: row.emoji || "",
    avatarColor: row.avatar_color,
    avatarVariant: Number(row.avatar_variant ?? 0),
    createdAt: new Date(Number(row.created_at) * 1000).toISOString(),
    expiresAt: new Date(Number(row.expires_at) * 1000).toISOString(),
    reactionCount: Number(row.reaction_count ?? 0),
  };
}

function isOriginAllowed(request, env) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const configured = String(env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (configured.includes(origin)) return true;

  try {
    const parsed = new URL(origin);
    const isLocal =
      parsed.protocol === "http:" &&
      (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost");
    const isVercelPreview =
      parsed.protocol === "https:" && parsed.hostname.endsWith(".vercel.app");
    return isLocal || isVercelPreview;
  } catch {
    return false;
  }
}

function corsHeaders(request, env) {
  const origin = request.headers.get("origin");
  const headers = new Headers({
    "Access-Control-Allow-Headers": "Content-Type, X-Shout-Client",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  if (origin && isOriginAllowed(request, env)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  return headers;
}

function jsonResponse(request, env, payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders(request, env),
  });
}

function unixNow() {
  return Math.floor(Date.now() / 1000);
}
