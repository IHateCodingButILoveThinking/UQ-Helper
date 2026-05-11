import * as cheerio from "cheerio";

const UQ_FOOD_SOURCE_URL =
  "https://campuses.uq.edu.au/information-and-services/shops/food-retail/on-campus-shops-services";
const UQ_HOST = "https://campuses.uq.edu.au";
const CACHE_TTL_MS = 60 * 60 * 1000;
const CAMPUS_BY_ID = {
  406: "St Lucia",
  467: "Gatton",
  468: "Herston",
  563: "Dutton Park",
  871: "Brisbane",
};

let foodServicesCache = null;

export async function fetchFoodServices() {
  if (foodServicesCache && foodServicesCache.expiresAt > Date.now()) {
    return foodServicesCache.value;
  }

  const response = await fetch(UQ_FOOD_SOURCE_URL, {
    headers: {
      accept: "text/html",
      "user-agent": "UQ Campus student helper",
    },
  });

  if (!response.ok) {
    throw new Error(`UQ food page returned ${response.status}.`);
  }

  const html = await response.text();
  const services = parseFoodServices(html);
  const payload = {
    generatedAt: new Date().toISOString(),
    services,
    sourceName: "UQ Campus shops and services",
    sourceUrl: UQ_FOOD_SOURCE_URL,
  };

  foodServicesCache = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value: payload,
  };

  return payload;
}

export function parseFoodServices(html) {
  const $ = cheerio.load(html);
  const services = [];
  const seenIds = new Map();
  let currentCategory = "Food and drink";

  $("h3").each((_index, heading) => {
    const $heading = $(heading);
    const headingText = normalizeText($heading.text());

    if (headingText === "Retail") {
      currentCategory = "Retail and services";
      return undefined;
    }

    if (headingText === "Services") {
      currentCategory = "Retail and services";
      return undefined;
    }

    const $websiteLink = $heading.find("a").first();
    const name = normalizeText($websiteLink.text());

    if (!name) {
      return undefined;
    }

    const imageUrl = getOutletImageUrl($, $heading);
    const websiteUrl = toAbsoluteUrl($websiteLink.attr("href"));
    const locations = getOutletLocations($, $heading, name);

    locations.forEach((location, locationIndex) => {
      const baseId = slugify(
        [
          currentCategory,
          name,
          location.campus,
          location.areaLabel,
          locationIndex + 1,
        ].join("-"),
      );
      const duplicateNumber = seenIds.get(baseId) ?? 0;
      const id = duplicateNumber ? `${baseId}-${duplicateNumber + 1}` : baseId;
      seenIds.set(baseId, duplicateNumber + 1);

      services.push({
        areaLabel: location.areaLabel,
        campus: location.campus,
        category: currentCategory,
        google_maps_url: buildGoogleMapsSearchUrl(location.mapQuery),
        id,
        imageUrl,
        location: location.rawLocation,
        locationLabel: location.locationLabel,
        map_query: location.mapQuery,
        name,
        sourceUrl: UQ_FOOD_SOURCE_URL,
        uqMapsUrl: location.uqMapsUrl,
        websiteUrl,
      });
    });

    return undefined;
  });

  return services;
}

function getOutletImageUrl($, $heading) {
  let $cursor = $heading.prev();

  while ($cursor.length) {
    if ($cursor.is("h3") && $cursor.find("a").length) {
      break;
    }

    const $image = $cursor.is("img")
      ? $cursor
      : $cursor.find("img").first();

    if ($image.length) {
      return toAbsoluteUrl($image.attr("src"));
    }

    $cursor = $cursor.prev();
  }

  return "";
}

function getOutletLocations($, $heading, outletName) {
  const locations = [];
  let $cursor = $heading.next();

  while ($cursor.length && !$cursor.is("h3")) {
    $cursor.find('a[href*="maps.uq.edu.au"]').each((_index, anchor) => {
      const $anchor = $(anchor);
      const $labelClone = $anchor.clone();
      $labelClone.find(".icon").remove();
      const textWithoutIcon = normalizeText($labelClone.text());

      const label = repairOutletLabel(
        textWithoutIcon || normalizeText($anchor.text()),
        outletName,
      );

      if (!label) {
        return;
      }

      const uqMapsUrl = toAbsoluteUrl($anchor.attr("href"));
      const campus = getCampusFromLocation(label, uqMapsUrl);
      const rawLocation = cleanOutletLocation(label, outletName);
      const areaLabel = getAreaLabel(rawLocation, campus);
      const locationLabel = getLocationLabel(rawLocation, campus);
      const mapQuery = `${outletName} ${locationLabel} The University of Queensland`;

      locations.push({
        areaLabel,
        campus,
        locationLabel,
        mapQuery,
        rawLocation,
        uqMapsUrl,
      });
    });

    $cursor = $cursor.next();
  }

  return locations.length
    ? locations
    : [
        {
          areaLabel: "Campus listing",
          campus: "UQ",
          locationLabel: "UQ campus",
          mapQuery: `${outletName} The University of Queensland`,
          rawLocation: "UQ campus",
          uqMapsUrl: "",
        },
      ];
}

