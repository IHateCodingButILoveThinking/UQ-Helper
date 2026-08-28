import { load } from "cheerio";
import { googleMapsUrl, parseGoogleMapsLink } from "../shared/google-maps-link.js";

const cache = new Map();
const pending = new Map();
let windowStarted = Date.now();
let lookups = 0;
const HOUR = 60 * 60 * 1000;

function failure(message, status = 422) {
  return Object.assign(new Error(message), { status });
}

async function readSmallPage(response) {
  if (!response.body) return "";
  if (Number(response.headers.get("content-length")) > 524288) {
    await response.body.cancel();
    return "";
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 524288) break;
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally { await reader.cancel().catch(() => {}); }
}

async function expandLink(start) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let url = start;
  let fallback = parseGoogleMapsLink(start);
  const visited = new Set();
  try {
    for (let hop = 0; hop < 6; hop += 1) {
      // Validate EVERY redirect. This endpoint is never a general URL proxy.
      const current = googleMapsUrl(url);
      if (visited.has(current.href)) break;
      visited.add(current.href);
      const parsed = parseGoogleMapsLink(current.href);
      if (parsed.location) return parsed;
      if (parsed.query) fallback = parsed;
      if (/\/dir(?:\/|$)/i.test(current.pathname)) break;
      const embedded = current.searchParams.get("link");
      if (embedded) { url = googleMapsUrl(embedded).href; continue; }
      const response = await fetch(current, {
        redirect: "manual", signal: controller.signal,
        headers: { Accept: "text/html", "Accept-Language": "en" },
      });
      const redirect = response.headers.get("location");
      if ([301, 302, 303, 307, 308].includes(response.status) && redirect) {
        await response.body?.cancel();
        url = googleMapsUrl(new URL(redirect, current).href).href;
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw failure("Google couldn't open this share link. Copy the place's link again, or search its name.");
      }
      // Some share links serve a landing page rather than an HTTP redirect.
      // Only follow explicit canonical/redirect metadata, never arbitrary page coordinates.
      const html = await readSmallPage(response);
      const $ = load(html);
      const refresh = $('meta[http-equiv="refresh" i]').attr("content") || "";
      const candidates = [
        $('meta[property="og:url"]').attr("content"),
        $('link[rel="canonical"]').attr("href"),
        refresh.match(/url\s*=\s*["']?(.+?)["']?\s*$/i)?.[1],
      ];
      let next = "";
      for (const candidate of candidates.filter(Boolean)) {
        try {
          const safe = googleMapsUrl(new URL(candidate, current).href);
          const result = parseGoogleMapsLink(safe.href);
          if (result.location) return result;
          if (result.query) fallback = result;
          if (!visited.has(safe.href)) next ||= safe.href;
        } catch { /* Ignore non-Maps metadata, including consent/login links. */ }
      }
      if (!next) break;
      url = next;
    }
    return { location: null, query: fallback.query, url: fallback.url };
  } catch (error) {
    if (controller.signal.aborted) throw failure("Google is taking too long. Try again, or search the place's name.", 504);
    if (error.status) throw error;
    throw failure("This link couldn't be opened. Try a place's Share link, or search its name.", 502);
  } finally { clearTimeout(timer); }
}

export async function resolveGoogleMapsLink(value) {
  let parsed;
  try { parsed = parseGoogleMapsLink(value); } catch (error) { throw failure(error.message, 400); }
  if (parsed.location) return parsed;
  const key = parsed.url;
  const saved = cache.get(key);
  if (saved?.expires > Date.now()) return saved.value;
  cache.delete(key);
  if (pending.has(key)) return pending.get(key);
  if (Date.now() - windowStarted >= HOUR) { windowStarted = Date.now(); lookups = 0; }
  // Bounded, per-process protection; not an account-wide billing guarantee.
  if (lookups >= 60 || pending.size >= 3) throw failure("Link lookup is busy. Try again later, or search the store's name.", 429);
  lookups += 1;
  const task = expandLink(key).then((result) => {
    if (result.location || result.query) {
      cache.set(key, { value: result, expires: Date.now() + HOUR });
      while (cache.size > 128) cache.delete(cache.keys().next().value);
    }
    return result;
  }).finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}

export async function googleMapsLinkResponse(value) {
  try { return { status: 200, body: await resolveGoogleMapsLink(value) }; }
  catch (error) { return { status: error.status || 502, body: { error: error.message } }; }
}
