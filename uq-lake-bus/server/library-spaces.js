const UQ_LIBRARY_SOURCE_URL =
  "https://web.library.uq.edu.au/visit/using-library-study-spaces/study-space-availability";
const UQ_LIBRARY_BASE_URL = "https://web.library.uq.edu.au";
const GOOGLE_MAPS_SEARCH_URL = "https://www.google.com/maps/search/?api=1&query=";
const CACHE_TTL_MS = 45_000;

const LIBRARY_WIDGETS = [
  {
    id: "architecture-and-music-library",
    name: "Architecture and Music Library",
    shortName: "Architecture & Music",
    campus: "St Lucia",
    totalSeats: 112,
    accessLabel: "Open hours",
    widgetSecret: "NARfJiWCiIEMU2C",
    infoPath: "/visit/architecture-and-music-library",
    mapQuery: "Architecture and Music Library The University of Queensland",
    featureSummary: "Media gear, device docks and quiet creative study spaces.",
    amenities: [
      "media",
      "monitors",
      "virtual-help",
      "training",
      "computers",
      "printing",
      "group-study",
      "quiet-study",
    ],
  },
  {
    id: "biological-sciences-library",
    name: "Biological Sciences Library",
    shortName: "Biological Sciences",
    campus: "St Lucia",
    totalSeats: 595,
    accessLabel: "24 hours",
    widgetSecret: "UuuILxkDQl4dcPD",
    infoPath: "/visit/biological-sciences-library",
    mapQuery: "Biological Sciences Library The University of Queensland",
    featureSummary: "Energy pods, anatomical models, kitchen and postgrad study.",
    amenities: [
      "energy-pods",
      "anatomical-models",
      "kitchen",
      "postgrad",
      "virtual-help",
      "training",
      "computers",
      "printing",
    ],
  },
  {
    id: "central-library",
    name: "Central Library",
    shortName: "Central",
    campus: "St Lucia",
    totalSeats: 770,
    accessLabel: "24 hours",
    widgetSecret: "llhVuvsEcZkfFp6",
    infoPath: "/visit/central-library",
    mapQuery: "Central Library The University of Queensland",
    featureSummary: "Largest study hub with low-light rooms, kitchen and AskUs help.",
    amenities: [
      "assistive-tech",
      "low-light",
      "postgrad",
      "exam-booths",
      "presentation",
      "kitchen",
      "laptop-lockers",
      "askus",
      "monitors",
      "computers",
      "printing",
    ],
  },
  {
    id: "dorothy-hill-engineering-and-sciences-library",
    name: "Dorothy Hill Engineering and Sciences Library",
    shortName: "Dorothy Hill",
    campus: "St Lucia",
    totalSeats: 315,
    accessLabel: "24 hours",
    widgetSecret: "A6BTYMUAv0bkuPz",
    infoPath: "/visit/dorothy-hill-engineering-and-sciences-library",
    mapQuery:
      "Dorothy Hill Engineering and Sciences Library The University of Queensland",
    featureSummary: "Science study base with low-light spaces, kitchen and lockers.",
    amenities: [
      "low-light",
      "kitchen",
      "laptop-lockers",
      "askus",
      "monitors",
      "large-capacity",
      "computers",
      "printing",
    ],
  },
  {
    id: "dutton-park-health-sciences-library",
    name: "Dutton Park Health Sciences Library",
    shortName: "Dutton Park Health",
    campus: "Dutton Park",
    totalSeats: 112,
    accessLabel: "Open hours",
    widgetSecret: "dztSRSIv8LDEXlx",
    infoPath: "/visit/dutton-park-health-sciences-library",
    mapQuery: "Dutton Park Health Sciences Library The University of Queensland",
    featureSummary: "Health study space with AskUs, lockers and training rooms.",
    amenities: [
      "askus",
      "laptop-lockers",
      "monitors",
      "training",
      "computers",
      "printing",
      "collection",
    ],
  },
  {
    id: "duhig-tower",
    name: "Duhig Tower",
    shortName: "Duhig Tower",
    campus: "St Lucia",
    totalSeats: 294,
    accessLabel: "24 hours",
    widgetSecret: "ExE6GxrFFaMwRXn",
    infoPath: "/visit/duhig-tower",
    mapQuery: "Duhig Tower The University of Queensland",
    featureSummary: "Great Court study tower with kitchen, docks and postgrad areas.",
    amenities: [
      "kitchen",
      "postgrad",
      "monitors",
      "training",
      "group-study",
      "quiet-study",
      "computers",
      "printing",
    ],
  },
  {
    id: "herston-health-sciences-library",
    name: "Herston Health Sciences Library",
    shortName: "Herston Health",
    campus: "Herston",
    totalSeats: 70,
    accessLabel: "24 hours",
    widgetSecret: "slcqVYGO7KAanHG",
    infoPath: "/visit/herston-health-sciences-library",
    mapQuery: "Herston Health Sciences Library The University of Queensland",
    featureSummary: "Health sciences space with AskUs, lockers and training rooms.",
    amenities: [
      "askus",
      "laptop-lockers",
      "training",
      "computers",
      "printing",
      "collection",
    ],
  },
  {
    id: "jk-murray-library-uq-gatton",
    name: "JK Murray (UQ Gatton) Library",
    shortName: "JK Murray",
    campus: "Gatton",
    totalSeats: 378,
    accessLabel: "24 hours",
    widgetSecret: "OJomdqXih0jqc2b",
    infoPath: "/visit/jk-murray-library-uq-gatton",
    mapQuery: "JK Murray Library UQ Gatton",
    featureSummary: "Gatton study hub with energy pods, kitchen and accessibility rooms.",
    amenities: [
      "assistive-tech",
      "energy-pods",
      "kitchen",
      "laptop-lockers",
      "askus",
      "monitors",
      "training",
      "computers",
      "printing",
    ],
  },
  {
    id: "walter-harrison-law-library",
    name: "Walter Harrison Law Library",
    shortName: "Walter Harrison Law",
    campus: "St Lucia",
    totalSeats: 196,
    accessLabel: "24 hours",
    widgetSecret: "9UIeKo2EiDqmWZh",
    infoPath: "/visit/walter-harrison-law-library",
    mapQuery: "Walter Harrison Law Library The University of Queensland",
    featureSummary: "Law study space with kitchen, docks and virtual help point.",
    amenities: [
      "kitchen",
      "monitors",
      "virtual-help",
      "training",
      "computers",
      "printing",
      "collection",
    ],
  },
];

