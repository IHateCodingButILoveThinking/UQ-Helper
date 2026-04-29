const UQ_LIBRARY_SOURCE_URL =
  "https://web.library.uq.edu.au/visit/using-library-study-spaces/study-space-availability";
const UQ_LIBRARY_BASE_URL = "https://web.library.uq.edu.au";
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

function getSeatCount(payload) {
  const rawValue = Number(payload?.real ?? payload?.value ?? 0);

  if (!Number.isFinite(rawValue)) {
    return 0;
  }

  return Math.max(0, Math.round(rawValue));
}
