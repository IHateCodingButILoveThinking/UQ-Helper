import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaArrowLeft,
  FaBookOpen,
  FaChair,
  FaChevronRight,
  FaClock,
  FaExclamationTriangle,
  FaFilter,
  FaMapMarkedAlt,
  FaSignal,
  FaUsers,
} from "react-icons/fa";

import EmptyState from "../components/EmptyState";
import {
  getAmenityItems as getLibraryAmenityItems,
  getFeaturedAmenitySummary as getLibraryFeaturedAmenitySummary,
  getFeatureSummary,
  getLibraryMapUrl,
} from "../data/libraryAmenities";

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
  ["dutton-park-health-sciences-library", "Dutton Park"],
  ["duhig-tower", "Duhig"],
  ["herston-health-sciences-library", "Herston"],
  ["jk-murray-library-uq-gatton", "Gatton"],
  ["walter-harrison-law-library", "Law"],
]);
const FEATURE_FILTER_CATEGORIES = [
  "All",
  "Quiet Zones",
  "Collaborative",
  "Tech",
  "Accessibility",
];
const QUIET_FEATURE_IDS = new Set([
  "low-light",
  "postgrad",
  "quiet-study",
]);
const COLLABORATIVE_FEATURE_IDS = new Set([
  "group-study",
  "presentation",
  "soundproof-booths",
  "training",
]);
const TECH_FEATURE_IDS = new Set([
  "computers",
  "device-charging",
  "laptop-lockers",
  "media",
  "monitors",
  "printing",
  "virtual-help",
]);

function doesAmenityMatchFeatureFilter(amenity, activeFilter) {
  if (activeFilter === "All") {
    return true;
  }

  if (activeFilter === "Quiet Zones") {
    return QUIET_FEATURE_IDS.has(amenity.id);
  }

  if (activeFilter === "Collaborative") {
    return COLLABORATIVE_FEATURE_IDS.has(amenity.id);
  }

  if (activeFilter === "Tech") {
    return amenity.category === "Equipment" || TECH_FEATURE_IDS.has(amenity.id);
  }

  if (activeFilter === "Accessibility") {
    return amenity.category === "Accessibility";
  }

  return amenity.category === activeFilter;
}

function getSummaryFeatureFilter(category) {
  if (category === "Equipment" || category === "Specialty") {
    return "Tech";
  }

  if (category === "Study") {
    return "Quiet Zones";
  }

  if (category === "Accessibility") {
    return "Accessibility";
  }

  return "All";
}

