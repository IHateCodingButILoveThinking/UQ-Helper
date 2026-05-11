import { fetchFoodServices } from "./food-services.js";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const GOOGLE_PLACES_TEXT_SEARCH_URL =
  "https://places.googleapis.com/v1/places:searchText";
const GOOGLE_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.businessStatus",
  "places.googleMapsUri",
  "places.regularOpeningHours.openNow",
  "places.regularOpeningHours.weekdayDescriptions",
].join(",");

let cacheEntry = null;

export async function fetchFoodReviews() {
  if (cacheEntry && cacheEntry.expiresAt > Date.now()) {
    return cacheEntry.value;
  }

  const apiKey = getGooglePlacesApiKey();

  if (!apiKey) {
    return {
      configured: false,
      generatedAt: new Date().toISOString(),
      message:
        "Add GOOGLE_PLACES_API_KEY or GOOGLE_MAPS_API_KEY to load live opening status.",
      reviews: {},
      sourceName: "Google Places API",
    };
  }

  const foodServicesPayload = await fetchFoodServices();
  const foodServices = foodServicesPayload.services;
  const reviewResults = await Promise.allSettled(
    foodServices.map((service) => fetchGooglePlaceSummary(service, apiKey)),
  );
  const reviews = {};

  reviewResults.forEach((result, index) => {
    const service = foodServices[index];

    if (result.status === "fulfilled" && result.value) {
      reviews[service.id] = result.value;
      return;
    }

    reviews[service.id] = {
      error: "Google place data was not available for this outlet.",
      query: buildReviewQuery(service),
    };
  });

  const payload = {
    configured: true,
    generatedAt: new Date().toISOString(),
    reviews,
    sourceName: "Google Places API",
  };

  cacheEntry = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value: payload,
  };

  return payload;
}

async function fetchGooglePlaceSummary(service, apiKey) {
  const query = buildReviewQuery(service);
  const response = await fetch(GOOGLE_PLACES_TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": GOOGLE_FIELD_MASK,
    },
    body: JSON.stringify({
      languageCode: "en-AU",
      maxResultCount: 1,
      regionCode: "AU",
      textQuery: query,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Places request failed with ${response.status}.`);
  }

  const payload = await response.json();
  const place = payload?.places?.[0];

  if (!place) {
    return null;
  }

  return {
    businessStatus: place.businessStatus ?? "",
    formattedAddress: place.formattedAddress ?? "",
    googleMapsUri: place.googleMapsUri ?? service.google_maps_url ?? "",
    name: place.displayName?.text ?? service.name,
    openingHours: place.regularOpeningHours?.weekdayDescriptions ?? [],
    openNow: place.regularOpeningHours?.openNow ?? null,
    placeId: place.id ?? "",
    query,
  };
}

function buildReviewQuery(service) {
  const location = normalizeLocationForQuery(service.location);

  return [
    service.name,
    location,
    service.campus,
    service.areaLabel,
    "The University of Queensland",
    "Australia",
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeLocationForQuery(location) {
  const normalized = String(location ?? "").trim();

  if (!normalized || normalized === "Maps location") {
    return "";
  }

  return normalized;
}

function getGooglePlacesApiKey() {
  return (
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    ""
  ).trim();
}
