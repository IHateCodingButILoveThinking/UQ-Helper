import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  RefreshCw,
  Ship,
  Star,
} from "lucide-react";

const FERRY_REFRESH_MS = 15_000;
const FERRY_REQUEST_TIMEOUT_MS = 8_000;
const FERRY_ROUTE_CODE = "F1";
const UQ_STATION = "UQ St Lucia";
const UQ_STOP_NAME = "UQ St Lucia ferry terminal";
const DIRECTION_FROM_UQ = "fromUq";
const DIRECTION_TO_UQ = "toUq";
const DEFAULT_STATION = "South Bank";
const BRISBANE_TZ = "Australia/Brisbane";
const FERRY_SAVED_ROUTE_KEY = "uq-ferry-saved-route-v1";

const FERRY_STATIONS = [
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

const FERRY_SEGMENT_MINUTES = [
  5, 3, 4, 4, 6, 4, 4, 9, 5, 7, 3, 4, 5, 4, 4, 6, 3, 4,
];

const SELECTABLE_STATIONS = FERRY_STATIONS.filter(
  (station) => station !== UQ_STATION,
);

export default function FerryTimesPage({ modeSelector }) {
  const initialRouteRef = useRef(undefined);
  if (initialRouteRef.current === undefined) {
    initialRouteRef.current = getSavedFerryRoute();
  }
  const initialRoute = initialRouteRef.current;
  const [direction, setDirection] = useState(
    DIRECTION_FROM_UQ,
  );
  const [selectedStation, setSelectedStation] = useState(
    initialRoute?.station ?? DEFAULT_STATION,
  );
  const [savedRoute, setSavedRoute] = useState(initialRoute);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  const journey = useMemo(
    () => getFerryJourney(direction, selectedStation),
    [direction, selectedStation],
  );

  const loadDepartures = useCallback(
    async ({ silent = false } = {}) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setData(null);
      }

      try {
        const nextData = await fetchFerryDepartures(journey);

        if (requestId !== requestIdRef.current) {
          return;
        }

        setData(nextData);
        setError("");
      } catch (fetchError) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        console.error(fetchError);
        setError("Live ferry times are unavailable right now.");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [journey],
  );

  useEffect(() => {
    loadDepartures();
    const intervalId = window.setInterval(
      () => loadDepartures({ silent: true }),
      FERRY_REFRESH_MS,
    );

    return () => {
      window.clearInterval(intervalId);
      requestIdRef.current += 1;
    };
  }, [loadDepartures]);

  const departures = data?.departures ?? [];
  const updatedLabel = data?.generatedAt
    ? formatFerryTimestamp(data.generatedAt)
    : "Updating";
  const currentRouteIsSaved =
    savedRoute?.station === selectedStation;

  const handleDirectionChange = (nextDirection) => {
    if (nextDirection !== direction) {
      setError("");
      setDirection(nextDirection);
    }
  };

  const saveCurrentRoute = () => {
    const nextSavedRoute = { station: selectedStation };
    setSavedRoute(nextSavedRoute);
    saveFerryRoute(nextSavedRoute);
  };

  const restoreSavedRoute = () => {
    if (!savedRoute) return;
    setSelectedStation(savedRoute.station);
  };

  return (
    <section className="ferry-page" aria-label="UQ ferry departures">
      {modeSelector}

      <main className="ferry-dashboard">
        <header className="ferry-page-heading">
          <span className="ferry-page-heading-icon" aria-hidden="true">
            <Ship />
          </span>
          <div>
            <span className="ferry-page-kicker">F1 CityCat</span>
            <h1>Ferry board</h1>
          </div>
          <button
            type="button"
            className="ferry-refresh-button"
            aria-label={refreshing || loading ? "Refreshing ferry times" : "Refresh ferry times"}
            disabled={refreshing || loading}
            onClick={() => loadDepartures({ silent: true })}
          >
            <RefreshCw
              className={refreshing || loading ? "spinning" : ""}
              aria-hidden="true"
            />
          </button>
        </header>

        <section className="ferry-route-card" aria-label="Choose ferry journey">
          <div className="ferry-direction-switch" aria-label="Choose travel direction">
            <button
              type="button"
              className={direction === DIRECTION_FROM_UQ ? "active" : ""}
              aria-pressed={direction === DIRECTION_FROM_UQ}
              onClick={() => handleDirectionChange(DIRECTION_FROM_UQ)}
            >
              From UQ
            </button>
            <button
              type="button"
              className={direction === DIRECTION_TO_UQ ? "active" : ""}
              aria-pressed={direction === DIRECTION_TO_UQ}
              onClick={() => handleDirectionChange(DIRECTION_TO_UQ)}
            >
              To UQ
            </button>
          </div>

          <div className="ferry-route-fields">
            {direction === DIRECTION_FROM_UQ ? (
              <>
                <span className="ferry-route-fixed">{UQ_STATION}</span>
                <ArrowRight className="ferry-route-arrow" aria-hidden="true" />
                <StationSelectField
                  label="Destination"
                  onChange={setSelectedStation}
                  value={selectedStation}
                />
              </>
            ) : (
              <>
                <StationSelectField
                  label="Origin"
                  onChange={setSelectedStation}
                  value={selectedStation}
                />
                <ArrowRight className="ferry-route-arrow" aria-hidden="true" />
                <span className="ferry-route-fixed destination">{UQ_STATION}</span>
              </>
            )}
          </div>

          <div className="ferry-route-actions">
            {savedRoute && !currentRouteIsSaved ? (
              <button type="button" className="ferry-saved-route" onClick={restoreSavedRoute}>
                <Star aria-hidden="true" />
                Use home: {savedRoute.station}
              </button>
            ) : <span />}
            <button
              type="button"
              className={`ferry-save-button ${currentRouteIsSaved ? "saved" : ""}`}
              aria-pressed={currentRouteIsSaved}
              onClick={saveCurrentRoute}
            >
              <Star aria-hidden="true" fill={currentRouteIsSaved ? "currentColor" : "none"} />
              {currentRouteIsSaved ? "Saved" : "Save as home"}
            </button>
          </div>
        </section>

        {error ? (
          <div className="ferry-message error" role="alert">
            <AlertCircle aria-hidden="true" />
            <span>{error}</span>
            <button type="button" onClick={() => loadDepartures()}>
              Try again
            </button>
          </div>
        ) : null}

        {loading ? (
          <FerryLoadingState />
        ) : departures.length ? (
          <>
            <FerryDepartureSummary
              departures={departures}
              journey={journey}
              updatedLabel={updatedLabel}
            />
            <FerryLaterDepartures
              departures={departures.slice(1)}
              journey={journey}
            />
          </>
        ) : !error ? (
          <div className="ferry-message empty">
            <Ship aria-hidden="true" />
            <div>
              <strong>No upcoming F1 ferries</strong>
              <span>Try another station or check again shortly.</span>
            </div>
          </div>
        ) : null}

        <footer className="ferry-data-note">
          <span>Auto-refreshes every 15 sec</span>
          {data?.sourceUrl ? (
            <a href={data.sourceUrl} target="_blank" rel="noreferrer">
              Translink source
            </a>
          ) : null}
        </footer>
      </main>
    </section>
  );
}

