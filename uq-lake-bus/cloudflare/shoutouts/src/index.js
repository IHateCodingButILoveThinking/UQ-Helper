import { cleanExpiredFoodData, handleFoodRequest } from "./food-api.js";

const MESSAGE_LIFETIME_SECONDS = 7 * 24 * 60 * 60;
const POST_COOLDOWN_SECONDS = 30;
const REPLY_COOLDOWN_SECONDS = 5;
const DAILY_POST_LIMIT = 20;
const HIDE_AFTER_REPORTS = 3;
const MAX_MESSAGE_LENGTH = 160;
const MAP_RESULT_LIMIT = 200;
const PIN_GRID_E6 = 500;
const MAX_POST_DISTANCE_KM = 1;

const ASIA_PACIFIC_BOUNDS = Object.freeze({
  south: -45,
  north: 82,
  west: 25,
  east: 180,
});

const PLACES = Object.freeze([
  { id: "great-court", label: "Great Court", shortLabel: "Great Court", latitude: -27.4971, longitude: 153.0133 },
  { id: "central-library", label: "Central Library", shortLabel: "Library", latitude: -27.4960, longitude: 153.0145 },
  { id: "uq-lakes", label: "UQ Lakes", shortLabel: "UQ Lakes", latitude: -27.4976, longitude: 153.0177 },
  { id: "student-union", label: "Student Union", shortLabel: "Union", latitude: -27.4977, longitude: 153.0152 },
  { id: "uq-centre", label: "UQ Centre", shortLabel: "UQ Centre", latitude: -27.4990, longitude: 153.0144 },
  { id: "hawken", label: "Hawken Engineering", shortLabel: "Hawken", latitude: -27.4990, longitude: 153.0163 },
  { id: "law", label: "Forgan Smith / Law", shortLabel: "Law", latitude: -27.4951, longitude: 153.0131 },
]);