let cachedLibrarySpaces = null;

export async function fetchLibrarySpaces() {
  if (
    cachedLibrarySpaces &&
    cachedLibrarySpaces.expiresAt > Date.now() &&
    cachedLibrarySpaces.value
  ) {
    return cachedLibrarySpaces.value;
  }

  const results = await Promise.allSettled(
    LIBRARY_WIDGETS.map((library) => fetchLibraryWidget(library)),
  );

  const libraries = results.map((result, index) => {
    const library = LIBRARY_WIDGETS[index];

    if (result.status === "fulfilled") {
      return result.value;
    }

    console.error(`Could not load study-space data for ${library.name}.`, result.reason);

    return {
      id: library.id,
      name: library.name,
      shortName: library.shortName,
      campus: library.campus,
      accessLabel: library.accessLabel,
      infoUrl: `${UQ_LIBRARY_BASE_URL}${library.infoPath}`,
      mapUrl: buildMapUrl(library.mapQuery),
      featureSummary: library.featureSummary,
      amenities: library.amenities,
      totalSeats: library.totalSeats,
      occupiedSeats: null,
      availableSeats: null,
      overCapacityBy: 0,
      occupancyPercent: null,
      isOverCapacity: false,
      unavailable: true,
    };
  });

  const availableLibraries = libraries.filter((library) => !library.unavailable);

  if (!availableLibraries.length) {
    throw new Error("Could not load any UQ library occupancy data.");
  }

  const totalSeats = availableLibraries.reduce((sum, library) => {
    return sum + library.totalSeats;
  }, 0);
  const occupiedSeats = availableLibraries.reduce((sum, library) => {
    return sum + library.occupiedSeats;
  }, 0);
  const availableSeats = Math.max(totalSeats - occupiedSeats, 0);
  const occupancyPercent = totalSeats
    ? Math.round((occupiedSeats / totalSeats) * 100)
    : 0;

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceUrl: UQ_LIBRARY_SOURCE_URL,
    libraries,
    summary: {
      availableLibraryCount: availableLibraries.length,
      libraryCount: libraries.length,
      totalSeats,
      occupiedSeats,
      availableSeats,
      occupancyPercent,
    },
  };

  cachedLibrarySpaces = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value: payload,
  };

  return payload;
}

async function fetchLibraryWidget(library) {
  const response = await fetch(
    `https://vemcount.app/embed/data/${library.widgetSecret}?locale=en`,
    {
      headers: {
        accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Widget request failed with ${response.status}.`);
  }

  const payload = await response.json();
  const occupiedSeats = getSeatCount(payload);
  const availableSeats = Math.max(library.totalSeats - occupiedSeats, 0);
  const overCapacityBy = Math.max(occupiedSeats - library.totalSeats, 0);

  return {
    id: library.id,
    name: library.name,
    shortName: library.shortName,
    campus: library.campus,
    accessLabel: library.accessLabel,
    infoUrl: `${UQ_LIBRARY_BASE_URL}${library.infoPath}`,
    mapUrl: buildMapUrl(library.mapQuery),
    featureSummary: library.featureSummary,
    amenities: library.amenities,
    totalSeats: library.totalSeats,
    occupiedSeats,
    availableSeats,
    overCapacityBy,
    occupancyPercent: library.totalSeats
      ? Math.round((occupiedSeats / library.totalSeats) * 100)
      : 0,
    isOverCapacity: occupiedSeats > library.totalSeats,
    unavailable: false,
  };
}

function buildMapUrl(query) {
  return `${GOOGLE_MAPS_SEARCH_URL}${encodeURIComponent(query)}`;
}

function getSeatCount(payload) {
  const rawValue = Number(payload?.real ?? payload?.value ?? 0);

  if (!Number.isFinite(rawValue)) {
    return 0;
  }

  return Math.max(0, Math.round(rawValue));
}
