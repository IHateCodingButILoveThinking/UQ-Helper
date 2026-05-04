import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaArrowLeft,
  FaExclamationCircle,
  FaMapMarkerAlt,
  FaShip,
  FaSyncAlt,
} from "react-icons/fa";

const FERRY_REFRESH_MS = 30000;
const FERRY_REFRESH_FEEDBACK_MS = 800;
const FERRY_ROUTE_CODE = "F1";
const FERRY_ROUTE_NAME = "F1 Northshore Hamilton/UQ St Lucia";
const FERRY_STOP_NAME = "UQ St Lucia ferry terminal";
const FERRY_DEFAULT_JOURNEY_ID = "uq-to-northshore";
const BRISBANE_TZ = "Australia/Brisbane";
const FERRY_JOURNEYS = [
  {
    id: FERRY_DEFAULT_JOURNEY_ID,
    label: "UQ to Northshore",
    originLabel: "UQ St Lucia",
    originStopName: FERRY_STOP_NAME,
    destinationLabel: "Northshore Hamilton",
    destinationMatchers: ["northshore", "hamilton"],
    usePrimaryFerryEndpoint: true,
  },
  {
    id: "west-end-to-uq",
    label: "West End to UQ",
    originLabel: "West End",
    originStopName: "West End ferry terminal",
    destinationLabel: "UQ St Lucia",
    destinationMatchers: ["uq st lucia", "uq"],
  },
  {
    id: "south-bank-to-uq",
    label: "South Bank to UQ",
    originLabel: "South Bank",
    originStopName: "South Bank ferry terminal",
    destinationLabel: "UQ St Lucia",
    destinationMatchers: ["uq st lucia", "uq"],
  },
];

export default function FerryTimesPage({ onBack }) {
  const [ferryData, setFerryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedJourneyId, setSelectedJourneyId] = useState(
    FERRY_DEFAULT_JOURNEY_ID,
  );
  const selectedJourney = getFerryJourney(selectedJourneyId);

  const fetchData = async ({ silent = false } = {}) => {
    const refreshStartedAt = Date.now();

    if (silent) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextData = await fetchFerryPayload(selectedJourney);
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
  }, [selectedJourneyId]);

  const departures = ferryData?.departures ?? [];
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
      </header>

      <main className="ferry-content">
        <div className="ferry-journey-switcher" aria-label="Choose ferry trip">
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
                  journey={selectedJourney}
                  key={departure.id}
                  showProgress={index === 0}
                />
              ))}
            </AnimatePresence>
          ) : (
            <div className="ferry-empty-card">
              No F1 ferries from {selectedJourney.originLabel} to{" "}
              {selectedJourney.destinationLabel} are listed right now.
            </div>
          )}
        </div>
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

        console.warn("Ferry endpoint returned no F1 departures; trying fallback.");
      }
    } catch (primaryError) {
      console.error("Primary ferry endpoint failed; trying fallback.", primaryError);
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
    throw new Error(`Expected JSON from ${url}, got ${contentType || "unknown"}.`);
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
          FERRY_ROUTE_CODE && matchesFerryDestination(departure, journey)
      );
    })
    .slice(0, 12)
    .map((departure) => normalizeFallbackFerryDeparture(departure, journey));

  return {
    departures,
    generatedAt: new Date().toISOString(),
    routeCode: FERRY_ROUTE_CODE,
    routeName: FERRY_ROUTE_NAME,
    sourceUrl: timetable?.sourceUrl,
    stopName: timetable?.stopName ?? journey.originStopName,
  };
}

function FerryDepartureCard({
  departure,
  index,
  isRefreshing,
  journey,
  showProgress,
}) {
  const statusKey = normalizeFerryStatus(departure.status);
  const routeKey = /speedycat/i.test(departure.routeLabel)
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
        <span className={`ferry-route-tag ${routeKey}`}>
          {departure.routeLabel || "CityCat"}
        </span>
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
            {departure.originLabel || journey.originLabel} · {departure.displayTime}
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
    countdownText: departure?.countdownText ?? formatFerryCountdown(countdownMinutes),
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
    routeCode: FERRY_ROUTE_CODE,
    routeLabel: getFerryRouteLabel(departure),
    scheduledUtc: departure?.scheduledUtc,
    status: departure?.live ? "Normal" : "Scheduled",
    terminal: "Terminal 1",
  };
}

function getFerryJourney(journeyId) {
  return (
    FERRY_JOURNEYS.find((journey) => journey.id === journeyId) ??
    FERRY_JOURNEYS[0]
  );
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
  const rawDestination = String(destination || headsign || "Northshore Hamilton")
    .replace(/^towards\s+/i, "")
    .replace(/\bferry\b/gi, "")
    .replace(/\bterminal\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return rawDestination || "Northshore Hamilton";
}

function getFerryRouteLabel(departure) {
  const headsign = `${departure?.fullHeadsign ?? ""} ${
    departure?.destination ?? ""
  }`;

  return /speedycat/i.test(headsign) ? "SpeedyCat" : "CityCat";
}

function getCountdownProgressPercent(minutesAway) {
  if (minutesAway <= 0) {
    return 100;
  }

  return Math.max(8, Math.min(100, Math.round(100 - (minutesAway / 60) * 100)));
}

function FerryWaveProgress({ currentLocation, progressPercent, statusKey }) {
  const wavePath =
    "M 4 30 Q 44 10 84 30 T 164 30 T 244 30 T 324 30";
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
          left: `clamp(0px, calc(${progressPercent}% - 16px), calc(100% - 38px))`,
          rotate: [-3, 3, -3],
          y: [0, -6, 0],
        }}
        transition={{
          left: {
            type: "spring",
            stiffness: 240,
            damping: 24,
            mass: 0.7,
          },
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

function formatFerryTimestamp(dateTime) {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: BRISBANE_TZ,
  }).format(new Date(dateTime));
}