function StationSelectField({ label, onChange, value }) {
  return (
    <label className="ferry-station-field selectable">
      <span>{label}</span>
      <span className="ferry-station-select">
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {SELECTABLE_STATIONS.map((station) => (
            <option key={station} value={station}>
              {station}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" />
      </span>
    </label>
  );
}

function FerryDepartureSummary({ departures, journey, updatedLabel }) {
  const nextDeparture = departures[0];
  const wait = getWaitDisplay(nextDeparture.countdownMinutes);
  const headlineWait = nextDeparture.cancelled
    ? { tone: "disrupted", unit: "", value: "Cancelled" }
    : wait;
  const serviceStatus = getFerryServiceStatus(nextDeparture);
  const arrivalTime = getEstimatedArrivalTime(
    nextDeparture.scheduledUtc,
    journey.rideMinutes,
  );

  return (
    <section className="ferry-summary" aria-label="Next ferry summary">
      <header className="ferry-summary-heading">
        <div className="ferry-summary-route">
          <span>F1</span>
          <strong>{journey.originLabel}</strong>
          <ArrowRight aria-hidden="true" />
          <strong>{journey.destinationLabel}</strong>
        </div>
        <small>Updated {updatedLabel}</small>
      </header>

      <div className="ferry-summary-main">
        <div className={`ferry-summary-countdown ${headlineWait.tone}`}>
          <span>{nextDeparture.cancelled ? "Next service" : "Next ferry"}</span>
          <strong>{headlineWait.value}</strong>
          {headlineWait.unit && headlineWait.value !== "Due now" ? (
            <small>{headlineWait.unit === "until departure" ? "" : "min"}</small>
          ) : null}
        </div>

        <dl className="ferry-summary-details">
          <div><dt>Departs</dt><dd>{nextDeparture.displayTime}</dd></div>
          {arrivalTime ? <div><dt>Arrives</dt><dd>{arrivalTime}</dd></div> : null}
        </dl>
      </div>

      <div className="ferry-summary-footer">
        <span className={`ferry-summary-status ${serviceStatus.tone}`}>
          <i aria-hidden="true" />{serviceStatus.label}
        </span>
        <span>Updates every 15 sec</span>
      </div>
    </section>
  );
}

function FerryLaterDepartures({ departures, journey }) {
  if (!departures.length) return null;

  return (
    <section className="ferry-later" aria-label="Later ferry departures">
      <header className="ferry-later-heading">
        <div>
          <span>Upcoming</span>
          <h2>Later ferries</h2>
        </div>
        <small>{departures.length} more</small>
      </header>

      <div className="ferry-later-list">
        {departures.map((departure) => {
          const wait = getWaitDisplay(departure.countdownMinutes);
          const serviceStatus = getFerryServiceStatus(departure);
          const arrivalTime = getEstimatedArrivalTime(
            departure.scheduledUtc,
            journey.rideMinutes,
          );

          return (
            <article className="ferry-later-row" key={departure.id}>
              <div className="ferry-later-time">
                <strong>{departure.displayTime}</strong>
                <span>Departs</span>
              </div>
              <div className="ferry-later-arrival">
                <span>{journey.destinationLabel}</span>
                <strong>{arrivalTime ? `Arrives ${arrivalTime}` : `${journey.rideMinutes} min trip`}</strong>
              </div>
              <div className={`ferry-later-wait ${wait.tone}`}>
                <strong>{wait.value}</strong>
                {wait.unit && wait.unit !== "until departure" ? <span>min</span> : null}
                <small className={serviceStatus.tone}>{serviceStatus.label}</small>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FerryLoadingState() {
  return (
    <div className="ferry-loading-state" aria-label="Loading ferry departures">
      <article className="ferry-summary skeleton-card" />
    </div>
  );
}

async function fetchFerryDepartures(journey) {
  const params = new URLSearchParams({
    limit: "96",
    stopName: journey.originStopName,
  });
  const response = await fetchWithTimeout(`/api/departures?${params.toString()}`, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok || !contentType.includes("application/json")) {
    throw new Error(`Could not load ferry departures (${response.status}).`);
  }

  const payload = await response.json();
  const departures = (payload?.departures ?? [])
    .filter((departure) => isMatchingFerry(departure, journey.direction))
    .slice(0, 6)
    .map(normalizeDeparture);

  return {
    departures,
    generatedAt: payload?.generatedAt ?? new Date().toISOString(),
    sourceUrl: payload?.sourceUrl,
  };
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    FERRY_REQUEST_TIMEOUT_MS,
  );

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function normalizeDeparture(departure) {
  const countdownMinutes = Number.isFinite(departure?.countdownMinutes)
    ? Math.max(0, departure.countdownMinutes)
    : 0;

  return {
    ...departure,
    countdownMinutes,
    id:
      departure?.id ||
      `${departure?.scheduledUtc || departure?.displayTime}-${departure?.destination}`,
    live: Boolean(departure?.live),
  };
}

function isMatchingFerry(departure, direction) {
  if (String(departure?.routeCode ?? "").toUpperCase() !== FERRY_ROUTE_CODE) {
    return false;
  }

  const destination = `${departure?.destination ?? ""} ${
    departure?.fullHeadsign ?? ""
  }`.toLowerCase();

  if (direction === DIRECTION_FROM_UQ) {
    return destination.includes("northshore") || destination.includes("hamilton");
  }

  return destination.includes("uq st lucia") || destination.includes("towards uq");
}

function getFerryJourney(direction, selectedStation) {
  const safeStation = SELECTABLE_STATIONS.includes(selectedStation)
    ? selectedStation
    : DEFAULT_STATION;
  const fromUq = direction === DIRECTION_FROM_UQ;

  return {
    direction,
    destinationLabel: fromUq ? safeStation : UQ_STATION,
    originLabel: fromUq ? UQ_STATION : safeStation,
    originStopName: fromUq ? UQ_STOP_NAME : `${safeStation} ferry terminal`,
    rideMinutes: getRideMinutes(safeStation),
  };
}

function getRideMinutes(station) {
  const stationIndex = FERRY_STATIONS.indexOf(station);

  if (stationIndex <= 0) {
    return 0;
  }

  return FERRY_SEGMENT_MINUTES.slice(0, stationIndex).reduce(
    (total, minutes) => total + minutes,
    0,
  );
}

function getSavedFerryRoute() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(FERRY_SAVED_ROUTE_KEY));
    if (
      saved &&
      SELECTABLE_STATIONS.includes(saved.station)
    ) {
      return { station: saved.station };
    }
  } catch (error) {
    console.error("Could not read the saved ferry route.", error);
  }

  return null;
}

function saveFerryRoute(route) {
  try {
    window.localStorage.setItem(FERRY_SAVED_ROUTE_KEY, JSON.stringify(route));
  } catch (error) {
    console.error("Could not save the ferry route.", error);
  }
}

function getWaitDisplay(minutesAway) {
  const minutes = Math.max(0, Math.round(Number(minutesAway) || 0));

  if (minutes <= 0) {
    return { tone: "now", unit: "", value: "Due now" };
  }

  if (minutes < 60) {
    return {
      tone: minutes <= 3 ? "soon" : "normal",
      unit: minutes === 1 ? "minute" : "minutes",
      value: String(minutes),
    };
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return {
    tone: "normal",
    unit: "until departure",
    value: remainder ? `${hours}h ${remainder}m` : `${hours}h`,
  };
}

function getFerryServiceStatus(departure) {
  if (departure?.cancelled) {
    return { label: "Cancelled", tone: "disrupted" };
  }

  const hasDelayReading = departure?.delaySeconds !== null && departure?.delaySeconds !== undefined;
  const delaySeconds = Number(departure?.delaySeconds);
  if (departure?.gtfsRealtime && hasDelayReading && Number.isFinite(delaySeconds)) {
    const delayMinutes = Math.round(delaySeconds / 60);

    if (delayMinutes >= 2) {
      return { label: `${delayMinutes} min late`, tone: "delayed" };
    }

    if (delayMinutes <= -2) {
      return { label: `${Math.abs(delayMinutes)} min early`, tone: "early" };
    }

    return { label: "On time", tone: "on-time" };
  }

  if (departure?.live) {
    return { label: "Live time", tone: "live" };
  }

  return { label: "Scheduled", tone: "scheduled" };
}

function getEstimatedArrivalTime(scheduledUtc, rideMinutes) {
  if (!scheduledUtc || !Number.isFinite(rideMinutes)) {
    return "";
  }

  const departureTime = new Date(scheduledUtc);

  if (Number.isNaN(departureTime.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: BRISBANE_TZ,
  })
    .format(new Date(departureTime.getTime() + rideMinutes * 60_000))
    .toLowerCase();
}

function formatFerryTimestamp(dateTime) {
  const date = new Date(dateTime);

  if (Number.isNaN(date.getTime())) {
    return "now";
  }

  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: BRISBANE_TZ,
  })
    .format(date)
    .toLowerCase();
}
