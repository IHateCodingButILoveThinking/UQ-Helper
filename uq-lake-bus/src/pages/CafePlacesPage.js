import { useEffect, useId, useMemo, useState } from "react";
import { ExternalLink, MapPin, RefreshCw, Search } from "lucide-react";

import CafeBrandMark from "../components/CafeBrandMark";

import "../styles/cafe-finder.css";

const FOOD_SERVICES_ENDPOINT = "/api/food-services";
const UQ_FOOD_SOURCE_URL =
  "https://about.uq.edu.au/campuses-facilities/services-and-shops/eat-drink-shop";

const CAFE_KEYWORDS = [
  "boba",
  "bookmark",
  "boost",
  "brew",
  "cafe",
  "caff",
  "café",
  "chatime",
  "coffee",
  "darwin",
  "expresso",
  "juice",
  "lakeside",
  "lightbox",
  "market cart",
  "merlo",
  "nunu",
  "on a roll",
  "saint lucy",
  "sharetea",
  "upbeat",
];

// Keeps the widget useful if UQ's directory is temporarily unavailable.
// Names and locations mirror UQ's official St Lucia food-and-drink directory.
const FALLBACK_CAFES = [
  ["Bookmark Cafe", "Duhig North (Building 12)"],
  ["BrewPoint", "Synthetic Playing Fields (Building 33)"],
  ["BrewPoint", "Aquatic Centre"],
  ["Cafe Nano", "AIBN (Building 75)"],
  ["Darwin's Cafe", "Biological Sciences Library (Building 94)"],
  ["Expresso", "Main Refectory (Building 21B)"],
  ["Lakeside Cafe", "Advanced Engineering (Building 49)"],
  ["Lightbox Coffee", "Queensland Bioscience Precinct (Building 80)"],
  ["Market Cart", "Physiology Lecture Theatres (Building 63)"],
  ["Merlo Coffee", "Duhig Tower (Building 2)"],
  ["Nunu Cafe", "Colin Clark (Building 39)"],
  ["On a Roll Bakery", "Main Refectory (Building 21B)"],
  ["Saint Lucy Caffe e Cucina", "UQ Sport Tennis Centre (Building 29)"],
  ["Upbeat Cafe", "Athletics Field Shelter North (Building 40A)"],
].map(([name, locationLabel], index) => ({
  google_maps_url: buildGoogleMapsUrl(name, locationLabel),
  id: `fallback-cafe-${index}`,
  locationLabel,
  name,
}));

export default function CafePlacesPage() {
  const headingId = useId();
  const searchId = useId();
  const [cafes, setCafes] = useState(FALLBACK_CAFES);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    fetch(FOOD_SERVICES_ENDPOINT, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`UQ directory returned ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        const currentCafes = (payload.services ?? [])
          .filter(isStLuciaCafe)
          .sort((a, b) => a.name.localeCompare(b.name));

        if (currentCafes.length) {
          setCafes(currentCafes);
          setUpdatedAt(payload.generatedAt ?? new Date().toISOString());
        } else {
          setError("Showing the saved UQ list while the directory is unavailable.");
        }
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError("Showing the saved UQ list while the directory is unavailable.");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [refreshKey]);

  const matches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return cafes;

    return cafes.filter((cafe) =>
      `${cafe.name} ${cafe.locationLabel}`.toLowerCase().includes(normalizedQuery),
    );
  }, [cafes, query]);
  const visibleCafes = showAll || query ? matches : matches.slice(0, 6);

  return (
    <section className="cafe-places-page" aria-label="Cafes around UQ St Lucia">
      <div className="cafe-places-hero">
        <span>UQ ST LUCIA</span>
        <h1>Cafes around UQ</h1>
        <p>Find coffee near your next class and open the exact campus location.</p>
      </div>

      <div className="cafe-finder" aria-labelledby={headingId} aria-busy={loading}>
      <header className="cafe-finder-header">
        <div>
          <small>CAFE DIRECTORY</small>
          <h2 id={headingId}>Choose a cafe</h2>
        </div>
        <span className="cafe-count">{cafes.length} places</span>
      </header>

      <p className="cafe-finder-intro">Search by cafe name or campus building.</p>

      <label className="cafe-search" htmlFor={searchId}>
        <Search size={16} aria-hidden="true" />
        <input
          id={searchId}
          type="search"
          placeholder="Search cafe or building"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {error ? (
        <div className="cafe-notice" role="status">
          <span>{error}</span>
          <button type="button" onClick={() => setRefreshKey((key) => key + 1)}>
            <RefreshCw size={13} aria-hidden="true" /> Retry
          </button>
        </div>
      ) : loading ? (
        <p className="cafe-loading" role="status">Refreshing the UQ cafe list…</p>
      ) : null}

      <ul className="cafe-list">
        {visibleCafes.map((cafe) => (
          <li key={cafe.id}>
            <a
              href={cafe.uqMapsUrl || cafe.google_maps_url || buildGoogleMapsUrl(cafe.name, cafe.locationLabel)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${cafe.name} at ${cafe.locationLabel} on the map`}
            >
              <CafeBrandMark cafe={cafe} />
              <span className="cafe-copy">
                <strong>{cafe.name}</strong>
                <span><MapPin size={12} aria-hidden="true" />{cafe.locationLabel}</span>
              </span>
              <ExternalLink className="cafe-open-icon" size={15} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>

      {!visibleCafes.length ? (
        <p className="cafe-empty" role="status">No cafes match “{query}”.</p>
      ) : null}

      {!query && matches.length > 6 ? (
        <button className="cafe-show-all" type="button" onClick={() => setShowAll((value) => !value)}>
          {showAll ? "Show fewer" : `Show all ${matches.length} cafes`}
        </button>
      ) : null}

      <footer className="cafe-finder-footer">
        <span>{updatedAt ? `UQ directory refreshed ${formatRefreshTime(updatedAt)}` : "Official UQ directory fallback"}</span>
        <a href={UQ_FOOD_SOURCE_URL} target="_blank" rel="noreferrer">UQ source <ExternalLink size={11} aria-hidden="true" /></a>
      </footer>
      </div>
    </section>
  );
}

function isStLuciaCafe(service) {
  if (service.campus !== "St Lucia" || service.category !== "Food and drink") return false;
  const searchable = `${service.name} ${service.locationLabel}`.toLowerCase();
  return CAFE_KEYWORDS.some((keyword) => searchable.includes(keyword));
}

function buildGoogleMapsUrl(name, location) {
  const query = `${name}, ${location}, The University of Queensland, St Lucia`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function formatRefreshTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "recently";
  return date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}
