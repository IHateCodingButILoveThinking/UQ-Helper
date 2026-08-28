import { parseGoogleMapsLink } from "../../shared/google-maps-link.js";
import { searchFoodPlaces } from "./food-shout-api";

const cache = new Map();
const placeCache = new Map();

function matchText(value) {
  return String(value || "").normalize("NFKD").toLowerCase()
    .replace(/\p{M}/gu, "")
    .replace(/\bqueensland\b/g, "qld").replace(/\bnew south wales\b/g, "nsw")
    .replace(/\bvictoria\b/g, "vic").replace(/\bwestern australia\b/g, "wa")
    .replace(/\bsouth australia\b/g, "sa").replace(/\btasmania\b/g, "tas")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

// Name-only share links need geocoding, not the user's GPS or the current map centre.
// Reuse the existing rate-limited, cached place service; never select a first result blindly.
export async function findGooglePlaceMatches(query, context = {}, signal) {
  const fullQuery = String(query || "").trim();
  if (fullQuery.length < 2) return [];
  const key = `${fullQuery}:${Number(context.latitude || 0).toFixed(2)}:${Number(context.longitude || 0).toFixed(2)}`;
  const saved = placeCache.get(key);
  if (saved?.expires > Date.now()) return saved.matches;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const payload = await searchFoodPlaces(fullQuery.slice(0, 80), {
      latitude: context.latitude, longitude: context.longitude, unbounded: true,
    }, controller.signal);
    const nameTokens = matchText(fullQuery.split(",")[0]).split(" ").filter(Boolean);
    const queryTokens = matchText(fullQuery).split(" ").filter((token) => token.length > 1);
    const seen = new Set();
    const matches = (payload.results || []).filter((place) => {
      if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)
        || Math.abs(place.latitude) > 90 || Math.abs(place.longitude) > 180) return false;
      const name = matchText([place.name, place.secondaryName].filter(Boolean).join(" "));
      const address = matchText([place.name, place.secondaryName, place.label, place.city, place.suburb, place.state].filter(Boolean).join(" "));
      const nameMatches = nameTokens.length > 0 && nameTokens.every((token) => name.includes(token));
      const addressMatches = queryTokens.length > 0 && queryTokens.filter((token) => address.includes(token)).length / queryTokens.length >= .8;
      if (!nameMatches || !addressMatches) return false;
      const identity = place.providerPlaceId || `${place.latitude}:${place.longitude}`;
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
    if (matches.length) {
      placeCache.set(key, { matches, expires: Date.now() + 3600000 });
      while (placeCache.size > 32) placeCache.delete(placeCache.keys().next().value);
    }
    return matches;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (controller.signal.aborted) throw new Error("Location lookup took too long. Tap Use this location to retry.");
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}

export async function importGoogleMapsLink(value, signal) {
  const parsed = parseGoogleMapsLink(value);
  if (parsed.location) return parsed;
  const cached = cache.get(parsed.url);
  if (cached?.expires > Date.now()) return cached.result;
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 11000);
  try {
    // Same-origin route: local Express in development, Vercel in production.
    // The browser cannot read Google share-link redirects directly across origins.
    const response = await fetch("/api/maps-link", {
      method: "POST", signal: controller.signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ url: parsed.url }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) throw new Error(payload?.error
      || "Link lookup isn't available yet. Try again, or search the store's name.");
    let location = null;
    if (payload.location) {
      const coordinates = parseGoogleMapsLink(`${payload.location.latitude},${payload.location.longitude}`).location;
      location = { ...coordinates, name: String(payload.location.name || "").slice(0, 160) };
    }
    const result = { location, query: String(payload.query || "").slice(0, 160) };
    if (location || result.query) {
      cache.set(parsed.url, { result, expires: Date.now() + 3600000 });
      while (cache.size > 32) cache.delete(cache.keys().next().value);
    }
    return result;
  } catch (error) {
    if (timedOut) throw new Error("Google is taking too long. Try again, or search the store's name.");
    if (error instanceof TypeError) throw new Error("Couldn't connect. Check your connection and try again.");
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}
