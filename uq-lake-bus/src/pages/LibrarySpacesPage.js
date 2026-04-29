import { useMemo, useState } from "react";
import {
  FaChair,
  FaClock,
  FaFilter,
  FaUsers,
} from "react-icons/fa";

import EmptyState from "../components/EmptyState";

const BRISBANE_TZ = "Australia/Brisbane";
const DEFAULT_CAMPUS_FILTER_ID = "st-lucia";
const CAMPUS_FILTERS = [
  {
    id: "st-lucia",
    label: "St Lucia",
    shortLabel: "St Lucia",
    campuses: ["St Lucia"],
  },
  {
    id: "health",
    label: "Health",
    shortLabel: "Health",
    campuses: ["Dutton Park", "Herston"],
  },
  {
    id: "gatton",
    label: "Gatton",
    shortLabel: "Gatton",
    campuses: ["Gatton"],
  },
  {
    id: "all",
    label: "All",
    shortLabel: "All",
    campuses: null,
  },
];
const CAMPUS_ORDER = new Map([
  ["St Lucia", 0],
  ["Dutton Park", 1],
  ["Herston", 2],
  ["Gatton", 3],
]);
const LIBRARY_DIAGRAM_LABELS = new Map([
  ["architecture-and-music-library", "Arch Music"],
  ["biological-sciences-library", "Biological"],
  ["central-library", "Central"],
  ["dorothy-hill-engineering-and-sciences-library", "Dorothy"],
  ["dutton-park-health-sciences-library", "Dutton"],
  ["duhig-tower", "Duhig"],
  ["herston-health-sciences-library", "Herston"],
  ["jk-murray-library-uq-gatton", "Gatton"],
  ["walter-harrison-law-library", "Law"],
]);

