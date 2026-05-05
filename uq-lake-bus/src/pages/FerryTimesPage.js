import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaArrowLeft,
  FaChevronDown,
  FaClock,
  FaExchangeAlt,
  FaExclamationCircle,
  FaFlag,
  FaMagic,
  FaMapMarkerAlt,
  FaShip,
  FaSyncAlt,
} from "react-icons/fa";

const FERRY_REFRESH_MS = 15000;
const FERRY_REFRESH_FEEDBACK_MS = 800;
const FERRY_ROUTE_CODE = "F1";
const FERRY_ROUTE_NAME = "F1 Northshore Hamilton/UQ St Lucia";
const FERRY_STOP_NAME = "UQ St Lucia ferry terminal";
const FERRY_DEFAULT_JOURNEY_ID = "f1-citycat";
const BRISBANE_TZ = "Australia/Brisbane";
const SIMPLE_DIRECTION_TO_UQ = "toUq";
const SIMPLE_DIRECTION_FROM_UQ = "fromUq";
const SIMPLE_STATIONS = [
  "Northshore Hamilton",
  "Bretts Wharf",
  "Teneriffe",
  "Bulimba",
  "Riverside",
  "QUT Gardens Point",
  "South Bank",
  "West End",
  "Guyatt Park",
  "UQ St Lucia",
];
const SIMPLE_SELECTABLE_STATIONS = SIMPLE_STATIONS.filter((station) => {
  return station !== "UQ St Lucia";
});
const FERRY_JOURNEYS = [
  {
    id: FERRY_DEFAULT_JOURNEY_ID,
    label: "F1 CityCat",
    originLabel: "UQ St Lucia",
    originStopName: FERRY_STOP_NAME,
    destinationLabel: "Northshore Hamilton",
    destinationMatchers: ["northshore", "hamilton"],
    routeCode: "F1",
    routeName: "F1 Northshore Hamilton/UQ St Lucia",
    serviceLabel: "CityCat",
    vesselLabel: "CityCat fleet",
    usePrimaryFerryEndpoint: true,
  },
  {
    id: "f11-express-citycat",
    label: "F11 Express",
    originLabel: "Apollo Road",
    originStopName: "Apollo Road ferry terminal",
    destinationLabel: "Riverside",
    destinationMatchers: ["riverside"],
    routeCode: "F11",
    routeName: "F11 Apollo Road/Riverside",
    serviceLabel: "Express CityCat",
    vesselLabel: "CityCat fleet",
  },
  {
    id: "f12-express-citycat",
    label: "F12 Express",
    originLabel: "West End",
    originStopName: "West End ferry terminal",
    destinationLabel: "QUT Gardens Point",
    destinationMatchers: ["qut", "gardens point"],
    routeCode: "F12",
    routeName: "F12 West End/QUT Gardens Point",
    serviceLabel: "Express CityCat",
    vesselLabel: "CityCat fleet",
  },
  {
    id: "f21-cross-river",
    label: "F21 Bulimba",
    originLabel: "Bulimba",
    originStopName: "Bulimba ferry terminal",
    destinationLabel: "Teneriffe",
    destinationMatchers: ["teneriffe"],
    routeCode: "F21",
    routeName: "F21 Bulimba/Teneriffe",
    serviceLabel: "Cross River",
    vesselLabel: "KittyCat ferry",
  },
  {
    id: "f22-cross-river",
    label: "F22 Dockside",
    originLabel: "Dockside",
    originStopName: "Dockside ferry terminal",
    destinationLabel: "Sydney Street",
    destinationMatchers: ["sydney street"],
    routeCode: "F22",
    routeName: "F22 Dockside/Sydney Street",
    serviceLabel: "Cross River",
    vesselLabel: "KittyCat ferry",
  },
  {
    id: "f23-cross-river",
    label: "F23 Holman",
    originLabel: "Holman Street",
    originStopName: "Holman Street ferry terminal",
    destinationLabel: "Riverside",
    destinationMatchers: ["riverside"],
    routeCode: "F23",
    routeName: "F23 Holman Street/Riverside",
    serviceLabel: "Cross River",
    vesselLabel: "KittyCat ferry",
  },
  {
    id: "f24-cross-river",
    label: "F24 Maritime",
    originLabel: "Maritime Museum",
    originStopName: "Maritime Museum ferry terminal",
    destinationLabel: "QUT Gardens Point",
    destinationMatchers: ["qut", "gardens point"],
    routeCode: "F24",
    routeName: "F24 Maritime Museum/QUT Gardens Point",
    serviceLabel: "Cross River",
    vesselLabel: "KittyCat ferry",
  },
];

