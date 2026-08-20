import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeftRight,
  ChevronDown,
  Clock3,
  LocateFixed,
  MapPin,
  Palmtree,
  RefreshCw,
  TrainFront,
  TramFront,
} from "lucide-react";

import {
  GOLD_COAST_RAIL_STATIONS,
  GOLD_COAST_TRAM_STATIONS,
} from "../lib/travel-data";
import {
  byDepartureTime,
  fetchTravelDepartures,
  findBrisbaneTransfer,
  findNearestStation,
  findTransfer,
  formatDistance,
  isGoldCoastTrain,
  isTram,
  isTramDirection,
} from "../lib/travel-utils";
import SmartStationPicker from "../components/SmartStationPicker";

const REFRESH_MS = 30_000;
const RAIL_STORAGE_KEY = "uq-travel-gc-rail-v1";
const TRAM_STORAGE_KEY = "uq-travel-gc-tram-v1";
const TRAM_DATA_SOURCE_URL =
  "https://translink.com.au/about-translink/open-data/gtfs-rt";

export default function GoldCoastTravelPage({ modeSelector }) {
  const [railId, setRailId] = useState(() => readStored(RAIL_STORAGE_KEY, "boggo-road"));
  const [tramId, setTramId] = useState(() => readStored(TRAM_STORAGE_KEY, "surfers-paradise"));
  const [tramDirection, setTramDirection] = useState("south");
  const [journeyDirection, setJourneyDirection] = useState("gold-coast");
  const [showLaterTrains, setShowLaterTrains] = useState(false);
  const [railData, setRailData] = useState(null);
  const [helensvaleData, setHelensvaleData] = useState(null);
  const [tramData, setTramData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [locationState, setLocationState] = useState({ status: "idle" });
  const requestIdRef = useRef(0);
  const railStation =
    GOLD_COAST_RAIL_STATIONS.find((station) => station.id === railId) ??
    GOLD_COAST_RAIL_STATIONS[0];
  const tramStation =
    GOLD_COAST_TRAM_STATIONS.find((station) => station.id === tramId) ??
    GOLD_COAST_TRAM_STATIONS[0];

  const loadDepartures = async ({ silent = false } = {}) => {
    const requestId = ++requestIdRef.current;
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const [nextRail, nextHelensvale, nextTram] = await Promise.all([
        fetchTravelDepartures(railStation.stopName),
        fetchTravelDepartures("Helensvale station"),
        tramStation.stopName === "Helensvale station"
          ? Promise.resolve(null)
          : fetchTravelDepartures(tramStation.stopName),
      ]);
      if (requestId !== requestIdRef.current) return;
      setRailData(nextRail);
      setHelensvaleData(nextHelensvale);
      setTramData(nextTram ?? nextHelensvale);
      setError("");
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      console.error(loadError);
      setError("Gold Coast departures are unavailable right now.");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    loadDepartures();
    const intervalId = window.setInterval(
      () => loadDepartures({ silent: true }),
      REFRESH_MS,
    );
    return () => {
      requestIdRef.current += 1;
      window.clearInterval(intervalId);
    };
  }, [railStation.stopName, tramStation.stopName]);

  useEffect(() => {
    try {
      window.localStorage.setItem(RAIL_STORAGE_KEY, railId);
      window.localStorage.setItem(TRAM_STORAGE_KEY, tramId);
    } catch {
      // Selection still works when storage is unavailable.
    }
  }, [railId, tramId]);

  useEffect(() => {
    setShowLaterTrains(false);
  }, [railId]);

  const trains = useMemo(
    () =>
      (railData?.departures ?? [])
        .filter(isGoldCoastTrain)
        .sort(byDepartureTime),
    [railData],
  );
  const trams = useMemo(
    () =>
      (tramData?.departures ?? [])
        .filter(
          (departure) =>
            isTram(departure) && isTramDirection(departure, tramDirection),
        )
        .sort(byDepartureTime),
    [tramData, tramDirection],
  );
  const nextTrain = trains[0];
  const laterTrains = trains.slice(1, 4);
  const transfer = useMemo(
    () => findTransfer(nextTrain, helensvaleData?.departures ?? []),
    [nextTrain, helensvaleData],
  );
  const northTrams = useMemo(
    () =>
      (tramData?.departures ?? [])
        .filter(
          (departure) =>
            isTram(departure) && isTramDirection(departure, "north"),
        )
        .sort(byDepartureTime),
    [tramData],
  );
  const tramStartsAtHelensvale = tramStation.id === "helensvale-tram";
  const brisbaneTransfer = useMemo(
    () =>
      findBrisbaneTransfer({
        destinationDepartures: railData?.departures ?? [],
        helensvaleDepartures: helensvaleData?.departures ?? [],
        tram: northTrams[0],
        tramStartsAtHelensvale,
        tramTravelMinutes: tramStation.minutesToHelensvale,
      }),
    [helensvaleData, northTrams, railData, tramStartsAtHelensvale],
  );

  const useLocation = () => {
    if (!navigator.geolocation) {
      setLocationState({ status: "error", message: "Location is not supported on this device." });
      return;
    }
    setLocationState({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const rail = findNearestStation(
          coords.latitude,
          coords.longitude,
          GOLD_COAST_RAIL_STATIONS,
        );
        const tram = findNearestStation(
          coords.latitude,
          coords.longitude,
          GOLD_COAST_TRAM_STATIONS,
        );
        setRailId(rail.id);
        setTramId(tram.id);
        setLocationState({ status: "ready", rail, tram });
      },
      () =>
        setLocationState({
          status: "error",
          message: "Location was not shared. You can still choose stations below.",
        }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  const switchJourneyDirection = () => {
    const nextDirection =
      journeyDirection === "gold-coast" ? "brisbane" : "gold-coast";
    setJourneyDirection(nextDirection);
    setTramDirection(nextDirection === "brisbane" ? "north" : "south");
  };

  const journeySwitch = (
    <div className="journey-switch-row">
      <span aria-hidden="true" />
      <button
        type="button"
        className="journey-direction-button"
        aria-label={
          journeyDirection === "gold-coast"
            ? "Reverse journey: return to Brisbane"
            : "Reverse journey: travel to the Gold Coast"
        }
        onClick={switchJourneyDirection}
      >
        <ArrowLeftRight aria-hidden="true" />
        <strong>
          {journeyDirection === "gold-coast"
            ? "Return to Brisbane"
            : "Travel to Gold Coast"}
        </strong>
      </button>
      <span aria-hidden="true" />
    </div>
  );

  const railPicker = (label) => (
    <div className="mode-section-control train">
      <span><TrainFront aria-hidden="true" /><strong>Train</strong></span>
      <label>
        <small>{label}</small>
        <SmartStationPicker ariaLabel={`Train ${label.toLowerCase()}`} stations={GOLD_COAST_RAIL_STATIONS} tone="dark" value={railStation.id} onChange={setRailId} />
      </label>
    </div>
  );

  const tramBoard = (
    <section className="tram-board" aria-label="Tram departures">
      <div className="tram-board-head">
        <div className="tram-board-title">
          <span className="tram-title-icon"><TramFront aria-hidden="true" /></span>
          <h2>Tram</h2>
        </div>
        <label className="tram-station-control">
          <span>Station</span>
          <SmartStationPicker ariaLabel="Tram station" stations={GOLD_COAST_TRAM_STATIONS} value={tramStation.id} onChange={setTramId} />
        </label>
      </div>
      <div className="travel-direction-toggle" aria-label="Choose tram direction">
        <button type="button" className={tramDirection === "south" ? "active" : ""} aria-pressed={tramDirection === "south"} onClick={() => setTramDirection("south")}>Toward Burleigh Heads</button>
        <button type="button" className={tramDirection === "north" ? "active" : ""} aria-pressed={tramDirection === "north"} onClick={() => setTramDirection("north")}>Toward Helensvale</button>
      </div>
      {trams.length ? (
        <div className="travel-departure-list">
          {trams.slice(0, 4).map((departure, index) => (
            <DepartureRow departure={departure} index={index} key={departure.id} />
          ))}
        </div>
      ) : (
        <TravelState icon={Clock3} message="No trams are listed in this direction." compact />
      )}
      <a className="tram-source-note" href={TRAM_DATA_SOURCE_URL} target="_blank" rel="noreferrer">Times from Translink GTFS</a>
    </section>
  );

  const goldCoastTrainPanel = (
    <section className="journey-card gold-route-ticket" aria-label="Next Gold Coast train connection">
      {railPicker("From")}
      <div className="travel-section-head"><span>Next southbound</span><strong>to Helensvale</strong></div>
      {nextTrain ? (
        <>
          <JourneyLeg Icon={TrainFront} label="1 · Gold Coast line" title={`${railStation.label} → Helensvale`} departure={nextTrain} featured />
          {laterTrains.length ? (
            <LaterTrainOptions
              departures={laterTrains}
              expanded={showLaterTrains}
              onToggle={() => setShowLaterTrains((current) => !current)}
            />
          ) : null}
          <JourneyConnector label="Then transfer" />
          <JourneyLeg
            Icon={MapPin}
            label="2 · Transfer"
            title="Change at Helensvale"
            details={transfer ? [
              { label: "Train arrives", value: transfer.trainAtHelensvale.displayTime },
              { label: "To tram", value: `${transfer.bufferMinutes ?? "—"} min` },
            ] : [{ label: "On arrival", value: "Check platform" }]}
            tone={transfer?.bufferMinutes >= 6 ? "good" : "neutral"}
          />
        </>
      ) : <TicketEmpty message={`No southbound trains from ${railStation.label}.`} />}
    </section>
  );

  const brisbaneTrainPanel = (
    <section className="journey-card gold-route-ticket brisbane-route-ticket" aria-label="Next Brisbane train connection">
      {railPicker("To")}
      <div className="travel-section-head"><span>Next Brisbane train</span><strong>from Helensvale</strong></div>
      {brisbaneTransfer?.train ? (
        <>
          {!tramStartsAtHelensvale ? (
            <>
              <JourneyLeg
                Icon={MapPin}
                label="1 · Transfer"
                title="Change at Helensvale"
                details={[
                  {
                    label: brisbaneTransfer.estimatedTramArrival
                      ? "Est. tram arrival"
                      : "Tram arrives",
                    value:
                      brisbaneTransfer.tramAtHelensvale?.displayTime ??
                      formatTripTime(brisbaneTransfer.tramArrivalUtc),
                  },
                  { label: "Transfer", value: `${brisbaneTransfer.bufferMinutes ?? "—"} min` },
                ]}
                tone={brisbaneTransfer.bufferMinutes >= 6 ? "good" : "neutral"}
              />
              <JourneyConnector label="Then train" />
            </>
          ) : null}
          <JourneyLeg Icon={TrainFront} label={`${tramStartsAtHelensvale ? "1" : "2"} · Brisbane train`} title={`Helensvale → ${railStation.label}`} departure={brisbaneTransfer.train} featured />
        </>
      ) : <TicketEmpty message={tramStartsAtHelensvale ? "No matching Brisbane train is listed." : "No safe tram-to-train connection is listed yet."} />}
    </section>
  );

  return (
    <section className="travel-page gc-travel-page" aria-label="Travel to the Gold Coast">
      {modeSelector}

      <header className="trip-page-top">
        <span className="trip-page-mark gold"><Palmtree aria-hidden="true" /></span>
        <h1>Gold Coast</h1>
        <span className={`trip-data-dot ${railData?.gtfsRealtime ? "live" : ""}`}>{railData?.gtfsRealtime ? "Live" : "Times"}</span>
        <button type="button" className="trip-icon-button" aria-label="Use my location" onClick={useLocation} disabled={locationState.status === "loading"}><LocateFixed aria-hidden="true" /></button>
        <button type="button" className="trip-icon-button" aria-label="Refresh Gold Coast departures" disabled={loading || refreshing} onClick={() => loadDepartures({ silent: true })}><RefreshCw className={loading || refreshing ? "spinning" : ""} /></button>
      </header>

      {locationState.status === "ready" ? (
        <p className="trip-utility-note">{locationState.rail.label} · {formatDistance(locationState.rail.distanceKm)} / {locationState.tram.label} · {formatDistance(locationState.tram.distanceKm)}</p>
      ) : locationState.status === "error" ? (
        <p className="trip-utility-note error">{locationState.message}</p>
      ) : null}

      {loading ? <TravelSkeleton /> : error ? (
        <TravelState icon={AlertCircle} message={error} error />
      ) : journeyDirection === "brisbane" ? (
        <>{tramBoard}{journeySwitch}{brisbaneTrainPanel}</>
      ) : (
        <>{goldCoastTrainPanel}{journeySwitch}{tramBoard}</>
      )}
    </section>
  );
}

function JourneyLeg({ Icon, departure, details = [], featured = false, label, title, tone = "" }) {
  const facts = departure
    ? [
        { label: "Departs", value: departure.displayTime },
        { label: "Platform", value: departure.platform || "—" },
      ]
    : details;

  return (
    <article className={`journey-leg ${featured ? "featured" : ""} ${tone}`}>
      <span className="journey-leg-icon"><Icon aria-hidden="true" /></span>
      <span className="journey-leg-copy">
        <small>{label}</small>
        <strong>{title}</strong>
        <span className="journey-leg-facts">
          {facts.map((fact) => (
            <span className="journey-leg-fact" key={`${fact.label}-${fact.value}`}>
              <i>{fact.label}</i>
              <b>{fact.value}</b>
            </span>
          ))}
        </span>
      </span>
      {departure ? <span className="journey-leg-time"><strong>{departure.countdownText}</strong><small>{departure.gtfsRealtime ? "Live" : "Timetable"}</small></span> : null}
    </article>
  );
}

function JourneyConnector({ label }) {
  return (
    <div className="journey-connector" aria-label={label}>
      <span aria-hidden="true" />
      <strong><ArrowDown aria-hidden="true" />{label}</strong>
      <span aria-hidden="true" />
    </div>
  );
}

function LaterTrainOptions({ departures, expanded, onToggle }) {
  const countLabel = `${departures.length} later ${departures.length === 1 ? "train" : "trains"}`;

  return (
    <div className="later-trains">
      <button
        type="button"
        className="later-trains-toggle"
        aria-controls="later-gold-coast-trains"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span>Miss this train?</span>
        <strong>{expanded ? "Hide later trains" : countLabel}</strong>
        <ChevronDown aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            id="later-gold-coast-trains"
            className="later-trains-reveal"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="later-trains-list">
              {departures.map((departure, index) => (
                <article className="later-train-row" key={departure.id}>
                  <span className="later-train-order">{index + 2}</span>
                  <span className="later-train-copy">
                    <strong>{departure.displayTime}</strong>
                    <small>Platform {departure.platform || "—"} · {departure.destination}</small>
                  </span>
                  <span className="later-train-wait">
                    <strong>{departure.countdownText}</strong>
                    <small>{departure.gtfsRealtime ? "Live" : "Timetable"}</small>
                  </span>
                </article>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function DepartureRow({ departure, index }) {
  return (
    <motion.article className="travel-departure-row" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.025 }}>
      <span><strong>{departure.destination}</strong><small>Platform {departure.platform || "—"} · {departure.gtfsRealtime ? "Live" : "Timetable"}</small></span>
      <span><strong>{departure.countdownText}</strong><small>Departs {departure.displayTime}</small></span>
    </motion.article>
  );
}

function TicketEmpty({ message }) {
  return <div className="ticket-empty"><Clock3 aria-hidden="true" /><span>{message}</span></div>;
}

function TravelSkeleton() {
  return <div className="travel-skeleton" aria-label="Loading departures"><div /><div /><div /></div>;
}

function TravelState({ icon: Icon, message, error = false, compact = false }) {
  return <div className={`travel-state ${error ? "error" : ""} ${compact ? "compact" : ""}`}><Icon aria-hidden="true" /><p>{message}</p></div>;
}

function readStored(key, fallback) {
  try { return window.localStorage.getItem(key) || fallback; } catch { return fallback; }
}

function formatTripTime(utcValue) {
  if (!utcValue) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Brisbane",
  }).format(new Date(utcValue));
}