function getCampusFromLocation(label, uqMapsUrl) {
  const normalizedLabel = normalizeText(label).replace(/\u00a0/g, " ");
  const campusTextMatch = normalizedLabel.match(
    /(?:^|\s)at\s+(.+?)(?:\s+-\s+|$)/i,
  );

  if (campusTextMatch) {
    return normalizeText(campusTextMatch[1]);
  }

  try {
    const parsedUrl = new URL(uqMapsUrl);
    const campusId = parsedUrl.searchParams.get("campusId");

    if (campusId && CAMPUS_BY_ID[campusId]) {
      return CAMPUS_BY_ID[campusId];
    }
  } catch (_error) {
    return "UQ";
  }

  return "UQ";
}

function repairOutletLabel(label, outletName) {
  const normalizedLabel = normalizeText(label);
  const normalizedName = normalizeText(outletName);
  const spellingFixes = [
    ["Australlia Post", "Australia Post"],
  ];
  const fixedLabel = spellingFixes.reduce((value, [source, replacement]) => {
    return value.replace(new RegExp(escapeRegExp(source), "gi"), replacement);
  }, normalizedLabel);

  if (
    normalizedName.length > 1 &&
    fixedLabel
      .toLowerCase()
      .startsWith(normalizedName.slice(1).toLowerCase())
  ) {
    return `${normalizedName}${fixedLabel.slice(normalizedName.length - 1)}`;
  }

  return fixedLabel;
}

function cleanOutletLocation(label, outletName) {
  const escapedName = escapeRegExp(outletName);
  const normalizedLabel = normalizeText(label);
  const atCampusMatch = normalizedLabel.match(
    /^(.*?)\s+at\s+(St Lucia|Gatton|Herston|Dutton Park|Brisbane)(?:\s+-\s+(.*))?$/i,
  );

  if (atCampusMatch) {
    const labelOutletName = normalizeText(atCampusMatch[1]);
    const campus = normalizeText(atCampusMatch[2]);
    const area = normalizeText(atCampusMatch[3]);

    if (area) {
      return `${campus} - ${area}`;
    }

    if (
      labelOutletName.toLowerCase() === outletName.toLowerCase() ||
      labelOutletName.toLowerCase().endsWith(outletName.toLowerCase())
    ) {
      return campus;
    }

    if (outletName.toLowerCase().endsWith(labelOutletName.toLowerCase())) {
      return `${campus} - ${labelOutletName}`;
    }

    return `${campus} - ${labelOutletName}`;
  }

  const withoutOutlet = normalizedLabel.replace(
    new RegExp(`^${escapedName}\\s+at\\s+`, "i"),
    "",
  );
  const firstWord = outletName.split(/\s+/)[0];
  const withoutFirstWordOutlet = withoutOutlet.replace(
    new RegExp(`^${escapeRegExp(firstWord)}\\s+at\\s+`, "i"),
    "",
  );

  if (withoutFirstWordOutlet !== withoutOutlet) {
    return withoutFirstWordOutlet;
  }

  if (withoutOutlet !== normalizedLabel) {
    return withoutOutlet;
  }

  return normalizedLabel || label;
}

function getLocationLabel(rawLocation, campus) {
  if (!rawLocation || rawLocation === campus) {
    return `${campus} campus`;
  }

  return rawLocation;
}

function getAreaLabel(rawLocation, campus) {
  const normalized = normalizeText(rawLocation);

  if (!normalized || normalized === campus) {
    return `${campus} campus`;
  }

  const dashParts = normalized.split(/\s+-\s+/);

  if (dashParts.length > 1) {
    return dashParts.slice(1).join(" - ");
  }

  const buildingMatch = normalized.match(/Building\s+(\d+[A-Z]?)/i);

  if (buildingMatch) {
    return `Building ${buildingMatch[1]}`;
  }

  return normalized;
}

function buildGoogleMapsSearchUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query,
  )}`;
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toAbsoluteUrl(value) {
  const url = String(value ?? "").trim();

  if (!url) {
    return "";
  }

  return new URL(url, UQ_HOST).toString();
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
