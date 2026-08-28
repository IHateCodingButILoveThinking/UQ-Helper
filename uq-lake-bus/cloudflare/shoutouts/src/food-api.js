const FOOD_TYPES = new Set([
  "dish",
  "drink",
  "snack",
  "restaurant_find",
  "market",
  "cafe",
  "dessert",
  "deal",
  "other",
]);
const CUISINES = new Set([
  "Chinese",
  "Singaporean",
  "Australian",
  "Japanese",
  "Korean",
  "Malaysian",
  "Indonesian",
  "Other",
]);
const VIBE_TAGS = new Set([
  "study-friendly",
  "quick-grab",
  "group-friendly",
  "quiet",
  "lively",
  "late-night",
  "takeaway-friendly",
  "date-friendly",
  "solo-friendly",
  "outdoor-seating",
]);
const REPORT_REASONS = new Set([
  "spam",
  "wrong_location",
  "not_food",
  "inappropriate",
  "duplicate",
  "other",
]);
const COMMENT_TONES = new Set(["loved_it", "helpful", "needs_update"]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const CLIENT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_IMAGE_BYTES = 1_500_000;
const MAX_IMAGES_PER_SHOUT = 3;
const MAX_UPLOADS_PER_DAY = 300;
const MAX_UPLOAD_BYTES_PER_DAY = 250 * 1024 * 1024;
const MAX_NETWORK_UPLOADS_PER_DAY = 900;
const MAX_NETWORK_UPLOAD_BYTES_PER_DAY = 750 * 1024 * 1024;
const MAX_NETWORK_WRITES_PER_DAY = 600;
const DEFAULT_STORAGE_LIMIT_BYTES = 8 * 1024 * 1024 * 1024;
const FOOD_XP_BASE = 20;
const FOOD_XP_NEW_AREA = 10;
const FOOD_XP_TRAIL = 5;
const FOOD_XP_FIRST_ENGAGEMENT = 50;
const FOOD_XP_DAILY_POST_LIMIT = 5;
const FOOD_XP_DAILY_CAP = 120;
const FOOD_XP_MAX_BONUS = 100_000;
const ASIA_PACIFIC_BOUNDS = { south: -90, north: 90, west: -180, east: 180 };
const FORMAT_CONTROL_PATTERN = /[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g;
const LINK_PATTERN = /\b(?:https?|hxxps?|ftp):\/\/|\bwww\s*\.|\b[a-z0-9][a-z0-9-]*\s*\.\s*(?:com|net|org|io|app|dev|xyz|info|co|me|gg|ai|site|online|link)\b/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const DANGEROUS_PATTERN = /\b(?:i|we|you|they|let(?:'s|s)|will|going\s+to)\b(?:\W+\w+){0,4}\W+\b(?:kill|murder|shoot|stab|bomb|attack|poison|kidnap|rape|assault|set\s+fire)\b/i;

class FoodError extends Error {
  constructor(status, message, code = "food_request_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function handleFoodRequest({ request, env, ctx, url, path, respond }) {
  if (request.method === "GET" && path.startsWith("/api/images/")) {
    return getFoodImage(request, env, path);
  }

  if (request.method === "POST" && path === "/api/uploads") {
    return uploadFoodImage(request, env, respond);
  }

  if (request.method === "GET" && path === "/api/places/search") {
    return searchFoodPlaces(request, env, url, respond);
  }
  if (request.method === "GET" && path === "/api/places/reverse") {
    return reverseFoodPlace(request, env, url, respond);
  }
  if (request.method === "GET" && path === "/api/profile/progress") {
    return getFoodProfileProgress(request, env, url, respond);
  }
  if (request.method === "GET" && path === "/api/profile/footprint") {
    return getFoodFootprint(request, env, respond);
  }

  if (request.method === "GET" && path === "/api/collections") {
    return listFoodCollections(request, env, respond);
  }
  if (request.method === "POST" && path === "/api/collections") {
    return createFoodCollection(request, env, respond);
  }
  const collectionMatch = path.match(/^\/api\/collections\/([0-9a-f-]{36})\/items$/i);
  if (collectionMatch && request.method === "POST") {
    return addFoodCollectionItem(request, env, collectionMatch[1], respond);
  }
  const collectionItemMatch = path.match(/^\/api\/collections\/([0-9a-f-]{36})\/items\/([0-9a-f-]{36})$/i);
  if (collectionItemMatch && request.method === "DELETE") {
    return removeFoodCollectionItem(request, env, collectionItemMatch[1], collectionItemMatch[2], respond);
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
  if (detailMatch && request.method === "PATCH") {
    return updateFoodShout(request, env, detailMatch[1], respond);
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

  const ratingMatch = path.match(/^\/api\/shouts\/([0-9a-f-]{36})\/rating$/i);
  if (ratingMatch && request.method === "POST") {
    return rateFoodShout(request, env, ratingMatch[1], respond);
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

async function uploadFoodImage(request, env, respond) {
  if (!env.FOOD_IMAGES) {
    throw new FoodError(503, "Image storage is not configured yet.", "image_storage_unavailable");
  }
  const clientHash = await getClientHash(request);
  const networkHash = await getNetworkHash(request);
  await enforceFoodAbuseShield(env.DB, clientHash, networkHash, unixNow());
  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new FoodError(400, "Choose one food photo first.");
  }
  if (!IMAGE_TYPES.has(file.type)) {
    throw new FoodError(415, "Upload a JPEG, PNG, or WebP image.");
  }
  if (!Number.isFinite(file.size) || file.size < 1 || file.size > MAX_IMAGE_BYTES) {
    throw new FoodError(413, "Keep the compressed photo under 1.5 MB.");
  }
  await enforceFoodUploadLimit(env.DB, clientHash, networkHash, file.size, unixNow());
  const width = optionalInteger(form.get("width"), 1, 4096);
  const height = optionalInteger(form.get("height"), 1, 4096);
  const postId = UUID_PATTERN.test(String(form.get("postId") ?? ""))
    ? String(form.get("postId"))
    : crypto.randomUUID();
  const bytes = await file.arrayBuffer();
  const detectedType = sniffImageMime(new Uint8Array(bytes));
  if (!detectedType || detectedType !== file.type) {
    throw new FoodError(415, "The uploaded file is not a valid JPEG, PNG, or WebP image.");
  }
  const extension = detectedType === "image/webp" ? "webp" : detectedType === "image/png" ? "png" : "jpg";
  const objectKey = `food-shouts/${clientHash.slice(0, 16)}/${postId}/${crypto.randomUUID()}.${extension}`;
  const now = unixNow();
  const storage = await reserveFoodStorage(env.DB, file.size, env.FOOD_STORAGE_LIMIT_BYTES, now);
  try {
    await env.FOOD_IMAGES.put(objectKey, bytes, {
      httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { width: String(width ?? ""), height: String(height ?? "") },
    });
    await env.DB.prepare(
      `INSERT INTO food_uploads
         (object_key, author_hash, mime_type, byte_size, width, height, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(objectKey, clientHash, detectedType, file.size, width, height, now, now + 60 * 60)
      .run();
  } catch (error) {
    await env.FOOD_IMAGES.delete(objectKey);
    await releaseFoodStorage(env.DB, file.size, now);
    throw error;
  }
  return respond({ objectKey, width, height, byteSize: file.size, mimeType: detectedType, storage }, 201);
}

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

async function createFoodShout(request, env, respond) {
  const payload = await readJson(request);
  const clientHash = await getClientHash(request);
  const networkHash = await getNetworkHash(request);
  await enforceFoodAbuseShield(env.DB, clientHash, networkHash, unixNow());
  const id = crypto.randomUUID();
  const title = normalizeFoodText(payload.title, "title", 80, true);
  const displayName = normalizeFoodText(payload.displayName, "display name", 24, false) || "Food explorer";
  const caption = normalizeFoodText(payload.caption, "caption", 280, false);
  const locationLabel = normalizeFoodText(payload.locationLabel, "location", 120, true);
  const placeName = normalizeFoodText(payload.placeName, "place name", 100, false) || null;
  const cuisine = CUISINES.has(payload.cuisine) ? payload.cuisine : "Other";
  const shoutType = String(payload.shoutType ?? "other");
  if (!FOOD_TYPES.has(shoutType)) throw new FoodError(400, "Choose a valid food type.");
  const latitude = finiteCoordinate(payload.latitude, ASIA_PACIFIC_BOUNDS.south, ASIA_PACIFIC_BOUNDS.north, "latitude");
  const longitude = finiteCoordinate(payload.longitude, ASIA_PACIFIC_BOUNDS.west, ASIA_PACIFIC_BOUNDS.east, "longitude");
  const imageKeys = normalizeImageKeys(payload.imageKeys ?? (payload.imageKey ? [payload.imageKey] : []));
  const vibes = normalizeVibes(payload.vibeTags);
  const priceText = normalizeFoodText(payload.priceText, "price", 40, false) || null;
  const priceNumeric = parsePrice(priceText);
  const expiresAt = null;
  const provider = normalizeToken(payload.provider, 30);
  const providerPlaceId = normalizeToken(payload.providerPlaceId, 160);
  const now = unixNow();

  await enforceNetworkWriteLimit(env.DB, networkHash, clientHash, now);
  const duplicate = await env.DB.prepare(
    `SELECT id FROM food_shouts
      WHERE author_hash = ? AND status = 'active' AND lower(title) = lower(?)
        AND latitude_e6 BETWEEN ? AND ? AND longitude_e6 BETWEEN ? AND ?
        AND created_at >= ?
      LIMIT 1`,
  ).bind(
    clientHash,
    title,
    Math.round(latitude * 1_000_000) - 250,
    Math.round(latitude * 1_000_000) + 250,
    Math.round(longitude * 1_000_000) - 250,
    Math.round(longitude * 1_000_000) + 250,
    now - 24 * 60 * 60,
  ).first();
  if (duplicate) {
    await logFoodAbuse(env.DB, clientHash, networkHash, "duplicate_post", now);
    throw new FoodError(409, "This food find was already posted here today.", "duplicate_post");
  }

  const placeholders = imageKeys.map(() => "?").join(", ");
  const { results: uploads = [] } = await env.DB.prepare(
    `SELECT object_key, mime_type, width, height
       FROM food_uploads
      WHERE object_key IN (${placeholders}) AND author_hash = ?
        AND claimed_at IS NULL AND expires_at > ?`,
  )
    .bind(...imageKeys, clientHash, now)
    .all();
  if (uploads.length !== imageKeys.length) {
    throw new FoodError(400, "Upload between one and three valid food photos before publishing.");
  }
  const uploadsByKey = new Map(uploads.map((upload) => [upload.object_key, upload]));
  const orderedUploads = imageKeys.map((key) => uploadsByKey.get(key));
  const upload = orderedUploads[0];
  const imageKey = upload.object_key;

  await enforceFoodRateLimit(env.DB, clientHash, now);
  const venueAnchorId = await resolveVenueAnchor(env.DB, {
    placeName,
    provider,
    providerPlaceId,
    latitude,
    longitude,
    now,
  });

  const row = {
    id,
    author_hash: clientHash,
    display_name: displayName,
    title,
    caption,
    latitude_e6: Math.round(latitude * 1_000_000),
    longitude_e6: Math.round(longitude * 1_000_000),
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
    status: "active",
  };

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO food_shouts
         (id, author_hash, display_name, title, caption, latitude_e6, longitude_e6,
          location_label, place_name, provider, provider_place_id, cuisine,
          shout_type, price_text, price_numeric, vibe_tags_json, geohash,
          image_key, image_mime, image_width, image_height, venue_anchor_id,
          created_at, updated_at, expires_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    ).bind(
      row.id, row.author_hash, row.display_name, row.title, row.caption, row.latitude_e6,
      row.longitude_e6, row.location_label, row.place_name, row.provider,
      row.provider_place_id, row.cuisine, row.shout_type, row.price_text,
      row.price_numeric, row.vibe_tags_json, row.geohash, row.image_key,
      row.image_mime, row.image_width, row.image_height, row.venue_anchor_id,
      row.created_at, row.updated_at, row.expires_at,
    ),
    ...orderedUploads.map((item, index) => env.DB.prepare(
      `INSERT INTO food_shout_images
         (shout_id, object_key, sort_order, mime_type, width, height)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(id, item.object_key, index, item.mime_type, item.width, item.height)),
    ...orderedUploads.map((item) => env.DB.prepare(
      "UPDATE food_uploads SET claimed_at = ? WHERE object_key = ? AND claimed_at IS NULL",
    ).bind(now, item.object_key)),
  ]);
  const created = await env.DB.prepare(`${foodSelectSql()} WHERE s.id = ? LIMIT 1`)
    .bind(clientHash, clientHash, clientHash, id)
    .first();
  return respond({ shout: serializeFoodShout(created, request, clientHash) }, 201);
}

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
    "s.longitude_e6 BETWEEN ? AND ?",
  ];
  const bindings = [clientHash, clientHash, clientHash, now, bounds.southE6, bounds.northE6, bounds.westE6, bounds.eastE6];
  if (cuisine && CUISINES.has(cuisine)) {
    clauses.push("s.cuisine = ?");
    bindings.push(cuisine);
  }
  if (type === "meal") {
    clauses.push("s.shout_type IN ('dish', 'restaurant_find')");
  } else if (type === "snack") {
    clauses.push("s.shout_type IN ('snack', 'dessert', 'cafe')");
  } else if (type && FOOD_TYPES.has(type)) {
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
      LIMIT ?`,
  )
    .bind(...bindings, limit)
    .all();
  return respond({ generatedAt: new Date(now * 1000).toISOString(), shouts: results.map((row) => serializeFoodShout(row, request, clientHash)) });
}

async function getFoodShout(request, env, id, respond) {
  const clientHash = await getClientHash(request);
  const row = await env.DB.prepare(`${foodSelectSql()} WHERE s.id = ? LIMIT 1`)
    .bind(clientHash, clientHash, clientHash, id)
    .first();
  if (!row || row.status === "deleted") throw new FoodError(404, "Food Shout not found.");
  return respond({ shout: serializeFoodShout(row, request, clientHash) });
}

async function deleteFoodShout(request, env, id, respond) {
  const clientHash = await getClientHash(request);
  const owned = await env.DB.prepare(
    "SELECT id FROM food_shouts WHERE id = ? AND author_hash = ? AND status = 'active'",
  ).bind(id, clientHash).first();
  if (!owned) throw new FoodError(404, "Food Shout not found or not owned by this device.");

  const imageRows = await env.DB.prepare(
    `SELECT i.object_key, COALESCE(u.byte_size, 0) AS byte_size
       FROM food_shout_images AS i
       LEFT JOIN food_uploads AS u ON u.object_key = i.object_key
      WHERE i.shout_id = ?`,
  ).bind(id).all();
  const images = imageRows.results || [];
  const keys = images.map((image) => String(image.object_key)).filter(Boolean);
  const releasedBytes = images.reduce((total, image) => total + Number(image.byte_size || 0), 0);

  const result = await env.DB.prepare(
    "UPDATE food_shouts SET status = 'deleted', updated_at = ? WHERE id = ? AND author_hash = ? AND status = 'active'",
  )
    .bind(unixNow(), id, clientHash)
    .run();
  if (!Number(result.meta?.changes)) throw new FoodError(404, "Food Shout not found or not owned by this device.");

  if (keys.length && env.FOOD_IMAGES) {
    try {
      await env.FOOD_IMAGES.delete(keys);
      const placeholders = keys.map(() => "?").join(", ");
      await env.DB.prepare(`DELETE FROM food_uploads WHERE object_key IN (${placeholders})`).bind(...keys).run();
      await env.DB.prepare("DELETE FROM food_shout_images WHERE shout_id = ?").bind(id).run();
      if (releasedBytes > 0) await releaseFoodStorage(env.DB, releasedBytes, unixNow());
    } catch {
      // The post stays deleted. Retaining the storage count is safer than undercounting a failed object deletion.
    }
  }
  return respond({ accepted: true, imagesRemoved: keys.length });
}

async function updateFoodShout(request, env, id, respond) {
  const payload = await readJson(request);
  const clientHash = await getClientHash(request);
  const owned = await env.DB.prepare(
    "SELECT id FROM food_shouts WHERE id = ? AND author_hash = ? AND status = 'active'",
  ).bind(id, clientHash).first();
  if (!owned) throw new FoodError(404, "Food Shout not found or not owned by this device.");
  const title = normalizeFoodText(payload.title, "title", 80, true);
  const caption = normalizeFoodText(payload.caption, "caption", 280, false);
  const displayName = normalizeFoodText(payload.displayName, "display name", 24, false) || "Food explorer";
  const priceText = normalizeFoodText(payload.priceText, "price", 40, false) || null;
  const cuisine = CUISINES.has(payload.cuisine) ? payload.cuisine : "Other";
  const shoutType = String(payload.shoutType ?? "other");
  if (!FOOD_TYPES.has(shoutType)) throw new FoodError(400, "Choose a valid food type.");
  const vibes = normalizeVibes(payload.vibeTags);
  const hasLocationUpdate = payload.latitude !== undefined || payload.longitude !== undefined;
  const latitude = hasLocationUpdate ? finiteCoordinate(payload.latitude, ASIA_PACIFIC_BOUNDS.south, ASIA_PACIFIC_BOUNDS.north, "latitude") : null;
  const longitude = hasLocationUpdate ? finiteCoordinate(payload.longitude, ASIA_PACIFIC_BOUNDS.west, ASIA_PACIFIC_BOUNDS.east, "longitude") : null;
  const locationLabel = hasLocationUpdate ? normalizeFoodText(payload.locationLabel, "location", 120, true) : null;
  const placeName = hasLocationUpdate ? normalizeFoodText(payload.placeName, "place name", 100, false) || null : null;
  const provider = hasLocationUpdate ? normalizeToken(payload.provider, 30) : null;
  const providerPlaceId = hasLocationUpdate ? normalizeToken(payload.providerPlaceId, 160) : null;
  const now = unixNow();
  const venueAnchorId = hasLocationUpdate ? await resolveVenueAnchor(env.DB, { placeName, provider, providerPlaceId, latitude, longitude, now }) : null;
  const result = await env.DB.prepare(
    `UPDATE food_shouts
        SET title = ?, caption = ?, display_name = ?, price_text = ?, price_numeric = ?,
            cuisine = ?, shout_type = ?, vibe_tags_json = ?,
            latitude_e6 = CASE WHEN ? = 1 THEN ? ELSE latitude_e6 END,
            longitude_e6 = CASE WHEN ? = 1 THEN ? ELSE longitude_e6 END,
            location_label = CASE WHEN ? = 1 THEN ? ELSE location_label END,
            place_name = CASE WHEN ? = 1 THEN ? ELSE place_name END,
            provider = CASE WHEN ? = 1 THEN ? ELSE provider END,
            provider_place_id = CASE WHEN ? = 1 THEN ? ELSE provider_place_id END,
            venue_anchor_id = CASE WHEN ? = 1 THEN ? ELSE venue_anchor_id END,
            geohash = CASE WHEN ? = 1 THEN ? ELSE geohash END,
            updated_at = ?
      WHERE id = ? AND author_hash = ? AND status = 'active'`,
  ).bind(
    title, caption, displayName, priceText, parsePrice(priceText), cuisine,
    shoutType, JSON.stringify(vibes),
    hasLocationUpdate ? 1 : 0, hasLocationUpdate ? Math.round(latitude * 1_000_000) : null,
    hasLocationUpdate ? 1 : 0, hasLocationUpdate ? Math.round(longitude * 1_000_000) : null,
    hasLocationUpdate ? 1 : 0, locationLabel,
    hasLocationUpdate ? 1 : 0, placeName,
    hasLocationUpdate ? 1 : 0, provider,
    hasLocationUpdate ? 1 : 0, providerPlaceId,
    hasLocationUpdate ? 1 : 0, venueAnchorId,
    hasLocationUpdate ? 1 : 0, hasLocationUpdate ? encodeGeohash(latitude, longitude, 7) : null,
    now, id, clientHash,
  ).run();
  if (!Number(result.meta?.changes)) {
    throw new FoodError(404, "Food Shout not found or not owned by this device.");
  }
  const row = await env.DB.prepare(`${foodSelectSql()} WHERE s.id = ? LIMIT 1`)
    .bind(clientHash, clientHash, clientHash, id)
    .first();
  return respond({ shout: serializeFoodShout(row, request, clientHash) });
}

function foodSelectSql() {
  return `SELECT s.*,
      EXISTS(SELECT 1 FROM food_reactions r WHERE r.shout_id = s.id AND r.client_hash = ? AND r.kind = 'like') AS viewer_liked,
      EXISTS(SELECT 1 FROM food_reactions r WHERE r.shout_id = s.id AND r.client_hash = ? AND r.kind = 'save') AS viewer_saved,
      (SELECT COUNT(*) FROM food_ratings fr WHERE fr.shout_id = s.id) AS rating_count,
      (SELECT AVG(fr.rating_x2) / 2.0 FROM food_ratings fr WHERE fr.shout_id = s.id) AS rating_average,
      (SELECT fr.rating_x2 / 2.0 FROM food_ratings fr WHERE fr.shout_id = s.id AND fr.client_hash = ?) AS viewer_rating,
      (SELECT json_group_array(json_object(
          'objectKey', ordered.object_key,
          'width', ordered.width,
          'height', ordered.height
        ))
        FROM (
          SELECT object_key, width, height
            FROM food_shout_images
           WHERE shout_id = s.id
           ORDER BY sort_order
        ) AS ordered) AS images_json,
      COALESCE(author_stats.post_count, 0) AS author_post_count,
      COALESCE(author_stats.area_count, 0) AS author_area_count,
      COALESCE(author_rewards.engagement_xp, 0) AS author_engagement_xp,
      COALESCE(author_override.xp_bonus, 0) AS author_xp_bonus
    FROM food_shouts AS s
    LEFT JOIN (
      SELECT author_hash, COUNT(*) AS post_count, COUNT(DISTINCT substr(geohash, 1, 6)) AS area_count
        FROM food_shouts
       WHERE status = 'active'
       GROUP BY author_hash
    ) AS author_stats ON author_stats.author_hash = s.author_hash
    LEFT JOIN (
      SELECT author_hash, SUM(xp) AS engagement_xp
        FROM food_engagement_rewards
       GROUP BY author_hash
    ) AS author_rewards ON author_rewards.author_hash = s.author_hash
    LEFT JOIN food_profile_overrides AS author_override ON author_override.author_hash = s.author_hash`;
}

async function listFoodComments(request, env, shoutId, respond) {
  await requireActiveShout(env.DB, shoutId);
  const clientHash = await getClientHash(request);
  const { results = [] } = await env.DB.prepare(
    `SELECT id, shout_id, display_name, tone, parent_comment_id, body, created_at, status,
            author_hash = ? AS viewer_owned
       FROM food_comments
      WHERE shout_id = ? AND status = 'active'
      ORDER BY CASE WHEN parent_comment_id IS NULL THEN created_at ELSE 0 END DESC,
               parent_comment_id, created_at ASC`,
  )
    .bind(clientHash, shoutId)
    .all();
  return respond({ comments: results.map(serializeFoodComment) });
}

async function createFoodComment(request, env, shoutId, respond) {
  const payload = await readJson(request);
  const clientHash = await getClientHash(request);
  const networkHash = await getNetworkHash(request);
  await enforceFoodAbuseShield(env.DB, clientHash, networkHash, unixNow());
  const body = normalizeFoodText(payload.body, "comment", 160, true);
  const displayName = normalizeFoodText(payload.displayName, "display name", 24, false) || "Food explorer";
  const tone = COMMENT_TONES.has(payload.tone) ? payload.tone : "helpful";
  const parentId = payload.parentCommentId ? String(payload.parentCommentId) : null;
  const shout = await requireActiveShout(env.DB, shoutId);
  let notificationRecipient = shout.author_hash;
  if (parentId) {
    const parent = await env.DB.prepare(
      "SELECT id, author_hash, parent_comment_id FROM food_comments WHERE id = ? AND shout_id = ? AND status = 'active'",
    )
      .bind(parentId, shoutId)
      .first();
    if (!parent) throw new FoodError(404, "Comment not found.");
    if (parent.parent_comment_id) throw new FoodError(400, "Reply to the main comment instead.");
    notificationRecipient = parent.author_hash;
  }
  const now = unixNow();
  await enforceNetworkWriteLimit(env.DB, networkHash, clientHash, now);
  await enforceFoodRateLimit(env.DB, clientHash, now, 5);
  const id = crypto.randomUUID();
  const previousComment = await env.DB.prepare(
    "SELECT id FROM food_comments WHERE author_hash = ? LIMIT 1",
  ).bind(clientHash).first();
  const operations = [
    env.DB.prepare(
      `INSERT INTO food_comments
         (id, shout_id, author_hash, display_name, tone, parent_comment_id, body, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    ).bind(id, shoutId, clientHash, displayName, tone, parentId, body, now),
    env.DB.prepare("UPDATE food_shouts SET comment_count = comment_count + 1, updated_at = ? WHERE id = ?")
      .bind(now, shoutId),
  ];
  if (!previousComment) operations.push(env.DB.prepare(
    "INSERT OR IGNORE INTO food_engagement_rewards (author_hash, reward_type, xp, created_at) VALUES (?, 'first_comment', ?, ?)",
  ).bind(clientHash, FOOD_XP_FIRST_ENGAGEMENT, now));
  const outcomes = await env.DB.batch(operations);
  const earnedXp = previousComment ? 0 : Number(outcomes.at(-1)?.meta?.changes || 0) * FOOD_XP_FIRST_ENGAGEMENT;

  if (notificationRecipient && notificationRecipient !== clientHash) {
    await env.DB.prepare(
      `INSERT INTO notifications
         (id, recipient_hash, actor_hash, type, message_id, parent_message_id, created_at, expires_at)
       VALUES (?, ?, ?, 'reply', ?, ?, ?, ?)`,
    )
      .bind(crypto.randomUUID(), notificationRecipient, clientHash, id, shoutId, now, shout.expires_at ?? now + 30 * 24 * 60 * 60)
      .run();
  }
  return respond({ comment: serializeFoodComment({ id, shout_id: shoutId, display_name: displayName, tone, parent_comment_id: parentId, body, created_at: now, viewer_owned: 1 }), earnedXp }, 201);
}

async function deleteFoodComment(request, env, commentId, respond) {
  const clientHash = await getClientHash(request);
  const comment = await env.DB.prepare(
    "SELECT id, shout_id FROM food_comments WHERE id = ? AND author_hash = ? AND status = 'active'",
  )
    .bind(commentId, clientHash)
    .first();
  if (!comment) throw new FoodError(404, "Comment not found or not owned by this device.");
  await env.DB.batch([
    env.DB.prepare("UPDATE food_comments SET status = 'deleted' WHERE id = ?").bind(commentId),
    env.DB.prepare("UPDATE food_shouts SET comment_count = MAX(0, comment_count - 1), updated_at = ? WHERE id = ?")
      .bind(unixNow(), comment.shout_id),
  ]);
  return respond({ accepted: true });
}

async function toggleFoodReaction(request, env, shoutId, kind, respond) {
  await requireActiveShout(env.DB, shoutId);
  const clientHash = await getClientHash(request);
  const countColumn = kind === "like" ? "like_count" : "save_count";
  let active;
  if (request.method === "POST") {
    const insertion = await env.DB.prepare(
      "INSERT OR IGNORE INTO food_reactions (shout_id, client_hash, kind, created_at) VALUES (?, ?, ?, ?)",
    )
      .bind(shoutId, clientHash, kind, unixNow())
      .run();
    active = true;
    if (Number(insertion.meta?.changes)) {
      await env.DB.prepare(`UPDATE food_shouts SET ${countColumn} = ${countColumn} + 1 WHERE id = ?`).bind(shoutId).run();
    }
  } else {
    const deletion = await env.DB.prepare(
      "DELETE FROM food_reactions WHERE shout_id = ? AND client_hash = ? AND kind = ?",
    )
      .bind(shoutId, clientHash, kind)
      .run();
    active = false;
    if (Number(deletion.meta?.changes)) {
      await env.DB.prepare(`UPDATE food_shouts SET ${countColumn} = MAX(0, ${countColumn} - 1) WHERE id = ?`).bind(shoutId).run();
    }
  }
  const row = await env.DB.prepare(`SELECT ${countColumn} AS total FROM food_shouts WHERE id = ?`).bind(shoutId).first();
  return respond({ active, count: Number(row?.total ?? 0) });
}

async function rateFoodShout(request, env, shoutId, respond) {
  const shout = await requireActiveShout(env.DB, shoutId);
  const payload = await readJson(request);
  const rating = Number(payload.rating);
  const ratingX2 = Math.round(rating * 2);
  if (!Number.isFinite(rating) || rating < .5 || rating > 5 || Math.abs(ratingX2 / 2 - rating) > .001) {
    throw new FoodError(400, "Choose a rating from 0.5 to 5 stars.");
  }
  const clientHash = await getClientHash(request);
  const now = unixNow();
  const previousRating = await env.DB.prepare(
    "SELECT rating_x2 FROM food_ratings WHERE shout_id = ? AND client_hash = ?",
  ).bind(shoutId, clientHash).first();
  const hasRatedBefore = previousRating || await env.DB.prepare(
    "SELECT shout_id FROM food_ratings WHERE client_hash = ? LIMIT 1",
  ).bind(clientHash).first();
  const operations = [env.DB.prepare(
    `INSERT INTO food_ratings (shout_id, client_hash, rating_x2, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(shout_id, client_hash)
     DO UPDATE SET rating_x2 = excluded.rating_x2, updated_at = excluded.updated_at`,
  ).bind(shoutId, clientHash, ratingX2, now, now)];
  if (!hasRatedBefore) operations.push(env.DB.prepare(
    "INSERT OR IGNORE INTO food_engagement_rewards (author_hash, reward_type, xp, created_at) VALUES (?, 'first_rating', ?, ?)",
  ).bind(clientHash, FOOD_XP_FIRST_ENGAGEMENT, now));
  const outcomes = await env.DB.batch(operations);
  const earnedXp = hasRatedBefore ? 0 : Number(outcomes.at(-1)?.meta?.changes || 0) * FOOD_XP_FIRST_ENGAGEMENT;
  if (!previousRating && shout.author_hash && shout.author_hash !== clientHash) {
    await env.DB.prepare(
      `INSERT INTO notifications
         (id, recipient_hash, actor_hash, type, message_id, parent_message_id, created_at, expires_at)
       VALUES (?, ?, ?, 'reaction', ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(), shout.author_hash, clientHash, `rating:${ratingX2 / 2}`,
      shoutId, now, shout.expires_at ?? now + 30 * 24 * 60 * 60,
    ).run();
  }
  const result = await env.DB.prepare(
    "SELECT COUNT(*) AS rating_count, AVG(rating_x2) / 2.0 AS rating_average FROM food_ratings WHERE shout_id = ?",
  ).bind(shoutId).first();
  return respond({
    average: Number(Number(result?.rating_average || 0).toFixed(1)),
    count: Number(result?.rating_count || 0),
    viewerValue: ratingX2 / 2,
    earnedXp,
  });
}

async function reportFoodEntity(request, env, entityType, entityId, respond) {
  const payload = await readJson(request);
  const clientHash = await getClientHash(request);
  const reason = REPORT_REASONS.has(payload.reason) ? payload.reason : "other";
  const table = entityType === "shout" ? "food_shouts" : "food_comments";
  const entity = await env.DB.prepare(`SELECT id FROM ${table} WHERE id = ?`).bind(entityId).first();
  if (!entity) throw new FoodError(404, "Content not found.");
  const insertion = await env.DB.prepare(
    "INSERT OR IGNORE INTO food_reports (entity_type, entity_id, client_hash, reason, created_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(entityType, entityId, clientHash, reason, unixNow())
    .run();
  if (entityType === "comment" && Number(insertion.meta?.changes)) {
    await env.DB.prepare(
      "UPDATE food_comments SET report_count = report_count + 1, status = CASE WHEN report_count + 1 >= 3 THEN 'hidden' ELSE status END WHERE id = ?",
    )
      .bind(entityId)
      .run();
  }
  if (entityType === "shout" && Number(insertion.meta?.changes)) {
    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM food_reports WHERE entity_type = 'shout' AND entity_id = ?",
    ).bind(entityId).first();
    if (Number(count?.total ?? 0) >= 3) {
      await env.DB.prepare("UPDATE food_shouts SET status = 'hidden', updated_at = ? WHERE id = ?")
        .bind(unixNow(), entityId)
        .run();
    }
  }
  return respond({ accepted: Boolean(insertion.meta?.changes) });
}

export async function cleanExpiredFoodData(env) {
  const now = unixNow();
  const { results = [] } = await env.DB.prepare(
    `SELECT u.object_key, u.byte_size
       FROM food_uploads AS u
      WHERE (u.claimed_at IS NULL AND u.expires_at <= ?)
         OR EXISTS (
           SELECT 1
             FROM food_shout_images AS i
             JOIN food_shouts AS s ON s.id = i.shout_id
            WHERE i.object_key = u.object_key
              AND (s.status = 'deleted' OR (s.expires_at IS NOT NULL AND s.expires_at <= ?))
         )
      LIMIT 100`,
  ).bind(now, now).all();
  if (env.FOOD_IMAGES) {
    await Promise.all(results.map((row) => env.FOOD_IMAGES.delete(row.object_key)));
  }
  const releasedBytes = results.reduce((total, row) => total + Number(row.byte_size || 0), 0);
  await env.DB.batch([
    env.DB.prepare("UPDATE food_shouts SET status = 'deleted', updated_at = ? WHERE expires_at IS NOT NULL AND expires_at <= ?")
      .bind(now, now),
    ...results.map((row) => env.DB.prepare("DELETE FROM food_uploads WHERE object_key = ?").bind(row.object_key)),
    env.DB.prepare("UPDATE food_storage_usage SET used_bytes = MAX(0, used_bytes - ?), updated_at = ? WHERE id = 1")
      .bind(releasedBytes, now),
    env.DB.prepare("DELETE FROM food_upload_limits WHERE last_upload_at <= ?").bind(now - 2 * 24 * 60 * 60),
    env.DB.prepare("DELETE FROM food_network_limits WHERE last_write_at <= ?").bind(now - 2 * 24 * 60 * 60),
    env.DB.prepare("DELETE FROM food_abuse_events WHERE created_at <= ?").bind(now - 14 * 24 * 60 * 60),
    env.DB.prepare("DELETE FROM food_block_list WHERE blocked_until <= ?").bind(now),
    env.DB.prepare("DELETE FROM food_abuse_state WHERE last_seen_at <= ?").bind(now - 30 * 24 * 60 * 60),
    env.DB.prepare("DELETE FROM food_place_cache WHERE expires_at <= ?").bind(now),
  ]);
}

async function verifyFoodShout(request, env, shoutId, respond) {
  await requireActiveShout(env.DB, shoutId);
  const payload = await readJson(request);
  const clientHash = await getClientHash(request);
  const status = String(payload.status ?? "");
  if (!["confirmed", "unsure", "gone"].includes(status)) throw new FoodError(400, "Choose a valid freshness response.");
  const now = unixNow();
  const previous = await env.DB.prepare("SELECT status FROM food_verifications WHERE shout_id = ? AND client_hash = ?")
    .bind(shoutId, clientHash)
    .first();
  await env.DB.prepare(
    `INSERT INTO food_verifications (shout_id, client_hash, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(shout_id, client_hash) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
  )
    .bind(shoutId, clientHash, status, now, now)
    .run();
  await refreshVerificationCounts(env.DB, shoutId);
  const counts = await env.DB.prepare(
    "SELECT confirmed_count, unsure_count, gone_count FROM food_shouts WHERE id = ?",
  ).bind(shoutId).first();
  return respond({ accepted: true, changed: previous?.status !== status, ...serializeVerificationCounts(counts) });
}

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
     ON CONFLICT(shout_id, client_hash) DO UPDATE SET verdict = excluded.verdict, updated_at = excluded.updated_at`,
  )
    .bind(shoutId, clientHash, verdict, now, now)
    .run();
  const counts = await env.DB.prepare(
    `SELECT COUNT(*) AS tried_count,
            SUM(CASE WHEN verdict = 'would_get_again' THEN 1 ELSE 0 END) AS positive_count
       FROM food_tries WHERE shout_id = ?`,
  ).bind(shoutId).first();
  await env.DB.prepare(
    "UPDATE food_shouts SET tried_count = ?, would_get_again_count = ?, updated_at = ? WHERE id = ?",
  ).bind(Number(counts?.tried_count ?? 0), Number(counts?.positive_count ?? 0), now, shoutId).run();
  return respond({ accepted: true, ...serializeTriedCounts(counts) });
}

async function searchFoodPlaces(request, env, url, respond) {
  const query = normalizeSearchQuery(url.searchParams.get("q"));
  if (!query || query.length < 2) throw new FoodError(400, "Enter at least two characters and submit the search.");
  if (query.length > 80) throw new FoodError(400, "Keep the place search short.");
  const latitude = optionalSearchCoordinate(url.searchParams.get("lat"), -90, 90);
  const prefersChinese = /[\u3400-\u9fff]/u.test(query);
  const longitude = optionalSearchCoordinate(url.searchParams.get("lon"), -180, 180);
  const hasMapBias = latitude !== null && longitude !== null;
  const west = optionalSearchCoordinate(url.searchParams.get("west"), -180, 180);
  const south = optionalSearchCoordinate(url.searchParams.get("south"), -90, 90);
  const east = optionalSearchCoordinate(url.searchParams.get("east"), -180, 180);
  const north = optionalSearchCoordinate(url.searchParams.get("north"), -90, 90);
  const hasViewbox = west !== null && south !== null && east !== null && north !== null && west < east && south < north;
  const unbounded = url.searchParams.get("unbounded") === "1";
  const requestedCountry = String(url.searchParams.get("country") || "").toLowerCase();
  const country = /^[a-z]{2}$/.test(requestedCountry) ? requestedCountry : "";
  const areaKey = `${unbounded ? "free" : "bounded"}:${hasMapBias ? `${latitude.toFixed(2)}:${longitude.toFixed(2)}` : "global"}`;
  const cacheKey = `nominatim:v6:${country || "any"}:${areaKey}:${query.toLowerCase()}`;
  const now = unixNow();
  const cached = await env.DB.prepare(
    "SELECT response_json FROM food_place_cache WHERE cache_key = ? AND expires_at > ?",
  ).bind(cacheKey, now).first();
  if (cached?.response_json) {
    return respond({ provider: "OpenStreetMap", attribution: "© OpenStreetMap contributors", cached: true, results: JSON.parse(cached.response_json) });
  }

  const lastRequest = await env.DB.prepare("SELECT last_request_at_ms FROM food_provider_limits WHERE provider = 'nominatim'").first();
  const nowMs = Date.now();
  if (lastRequest && nowMs - Number(lastRequest.last_request_at_ms) < 1100) {
    throw new FoodError(429, "Place search is busy. Wait a moment and submit again.");
  }
  await env.DB.prepare(
    `INSERT INTO food_provider_limits (provider, last_request_at_ms) VALUES ('nominatim', ?)
     ON CONFLICT(provider) DO UPDATE SET last_request_at_ms = excluded.last_request_at_ms`,
  ).bind(nowMs).run();

  const endpoint = String(env.GEOCODER_URL || "https://nominatim.openstreetmap.org").replace(/\/$/, "");
  const searchUrl = new URL(`${endpoint}/search`);
  const contextualQuery = country === "au" && !/\baustralia\b/i.test(query) ? `${query}, Australia` : query;
  searchUrl.searchParams.set("q", contextualQuery);
  searchUrl.searchParams.set("format", "jsonv2");
  searchUrl.searchParams.set("limit", "12");
  searchUrl.searchParams.set("addressdetails", "1");
  searchUrl.searchParams.set("namedetails", "1");
  searchUrl.searchParams.set("accept-language", prefersChinese ? "zh-CN,zh,en" : "en,zh-CN,zh");
  if (country) searchUrl.searchParams.set("countrycodes", country);
  if (hasViewbox) {
    const longitudePadding = Math.max(.01, (east - west) * .35);
    const latitudePadding = Math.max(.01, (north - south) * .35);
    searchUrl.searchParams.set("viewbox", `${west - longitudePadding},${north + latitudePadding},${east + longitudePadding},${south - latitudePadding}`);
    if (!unbounded) searchUrl.searchParams.set("bounded", "1");
  } else if (hasMapBias) {
    searchUrl.searchParams.set("viewbox", `${longitude - .15},${latitude + .12},${longitude + .15},${latitude - .12}`);
    if (!unbounded) searchUrl.searchParams.set("bounded", "1");
  }
  const response = await fetch(searchUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "UQ-Helper-Food-Shout/1.0 (student project; uq-helper-api)",
      Referer: request.headers.get("origin") || "https://uq-bus-time-board-gxyx.vercel.app/",
    },
  });
  if (!response.ok) throw new FoodError(502, "Place search is unavailable right now.");
  const raw = await response.json();
  const normalizedQuery = normalizePlaceMatchText(query);
  const results = raw.map((item) => {
    const details = item.namedetails || {};
    const englishName = String(details["name:en"] || "").trim();
    const chineseName = String(details["name:zh-Hans"] || details["name:zh"] || "").trim();
    const baseName = String(details.name || item.name || item.display_name?.split(",")[0] || "Pinned place").trim();
    const preferredName = prefersChinese ? chineseName || baseName || englishName : englishName || baseName || chineseName;
    const secondaryName = (prefersChinese ? englishName : chineseName) || (baseName !== preferredName ? baseName : "");
    const countryCode = String(item.address?.country_code || "").toLowerCase();
    const city = String(item.address?.city || item.address?.town || item.address?.village || item.address?.municipality || "").trim();
    const suburb = String(item.address?.suburb || item.address?.city_district || item.address?.neighbourhood || "").trim();
    const state = String(item.address?.state || item.address?.region || "").trim();
    return {
      provider: "osm",
      providerPlaceId: `${item.osm_type}:${item.osm_id}`,
      label: String(item.display_name || "").slice(0, 120),
      name: preferredName.slice(0, 100),
      secondaryName: secondaryName && secondaryName !== preferredName ? secondaryName.slice(0, 100) : "",
      countryCode,
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      category: item.type || item.category || "place",
      city,
      suburb,
      state,
      importance: Number(item.importance || 0),
    };
  }).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)).map((item) => ({
    ...item,
    distanceKm: hasMapBias ? Math.round(distanceInKm(latitude, longitude, item.latitude, item.longitude) * 10) / 10 : null,
  })).map((item) => ({
    ...item,
    confidence: foodPlaceMatchConfidence(item, normalizedQuery, country),
  })).filter((item) => (!country || item.countryCode === country) && item.confidence >= .52)
    .sort((left, right) => right.confidence - left.confidence
      || (left.distanceKm ?? Number.POSITIVE_INFINITY) - (right.distanceKm ?? Number.POSITIVE_INFINITY))
    .slice(0, 8)
    .map(({ importance: _importance, ...item }) => item);
  if (results.length) {
    await env.DB.prepare(
      `INSERT INTO food_place_cache (cache_key, response_json, created_at, expires_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET response_json = excluded.response_json,
         created_at = excluded.created_at, expires_at = excluded.expires_at`,
    ).bind(cacheKey, JSON.stringify(results), now, now + 30 * 24 * 60 * 60).run();
  }
  await env.DB.prepare(
    `DELETE FROM food_place_cache
      WHERE cache_key NOT IN (
        SELECT cache_key FROM food_place_cache ORDER BY created_at DESC LIMIT 1500
      )`,
  ).run();
  return respond({ provider: "OpenStreetMap", attribution: "© OpenStreetMap contributors", cached: false, mapBiasApplied: hasMapBias, boundedToMap: hasViewbox && !unbounded, results });
}

async function reverseFoodPlace(request, env, url, respond) {
  const latitude = optionalSearchCoordinate(url.searchParams.get("lat"), -90, 90);
  const longitude = optionalSearchCoordinate(url.searchParams.get("lon"), -180, 180);
  if (latitude === null || longitude === null) throw new FoodError(400, "Choose a valid photo location.");
  const cacheKey = `nominatim:reverse:v1:${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
  const now = unixNow();
  const cached = await env.DB.prepare(
    "SELECT response_json FROM food_place_cache WHERE cache_key = ? AND expires_at > ?",
  ).bind(cacheKey, now).first();
  if (cached?.response_json) {
    return respond({ provider: "OpenStreetMap", attribution: "© OpenStreetMap contributors", cached: true, place: JSON.parse(cached.response_json) });
  }

  const lastRequest = await env.DB.prepare("SELECT last_request_at_ms FROM food_provider_limits WHERE provider = 'nominatim'").first();
  const nowMs = Date.now();
  if (lastRequest && nowMs - Number(lastRequest.last_request_at_ms) < 1100) {
    throw new FoodError(429, "Place detection is busy. You can edit the location manually.");
  }
  await env.DB.prepare(
    `INSERT INTO food_provider_limits (provider, last_request_at_ms) VALUES ('nominatim', ?)
     ON CONFLICT(provider) DO UPDATE SET last_request_at_ms = excluded.last_request_at_ms`,
  ).bind(nowMs).run();

  const endpoint = String(env.GEOCODER_URL || "https://nominatim.openstreetmap.org").replace(/\/$/, "");
  const reverseUrl = new URL(`${endpoint}/reverse`);
  reverseUrl.searchParams.set("lat", String(latitude));
  reverseUrl.searchParams.set("lon", String(longitude));
  reverseUrl.searchParams.set("format", "jsonv2");
  reverseUrl.searchParams.set("zoom", "18");
  reverseUrl.searchParams.set("addressdetails", "1");
  reverseUrl.searchParams.set("namedetails", "1");
  reverseUrl.searchParams.set("accept-language", "en,zh-CN,zh");
  const response = await fetch(reverseUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "UQ-Helper-Food-Shout/1.0 (student project; uq-helper-api)",
      Referer: request.headers.get("origin") || "https://uq-bus-time-board-gxyx.vercel.app/",
    },
  });
  if (!response.ok) throw new FoodError(502, "We found photo GPS, but could not name the place yet.");
  const item = await response.json();
  const details = item.namedetails || {};
  const address = item.address || {};
  const name = String(details["name:en"] || details.name || item.name || address.amenity || address.shop || address.tourism || "").trim();
  const label = String(item.display_name || [address.road, address.suburb, address.city, address.state, address.country].filter(Boolean).join(", ")).trim();
  const place = {
    provider: "osm",
    providerPlaceId: item.osm_type && item.osm_id ? `${item.osm_type}:${item.osm_id}` : null,
    latitude,
    longitude,
    name: name.slice(0, 100),
    label: (label || "Location detected from photo").slice(0, 120),
    countryCode: String(address.country_code || "").toLowerCase(),
    city: String(address.city || address.town || address.village || address.municipality || "").slice(0, 80),
    suburb: String(address.suburb || address.city_district || address.neighbourhood || "").slice(0, 80),
    state: String(address.state || address.region || "").slice(0, 80),
  };
  await env.DB.prepare(
    `INSERT INTO food_place_cache (cache_key, response_json, created_at, expires_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET response_json = excluded.response_json,
       created_at = excluded.created_at, expires_at = excluded.expires_at`,
  ).bind(cacheKey, JSON.stringify(place), now, now + 30 * 24 * 60 * 60).run();
  return respond({ provider: "OpenStreetMap", attribution: "© OpenStreetMap contributors", cached: false, place });
}

async function listFoodCollections(request, env, respond) {
  const clientHash = await getClientHash(request);
  const { results = [] } = await env.DB.prepare(
    `SELECT c.id, c.title, c.is_public, c.created_at, c.updated_at,
            COUNT(s.id) AS item_count,
            json_group_array(s.id) AS shout_ids
       FROM food_collections c
       LEFT JOIN food_collection_items i ON i.collection_id = c.id
       LEFT JOIN food_shouts s ON s.id = i.shout_id AND s.status = 'active'
      WHERE c.author_hash = ? AND c.status = 'active'
      GROUP BY c.id
      ORDER BY c.updated_at DESC
      LIMIT 12`,
  ).bind(clientHash).all();
  return respond({ collections: results.map(serializeFoodCollection) });
}

async function createFoodCollection(request, env, respond) {
  const payload = await readJson(request);
  const clientHash = await getClientHash(request);
  const title = normalizeFoodText(payload.title, "collection name", 48, true);
  const now = unixNow();
  const contribution = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM food_shouts WHERE author_hash = ? AND status = 'active'",
  ).bind(clientHash).first();
  if (Number(contribution?.count || 0) < 5) {
    throw new FoodError(403, "Share 5 food finds to unlock collections.", "collection_locked");
  }
  const existing = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM food_collections WHERE author_hash = ? AND status = 'active'",
  ).bind(clientHash).first();
  if (Number(existing?.count || 0) >= 12) throw new FoodError(429, "Keep up to 12 collections for now.", "collection_limit");
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO food_collections (id, author_hash, title, is_public, created_at, updated_at, status)
     VALUES (?, ?, ?, 1, ?, ?, 'active')`,
  ).bind(id, clientHash, title, now, now).run();
  return respond({ collection: serializeFoodCollection({ id, title, is_public: 1, created_at: now, updated_at: now, item_count: 0, shout_ids: "[]" }) }, 201);
}

async function addFoodCollectionItem(request, env, collectionId, respond) {
  const payload = await readJson(request);
  const clientHash = await getClientHash(request);
  const shoutId = String(payload.shoutId || "");
  if (!UUID_PATTERN.test(shoutId)) throw new FoodError(400, "Choose a valid food find.");
  const collection = await requireOwnedFoodCollection(env.DB, collectionId, clientHash);
  await requireActiveShout(env.DB, shoutId);
  const now = unixNow();
  await env.DB.prepare(
    "INSERT OR IGNORE INTO food_collection_items (collection_id, shout_id, added_at) VALUES (?, ?, ?)",
  ).bind(collectionId, shoutId, now).run();
  await env.DB.prepare(
    "UPDATE food_collections SET updated_at = ? WHERE id = ? AND author_hash = ?",
  ).bind(now, collectionId, clientHash).run();
  return respond({ collection: await getOwnedFoodCollection(env.DB, collection.id, clientHash) });
}

async function removeFoodCollectionItem(request, env, collectionId, shoutId, respond) {
  const clientHash = await getClientHash(request);
  if (!UUID_PATTERN.test(shoutId)) throw new FoodError(400, "Choose a valid food find.");
  const collection = await requireOwnedFoodCollection(env.DB, collectionId, clientHash);
  const now = unixNow();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM food_collection_items WHERE collection_id = ? AND shout_id = ?").bind(collectionId, shoutId),
    env.DB.prepare("UPDATE food_collections SET updated_at = ? WHERE id = ? AND author_hash = ?").bind(now, collectionId, clientHash),
  ]);
  return respond({ collection: await getOwnedFoodCollection(env.DB, collection.id, clientHash) });
}

async function requireOwnedFoodCollection(database, collectionId, clientHash) {
  const collection = await database.prepare(
    "SELECT id FROM food_collections WHERE id = ? AND author_hash = ? AND status = 'active'",
  ).bind(collectionId, clientHash).first();
  if (!collection) throw new FoodError(404, "Collection not found or not owned by this device.");
  return collection;
}

async function getOwnedFoodCollection(database, collectionId, clientHash) {
  const row = await database.prepare(
    `SELECT c.id, c.title, c.is_public, c.created_at, c.updated_at,
            COUNT(s.id) AS item_count,
            json_group_array(s.id) AS shout_ids
       FROM food_collections c
       LEFT JOIN food_collection_items i ON i.collection_id = c.id
       LEFT JOIN food_shouts s ON s.id = i.shout_id AND s.status = 'active'
      WHERE c.id = ? AND c.author_hash = ? AND c.status = 'active'
      GROUP BY c.id`,
  ).bind(collectionId, clientHash).first();
  if (!row) throw new FoodError(404, "Collection not found.");
  return serializeFoodCollection(row);
}

function serializeFoodCollection(row) {
  return {
    id: row.id,
    title: row.title,
    isPublic: Boolean(row.is_public),
    itemCount: Number(row.item_count || 0),
    shoutIds: parseJsonArray(row.shout_ids).filter((id) => UUID_PATTERN.test(String(id))),
    createdAt: new Date(Number(row.created_at) * 1000).toISOString(),
    updatedAt: new Date(Number(row.updated_at) * 1000).toISOString(),
  };
}

async function getFoodFootprint(request, env, respond) {
  const clientHash = await getClientHash(request);
  // One owner-scoped read, only on opening the footprint. Never send author hashes or image data.
  const { results = [] } = await env.DB.prepare(
    `SELECT s.id, s.title, s.place_name, s.location_label, s.latitude_e6, s.longitude_e6, s.created_at,
            cached.response_json AS cached_location,
            COUNT(*) OVER() AS total_count
       FROM food_shouts s
       LEFT JOIN food_place_cache cached ON cached.cache_key =
         'nominatim:reverse:v1:' || printf('%.4f', s.latitude_e6 / 1000000.0) || ':' || printf('%.4f', s.longitude_e6 / 1000000.0)
      WHERE s.author_hash = ? AND s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > ?)
      ORDER BY s.created_at DESC, s.id DESC
      LIMIT 1000`,
  ).bind(clientHash, unixNow()).all();
  const total = Number(results[0]?.total_count || 0);
  return respond({
    total,
    complete: total <= results.length,
    posts: results.map((row) => {
      let cached = {};
      try { cached = JSON.parse(row.cached_location || '{}'); } catch { /* Keep the saved label. */ }
      return {
      id: row.id,
      title: row.title,
      placeName: row.place_name,
      locationLabel: row.location_label,
      locationContext: {
        label: String(cached?.label || '').slice(0, 120),
        countryCode: String(cached?.countryCode || '').slice(0, 2),
        city: String(cached?.city || '').slice(0, 80),
        suburb: String(cached?.suburb || '').slice(0, 80),
        state: String(cached?.state || '').slice(0, 80),
      },
      latitude: Number(row.latitude_e6) / 1_000_000,
      longitude: Number(row.longitude_e6) / 1_000_000,
      createdAt: new Date(Number(row.created_at) * 1000).toISOString(),
      };
    }),
  });
}

async function getFoodProfileProgress(request, env, url, respond) {
  const clientHash = await getClientHash(request);
  const requestedOffset = Number(url.searchParams.get("tzOffset"));
  const timezoneOffset = Number.isFinite(requestedOffset) ? Math.max(-840, Math.min(840, Math.trunc(requestedOffset))) : 0;
  const [{ results = [] }, override, { results: engagementRewards = [] }] = await Promise.all([
    env.DB.prepare(
    `SELECT id, title, place_name, location_label, geohash, created_at
       FROM food_shouts
      WHERE author_hash = ? AND status = 'active'
      ORDER BY created_at ASC
      LIMIT 1000`,
    ).bind(clientHash).all(),
    env.DB.prepare("SELECT xp_bonus, label, updated_at FROM food_profile_overrides WHERE author_hash = ?").bind(clientHash).first(),
    env.DB.prepare("SELECT reward_type, xp, created_at FROM food_engagement_rewards WHERE author_hash = ? ORDER BY created_at ASC").bind(clientHash).all(),
  ]);
  const days = new Map();
  const seenAreas = new Set();
  const areas = new Map();
  const recent = [];
  const history = [];
  const bonusXp = Math.max(0, Math.min(FOOD_XP_MAX_BONUS, Math.trunc(Number(override?.xp_bonus || 0))));
  let totalXp = bonusXp;
  let earnedPostCount = 0;

  for (const row of results) {
    const createdAt = Number(row.created_at || 0);
    const dayKey = Math.floor((createdAt - timezoneOffset * 60) / 86400);
    const day = days.get(dayKey) || { posts: 0, xp: 0 };
    const areaKey = String(row.geohash || "").slice(0, 6) || `post:${row.id}`;
    const area = areas.get(areaKey) || { count: 0, label: foodGuideAreaLabel(row.location_label) };
    area.count += 1;
    if (!area.label) area.label = foodGuideAreaLabel(row.location_label);
    areas.set(areaKey, area);
    const locationKey = String(row.place_name || areaKey).toLowerCase();
    const newArea = !seenAreas.has(areaKey);
    const withinTrailWindow = recent.length >= 2 && createdAt - recent[recent.length - 2].createdAt <= 30 * 60;
    const trailLocations = withinTrailWindow ? new Set([recent[recent.length - 2].locationKey, recent[recent.length - 1].locationKey, locationKey]) : new Set();
    const trailBonus = trailLocations.size === 3;
    const earnsXp = day.posts < FOOD_XP_DAILY_POST_LIMIT && day.xp < FOOD_XP_DAILY_CAP;
    const requestedXp = earnsXp ? FOOD_XP_BASE + (newArea ? FOOD_XP_NEW_AREA : 0) + (trailBonus ? FOOD_XP_TRAIL : 0) : 0;
    const xp = Math.max(0, Math.min(requestedXp, FOOD_XP_DAILY_CAP - day.xp));
    const bonuses = [];
    if (xp > 0 && newArea) bonuses.push({ label: "New area", xp: FOOD_XP_NEW_AREA });
    if (xp > 0 && trailBonus) bonuses.push({ label: "3-stop food trail", xp: FOOD_XP_TRAIL });
    day.posts += 1;
    day.xp += xp;
    days.set(dayKey, day);
    seenAreas.add(areaKey);
    recent.push({ createdAt, locationKey });
    totalXp += xp;
    if (xp > 0) earnedPostCount += 1;
    history.push({
      id: row.id,
      title: row.title,
      placeName: row.place_name || row.location_label || "Food find",
      createdAt: new Date(createdAt * 1000).toISOString(),
      xp,
      bonuses,
      capped: !earnsXp,
    });
  }

  if (bonusXp) {
    history.push({
      id: "profile-bonus",
      title: String(override?.label || "Founder bonus").slice(0, 48),
      placeName: "Profile reward",
      createdAt: new Date(Number(override?.updated_at || unixNow()) * 1000).toISOString(),
      xp: bonusXp,
      bonuses: [],
      capped: false,
    });
  }

  for (const reward of engagementRewards) {
    const xp = Math.max(0, Math.min(FOOD_XP_FIRST_ENGAGEMENT, Number(reward.xp || 0)));
    totalXp += xp;
    history.push({
      id: `engagement-${reward.reward_type}`,
      title: reward.reward_type === "first_rating" ? "First rating" : "First comment",
      placeName: "Community reward",
      createdAt: new Date(Number(reward.created_at) * 1000).toISOString(),
      xp,
      bonuses: [],
      capped: false,
    });
  }

  const level = foodLevelForXp(totalXp);
  const currentLevelXp = foodLevelThreshold(level);
  const nextLevelXp = foodLevelThreshold(level + 1);
  const todayKey = Math.floor((unixNow() - timezoneOffset * 60) / 86400);
  const today = days.get(todayKey) || { posts: 0, xp: 0 };
  const guideArea = [...areas.values()].sort((left, right) => right.count - left.count)[0] || null;
  const guide = guideArea?.count >= 3 ? {
    title: `${guideArea.label || "Local"} Guide`,
    area: guideArea.label || "Local",
    postCount: guideArea.count,
  } : null;
  const loved = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM (
       SELECT s.id
         FROM food_shouts s
         JOIN food_ratings r ON r.shout_id = s.id
        WHERE s.author_hash = ? AND s.status = 'active'
        GROUP BY s.id
       HAVING COUNT(r.client_hash) >= 3 AND AVG(r.rating_x2) >= 9
     ) AS loved_posts`,
  ).bind(clientHash).first();
  const crowdPleaserCount = Number(loved?.count || 0);
  const badges = foodProfileBadges({ totalPosts: results.length, guide, crowdPleaserCount });
  return respond({
    totalXp,
    totalPosts: results.length,
    countedPosts: earnedPostCount,
    level,
    title: foodRankForLevel(level).label,
    rank: foodRankForLevel(level),
    currentLevelXp,
    nextLevelXp,
    xpToNextLevel: Math.max(0, nextLevelXp - totalXp),
    progressPercent: Math.max(0, Math.min(100, Math.round((totalXp - currentLevelXp) / Math.max(1, nextLevelXp - currentLevelXp) * 100))),
    daily: {
      xp: today.xp,
      cap: FOOD_XP_DAILY_CAP,
      scoringPosts: Math.min(today.posts, FOOD_XP_DAILY_POST_LIMIT),
      postLimit: FOOD_XP_DAILY_POST_LIMIT,
    },
    rules: {
      postXp: FOOD_XP_BASE,
      newAreaXp: FOOD_XP_NEW_AREA,
      trailXp: FOOD_XP_TRAIL,
      trailMinutes: 30,
      dailyPostLimit: FOOD_XP_DAILY_POST_LIMIT,
      dailyXpCap: FOOD_XP_DAILY_CAP,
    },
    guide,
    badges,
    history: history.slice(-10).reverse(),
  });
}

function foodLevelThreshold(level) { return level <= 1 ? 0 : Math.round(50 * ((level - 1) ** 1.55)); }
function foodLevelForXp(xp) { let level = 1; while (level < 99 && xp >= foodLevelThreshold(level + 1)) level += 1; return level; }
function foodProfileBadges({ totalPosts, guide, crowdPleaserCount }) {
  return [
    { key: "first-bite", label: "First bite", hint: "Share your first find", icon: "bite", unlocked: totalPosts >= 1 },
    { key: "map-muncher", label: "Map muncher", hint: "Share 5 food finds", icon: "map", unlocked: totalPosts >= 5 },
    { key: "crowd-pleaser", label: "Crowd pleaser", hint: "Earn 4.5+ from 3 ratings", icon: "heart", unlocked: crowdPleaserCount > 0 },
    { key: "local-guide", label: "Local guide", hint: "Share 3 finds in one area", icon: "guide", unlocked: Boolean(guide) },
  ];
}
function foodGuideAreaLabel(locationLabel) {
  const ignored = new Set(["australia", "china", "hong kong", "macau", "taiwan", "queensland", "new south wales", "victoria", "western australia", "south australia", "tasmania", "canada", "united states", "united kingdom"]);
  const parts = String(locationLabel || "").split(",").map((part) => part.trim()).filter(Boolean);
  const candidates = parts.filter((part) => !ignored.has(part.toLowerCase()) && !/^\d{4,6}$/.test(part) && !/^\d+[\w\s-]*$/.test(part));
  return (candidates.at(-1) || "Local").slice(0, 32);
}
function foodRankForLevel(level) {
  const ranks = ["Bronze", "Silver", "Gold", "Plat", "Diamond", "Aurora", "Comet", "Nova", "Nebula", "Celestial", "Mythic", "Eternal", "Starlight", "Orbit", "Cosmic", "Prism", "Legend"];
  const divisions = ["IV", "III", "II", "I"];
  const safeLevel = Math.max(1, Math.min(99, Number(level) || 1));
  const rankIndex = Math.min(ranks.length - 1, Math.floor((safeLevel - 1) / 4));
  const division = rankIndex === ranks.length - 1 ? `Lv. ${safeLevel}` : divisions[(safeLevel - 1) % divisions.length];
  return { key: ranks[rankIndex].toLowerCase(), name: ranks[rankIndex], division, label: `${ranks[rankIndex]} ${division}` };
}

function optionalSearchCoordinate(value, min, max) {
  if (value === null || value === "") return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= min && coordinate <= max ? coordinate : null;
}

function normalizePlaceMatchText(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function foodPlaceMatchConfidence(item, normalizedQuery, expectedCountry) {
  if (expectedCountry && item.countryCode !== expectedCountry) return 0;
  const queryTokens = normalizedQuery.split(" ").filter((token) => token.length > 1);
  if (!queryTokens.length) return 0;
  const name = normalizePlaceMatchText([item.name, item.secondaryName].filter(Boolean).join(" "));
  const locality = normalizePlaceMatchText([item.suburb, item.city, item.state].filter(Boolean).join(" "));
  const full = normalizePlaceMatchText([item.name, item.secondaryName, item.label, locality].filter(Boolean).join(" "));
  const tokenCoverage = queryTokens.filter((token) => full.includes(token)).length / queryTokens.length;
  const localityCoverage = queryTokens.filter((token) => locality.includes(token)).length / queryTokens.length;
  const exactName = name === normalizedQuery ? 1 : name.startsWith(normalizedQuery) || name.includes(normalizedQuery) ? .92 : 0;
  const nameCoverage = queryTokens.filter((token) => name.includes(token)).length / queryTokens.length;
  const nameConfidence = Math.max(exactName, nameCoverage, tokenCoverage * .82);
  const distanceConfidence = item.distanceKm === null ? .5 : item.distanceKm <= 5 ? 1 : item.distanceKm <= 25 ? .82 : item.distanceKm <= 100 ? .5 : .2;
  const venueConfidence = /^(restaurant|cafe|fast_food|food_court|bar|pub|marketplace|supermarket|bakery|shop|amenity|building)$/.test(String(item.category || "")) ? 1 : .55;
  const importance = Math.min(1, Math.max(0, Number(item.importance || 0) * 2));
  const confidence = nameConfidence * .56 + tokenCoverage * .18 + localityCoverage * .08
    + distanceConfidence * .1 + venueConfidence * .05 + importance * .03;
  return Math.round(confidence * 1000) / 1000;
}

function distanceInKm(fromLatitude, fromLongitude, toLatitude, toLongitude) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const latitudeDelta = radians(toLatitude - fromLatitude);
  const longitudeDelta = radians(toLongitude - fromLongitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(fromLatitude)) * Math.cos(radians(toLatitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function requireActiveShout(database, id) {
  const row = await database.prepare(
    "SELECT id, author_hash, expires_at FROM food_shouts WHERE id = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > ?)",
  ).bind(id, unixNow()).first();
  if (!row) throw new FoodError(404, "Food Shout not found.");
  return row;
}

async function refreshVerificationCounts(database, shoutId) {
  const counts = await database.prepare(
    `SELECT SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
            SUM(CASE WHEN status = 'unsure' THEN 1 ELSE 0 END) AS unsure,
            SUM(CASE WHEN status = 'gone' THEN 1 ELSE 0 END) AS gone
       FROM food_verifications WHERE shout_id = ?`,
  ).bind(shoutId).first();
  await database.prepare(
    "UPDATE food_shouts SET confirmed_count = ?, unsure_count = ?, gone_count = ?, updated_at = ? WHERE id = ?",
  ).bind(Number(counts?.confirmed ?? 0), Number(counts?.unsure ?? 0), Number(counts?.gone ?? 0), unixNow(), shoutId).run();
}

async function resolveVenueAnchor(database, details) {
  if (!details.placeName) return null;
  if (details.provider && details.providerPlaceId) {
    const existing = await database.prepare(
      "SELECT id FROM venue_anchors WHERE provider = ? AND provider_place_id = ?",
    ).bind(details.provider, details.providerPlaceId).first();
    if (existing?.id) return existing.id;
  }
  const normalizedName = normalizeVenueName(details.placeName);
  const nearby = await database.prepare(
    `SELECT id FROM venue_anchors
      WHERE normalized_name = ?
        AND latitude_e6 BETWEEN ? AND ?
        AND longitude_e6 BETWEEN ? AND ?
      LIMIT 2`,
  ).bind(
    normalizedName,
    Math.round((details.latitude - .00025) * 1_000_000),
    Math.round((details.latitude + .00025) * 1_000_000),
    Math.round((details.longitude - .00025) * 1_000_000),
    Math.round((details.longitude + .00025) * 1_000_000),
  ).all();
  if (nearby.results?.length === 1) return nearby.results[0].id;

  const id = crypto.randomUUID();
  await database.prepare(
    `INSERT INTO venue_anchors
       (id, display_name, normalized_name, latitude_e6, longitude_e6,
        provider, provider_place_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id,
    details.placeName,
    normalizedName,
    Math.round(details.latitude * 1_000_000),
    Math.round(details.longitude * 1_000_000),
    details.provider,
    details.providerPlaceId,
    details.now,
    details.now,
  ).run();
  return id;
}

async function enforceFoodRateLimit(database, clientHash, now, cooldown = 30) {
  const dayKey = new Date(now * 1000).toISOString().slice(0, 10);
  const rate = await database.prepare(
    "SELECT last_post_at, day_key, daily_count FROM rate_limits WHERE client_hash = ?",
  ).bind(clientHash).first();
  if (rate && now - Number(rate.last_post_at) < cooldown) {
    throw new FoodError(429, `Please wait ${cooldown - (now - Number(rate.last_post_at))} seconds and try again.`);
  }
  const dailyCount = rate?.day_key === dayKey ? Number(rate.daily_count) : 0;
  if (dailyCount >= 120) throw new FoodError(429, "This device has reached today’s contribution limit.");
  await database.prepare(
    `INSERT INTO rate_limits (client_hash, last_post_at, day_key, daily_count)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(client_hash) DO UPDATE SET
       last_post_at = excluded.last_post_at,
       day_key = excluded.day_key,
       daily_count = CASE WHEN rate_limits.day_key = excluded.day_key
         THEN rate_limits.daily_count + 1 ELSE 1 END`,
  ).bind(clientHash, now, dayKey).run();
}

async function enforceFoodUploadLimit(database, clientHash, networkHash, byteSize, now) {
  const dayKey = new Date(now * 1000).toISOString().slice(0, 10);
  const rate = await database.prepare(
    "SELECT last_upload_at, day_key, daily_count, daily_bytes FROM food_upload_limits WHERE client_hash = ?",
  ).bind(clientHash).first();
  const sameDay = rate?.day_key === dayKey;
  const dailyCount = sameDay ? Number(rate.daily_count) : 0;
  const dailyBytes = sameDay ? Number(rate.daily_bytes) : 0;
  if (dailyCount >= MAX_UPLOADS_PER_DAY || dailyBytes + byteSize > MAX_UPLOAD_BYTES_PER_DAY) {
    await logFoodAbuse(database, clientHash, networkHash, "client_upload_limit", now);
    throw new FoodError(429, "This device has reached today’s photo upload limit.", "daily_upload_limit");
  }
  if (networkHash) {
    const network = await database.prepare(
      "SELECT day_key, upload_count, upload_bytes FROM food_network_limits WHERE network_hash = ?",
    ).bind(networkHash).first();
    const sameNetworkDay = network?.day_key === dayKey;
    const networkCount = sameNetworkDay ? Number(network.upload_count) : 0;
    const networkBytes = sameNetworkDay ? Number(network.upload_bytes) : 0;
    if (networkCount >= MAX_NETWORK_UPLOADS_PER_DAY || networkBytes + byteSize > MAX_NETWORK_UPLOAD_BYTES_PER_DAY) {
      await logFoodAbuse(database, clientHash, networkHash, "network_upload_limit", now);
      throw new FoodError(429, "This network has reached today’s photo upload limit.", "network_upload_limit");
    }
  }
  await database.prepare(
    `INSERT INTO food_upload_limits
       (client_hash, last_upload_at, day_key, daily_count, daily_bytes)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(client_hash) DO UPDATE SET
       last_upload_at = excluded.last_upload_at,
       day_key = excluded.day_key,
       daily_count = CASE WHEN food_upload_limits.day_key = excluded.day_key
         THEN food_upload_limits.daily_count + 1 ELSE 1 END,
       daily_bytes = CASE WHEN food_upload_limits.day_key = excluded.day_key
         THEN food_upload_limits.daily_bytes + excluded.daily_bytes ELSE excluded.daily_bytes END`,
  ).bind(clientHash, now, dayKey, byteSize).run();
  if (networkHash) {
    await database.prepare(
      `INSERT INTO food_network_limits
         (network_hash, day_key, upload_count, upload_bytes, write_count, last_write_at)
       VALUES (?, ?, 1, ?, 0, ?)
       ON CONFLICT(network_hash) DO UPDATE SET
         day_key = excluded.day_key,
         upload_count = CASE WHEN food_network_limits.day_key = excluded.day_key
           THEN food_network_limits.upload_count + 1 ELSE 1 END,
         upload_bytes = CASE WHEN food_network_limits.day_key = excluded.day_key
           THEN food_network_limits.upload_bytes + excluded.upload_bytes ELSE excluded.upload_bytes END,
         write_count = CASE WHEN food_network_limits.day_key = excluded.day_key
           THEN food_network_limits.write_count ELSE 0 END,
         last_write_at = excluded.last_write_at`,
    ).bind(networkHash, dayKey, byteSize, now).run();
  }
}

async function enforceNetworkWriteLimit(database, networkHash, clientHash, now) {
  if (!networkHash) return;
  const dayKey = new Date(now * 1000).toISOString().slice(0, 10);
  const rate = await database.prepare(
    "SELECT day_key, write_count FROM food_network_limits WHERE network_hash = ?",
  ).bind(networkHash).first();
  const count = rate?.day_key === dayKey ? Number(rate.write_count) : 0;
  if (count >= MAX_NETWORK_WRITES_PER_DAY) {
    await logFoodAbuse(database, clientHash, networkHash, "network_write_limit", now);
    throw new FoodError(429, "This network has reached today’s contribution limit.", "network_write_limit");
  }
  await database.prepare(
    `INSERT INTO food_network_limits
       (network_hash, day_key, upload_count, upload_bytes, write_count, last_write_at)
     VALUES (?, ?, 0, 0, 1, ?)
     ON CONFLICT(network_hash) DO UPDATE SET
       day_key = excluded.day_key,
       upload_count = CASE WHEN food_network_limits.day_key = excluded.day_key
         THEN food_network_limits.upload_count ELSE 0 END,
       upload_bytes = CASE WHEN food_network_limits.day_key = excluded.day_key
         THEN food_network_limits.upload_bytes ELSE 0 END,
       write_count = CASE WHEN food_network_limits.day_key = excluded.day_key
         THEN food_network_limits.write_count + 1 ELSE 1 END,
       last_write_at = excluded.last_write_at`,
  ).bind(networkHash, dayKey, now).run();
}

async function logFoodAbuse(database, actorHash, networkHash, eventType, now) {
  await database.prepare(
    "INSERT INTO food_abuse_events (id, actor_hash, network_hash, event_type, created_at) VALUES (?, ?, ?, ?, ?)",
  ).bind(crypto.randomUUID(), actorHash || null, networkHash || null, eventType, now).run();
  const weight = eventType === "duplicate_post" ? 3 : eventType === "automated_frequency" ? 10 : 5;
  if (actorHash) await addFoodRisk(database, "client", actorHash, weight, now);
  if (networkHash) await addFoodRisk(database, "network", networkHash, Math.max(1, Math.floor(weight / 3)), now);
}

async function enforceFoodAbuseShield(database, clientHash, networkHash, now) {
  const subjects = [
    { type: "client", hash: clientHash, burstLimit: 20 },
    ...(networkHash ? [{ type: "network", hash: networkHash, burstLimit: 120 }] : []),
  ];
  for (const subject of subjects) {
    const blocked = await database.prepare(
      "SELECT blocked_until FROM food_block_list WHERE subject_type = ? AND subject_hash = ?",
    ).bind(subject.type, subject.hash).first();
    if (Number(blocked?.blocked_until ?? 0) > now) {
      await database.prepare(
        "UPDATE food_block_list SET last_seen_at = ? WHERE subject_type = ? AND subject_hash = ?",
      ).bind(now, subject.type, subject.hash).run();
      throw new FoodError(403, "Posting is temporarily blocked because automated activity was detected.", "temporarily_blocked");
    }

    const state = await database.prepare(
      "SELECT window_started_at, window_count FROM food_abuse_state WHERE subject_type = ? AND subject_hash = ?",
    ).bind(subject.type, subject.hash).first();
    const inWindow = state && now - Number(state.window_started_at) < 60;
    const nextCount = inWindow ? Number(state.window_count) + 1 : 1;
    await database.prepare(
      `INSERT INTO food_abuse_state
         (subject_type, subject_hash, window_started_at, window_count, risk_score, last_seen_at)
       VALUES (?, ?, ?, 1, 0, ?)
       ON CONFLICT(subject_type, subject_hash) DO UPDATE SET
         window_started_at = CASE WHEN ? - food_abuse_state.window_started_at < 60
           THEN food_abuse_state.window_started_at ELSE ? END,
         window_count = CASE WHEN ? - food_abuse_state.window_started_at < 60
           THEN food_abuse_state.window_count + 1 ELSE 1 END,
         last_seen_at = ?`,
    ).bind(subject.type, subject.hash, now, now, now, now, now, now).run();
    if (nextCount > subject.burstLimit) {
      await logFoodAbuse(database, clientHash, networkHash, "automated_frequency", now);
      throw new FoodError(429, "Requests are arriving too quickly. Posting has been temporarily paused.", "automated_frequency");
    }
  }
}

async function addFoodRisk(database, subjectType, subjectHash, weight, now) {
  await database.prepare(
    `INSERT INTO food_abuse_state
       (subject_type, subject_hash, window_started_at, window_count, risk_score, last_seen_at)
     VALUES (?, ?, ?, 0, ?, ?)
     ON CONFLICT(subject_type, subject_hash) DO UPDATE SET
       risk_score = food_abuse_state.risk_score + excluded.risk_score,
       last_seen_at = excluded.last_seen_at`,
  ).bind(subjectType, subjectHash, now, weight, now).run();
  const state = await database.prepare(
    "SELECT risk_score FROM food_abuse_state WHERE subject_type = ? AND subject_hash = ?",
  ).bind(subjectType, subjectHash).first();
  const threshold = subjectType === "client" ? 10 : 30;
  if (Number(state?.risk_score ?? 0) < threshold) return;
  const duration = subjectType === "client" ? 24 * 60 * 60 : 60 * 60;
  await database.prepare(
    `INSERT INTO food_block_list
       (subject_type, subject_hash, reason, blocked_until, created_at, last_seen_at)
     VALUES (?, ?, 'automated_abuse', ?, ?, ?)
     ON CONFLICT(subject_type, subject_hash) DO UPDATE SET
       reason = excluded.reason,
       blocked_until = MAX(food_block_list.blocked_until, excluded.blocked_until),
       last_seen_at = excluded.last_seen_at`,
  ).bind(subjectType, subjectHash, now + duration, now, now).run();
}

async function reserveFoodStorage(database, byteSize, configuredLimit, now) {
  const requestedLimit = Number(configuredLimit);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(10 * 1024 * 1024 * 1024, Math.max(1024 * 1024, Math.trunc(requestedLimit)))
    : DEFAULT_STORAGE_LIMIT_BYTES;
  await database.prepare(
    "UPDATE food_storage_usage SET max_bytes = MIN(max_bytes, ?), updated_at = ? WHERE id = 1",
  ).bind(limit, now).run();
  const reservation = await database.prepare(
    `UPDATE food_storage_usage
        SET used_bytes = used_bytes + ?, updated_at = ?
      WHERE id = 1 AND used_bytes + ? <= max_bytes`,
  ).bind(byteSize, now, byteSize).run();
  if (!Number(reservation.meta?.changes)) {
    throw new FoodError(507, "Photo storage has reached its safety limit. Try again later.", "storage_limit_reached");
  }
  const usage = await database.prepare(
    "SELECT used_bytes, max_bytes FROM food_storage_usage WHERE id = 1",
  ).first();
  const usedBytes = Number(usage?.used_bytes ?? 0);
  const maxBytes = Number(usage?.max_bytes ?? limit);
  return { usedBytes, maxBytes, percent: Math.min(100, Math.round((usedBytes / maxBytes) * 1000) / 10) };
}

async function releaseFoodStorage(database, byteSize, now) {
  await database.prepare(
    "UPDATE food_storage_usage SET used_bytes = MAX(0, used_bytes - ?), updated_at = ? WHERE id = 1",
  ).bind(byteSize, now).run();
}

function serializeFoodShout(row, request, clientHash) {
  const tried = serializeTriedCounts({
    tried_count: row.tried_count,
    positive_count: row.would_get_again_count,
  });
  const origin = new URL(request.url).origin;
  const images = parseFoodImages(row.images_json, row).map((image) => ({
    ...image,
    url: `${origin}/api/images/${encodeURIComponent(image.objectKey)}`,
  }));
  const publicRank = publicRankInfo(row);
  return {
    id: row.id,
    title: row.title,
    displayName: row.display_name || "Food explorer",
    caption: row.caption || "",
    latitude: Number(row.latitude_e6) / 1_000_000,
    longitude: Number(row.longitude_e6) / 1_000_000,
    locationLabel: row.location_label,
    placeName: row.place_name,
    provider: row.provider,
    providerPlaceId: row.provider_place_id,
    cuisine: row.cuisine,
    shoutType: row.shout_type,
    priceText: row.price_text,
    priceNumeric: row.price_numeric === null || row.price_numeric === undefined ? null : Number(row.price_numeric),
    vibeTags: parseJsonArray(row.vibe_tags_json),
    geohash: row.geohash,
    imageKey: row.image_key,
    imageUrl: images[0]?.url || `${origin}/api/images/${encodeURIComponent(row.image_key)}`,
    imageWidth: Number(row.image_width || 0) || null,
    imageHeight: Number(row.image_height || 0) || null,
    images,
    venueAnchorId: row.venue_anchor_id,
    createdAt: new Date(Number(row.created_at) * 1000).toISOString(),
    updatedAt: new Date(Number(row.updated_at) * 1000).toISOString(),
    expiresAt: row.expires_at ? new Date(Number(row.expires_at) * 1000).toISOString() : null,
    status: row.status,
    likeCount: Number(row.like_count ?? 0),
    saveCount: Number(row.save_count ?? 0),
    commentCount: Number(row.comment_count ?? 0),
    viewerLiked: Boolean(row.viewer_liked),
    viewerSaved: Boolean(row.viewer_saved),
    viewerOwned: row.author_hash === clientHash,
    // This is deliberately only a visual treatment. It carries no author id,
    // name, level, or exact rank—just a subtle colour for veteran food finds.
    rankAccent: publicRank.accent,
    rankLabel: publicRank.label,
    rating: {
      average: Number(Number(row.rating_average || 0).toFixed(1)),
      count: Number(row.rating_count || 0),
      viewerValue: row.viewer_rating === null || row.viewer_rating === undefined ? null : Number(row.viewer_rating),
    },
    freshness: serializeVerificationCounts(row),
    tried,
    activityTier: activityTier(row),
  };
}

function publicRankInfo(row) {
  const postXp = Math.max(0, Number(row.author_post_count || 0)) * FOOD_XP_BASE;
  const areaXp = Math.max(0, Number(row.author_area_count || 0)) * FOOD_XP_NEW_AREA;
  const engagementXp = Math.max(0, Math.min(10_000, Number(row.author_engagement_xp || 0)));
  const bonusXp = Math.max(0, Math.min(FOOD_XP_MAX_BONUS, Number(row.author_xp_bonus || 0)));
  const level = foodLevelForXp(postXp + areaXp + engagementXp + bonusXp);
  const ranks = ["Bronze", "Silver", "Gold", "Plat", "Diamond", "Aurora", "Comet", "Nova", "Nebula", "Celestial", "Mythic", "Eternal", "Starlight", "Orbit", "Cosmic", "Prism", "Legend"];
  const rankIndex = Math.min(ranks.length - 1, Math.floor((level - 1) / 4));
  const accent = ["", "", "", "", "#7564d8", "#d44c91", "#3287d9", "#ef6b38", "#7a57d2", "#159eaa", "#bd3f6e", "#6f4db7", "#4f88dc", "#2a9d83", "#9b58cf", "#e26370", "#ba8518"][rankIndex] || "";
  // Keep the person anonymous: this is a post status, never an account identity.
  return accent ? { accent, label: `${ranks[rankIndex]} food find` } : { accent: "", label: "" };
}

function parseFoodImages(value, row) {
  try {
    const parsed = JSON.parse(value || "[]");
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.slice(0, MAX_IMAGES_PER_SHOUT).map((image) => ({
        objectKey: String(image.objectKey),
        width: Number(image.width || 0) || null,
        height: Number(image.height || 0) || null,
      }));
    }
  } catch {
    // Fall through to the legacy primary image.
  }
  return [{
    objectKey: row.image_key,
    width: Number(row.image_width || 0) || null,
    height: Number(row.image_height || 0) || null,
  }];
}

function serializeFoodComment(row) {
  return {
    id: row.id,
    shoutId: row.shout_id,
    parentCommentId: row.parent_comment_id || null,
    body: row.body,
    displayName: row.display_name || "Food explorer",
    tone: row.tone || "helpful",
    createdAt: new Date(Number(row.created_at) * 1000).toISOString(),
    viewerOwned: Boolean(row.viewer_owned),
  };
}

function serializeVerificationCounts(row) {
  const confirmed = Number(row?.confirmed_count ?? row?.confirmed ?? 0);
  const unsure = Number(row?.unsure_count ?? row?.unsure ?? 0);
  const gone = Number(row?.gone_count ?? row?.gone ?? 0);
  return { confirmed, unsure, gone, label: confirmed > gone ? "Fresh" : gone > confirmed ? "Changed" : "Unconfirmed" };
}

function serializeTriedCounts(row) {
  const total = Number(row?.tried_count ?? 0);
  const positive = Number(row?.positive_count ?? row?.would_get_again_count ?? 0);
  const confidenceWeight = 3;
  const priorPositiveRate = .7;
  const adjustedWouldGetAgain = Math.round(((positive + confidenceWeight * priorPositiveRate) / (total + confidenceWeight)) * 100);
  return { total, wouldGetAgain: positive, adjustedWouldGetAgain, confidenceWeight, priorPositiveRate };
}

function activityTier(row) {
  const activity = Number(row.like_count ?? 0) + Number(row.comment_count ?? 0) + Number(row.confirmed_count ?? 0);
  if (activity >= 5) return "hotspot";
  if (activity >= 2) return "rising";
  return "gem";
}

function normalizeBounds(url) {
  const number = (key, fallback) => {
    const value = Number(url.searchParams.get(key));
    return Number.isFinite(value) ? value : fallback;
  };
  const west = Math.max(ASIA_PACIFIC_BOUNDS.west, number("west", ASIA_PACIFIC_BOUNDS.west));
  const south = Math.max(ASIA_PACIFIC_BOUNDS.south, number("south", ASIA_PACIFIC_BOUNDS.south));
  const east = Math.min(ASIA_PACIFIC_BOUNDS.east, number("east", ASIA_PACIFIC_BOUNDS.east));
  const north = Math.min(ASIA_PACIFIC_BOUNDS.north, number("north", ASIA_PACIFIC_BOUNDS.north));
  if (west >= east || south >= north) throw new FoodError(400, "Use valid map bounds.");
  return {
    westE6: Math.round(west * 1_000_000),
    southE6: Math.round(south * 1_000_000),
    eastE6: Math.round(east * 1_000_000),
    northE6: Math.round(north * 1_000_000),
  };
}

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

function normalizeSearchQuery(value) {
  return String(value ?? "").normalize("NFKC").replace(FORMAT_CONTROL_PATTERN, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

function normalizeVibes(value) {
  if (!Array.isArray(value)) return [];
  const vibes = [...new Set(value.map(String).filter((item) => VIBE_TAGS.has(item)))];
  if (vibes.length > 3) throw new FoodError(400, "Choose up to three vibe tags.");
  return vibes;
}

function normalizeImageKeys(value) {
  if (!Array.isArray(value)) {
    throw new FoodError(400, "Add between one and three food photos.");
  }
  const keys = [...new Set(value.map((key) => String(key).trim()))];
  if (keys.length < 1 || keys.length > MAX_IMAGES_PER_SHOUT) {
    throw new FoodError(400, "Add between one and three food photos.");
  }
  if (keys.some((key) => key.length > 300 || !key.startsWith("food-shouts/"))) {
    throw new FoodError(400, "One of the uploaded photos is invalid.");
  }
  return keys;
}

function normalizeToken(value, maxLength) {
  const token = String(value ?? "").trim();
  return token ? token.slice(0, maxLength) : null;
}

function normalizeVenueName(value) {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function parsePrice(value) {
  if (!value) return null;
  const matches = value.match(/(?:\$|aud\s*)?(\d{1,6}(?:\.\d{1,2})?)/i);
  if (!matches) return null;
  const price = Number(matches[1]);
  return Number.isFinite(price) ? price : null;
}

function finiteCoordinate(value, min, max, label) {
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate) || coordinate < min || coordinate > max) throw new FoodError(400, `Choose a valid ${label}.`);
  return coordinate;
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function optionalInteger(value, min, max) {
  if (value === null || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}

function sniffImageMime(bytes) {
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.trunc(number))) : fallback;
}

async function readJson(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 16_384) throw new FoodError(413, "Request is too large.");
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) throw new FoodError(415, "Send JSON content.");
  try {
    return await request.json();
  } catch {
    throw new FoodError(400, "Invalid request data.");
  }
}

async function getClientHash(request) {
  const token = request.headers.get("x-shout-client") ?? "";
  if (!CLIENT_TOKEN_PATTERN.test(token)) throw new FoodError(400, "This device needs a valid anonymous session.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getNetworkHash(request) {
  const address = request.headers.get("cf-connecting-ip") || "";
  if (!address) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`food-network:${address}`));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

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
      character |= 1 << (4 - bit);
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

function unixNow() {
  return Math.floor(Date.now() / 1000);
}