export default function LibrarySpacesPage({
  libraryError,
  libraryLoading,
  librarySpaces,
}) {
  const [selectedCampusFilterId, setSelectedCampusFilterId] = useState(
    DEFAULT_CAMPUS_FILTER_ID,
  );
  const libraries = librarySpaces?.libraries ?? [];
  const selectedCampusFilter =
    CAMPUS_FILTERS.find((filter) => filter.id === selectedCampusFilterId) ??
    CAMPUS_FILTERS[0];
  const filteredLibraries = useMemo(() => {
    return filterAndSortLibraries(libraries, selectedCampusFilter);
  }, [libraries, selectedCampusFilter]);
  const availableFilteredLibraries = filteredLibraries.filter(
    (library) => !library.unavailable,
  );
  const selectedSummary = buildLibrarySummary(availableFilteredLibraries);
  const bestLibrary = getBestLibrary(availableFilteredLibraries);
  const showcaseLibraries = getLibraryShowcaseItems(availableFilteredLibraries);
  const bestTone = getOccupancyTone(bestLibrary?.occupancyPercent);
  const bestLabel = getOccupancyLabel(bestLibrary?.occupancyPercent);
  const updatedLabel = librarySpaces?.generatedAt
    ? formatTime(librarySpaces.generatedAt)
    : "";

  return (
    <section className="library-spaces-layout">
      <section className="surface-panel library-spaces-hero">
        <div className="library-spaces-copy">
          <p className="eyebrow">UQ Libraries</p>
          <h1 className="section-title">Study spaces</h1>
          <p className="library-spaces-subtle-copy">
            Check live library space usage before you walk over.
          </p>
        </div>

        {libraryLoading && !librarySpaces ? (
          <article className="library-snapshot-card skeleton-card" />
        ) : libraryError && !librarySpaces ? (
          <section className="error-card">{libraryError}</section>
        ) : selectedSummary ? (
          <article className={`library-snapshot-card tone-${bestTone}`}>
            <div className="library-snapshot-main">
              <div className="library-snapshot-copy">
                <span className={`library-status-pill tone-${bestTone}`}>
                  {bestLabel}
                </span>
                <span className="library-overview-kicker">
                  {selectedCampusFilter.label} best now
                </span>
                <strong>{bestLibrary?.shortName ?? "Study spaces"}</strong>
                <p>{formatBestLibraryMessage(bestLibrary)}</p>
              </div>

              <LibraryWaveScene
                libraries={showcaseLibraries}
                selectedCampusLabel={selectedCampusFilter.label}
                updatedLabel={updatedLabel}
              />
            </div>

            <div className="library-snapshot-strip">
              <span>
                <FaChair aria-hidden="true" />
                {formatSeats(bestLibrary?.availableSeats)} free
              </span>
              <span>
                <FaUsers aria-hidden="true" />
                {formatSeats(selectedSummary.availableSeats)} campus
              </span>
              <span>
                <FaClock aria-hidden="true" />
                {updatedLabel || "Live"}
              </span>
            </div>
          </article>
        ) : (
          <EmptyState compact message="No live study-space data right now." />
        )}
      </section>

      <section className="surface-panel library-spaces-panel">
        <div className="section-head feed-head">
          <div>
            <p className="eyebrow">Live occupancy</p>
            <h2 className="section-title">{selectedCampusFilter.label} libraries</h2>
          </div>

          {updatedLabel ? (
            <div className="section-head-meta">
              <p className="section-note">Updated {updatedLabel}</p>
            </div>
          ) : null}
        </div>

        {libraryError && librarySpaces ? (
          <p className="library-inline-status error">
            Could not refresh just now. Showing the last successful library
            snapshot.
          </p>
        ) : null}

        <div className="library-campus-filter" aria-label="Filter libraries by campus">
          <span className="library-campus-filter-icon" aria-hidden="true">
            <FaFilter />
          </span>
          {CAMPUS_FILTERS.map((filter) => (
            <button
              type="button"
              className={`library-campus-filter-button ${
                selectedCampusFilterId === filter.id ? "active" : ""
              }`}
              key={filter.id}
              aria-pressed={selectedCampusFilterId === filter.id}
              onClick={() => setSelectedCampusFilterId(filter.id)}
            >
              {filter.shortLabel}
            </button>
          ))}
        </div>

        {libraryLoading && !librarySpaces ? (
          <div className="library-card-grid">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <article className="library-card skeleton-card" key={item} />
            ))}
          </div>
        ) : filteredLibraries.length ? (
          <div className="library-card-grid">
            {filteredLibraries.map((library) => {
              if (library.unavailable) {
                return (
                  <article className="library-card unavailable" key={library.id}>
                    <div className="library-card-main">
                      <h3>{library.name}</h3>
                      <strong>Temporarily unavailable</strong>
                    </div>
                  </article>
                );
              }

              const tone = getOccupancyTone(library.occupancyPercent);

              return (
                <article
                  className={`library-card tone-${tone}`}
                  key={library.id}
                  style={{
                    "--card-progress": getOccupancyProgress(library.occupancyPercent),
                  }}
                >
                  <OccupancyRing
                    ariaLabel={`${library.name} occupancy ${library.occupancyPercent} percent`}
                    percent={library.occupancyPercent}
                    tone={tone}
                  />

                  <div className="library-card-main">
                    <h3>{library.name}</h3>
                    <span>
                      {library.isOverCapacity
                        ? `${formatSeats(library.overCapacityBy)} over target`
                        : `${formatSeats(library.availableSeats)} seats free`}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState compact message="No live study-space data right now." />
        )}
      </section>
    </section>
  );
}

function OccupancyRing({ ariaLabel, large = false, percent, tone }) {
  const numericPercent = Number.isFinite(percent) ? Math.max(0, percent) : 0;
  const clampedPercent = Math.min(numericPercent, 100);

  return (
    <div
      aria-label={ariaLabel}
      className={`occupancy-ring ${large ? "large" : ""} tone-${tone} ${
        numericPercent > 100 ? "over-capacity" : ""
      }`}
      role="img"
      style={{
        "--ring-progress": `${clampedPercent}%`,
      }}
    >
      <div className="occupancy-ring-inner">
        <strong>{numericPercent}%</strong>
        {large ? <span>used</span> : null}
      </div>
    </div>
  );
}

function LibraryWaveScene({ libraries, selectedCampusLabel, updatedLabel }) {
  const chartLibraries = libraries.slice(0, 4);

  return (
    <div
      aria-label={`${selectedCampusLabel} live library capacity wave chart`}
      className="library-wave-scene"
      role="img"
    >
      <div className="library-wave-head">
        <span>Capacity map</span>
        <span>{updatedLabel || "Live"}</span>
      </div>

      <svg
        aria-hidden="true"
        className="library-wave-canvas"
        focusable="false"
        viewBox="0 0 360 220"
      >
        <g className="library-wave-grid">
          {[0, 1, 2, 3, 4].map((line) => (
            <line
              key={line}
              x1={68 + line * 48}
              x2={142 + line * 48}
              y1={180}
              y2={212}
            />
          ))}
          <line x1="58" x2="322" y1="180" y2="212" />
        </g>

        {chartLibraries.map((library, index) => {
          const geometry = getWaveGeometry(library, index);
          const tone = getOccupancyTone(library.occupancyPercent);

          return (
            <g
              className={`library-wave-layer tone-${tone}`}
              key={library.id}
              style={{
                "--wave-delay": `${index * 70}ms`,
              }}
            >
              <path className="library-wave-floor" d={geometry.floorPath} />
              <path className="library-wave-shape" d={geometry.wavePath} />
              <line
                className="library-wave-connector"
                x1={geometry.markerX}
                x2={geometry.connectorX}
                y1={geometry.markerY + 10}
                y2={geometry.connectorY}
              />
              <circle
                className="library-wave-connector-dot"
                cx={geometry.connectorX}
                cy={geometry.connectorY}
                r="3"
              />
              <circle
                className="library-wave-marker-dot"
                cx={geometry.markerX}
                cy={geometry.markerY}
                r="7"
              />
              <text
                className="library-wave-marker-number"
                x={geometry.markerX}
                y={geometry.markerY}
              >
                {index + 1}
              </text>
            </g>
          );
        })}
      </svg>

      <ol className="library-wave-legend">
        {chartLibraries.map((library, index) => {
          const tone = getOccupancyTone(library.occupancyPercent);

          return (
            <li className={`library-wave-legend-item tone-${tone}`} key={library.id}>
              <span>{index + 1}</span>
              <i aria-hidden="true" className="library-wave-link" />
              <strong>{getDiagramLabel(library)}</strong>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function filterAndSortLibraries(libraries, campusFilter) {
  const filteredLibraries = campusFilter.campuses
    ? libraries.filter((library) => campusFilter.campuses.includes(library.campus))
    : libraries;

  return [...filteredLibraries].sort((left, right) => {
    const leftUnavailable = left.unavailable ? 1 : 0;
    const rightUnavailable = right.unavailable ? 1 : 0;

    if (leftUnavailable !== rightUnavailable) {
      return leftUnavailable - rightUnavailable;
    }

    const campusRank =
      (CAMPUS_ORDER.get(left.campus) ?? 99) -
      (CAMPUS_ORDER.get(right.campus) ?? 99);

    if (campusFilter.id === "all" && campusRank !== 0) {
      return campusRank;
    }

    return getLibraryChoiceScore(right) - getLibraryChoiceScore(left);
  });
}

function buildLibrarySummary(libraries) {
  if (!libraries.length) {
    return null;
  }

  const totalSeats = libraries.reduce((sum, library) => {
    return sum + library.totalSeats;
  }, 0);
  const occupiedSeats = libraries.reduce((sum, library) => {
    return sum + library.occupiedSeats;
  }, 0);

  return {
    totalSeats,
    occupiedSeats,
    availableSeats: Math.max(totalSeats - occupiedSeats, 0),
    occupancyPercent: totalSeats
      ? Math.round((occupiedSeats / totalSeats) * 100)
      : 0,
  };
}

function getBestLibrary(libraries) {
  return [...libraries].sort((left, right) => {
    return getLibraryChoiceScore(right) - getLibraryChoiceScore(left);
  })[0];
}

function getLibraryChoiceScore(library) {
  if (!library || library.unavailable) {
    return -1;
  }

  const availableSeats = Number(library.availableSeats) || 0;
  const occupancyPenalty = Number(library.occupancyPercent) || 0;

  return availableSeats * 10 - occupancyPenalty;
}

function getOccupancyProgress(percent) {
  const numericPercent = Number.isFinite(percent) ? Math.max(0, percent) : 0;

  return `${Math.min(numericPercent, 100)}%`;
}

function getLibraryShowcaseItems(libraries) {
  const byOccupancy = [...libraries].sort((left, right) => {
    return (Number(right.occupancyPercent) || 0) - (Number(left.occupancyPercent) || 0);
  });
  const selectedLibraries = [
    ...byOccupancy.slice(0, 2),
    ...byOccupancy.slice(-2).reverse(),
  ];

  return Array.from(
    new Map(selectedLibraries.map((library) => [library.id, library])).values(),
  ).slice(0, 4);
}

function getWaveGeometry(library, index) {
  const percent = Number.isFinite(library?.occupancyPercent)
    ? Math.min(Math.max(library.occupancyPercent, 0), 125)
    : 0;
  const x = 44 + index * 25;
  const baseY = 152 - index * 20;
  const width = 190;
  const depth = 30;
  const height = 28 + Math.min(percent, 100) * 0.56;
  const ridge = [
    baseY - height * 0.44,
    baseY - height * 0.64,
    baseY - height * 0.5,
    baseY - height * 0.83,
    baseY - height * 0.7,
    baseY - height,
  ];

  return {
    markerX: x - 18,
    markerY: baseY + depth - 2,
    connectorX: 45 + index * 90,
    connectorY: 204,
    floorPath: [
      `M ${x} ${baseY + depth}`,
      `L ${x + width} ${baseY + depth}`,
      `L ${x + width + 34} ${baseY + depth + 18}`,
      `L ${x + 34} ${baseY + depth + 18}`,
      "Z",
    ].join(" "),
    wavePath: [
      `M ${x} ${baseY + depth}`,
      `L ${x} ${ridge[0]}`,
      `C ${x + 18} ${ridge[0] - 8}, ${x + 24} ${ridge[1] + 12}, ${x + 42} ${ridge[1]}`,
      `C ${x + 58} ${ridge[1] - 8}, ${x + 60} ${ridge[2] + 14}, ${x + 78} ${ridge[2]}`,
      `C ${x + 96} ${ridge[2] - 18}, ${x + 98} ${ridge[3] + 8}, ${x + 120} ${ridge[3]}`,
      `C ${x + 146} ${ridge[3] - 10}, ${x + 148} ${ridge[4] + 12}, ${x + 170} ${ridge[4]}`,
      `C ${x + 188} ${ridge[4] - 6}, ${x + 190} ${ridge[5] + 6}, ${x + width} ${ridge[5]}`,
      `L ${x + width} ${baseY + depth}`,
      "Z",
    ].join(" "),
  };
}

function getDiagramLabel(library) {
  return LIBRARY_DIAGRAM_LABELS.get(library.id) ?? library.shortName;
}

function formatBestLibraryMessage(library) {
  if (!library) {
    return "Waiting for live study-space data.";
  }

  const status = getOccupancyLabel(library.occupancyPercent).toLowerCase();

  return `${formatSeats(library.availableSeats)} seats free - ${status}`;
}

function getOccupancyTone(percent) {
  if (!Number.isFinite(percent)) {
    return "steady";
  }

  if (percent > 100) {
    return "over";
  }

  if (percent > 75) {
    return "packed";
  }

  if (percent >= 50) {
    return "busy";
  }

  if (percent > 30) {
    return "steady";
  }

  return "open";
}

function getOccupancyLabel(percent) {
  if (!Number.isFinite(percent)) {
    return "Unavailable";
  }

  if (percent > 100) {
    return "Overpacked";
  }

  if (percent > 75) {
    return "Nearly full";
  }

  if (percent >= 50) {
    return "Busy";
  }

  if (percent > 30) {
    return "Steady";
  }

  return "Open";
}

function formatSeats(value) {
  return new Intl.NumberFormat("en-AU").format(Math.max(0, Number(value) || 0));
}

function formatTime(dateTime) {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: BRISBANE_TZ,
  }).format(new Date(dateTime));
}
