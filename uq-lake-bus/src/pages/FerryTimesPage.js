import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  Clock3,
  MapPin,
  Radio,
  RefreshCw,
  Ship,
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
  const [direction, setDirection] = useState(DIRECTION_FROM_UQ);
  const [selectedStation, setSelectedStation] = useState(DEFAULT_STATION);
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
  const nextDeparture = departures[0] ?? null;
  const laterDepartures = departures.slice(1, 6);
  const updatedLabel = data?.generatedAt
    ? formatFerryTimestamp(data.generatedAt)
    : "Updating";

  const handleDirectionChange = (nextDirection) => {
    if (nextDirection !== direction) {
      setError("");
      setDirection(nextDirection);
    }
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
            <h1>UQ ferry times</h1>
            <p>Live departures for UQ St Lucia ferry terminal.</p>
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
                <FixedStationField label="From" />
                <span className="ferry-route-arrow" aria-hidden="true">
                  <ArrowRight />
                </span>
                <StationSelectField
                  label="Going to"
                  onChange={setSelectedStation}
                  value={selectedStation}
                />
              </>
            ) : (
              <>
                <StationSelectField
                  label="Coming from"
                  onChange={setSelectedStation}
                  value={selectedStation}
                />
                <span className="ferry-route-arrow" aria-hidden="true">
                  <ArrowRight />
                </span>
                <FixedStationField label="To" />
              </>
            )}
          </div>

          <div className="ferry-route-note">
            <Clock3 aria-hidden="true" />
            <span>About {journey.rideMinutes} min on the ferry</span>
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
        ) : nextDeparture ? (
          <>
            <NextFerryCard departure={nextDeparture} journey={journey} />
            <LaterDepartures
              departures={laterDepartures}
              journey={journey}
              updatedLabel={updatedLabel}
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
          <span>Times refresh every 15 seconds.</span>
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

function FixedStationField({ label }) {
  return (
    <div className="ferry-station-field fixed">
      <span>{label}</span>
      <strong>
        <MapPin aria-hidden="true" />
        {UQ_STATION}
      </strong>
    </div>
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

function NextFerryCard({ departure, journey }) {
  const wait = getWaitDisplay(departure.countdownMinutes);
  const arrivalTime = getEstimatedArrivalTime(
    departure.scheduledUtc,
    journey.rideMinutes,
  );
  const live = Boolean(departure.live || departure.gtfsRealtime);

  return (
    <motion.article
      className="ferry-next-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <div className="ferry-next-topline">
        <span className="ferry-service-badge">F1 CityCat</span>
        <span className={`ferry-data-badge ${live ? "live" : "scheduled"}`}>
          {live ? <Radio aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
          {live ? "Live" : "Timetable"}
        </span>
      </div>

      <span className="ferry-next-label">
        {journey.direction === DIRECTION_FROM_UQ
          ? "Next ferry from UQ"
          : "Next ferry to UQ"}
      </span>

      <div className={`ferry-wait-time ${wait.tone}`}>
        <strong>{wait.value}</strong>
        {wait.unit ? <span>{wait.unit}</span> : null}
      </div>

      <p className="ferry-departure-time">
        Departs {journey.originLabel} at <strong>{departure.displayTime}</strong>
      </p>

      <div className="ferry-next-route">
        <span>{journey.originLabel}</span>
        <ArrowRight aria-hidden="true" />
        <strong>{journey.destinationLabel}</strong>
      </div>

      <div className="ferry-next-meta">
        <span>
          <Clock3 aria-hidden="true" />
          {journey.rideMinutes} min trip
        </span>
        {arrivalTime ? <span>Est. arrival {arrivalTime}</span> : null}
      </div>
    </motion.article>
  );
}

function LaterDepartures({ departures, journey, updatedLabel }) {
  return (
    <section className="ferry-later-card" aria-label="Later ferry departures">
      <header className="ferry-section-heading">
        <div>
          <span>After that</span>
          <h2>Later departures</h2>
        </div>
        <small>Updated {updatedLabel}</small>
      </header>

      {departures.length ? (
        <div className="ferry-later-list">
          {departures.map((departure) => {
            const wait = getWaitDisplay(departure.countdownMinutes);
            const live = Boolean(departure.live || departure.gtfsRealtime);

            return (
              <article className="ferry-later-row" key={departure.id}>
                <span className="ferry-later-icon" aria-hidden="true">
                  <Ship />
                </span>
                <div className="ferry-later-copy">
                  <strong>{departure.displayTime}</strong>
                  <span>
                    {journey.originLabel} to {journey.destinationLabel}
                  </span>
                </div>
                <div className="ferry-later-wait">
                  <strong>
                    {wait.value}
                    {wait.unit && wait.unit !== "until departure" ? (
                      <small>{wait.unit}</small>
                    ) : null}
                  </strong>
                  <span className={live ? "live" : ""}>
                    {live ? "Live" : "Scheduled"}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="ferry-no-later">No later ferries are listed yet.</p>
      )}
    </section>
  );
}

function FerryLoadingState() {
  return (
    <div className="ferry-loading-state" aria-label="Loading ferry departures">
      <article className="ferry-next-card skeleton-card" />
      <article className="ferry-later-card skeleton-card" />
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
