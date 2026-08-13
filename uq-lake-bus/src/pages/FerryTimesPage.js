import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaChevronDown,
  FaExchangeAlt,
  FaExclamationCircle,
  FaFlag,
  FaShip,
  FaSyncAlt,
} from "react-icons/fa";

const FERRY_REFRESH_MS = 15000;
const FERRY_REFRESH_FEEDBACK_MS = 800;
const FERRY_PENDING_MINUTES = 2;
const FERRY_REQUEST_TIMEOUT_MS = 8000;
const FERRY_ROUTE_CODE = "F1";
const FERRY_ROUTE_NAME = "F1 Northshore Hamilton/UQ St Lucia";
const FERRY_STOP_NAME = "UQ St Lucia ferry terminal";
const FERRY_DEFAULT_JOURNEY_ID = "f1-citycat";
const BRISBANE_TZ = "Australia/Brisbane";
const SIMPLE_DIRECTION_TO_UQ = "toUq";
const SIMPLE_DIRECTION_FROM_UQ = "fromUq";
const F1_TO_NORTHSHORE_STATIONS = [
  "UQ St Lucia",
  "West End",
  "Guyatt Park",
  "Regatta",
  "Milton",
  "North Quay",
  "South Bank",
  "QUT Gardens Point",
  "Riverside",
  "Howard Smith Wharves",
  "Sydney Street",
  "Mowbray Park",
  "New Farm Park",
  "Hawthorne",
  "Bulimba",
  "Teneriffe",
  "Bretts Wharf",
  "Apollo Road",
  "Northshore Hamilton",
];
const F1_TO_NORTHSHORE_SEGMENT_MINUTES = [
  5, 3, 4, 4, 6, 4, 4, 9, 5, 7, 3, 4, 5, 4, 4, 6, 3, 4,
];
const F1_TO_UQ_STATIONS = [...F1_TO_NORTHSHORE_STATIONS].reverse();
const F1_TO_UQ_SEGMENT_MINUTES = [
  ...F1_TO_NORTHSHORE_SEGMENT_MINUTES,
].reverse();
const SIMPLE_SELECTABLE_STATIONS = F1_TO_NORTHSHORE_STATIONS.filter((station) => {
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
];

export default function FerryTimesPage({ modeSelector }) {
  const [ferryData, setFerryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [clockTick, setClockTick] = useState(() => Date.now());
  const [isSimplified, setIsSimplified] = useState(false);
  const [simpleDirection, setSimpleDirection] = useState(
    SIMPLE_DIRECTION_TO_UQ,
  );
  const [myStation, setMyStation] = useState("South Bank");
  const [selectedJourneyId, setSelectedJourneyId] = useState(
    FERRY_DEFAULT_JOURNEY_ID,
  );
  const isMountedRef = useRef(true);
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
  const fetchData = async ({ force = false, silent = false } = {}) => {
    const refreshStartedAt = Date.now();

    if (silent) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextData = await fetchFerryPayload(activeJourney, {
        force,
        onUpdate: (freshData) => {
          if (!isMountedRef.current) {
            return;
          }

          setFerryData(freshData);
          setError("");
        },
        staleWhileRevalidate: !force,
      });

      if (!isMountedRef.current) {
        return;
      }

      setFerryData(nextData);
      setError("");
    } catch (fetchError) {
      if (!isMountedRef.current) {
        return;
      }

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

      if (!isMountedRef.current) {
        return;
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

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClockTick(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const departures = ferryData?.departures ?? [];
  const simpleSummary = getSimpleFerrySummary({
    clockTick,
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
      animate={{
        clipPath: "inset(0% 0% 0% 0% round 0px)",
        filter: "blur(0px)",
        opacity: 1,
        scale: 1,
        y: 0,
      }}
      aria-label="Live ferry times"
      className="ferry-page"
      initial={{
        clipPath: "inset(5% 0% 0% 0% round 34px)",
        opacity: 0,
        y: 22,
      }}
      transition={{
        clipPath: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
        filter: { duration: 0.24 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.24 },
        y: { type: "spring", stiffness: 460, damping: 34 },
      }}
    >
      {modeSelector}

      <header className="ferry-header">
        <div className="ferry-header-controls">
          <button
            type="button"
            className="ferry-refresh-button"
            aria-label={isRefreshing || loading ? "Refreshing" : "Refresh"}
            disabled={isRefreshing || loading}
            onClick={() => fetchData({ force: true, silent: true })}
          >
            <FaSyncAlt
              aria-hidden="true"
              className={isRefreshing || loading ? "spinning" : ""}
            />
          </button>
        </div>

        <div className="ferry-hero-copy">
          <h1>Brisbane Ferries</h1>
        </div>

        <div
          className="ferry-view-tabs"
          aria-label="Choose ferry view"
          role="tablist"
        >
          <motion.span
            aria-hidden="true"
            className="ferry-view-tabs-indicator"
            animate={{ x: isSimplified ? "100%" : "0%" }}
            transition={{ type: "spring", stiffness: 430, damping: 34 }}
          />
          <button
            type="button"
            aria-selected={!isSimplified}
            className={!isSimplified ? "active" : ""}
            onClick={() => {
              if (isSimplified) {
                toggleSimpleMode();
              }
            }}
            role="tab"
          >
            Live List
          </button>
          <button
            type="button"
            aria-selected={isSimplified}
            className={isSimplified ? "active" : ""}
            onClick={() => {
              if (!isSimplified) {
                toggleSimpleMode();
              }
            }}
            role="tab"
          >
            Timeline
          </button>
        </div>
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

async function fetchFerryPayload(
  journey,
  _options = {},
) {
  return fetchFerryPayloadFromNetwork(journey);
}

async function fetchFerryPayloadFromNetwork(journey) {
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

  const fallbackUrl = buildFerryDeparturesUrl(journey.originStopName);
  const fallbackTimetable = await fetchJsonPayload(fallbackUrl);

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
  const response = await fetchWithTimeout(url, {
    cache: "no-store",
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

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, FERRY_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Request timed out: ${url}`);
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
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
  const stationSelect = (
    <label className="ferry-simple-route-point selectable">
      <small>{goingToUq ? "From" : "To"}</small>
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
  );
  const uqPoint = (
    <span className="ferry-simple-route-point">
      <small>{goingToUq ? "To" : "From"}</small>
      <strong>UQ St Lucia</strong>
    </span>
  );

  return (
    <article
      className={`ferry-simple-card ${isRefreshing ? "refreshing" : ""}`}
    >
      <div className="ferry-simple-topline">
        <div>
          <span className="ferry-simple-kicker">Simple F1 helper</span>
          <h2>{summary.routeTitle}</h2>
        </div>
      </div>

      <div className="ferry-simple-route-flow">
        {goingToUq ? stationSelect : uqPoint}

        <button
          type="button"
          className="ferry-simple-route-swap"
          aria-label={goingToUq ? "Switch to from UQ" : "Switch to to UQ"}
          onClick={() =>
            onDirectionChange(
              goingToUq ? SIMPLE_DIRECTION_FROM_UQ : SIMPLE_DIRECTION_TO_UQ,
            )
          }
        >
          <FaExchangeAlt />
        </button>

        {goingToUq ? uqPoint : stationSelect}
      </div>

      {summary.departureTimeText ? (
        <div className="ferry-simple-departure-time">
          <span>Departs {summary.originLabel}</span>
          <strong>{summary.departureTimeText}</strong>
        </div>
      ) : null}

      <FlipWaitClock clock={summary.waitClock} />

      <LiveJourneyTimeline summary={summary} />

      <div className="ferry-simple-current-card">
        <span>Estimated near</span>
        <strong>{summary.ferryLocation}</strong>
        <small>Next stop estimate: {summary.nextStationLabel}</small>
      </div>
    </article>
  );
}

function FlipWaitClock({ clock }) {
  const minutes = clock?.minutes ?? "0";
  const seconds = clock?.seconds ?? "00";
  const departing = Boolean(clock?.departing);
  const pending = Boolean(clock?.pending);

  return (
    <section
      className={`ferry-flip-clock ${departing ? "departing" : ""} ${
        pending ? "pending" : ""
      }`}
      aria-label={
        departing
          ? "The ferry is going to depart"
          : pending
            ? `Pending departure in about ${minutes} minutes`
          : `Estimated wait ${minutes} minutes ${seconds} seconds`
      }
    >
      {departing || pending ? (
        <motion.div
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className={`ferry-departing-now ${pending ? "pending" : ""}`}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: "spring", stiffness: 360, damping: 26 }}
        >
          <span>{pending ? "Pending departure" : "Departing now"}</span>
          <strong>
            {pending ? `Be ready in ${minutes} min` : "Ferry is going to depart"}
          </strong>
        </motion.div>
      ) : (
        <>
          <span className="ferry-flip-clock-label">Estimated wait</span>
          <div className="ferry-flip-clock-row">
            <FlipClockUnit label="min" value={minutes} />
            <span className="ferry-flip-clock-colon">:</span>
            <FlipClockUnit label="sec" value={seconds} />
          </div>
        </>
      )}
    </section>
  );
}

function FlipClockUnit({ label, value }) {
  return (
    <span className="ferry-flip-unit">
      <span className="ferry-flip-card">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.strong
            animate={{ opacity: 1, rotateX: 0, y: 0 }}
            exit={{ opacity: 0, rotateX: 82, y: 8 }}
            initial={{ opacity: 0, rotateX: -82, y: -8 }}
            key={value}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {value}
          </motion.strong>
        </AnimatePresence>
      </span>
      <small>{label}</small>
    </span>
  );
}

function LiveJourneyTimeline({ summary }) {
  const stops = summary.liveJourneyStops?.length
    ? summary.liveJourneyStops
    : summary.timelineStops ?? [];
  const progressPercent = Number.isFinite(summary.liveJourneyProgress)
    ? summary.liveJourneyProgress
    : 0;

  return (
    <section className="ferry-live-journey" aria-label="Live journey timeline">
      <div className="ferry-live-journey-head">
        <span>Journey estimate</span>
        <strong>{summary.stopsAwayLabel}</strong>
      </div>

      <div className="ferry-live-journey-track">
        <div className="ferry-live-journey-line" aria-hidden="true">
          <span className="ferry-live-journey-base" />
          <motion.span
            animate={{ width: `${progressPercent}%` }}
            className="ferry-live-journey-fill"
            initial={false}
            transition={{ type: "spring", stiffness: 150, damping: 24 }}
          />
        </div>
        <ol className="ferry-live-journey-dots">
          {stops.map((stop, index) => {
            const showLabel = index === 0 || index === stops.length - 1;

            return (
              <li
                aria-label={stop.label}
                className={`ferry-live-journey-dot ${stop.tone} ${
                  showLabel ? "endpoint" : "middle"
                }`}
                key={`${stop.label}-${index}`}
              >
                <span aria-hidden="true" />
                {showLabel ? <strong>{stop.label}</strong> : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function SimpleFerryWave({ summary }) {
  const timelineStops =
    summary.timelineStops?.length > 0
      ? summary.timelineStops
      : [{ label: summary.ferryLocation, tone: "current" }];
  const markerLeft =
    Number.isFinite(summary.markerPercent) ? summary.markerPercent : 0;

  return (
    <div className="ferry-simple-wave">
      <div className="ferry-simple-timeline-head">
        <span>Approach timeline</span>
        <small>Live ETA estimate</small>
      </div>

      <div className="ferry-simple-next-stop">
        <span>Next stop</span>
        <strong>{summary.nextStationLabel}</strong>
      </div>

      <motion.span
        className="ferry-simple-ship"
        animate={{
          rotate: [-2, 3, -2],
          y: [0, -5, 0],
        }}
        style={{
          left: `clamp(0px, calc(${markerLeft}% - 17px), calc(100% - 34px))`,
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
  const isDeparting = Number(departure.countdownMinutes ?? 0) <= 0;
  const isPending =
    !isDeparting &&
    Number(departure.countdownMinutes ?? Number.POSITIVE_INFINITY) <=
      FERRY_PENDING_MINUTES;
  const countdownParts = getCountdownParts(
    departure.countdownText,
    isDeparting,
    isPending,
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
        <div
          className={`ferry-countdown ${statusKey} ${
            isDeparting ? "departing" : ""
          } ${isPending ? "pending" : ""}`}
        >
          <span>
            {isDeparting ? "Board now" : isPending ? "Pending" : "Time left"}
          </span>
          <strong>
            {countdownParts.value}
            {countdownParts.unit ? <small>{countdownParts.unit}</small> : null}
          </strong>
        </div>
      </div>

      {showProgress ? (
        <FerryWaveProgress
          dataLabel={departure.gtfsRealtime ? "GTFS live" : "Scheduled"}
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
  clockTick,
  departure,
  direction,
  hasLiveStationData,
  stationName,
}) {
  const routePlan = getSimpleRoutePlan(direction, stationName);
  const hasLiveDeparture =
    hasLiveStationData && Number.isFinite(departure?.countdownMinutes);
  const mockWaitMinutes = getMockWaitMinutesToPickup(
    routePlan.originIndex,
    routePlan.segmentMinutes,
  );
  const waitMinutes = hasLiveDeparture
    ? Math.max(0, Number(departure.countdownMinutes))
    : mockWaitMinutes;
  const approach = estimateFerryApproachToPickup({
    pickupIndex: routePlan.originIndex,
    segmentMinutes: routePlan.segmentMinutes,
    stationCount: routePlan.routeStations.length,
    waitMinutes,
  });
  const timelineStops = buildSimpleFerryTimelineStops(
    routePlan.routeStations,
    approach.currentIndex,
    approach.nextIndex,
    routePlan.destinationIndex,
  );
  const currentTimelineIndex = timelineStops.findIndex((stop) => {
    return stop.tone === "current";
  });
  const markerIndex = timelineStops.findIndex((stop) => {
    return stop.tone === "next";
  });
  const markerProgress =
    timelineStops.length <= 1
      ? 0
      : (((markerIndex > 0 ? markerIndex - 1 : 0) + approach.segmentProgress) /
          (timelineStops.length - 1)) *
        100;
  const stopsToPickup = Math.max(0, routePlan.originIndex - approach.currentIndex);
  const tripStopCount = Math.max(
    0,
    routePlan.destinationIndex - routePlan.originIndex,
  );
  const liveJourneyStops = buildLiveJourneyStops(
    routePlan.routeStations,
    routePlan.originIndex,
    routePlan.destinationIndex,
  );
  const compactLiveJourneyStops = compactLiveJourneyStopsForDisplay(
    liveJourneyStops,
  );
  const visualSegmentProgress = getJourneySegmentProgress(approach, routePlan);
  const liveJourneyProgress =
    liveJourneyStops.length <= 1
      ? 100
      : Math.max(
          0,
          Math.min(
            100,
            Math.round((visualSegmentProgress / (liveJourneyStops.length - 1)) * 100),
          ),
        );

  return {
    currentTimelineIndex: currentTimelineIndex >= 0 ? currentTimelineIndex : 0,
    destinationLabel: routePlan.destinationLabel,
    departureTimeText: hasLiveDeparture ? departure.displayTime : "",
    ferryLocation:
      routePlan.routeStations[approach.currentIndex] ?? routePlan.originLabel,
    markerPercent: Math.max(0, Math.min(100, Math.round(markerProgress))),
    nextStationLabel: getSimpleNextStationLabel(routePlan, approach),
    originLabel: routePlan.originLabel,
    pickupStation: routePlan.originLabel,
    routeTitle: `${routePlan.originLabel} to ${routePlan.destinationLabel}`,
    stationLabel: routePlan.selectedStation,
    liveJourneyProgress,
    liveJourneyStops: compactLiveJourneyStops,
    stopsAway: stopsToPickup,
    stopsAwayLabel: getSimpleJourneyStatusLabel({
      destinationLabel: routePlan.destinationLabel,
      originLabel: routePlan.originLabel,
      stopsToPickup,
      tripStopCount,
    }),
    timelineStops,
    waitClock: getDisplayWaitClock(waitMinutes, clockTick),
    waitText: formatFerryCountdown(waitMinutes),
  };
}

function compactLiveJourneyStopsForDisplay(stops) {
  if (stops.length <= 2) {
    return stops;
  }

  return [
    { ...stops[0], tone: "current" },
    {
      label: "On the way",
      tone: "middle",
    },
    { ...stops[stops.length - 1], tone: "destination" },
  ];
}

function getSimpleRoutePlan(direction, stationName) {
  const selectedStation = getSafeSimpleStation(stationName);
  const goingToUq = direction === SIMPLE_DIRECTION_TO_UQ;
  const routeStations = goingToUq ? F1_TO_UQ_STATIONS : F1_TO_NORTHSHORE_STATIONS;
  const segmentMinutes = goingToUq
    ? F1_TO_UQ_SEGMENT_MINUTES
    : F1_TO_NORTHSHORE_SEGMENT_MINUTES;
  const originLabel = goingToUq ? selectedStation : "UQ St Lucia";
  const destinationLabel = goingToUq ? "UQ St Lucia" : selectedStation;
  const originIndex = getSimpleRouteStationIndex(routeStations, originLabel, 0);
  const destinationIndex = getSimpleRouteStationIndex(
    routeStations,
    destinationLabel,
    routeStations.length - 1,
  );

  return {
    destinationIndex: Math.max(originIndex, destinationIndex),
    destinationLabel,
    originIndex,
    originLabel,
    routeStations,
    segmentMinutes,
    selectedStation,
  };
}

function getSimpleRouteStationIndex(routeStations, stationName, fallbackIndex) {
  const index = routeStations.findIndex((station) => station === stationName);

  return index >= 0 ? index : fallbackIndex;
}

function getSimpleJourneyStatusLabel({
  destinationLabel,
  originLabel,
  stopsToPickup,
  tripStopCount,
}) {
  if (stopsToPickup > 0) {
    return `${stopsToPickup} ${stopsToPickup === 1 ? "stop" : "stops"} to ${originLabel}`;
  }

  if (tripStopCount > 0) {
    return `${tripStopCount} ${tripStopCount === 1 ? "stop" : "stops"} to ${destinationLabel}`;
  }

  return "Approaching now";
}

function getSimpleNextStationLabel(routePlan, approach) {
  if (approach.currentIndex < routePlan.originIndex) {
    return routePlan.routeStations[approach.nextIndex] ?? routePlan.originLabel;
  }

  const nextTripIndex = Math.min(
    routePlan.destinationIndex,
    routePlan.originIndex + 1,
  );

  return routePlan.routeStations[nextTripIndex] ?? routePlan.destinationLabel;
}

function getJourneySegmentProgress(approach, routePlan) {
  if (!approach || approach.currentIndex < routePlan.originIndex) {
    return 0;
  }

  const journeyIndex = Math.max(
    0,
    Math.min(
      routePlan.destinationIndex - routePlan.originIndex,
      approach.currentIndex - routePlan.originIndex,
    ),
  );

  if (journeyIndex <= 0) {
    return 0;
  }

  const safeProgress = Number.isFinite(approach.segmentProgress)
    ? approach.segmentProgress
    : 0;

  return journeyIndex + Math.max(0, Math.min(0.94, safeProgress));
}

function buildLiveJourneyStops(stations, currentIndex, targetIndex) {
  const startIndex = Math.max(0, Math.min(currentIndex, targetIndex));
  const endIndex = Math.max(startIndex, targetIndex);

  return stations.slice(startIndex, endIndex + 1).map((station, index, segment) => {
    const actualIndex = startIndex + index;
    const isCurrent = actualIndex === currentIndex;
    const isDestination = actualIndex === targetIndex;
    const isPast = actualIndex < currentIndex;

    return {
      label: station,
      tone: isCurrent
        ? "current"
        : isDestination
          ? "destination"
          : isPast
            ? "past"
            : index === segment.length - 1
              ? "destination"
              : "upcoming",
    };
  });
}

function getDisplayWaitClock(waitMinutes, clockTick) {
  const safeMinutes = Math.max(0, Math.floor(Number(waitMinutes) || 0));

  if (safeMinutes <= 0) {
    return {
      departing: true,
      pending: false,
      minutes: "0",
      seconds: "00",
    };
  }

  const secondsIntoMinute = new Date(clockTick || Date.now()).getSeconds();
  const estimatedSeconds = Math.max(0, safeMinutes * 60 - secondsIntoMinute);

  return {
    departing: estimatedSeconds <= 0,
    pending: estimatedSeconds > 0 && estimatedSeconds <= FERRY_PENDING_MINUTES * 60,
    minutes: String(Math.floor(estimatedSeconds / 60)),
    seconds: String(estimatedSeconds % 60).padStart(2, "0"),
  };
}

function estimateFerryApproachToPickup({
  pickupIndex,
  segmentMinutes,
  stationCount,
  waitMinutes,
}) {
  const safePickupIndex = Math.max(
    0,
    Math.min(stationCount - 1, pickupIndex),
  );
  if (safePickupIndex === 0) {
    return {
      currentIndex: 0,
      nextIndex: 0,
      segmentProgress: 0,
    };
  }

  let currentIndex = Math.max(0, safePickupIndex - 1);
  let smallestPositiveDelta = Number.POSITIVE_INFINITY;

  for (let index = 0; index < safePickupIndex; index += 1) {
    const minutesFromStop = getMinutesBetweenSimpleStops(
      index,
      safePickupIndex,
      segmentMinutes,
    );
    const delta = minutesFromStop - waitMinutes;

    if (delta >= 0 && delta < smallestPositiveDelta) {
      smallestPositiveDelta = delta;
      currentIndex = index;
    }
  }

  const nextIndex = Math.min(currentIndex + 1, safePickupIndex);
  const minutesFromCurrent = getMinutesBetweenSimpleStops(
    currentIndex,
    safePickupIndex,
    segmentMinutes,
  );
  const minutesFromNext = getMinutesBetweenSimpleStops(
    nextIndex,
    safePickupIndex,
    segmentMinutes,
  );
  const segmentDuration = Math.max(1, minutesFromCurrent - minutesFromNext);
  const segmentProgress = Math.max(
    0,
    Math.min(1, (minutesFromCurrent - waitMinutes) / segmentDuration),
  );

  return {
    currentIndex,
    nextIndex,
    segmentProgress,
  };
}

function getMinutesBetweenSimpleStops(fromIndex, toIndex, segmentMinutes) {
  if (fromIndex >= toIndex) {
    return 0;
  }

  return segmentMinutes.slice(fromIndex, toIndex).reduce(
    (totalMinutes, segmentMinutes) => totalMinutes + segmentMinutes,
    0,
  );
}

function getMockWaitMinutesToPickup(pickupIndex, segmentMinutes) {
  if (pickupIndex <= 0) {
    return 6;
  }

  const approachStartIndex = Math.max(0, pickupIndex - 2);

  return Math.max(
    6,
    getMinutesBetweenSimpleStops(approachStartIndex, pickupIndex, segmentMinutes),
  );
}

function buildSimpleFerryTimelineStops(stations, currentIndex, nextIndex, targetIndex) {
  const startIndex = Math.max(0, currentIndex);
  const endIndex = Math.max(startIndex, targetIndex);
  const importantIndexes = [
    startIndex,
    Math.max(startIndex, nextIndex),
    Math.max(startIndex, targetIndex - 1),
    endIndex,
  ];
  const uniqueIndexes = Array.from(new Set(importantIndexes)).filter((index) => {
    return index >= startIndex && index <= endIndex;
  });

  return uniqueIndexes.map((index) => {
    const isCurrent = index === startIndex;
    const isNext = index === nextIndex && index !== startIndex;
    const isPickup = index === targetIndex;

    return {
      label: stations[index],
      tone: isCurrent ? "current" : isNext ? "next" : isPickup ? "pickup" : "path",
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

function FerryWaveProgress({ dataLabel, progressPercent, statusKey }) {
  const wavePath = "M 4 30 Q 44 10 84 30 T 164 30 T 244 30 T 324 30";
  const edgeClass = getFerryBubbleEdgeClass(progressPercent);

  return (
    <div
      className="ferry-wave-progress"
      aria-label={`${dataLabel} departure countdown`}
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
        <FaShip />
      </motion.span>

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
        <span>{dataLabel}</span>
      </motion.span>
    </div>
  );
}

function getCountdownParts(countdownText, isDeparting = false, isPending = false) {
  if (isDeparting) {
    return {
      unit: "",
      value: "Departing",
    };
  }

  if (isPending) {
    return {
      unit: "",
      value: "Pending",
    };
  }

  const text = String(countdownText ?? "").trim();
  const match = text.match(/^(\d+)\s*(.*)$/);

  if (!match) {
    return {
      unit: "",
      value: text,
    };
  }

  return {
    unit: match[2] || "",
    value: match[1],
  };
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
