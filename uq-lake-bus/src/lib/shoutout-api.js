export const SHOUTOUT_API_URL = (
  import.meta.env.VITE_SHOUTOUT_API_URL ||
  "https://uq-helper-api.zeyi-yang.workers.dev"
).replace(/\/$/, "");

export const SHOUTOUT_PLACES = Object.freeze([
  {
    id: "law",
    label: "Forgan Smith / Law",
    shortLabel: "Law",
    latitude: -27.4951,
    longitude: 153.0131,
    mapX: 25,
    mapY: 22,
  },
  {
    id: "central-library",
    label: "Central Library",
    shortLabel: "Library",
    latitude: -27.4960,
    longitude: 153.0145,
    mapX: 61,
    mapY: 24,
  },
  {
    id: "great-court",
    label: "Great Court",
    shortLabel: "Great Court",
    latitude: -27.4971,
    longitude: 153.0133,
    mapX: 42,
    mapY: 43,
  },
  {
    id: "student-union",
    label: "Student Union",
    shortLabel: "Union",
    latitude: -27.4977,
    longitude: 153.0152,
    mapX: 66,
    mapY: 50,
  },
  {
    id: "uq-centre",
    label: "UQ Centre",
    shortLabel: "UQ Centre",
    latitude: -27.4990,
    longitude: 153.0144,
    mapX: 41,
    mapY: 72,
  },
  {
    id: "hawken",
    label: "Hawken Engineering",
    shortLabel: "Hawken",
    latitude: -27.4990,
    longitude: 153.0163,
    mapX: 69,
    mapY: 72,
  },
  {
    id: "uq-lakes",
    label: "UQ Lakes",
    shortLabel: "UQ Lakes",
    latitude: -27.4976,
    longitude: 153.0177,
    mapX: 84,
    mapY: 45,
  },
]);

const CLIENT_STORAGE_KEY = "uq-shout-client-v1";

export async function fetchShoutOuts(placeId, options = {}) {
  return apiRequest(`/api/messages?place=${encodeURIComponent(placeId)}&limit=40`, {
    signal: options.signal,
  });
}

export async function fetchShoutOutSummary(options = {}) {
  return apiRequest("/api/summary", { signal: options.signal });
}

export async function createShoutOut({ placeId, message, emoji = "" }) {
  return apiRequest("/api/messages", {
    method: "POST",
    body: { placeId, message, emoji },
  });
}

export async function reactToShoutOut(messageId, emoji) {
  return apiRequest(`/api/messages/${encodeURIComponent(messageId)}/react`, {
    method: "POST",
    body: { emoji },
  });
}

export async function reportShoutOut(messageId) {
  return apiRequest(`/api/messages/${encodeURIComponent(messageId)}/report`, {
    method: "POST",
    body: {},
  });
}

async function apiRequest(path, options = {}) {
  const controller = options.signal ? null : new AbortController();
  const timeoutId = controller
    ? window.setTimeout(() => controller.abort(), 9000)
    : null;

  try {
    const response = await fetch(`${SHOUTOUT_API_URL}${path}`, {
      method: options.method ?? "GET",
      signal: options.signal ?? controller?.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Shout-Client": getAnonymousClientId(),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || "The shout-out service is unavailable.");
      error.status = response.status;
      throw error;
    }
    return payload;
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

function getAnonymousClientId() {
  try {
    const saved = window.localStorage.getItem(CLIENT_STORAGE_KEY);
    if (saved) return saved;

    const generated = `uq_${crypto.randomUUID().replaceAll("-", "")}`;
    window.localStorage.setItem(CLIENT_STORAGE_KEY, generated);
    return generated;
  } catch {
    return `uq_${crypto.randomUUID().replaceAll("-", "")}`;
  }
}