const PLACE_IDS = new Set(PLACES.map((place) => place.id));
const ALLOWED_EMOJIS = new Set(["", "👋", "☕", "📚", "🎉", "👀"]);
const REACTION_EMOJIS = new Set(["👍", "❤️", "😂", "🎉", "👀"]);
const AVATAR_COLORS = ["#7452b8", "#2679a7", "#16836b", "#c1646f", "#b06c21", "#5368b6"];
const CLIENT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const PIN_ID_PATTERN = /^pin:-?\d{7,8}:\d{8,9}$/;
const FORMAT_CONTROL_PATTERN = /[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g;
const LINK_SCHEME_PATTERN = /\b(?:https?|hxxps?|ftp):\/\/|\b(?:javascript|data|mailto):|\bwww\s*\./i;
const DOMAIN_PATTERN = /\b[a-z0-9][a-z0-9-]*(?:\s*\.\s*[a-z0-9][a-z0-9-]*)*\s*\.\s*(?:com|com\.au|net|net\.au|org|org\.au|edu|edu\.au|gov|gov\.au|io|app|dev|xyz|info|me|co|ly|gg|tv|ai|live|site|online|link|top|club|shop|store|tech)\b/i;
const IP_ADDRESS_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b|\b(?:[a-f0-9]{1,4}:){2,}[a-f0-9]{1,4}\b/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_PATTERN = /(?:^|\D)(?:\+?61[\s().-]?|0)?(?:[23478][\s().-]?)?(?:\d[\s().-]?){8,10}(?:\D|$)/;
const SOCIAL_CONTACT_PATTERN = /@+[a-z0-9._-]{2,32}\b|\b(?:instagram|snapchat|telegram|whatsapp|wechat|discord|signal)\s*(?:is|at|:|@)\s*[a-z0-9._-]{2,32}\b/i;
const SELF_HARM_PATTERN = /\b(?:kill|cut|hurt)\s+myself\b|\bend\s+my\s+life\b|\bwant\s+to\s+die\b|\bsuicide\s+plan\b/i;
const DANGEROUS_PATTERNS = Object.freeze([
  /\b(?:i|we|you|they|let(?:'s|s)|gonna|going\s+to|will|plan(?:ning)?\s+to)\b(?:\W+\w+){0,4}\W+\b(?:kill|murder|shoot|stab|bomb|attack|poison|kidnap|rape|assault|beat\s+up|set\s+fire)\b/i,
  /\b(?:kill|murder|shoot|stab|attack|poison|kidnap|rape|assault)\b(?:\W+\w+){0,3}\W+\b(?:you|him|her|them|everyone|people|students?|staff|teacher)\b/i,
  /\b(?:bring|brought|have|got)\b(?:\W+\w+){0,3}\W+\b(?:gun|firearm|bomb|explosive|weapon)\b(?:\W+\w+){0,3}\W+\b(?:campus|school|university|library|building|class)\b/i,
  /\b(?:how\s+to|instructions?\s+(?:for|to))\s+(?:make|build|use)\s+(?:a\s+)?(?:bomb|explosive|weapon|poison)\b/i,
  /\b(?:buy|sell|selling|deal|dealing|score|get)\s+(?:some\s+)?(?:cocaine|meth|mdma|ecstasy|heroin|fentanyl|weapons?|firearms?)\b/i,
  /\b(?:go\s+kill\s+yourself|i\s+hope\s+you\s+die)\b/i,
]);

class HTTPError extends Error {
  constructor(status, message, code = "request_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env, ctx);
    } catch (error) {
      if (error instanceof HTTPError || Number.isInteger(error?.status)) {
        return jsonResponse(
          request,
          env,
          { error: error.message, code: error.code },
          error.status,
        );
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
    ctx.waitUntil(Promise.all([cleanExpiredData(env.DB), cleanExpiredFoodData(env)]));
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

  const foodResponse = await handleFoodRequest({
    request,
    env,
    ctx,
    url,
    path,
    respond: (payload, status = 200) => jsonResponse(request, env, payload, status),
  });
  if (foodResponse) return foodResponse;

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

  if (request.method === "GET" && (path === "/api/map" || path === "/api/summary")) {
    return summarizeMessages(request, env, url);
  }

  if (request.method === "GET" && path === "/api/recent") {
    return listRecentMessages(request, env, url);
  }

  if (request.method === "POST" && path === "/api/messages") {
    return createMessage(request, env);
  }

  if (request.method === "GET" && path === "/api/notifications") {
    return listNotifications(request, env);
  }

  if (request.method === "POST" && path === "/api/notifications/read") {
    return markNotificationsRead(request, env);
  }

  const replyMatch = path.match(/^\/api\/messages\/([0-9a-f-]{36})\/replies$/i);
  if (request.method === "POST" && replyMatch) {
    return createReply(request, env, replyMatch[1]);
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
    `SELECT m.id, m.place_id, m.body, m.emoji, m.avatar_color, m.avatar_variant,
            m.created_at, m.expires_at, m.reaction_count, m.parent_id,
            m.reply_count,
            l.latitude_e6, l.longitude_e6, l.label AS place_label,
            l.kind AS place_kind
       FROM messages AS m
       JOIN shout_locations AS l ON l.id = m.place_id
      WHERE m.place_id = ? AND m.expires_at > ? AND m.report_count < ?
      ORDER BY CASE WHEN m.parent_id IS NULL THEN m.created_at ELSE 0 END DESC,
               m.parent_id, m.created_at ASC, m.id ASC
      LIMIT ?`,
  )
    .bind(placeId, now, HIDE_AFTER_REPORTS, limit)
    .all();

  return jsonResponse(request, env, {
    messages: results.map(serializeMessage),
    placeId,
    location: results[0] ? serializeLocation(results[0]) : null,
  });
}

async function summarizeMessages(request, env, url) {
  const now = unixNow();
  const bounds = normalizeMapBounds(url);
  const requestedLimit = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), MAP_RESULT_LIMIT)
    : 100;
  const { results = [] } = await env.DB.prepare(
    `SELECT id, place_id, body, emoji, avatar_color, avatar_variant,
            created_at, expires_at, reaction_count,
            latitude_e6, longitude_e6, place_label, place_kind,
            message_count
       FROM (
         SELECT m.id, m.place_id, m.body, m.emoji,
                m.avatar_color, m.avatar_variant,
                m.created_at, m.expires_at, m.reaction_count,
                l.latitude_e6, l.longitude_e6,
                l.label AS place_label, l.kind AS place_kind,
                COUNT(*) OVER (PARTITION BY m.place_id) AS message_count,
                ROW_NUMBER() OVER (
                  PARTITION BY m.place_id
                  ORDER BY m.created_at DESC, m.id DESC
                ) AS message_rank
           FROM messages AS m
           JOIN shout_locations AS l ON l.id = m.place_id
          WHERE m.expires_at > ? AND m.report_count < ? AND m.parent_id IS NULL
            AND l.latitude_e6 BETWEEN ? AND ?
            AND l.longitude_e6 BETWEEN ? AND ?
       )
      WHERE message_rank = 1
      ORDER BY created_at DESC
      LIMIT ?`,
  )
    .bind(
      now,
      HIDE_AFTER_REPORTS,
      bounds.southE6,
      bounds.northE6,
      bounds.westE6,
      bounds.eastE6,
      limit,
    )
    .all();

  return jsonResponse(request, env, {
    generatedAt: new Date(now * 1000).toISOString(),
    summaries: results.map((row) => ({
      ...serializeLocation(row),
      messageCount: Number(row.message_count ?? 0),
      latest: serializeMessage(row),
    })),
  });
}

async function listRecentMessages(request, env, url) {
  const now = unixNow();
  const bounds = normalizeMapBounds(url);
  const requestedLimit = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50)
    : 30;
  const { results = [] } = await env.DB.prepare(
    `SELECT m.id, m.place_id, m.body, m.emoji, m.avatar_color,
            m.avatar_variant, m.created_at, m.expires_at,
            m.reaction_count, m.reply_count, m.parent_id,
            l.latitude_e6, l.longitude_e6, l.label AS place_label,
            l.kind AS place_kind
       FROM messages AS m
       JOIN shout_locations AS l ON l.id = m.place_id
      WHERE m.expires_at > ? AND m.report_count < ? AND m.parent_id IS NULL
        AND l.latitude_e6 BETWEEN ? AND ?
        AND l.longitude_e6 BETWEEN ? AND ?
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT ?`,
  )
    .bind(
      now,
      HIDE_AFTER_REPORTS,
      bounds.southE6,
      bounds.northE6,
      bounds.westE6,
      bounds.eastE6,
      limit,
    )
    .all();

  return jsonResponse(request, env, {
    generatedAt: new Date(now * 1000).toISOString(),
    messages: results.map(serializeMessage),
  });
}

async function createMessage(request, env) {
  ensureJsonRequest(request);
  const payload = await readJson(request);
  const body = normalizeMessage(payload.message);
  const emoji = normalizePostEmoji(payload.emoji);
  const clientHash = await getClientHash(request);
  const now = unixNow();
  const location = await resolvePostLocation(payload, env.DB, now);
  const placeId = location.id;
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

  const statements = [];
  if (location.kind === "pin") {
    statements.push(
      env.DB.prepare(
        `INSERT OR IGNORE INTO shout_locations
           (id, latitude_e6, longitude_e6, label, kind, created_at)
         VALUES (?, ?, ?, ?, 'pin', ?)`,
      ).bind(
        location.id,
        location.latitudeE6,
        location.longitudeE6,
        location.label,
        now,
      ),
    );
  }

  statements.push(
    env.DB.prepare(
      `INSERT INTO messages
         (id, place_id, body, emoji, avatar_color, avatar_variant, created_at, expires_at, author_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, placeId, body, emoji, avatarColor, avatarVariant, now, expiresAt, clientHash),
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
  );

  await env.DB.batch(statements);

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
        latitude_e6: location.latitudeE6,
        longitude_e6: location.longitudeE6,
        place_label: location.label,
        place_kind: location.kind,
      }),
    },
    201,
  );
}

async function createReply(request, env, parentMessageId) {
  ensureJsonRequest(request);
  const payload = await readJson(request);
  const body = normalizeMessage(payload.message);
  const emoji = normalizePostEmoji(payload.emoji);
  const clientHash = await getClientHash(request);
  const now = unixNow();
  const dayKey = new Date(now * 1000).toISOString().slice(0, 10);

  const parent = await env.DB.prepare(
    `SELECT m.id, m.place_id, m.author_hash, m.expires_at, m.parent_id,
            l.latitude_e6, l.longitude_e6, l.label AS place_label,
            l.kind AS place_kind
       FROM messages AS m
       JOIN shout_locations AS l ON l.id = m.place_id
      WHERE m.id = ? AND m.expires_at > ? AND m.report_count < ?`,
  )
    .bind(parentMessageId, now, HIDE_AFTER_REPORTS)
    .first();
  if (!parent) throw new HTTPError(404, "This post is no longer available.");
  if (parent.parent_id) throw new HTTPError(400, "Reply to the main post instead.");

  const rate = await env.DB.prepare(
    "SELECT last_post_at, day_key, daily_count FROM rate_limits WHERE client_hash = ?",
  )
    .bind(clientHash)
    .first();
  if (rate && now - Number(rate.last_post_at) < REPLY_COOLDOWN_SECONDS) {
    const retryAfter = REPLY_COOLDOWN_SECONDS - (now - Number(rate.last_post_at));
    throw new HTTPError(429, `Please wait ${retryAfter} seconds before replying again.`);
  }
  const dailyCount = rate?.day_key === dayKey ? Number(rate.daily_count) : 0;
  if (dailyCount >= DAILY_POST_LIMIT) {
    throw new HTTPError(429, "You have reached today’s posting limit.");
  }

  const id = crypto.randomUUID();
  const expiresAt = Math.min(now + MESSAGE_LIFETIME_SECONDS, Number(parent.expires_at));
  const randomBytes = crypto.getRandomValues(new Uint8Array(2));
  const avatarColor = AVATAR_COLORS[randomBytes[0] % AVATAR_COLORS.length];
  const avatarVariant = randomBytes[1] % 5;
  const statements = [
    env.DB.prepare(
      `INSERT INTO messages
         (id, place_id, body, emoji, avatar_color, avatar_variant, created_at,
          expires_at, parent_id, author_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      parent.place_id,
      body,
      emoji,
      avatarColor,
      avatarVariant,
      now,
      expiresAt,
      parentMessageId,
      clientHash,
    ),
    env.DB.prepare(
      "UPDATE messages SET reply_count = reply_count + 1 WHERE id = ?",
    ).bind(parentMessageId),
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
  ];

  if (parent.author_hash && parent.author_hash !== clientHash) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO notifications
           (id, recipient_hash, actor_hash, type, message_id, parent_message_id,
            created_at, expires_at)
         VALUES (?, ?, ?, 'reply', ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        parent.author_hash,
        clientHash,
        id,
        parentMessageId,
        now,
        expiresAt,
      ),
    );
  }

  await env.DB.batch(statements);
  return jsonResponse(
    request,
    env,
    {
      message: serializeMessage({
        id,
        place_id: parent.place_id,
        body,
        emoji,
        avatar_color: avatarColor,
        avatar_variant: avatarVariant,
        created_at: now,
        expires_at: expiresAt,
        reaction_count: 0,
        parent_id: parentMessageId,
        reply_count: 0,
        latitude_e6: parent.latitude_e6,
        longitude_e6: parent.longitude_e6,
        place_label: parent.place_label,
        place_kind: parent.place_kind,
      }),
    },
    201,
  );
}

async function listNotifications(request, env) {
  const clientHash = await getClientHash(request);
  const now = unixNow();
  const { results = [] } = await env.DB.prepare(
    `SELECT n.id, n.type, n.message_id, n.parent_message_id, n.created_at,
            n.read_at, COALESCE(m.body, fc.body) AS body, m.emoji, m.place_id,
            COALESCE(l.label, fs.place_name, fs.location_label) AS place_label,
            COALESCE(l.latitude_e6, fs.latitude_e6) AS latitude_e6,
            COALESCE(l.longitude_e6, fs.longitude_e6) AS longitude_e6,
            l.kind AS place_kind, fs.title AS context_title
       FROM notifications AS n
       LEFT JOIN messages AS m ON m.id = n.message_id
       LEFT JOIN shout_locations AS l ON l.id = m.place_id
       LEFT JOIN food_comments AS fc ON fc.id = n.message_id AND fc.status = 'active'
       LEFT JOIN food_shouts AS fs ON fs.id = n.parent_message_id AND fs.status = 'active'
      WHERE n.recipient_hash = ? AND n.expires_at > ?
      ORDER BY n.created_at DESC
      LIMIT 20`,
  )
    .bind(clientHash, now)
    .all();
  return jsonResponse(request, env, {
    unreadCount: results.filter((item) => !item.read_at).length,
    notifications: results.map((item) => ({
      id: item.id,
      type: item.type,
      messageId: item.message_id,
      parentMessageId: item.parent_message_id,
      message: item.body || "",
      contextTitle: item.context_title || "",
      emoji: item.emoji || "",
      placeId: item.place_id,
      placeLabel: item.place_label || "Pinned spot",
      location: item.place_id
        ? {
            placeId: item.place_id,
            label: item.place_label || "Pinned spot",
            kind: item.place_kind || "pin",
            latitude: Number(item.latitude_e6) / 1_000_000,
            longitude: Number(item.longitude_e6) / 1_000_000,
          }
        : null,
      createdAt: new Date(Number(item.created_at) * 1000).toISOString(),
      read: Boolean(item.read_at),
    })),
  });
}

async function markNotificationsRead(request, env) {
  ensureJsonRequest(request);
  const clientHash = await getClientHash(request);
  await env.DB.prepare(
    "UPDATE notifications SET read_at = ? WHERE recipient_hash = ? AND read_at IS NULL",
  )
    .bind(unixNow(), clientHash)
    .run();
  return jsonResponse(request, env, { accepted: true });
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
    const statements = [
      env.DB.prepare(
        "UPDATE messages SET reaction_count = reaction_count + 1 WHERE id = ?",
      ).bind(messageId),
    ];
    if (exists.author_hash && exists.author_hash !== clientHash) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO notifications
             (id, recipient_hash, actor_hash, type, message_id, parent_message_id,
              created_at, expires_at)
           VALUES (?, ?, ?, 'reaction', ?, ?, ?, ?)`,
        ).bind(
          crypto.randomUUID(),
          exists.author_hash,
          clientHash,
          messageId,
          exists.parent_id || messageId,
          unixNow(),
          Number(exists.expires_at),
        ),
      );
    }
    await env.DB.batch(statements);
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
      `SELECT id, author_hash, parent_id, expires_at
         FROM messages
        WHERE id = ? AND expires_at > ? AND report_count < ?`,
    )
    .bind(messageId, unixNow(), HIDE_AFTER_REPORTS)
    .first();
}

function normalizePlaceId(value) {
  const placeId = String(value ?? "").trim().toLowerCase();
  if (!PLACE_IDS.has(placeId) && !PIN_ID_PATTERN.test(placeId)) {
    throw new HTTPError(400, "Choose a valid Asia–Pacific map location.");
  }
  return placeId;
}

async function resolvePostLocation(payload, database, now) {
  const rawPlaceId = String(payload.placeId ?? "").trim();
  const rawLocation = payload.location;
  const hasPlaceId = Boolean(rawPlaceId);
  const hasLocation = rawLocation && typeof rawLocation === "object";

  if (hasPlaceId === Boolean(hasLocation)) {
    throw new HTTPError(400, "Choose one map location for this post.");
  }

  if (hasPlaceId) {
    const placeId = rawPlaceId.toLowerCase();
    if (!PLACE_IDS.has(placeId)) {
      throw new HTTPError(400, "Choose a valid Asia–Pacific map location.");
    }
    const place = PLACES.find((item) => item.id === placeId);
    ensurePinNearCurrentLocation(payload.currentLocation, {
      latitude: place.latitude,
      longitude: place.longitude,
    });
    return {
      id: place.id,
      label: place.label,
      kind: "preset",
      latitudeE6: Math.round(place.latitude * 1_000_000),
      longitudeE6: Math.round(place.longitude * 1_000_000),
    };
  }

  const latitude = Number(rawLocation.latitude);
  const longitude = Number(rawLocation.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new HTTPError(400, "Move the pin to a valid Asia–Pacific location.");
  }
  if (
    latitude < ASIA_PACIFIC_BOUNDS.south ||
    latitude > ASIA_PACIFIC_BOUNDS.north ||
    longitude < ASIA_PACIFIC_BOUNDS.west ||
    longitude > ASIA_PACIFIC_BOUNDS.east
  ) {
    throw new HTTPError(400, "Pins are currently available within Asia and Australia only.");
  }
  ensurePinNearCurrentLocation(payload.currentLocation, { latitude, longitude });

  const nearestPlace = PLACES.map((place) => ({
    place,
    distance: distanceKm(latitude, longitude, place.latitude, place.longitude),
  })).sort((a, b) => a.distance - b.distance)[0];
  if (nearestPlace?.distance <= 0.075) {
    return {
      id: nearestPlace.place.id,
      label: nearestPlace.place.label,
      kind: "preset",
      latitudeE6: Math.round(nearestPlace.place.latitude * 1_000_000),
      longitudeE6: Math.round(nearestPlace.place.longitude * 1_000_000),
    };
  }

  const latitudeE6 = snapCoordinate(latitude);
  const longitudeE6 = snapCoordinate(longitude);
  const id = `pin:${latitudeE6}:${longitudeE6}`;
  const existing = await database
    .prepare("SELECT label FROM shout_locations WHERE id = ?")
    .bind(id)
    .first();

  return {
    id,
    label: existing?.label || "Pinned spot",
    kind: "pin",
    latitudeE6,
    longitudeE6,
    createdAt: now,
  };
}

function ensurePinNearCurrentLocation(rawCurrentLocation, pinLocation) {
  const currentLatitude = Number(rawCurrentLocation?.latitude);
  const currentLongitude = Number(rawCurrentLocation?.longitude);
  if (!Number.isFinite(currentLatitude) || !Number.isFinite(currentLongitude)) {
    throw new HTTPError(
      400,
      "Share your current location before choosing where to post.",
      "current_location_required",
    );
  }
  if (
    currentLatitude < ASIA_PACIFIC_BOUNDS.south ||
    currentLatitude > ASIA_PACIFIC_BOUNDS.north ||
    currentLongitude < ASIA_PACIFIC_BOUNDS.west ||
    currentLongitude > ASIA_PACIFIC_BOUNDS.east
  ) {
    throw new HTTPError(400, "Posting is currently available within Asia and Australia only.");
  }

  const pinDistance = distanceKm(
    currentLatitude,
    currentLongitude,
    pinLocation.latitude,
    pinLocation.longitude,
  );
  if (pinDistance > MAX_POST_DISTANCE_KM) {
    throw new HTTPError(
      422,
      "Choose a pin within 1 km of your current location.",
      "pin_out_of_range",
    );
  }
}

function normalizeMapBounds(url) {
  const readCoordinate = (name, fallback) => {
    const rawValue = url.searchParams.get(name);
    if (rawValue === null || rawValue === "") return fallback;
    const value = Number(rawValue);
    if (!Number.isFinite(value)) throw new HTTPError(400, "Use valid map bounds.");
    return value;
  };

  const west = Math.max(ASIA_PACIFIC_BOUNDS.west, readCoordinate("west", ASIA_PACIFIC_BOUNDS.west));
  const south = Math.max(ASIA_PACIFIC_BOUNDS.south, readCoordinate("south", ASIA_PACIFIC_BOUNDS.south));
  const east = Math.min(ASIA_PACIFIC_BOUNDS.east, readCoordinate("east", ASIA_PACIFIC_BOUNDS.east));
  const north = Math.min(ASIA_PACIFIC_BOUNDS.north, readCoordinate("north", ASIA_PACIFIC_BOUNDS.north));
  if (west >= east || south >= north) throw new HTTPError(400, "Use valid Asia–Pacific map bounds.");

  return {
    westE6: Math.round(west * 1_000_000),
    southE6: Math.round(south * 1_000_000),
    eastE6: Math.round(east * 1_000_000),
    northE6: Math.round(north * 1_000_000),
  };
}

function normalizeMessage(value) {
  const body = String(value ?? "")
    .normalize("NFKC")
    .replace(FORMAT_CONTROL_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!body) throw new HTTPError(400, "Write a short message first.");
  if ([...body].length > MAX_MESSAGE_LENGTH) {
    throw new HTTPError(400, `Keep the message under ${MAX_MESSAGE_LENGTH} characters.`);
  }

  const safetyText = createSafetyText(body);
  if (
    LINK_SCHEME_PATTERN.test(safetyText) ||
    DOMAIN_PATTERN.test(safetyText) ||
    IP_ADDRESS_PATTERN.test(safetyText) ||
    EMAIL_PATTERN.test(safetyText) ||
    PHONE_PATTERN.test(safetyText) ||
    SOCIAL_CONTACT_PATTERN.test(safetyText)
  ) {
    throw new HTTPError(
      422,
      "Links and contact details cannot be posted.",
      "prohibited_contact",
    );
  }
  if (SELF_HARM_PATTERN.test(safetyText)) {
    throw new HTTPError(
      422,
      "This cannot be posted here. If anyone is in immediate danger call 000; Lifeline 13 11 14.",
      "crisis_content",
    );
  }
  if (DANGEROUS_PATTERNS.some((pattern) => pattern.test(safetyText))) {
    throw new HTTPError(
      422,
      "This cannot be posted because it may describe threats, harm, weapons, or illegal activity.",
      "unsafe_content",
    );
  }
  return body;
}

function createSafetyText(value) {
  return value
    .normalize("NFKC")
    .replace(FORMAT_CONTROL_PATTERN, "")
    .replace(/[。．｡]/g, ".")
    .replace(/(?:\[|\()\s*dot\s*(?:\]|\))/gi, ".")
    .replace(/(?:\[|\()\s*at\s*(?:\]|\))/gi, "@")
    .replace(/\s+dot\s+/gi, ".")
    .toLowerCase();
}

function snapCoordinate(value) {
  return Math.round((value * 1_000_000) / PIN_GRID_E6) * PIN_GRID_E6;
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
    database.prepare("DELETE FROM notifications WHERE expires_at <= ?").bind(now),
    database.prepare("DELETE FROM rate_limits WHERE last_post_at <= ?").bind(oldestRateLimit),
    database.prepare(
      `DELETE FROM shout_locations
        WHERE kind = 'pin'
          AND NOT EXISTS (
            SELECT 1 FROM messages WHERE messages.place_id = shout_locations.id
          )`,
    ),
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
    replyCount: Number(row.reply_count ?? 0),
    parentId: row.parent_id || null,
    location: serializeLocation(row),
  };
}

function serializeLocation(row) {
  return {
    placeId: row.place_id,
    label: row.place_label || "Pinned spot",
    kind: row.place_kind || (PIN_ID_PATTERN.test(row.place_id) ? "pin" : "preset"),
    latitude: Number(row.latitude_e6) / 1_000_000,
    longitude: Number(row.longitude_e6) / 1_000_000,
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
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
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

function distanceKm(latitude, longitude, targetLatitude, targetLongitude) {
  const toRadians = (number) => (number * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(targetLatitude - latitude);
  const longitudeDelta = toRadians(targetLongitude - longitude);
  const startLatitude = toRadians(latitude);
  const endLatitude = toRadians(targetLatitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
