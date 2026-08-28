// Shared by the browser and link resolver. Map viewport centres are NOT place pins.
const MAP_DOMAINS = new Set([
  "google.com", "google.com.au", "google.co.nz", "google.co.uk", "google.ca",
  "google.cn", "google.com.hk", "google.com.tw", "google.com.sg", "google.com.my",
  "google.co.jp", "google.co.kr", "google.co.in", "google.co.id", "google.co.th",
  "google.com.vn", "google.com.ph", "google.de", "google.fr",
]);
const PAIR = /^\s*([+-]?\d+(?:\.\d+)?)\s*[,\s]\s*([+-]?\d+(?:\.\d+)?)\s*$/;

function decode(value) {
  try { return decodeURIComponent(value); } catch { return value; }
}

function point(latitude, longitude, name = "") {
  latitude = Number(latitude);
  longitude = Number(longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude, name: name.slice(0, 160),
    label: `${Math.abs(latitude).toFixed(6)}° ${latitude < 0 ? "S" : "N"}, ${Math.abs(longitude).toFixed(6)}° ${longitude < 0 ? "W" : "E"}` };
}

export function googleMapsUrl(value) {
  const raw = String(value || "").trim();
  if (raw.length > 4096) throw new Error("That link is too long. Copy the place's Share link again.");
  // Maps can share a place name and URL together, not just a bare URL.
  const extracted = raw.match(/https?:\/\/[^\s<>"“”]+/i)?.[0]?.replace(/[.,;!?)\]}>]+$/, "");
  let url;
  try { url = new URL(extracted || raw); } catch {
    throw new Error("Paste a Google Maps link, or latitude and longitude.");
  }
  const host = url.hostname.toLowerCase();
  const domain = host.replace(/^(?:www\.|maps\.)/, "");
  const short = (host === "maps.app.goo.gl" && /^\/[a-z0-9_-]+\/?$/i.test(url.pathname))
    || (host === "goo.gl" && /^\/maps\/[a-z0-9_-]+\/?$/i.test(url.pathname));
  const full = MAP_DOMAINS.has(domain)
    && (host === `maps.${domain}` || /^\/maps(?:\/|$)/.test(url.pathname));
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port || (!short && !full)) {
    throw new Error("Use a Google Maps place link—not a website or another app's link.");
  }
  url.protocol = "https:";
  url.hash = "";
  return url;
}

export function parseGoogleMapsLink(value) {
  const raw = String(value || "").trim();
  const coordinates = raw.match(PAIR);
  if (coordinates) {
    const location = point(coordinates[1], coordinates[2]);
    if (!location) throw new Error("Those coordinates are outside the valid latitude/longitude range.");
    return { location, query: "", url: null };
  }
  const url = googleMapsUrl(raw);
  const path = decode(url.pathname);
  const name = path.match(/\/place\/([^/@]+)/i)?.[1]?.replaceAll("+", " ").trim() || "";
  const query = (name || url.searchParams.get("query") || url.searchParams.get("q") || "").slice(0, 160);
  // Directions may contain multiple stops. Never mistake the first stop for the destination.
  if (/\/dir(?:\/|$)/i.test(path)) return { location: null, query: "", url: url.href };
  const data = `${path} ${url.searchParams.get("data") || ""}`;
  const matches = [...data.matchAll(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g)];
  const unique = new Map(matches.map((match) => [`${match[1]},${match[2]}`, match]));
  let location = null;
  if (unique.size === 1) {
    const match = unique.values().next().value;
    location = point(match[1], match[2], name);
  }
  if (!location) {
    for (const key of ["query", "q"]) {
      const match = url.searchParams.get(key)?.match(PAIR);
      if (match) { location = point(match[1], match[2], name); break; }
    }
  }
  const usableQuery = !/^(?:place_id:|0x|loc:|[-+\d.,\s]+$)/i.test(query) ? query : "";
  return { location, query: usableQuery, url: url.href };
}