export default function FerryTimesPage({ onBack }) {
  const [ferryData, setFerryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [isSimplified, setIsSimplified] = useState(false);
  const [simpleDirection, setSimpleDirection] = useState(
    SIMPLE_DIRECTION_TO_UQ,
  );
  const [myStation, setMyStation] = useState("South Bank");
  const [selectedJourneyId, setSelectedJourneyId] = useState(
    FERRY_DEFAULT_JOURNEY_ID,
  );
  const selectedJourney = getFerryJourney(selectedJourneyId);
  const activeJourney = isSimplified
    ? getSimpleFerryJourney(simpleDirection, myStation)
    : selectedJourney;
  const resetFerryPayload = () => {
    setFerryData(null);
    setError("");
  };
  const toggleSimpleMode = () => {
    resetFerryPayload();
    setIsSimplified((currentValue) => !currentValue);
  };
  const handleSimpleDirectionChange = (nextDirection) => {
    resetFerryPayload();
    setSimpleDirection(nextDirection);
  };
  const handleSimpleStationChange = (nextStation) => {
    resetFerryPayload();
    setMyStation(nextStation);
  };

  const fetchData = async ({ silent = false } = {}) => {
    const refreshStartedAt = Date.now();

    if (silent) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextData = await fetchFerryPayload(activeJourney);
      setFerryData(nextData);
      setError("");
    } catch (fetchError) {
      console.error(fetchError);
      setError("Could not load live ferry times right now.");
    } finally {
      if (silent) {
        const elapsedMs = Date.now() - refreshStartedAt;
        const remainingMs = Math.max(0, FERRY_REFRESH_FEEDBACK_MS - elapsedMs);

        if (remainingMs) {
          await waitForFerryRefreshFeedback(remainingMs);
        }
      }

      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isActive = true;

    const load = async (options) => {
      if (!isActive) {
        return;
      }

      await fetchData(options);
    };

    load();
    const intervalId = window.setInterval(() => {
      load({ silent: true });
    }, FERRY_REFRESH_MS);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [activeJourney.id]);

  const departures = ferryData?.departures ?? [];
  const simpleSummary = getSimpleFerrySummary({
    departure: departures[0],
    direction: simpleDirection,
    hasLiveStationData: Boolean(departures[0]),
    stationName: myStation,
  });
  const updatedLabel = ferryData?.generatedAt
    ? formatFerryTimestamp(ferryData.generatedAt)
    : "Loading";

  return (
    <motion.section
      animate={{ clipPath: "inset(0% 0% 0% 0% round 0px)", opacity: 1, y: 0 }}
      aria-label="Live ferry times"
      className="ferry-page"
      initial={{
        clipPath: "inset(5% 0% 0% 0% round 34px)",
        opacity: 0,
        y: 22,
      }}
      transition={{
        clipPath: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: 0.2 },
        y: { type: "spring", stiffness: 460, damping: 34 },
      }}
    >
      <header className="ferry-header">
        <div className="ferry-header-controls">
          <button type="button" className="ferry-back-button" onClick={onBack}>
            <FaArrowLeft aria-hidden="true" />
            <span>Back</span>
          </button>

          <button
            type="button"
            className="ferry-refresh-button"
            disabled={isRefreshing || loading}
            onClick={() => fetchData({ silent: true })}
          >
            <FaSyncAlt
              aria-hidden="true"
              className={isRefreshing || loading ? "spinning" : ""}
            />
            <span>{isRefreshing || loading ? "Refreshing" : "Refresh"}</span>
          </button>
        </div>

        <div className="ferry-hero-copy">
          <motion.span
            animate={{ rotate: [-3, 3, -3], y: [0, -6, 0] }}
            aria-hidden="true"
            className="ferry-header-ship"
            transition={{
              duration: 4,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          >
            <FaShip />
          </motion.span>
          <h1>Live Ferry Times</h1>
          <span>Updated {updatedLabel}</span>
        </div>

        <button
          type="button"
          className={`ferry-simple-toggle ${isSimplified ? "active" : ""}`}
          aria-pressed={isSimplified}
          onClick={toggleSimpleMode}
        >
          <span className="ferry-simple-toggle-track" aria-hidden="true">
            <motion.span
              animate={{ x: isSimplified ? 18 : 0 }}
              className="ferry-simple-toggle-knob"
              transition={{ type: "spring", stiffness: 520, damping: 32 }}
            >
              <FaMagic />
            </motion.span>
          </span>
          <span>Simplify</span>
        </button>
      </header>

      <main className="ferry-content">
        <AnimatePresence mode="wait" initial={false}>
          {isSimplified ? (
            <motion.div
              key="simple-ferry"
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="ferry-simple-shell"
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              initial={{ opacity: 0, scale: 0.98, y: 14 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <SimpleFerryPanel
                direction={simpleDirection}
                isRefreshing={isRefreshing || loading}
                myStation={myStation}
                onDirectionChange={handleSimpleDirectionChange}
                onStationChange={handleSimpleStationChange}
                summary={simpleSummary}
              />
            </motion.div>
          ) : (
            <motion.div
              key="detailed-ferry"
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="ferry-detailed-shell"
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              initial={{ opacity: 0, scale: 0.98, y: 14 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="ferry-journey-switcher"
                aria-label="Choose ferry trip"
              >
                {FERRY_JOURNEYS.map((journey) => (
                  <button
                    key={journey.id}
                    type="button"
                    className={`ferry-journey-chip ${
                      selectedJourneyId === journey.id ? "active" : ""
                    }`}
                    aria-pressed={selectedJourneyId === journey.id}
                    onClick={() => {
                      if (journey.id !== selectedJourneyId) {
                        setFerryData(null);
                        setError("");
                        setSelectedJourneyId(journey.id);
                      }
                    }}
                  >
                    {journey.label}
                  </button>
                ))}
              </div>

              <div className="ferry-departure-list">
                {loading ? (
                  Array.from({ length: 4 }, (_, index) => (
                    <article
                      className="ferry-departure-card skeleton-card"
                      key={index}
                    />
                  ))
                ) : error ? (
                  <div className="ferry-error-card">
                    <FaExclamationCircle aria-hidden="true" />
                    <p>{error}</p>
                  </div>
                ) : departures.length ? (
                  <AnimatePresence mode="popLayout">
                    {departures.map((departure, index) => (
                      <FerryDepartureCard
                        departure={departure}
                        index={index}
                        isRefreshing={isRefreshing}
                        journey={activeJourney}
                        key={departure.id}
                        showProgress={index === 0}
                      />
                    ))}
                  </AnimatePresence>
                ) : (
                  <div className="ferry-empty-card">
                    No {getJourneyRouteCode(activeJourney)} ferries from{" "}
                    {activeJourney.originLabel} to{" "}
                    {activeJourney.destinationLabel} are listed right now.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </motion.section>
  );
}

async function fetchFerryPayload(journey) {
  if (journey.usePrimaryFerryEndpoint) {
    try {
      const ferryPayload = await fetchJsonPayload("/api/ferries");

      if (Array.isArray(ferryPayload?.departures)) {
        if (ferryPayload.departures.length > 0) {
          return addFerryPresentationFields(ferryPayload, journey);
        }

        console.warn(
          "Ferry endpoint returned no F1 departures; trying fallback.",
        );
      }
    } catch (primaryError) {
      console.error(
        "Primary ferry endpoint failed; trying fallback.",
        primaryError,
      );
    }
  }

  const fallbackTimetable = await fetchJsonPayload(
    buildFerryDeparturesUrl(journey.originStopName),
  );

  return buildFerryPayloadFromDepartures(fallbackTimetable, journey);
}

function addFerryPresentationFields(payload, journey) {
  return {
    ...payload,
    departures: payload.departures.map((departure) => {
      const countdownMinutes = Number.isFinite(departure?.countdownMinutes)
        ? departure.countdownMinutes
        : 0;

      return {
        ...departure,
        currentLocation:
          departure.currentLocation ||
          getMockFerryCurrentLocation(countdownMinutes, journey),
        originLabel: departure.originLabel || journey.originLabel,
        routeLabel:
          departure.routeLabel || getFerryRouteLabel(departure, journey),
        vesselLabel:
          departure.vesselLabel || getFerryVesselLabel(departure, journey),
      };
    }),
  };
}

async function fetchJsonPayload(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
  });
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Request failed: ${url} (${response.status})`);
  }

  if (!contentType.includes("application/json")) {
    throw new Error(
      `Expected JSON from ${url}, got ${contentType || "unknown"}.`,
    );
  }

  return JSON.parse(body);
}

function buildFerryDeparturesUrl(stopName) {
  const params = new URLSearchParams({
    limit: "96",
    stopName,
  });

  return `/api/departures?${params.toString()}`;
}

function buildFerryPayloadFromDepartures(timetable, journey) {
  const departures = (timetable?.departures ?? [])
    .filter((departure) => {
      return (
        String(departure?.routeCode ?? "").toUpperCase() ===
          getJourneyRouteCode(journey) &&
        matchesFerryDestination(departure, journey)
      );
    })
    .slice(0, 12)
    .map((departure) => normalizeFallbackFerryDeparture(departure, journey));

  return {
    departures,
    generatedAt: new Date().toISOString(),
    routeCode: getJourneyRouteCode(journey),
    routeName: journey.routeName ?? FERRY_ROUTE_NAME,
    sourceUrl: timetable?.sourceUrl,
    stopName: timetable?.stopName ?? journey.originStopName,
  };
}

function SimpleFerryPanel({
  direction,
  isRefreshing,
  myStation,
  onDirectionChange,
  onStationChange,
  summary,
}) {
  const goingToUq = direction === SIMPLE_DIRECTION_TO_UQ;

  return (
    <article
      className={`ferry-simple-card ${isRefreshing ? "refreshing" : ""}`}
    >
      <div className="ferry-simple-topline">
        <div>
          <span className="ferry-simple-kicker">Simple F1 helper</span>
          <h2>{goingToUq ? "Get me to UQ" : "Leave from UQ"}</h2>
        </div>

        <button
          type="button"
          className="ferry-simple-direction"
          onClick={() =>
            onDirectionChange(
              goingToUq ? SIMPLE_DIRECTION_FROM_UQ : SIMPLE_DIRECTION_TO_UQ,
            )
          }
        >
          <FaExchangeAlt aria-hidden="true" />
          <span>{goingToUq ? "To UQ" : "From UQ"}</span>
        </button>
      </div>

      <label className="ferry-simple-select-label">
        <span>{goingToUq ? "I am at" : "I want to go to"}</span>
        <span className="ferry-simple-select-shell">
          <select
            value={myStation}
            onChange={(event) => onStationChange(event.target.value)}
          >
            {SIMPLE_SELECTABLE_STATIONS.map((station) => (
              <option key={station} value={station}>
                {station}
              </option>
            ))}
          </select>
          <FaChevronDown aria-hidden="true" />
        </span>
      </label>

      <div className="ferry-simple-destination">
        <span className="ferry-simple-live-dot" aria-hidden="true" />
        <span>
          Destination: <strong>{summary.destinationLabel}</strong>
        </span>
      </div>

      <div className="ferry-simple-timer">
        <FaClock aria-hidden="true" />
        <div>
          <span>Estimated wait</span>
          <strong>{summary.waitText}</strong>
        </div>
      </div>

      <SimpleFerryWave summary={summary} />

      <div className="ferry-simple-meta">
        <span>Ferry near</span>
        <strong>{summary.ferryLocation}</strong>
      </div>
    </article>
  );
}

function SimpleFerryWave({ summary }) {
  const timelineStops =
    summary.timelineStops?.length > 0
      ? summary.timelineStops
      : [{ label: summary.ferryLocation, tone: "current" }];
  const markerLeft =
    timelineStops.length <= 1
      ? 0
      : (summary.currentTimelineIndex / (timelineStops.length - 1)) * 100;

  return (
    <div className="ferry-simple-wave">
      <div className="ferry-simple-timeline-head">
        <span>Current ferry</span>
        <strong>{summary.ferryLocation}</strong>
      </div>

      <motion.span
        className="ferry-simple-ship"
        animate={{
          rotate: [-2, 3, -2],
          y: [0, -5, 0],
        }}
        style={{
          left: `clamp(0px, calc(${markerLeft}% - 20px), calc(100% - 40px))`,
        }}
        transition={{
          rotate: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <FaFlag />
      </motion.span>

      <div className="ferry-simple-timeline-rail" aria-hidden="true">
        <motion.span
          animate={{ width: `${markerLeft}%` }}
          className="ferry-simple-timeline-progress"
          initial={false}
          transition={{ type: "spring", stiffness: 140, damping: 22 }}
        />
      </div>

      <ol
        className="ferry-simple-timeline-stops"
        aria-label="Ferry route timeline"
      >
        {timelineStops.map((stop, index) => (
          <li
            className={`ferry-simple-timeline-stop ${stop.tone}`}
            key={`${stop.label}-${index}`}
          >
            <span aria-hidden="true" />
            <strong>{stop.label}</strong>
          </li>
        ))}
      </ol>
    </div>
  );
}

function FerryDepartureCard({
  departure,
  index,
  isRefreshing,
  journey,
  showProgress,
}) {
  const statusKey = normalizeFerryStatus(departure.status);
  const routeKey = /cross river|kittycat/i.test(
    `${departure.routeLabel ?? ""} ${departure.vesselLabel ?? ""}`,
  )
    ? "kittycat"
    : /speedycat|express/i.test(departure.routeLabel)
      ? "express"
      : "citycat";
  const progressPercent = Math.min(
    100,
    Math.max(4, Number(departure.progressPercent ?? 8)),
  );

  return (
    <motion.article
      animate={{ opacity: isRefreshing ? 0.55 : 1, y: 0 }}
      className={`ferry-departure-card ${showProgress ? "closest" : ""} ${
        isRefreshing ? "refreshing" : ""
      }`}
      exit={{ opacity: 0, scale: 0.97, y: -12 }}
      initial={{ opacity: 0, y: 20 }}
      layout
      transition={{
        delay: index * 0.075,
        layout: {
          type: "spring",
          stiffness: 420,
          damping: 34,
          mass: 0.78,
        },
        opacity: { duration: 0.24 },
        y: {
          type: "spring",
          stiffness: 360,
          damping: 28,
          mass: 0.8,
        },
      }}
    >
      <span className="ferry-card-glow" aria-hidden="true" />

      <div className="ferry-departure-tags">
        <div className="ferry-service-tags">
          <span className={`ferry-route-tag ${routeKey}`}>
            {departure.routeCode ? `${departure.routeCode} ` : ""}
            {departure.routeLabel || "CityCat"}
          </span>
          <span className={`ferry-vessel-tag ${routeKey}`}>
            {departure.vesselLabel || "Ferry"}
          </span>
        </div>
        {showProgress ? (
          <span className={`ferry-status-tag ${statusKey}`}>
            <motion.span
              animate={{ opacity: [0.62, 1, 0.62], scale: [1, 1.3, 1] }}
              aria-hidden="true"
              className="ferry-status-dot"
              transition={{
                duration: 1.6,
                ease: "easeInOut",
                repeat: Infinity,
              }}
            />
            {departure.status || "Normal"}
          </span>
        ) : null}
      </div>

      <div className="ferry-departure-main">
        <div>
          <span className="ferry-micro-label">Going to</span>
          <h2>{departure.destination}</h2>
          <p>
            {departure.originLabel || journey.originLabel} ·{" "}
            {departure.displayTime}
          </p>
        </div>
        <div className={`ferry-countdown ${statusKey}`}>
          <span>Time left</span>
          <strong>{departure.countdownText}</strong>
        </div>
      </div>

      {showProgress ? (
        <FerryWaveProgress
          currentLocation={departure.currentLocation}
          progressPercent={progressPercent}
          statusKey={statusKey}
        />
      ) : null}
    </motion.article>
  );
}

function normalizeFallbackFerryDeparture(departure, journey) {
  const countdownMinutes = Number.isFinite(departure?.countdownMinutes)
    ? departure.countdownMinutes
    : 0;

  return {
    countdownMinutes,
    countdownText:
      departure?.countdownText ?? formatFerryCountdown(countdownMinutes),
    currentLocation: getMockFerryCurrentLocation(countdownMinutes, journey),
    destination: cleanFerryDestination(
      departure?.destination,
      departure?.fullHeadsign,
    ),
    displayTime: departure?.displayTime,
    fullHeadsign: departure?.fullHeadsign,
    id: departure?.id,
    live: Boolean(departure?.live),
    originLabel: journey.originLabel,
    progressPercent: getCountdownProgressPercent(countdownMinutes),
    routeCode: getJourneyRouteCode(journey),
    routeLabel: getFerryRouteLabel(departure, journey),
    scheduledUtc: departure?.scheduledUtc,
    status: departure?.live ? "Normal" : "Scheduled",
    terminal: "Terminal 1",
    vesselLabel: getFerryVesselLabel(departure, journey),
  };
}

function getFerryJourney(journeyId) {
  return (
    FERRY_JOURNEYS.find((journey) => journey.id === journeyId) ??
    FERRY_JOURNEYS[0]
  );
}

function getSimpleFerryJourney(direction, stationName) {
  const safeStationName = getSafeSimpleStation(stationName);

  if (direction === SIMPLE_DIRECTION_FROM_UQ) {
    return {
      ...FERRY_JOURNEYS[0],
      destinationLabel: safeStationName,
      id: `simple-from-uq-${normalizeSimpleStationName(safeStationName)}`,
      label: `UQ to ${safeStationName}`,
    };
  }

  return {
    id: `simple-to-uq-${normalizeSimpleStationName(safeStationName)}`,
    label: `${safeStationName} to UQ`,
    originLabel: safeStationName,
    originStopName: `${safeStationName} ferry terminal`,
    destinationLabel: "UQ St Lucia",
    destinationMatchers: ["uq st lucia", "uq"],
    routeCode: FERRY_ROUTE_CODE,
    routeName: FERRY_ROUTE_NAME,
    serviceLabel: "CityCat",
    vesselLabel: "CityCat fleet",
  };
}

function getSimpleFerrySummary({
  departure,
  direction,
  hasLiveStationData,
  stationName,
}) {
  const goingToUq = direction === SIMPLE_DIRECTION_TO_UQ;
  const directionalStations = goingToUq
    ? SIMPLE_STATIONS
    : [...SIMPLE_STATIONS].reverse();
  const safeStationName = getSafeSimpleStation(stationName);
  const stationIndex = directionalStations.findIndex(
    (station) => station === safeStationName,
  );
  const targetIndex = stationIndex >= 0 ? stationIndex : 1;
  const ferryIndex = Math.max(0, targetIndex - 2);
  const stationDistance = Math.max(1, targetIndex - ferryIndex);
  const hasLiveDeparture =
    hasLiveStationData && Number.isFinite(departure?.countdownMinutes);
  const mockWaitMinutes = stationDistance * 6;
  const waitMinutes = hasLiveDeparture
    ? Math.max(0, Number(departure.countdownMinutes))
    : mockWaitMinutes;
  const progressPercent =
    targetIndex <= 0
      ? 12
      : Math.max(
          14,
          Math.min(92, Math.round((ferryIndex / targetIndex) * 100)),
        );
  const timelineStops = buildSimpleFerryTimelineStops(
    directionalStations,
    ferryIndex,
    targetIndex,
  );
  const currentTimelineIndex = timelineStops.findIndex((stop) => {
    return stop.tone === "current";
  });

  return {
    currentTimelineIndex: currentTimelineIndex >= 0 ? currentTimelineIndex : 0,
    destinationLabel: goingToUq ? "UQ St Lucia" : safeStationName,
    departureTimeText: hasLiveDeparture ? departure.displayTime : "",
    ferryLocation: directionalStations[ferryIndex] ?? directionalStations[0],
    progressPercent,
    stationLabel: safeStationName,
    timelineStops,
    waitText: formatFerryCountdown(waitMinutes),
  };
}

function buildSimpleFerryTimelineStops(stations, ferryIndex, targetIndex) {
  const startIndex = Math.max(0, ferryIndex);
  const endIndex = Math.max(startIndex, targetIndex);
  const segment = stations.slice(startIndex, endIndex + 1);
  const compactSegment =
    segment.length <= 5
      ? segment
      : [
          segment[0],
          segment[1],
          segment[Math.floor(segment.length / 2)],
          segment.at(-2),
          segment.at(-1),
        ];

  return compactSegment.map((station, index) => {
    const isCurrent = index === 0;
    const isPickup = station === stations[targetIndex];

    return {
      label: station,
      tone: isCurrent ? "current" : isPickup ? "pickup" : "next",
    };
  });
}

function getSafeSimpleStation(stationName) {
  return SIMPLE_SELECTABLE_STATIONS.includes(stationName)
    ? stationName
    : "South Bank";
}

function normalizeSimpleStationName(stationName) {
  return String(stationName ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesFerryDestination(departure, journey) {
  const destinationText = `${departure?.destination ?? ""} ${
    departure?.fullHeadsign ?? ""
  }`.toLowerCase();

  return journey.destinationMatchers.some((matcher) => {
    return destinationText.includes(matcher);
  });
}

function cleanFerryDestination(destination, headsign) {
  const rawDestination = String(
    destination || headsign || "Northshore Hamilton",
  )
    .replace(/^towards\s+/i, "")
    .replace(/\bferry\b/gi, "")
    .replace(/\bterminal\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return rawDestination || "Northshore Hamilton";
}

function getJourneyRouteCode(journey) {
  return String(journey?.routeCode ?? FERRY_ROUTE_CODE).toUpperCase();
}

function getFerryRouteLabel(departure, journey) {
  const headsign = `${departure?.fullHeadsign ?? ""} ${
    departure?.destination ?? ""
  }`;

  if (journey?.serviceLabel) {
    return journey.serviceLabel;
  }

  return /speedycat|express/i.test(headsign) ? "Express CityCat" : "CityCat";
}

function getFerryVesselLabel(departure, journey) {
  const routeCode = getJourneyRouteCode(journey);

  if (/^F2[1-4]$/.test(routeCode)) {
    return "KittyCat ferry";
  }

  return journey?.vesselLabel ?? "CityCat fleet";
}

function getCountdownProgressPercent(minutesAway) {
  if (minutesAway <= 0) {
    return 100;
  }

  return Math.max(8, Math.min(100, Math.round(100 - (minutesAway / 60) * 100)));
}

function FerryWaveProgress({ currentLocation, progressPercent, statusKey }) {
  const wavePath = "M 4 30 Q 44 10 84 30 T 164 30 T 244 30 T 324 30";
  const locationLabel = currentLocation || "Near the terminal";
  const edgeClass = getFerryBubbleEdgeClass(progressPercent);

  return (
    <div
      className="ferry-wave-progress"
      aria-label={`Ferry currently near ${locationLabel}`}
      role="img"
      style={{ "--ferry-progress": `${progressPercent}%` }}
    >
      <svg
        className="ferry-wave-svg"
        viewBox="0 0 328 56"
        preserveAspectRatio="none"
      >
        <path className="ferry-wave-base" d={wavePath} pathLength="100" />
        <motion.path
          className={`ferry-wave-fill ${statusKey}`}
          d={wavePath}
          pathLength="100"
          initial={{ strokeDasharray: "100 100", strokeDashoffset: 100 }}
          animate={{ strokeDashoffset: 100 - progressPercent }}
          transition={{
            type: "spring",
            stiffness: 135,
            damping: 24,
            mass: 0.74,
          }}
        />
      </svg>

      <motion.span
        className={`ferry-wave-vehicle ${statusKey} ${edgeClass}`}
        animate={{
          rotate: [-3, 3, -3],
          y: [0, -6, 0],
        }}
        style={{
          left: `clamp(0px, calc(${progressPercent}% - 16px), calc(100% - 38px))`,
        }}
        transition={{
          rotate: { duration: 2, ease: "easeInOut", repeat: Infinity },
          y: { duration: 2, ease: "easeInOut", repeat: Infinity },
        }}
      >
        <motion.span
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="ferry-location-bubble"
          initial={{ opacity: 0, scale: 0.82, y: 8 }}
          transition={{
            delay: 0.72,
            type: "spring",
            stiffness: 360,
            damping: 22,
          }}
        >
          <FaMapMarkerAlt aria-hidden="true" />
          <span>{locationLabel}</span>
        </motion.span>
        <FaShip />
      </motion.span>
    </div>
  );
}

function getFerryBubbleEdgeClass(progressPercent) {
  if (progressPercent >= 78) {
    return "edge-end";
  }

  if (progressPercent <= 18) {
    return "edge-start";
  }

  return "";
}

function getMockFerryCurrentLocation(countdownMinutes, journey) {
  const routeStops = getJourneyLocationStops(journey);
  const leadTimePercent = Math.min(Math.max(countdownMinutes, 0), 60) / 60;
  const progressIndex = Math.max(
    0,
    Math.min(
      routeStops.length - 1,
      Math.round(leadTimePercent * (routeStops.length - 1)),
    ),
  );

  return routeStops[progressIndex];
}

function getJourneyLocationStops(journey) {
  if (journey?.id === "west-end-to-uq") {
    return ["West End", "Regatta", "Guyatt Park", "UQ St Lucia"];
  }

  if (journey?.id === "south-bank-to-uq") {
    return ["South Bank", "West End", "Regatta", "Guyatt Park", "UQ St Lucia"];
  }

  return [
    "UQ St Lucia",
    "Guyatt Park",
    "West End",
    "South Bank",
    "Riverside",
    "New Farm Park",
    "Northshore",
  ];
}

function normalizeFerryStatus(status) {
  const key = String(status ?? "normal").toLowerCase();

  if (key.includes("delay")) {
    return "delayed";
  }

  return "normal";
}

function waitForFerryRefreshFeedback(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function formatFerryCountdown(minutesAway) {
  const safeMinutes = Math.max(0, Math.round(Number(minutesAway) || 0));

  if (safeMinutes <= 0) {
    return "Now";
  }

  if (safeMinutes < 60) {
    return `${safeMinutes} min`;
  }

  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatFerryTimestamp(dateTime) {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: BRISBANE_TZ,
  }).format(new Date(dateTime));
}