export default function LibrarySpacesPage({
  libraryError,
  libraryLoading,
  librarySpaces,
}) {
  const [selectedCampusFilterId, setSelectedCampusFilterId] = useState(
    DEFAULT_CAMPUS_FILTER_ID,
  );
  const [selectedLibraryId, setSelectedLibraryId] = useState("");
  const [showAmenitiesGuide, setShowAmenitiesGuide] = useState(false);
  const libraries = librarySpaces?.libraries ?? [];
  const selectedCampusFilter =
    CAMPUS_FILTERS.find((filter) => filter.id === selectedCampusFilterId) ??
    CAMPUS_FILTERS[0];
  const selectedLibrary = libraries.find((library) => {
    return library.id === selectedLibraryId;
  });
  const filteredLibraries = useMemo(() => {
    return filterAndSortLibraries(libraries, selectedCampusFilter);
  }, [libraries, selectedCampusFilter]);
  const availableFilteredLibraries = filteredLibraries.filter((library) => {
    return !library.unavailable;
  });
  const selectedSummary = buildLibrarySummary(availableFilteredLibraries);
  const bestLibrary = getBestLibrary(availableFilteredLibraries);
  const waveLibraries = getWaveShowcaseItems(availableFilteredLibraries);
  const bestTone = getOccupancyTone(bestLibrary?.occupancyPercent);
  const bestLabel = getOccupancyLabel(bestLibrary?.occupancyPercent);
  const updatedLabel = librarySpaces?.generatedAt
    ? formatTime(librarySpaces.generatedAt)
    : "";

  useEffect(() => {
    if (selectedLibraryId || showAmenitiesGuide) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [selectedLibraryId, showAmenitiesGuide]);

  if (showAmenitiesGuide) {
    return (
      <LibraryAmenitiesGuidePage
        libraries={libraries}
        onBack={() => setShowAmenitiesGuide(false)}
        onSelectLibrary={(libraryId) => {
          setShowAmenitiesGuide(false);
          setSelectedLibraryId(libraryId);
        }}
      />
    );
  }

  if (selectedLibrary) {
    return (
      <LibraryDetailPage
        library={selectedLibrary}
        onBack={() => setSelectedLibraryId("")}
        onShowAmenitiesGuide={() => {
          setSelectedLibraryId("");
          setShowAmenitiesGuide(true);
        }}
        updatedLabel={updatedLabel}
      />
    );
  }

  return (
    <section className="library-spaces-layout">
      <section className="surface-panel library-spaces-hero">
        <div className="library-spaces-copy">
          <div className="library-spaces-title-row">
            <div>
              <p className="eyebrow">UQ Libraries</p>
              <h1 className="section-title">Study spaces</h1>
            </div>
            <button
              type="button"
              className="library-know-more-button"
              onClick={() => setShowAmenitiesGuide(true)}
            >
              <FaBookOpen aria-hidden="true" />
              Amenities
            </button>
          </div>
          <p className="library-spaces-subtle-copy">
            Live seat availability first, then library features when you need
            more detail.
          </p>
        </div>

        {libraryLoading && !librarySpaces ? (
          <div className="library-hero-grid">
            <article className="library-quick-pick-card skeleton-card" />
            <article className="library-capacity-card skeleton-card" />
          </div>
        ) : libraryError && !librarySpaces ? (
          <section className="error-card">{libraryError}</section>
        ) : selectedSummary ? (
          <div className="library-hero-grid">
            <article className={`library-quick-pick-card tone-${bestTone}`}>
              <div className="library-quick-pick-head">
                <span>Recommended Space Right Now</span>
                <strong>{bestLabel}</strong>
              </div>
              <h2>{bestLibrary?.shortName ?? "Study spaces"}</h2>
              <p>{formatBestLibraryMessage(bestLibrary)}</p>
            </article>

            <LibraryWaveGrid
              libraries={waveLibraries}
              onSelectLibrary={setSelectedLibraryId}
              selectedCampusLabel={selectedCampusFilter.label}
              updatedLabel={updatedLabel}
            />
          </div>
        ) : (
          <EmptyState compact message="No live study-space data right now." />
        )}
      </section>

      <section className="surface-panel library-spaces-panel">
        <div className="section-head feed-head">
          <div>
            <p className="eyebrow">Live occupancy</p>
            <h2 className="section-title">
              {selectedCampusFilter.label} libraries
            </h2>
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

        <div
          className="library-campus-filter"
          aria-label="Filter libraries by campus"
        >
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
            {filteredLibraries.map((library) => (
              <LibraryListItem
                key={library.id}
                library={library}
                onSelect={() => setSelectedLibraryId(library.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState compact message="No live study-space data right now." />
        )}
      </section>
    </section>
  );
}

function LibraryListItem({ library, onSelect }) {
  const tone = getOccupancyTone(library.occupancyPercent);
  const availabilityText = getAvailabilityLabel(library);
  const usedText = getUsedSeatsLabel(library);
  const peakWindow = getPeakWindow(library);
  const statusLabel = library.unavailable
    ? "Offline"
    : getOccupancyLabel(library.occupancyPercent);

  return (
    <button
      type="button"
      className={`library-card tone-${tone} ${
        library.unavailable ? "unavailable" : ""
      }`}
      aria-label={`Open ${library.name} details`}
      onClick={onSelect}
    >
      <LibraryStatusVisual library={library} tone={tone} />

      <div className="library-card-main">
        <div className="library-card-topline">
          <h3>{library.name}</h3>
          <span className={`library-card-status tone-${tone}`}>
            <FaSignal aria-hidden="true" />
            {statusLabel}
          </span>
        </div>
        <div className="library-card-meta">
          <span>
            <FaChair aria-hidden="true" />
            {availabilityText}
          </span>
          <span>
            <FaUsers aria-hidden="true" />
            {usedText}
          </span>
          <span>
            <FaClock aria-hidden="true" />
            Peak {peakWindow}
          </span>
        </div>
      </div>

      <div className="library-card-trail">
        <FaChevronRight className="library-card-chevron" aria-hidden="true" />
      </div>
    </button>
  );
}

function LibraryAmenitiesGuidePage({ libraries, onBack, onSelectLibrary }) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [expandedAmenityCards, setExpandedAmenityCards] = useState(
    () => new Set(),
  );
  const detailsRef = useRef(null);
  const filterButtonRefs = useRef(new Map());
  const availableLibraries = libraries.filter((library) => !library.unavailable);
  const featuredAmenities = getLibraryFeaturedAmenitySummary(availableLibraries);
  const filteredLibraryAmenities = libraries
    .map((library) => {
      const amenities = getLibraryAmenityItems(library).filter((amenity) => {
        return doesAmenityMatchFeatureFilter(amenity, activeFilter);
      });

      return {
        amenities,
        library,
      };
    })
    .filter(({ amenities }) => amenities.length);
  const handleFilterSelect = (filter, { scrollToDetails = false } = {}) => {
    setActiveFilter(filter);

    window.requestAnimationFrame(() => {
      if (scrollToDetails) {
        detailsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }

      filterButtonRefs.current.get(filter)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    });
  };
  const handleAmenityToggle = (libraryId) => {
    setExpandedAmenityCards((currentExpandedCards) => {
      const nextExpandedCards = new Set(currentExpandedCards);

      if (nextExpandedCards.has(libraryId)) {
        nextExpandedCards.delete(libraryId);
      } else {
        nextExpandedCards.add(libraryId);
      }

      return nextExpandedCards;
    });
  };

  useEffect(() => {
    setExpandedAmenityCards(new Set());
  }, [activeFilter]);

  useEffect(() => {
    document.body.classList.add("library-amenities-overlay-open");

    return () => {
      document.body.classList.remove("library-amenities-overlay-open");
    };
  }, []);

  return (
    <div className="library-amenities-overlay-canvas">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="library-amenities-overlay-card"
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          type="button"
          className="library-overlay-back"
          onClick={onBack}
        >
          <FaArrowLeft aria-hidden="true" />
          Back to study spaces
        </button>

        <section className="library-amenities-layout">
          <section className="library-amenities-hero">
            <div className="library-amenities-title">
              <p className="eyebrow">Library amenities</p>
              <h1 className="section-title">Find your perfect space</h1>
            </div>

            <div className="library-amenities-summary-grid">
              {featuredAmenities.map(({ Icon, category, count, label }) => (
                <button
                  className="library-amenities-summary-card"
                  key={label}
                  onClick={() =>
                    handleFilterSelect(getSummaryFeatureFilter(category), {
                      scrollToDetails: true,
                    })
                  }
                  type="button"
                >
                  <span>
                    <Icon aria-hidden="true" size={22} strokeWidth={2} />
                  </span>
                  <strong>{count}</strong>
                  <small>{label}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="library-amenities-panel" ref={detailsRef}>
            <div className="section-head feed-head">
              <div>
                <p className="eyebrow">Details</p>
                <h2 className="section-title">Library-by-library features</h2>
              </div>
            </div>

            <div
              aria-label="Filter amenities by type"
              className="library-amenity-filter"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {FEATURE_FILTER_CATEGORIES.map((category) => (
                <button
                  aria-pressed={activeFilter === category}
                  className={activeFilter === category ? "active" : ""}
                  key={category}
                  onClick={() => handleFilterSelect(category)}
                  ref={(node) => {
                    if (node) {
                      filterButtonRefs.current.set(category, node);
                    } else {
                      filterButtonRefs.current.delete(category);
                    }
                  }}
                  type="button"
                >
                  {category}
                </button>
              ))}
            </div>

            <motion.div className="library-amenities-list" layout>
              {filteredLibraryAmenities.length ? (
                <AnimatePresence mode="popLayout">
                  {filteredLibraryAmenities.map(({ amenities, library }, index) => {
                    const isExpanded = expandedAmenityCards.has(library.id);

                    return (
                      <motion.article
                        animate={{ opacity: 1, y: 0 }}
                        className="library-amenities-library-card"
                        exit={{ opacity: 0, scale: 0.97, y: -8 }}
                        initial={{ opacity: 0, y: 10 }}
                        key={library.id}
                        layout
                        style={{ "--library-card-index": index }}
                        transition={{
                          layout: {
                            duration: 0.34,
                            ease: [0.2, 0.8, 0.2, 1],
                          },
                          opacity: { duration: 0.18 },
                          scale: { duration: 0.18 },
                          y: { duration: 0.24 },
                        }}
                      >
                        <div className="library-amenities-library-head">
                          <div>
                            <h3>{library.name}</h3>
                            <p>{getFeatureSummary(library)}</p>
                          </div>
                        </div>

                        <div className="library-amenity-grid">
                          <AmenityIconGroups
                            amenities={amenities}
                            compact
                            expanded={isExpanded}
                            onToggle={() => handleAmenityToggle(library.id)}
                          />
                        </div>

                        <button
                          className="library-amenity-view-button"
                          type="button"
                          onClick={() => onSelectLibrary(library.id)}
                        >
                          View Details
                        </button>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              ) : (
                <EmptyState compact message="No amenities match that filter yet." />
              )}
            </motion.div>
          </section>
        </section>
      </motion.div>
    </div>
  );
}

function LibraryDetailPage({
  library,
  onBack,
  onShowAmenitiesGuide,
  updatedLabel,
}) {
  const tone = getOccupancyTone(library.occupancyPercent);
  const amenities = getLibraryAmenityItems(library);
  const amenityGroups = groupAmenitiesByCategory(amenities);
  const chart = buildCapacityBarChart(library, { includeForecast: true });
  const featureSummary = getFeatureSummary(library);
  const mapUrl = getLibraryMapUrl(library);
  const statusLabel = library.unavailable
    ? "Unavailable"
    : getOccupancyLabel(library.occupancyPercent);

  return (
    <section className="library-detail-layout">
      <section className={`surface-panel library-detail-hero tone-${tone}`}>
        <button type="button" className="library-detail-back" onClick={onBack}>
          <FaArrowLeft aria-hidden="true" />
          Study spaces
        </button>

        <div className="library-detail-title">
          <p className="eyebrow">Library details</p>
          <h1 className="section-title">{library.name}</h1>
          <p>{featureSummary}</p>
        </div>

        <div className="library-detail-capacity-hero">
          <div className="library-detail-capacity-head">
            <div>
              <span>{statusLabel}</span>
              <strong>{library.occupancyPercent ?? 0}% full now</strong>
            </div>
            <small>{updatedLabel || "Live"}</small>
          </div>
          <CapacityBarChart
            bars={chart.bars}
            maxValue={chart.maxValue}
            showForecast
            size="large"
          />
        </div>

        <div className="library-detail-metric-banner">
          <span>
            <FaChair aria-hidden="true" />
            <strong>{formatNullableSeats(library.availableSeats)}</strong>
            <small>Seats free</small>
          </span>
          <span>
            <FaUsers aria-hidden="true" />
            <strong>{formatNullableSeats(library.occupiedSeats)}</strong>
            <small>In use</small>
          </span>
          <span>
            <FaClock aria-hidden="true" />
            <strong>{getPeakWindow(library)}</strong>
            <small>Peak window</small>
          </span>
        </div>

        <div className="library-detail-actions">
          <button type="button" onClick={onShowAmenitiesGuide}>
            <FaBookOpen aria-hidden="true" />
            Amenity guide
          </button>
          {mapUrl ? (
            <a href={mapUrl} rel="noreferrer" target="_blank">
              <FaMapMarkedAlt aria-hidden="true" />
              Open map
            </a>
          ) : null}
        </div>
      </section>

      <section className="surface-panel library-detail-section">
        <div className="section-head feed-head">
          <div>
            <p className="eyebrow">Features</p>
            <h2 className="section-title">What you get here</h2>
          </div>
        </div>

        {amenities.length ? (
          <div className="library-detail-amenity-groups">
            {amenityGroups.map(({ amenities: groupAmenities, category }) => (
              <section className="library-detail-amenity-group" key={category}>
                <h3>{category}</h3>
                <div className="library-detail-amenity-grid">
                  {groupAmenities.map(({ Icon, description, id, label }) => (
                    <article className="library-amenity-card" key={id}>
                      <span>
                        <Icon aria-hidden="true" />
                      </span>
                      <div>
                        <strong>{label}</strong>
                        <p>{description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState compact message="No feature details available yet." />
        )}
      </section>
    </section>
  );
}

function LibraryStatusVisual({ large = false, library, tone }) {
  if (library.unavailable) {
    return (
      <div
        aria-label={`${library.name} live data unavailable`}
        className={`library-warning-badge muted ${large ? "large" : ""}`}
        role="img"
      >
        <FaClock aria-hidden="true" />
      </div>
    );
  }

  if (library.isOverCapacity) {
    return (
      <div
        aria-label={`${library.name} is over capacity`}
        className={`library-warning-badge ${large ? "large" : ""}`}
        role="img"
      >
        <FaExclamationTriangle aria-hidden="true" />
      </div>
    );
  }

  return (
    <OccupancyRing
      ariaLabel={`${library.name} occupancy ${library.occupancyPercent} percent`}
      large={large}
      percent={library.occupancyPercent}
      tone={tone}
    />
  );
}

function OccupancyRing({ ariaLabel, large = false, percent, tone }) {
  const numericPercent = Number.isFinite(percent) ? Math.max(0, percent) : 0;
  const clampedPercent = Math.min(numericPercent, 100);

  return (
    <div
      aria-label={ariaLabel}
      className={`occupancy-ring ${large ? "large" : ""} tone-${tone}`}
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

function LibraryWaveGrid({
  libraries,
  onSelectLibrary,
  selectedCampusLabel,
  updatedLabel,
}) {
  const chart = buildCampusPulseChart(libraries);
  const [activePulseIndex, setActivePulseIndex] = useState(chart.currentIndex);
  const [isPulseScrubbing, setIsPulseScrubbing] = useState(false);
  const [showPulseScrubber, setShowPulseScrubber] = useState(false);
  const hidePulseTimerRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const selectedPulseIndex = Math.min(activePulseIndex, chart.currentIndex);
  const activePulsePoint = chart.points[selectedPulseIndex] ?? chart.points.at(-1);
  const activePulseX = activePulsePoint
    ? `${(activePulsePoint.x / chart.width) * 100}%`
    : "50%";
  const clearPulseTimers = () => {
    if (hidePulseTimerRef.current) {
      clearTimeout(hidePulseTimerRef.current);
      hidePulseTimerRef.current = null;
    }

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  const showPulseTimeline = () => {
    if (hidePulseTimerRef.current) {
      clearTimeout(hidePulseTimerRef.current);
      hidePulseTimerRef.current = null;
    }

    setShowPulseScrubber(true);
  };
  const schedulePulseHide = () => {
    if (hidePulseTimerRef.current) {
      clearTimeout(hidePulseTimerRef.current);
    }

    hidePulseTimerRef.current = setTimeout(() => {
      setShowPulseScrubber(false);
      hidePulseTimerRef.current = null;
    }, 3000);
  };
  const updatePulseScrubber = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = ((event.clientX - bounds.left) / bounds.width) * chart.width;

    setActivePulseIndex(getNearestPulseIndex(chart.pointXs, relativeX));
  };
  const handlePulseKeyDown = (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    showPulseTimeline();
    setActivePulseIndex((currentIndex) => {
      const nextIndex =
        event.key === "ArrowLeft" ? currentIndex - 1 : currentIndex + 1;

      return Math.min(Math.max(nextIndex, 0), chart.currentIndex);
    });
    schedulePulseHide();
  };
  const finishPulseScrub = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    setIsPulseScrubbing(false);

    if (showPulseScrubber) {
      schedulePulseHide();
    }
  };

  useEffect(() => {
    return () => clearPulseTimers();
  }, []);

  return (
    <article
      aria-label={`${selectedCampusLabel} library occupancy pulse chart`}
      className="library-capacity-card"
    >
      <div className="library-capacity-head">
        <div>
          <p className="eyebrow">Campus overview</p>
          <h2>Campus pulse</h2>
        </div>
        <span>{updatedLabel || "Live"}</span>
      </div>

      {libraries.length ? (
        <div className="library-campus-pulse-card">
          <div
            aria-label={chart.ariaLabel}
            className="library-campus-pulse-visual"
            onKeyDown={handlePulseKeyDown}
            onPointerCancel={finishPulseScrub}
            onPointerDown={(event) => {
              clearPulseTimers();
              event.currentTarget.setPointerCapture?.(event.pointerId);
              updatePulseScrubber(event);
              longPressTimerRef.current = setTimeout(() => {
                setIsPulseScrubbing(true);
                showPulseTimeline();
              }, 240);
            }}
            onPointerMove={(event) => {
              if (isPulseScrubbing || event.buttons === 1 || showPulseScrubber) {
                updatePulseScrubber(event);
              }
            }}
            onPointerUp={finishPulseScrub}
            role="slider"
            tabIndex={0}
            aria-valuemax={chart.currentIndex}
            aria-valuemin={0}
            aria-valuenow={selectedPulseIndex}
            aria-valuetext={activePulsePoint?.label}
          >
            <svg aria-hidden="true" viewBox="0 0 320 190">
              <line
                className="library-campus-pulse-threshold"
                x1="8"
                x2="312"
                y1={chart.thresholdY}
                y2={chart.thresholdY}
              />
              <text
                className="library-campus-pulse-threshold-label"
                x="10"
                y={Math.max(18, chart.thresholdY - 8)}
              >
                100% CAPACITY
              </text>
              {chart.series.map((series) => (
                <g
                  className={`library-campus-pulse-series ${series.colorClass}`}
                  key={series.library.id}
                >
                  <path
                    className="library-campus-pulse-area"
                    d={series.areaPath}
                  />
                  <path
                    className="library-campus-pulse-line"
                    d={series.linePath}
                  />
                </g>
              ))}
              {activePulsePoint ? (
                <g
                  className={`library-campus-pulse-scrubber ${
                    showPulseScrubber ? "visible" : ""
                  }`}
                >
                  <line
                    className="library-campus-pulse-scrubber-line"
                    x1={activePulsePoint.x}
                    x2={activePulsePoint.x}
                    y1={chart.graphTop}
                    y2={chart.baseline}
                  />
                  {chart.series.map((series) => {
                    const point = series.points[selectedPulseIndex];

                    return (
                      <circle
                        className={`library-campus-pulse-dot ${series.colorClass}`}
                        cx={point.x}
                        cy={point.y}
                        key={series.library.id}
                        r="4"
                      />
                    );
                  })}
                </g>
              ) : null}
            </svg>

            {activePulsePoint ? (
              <div
                aria-hidden={!showPulseScrubber}
                className={`library-campus-pulse-floating ${
                  showPulseScrubber ? "visible" : ""
                }`}
                style={{ "--pulse-x": activePulseX }}
              >
                <strong>{activePulsePoint.label}</strong>
                <div>
                  {activePulsePoint.items.map((item) => (
                    <span
                      className={`library-campus-pulse-floating-item ${item.colorClass}`}
                      key={item.id}
                    >
                      <i aria-hidden="true" />
                      {item.label} {item.value}%
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="library-campus-pulse-selectors">
            {chart.series.map((series) => (
              <button
                type="button"
                className={`library-campus-pulse-selector ${series.colorClass}`}
                key={series.library.id}
                onClick={() => onSelectLibrary(series.library.id)}
              >
                <span aria-hidden="true" />
                <strong>{getDiagramLabel(series.library)}</strong>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState compact message="No chart data right now." />
      )}
    </article>
  );
}

function MiniWaveCard({ library, onClick }) {
  const tone = getOccupancyTone(library.occupancyPercent);
  const chart = buildCapacityBarChart(library);
  const percent = Number.isFinite(library.occupancyPercent)
    ? library.occupancyPercent
    : 0;

  return (
    <button
      type="button"
      aria-label={`Open ${library.name} details, ${getAvailabilityLabel(library)}`}
      className={`library-mini-wave-card library-stock-card tone-${tone}`}
      onClick={onClick}
    >
      <div className="library-mini-wave-top">
        <div className="library-mini-wave-copy">
          <strong>{getDiagramLabel(library)}</strong>
          <span>{getAvailabilityLabel(library)}</span>
        </div>
        <span className="library-stock-percent">{percent}%</span>
      </div>

      <CapacityBarChart bars={chart.bars} maxValue={chart.maxValue} />
    </button>
  );
}

function CapacityBarChart({ bars, maxValue, showForecast = false, size = "compact" }) {
  const thresholdOffset = `${100 - (100 / maxValue) * 100}%`;

  return (
    <div className={`library-bar-chart size-${size}`}>
      <div
        aria-hidden="true"
        className="library-bar-threshold"
        style={{ "--threshold-offset": thresholdOffset }}
      >
        <span>100%</span>
      </div>
      <div className="library-bar-track">
        {bars.map((bar) => (
          <div
            className={`library-bar-column ${
              bar.isCurrent ? "current" : ""
            } ${bar.isForecast ? "forecast" : ""}`}
            key={bar.label}
          >
            <div
              aria-label={`${bar.label}: ${bar.value}% occupancy${
                bar.isForecast ? " forecast" : ""
              }`}
              className="library-bar"
              role="img"
            >
              <span
                className="library-bar-safe"
                style={{ height: `${bar.safePercent}%` }}
              />
              {bar.overPercent ? (
                <span
                  className="library-bar-over"
                  style={{ height: `${bar.overPercent}%` }}
                />
              ) : null}
            </div>
            <small>{bar.label}</small>
          </div>
        ))}
      </div>
      {showForecast ? (
        <div className="library-bar-caption">
          <span>Last 6h</span>
          <span>Now</span>
          <span>Next 2h</span>
        </div>
      ) : null}
    </div>
  );
}

function AmenityIconGroups({
  amenities,
  compact = false,
  expanded = false,
  onToggle,
}) {
  if (compact) {
    const visibleAmenities = expanded ? amenities : amenities.slice(0, 8);
    const hiddenAmenityCount = Math.max(amenities.length - visibleAmenities.length, 0);
    const canToggle = amenities.length > 8;

    return (
      <motion.div className="library-amenity-icon-grid compact" layout>
        <AnimatePresence mode="popLayout">
          {visibleAmenities.map(({ Icon, id, label: amenityLabel }, index) => (
            <motion.span
              animate={{ opacity: 1, scale: 1 }}
              className="library-amenity-icon-item"
              exit={{ opacity: 0, scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.9 }}
              key={id}
              layout
              style={{ "--feature-index": index }}
              transition={{
                layout: { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] },
                opacity: { duration: 0.16 },
                scale: { duration: 0.18 },
              }}
            >
              <i>
                <Icon aria-hidden="true" size={20} strokeWidth={2.5} />
              </i>
              <small>{amenityLabel}</small>
            </motion.span>
          ))}
          {canToggle ? (
            <motion.button
              animate={{ opacity: 1, scale: 1 }}
              aria-expanded={expanded}
              className="library-amenity-more-count"
              exit={{ opacity: 0, scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.9 }}
              key="amenity-toggle"
              layout
              onClick={onToggle}
              transition={{
                layout: { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] },
                opacity: { duration: 0.16 },
                scale: { duration: 0.18 },
              }}
              type="button"
            >
              {expanded ? "Show less" : `+${hiddenAmenityCount} more`}
            </motion.button>
          ) : null}
        </AnimatePresence>
      </motion.div>
    );
  }

  const groups = groupAmenitiesForIconGrid(amenities);

  return (
    <div className={`library-amenity-icon-groups ${compact ? "compact" : ""}`}>
      {groups.map(({ amenities: groupAmenities, label }) => (
        <section className="library-amenity-icon-group" key={label}>
          <h4>{label}</h4>
          <div className="library-amenity-icon-grid">
            {groupAmenities.map(({ Icon, id, label: amenityLabel }) => (
              <span className="library-amenity-icon-item" key={id}>
                <i>
                  <Icon aria-hidden="true" />
                </i>
                <small>{amenityLabel}</small>
              </span>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function filterAndSortLibraries(libraries, campusFilter) {
  const filteredLibraries = campusFilter.campuses
    ? libraries.filter((library) =>
        campusFilter.campuses.includes(library.campus),
      )
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

    const occupancyRank =
      getOccupancySortValue(left) - getOccupancySortValue(right);

    if (occupancyRank !== 0) {
      return occupancyRank;
    }

    return left.name.localeCompare(right.name);
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
  if (!library || library.unavailable || library.isOverCapacity) {
    return -1;
  }

  const availableSeats = Number(library.availableSeats) || 0;
  const occupancyPenalty = Number(library.occupancyPercent) || 0;

  return availableSeats * 10 - occupancyPenalty;
}

function getOccupancySortValue(library) {
  if (!library || library.unavailable || !Number.isFinite(library.occupancyPercent)) {
    return Number.POSITIVE_INFINITY;
  }

  return library.occupancyPercent;
}

function getWaveShowcaseItems(libraries) {
  const librariesByBusiest = [...libraries].sort((left, right) => {
    return (right.occupancyPercent ?? 0) - (left.occupancyPercent ?? 0);
  });
  const librariesByQuietest = [...libraries].sort((left, right) => {
    return (left.occupancyPercent ?? 0) - (right.occupancyPercent ?? 0);
  });

  return Array.from(
    new Map(
      [
        ...librariesByBusiest.slice(0, 2),
        ...librariesByQuietest.slice(0, 2),
        ...libraries,
      ].map((library) => [library.id, library]),
    ).values(),
  )
    .slice(0, 4)
    .sort((left, right) => {
      const occupancyRank =
        getOccupancySortValue(left) - getOccupancySortValue(right);

      if (occupancyRank !== 0) {
        return occupancyRank;
      }

      return left.name.localeCompare(right.name);
    });
}

function buildCampusPulseChart(libraries) {
  const width = 320;
  const baseline = 166;
  const graphTop = 30;
  const graphHeight = baseline - graphTop;
  const left = 8;
  const right = 312;
  const pointCount = 8;
  const colorClasses = ["tone-purple", "tone-blue", "tone-gold", "tone-mint"];
  const rawSeries = libraries.slice(0, 4).map((library, index) => {
    const currentPercent = Number.isFinite(library?.occupancyPercent)
      ? Math.max(0, Math.round(library.occupancyPercent))
      : 0;
    const trend = getCampusPulseProfile(library, pointCount);
    const values = trend.map((weight, pointIndex) => {
      if (pointIndex === trend.length - 1) {
        return currentPercent;
      }

      return Math.max(6, Math.round(currentPercent * weight));
    });

    return {
      colorClass: colorClasses[index % colorClasses.length],
      library,
      values,
    };
  });
  const maxValue = Math.max(
    125,
    roundUpToStep(
      Math.max(
        100,
        ...rawSeries.flatMap((series) => series.values),
      ),
      25,
    ),
  );
  const yForValue = (value) => {
    return baseline - (Math.min(value, maxValue) / maxValue) * graphHeight;
  };
  const xForIndex = (index) => {
    return left + ((right - left) / (pointCount - 1)) * index;
  };
  const labels = Array.from({ length: pointCount }, (_, index) => {
    return index === pointCount - 1
      ? `Now ${formatTime(new Date())}`
      : getDetailedHourRangeLabel(index - pointCount + 1);
  });
  const series = rawSeries.map((item) => {
    const points = item.values.map((value, index) => ({
      value,
      x: xForIndex(index),
      y: yForValue(value),
    }));
    const linePath = buildSmoothPath(points);

    return {
      ...item,
      areaPath: `${linePath} L ${points.at(-1).x.toFixed(2)} ${baseline} L ${points[0].x.toFixed(2)} ${baseline} Z`,
      linePath,
      points,
    };
  });
  const pointXs = labels.map((_, index) => xForIndex(index));
  const points = labels.map((label, index) => ({
    index,
    items: series.map((item) => ({
      colorClass: item.colorClass,
      id: item.library.id,
      label: getDiagramLabel(item.library),
      value: item.values[index],
    })),
    label,
    x: xForIndex(index),
  }));

  return {
    ariaLabel: series
      .map((item) => `${getDiagramLabel(item.library)} ${item.values.at(-1)} percent occupied`)
      .join(", "),
    baseline,
    currentIndex: pointCount - 1,
    graphTop,
    pointXs,
    points,
    series,
    thresholdY: yForValue(100),
    width,
  };
}

function getNearestPulseIndex(pointXs, pointerX) {
  return pointXs.reduce((nearestIndex, pointX, index) => {
    const nearestDistance = Math.abs(pointXs[nearestIndex] - pointerX);
    const currentDistance = Math.abs(pointX - pointerX);

    return currentDistance < nearestDistance ? index : nearestIndex;
  }, 0);
}

function getCampusPulseProfile(library, pointCount) {
  const baseProfile = getTrendProfile(library);
  const pulseProfiles = {
    "architecture-and-music-library": [0.46, 0.72, 0.54, 0.7, 0.5, 0.64, 0.78, 1],
    "biological-sciences-library": [0.72, 0.46, 0.58, 0.76, 0.52, 0.66, 0.58, 1],
    "central-library": [0.42, 0.92, 0.76, 0.48, 0.86, 0.55, 0.7, 1],
    "dorothy-hill-engineering-and-sciences-library": [0.6, 0.8, 0.7, 0.52, 0.46, 0.72, 0.84, 1],
    "duhig-tower": [0.62, 0.8, 0.68, 0.78, 0.52, 0.64, 0.82, 1],
    "walter-harrison-law-library": [0.5, 0.76, 0.66, 0.86, 0.58, 0.7, 0.62, 1],
  };
  const profile = pulseProfiles[library?.id] ?? [
    ...baseProfile.slice(0, pointCount - 1),
    1,
  ];

  return profile.slice(0, pointCount);
}

function buildSmoothPath(points) {
  if (!points.length) {
    return "";
  }

  return points.reduce((path, point, index) => {
    const x = point.x.toFixed(2);
    const y = point.y.toFixed(2);

    if (index === 0) {
      return `M ${x} ${y}`;
    }

    const previous = points[index - 1];
    const controlX = ((previous.x + point.x) / 2).toFixed(2);

    return `${path} C ${controlX} ${previous.y.toFixed(2)}, ${controlX} ${y}, ${x} ${y}`;
  }, "");
}

function buildCapacityBarChart(library, { includeForecast = false } = {}) {
  const currentPercent = Number.isFinite(library?.occupancyPercent)
    ? Math.max(0, Math.round(library.occupancyPercent))
    : 0;
  const profile = getTrendProfile(library);
  const forecastProfile = getForecastProfile(library);
  const maxValue = Math.max(
    125,
    roundUpToStep(
      Math.max(
        currentPercent,
        ...profile.map((weight) => currentPercent * weight),
        ...(includeForecast
          ? forecastProfile.map((weight) => currentPercent * weight)
          : []),
      ),
      25,
    ),
  );
  const values = profile.map((weight, index) => {
    if (index === profile.length - 1) {
      return currentPercent;
    }

    return Math.max(4, Math.round(currentPercent * weight));
  });
  const forecastValues = includeForecast
    ? forecastProfile.map((weight) => Math.max(4, Math.round(currentPercent * weight)))
    : [];
  const allValues = [...values, ...forecastValues];
  const startOffset = includeForecast ? -6 : -6;
  const bars = allValues.map((value, index) => {
    const hourOffset = startOffset + index;
    const safeValue = Math.min(value, 100);
    const overValue = Math.max(value - 100, 0);

    return {
      isCurrent: hourOffset === 0,
      isForecast: hourOffset > 0,
      label: getHourRangeLabel(hourOffset),
      overPercent: (overValue / maxValue) * 100,
      safePercent: (safeValue / maxValue) * 100,
      value,
    };
  });

  return {
    bars,
    maxValue,
  };
}

function getTrendProfile(library) {
  const profiles = {
    "architecture-and-music-library": [0.3, 0.42, 0.62, 0.82, 0.9, 0.74, 1],
    "biological-sciences-library": [0.34, 0.5, 0.78, 0.94, 0.86, 0.72, 1],
    "central-library": [0.48, 0.7, 0.96, 1.08, 1, 0.88, 1],
    "dorothy-hill-engineering-and-sciences-library": [
      0.38,
      0.58,
      0.82,
      1,
      0.92,
      0.78,
      1,
    ],
    "dutton-park-health-sciences-library": [0.34, 0.52, 0.76, 0.92, 1, 0.82, 1],
    "duhig-tower": [0.44, 0.64, 0.88, 1.04, 0.98, 0.84, 1],
    "herston-health-sciences-library": [0.32, 0.5, 0.74, 0.9, 1, 0.84, 1],
    "jk-murray-library-uq-gatton": [0.28, 0.46, 0.72, 0.9, 1, 0.76, 1],
    "walter-harrison-law-library": [0.4, 0.62, 0.84, 1, 0.94, 0.82, 1],
  };

  return profiles[library?.id] ?? [0.34, 0.54, 0.8, 1, 0.92, 0.78, 1];
}

function getForecastProfile(library) {
  const currentPercent = Number.isFinite(library?.occupancyPercent)
    ? library.occupancyPercent
    : 0;

  if (currentPercent > 100) {
    return [0.96, 0.9];
  }

  if (currentPercent >= 75) {
    return [0.94, 0.86];
  }

  if (currentPercent >= 50) {
    return [0.9, 0.82];
  }

  return [0.86, 0.78];
}

function roundUpToStep(value, step) {
  return Math.ceil(value / step) * step;
}

function getHourRangeLabel(offset) {
  const startHour = (getBrisbaneHour() + offset + 24) % 24;
  const endHour = (startHour + 1) % 24;

  return `${startHour}-${endHour}`;
}

function getDetailedHourRangeLabel(offset) {
  const startHour = (getBrisbaneHour() + offset + 24) % 24;
  const endHour = (startHour + 1) % 24;
  const startPeriod = getHourPeriod(startHour);
  const endPeriod = getHourPeriod(endHour);

  if (startPeriod === endPeriod) {
    return `${formatClockHour(startHour)}-${formatClockHour(endHour, true)}`;
  }

  return `${formatClockHour(startHour, true)}-${formatClockHour(endHour, true)}`;
}

function formatClockHour(hour, includePeriod = false) {
  const displayHour = hour % 12 || 12;
  const period = getHourPeriod(hour);

  return `${displayHour}:00${includePeriod ? ` ${period}` : ""}`;
}

function getHourPeriod(hour) {
  return hour >= 12 ? "pm" : "am";
}

function getBrisbaneHour() {
  const hourPart = new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone: BRISBANE_TZ,
  })
    .formatToParts(new Date())
    .find((part) => part.type === "hour");

  return Number(hourPart?.value ?? new Date().getHours());
}

function getPeakWindow(library) {
  const peakWindows = {
    "architecture-and-music-library": "12-3 pm",
    "biological-sciences-library": "11 am-2 pm",
    "central-library": "12-4 pm",
    "dorothy-hill-engineering-and-sciences-library": "11 am-3 pm",
    "dutton-park-health-sciences-library": "1-4 pm",
    "duhig-tower": "12-4 pm",
    "herston-health-sciences-library": "1-4 pm",
    "jk-murray-library-uq-gatton": "10 am-2 pm",
    "walter-harrison-law-library": "11 am-3 pm",
  };

  return peakWindows[library?.id] ?? "12-3 pm";
}

function getUsedSeatsLabel(library) {
  if (library?.unavailable) {
    return "No live count";
  }

  if (!Number.isFinite(library?.occupiedSeats) || !Number.isFinite(library?.totalSeats)) {
    return "No seat count";
  }

  return `${formatSeats(library.occupiedSeats)}/${formatSeats(library.totalSeats)} used`;
}

function groupAmenitiesByCategory(amenities) {
  const categoryMap = amenities.reduce((groups, amenity) => {
    if (!groups.has(amenity.category)) {
      groups.set(amenity.category, []);
    }

    groups.get(amenity.category).push(amenity);
    return groups;
  }, new Map());

  return Array.from(categoryMap, ([category, groupedAmenities]) => ({
    amenities: groupedAmenities,
    category,
  }));
}

function groupAmenitiesForIconGrid(amenities) {
  const groupDefinitions = [
    {
      categories: new Set(["Study", "Accessibility"]),
      label: "Study environments",
    },
    {
      categories: new Set(["Equipment"]),
      label: "Hardware",
    },
    {
      categories: new Set(["Access", "Bookable", "Comfort", "Specialty", "Support"]),
      label: "Services",
    },
  ];

  return groupDefinitions
    .map((group) => ({
      amenities: amenities.filter((amenity) => {
        return group.categories.has(amenity.category);
      }),
      label: group.label,
    }))
    .filter((group) => group.amenities.length);
}

function getDiagramLabel(library) {
  return LIBRARY_DIAGRAM_LABELS.get(library.id) ?? library.shortName;
}

function getAvailabilityLabel(library) {
  if (library.unavailable) {
    return "Live data unavailable";
  }

  if (library.isOverCapacity) {
    return "OVER CAPACITY";
  }

  return `${formatSeats(library.availableSeats)} seats free`;
}

function formatBestLibraryMessage(library) {
  if (!library) {
    return "Waiting for live study-space data.";
  }

  if (library.isOverCapacity) {
    return "Over capacity right now - try another library nearby.";
  }

  return `${formatSeats(library.availableSeats)} seats free right now.`;
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

function formatNullableSeats(value) {
  if (!Number.isFinite(value)) {
    return "No data";
  }

  return formatSeats(value);
}

function formatTime(dateTime) {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: BRISBANE_TZ,
  }).format(new Date(dateTime));
}
