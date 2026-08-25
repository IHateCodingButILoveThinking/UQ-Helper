var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/food-api.js
var FOOD_TYPES = /* @__PURE__ */ new Set([
  "dish",
  "drink",
  "restaurant_find",
  "market",
  "cafe",
  "dessert",
  "deal",
  "other"
]);
var CUISINES = /* @__PURE__ */ new Set([
  "Chinese",
  "Singaporean",
  "Australian",
  "Japanese",
  "Korean",
  "Malaysian",
  "Indonesian",
  "Other"
]);
var VIBE_TAGS = /* @__PURE__ */ new Set([
  "study-friendly",
  "quick-grab",
  "group-friendly",
  "quiet",
  "lively",
  "late-night",
  "takeaway-friendly",
  "date-friendly",
  "solo-friendly",
  "outdoor-seating"
]);
var REPORT_REASONS = /* @__PURE__ */ new Set([
  "spam",
  "wrong_location",
  "not_food",
  "inappropriate",
  "duplicate",
  "other"
]);
var IMAGE_TYPES = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp"]);
var CLIENT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var MAX_IMAGE_BYTES = 25e5;
var ASIA_PACIFIC_BOUNDS = { south: -45, north: 82, west: 25, east: 180 };
var FORMAT_CONTROL_PATTERN = /[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g;
var LINK_PATTERN = /\b(?:https?|hxxps?|ftp):\/\/|\bwww\s*\.|\b[a-z0-9][a-z0-9-]*\s*\.\s*(?:com|net|org|io|app|dev|xyz|info|co|me|gg|ai|site|online|link)\b/i;
var EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
var DANGEROUS_PATTERN = /\b(?:i|we|you|they|let(?:'s|s)|will|going\s+to)\b(?:\W+\w+){0,4}\W+\b(?:kill|murder|shoot|stab|bomb|attack|poison|kidnap|rape|assault|set\s+fire)\b/i;
var FoodError = class extends Error {
  static {
    __name(this, "FoodError");
  }
  constructor(status, message, code = "food_request_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
};
async function handleFoodRequest({ request, env, ctx, url, path, respond }) {
  if (request.method === "GET" && path.startsWith("/api/images/")) {
    return getFoodImage(request, env, path);
  }
  if (request.method === "POST" && path === "/api/uploads") {
    return uploadFoodImage(request, env, respond);
  }
  if (request.method === "GET" && path === "/api/places/search") {
    return searchFoodPlaces(request, env, url, respond);
  }
  if (request.method === "GET" && path === "/api/shouts") {
    return listFoodShouts(request, env, url, respond);
  }
  if (request.method === "POST" && path === "/api/shouts") {
    return createFoodShout(request, env, respond);
  }
  const detailMatch = path.match(/^\/api\/shouts\/([0-9a-f-]{36})$/i);
  if (detailMatch && request.method === "GET") {
    return getFoodShout(request, env, detailMatch[1], respond);
  }
  if (detailMatch && request.method === "DELETE") {
    return deleteFoodShout(request, env, detailMatch[1], respond);
  }
  const commentsMatch = path.match(/^\/api\/shouts\/([0-9a-f-]{36})\/comments$/i);
  if (commentsMatch && request.method === "GET") {
    return listFoodComments(request, env, commentsMatch[1], respond);
  }
  if (commentsMatch && request.method === "POST") {
    return createFoodComment(request, env, commentsMatch[1], respond);
  }
  const reactionMatch = path.match(/^\/api\/shouts\/([0-9a-f-]{36})\/(like|save)$/i);
  if (reactionMatch && (request.method === "POST" || request.method === "DELETE")) {
    return toggleFoodReaction(request, env, reactionMatch[1], reactionMatch[2], respond);
  }
  const reportMatch = path.match(/^\/api\/shouts\/([0-9a-f-]{36})\/report$/i);
  if (reportMatch && request.method === "POST") {
    return reportFoodEntity(request, env, "shout", reportMatch[1], respond);
  }
  const verifyMatch = path.match(/^\/api\/shouts\/([0-9a-f-]{36})\/verify$/i);
  if (verifyMatch && request.method === "POST") {
    return verifyFoodShout(request, env, verifyMatch[1], respond);
  }
  const triedMatch = path.match(/^\/api\/shouts\/([0-9a-f-]{36})\/tried$/i);
  if (triedMatch && request.method === "POST") {
    return markFoodTried(request, env, triedMatch[1], respond);
  }
  const commentMatch = path.match(/^\/api\/comments\/([0-9a-f-]{36})$/i);
  if (commentMatch && request.method === "DELETE") {
    return deleteFoodComment(request, env, commentMatch[1], respond);
  }
  const commentReportMatch = path.match(/^\/api\/comments\/([0-9a-f-]{36})\/report$/i);
  if (commentReportMatch && request.method === "POST") {
    return reportFoodEntity(request, env, "comment", commentReportMatch[1], respond);
  }
  return null;
}
__name(handleFoodRequest, "handleFoodRequest");
async function uploadFoodImage(request, env, respond) {
  if (!env.FOOD_IMAGES) {
    throw new FoodError(503, "Image storage is not configured yet.", "image_storage_unavailable");
  }
  const clientHash = await getClientHash(request);
  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new FoodError(400, "Choose one food photo first.");
  }
  if (!IMAGE_TYPES.has(file.type)) {
    throw new FoodError(415, "Upload a JPEG, PNG, or WebP image.");
  }
  if (!Number.isFinite(file.size) || file.size < 1 || file.size > MAX_IMAGE_BYTES) {
    throw new FoodError(413, "Keep the compressed photo under 2.5 MB.");
  }
  const width = optionalInteger(form.get("width"), 1, 4096);
  const height = optionalInteger(form.get("height"), 1, 4096);
  const postId = UUID_PATTERN.test(String(form.get("postId") ?? "")) ? String(form.get("postId")) : crypto.randomUUID();
  const extension = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
  const objectKey = `food-shouts/${clientHash.slice(0, 16)}/${postId}/${crypto.randomUUID()}.${extension}`;
  const bytes = await file.arrayBuffer();
  const now = unixNow();
  await env.FOOD_IMAGES.put(objectKey, bytes, {
    httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { width: String(width ?? ""), height: String(height ?? "") }
  });
  try {
    await env.DB.prepare(
      `INSERT INTO food_uploads
         (object_key, author_hash, mime_type, byte_size, width, height, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(objectKey, clientHash, file.type, file.size, width, height, now, now + 24 * 60 * 60).run();
  } catch (error) {
    await env.FOOD_IMAGES.delete(objectKey);
    throw error;
  }
  return respond({ objectKey, width, height, byteSize: file.size, mimeType: file.type }, 201);
}
__name(uploadFoodImage, "uploadFoodImage");
async function getFoodImage(request, env, path) {
  if (!env.FOOD_IMAGES) throw new FoodError(404, "Image not found.");
  const key = decodeURIComponent(path.slice("/api/images/".length));
  if (!key.startsWith("food-shouts/")) throw new FoodError(404, "Image not found.");
  const object = await env.FOOD_IMAGES.get(key);
  if (!object) throw new FoodError(404, "Image not found.");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", object.httpEtag);
  headers.set("X-Content-Type-Options", "nosniff");
  const origin = request.headers.get("origin");
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  return new Response(object.body, { headers });
}
__name(getFoodImage, "getFoodImage");
async function createFoodShout(request, env, respond) {
  const payload = await readJson(request);
  const clientHash = await getClientHash(request);
  const id = UUID_PATTERN.test(String(payload.id ?? "")) ? String(payload.id) : crypto.randomUUID();
  const title = normalizeFoodText(payload.title, "title", 80, true);
  const caption = normalizeFoodText(payload.caption, "caption", 280, false);
  const locationLabel = normalizeFoodText(payload.locationLabel, "location", 120, true);
  const placeName = normalizeFoodText(payload.placeName, "place name", 100, false) || null;
  const cuisine = CUISINES.has(payload.cuisine) ? payload.cuisine : "Other";
  const shoutType = String(payload.shoutType ?? "other");
  if (!FOOD_TYPES.has(shoutType)) throw new FoodError(400, "Choose a valid food type.");
  const latitude = finiteCoordinate(payload.latitude, ASIA_PACIFIC_BOUNDS.south, ASIA_PACIFIC_BOUNDS.north, "latitude");
  const longitude = finiteCoordinate(payload.longitude, ASIA_PACIFIC_BOUNDS.west, ASIA_PACIFIC_BOUNDS.east, "longitude");
  const imageKey = String(payload.imageKey ?? "");
  const vibes = normalizeVibes(payload.vibeTags);
  const priceText = normalizeFoodText(payload.priceText, "price", 40, false) || null;
  const priceNumeric = parsePrice(priceText);
  const expiresAt = normalizeExpiry(payload.expiresAt);
  const provider = normalizeToken(payload.provider, 30);
  const providerPlaceId = normalizeToken(payload.providerPlaceId, 160);
  const now = unixNow();
  const upload = await env.DB.prepare(
    `SELECT object_key, mime_type, width, height
       FROM food_uploads
      WHERE object_key = ? AND author_hash = ? AND claimed_at IS NULL AND expires_at > ?`
  ).bind(imageKey, clientHash, now).first();
  if (!upload) throw new FoodError(400, "Upload a valid food photo before publishing.");
  await enforceFoodRateLimit(env.DB, clientHash, now);
  const venueAnchorId = await resolveVenueAnchor(env.DB, {
    placeName,
    provider,
    providerPlaceId,
    latitude,
    longitude,
    now
  });
  const row = {
    id,
    author_hash: clientHash,
    title,
    caption,
    latitude_e6: Math.round(latitude * 1e6),
    longitude_e6: Math.round(longitude * 1e6),
    location_label: locationLabel,
    place_name: placeName,
    provider,
    provider_place_id: providerPlaceId,
    cuisine,
    shout_type: shoutType,
    price_text: priceText,
    price_numeric: priceNumeric,
    vibe_tags_json: JSON.stringify(vibes),
    geohash: encodeGeohash(latitude, longitude, 7),
    image_key: imageKey,
    image_mime: upload.mime_type,
    image_width: upload.width,
    image_height: upload.height,
    venue_anchor_id: venueAnchorId,
    created_at: now,
    updated_at: now,
    expires_at: expiresAt,
    status: "active"
  };
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO food_shouts
         (id, author_hash, title, caption, latitude_e6, longitude_e6,
          location_label, place_name, provider, provider_place_id, cuisine,
          shout_type, price_text, price_numeric, vibe_tags_json, geohash,
          image_key, image_mime, image_width, image_height, venue_anchor_id,
          created_at, updated_at, expires_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
    ).bind(
      row.id,
      row.author_hash,
      row.title,
      row.caption,
      row.latitude_e6,
      row.longitude_e6,
      row.location_label,
      row.place_name,
      row.provider,
      row.provider_place_id,
      row.cuisine,
      row.shout_type,
      row.price_text,
      row.price_numeric,
      row.vibe_tags_json,
      row.geohash,
      row.image_key,
      row.image_mime,
      row.image_width,
      row.image_height,
      row.venue_anchor_id,
      row.created_at,
      row.updated_at,
      row.expires_at
    ),
    env.DB.prepare("UPDATE food_uploads SET claimed_at = ? WHERE object_key = ?").bind(now, imageKey)
  ]);
  return respond({ shout: serializeFoodShout(row, request, clientHash) }, 201);
}
__name(createFoodShout, "createFoodShout");
async function listFoodShouts(request, env, url, respond) {
  const bounds = normalizeBounds(url);
  const clientHash = await getClientHash(request);
  const limit = clampInteger(url.searchParams.get("limit"), 1, 100, 80);
  const cuisine = String(url.searchParams.get("cuisine") ?? "");
  const type = String(url.searchParams.get("type") ?? "");
  const query = normalizeSearchQuery(url.searchParams.get("q"));
  const mine = url.searchParams.get("mine") === "1";
  const saved = url.searchParams.get("saved") === "1";
  const budget = url.searchParams.get("budget") === "1";
  const now = unixNow();
  const clauses = [
    "s.status = 'active'",
    "(s.expires_at IS NULL OR s.expires_at > ?)",
    "s.latitude_e6 BETWEEN ? AND ?",
    "s.longitude_e6 BETWEEN ? AND ?"
  ];
  const bindings = [clientHash, clientHash, now, bounds.southE6, bounds.northE6, bounds.westE6, bounds.eastE6];
  if (cuisine && CUISINES.has(cuisine)) {
    clauses.push("s.cuisine = ?");
    bindings.push(cuisine);
  }
  if (type && FOOD_TYPES.has(type)) {
    clauses.push("s.shout_type = ?");
    bindings.push(type);
  }
  if (query) {
    clauses.push("(s.title LIKE ? ESCAPE '\\' OR s.caption LIKE ? ESCAPE '\\' OR s.place_name LIKE ? ESCAPE '\\' OR s.location_label LIKE ? ESCAPE '\\' OR s.cuisine LIKE ? ESCAPE '\\')");
    const like = `%${escapeLike(query)}%`;
    bindings.push(like, like, like, like, like);
  }
  if (mine) {
    clauses.push("s.author_hash = ?");
    bindings.push(clientHash);
  }
  if (saved) {
    clauses.push("EXISTS (SELECT 1 FROM food_reactions sr WHERE sr.shout_id = s.id AND sr.client_hash = ? AND sr.kind = 'save')");
    bindings.push(clientHash);
  }
  if (budget) clauses.push("s.price_numeric IS NOT NULL AND s.price_numeric < 12");
  const { results = [] } = await env.DB.prepare(
    `${foodSelectSql()}
      WHERE ${clauses.join(" AND ")}
      ORDER BY s.created_at DESC
      LIMIT ?`
  ).bind(...bindings, limit).all();
  return respond({ generatedAt: new Date(now * 1e3).toISOString(), shouts: results.map((row) => serializeFoodShout(row, request, clientHash)) });
}
__name(listFoodShouts, "listFoodShouts");
async function getFoodShout(request, env, id, respond) {
  const clientHash = await getClientHash(request);
  const row = await env.DB.prepare(`${foodSelectSql()} WHERE s.id = ? LIMIT 1`).bind(clientHash, clientHash, id).first();
  if (!row || row.status === "deleted") throw new FoodError(404, "Food Shout not found.");
  return respond({ shout: serializeFoodShout(row, request, clientHash) });
}
__name(getFoodShout, "getFoodShout");
async function deleteFoodShout(request, env, id, respond) {
  const clientHash = await getClientHash(request);
  const result = await env.DB.prepare(
    "UPDATE food_shouts SET status = 'deleted', updated_at = ? WHERE id = ? AND author_hash = ? AND status = 'active'"
  ).bind(unixNow(), id, clientHash).run();
  if (!Number(result.meta?.changes)) throw new FoodError(404, "Food Shout not found or not owned by this device.");
  return respond({ accepted: true });
}
__name(deleteFoodShout, "deleteFoodShout");
function foodSelectSql() {
  return `SELECT s.*,
      EXISTS(SELECT 1 FROM food_reactions r WHERE r.shout_id = s.id AND r.client_hash = ? AND r.kind = 'like') AS viewer_liked,
      EXISTS(SELECT 1 FROM food_reactions r WHERE r.shout_id = s.id AND r.client_hash = ? AND r.kind = 'save') AS viewer_saved
    FROM food_shouts AS s`;
}
__name(foodSelectSql, "foodSelectSql");
async function listFoodComments(request, env, shoutId, respond) {
  await requireActiveShout(env.DB, shoutId);
  const clientHash = await getClientHash(request);
  const { results = [] } = await env.DB.prepare(
    `SELECT id, shout_id, parent_comment_id, body, created_at, status,
            author_hash = ? AS viewer_owned
       FROM food_comments
      WHERE shout_id = ? AND status = 'active'
      ORDER BY CASE WHEN parent_comment_id IS NULL THEN created_at ELSE 0 END DESC,
               parent_comment_id, created_at ASC`
  ).bind(clientHash, shoutId).all();
  return respond({ comments: results.map(serializeFoodComment) });
}
__name(listFoodComments, "listFoodComments");
async function createFoodComment(request, env, shoutId, respond) {
  const payload = await readJson(request);
  const clientHash = await getClientHash(request);
  const body = normalizeFoodText(payload.body, "comment", 160, true);
  const parentId = payload.parentCommentId ? String(payload.parentCommentId) : null;
  const shout = await requireActiveShout(env.DB, shoutId);
  if (parentId) {
    const parent = await env.DB.prepare(
      "SELECT id, parent_comment_id FROM food_comments WHERE id = ? AND shout_id = ? AND status = 'active'"
    ).bind(parentId, shoutId).first();
    if (!parent) throw new FoodError(404, "Comment not found.");
    if (parent.parent_comment_id) throw new FoodError(400, "Reply to the main comment instead.");
  }
  const now = unixNow();
  await enforceFoodRateLimit(env.DB, clientHash, now, 5);
  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO food_comments
         (id, shout_id, author_hash, parent_comment_id, body, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`
    ).bind(id, shoutId, clientHash, parentId, body, now),
    env.DB.prepare("UPDATE food_shouts SET comment_count = comment_count + 1, updated_at = ? WHERE id = ?").bind(now, shoutId)
  ]);
  if (shout.author_hash && shout.author_hash !== clientHash) {
    await env.DB.prepare(
      `INSERT INTO notifications
         (id, recipient_hash, actor_hash, type, message_id, parent_message_id, created_at, expires_at)
       VALUES (?, ?, ?, 'reply', ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), shout.author_hash, clientHash, id, shoutId, now, shout.expires_at ?? now + 30 * 24 * 60 * 60).run();
  }
  return respond({ comment: serializeFoodComment({ id, shout_id: shoutId, parent_comment_id: parentId, body, created_at: now, viewer_owned: 1 }) }, 201);
}
__name(createFoodComment, "createFoodComment");
async function deleteFoodComment(request, env, commentId, respond) {
  const clientHash = await getClientHash(request);
  const comment = await env.DB.prepare(
    "SELECT id, shout_id FROM food_comments WHERE id = ? AND author_hash = ? AND status = 'active'"
  ).bind(commentId, clientHash).first();
  if (!comment) throw new FoodError(404, "Comment not found or not owned by this device.");
  await env.DB.batch([
    env.DB.prepare("UPDATE food_comments SET status = 'deleted' WHERE id = ?").bind(commentId),
    env.DB.prepare("UPDATE food_shouts SET comment_count = MAX(0, comment_count - 1), updated_at = ? WHERE id = ?").bind(unixNow(), comment.shout_id)
  ]);
  return respond({ accepted: true });
}
__name(deleteFoodComment, "deleteFoodComment");
async function toggleFoodReaction(request, env, shoutId, kind, respond) {
  await requireActiveShout(env.DB, shoutId);
  const clientHash = await getClientHash(request);
  const countColumn = kind === "like" ? "like_count" : "save_count";
  let active;
  if (request.method === "POST") {
    const insertion = await env.DB.prepare(
      "INSERT OR IGNORE INTO food_reactions (shout_id, client_hash, kind, created_at) VALUES (?, ?, ?, ?)"
    ).bind(shoutId, clientHash, kind, unixNow()).run();
    active = true;
    if (Number(insertion.meta?.changes)) {
      await env.DB.prepare(`UPDATE food_shouts SET ${countColumn} = ${countColumn} + 1 WHERE id = ?`).bind(shoutId).run();
    }
  } else {
    const deletion = await env.DB.prepare(
      "DELETE FROM food_reactions WHERE shout_id = ? AND client_hash = ? AND kind = ?"
    ).bind(shoutId, clientHash, kind).run();
    active = false;
    if (Number(deletion.meta?.changes)) {
      await env.DB.prepare(`UPDATE food_shouts SET ${countColumn} = MAX(0, ${countColumn} - 1) WHERE id = ?`).bind(shoutId).run();
    }
  }
  const row = await env.DB.prepare(`SELECT ${countColumn} AS total FROM food_shouts WHERE id = ?`).bind(shoutId).first();
  return respond({ active, count: Number(row?.total ?? 0) });
}
__name(toggleFoodReaction, "toggleFoodReaction");
async function reportFoodEntity(request, env, entityType, entityId, respond) {
  const payload = await readJson(request);
  const clientHash = await getClientHash(request);
  const reason = REPORT_REASONS.has(payload.reason) ? payload.reason : "other";
  const table = entityType === "shout" ? "food_shouts" : "food_comments";
  const entity = await env.DB.prepare(`SELECT id FROM ${table} WHERE id = ?`).bind(entityId).first();
  if (!entity) throw new FoodError(404, "Content not found.");
  const insertion = await env.DB.prepare(
    "INSERT OR IGNORE INTO food_reports (entity_type, entity_id, client_hash, reason, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(entityType, entityId, clientHash, reason, unixNow()).run();
  if (entityType === "comment" && Number(insertion.meta?.changes)) {
    await env.DB.prepare(
      "UPDATE food_comments SET report_count = report_count + 1, status = CASE WHEN report_count + 1 >= 3 THEN 'hidden' ELSE status END WHERE id = ?"
    ).bind(entityId).run();
  }
  if (entityType === "shout" && Number(insertion.meta?.changes)) {
    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM food_reports WHERE entity_type = 'shout' AND entity_id = ?"
    ).bind(entityId).first();
    if (Number(count?.total ?? 0) >= 3) {
      await env.DB.prepare("UPDATE food_shouts SET status = 'hidden', updated_at = ? WHERE id = ?").bind(unixNow(), entityId).run();
    }
  }
  return respond({ accepted: Boolean(insertion.meta?.changes) });
}
__name(reportFoodEntity, "reportFoodEntity");
async function cleanExpiredFoodData(env) {
  const now = unixNow();
  const { results = [] } = await env.DB.prepare(
    `SELECT u.object_key
       FROM food_uploads AS u
       LEFT JOIN food_shouts AS s ON s.image_key = u.object_key
      WHERE (u.claimed_at IS NULL AND u.expires_at <= ?)
         OR s.status = 'deleted'
         OR (s.expires_at IS NOT NULL AND s.expires_at <= ?)
      LIMIT 100`
  ).bind(now, now).all();
  if (env.FOOD_IMAGES) {
    await Promise.all(results.map((row) => env.FOOD_IMAGES.delete(row.object_key)));
  }
  await env.DB.batch([
    env.DB.prepare("UPDATE food_shouts SET status = 'deleted', updated_at = ? WHERE expires_at IS NOT NULL AND expires_at <= ?").bind(now, now),
    env.DB.prepare("DELETE FROM food_uploads WHERE claimed_at IS NULL AND expires_at <= ?").bind(now),
    env.DB.prepare("DELETE FROM food_place_cache WHERE expires_at <= ?").bind(now)
  ]);
}
__name(cleanExpiredFoodData, "cleanExpiredFoodData");
async function verifyFoodShout(request, env, shoutId, respond) {
  await requireActiveShout(env.DB, shoutId);
  const payload = await readJson(request);
  const clientHash = await getClientHash(request);
  const status = String(payload.status ?? "");
  if (!["confirmed", "unsure", "gone"].includes(status)) throw new FoodError(400, "Choose a valid freshness response.");
  const now = unixNow();
  const previous = await env.DB.prepare("SELECT status FROM food_verifications WHERE shout_id = ? AND client_hash = ?").bind(shoutId, clientHash).first();
  await env.DB.prepare(
    `INSERT INTO food_verifications (shout_id, client_hash, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(shout_id, client_hash) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`
  ).bind(shoutId, clientHash, status, now, now).run();
  await refreshVerificationCounts(env.DB, shoutId);
  const counts = await env.DB.prepare(
    "SELECT confirmed_count, unsure_count, gone_count FROM food_shouts WHERE id = ?"
  ).bind(shoutId).first();
  return respond({ accepted: true, changed: previous?.status !== status, ...serializeVerificationCounts(counts) });
}
__name(verifyFoodShout, "verifyFoodShout");
async function markFoodTried(request, env, shoutId, respond) {
  await requireActiveShout(env.DB, shoutId);
  const payload = await readJson(request);
  const clientHash = await getClientHash(request);
  const verdict = String(payload.verdict ?? "");
  if (!["would_get_again", "good", "okay"].includes(verdict)) throw new FoodError(400, "Choose a valid tried response.");
  const now = unixNow();
  await env.DB.prepare(
    `INSERT INTO food_tries (shout_id, client_hash, verdict, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(shout_id, client_hash) DO UPDATE SET verdict = excluded.verdict, updated_at = excluded.updated_at`
  ).bind(shoutId, clientHash, verdict, now, now).run();
  const counts = await env.DB.prepare(
    `SELECT COUNT(*) AS tried_count,
            SUM(CASE WHEN verdict = 'would_get_again' THEN 1 ELSE 0 END) AS positive_count
       FROM food_tries WHERE shout_id = ?`
  ).bind(shoutId).first();
  await env.DB.prepare(
    "UPDATE food_shouts SET tried_count = ?, would_get_again_count = ?, updated_at = ? WHERE id = ?"
  ).bind(Number(counts?.tried_count ?? 0), Number(counts?.positive_count ?? 0), now, shoutId).run();
  return respond({ accepted: true, ...serializeTriedCounts(counts) });
}
__name(markFoodTried, "markFoodTried");
async function searchFoodPlaces(request, env, url, respond) {
  const query = normalizeSearchQuery(url.searchParams.get("q"));
  if (!query || query.length < 2) throw new FoodError(400, "Enter at least two characters and submit the search.");
  if (query.length > 80) throw new FoodError(400, "Keep the place search short.");
  const cacheKey = `nominatim:${query.toLowerCase()}`;
  const now = unixNow();
  const cached = await env.DB.prepare(
    "SELECT response_json FROM food_place_cache WHERE cache_key = ? AND expires_at > ?"
  ).bind(cacheKey, now).first();
  if (cached?.response_json) {
    return respond({ provider: "OpenStreetMap", attribution: "\xA9 OpenStreetMap contributors", cached: true, results: JSON.parse(cached.response_json) });
  }
  const lastRequest = await env.DB.prepare("SELECT last_request_at_ms FROM food_provider_limits WHERE provider = 'nominatim'").first();
  const nowMs = Date.now();
  if (lastRequest && nowMs - Number(lastRequest.last_request_at_ms) < 1100) {
    throw new FoodError(429, "Place search is busy. Wait a moment and submit again.");
  }
  await env.DB.prepare(
    `INSERT INTO food_provider_limits (provider, last_request_at_ms) VALUES ('nominatim', ?)
     ON CONFLICT(provider) DO UPDATE SET last_request_at_ms = excluded.last_request_at_ms`
  ).bind(nowMs).run();
  const endpoint = String(env.GEOCODER_URL || "https://nominatim.openstreetmap.org").replace(/\/$/, "");
  const searchUrl = new URL(`${endpoint}/search`);
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("format", "jsonv2");
  searchUrl.searchParams.set("limit", "6");
  searchUrl.searchParams.set("addressdetails", "1");
  const response = await fetch(searchUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "UQ-Helper-Food-Shout/1.0 (student project; uq-helper-api)",
      Referer: request.headers.get("origin") || "https://uq-bus-time-board-gxyx.vercel.app/"
    }
  });
  if (!response.ok) throw new FoodError(502, "Place search is unavailable right now.");
  const raw = await response.json();
  const results = raw.map((item) => ({
    provider: "osm",
    providerPlaceId: `${item.osm_type}:${item.osm_id}`,
    label: String(item.display_name || "").slice(0, 160),
    name: String(item.name || item.display_name?.split(",")[0] || "Pinned place").slice(0, 100),
    latitude: Number(item.lat),
    longitude: Number(item.lon),
    category: item.type || item.category || "place"
  })).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
  await env.DB.prepare(
    `INSERT INTO food_place_cache (cache_key, response_json, created_at, expires_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET response_json = excluded.response_json,
       created_at = excluded.created_at, expires_at = excluded.expires_at`
  ).bind(cacheKey, JSON.stringify(results), now, now + 30 * 24 * 60 * 60).run();
  return respond({ provider: "OpenStreetMap", attribution: "\xA9 OpenStreetMap contributors", cached: false, results });
}
__name(searchFoodPlaces, "searchFoodPlaces");
async function requireActiveShout(database, id) {
  const row = await database.prepare(
    "SELECT id, author_hash, expires_at FROM food_shouts WHERE id = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > ?)"
  ).bind(id, unixNow()).first();
  if (!row) throw new FoodError(404, "Food Shout not found.");
  return row;
}
__name(requireActiveShout, "requireActiveShout");
async function refreshVerificationCounts(database, shoutId) {
  const counts = await database.prepare(
    `SELECT SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
            SUM(CASE WHEN status = 'unsure' THEN 1 ELSE 0 END) AS unsure,
            SUM(CASE WHEN status = 'gone' THEN 1 ELSE 0 END) AS gone
       FROM food_verifications WHERE shout_id = ?`
  ).bind(shoutId).first();
  await database.prepare(
    "UPDATE food_shouts SET confirmed_count = ?, unsure_count = ?, gone_count = ?, updated_at = ? WHERE id = ?"
  ).bind(Number(counts?.confirmed ?? 0), Number(counts?.unsure ?? 0), Number(counts?.gone ?? 0), unixNow(), shoutId).run();
}
__name(refreshVerificationCounts, "refreshVerificationCounts");
async function resolveVenueAnchor(database, details) {
  if (!details.placeName) return null;
  if (details.provider && details.providerPlaceId) {
    const existing = await database.prepare(
      "SELECT id FROM venue_anchors WHERE provider = ? AND provider_place_id = ?"
    ).bind(details.provider, details.providerPlaceId).first();
    if (existing?.id) return existing.id;
  }
  const normalizedName = normalizeVenueName(details.placeName);
  const nearby = await database.prepare(
    `SELECT id FROM venue_anchors
      WHERE normalized_name = ?
        AND latitude_e6 BETWEEN ? AND ?
        AND longitude_e6 BETWEEN ? AND ?
      LIMIT 2`
  ).bind(
    normalizedName,
    Math.round((details.latitude - 25e-5) * 1e6),
    Math.round((details.latitude + 25e-5) * 1e6),
    Math.round((details.longitude - 25e-5) * 1e6),
    Math.round((details.longitude + 25e-5) * 1e6)
  ).all();
  if (nearby.results?.length === 1) return nearby.results[0].id;
  const id = crypto.randomUUID();
  await database.prepare(
    `INSERT INTO venue_anchors
       (id, display_name, normalized_name, latitude_e6, longitude_e6,
        provider, provider_place_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    details.placeName,
    normalizedName,
    Math.round(details.latitude * 1e6),
    Math.round(details.longitude * 1e6),
    details.provider,
    details.providerPlaceId,
    details.now,
    details.now
  ).run();
  return id;
}
__name(resolveVenueAnchor, "resolveVenueAnchor");
async function enforceFoodRateLimit(database, clientHash, now, cooldown = 30) {
  const dayKey = new Date(now * 1e3).toISOString().slice(0, 10);
  const rate = await database.prepare(
    "SELECT last_post_at, day_key, daily_count FROM rate_limits WHERE client_hash = ?"
  ).bind(clientHash).first();
  if (rate && now - Number(rate.last_post_at) < cooldown) {
    throw new FoodError(429, `Please wait ${cooldown - (now - Number(rate.last_post_at))} seconds and try again.`);
  }
  const dailyCount = rate?.day_key === dayKey ? Number(rate.daily_count) : 0;
  if (dailyCount >= 30) throw new FoodError(429, "This device has reached today\u2019s contribution limit.");
  await database.prepare(
    `INSERT INTO rate_limits (client_hash, last_post_at, day_key, daily_count)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(client_hash) DO UPDATE SET
       last_post_at = excluded.last_post_at,
       day_key = excluded.day_key,
       daily_count = CASE WHEN rate_limits.day_key = excluded.day_key
         THEN rate_limits.daily_count + 1 ELSE 1 END`
  ).bind(clientHash, now, dayKey).run();
}
__name(enforceFoodRateLimit, "enforceFoodRateLimit");
function serializeFoodShout(row, request, clientHash) {
  const tried = serializeTriedCounts({
    tried_count: row.tried_count,
    positive_count: row.would_get_again_count
  });
  return {
    id: row.id,
    title: row.title,
    caption: row.caption || "",
    latitude: Number(row.latitude_e6) / 1e6,
    longitude: Number(row.longitude_e6) / 1e6,
    locationLabel: row.location_label,
    placeName: row.place_name,
    provider: row.provider,
    providerPlaceId: row.provider_place_id,
    cuisine: row.cuisine,
    shoutType: row.shout_type,
    priceText: row.price_text,
    priceNumeric: row.price_numeric === null || row.price_numeric === void 0 ? null : Number(row.price_numeric),
    vibeTags: parseJsonArray(row.vibe_tags_json),
    geohash: row.geohash,
    imageKey: row.image_key,
    imageUrl: `${new URL(request.url).origin}/api/images/${encodeURIComponent(row.image_key)}`,
    imageWidth: Number(row.image_width || 0) || null,
    imageHeight: Number(row.image_height || 0) || null,
    venueAnchorId: row.venue_anchor_id,
    createdAt: new Date(Number(row.created_at) * 1e3).toISOString(),
    updatedAt: new Date(Number(row.updated_at) * 1e3).toISOString(),
    expiresAt: row.expires_at ? new Date(Number(row.expires_at) * 1e3).toISOString() : null,
    status: row.status,
    likeCount: Number(row.like_count ?? 0),
    saveCount: Number(row.save_count ?? 0),
    commentCount: Number(row.comment_count ?? 0),
    viewerLiked: Boolean(row.viewer_liked),
    viewerSaved: Boolean(row.viewer_saved),
    viewerOwned: row.author_hash === clientHash,
    freshness: serializeVerificationCounts(row),
    tried,
    activityTier: activityTier(row)
  };
}
__name(serializeFoodShout, "serializeFoodShout");
function serializeFoodComment(row) {
  return {
    id: row.id,
    shoutId: row.shout_id,
    parentCommentId: row.parent_comment_id || null,
    body: row.body,
    createdAt: new Date(Number(row.created_at) * 1e3).toISOString(),
    viewerOwned: Boolean(row.viewer_owned)
  };
}
__name(serializeFoodComment, "serializeFoodComment");
function serializeVerificationCounts(row) {
  const confirmed = Number(row?.confirmed_count ?? row?.confirmed ?? 0);
  const unsure = Number(row?.unsure_count ?? row?.unsure ?? 0);
  const gone = Number(row?.gone_count ?? row?.gone ?? 0);
  return { confirmed, unsure, gone, label: confirmed > gone ? "Fresh" : gone > confirmed ? "Changed" : "Unconfirmed" };
}
__name(serializeVerificationCounts, "serializeVerificationCounts");
function serializeTriedCounts(row) {
  const total = Number(row?.tried_count ?? 0);
  const positive = Number(row?.positive_count ?? row?.would_get_again_count ?? 0);
  const confidenceWeight = 3;
  const priorPositiveRate = 0.7;
  const adjustedWouldGetAgain = Math.round((positive + confidenceWeight * priorPositiveRate) / (total + confidenceWeight) * 100);
  return { total, wouldGetAgain: positive, adjustedWouldGetAgain, confidenceWeight, priorPositiveRate };
}
__name(serializeTriedCounts, "serializeTriedCounts");
function activityTier(row) {
  const activity = Number(row.like_count ?? 0) + Number(row.comment_count ?? 0) + Number(row.confirmed_count ?? 0);
  if (activity >= 5) return "hotspot";
  if (activity >= 2) return "rising";
  return "gem";
}
__name(activityTier, "activityTier");
function normalizeBounds(url) {
  const number = /* @__PURE__ */ __name((key, fallback) => {
    const value = Number(url.searchParams.get(key));
    return Number.isFinite(value) ? value : fallback;
  }, "number");
  const west = Math.max(ASIA_PACIFIC_BOUNDS.west, number("west", ASIA_PACIFIC_BOUNDS.west));
  const south = Math.max(ASIA_PACIFIC_BOUNDS.south, number("south", ASIA_PACIFIC_BOUNDS.south));
  const east = Math.min(ASIA_PACIFIC_BOUNDS.east, number("east", ASIA_PACIFIC_BOUNDS.east));
  const north = Math.min(ASIA_PACIFIC_BOUNDS.north, number("north", ASIA_PACIFIC_BOUNDS.north));
  if (west >= east || south >= north) throw new FoodError(400, "Use valid map bounds.");
  return {
    westE6: Math.round(west * 1e6),
    southE6: Math.round(south * 1e6),
    eastE6: Math.round(east * 1e6),
    northE6: Math.round(north * 1e6)
  };
}
__name(normalizeBounds, "normalizeBounds");
function normalizeFoodText(value, field, maxLength, required) {
  const text = String(value ?? "").normalize("NFKC").replace(FORMAT_CONTROL_PATTERN, "").replace(/\s+/g, " ").trim();
  if (required && !text) throw new FoodError(400, `Add a ${field}.`);
  if ([...text].length > maxLength) throw new FoodError(400, `Keep ${field} under ${maxLength} characters.`);
  if (text && (LINK_PATTERN.test(text) || EMAIL_PATTERN.test(text))) {
    throw new FoodError(422, "Links and contact details cannot be posted.", "prohibited_contact");
  }
  if (text && DANGEROUS_PATTERN.test(text)) {
    throw new FoodError(422, "This content cannot be posted.", "unsafe_content");
  }
  return text;
}
__name(normalizeFoodText, "normalizeFoodText");
function normalizeSearchQuery(value) {
  return String(value ?? "").normalize("NFKC").replace(FORMAT_CONTROL_PATTERN, "").replace(/\s+/g, " ").trim().slice(0, 80);
}
__name(normalizeSearchQuery, "normalizeSearchQuery");
function normalizeVibes(value) {
  if (!Array.isArray(value)) return [];
  const vibes = [...new Set(value.map(String).filter((item) => VIBE_TAGS.has(item)))];
  if (vibes.length > 3) throw new FoodError(400, "Choose up to three vibe tags.");
  return vibes;
}
__name(normalizeVibes, "normalizeVibes");
function normalizeToken(value, maxLength) {
  const token = String(value ?? "").trim();
  return token ? token.slice(0, maxLength) : null;
}
__name(normalizeToken, "normalizeToken");
function normalizeVenueName(value) {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
__name(normalizeVenueName, "normalizeVenueName");
function parsePrice(value) {
  if (!value) return null;
  const matches = value.match(/(?:\$|aud\s*)?(\d{1,6}(?:\.\d{1,2})?)/i);
  if (!matches) return null;
  const price = Number(matches[1]);
  return Number.isFinite(price) ? price : null;
}
__name(parsePrice, "parsePrice");
function normalizeExpiry(value) {
  if (!value) return null;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new FoodError(400, "Choose a valid expiry time.");
  const seconds = Math.floor(milliseconds / 1e3);
  const now = unixNow();
  if (seconds <= now || seconds > now + 366 * 24 * 60 * 60) throw new FoodError(400, "Expiry must be in the next year.");
  return seconds;
}
__name(normalizeExpiry, "normalizeExpiry");
function finiteCoordinate(value, min, max, label) {
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate) || coordinate < min || coordinate > max) throw new FoodError(400, `Choose a valid ${label}.`);
  return coordinate;
}
__name(finiteCoordinate, "finiteCoordinate");
function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
__name(parseJsonArray, "parseJsonArray");
function escapeLike(value) {
  return value.replace(/[\\%_]/g, "\\$&");
}
__name(escapeLike, "escapeLike");
function optionalInteger(value, min, max) {
  if (value === null || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}
__name(optionalInteger, "optionalInteger");
function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.trunc(number))) : fallback;
}
__name(clampInteger, "clampInteger");
async function readJson(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 16384) throw new FoodError(413, "Request is too large.");
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) throw new FoodError(415, "Send JSON content.");
  try {
    return await request.json();
  } catch {
    throw new FoodError(400, "Invalid request data.");
  }
}
__name(readJson, "readJson");
async function getClientHash(request) {
  const token = request.headers.get("x-shout-client") ?? "";
  if (!CLIENT_TOKEN_PATTERN.test(token)) throw new FoodError(400, "This device needs a valid anonymous session.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(getClientHash, "getClientHash");
function encodeGeohash(latitude, longitude, precision = 7) {
  const alphabet = "0123456789bcdefghjkmnpqrstuvwxyz";
  let lat = [-90, 90];
  let lon = [-180, 180];
  let even = true;
  let bit = 0;
  let character = 0;
  let result = "";
  while (result.length < precision) {
    const range = even ? lon : lat;
    const value = even ? longitude : latitude;
    const midpoint = (range[0] + range[1]) / 2;
    if (value >= midpoint) {
      character |= 1 << 4 - bit;
      range[0] = midpoint;
    } else {
      range[1] = midpoint;
    }
    even = !even;
    if (bit < 4) bit += 1;
    else {
      result += alphabet[character];
      bit = 0;
      character = 0;
    }
  }
  return result;
}
__name(encodeGeohash, "encodeGeohash");
function unixNow() {
  return Math.floor(Date.now() / 1e3);
}
__name(unixNow, "unixNow");

// src/index.js
var MESSAGE_LIFETIME_SECONDS = 7 * 24 * 60 * 60;
var POST_COOLDOWN_SECONDS = 30;
var REPLY_COOLDOWN_SECONDS = 5;
var DAILY_POST_LIMIT = 20;
var HIDE_AFTER_REPORTS = 3;
var MAX_MESSAGE_LENGTH = 160;
var MAP_RESULT_LIMIT = 200;
var PIN_GRID_E6 = 500;
var MAX_POST_DISTANCE_KM = 1;
var ASIA_PACIFIC_BOUNDS2 = Object.freeze({
  south: -45,
  north: 82,
  west: 25,
  east: 180
});
var PLACES = Object.freeze([
  { id: "great-court", label: "Great Court", shortLabel: "Great Court", latitude: -27.4971, longitude: 153.0133 },
  { id: "central-library", label: "Central Library", shortLabel: "Library", latitude: -27.496, longitude: 153.0145 },
  { id: "uq-lakes", label: "UQ Lakes", shortLabel: "UQ Lakes", latitude: -27.4976, longitude: 153.0177 },
  { id: "student-union", label: "Student Union", shortLabel: "Union", latitude: -27.4977, longitude: 153.0152 },
  { id: "uq-centre", label: "UQ Centre", shortLabel: "UQ Centre", latitude: -27.499, longitude: 153.0144 },
  { id: "hawken", label: "Hawken Engineering", shortLabel: "Hawken", latitude: -27.499, longitude: 153.0163 },
  { id: "law", label: "Forgan Smith / Law", shortLabel: "Law", latitude: -27.4951, longitude: 153.0131 }
]);
var PLACE_IDS = new Set(PLACES.map((place) => place.id));
var ALLOWED_EMOJIS = /* @__PURE__ */ new Set(["", "\u{1F44B}", "\u2615", "\u{1F4DA}", "\u{1F389}", "\u{1F440}"]);
var REACTION_EMOJIS = /* @__PURE__ */ new Set(["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F389}", "\u{1F440}"]);
var AVATAR_COLORS = ["#7452b8", "#2679a7", "#16836b", "#c1646f", "#b06c21", "#5368b6"];
var CLIENT_TOKEN_PATTERN2 = /^[A-Za-z0-9_-]{16,128}$/;
var PIN_ID_PATTERN = /^pin:-?\d{7,8}:\d{8,9}$/;
var FORMAT_CONTROL_PATTERN2 = /[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g;
var LINK_SCHEME_PATTERN = /\b(?:https?|hxxps?|ftp):\/\/|\b(?:javascript|data|mailto):|\bwww\s*\./i;
var DOMAIN_PATTERN = /\b[a-z0-9][a-z0-9-]*(?:\s*\.\s*[a-z0-9][a-z0-9-]*)*\s*\.\s*(?:com|com\.au|net|net\.au|org|org\.au|edu|edu\.au|gov|gov\.au|io|app|dev|xyz|info|me|co|ly|gg|tv|ai|live|site|online|link|top|club|shop|store|tech)\b/i;
var IP_ADDRESS_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b|\b(?:[a-f0-9]{1,4}:){2,}[a-f0-9]{1,4}\b/i;
var EMAIL_PATTERN2 = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
var PHONE_PATTERN = /(?:^|\D)(?:\+?61[\s().-]?|0)?(?:[23478][\s().-]?)?(?:\d[\s().-]?){8,10}(?:\D|$)/;
var SOCIAL_CONTACT_PATTERN = /@+[a-z0-9._-]{2,32}\b|\b(?:instagram|snapchat|telegram|whatsapp|wechat|discord|signal)\s*(?:is|at|:|@)\s*[a-z0-9._-]{2,32}\b/i;
var SELF_HARM_PATTERN = /\b(?:kill|cut|hurt)\s+myself\b|\bend\s+my\s+life\b|\bwant\s+to\s+die\b|\bsuicide\s+plan\b/i;
var DANGEROUS_PATTERNS = Object.freeze([
  /\b(?:i|we|you|they|let(?:'s|s)|gonna|going\s+to|will|plan(?:ning)?\s+to)\b(?:\W+\w+){0,4}\W+\b(?:kill|murder|shoot|stab|bomb|attack|poison|kidnap|rape|assault|beat\s+up|set\s+fire)\b/i,
  /\b(?:kill|murder|shoot|stab|attack|poison|kidnap|rape|assault)\b(?:\W+\w+){0,3}\W+\b(?:you|him|her|them|everyone|people|students?|staff|teacher)\b/i,
  /\b(?:bring|brought|have|got)\b(?:\W+\w+){0,3}\W+\b(?:gun|firearm|bomb|explosive|weapon)\b(?:\W+\w+){0,3}\W+\b(?:campus|school|university|library|building|class)\b/i,
  /\b(?:how\s+to|instructions?\s+(?:for|to))\s+(?:make|build|use)\s+(?:a\s+)?(?:bomb|explosive|weapon|poison)\b/i,
  /\b(?:buy|sell|selling|deal|dealing|score|get)\s+(?:some\s+)?(?:cocaine|meth|mdma|ecstasy|heroin|fentanyl|weapons?|firearms?)\b/i,
  /\b(?:go\s+kill\s+yourself|i\s+hope\s+you\s+die)\b/i
]);
var HTTPError = class extends Error {
  static {
    __name(this, "HTTPError");
  }
  constructor(status, message, code = "request_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
};
var src_default = {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env, ctx);
    } catch (error) {
      if (error instanceof HTTPError || Number.isInteger(error?.status)) {
        return jsonResponse(
          request,
          env,
          { error: error.message, code: error.code },
          error.status
        );
      }
      console.error("Unhandled shout-out API error", error);
      return jsonResponse(
        request,
        env,
        { error: "The shout-out service is unavailable right now." },
        500
      );
    }
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(Promise.all([cleanExpiredData(env.DB), cleanExpiredFoodData(env)]));
  }
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
    respond: /* @__PURE__ */ __name((payload, status = 200) => jsonResponse(request, env, payload, status), "respond")
  });
  if (foodResponse) return foodResponse;
  if (request.method === "GET" && (path === "/" || path === "/api/health")) {
    const database = await env.DB.prepare("SELECT 1 AS ready").first();
    return jsonResponse(request, env, {
      service: "UQ Helper Shout Outs",
      status: database?.ready === 1 ? "ok" : "degraded",
      retentionDays: 7
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
__name(handleRequest, "handleRequest");
async function listMessages(request, env, url) {
  const placeId = normalizePlaceId(url.searchParams.get("place"));
  const requestedLimit = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50) : 30;
  const now = unixNow2();
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
      LIMIT ?`
  ).bind(placeId, now, HIDE_AFTER_REPORTS, limit).all();
  return jsonResponse(request, env, {
    messages: results.map(serializeMessage),
    placeId,
    location: results[0] ? serializeLocation(results[0]) : null
  });
}
__name(listMessages, "listMessages");
async function summarizeMessages(request, env, url) {
  const now = unixNow2();
  const bounds = normalizeMapBounds(url);
  const requestedLimit = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), MAP_RESULT_LIMIT) : 100;
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
      LIMIT ?`
  ).bind(
    now,
    HIDE_AFTER_REPORTS,
    bounds.southE6,
    bounds.northE6,
    bounds.westE6,
    bounds.eastE6,
    limit
  ).all();
  return jsonResponse(request, env, {
    generatedAt: new Date(now * 1e3).toISOString(),
    summaries: results.map((row) => ({
      ...serializeLocation(row),
      messageCount: Number(row.message_count ?? 0),
      latest: serializeMessage(row)
    }))
  });
}
__name(summarizeMessages, "summarizeMessages");
async function listRecentMessages(request, env, url) {
  const now = unixNow2();
  const bounds = normalizeMapBounds(url);
  const requestedLimit = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50) : 30;
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
      LIMIT ?`
  ).bind(
    now,
    HIDE_AFTER_REPORTS,
    bounds.southE6,
    bounds.northE6,
    bounds.westE6,
    bounds.eastE6,
    limit
  ).all();
  return jsonResponse(request, env, {
    generatedAt: new Date(now * 1e3).toISOString(),
    messages: results.map(serializeMessage)
  });
}
__name(listRecentMessages, "listRecentMessages");
async function createMessage(request, env) {
  ensureJsonRequest(request);
  const payload = await readJson2(request);
  const body = normalizeMessage(payload.message);
  const emoji = normalizePostEmoji(payload.emoji);
  const clientHash = await getClientHash2(request);
  const now = unixNow2();
  const location = await resolvePostLocation(payload, env.DB, now);
  const placeId = location.id;
  const dayKey = new Date(now * 1e3).toISOString().slice(0, 10);
  const rate = await env.DB.prepare(
    "SELECT last_post_at, day_key, daily_count FROM rate_limits WHERE client_hash = ?"
  ).bind(clientHash).first();
  if (rate && now - Number(rate.last_post_at) < POST_COOLDOWN_SECONDS) {
    const retryAfter = POST_COOLDOWN_SECONDS - (now - Number(rate.last_post_at));
    throw new HTTPError(429, `Please wait ${retryAfter} seconds before posting again.`);
  }
  const dailyCount = rate?.day_key === dayKey ? Number(rate.daily_count) : 0;
  if (dailyCount >= DAILY_POST_LIMIT) {
    throw new HTTPError(429, "You have reached today\u2019s posting limit.");
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
         VALUES (?, ?, ?, ?, 'pin', ?)`
      ).bind(
        location.id,
        location.latitudeE6,
        location.longitudeE6,
        location.label,
        now
      )
    );
  }
  statements.push(
    env.DB.prepare(
      `INSERT INTO messages
         (id, place_id, body, emoji, avatar_color, avatar_variant, created_at, expires_at, author_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
         END`
    ).bind(clientHash, now, dayKey)
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
        place_kind: location.kind
      })
    },
    201
  );
}
__name(createMessage, "createMessage");
async function createReply(request, env, parentMessageId) {
  ensureJsonRequest(request);
  const payload = await readJson2(request);
  const body = normalizeMessage(payload.message);
  const emoji = normalizePostEmoji(payload.emoji);
  const clientHash = await getClientHash2(request);
  const now = unixNow2();
  const dayKey = new Date(now * 1e3).toISOString().slice(0, 10);
  const parent = await env.DB.prepare(
    `SELECT m.id, m.place_id, m.author_hash, m.expires_at, m.parent_id,
            l.latitude_e6, l.longitude_e6, l.label AS place_label,
            l.kind AS place_kind
       FROM messages AS m
       JOIN shout_locations AS l ON l.id = m.place_id
      WHERE m.id = ? AND m.expires_at > ? AND m.report_count < ?`
  ).bind(parentMessageId, now, HIDE_AFTER_REPORTS).first();
  if (!parent) throw new HTTPError(404, "This post is no longer available.");
  if (parent.parent_id) throw new HTTPError(400, "Reply to the main post instead.");
  const rate = await env.DB.prepare(
    "SELECT last_post_at, day_key, daily_count FROM rate_limits WHERE client_hash = ?"
  ).bind(clientHash).first();
  if (rate && now - Number(rate.last_post_at) < REPLY_COOLDOWN_SECONDS) {
    const retryAfter = REPLY_COOLDOWN_SECONDS - (now - Number(rate.last_post_at));
    throw new HTTPError(429, `Please wait ${retryAfter} seconds before replying again.`);
  }
  const dailyCount = rate?.day_key === dayKey ? Number(rate.daily_count) : 0;
  if (dailyCount >= DAILY_POST_LIMIT) {
    throw new HTTPError(429, "You have reached today\u2019s posting limit.");
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
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      clientHash
    ),
    env.DB.prepare(
      "UPDATE messages SET reply_count = reply_count + 1 WHERE id = ?"
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
         END`
    ).bind(clientHash, now, dayKey)
  ];
  if (parent.author_hash && parent.author_hash !== clientHash) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO notifications
           (id, recipient_hash, actor_hash, type, message_id, parent_message_id,
            created_at, expires_at)
         VALUES (?, ?, ?, 'reply', ?, ?, ?, ?)`
      ).bind(
        crypto.randomUUID(),
        parent.author_hash,
        clientHash,
        id,
        parentMessageId,
        now,
        expiresAt
      )
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
        place_kind: parent.place_kind
      })
    },
    201
  );
}
__name(createReply, "createReply");
async function listNotifications(request, env) {
  const clientHash = await getClientHash2(request);
  const now = unixNow2();
  const { results = [] } = await env.DB.prepare(
    `SELECT n.id, n.type, n.message_id, n.parent_message_id, n.created_at,
            n.read_at, m.body, m.emoji, m.place_id, l.label AS place_label,
            l.latitude_e6, l.longitude_e6, l.kind AS place_kind
       FROM notifications AS n
       LEFT JOIN messages AS m ON m.id = n.message_id
       LEFT JOIN shout_locations AS l ON l.id = m.place_id
      WHERE n.recipient_hash = ? AND n.expires_at > ?
      ORDER BY n.created_at DESC
      LIMIT 20`
  ).bind(clientHash, now).all();
  return jsonResponse(request, env, {
    unreadCount: results.filter((item) => !item.read_at).length,
    notifications: results.map((item) => ({
      id: item.id,
      type: item.type,
      messageId: item.message_id,
      parentMessageId: item.parent_message_id,
      message: item.body || "",
      emoji: item.emoji || "",
      placeId: item.place_id,
      placeLabel: item.place_label || "Pinned spot",
      location: item.place_id ? {
        placeId: item.place_id,
        label: item.place_label || "Pinned spot",
        kind: item.place_kind || "pin",
        latitude: Number(item.latitude_e6) / 1e6,
        longitude: Number(item.longitude_e6) / 1e6
      } : null,
      createdAt: new Date(Number(item.created_at) * 1e3).toISOString(),
      read: Boolean(item.read_at)
    }))
  });
}
__name(listNotifications, "listNotifications");
async function markNotificationsRead(request, env) {
  ensureJsonRequest(request);
  const clientHash = await getClientHash2(request);
  await env.DB.prepare(
    "UPDATE notifications SET read_at = ? WHERE recipient_hash = ? AND read_at IS NULL"
  ).bind(unixNow2(), clientHash).run();
  return jsonResponse(request, env, { accepted: true });
}
__name(markNotificationsRead, "markNotificationsRead");
async function reactToMessage(request, env, messageId) {
  ensureJsonRequest(request);
  const payload = await readJson2(request);
  const emoji = String(payload.emoji ?? "");
  if (!REACTION_EMOJIS.has(emoji)) {
    throw new HTTPError(400, "Choose one of the available reactions.");
  }
  const clientHash = await getClientHash2(request);
  const exists = await visibleMessageExists(env.DB, messageId);
  if (!exists) throw new HTTPError(404, "This message is no longer available.");
  const insertion = await env.DB.prepare(
    `INSERT OR IGNORE INTO reactions (message_id, client_hash, emoji, created_at)
     VALUES (?, ?, ?, ?)`
  ).bind(messageId, clientHash, emoji, unixNow2()).run();
  if (Number(insertion.meta?.changes) > 0) {
    const statements = [
      env.DB.prepare(
        "UPDATE messages SET reaction_count = reaction_count + 1 WHERE id = ?"
      ).bind(messageId)
    ];
    if (exists.author_hash && exists.author_hash !== clientHash) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO notifications
             (id, recipient_hash, actor_hash, type, message_id, parent_message_id,
              created_at, expires_at)
           VALUES (?, ?, ?, 'reaction', ?, ?, ?, ?)`
        ).bind(
          crypto.randomUUID(),
          exists.author_hash,
          clientHash,
          messageId,
          exists.parent_id || messageId,
          unixNow2(),
          Number(exists.expires_at)
        )
      );
    }
    await env.DB.batch(statements);
  }
  const message = await env.DB.prepare(
    "SELECT reaction_count FROM messages WHERE id = ?"
  ).bind(messageId).first();
  return jsonResponse(request, env, {
    accepted: Number(insertion.meta?.changes) > 0,
    reactionCount: Number(message?.reaction_count ?? 0)
  });
}
__name(reactToMessage, "reactToMessage");
async function reportMessage(request, env, messageId) {
  const clientHash = await getClientHash2(request);
  const exists = await visibleMessageExists(env.DB, messageId);
  if (!exists) throw new HTTPError(404, "This message is no longer available.");
  const insertion = await env.DB.prepare(
    `INSERT OR IGNORE INTO reports (message_id, client_hash, created_at)
     VALUES (?, ?, ?)`
  ).bind(messageId, clientHash, unixNow2()).run();
  if (Number(insertion.meta?.changes) > 0) {
    await env.DB.prepare(
      "UPDATE messages SET report_count = report_count + 1 WHERE id = ?"
    ).bind(messageId).run();
  }
  return jsonResponse(request, env, {
    accepted: Number(insertion.meta?.changes) > 0
  });
}
__name(reportMessage, "reportMessage");
async function visibleMessageExists(database, messageId) {
  return database.prepare(
    `SELECT id, author_hash, parent_id, expires_at
         FROM messages
        WHERE id = ? AND expires_at > ? AND report_count < ?`
  ).bind(messageId, unixNow2(), HIDE_AFTER_REPORTS).first();
}
__name(visibleMessageExists, "visibleMessageExists");
function normalizePlaceId(value) {
  const placeId = String(value ?? "").trim().toLowerCase();
  if (!PLACE_IDS.has(placeId) && !PIN_ID_PATTERN.test(placeId)) {
    throw new HTTPError(400, "Choose a valid Asia\u2013Pacific map location.");
  }
  return placeId;
}
__name(normalizePlaceId, "normalizePlaceId");
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
      throw new HTTPError(400, "Choose a valid Asia\u2013Pacific map location.");
    }
    const place = PLACES.find((item) => item.id === placeId);
    ensurePinNearCurrentLocation(payload.currentLocation, {
      latitude: place.latitude,
      longitude: place.longitude
    });
    return {
      id: place.id,
      label: place.label,
      kind: "preset",
      latitudeE6: Math.round(place.latitude * 1e6),
      longitudeE6: Math.round(place.longitude * 1e6)
    };
  }
  const latitude = Number(rawLocation.latitude);
  const longitude = Number(rawLocation.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new HTTPError(400, "Move the pin to a valid Asia\u2013Pacific location.");
  }
  if (latitude < ASIA_PACIFIC_BOUNDS2.south || latitude > ASIA_PACIFIC_BOUNDS2.north || longitude < ASIA_PACIFIC_BOUNDS2.west || longitude > ASIA_PACIFIC_BOUNDS2.east) {
    throw new HTTPError(400, "Pins are currently available within Asia and Australia only.");
  }
  ensurePinNearCurrentLocation(payload.currentLocation, { latitude, longitude });
  const nearestPlace = PLACES.map((place) => ({
    place,
    distance: distanceKm(latitude, longitude, place.latitude, place.longitude)
  })).sort((a, b) => a.distance - b.distance)[0];
  if (nearestPlace?.distance <= 0.075) {
    return {
      id: nearestPlace.place.id,
      label: nearestPlace.place.label,
      kind: "preset",
      latitudeE6: Math.round(nearestPlace.place.latitude * 1e6),
      longitudeE6: Math.round(nearestPlace.place.longitude * 1e6)
    };
  }
  const latitudeE6 = snapCoordinate(latitude);
  const longitudeE6 = snapCoordinate(longitude);
  const id = `pin:${latitudeE6}:${longitudeE6}`;
  const existing = await database.prepare("SELECT label FROM shout_locations WHERE id = ?").bind(id).first();
  return {
    id,
    label: existing?.label || "Pinned spot",
    kind: "pin",
    latitudeE6,
    longitudeE6,
    createdAt: now
  };
}
__name(resolvePostLocation, "resolvePostLocation");
function ensurePinNearCurrentLocation(rawCurrentLocation, pinLocation) {
  const currentLatitude = Number(rawCurrentLocation?.latitude);
  const currentLongitude = Number(rawCurrentLocation?.longitude);
  if (!Number.isFinite(currentLatitude) || !Number.isFinite(currentLongitude)) {
    throw new HTTPError(
      400,
      "Share your current location before choosing where to post.",
      "current_location_required"
    );
  }
  if (currentLatitude < ASIA_PACIFIC_BOUNDS2.south || currentLatitude > ASIA_PACIFIC_BOUNDS2.north || currentLongitude < ASIA_PACIFIC_BOUNDS2.west || currentLongitude > ASIA_PACIFIC_BOUNDS2.east) {
    throw new HTTPError(400, "Posting is currently available within Asia and Australia only.");
  }
  const pinDistance = distanceKm(
    currentLatitude,
    currentLongitude,
    pinLocation.latitude,
    pinLocation.longitude
  );
  if (pinDistance > MAX_POST_DISTANCE_KM) {
    throw new HTTPError(
      422,
      "Choose a pin within 1 km of your current location.",
      "pin_out_of_range"
    );
  }
}
__name(ensurePinNearCurrentLocation, "ensurePinNearCurrentLocation");
function normalizeMapBounds(url) {
  const readCoordinate = /* @__PURE__ */ __name((name, fallback) => {
    const rawValue = url.searchParams.get(name);
    if (rawValue === null || rawValue === "") return fallback;
    const value = Number(rawValue);
    if (!Number.isFinite(value)) throw new HTTPError(400, "Use valid map bounds.");
    return value;
  }, "readCoordinate");
  const west = Math.max(ASIA_PACIFIC_BOUNDS2.west, readCoordinate("west", ASIA_PACIFIC_BOUNDS2.west));
  const south = Math.max(ASIA_PACIFIC_BOUNDS2.south, readCoordinate("south", ASIA_PACIFIC_BOUNDS2.south));
  const east = Math.min(ASIA_PACIFIC_BOUNDS2.east, readCoordinate("east", ASIA_PACIFIC_BOUNDS2.east));
  const north = Math.min(ASIA_PACIFIC_BOUNDS2.north, readCoordinate("north", ASIA_PACIFIC_BOUNDS2.north));
  if (west >= east || south >= north) throw new HTTPError(400, "Use valid Asia\u2013Pacific map bounds.");
  return {
    westE6: Math.round(west * 1e6),
    southE6: Math.round(south * 1e6),
    eastE6: Math.round(east * 1e6),
    northE6: Math.round(north * 1e6)
  };
}
__name(normalizeMapBounds, "normalizeMapBounds");
function normalizeMessage(value) {
  const body = String(value ?? "").normalize("NFKC").replace(FORMAT_CONTROL_PATTERN2, "").replace(/\s+/g, " ").trim();
  if (!body) throw new HTTPError(400, "Write a short message first.");
  if ([...body].length > MAX_MESSAGE_LENGTH) {
    throw new HTTPError(400, `Keep the message under ${MAX_MESSAGE_LENGTH} characters.`);
  }
  const safetyText = createSafetyText(body);
  if (LINK_SCHEME_PATTERN.test(safetyText) || DOMAIN_PATTERN.test(safetyText) || IP_ADDRESS_PATTERN.test(safetyText) || EMAIL_PATTERN2.test(safetyText) || PHONE_PATTERN.test(safetyText) || SOCIAL_CONTACT_PATTERN.test(safetyText)) {
    throw new HTTPError(
      422,
      "Links and contact details cannot be posted.",
      "prohibited_contact"
    );
  }
  if (SELF_HARM_PATTERN.test(safetyText)) {
    throw new HTTPError(
      422,
      "This cannot be posted here. If anyone is in immediate danger call 000; Lifeline 13 11 14.",
      "crisis_content"
    );
  }
  if (DANGEROUS_PATTERNS.some((pattern) => pattern.test(safetyText))) {
    throw new HTTPError(
      422,
      "This cannot be posted because it may describe threats, harm, weapons, or illegal activity.",
      "unsafe_content"
    );
  }
  return body;
}
__name(normalizeMessage, "normalizeMessage");
function createSafetyText(value) {
  return value.normalize("NFKC").replace(FORMAT_CONTROL_PATTERN2, "").replace(/[。．｡]/g, ".").replace(/(?:\[|\()\s*dot\s*(?:\]|\))/gi, ".").replace(/(?:\[|\()\s*at\s*(?:\]|\))/gi, "@").replace(/\s+dot\s+/gi, ".").toLowerCase();
}
__name(createSafetyText, "createSafetyText");
function snapCoordinate(value) {
  return Math.round(value * 1e6 / PIN_GRID_E6) * PIN_GRID_E6;
}
__name(snapCoordinate, "snapCoordinate");
function normalizePostEmoji(value) {
  const emoji = String(value ?? "");
  if (!ALLOWED_EMOJIS.has(emoji)) throw new HTTPError(400, "Choose an available emoji.");
  return emoji;
}
__name(normalizePostEmoji, "normalizePostEmoji");
function ensureJsonRequest(request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2048) throw new HTTPError(413, "Request is too large.");
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    throw new HTTPError(415, "Send JSON content.");
  }
}
__name(ensureJsonRequest, "ensureJsonRequest");
async function readJson2(request) {
  try {
    return await request.json();
  } catch {
    throw new HTTPError(400, "Invalid request data.");
  }
}
__name(readJson2, "readJson");
async function getClientHash2(request) {
  const token = request.headers.get("x-shout-client") ?? "";
  if (!CLIENT_TOKEN_PATTERN2.test(token)) {
    throw new HTTPError(400, "This device needs a valid anonymous session.");
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(getClientHash2, "getClientHash");
async function cleanExpiredData(database) {
  const now = unixNow2();
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
          )`
    )
  ]);
}
__name(cleanExpiredData, "cleanExpiredData");
function serializeMessage(row) {
  return {
    id: row.id,
    placeId: row.place_id,
    message: row.body,
    emoji: row.emoji || "",
    avatarColor: row.avatar_color,
    avatarVariant: Number(row.avatar_variant ?? 0),
    createdAt: new Date(Number(row.created_at) * 1e3).toISOString(),
    expiresAt: new Date(Number(row.expires_at) * 1e3).toISOString(),
    reactionCount: Number(row.reaction_count ?? 0),
    replyCount: Number(row.reply_count ?? 0),
    parentId: row.parent_id || null,
    location: serializeLocation(row)
  };
}
__name(serializeMessage, "serializeMessage");
function serializeLocation(row) {
  return {
    placeId: row.place_id,
    label: row.place_label || "Pinned spot",
    kind: row.place_kind || (PIN_ID_PATTERN.test(row.place_id) ? "pin" : "preset"),
    latitude: Number(row.latitude_e6) / 1e6,
    longitude: Number(row.longitude_e6) / 1e6
  };
}
__name(serializeLocation, "serializeLocation");
function isOriginAllowed(request, env) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const configured = String(env.ALLOWED_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (configured.includes(origin)) return true;
  try {
    const parsed = new URL(origin);
    const isLocal = parsed.protocol === "http:" && (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost");
    const isVercelPreview = parsed.protocol === "https:" && parsed.hostname.endsWith(".vercel.app");
    return isLocal || isVercelPreview;
  } catch {
    return false;
  }
}
__name(isOriginAllowed, "isOriginAllowed");
function corsHeaders(request, env) {
  const origin = request.headers.get("origin");
  const headers = new Headers({
    "Access-Control-Allow-Headers": "Content-Type, X-Shout-Client",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff"
  });
  if (origin && isOriginAllowed(request, env)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  return headers;
}
__name(corsHeaders, "corsHeaders");
function jsonResponse(request, env, payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders(request, env)
  });
}
__name(jsonResponse, "jsonResponse");
function unixNow2() {
  return Math.floor(Date.now() / 1e3);
}
__name(unixNow2, "unixNow");
function distanceKm(latitude, longitude, targetLatitude, targetLongitude) {
  const toRadians = /* @__PURE__ */ __name((number) => number * Math.PI / 180, "toRadians");
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(targetLatitude - latitude);
  const longitudeDelta = toRadians(targetLongitude - longitude);
  const startLatitude = toRadians(latitude);
  const endLatitude = toRadians(targetLatitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
__name(distanceKm, "distanceKm");

// ../../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-2p6Mfo/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-2p6Mfo/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
