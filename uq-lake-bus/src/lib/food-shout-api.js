import { SHOUTOUT_API_URL } from "./shoutout-api";

const CLIENT_STORAGE_KEY = "uq-shout-client-v1";

export function listFoodShouts({ bounds, cuisine, type, query, mine, saved, budget, signal } = {}) {
  const params = new URLSearchParams({ limit: "120" });
  if (bounds) Object.entries(bounds).forEach(([key, value]) => params.set(key, String(value)));
  if (cuisine && cuisine !== "All") params.set("cuisine", cuisine);
  if (type && type !== "all") params.set("type", type);
  if (query) params.set("q", query);
  if (mine) params.set("mine", "1");
  if (saved) params.set("saved", "1");
  if (budget) params.set("budget", "1");
  return request(`/api/shouts?${params}`, { signal });
}

export function getFoodShout(id, signal) {
  return request(`/api/shouts/${encodeURIComponent(id)}`, { signal });
}

export function createFoodShout(body) {
  return request("/api/shouts", { method: "POST", body });
}

export function deleteFoodShout(id) {
  return request(`/api/shouts/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function updateFoodShout(id, body) {
  return request(`/api/shouts/${encodeURIComponent(id)}`, { method: "PATCH", body });
}

export function searchFoodPlaces(query, center = {}, signal) {
  const params = new URLSearchParams({ q: query });
  if (Number.isFinite(center.latitude) && Number.isFinite(center.longitude)) {
    params.set("lat", String(center.latitude));
    params.set("lon", String(center.longitude));
  }
  ["west", "south", "east", "north"].forEach((key) => {
    if (Number.isFinite(center[key])) params.set(key, String(center[key]));
  });
  if (center.unbounded) params.set("unbounded", "1");
  return request(`/api/places/search?${params}`, { signal });
}

export function listFoodComments(id, signal) {
  return request(`/api/shouts/${encodeURIComponent(id)}/comments`, { signal });
}

export function listFoodActivity(signal) {
  return request("/api/notifications", { signal });
}

export function markFoodActivityRead() {
  return request("/api/notifications/read", { method: "POST", body: {} });
}

export function createFoodComment(id, body, parentCommentId = null, displayName = "Food explorer", tone = "helpful") {
  return request(`/api/shouts/${encodeURIComponent(id)}/comments`, {
    method: "POST",
    body: { body, parentCommentId, displayName, tone },
  });
}

export function deleteFoodComment(id) {
  return request(`/api/comments/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function toggleFoodReaction(id, kind, active) {
  return request(`/api/shouts/${encodeURIComponent(id)}/${kind}`, {
    method: active ? "DELETE" : "POST",
  });
}

export function rateFoodShout(id, rating) {
  return request(`/api/shouts/${encodeURIComponent(id)}/rating`, {
    method: "POST",
    body: { rating },
  });
}

export function reportFoodShout(id, reason = "other") {
  return request(`/api/shouts/${encodeURIComponent(id)}/report`, {
    method: "POST",
    body: { reason },
  });
}

export function reportFoodComment(id, reason = "other") {
  return request(`/api/comments/${encodeURIComponent(id)}/report`, {
    method: "POST",
    body: { reason },
  });
}

export function verifyFoodShout(id, status) {
  return request(`/api/shouts/${encodeURIComponent(id)}/verify`, {
    method: "POST",
    body: { status },
  });
}

export function markFoodTried(id, verdict) {
  return request(`/api/shouts/${encodeURIComponent(id)}/tried`, {
    method: "POST",
    body: { verdict },
  });
}

export function uploadFoodImage({ blob, width, height, postId, onProgress }) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
    form.append("image", blob, `food-${postId}.${extension}`);
    form.append("width", String(width));
    form.append("height", String(height));
    form.append("postId", postId);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SHOUTOUT_API_URL}/api/uploads`);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("X-Shout-Client", getClientId());
    xhr.timeout = 90_000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error("The photo could not reach the server. Check your connection and try again."));
    xhr.ontimeout = () => reject(new Error("The photo upload took too long. Try Wi-Fi or upload one photo first."));
    xhr.onload = () => {
      let payload = {};
      try { payload = JSON.parse(xhr.responseText || "{}"); }
      catch { payload = {}; }
      if (xhr.status < 200 || xhr.status >= 300) {
        const error = new Error(payload.error || `The photo upload failed (${xhr.status || "network"}).`);
        error.status = xhr.status;
        reject(error);
      } else resolve(payload);
    };
    xhr.send(form);
  });
}

async function request(path, options = {}) {
  const controller = options.signal ? null : new AbortController();
  const timeoutId = controller ? window.setTimeout(() => controller.abort(), 12_000) : null;
  try {
    const response = await fetch(`${SHOUTOUT_API_URL}${path}`, {
      method: options.method || "GET",
      signal: options.signal || controller?.signal,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        "X-Shout-Client": getClientId(),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || "Foodie Finds is unavailable right now.");
      error.status = response.status;
      error.code = payload.code;
      throw error;
    }
    return payload;
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

function getClientId() {
  try {
    const saved = localStorage.getItem(CLIENT_STORAGE_KEY);
    if (saved) return saved;
    const value = `uq_${crypto.randomUUID().replaceAll("-", "")}`;
    localStorage.setItem(CLIENT_STORAGE_KEY, value);
    return value;
  } catch {
    return `uq_${crypto.randomUUID().replaceAll("-", "")}`;
  }
}
