import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
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
const TRAM_TRACKER_STORAGE_KEY = "uq-travel-gc-tracker-v1";
const HELENSVALE_TRAM_ID = "helensvale-tram";
const RETURN_TRAM_DEFAULT_ID = "burleigh-heads";
const RETURN_TRAM_STATIONS = GOLD_COAST_TRAM_STATIONS.filter(
  (station) => station.id !== HELENSVALE_TRAM_ID,
);

export default function GoldCoastTravelPage({ onHome }) {
  const [railId, setRailId] = useState(() =>
    readStored(RAIL_STORAGE_KEY, "boggo-road"),
  );
  const [tramId, setTramId] = useState(() =>
    readStored(TRAM_STORAGE_KEY, RETURN_TRAM_DEFAULT_ID),
  );
  const [journeyDirection, setJourneyDirection] = useState("gold-coast");
  const [activeView, setActiveView] = useState("journey");
  const [trackerTramId, setTrackerTramId] = useState(() =>
    readStored(TRAM_TRACKER_STORAGE_KEY, "surfers-paradise"),
  );
  const [showLaterTrains, setShowLaterTrains] = useState(false);
  const [railData, setRailData] = useState(null);
  const [helensvaleData, setHelensvaleData] = useState(null);
  const [tramData, setTramData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [trackerData, setTrackerData] = useState(null);
  const [trackerDataStopName, setTrackerDataStopName] = useState("");
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [trackerRefreshing, setTrackerRefreshing] = useState(false);
  const [trackerError, setTrackerError] = useState("");
  const [trackerLocating, setTrackerLocating] = useState(false);
  const [trackerLocationNote, setTrackerLocationNote] = useState(null);
  const requestIdRef = useRef(0);
  const trackerRequestIdRef = useRef(0);
  const railStation =
    GOLD_COAST_RAIL_STATIONS.find((station) => station.id === railId) ??
    GOLD_COAST_RAIL_STATIONS[0];
  const returnTramStation =
    RETURN_TRAM_STATIONS.find((station) => station.id === tramId) ??
    RETURN_TRAM_STATIONS.find(
      (station) => station.id === RETURN_TRAM_DEFAULT_ID,
    ) ??
    RETURN_TRAM_STATIONS[0];
  const trackerTramStation =
    GOLD_COAST_TRAM_STATIONS.find(
      (station) => station.id === trackerTramId,
    ) ?? GOLD_COAST_TRAM_STATIONS[0];

  const loadDepartures = async ({ silent = false } = {}) => {
    const requestId = ++requestIdRef.current;
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const [nextRail, nextHelensvale, nextTram] = await Promise.all([
        fetchTravelDepartures(railStation.stopName),
        fetchTravelDepartures("Helensvale station"),
        fetchTravelDepartures(returnTramStation.stopName),
      ]);
      if (requestId !== requestIdRef.current) return;
      setRailData(nextRail);
      setHelensvaleData(nextHelensvale);
      setTramData(nextTram);
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
    if (activeView !== "journey") return undefined;
    loadDepartures();
    const intervalId = window.setInterval(
      () => loadDepartures({ silent: true }),
      REFRESH_MS,
    );
    return () => {
      requestIdRef.current += 1;
      window.clearInterval(intervalId);
    };
  }, [activeView, railStation.stopName, returnTramStation.stopName]);

  const loadTrackerDepartures = async ({ silent = false, prefetch = false } = {}) => {
    const requestId = ++trackerRequestIdRef.current;
    if (!prefetch) silent ? setTrackerRefreshing(true) : setTrackerLoading(true);
    try {
      const payload = await fetchTravelDepartures(trackerTramStation.stopName);
      if (requestId !== trackerRequestIdRef.current) return;
      setTrackerData(payload);
      setTrackerDataStopName(trackerTramStation.stopName);
      setTrackerError("");
    } catch (loadError) {
      if (requestId !== trackerRequestIdRef.current) return;
      console.error(loadError);
      setTrackerError("Tram departures are unavailable right now.");
    } finally {
      if (requestId === trackerRequestIdRef.current) {
        if (!prefetch) {
          setTrackerLoading(false);
          setTrackerRefreshing(false);
        }
      }
    }
  };

  useEffect(() => {
    if (activeView !== "trams") return undefined;
    if (trackerDataStopName !== trackerTramStation.stopName) {
      loadTrackerDepartures();
    }
    const intervalId = window.setInterval(
      () => loadTrackerDepartures({ silent: true }),
      REFRESH_MS,
    );
    return () => {
      trackerRequestIdRef.current += 1;
      window.clearInterval(intervalId);
    };
  }, [activeView, trackerDataStopName, trackerTramStation.stopName]);

  useEffect(() => {
    if (
      activeView !== "journey" ||
      loading ||
      trackerDataStopName === trackerTramStation.stopName
    ) return undefined;
    const timerId = window.setTimeout(
      () => loadTrackerDepartures({ prefetch: true }),
      450,
    );
    return () => window.clearTimeout(timerId);
  }, [activeView, loading, trackerDataStopName, trackerTramStation.stopName]);

  useEffect(() => {
    try {
      window.localStorage.setItem(RAIL_STORAGE_KEY, railId);
      window.localStorage.setItem(TRAM_STORAGE_KEY, tramId);
      window.localStorage.setItem(TRAM_TRACKER_STORAGE_KEY, trackerTramId);
    } catch {
      // Selection still works when storage is unavailable.
    }
  }, [railId, trackerTramId, tramId]);

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
  const trackerTrams = useMemo(
    () =>
      (trackerData?.departures ?? [])
        .filter(isTram)
        .sort(byDepartureTime)
        .slice(0, 3),
    [trackerData],
  );
  const brisbaneTransfer = useMemo(
    () =>
      findBrisbaneTransfer({
        destinationDepartures: railData?.departures ?? [],
        helensvaleDepartures: helensvaleData?.departures ?? [],
        tram: northTrams[0],
        tramStartsAtHelensvale: false,
        tramTravelMinutes: returnTramStation.minutesToHelensvale,
      }),
    [
      helensvaleData,
      northTrams,
      railData,
      returnTramStation.minutesToHelensvale,
    ],
  );

  const switchJourneyDirection = () => {
    const nextDirection =
      journeyDirection === "gold-coast" ? "brisbane" : "gold-coast";
    setJourneyDirection(nextDirection);
  };

  const locateNearestTram = () => {
    if (!navigator.geolocation) {
      setTrackerLocationNote({
        tone: "error",
        text: "Location is unavailable. Search for a station instead.",
      });
      return;
    }

    setTrackerLocating(true);
    setTrackerLocationNote({ tone: "", text: "Finding the nearest tram stop…" });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nearest = findNearestStation(
          coords.latitude,
          coords.longitude,
          GOLD_COAST_TRAM_STATIONS,
        );
        if (!nearest) {
          setTrackerLocationNote({ tone: "error", text: "No tram stop was found." });
          setTrackerLocating(false);
          return;
        }
        if (nearest.distanceKm > 10) {
          setTrackerLocationNote({
            tone: "far",
            text: `Nearest tram stop is ${nearest.label}, ${formatDistance(nearest.distanceKm)} away. Choose a station to check instead.`,
          });
          setTrackerLocating(false);
          return;
        }
        setTrackerTramId(nearest.id);
        setTrackerData(null);
        setTrackerDataStopName("");
        setTrackerLocationNote({
          tone: "",
          text: `${nearest.label} is the nearest suggestion · ${formatDistance(nearest.distanceKm)}`,
        });
        setTrackerLocating(false);
      },
      () => {
        setTrackerLocationNote({
          tone: "error",
          text: "Location was not shared. Search for a station instead.",
        });
        setTrackerLocating(false);
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 7000 },
    );
  };

  const directionSwitch = (
    <div className="journey-switch-row" aria-label="Reverse Gold Coast journey">
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
        <span>
          <strong>
            {journeyDirection === "gold-coast"
              ? "Return to Brisbane"
              : "To Gold Coast"}
          </strong>
          <small>
            {journeyDirection === "gold-coast"
              ? "reverse route"
              : "train + tram"}
          </small>
        </span>
      </button>
      <span aria-hidden="true" />
    </div>
  );

  const railPicker = (label) => (
    <div className="mode-section-control train">
      <span>
        <TrainFront aria-hidden="true" />
        <strong>Train</strong>
      </span>
      <label>
        <small>{label}</small>
        <SmartStationPicker
          ariaLabel={`Train ${label.toLowerCase()}`}
          stations={GOLD_COAST_RAIL_STATIONS}
          tone="dark"
          value={railStation.id}
          onChange={setRailId}
        />
      </label>
    </div>
  );

  const tramOriginPicker = (
    <div className="mode-section-control tram">
      <span>
        <TramFront aria-hidden="true" />
        <strong>Tram</strong>
      </span>
      <label>
        <small>From</small>
        <SmartStationPicker
          ariaLabel="Return tram origin"
          stations={RETURN_TRAM_STATIONS}
          tone="dark"
          value={returnTramStation.id}
          onChange={setTramId}
        />
      </label>
    </div>
  );

  const openTramTrackerButton = (
    <button
      type="button"
      className="open-tram-tracker-button"
      onClick={() => setActiveView("trams")}
    >
      <TramFront aria-hidden="true" />
      <span><strong>Check any tram stop</strong><small>Upcoming trams</small></span>
      <ChevronRight aria-hidden="true" />
    </button>
  );

  const goldCoastTrainPanel = (
    <section
      className="journey-card gold-route-ticket"
      aria-label="Gold Coast train leg"
    >
      {railPicker("From")}
      <div className="travel-section-head">
        <span>1 · Train</span>
        <strong>{railStation.label} → Helensvale</strong>
      </div>
      {nextTrain ? (
        <>
          <JourneyLeg
            Icon={TrainFront}
            label="1 · Gold Coast line"
            title={`${railStation.label} → Helensvale`}
            departure={nextTrain}
            featured
          />
          {laterTrains.length ? (
            <LaterTrainOptions
              departures={laterTrains}
              expanded={showLaterTrains}
              onToggle={() => setShowLaterTrains((current) => !current)}
            />
          ) : null}
        </>
      ) : (
        <TicketEmpty
          message={`No southbound trains from ${railStation.label}.`}
        />
      )}
    </section>
  );

  const goldCoastTramPanel = (
    <section
      className="journey-card gold-route-ticket tram-connection-ticket"
      aria-label="Gold Coast tram transfer"
    >
      <div className="mode-section-control tram static">
        <span>
          <TramFront aria-hidden="true" />
          <strong>Tram</strong>
        </span>
        <small>Helensvale</small>
      </div>
      <div className="travel-section-head">
        <span>2 · Tram</span>
        <strong>Transfer at Helensvale</strong>
      </div>
      {nextTrain ? (
        <>
          {transfer?.tram ? (
            <JourneyLeg
              Icon={TramFront}
              label="2 · Tram"
              title={`Helensvale → ${transfer.tram.destination}`}
              departure={transfer.tram}
              details={[
                {
                  label: "Change time",
                  value: `${transfer.bufferMinutes ?? "—"} min`,
                },
              ]}
              tone={transfer.bufferMinutes >= 6 ? "good" : "neutral"}
            />
          ) : (
            <JourneyLeg
              Icon={MapPin}
              label="2 · Tram transfer"
              title="Change at Helensvale"
              details={
                transfer
                  ? [
                      {
                        label: "Train arrives",
                        value: transfer.trainAtHelensvale.displayTime,
                      },
                      { label: "Tram", value: "Check platform" },
                    ]
                  : [{ label: "On arrival", value: "Check platform" }]
              }
              tone="neutral"
            />
          )}
        </>
      ) : (
        <TicketEmpty message="Catch the train to Helensvale first." />
      )}
      {openTramTrackerButton}
    </section>
  );

  const returnTramPanel = (
    <section
      className="journey-card gold-route-ticket return-tram-ticket"
      aria-label="Return tram leg"
    >
      {tramOriginPicker}
      <div className="travel-section-head">
        <span>1 · Tram</span>
        <strong>{returnTramStation.label} → Helensvale</strong>
      </div>
      {northTrams[0] ? (
        <>
          <JourneyLeg
            Icon={TramFront}
            label="1 · Tram"
            title={`${returnTramStation.label} → Helensvale`}
            departure={northTrams[0]}
            details={[
              {
                label: brisbaneTransfer?.estimatedTramArrival
                  ? "Est. arrival"
                  : "Arrives",
                value:
                  brisbaneTransfer?.tramAtHelensvale?.displayTime ??
                  formatTripTime(brisbaneTransfer?.tramArrivalUtc),
              },
            ]}
            featured
            tone={brisbaneTransfer?.bufferMinutes >= 6 ? "good" : "neutral"}
          />
          <UpcomingTramOptions departures={northTrams.slice(1, 3)} />
        </>
      ) : (
        <TicketEmpty
          message={`No northbound trams from ${returnTramStation.label}.`}
        />
      )}
      {openTramTrackerButton}
    </section>
  );

  const brisbaneTrainPanel = (
    <section
      className="journey-card gold-route-ticket brisbane-route-ticket"
      aria-label="Return Brisbane train leg"
    >
      {railPicker("To")}
      <div className="travel-section-head">
        <span>2 · Train</span>
        <strong>Helensvale → {railStation.label}</strong>
      </div>
      {brisbaneTransfer?.train ? (
        <JourneyLeg
          Icon={TrainFront}
          label="2 · Brisbane train"
          title={`Helensvale → ${railStation.label}`}
          departure={brisbaneTransfer.train}
          details={[
            {
              label: "Change time",
              value: `${brisbaneTransfer.bufferMinutes ?? "—"} min`,
            },
            {
              label: "Arrives",
              value: brisbaneTransfer.trainAtDestination?.displayTime ?? "—",
            },
          ]}
          featured
        />
      ) : (
        <TicketEmpty message="No safe tram-to-train connection is listed yet." />
      )}
    </section>
  );

  const tramTrackerPanel = (
    <section className="tram-board tram-station-page" aria-label="Tram station departures">
      <div className="tram-board-head">
        <div className="tram-board-title">
          <span className="tram-title-icon"><TramFront aria-hidden="true" /></span>
          <div><h2>{trackerTramStation.label}</h2><small>Both directions · next three trams</small></div>
        </div>
      </div>

      <div className="tram-station-page-controls">
        <SmartStationPicker
          ariaLabel="Tram station"
          stations={GOLD_COAST_TRAM_STATIONS}
          value={trackerTramStation.id}
          onChange={(stationId) => {
            setTrackerTramId(stationId);
            setTrackerData(null);
            setTrackerDataStopName("");
            setTrackerLocationNote(null);
          }}
        />
        <button
          type="button"
          className="tram-locate-button"
          onClick={locateNearestTram}
          disabled={trackerLocating}
        >
          <LocateFixed aria-hidden="true" />
          {trackerLocating ? "Locating" : "Near me"}
        </button>
      </div>

      {trackerLocationNote ? (
        <p className={`tram-location-note ${trackerLocationNote.tone}`}>
          {trackerLocationNote.text}
        </p>
      ) : null}

      {trackerLoading ? (
        <TravelSkeleton />
      ) : trackerError ? (
        <TravelState icon={AlertCircle} message={trackerError} error compact />
      ) : trackerTrams.length ? (
        <div className="travel-departure-list">
          {trackerTrams.map((departure) => (
            <TramDepartureRow departure={departure} key={departure.id} />
          ))}
        </div>
      ) : (
        <TicketEmpty message={`No upcoming trams from ${trackerTramStation.label}.`} />
      )}

      <a
        className="tram-source-note"
        href="https://translink.com.au/plan-your-journey/timetables"
        target="_blank"
        rel="noreferrer"
      >
        Times and live updates from Translink
      </a>
    </section>
  );

  return (
    <section
      className="travel-page gc-travel-page"
      aria-label="Travel to the Gold Coast"
    >
      <header className="trip-page-top">
        <button
          type="button"
          className="trip-back-button"
          aria-label={activeView === "trams" ? "Back to Gold Coast journey" : "Back to home"}
          onClick={activeView === "trams" ? () => setActiveView("journey") : onHome}
        >
          <ArrowLeft aria-hidden="true" />
        </button>
        <span className={`trip-page-mark ${activeView === "trams" ? "tram" : "gold"}`}>
          {activeView === "trams" ? <TramFront aria-hidden="true" /> : <Palmtree aria-hidden="true" />}
        </span>
        <h1>{activeView === "trams" ? "Tram times" : "Gold Coast"}</h1>
        {activeView === "journey" ? (
          <button
            type="button"
            className="trip-tram-quick-button"
            onClick={() => setActiveView("trams")}
            aria-label="Open tram times"
          >
            <TramFront aria-hidden="true" />
            <span>Tram</span>
          </button>
        ) : null}
        <span
          className={`trip-data-dot ${
            (activeView === "trams" ? trackerData?.gtfsRealtime : railData?.gtfsRealtime)
              ? "live"
              : ""
          }`}
        >
          {(activeView === "trams" ? trackerData?.gtfsRealtime : railData?.gtfsRealtime)
            ? "Live"
            : "Times"}
        </span>
        <button
          type="button"
          className="trip-icon-button"
          aria-label={activeView === "trams" ? "Refresh tram departures" : "Refresh Gold Coast departures"}
          disabled={
            activeView === "trams"
              ? trackerLoading || trackerRefreshing
              : loading || refreshing
          }
          onClick={() =>
            activeView === "trams"
              ? loadTrackerDepartures({ silent: true })
              : loadDepartures({ silent: true })
          }
        >
          <RefreshCw
            className={
              (activeView === "trams"
                ? trackerLoading || trackerRefreshing
                : loading || refreshing)
                ? "spinning"
                : ""
            }
          />
        </button>
      </header>

      {activeView === "trams" ? (
        tramTrackerPanel
      ) : loading ? (
        <TravelSkeleton />
      ) : error ? (
        <TravelState icon={AlertCircle} message={error} error />
      ) : journeyDirection === "brisbane" ? (
        <>
          {returnTramPanel}
          {directionSwitch}
          {brisbaneTrainPanel}
        </>
      ) : (
        <>
          {goldCoastTrainPanel}
          {directionSwitch}
          {goldCoastTramPanel}
        </>
      )}
    </section>
  );
}

function JourneyLeg({
  Icon,
  departure,
  details = [],
  featured = false,
  label,
  title,
  tone = "",
}) {
  const facts = departure
    ? [
        { label: "Departs", value: departure.displayTime },
        { label: "Platform", value: departure.platform || "—" },
        ...details,
      ]
    : details;

  return (
    <article className={`journey-leg ${featured ? "featured" : ""} ${tone}`}>
      <span className="journey-leg-icon">
        <Icon aria-hidden="true" />
      </span>
      <span className="journey-leg-copy">
        <small>{label}</small>
        <strong>{title}</strong>
        <span className="journey-leg-facts">
          {facts.map((fact) => (
            <span
              className="journey-leg-fact"
              key={`${fact.label}-${fact.value}`}
            >
              <i>{fact.label}</i>
              <b>{fact.value}</b>
            </span>
          ))}
        </span>
      </span>
      {departure ? (
        <span className="journey-leg-time">
          <strong>{departure.countdownText}</strong>
          <small>{departure.gtfsRealtime ? "Live" : "Timetable"}</small>
        </span>
      ) : null}
    </article>
  );
}

function TramDepartureRow({ departure }) {
  const direction = departure.direction
    ? `${departure.direction}bound`
    : departure.destination?.toLowerCase().includes("helensvale")
      ? "Northbound"
      : "Southbound";

  return (
    <article className="travel-departure-row tram-time-row">
      <span>
        <small>{direction}</small>
        <strong>{departure.destination}</strong>
        <small>
          {departure.displayTime} · Platform {departure.platform || "—"}
        </small>
      </span>
      <span>
        <strong>{departure.countdownText}</strong>
        <small>{departure.gtfsRealtime ? "Live" : "Timetable"}</small>
      </span>
    </article>
  );
}

function UpcomingTramOptions({ departures }) {
  if (!departures.length) return null;

  return (
    <div className="upcoming-trams" aria-label="Later tram departures">
      <span className="upcoming-trams-label">Next trams</span>
      {departures.map((departure, index) => (
        <article className="upcoming-tram-row" key={departure.id}>
          <span className="upcoming-tram-order">{index + 2}</span>
          <span className="upcoming-tram-copy">
            <strong>{departure.displayTime}</strong>
            <small>
              Platform {departure.platform || "—"} · {departure.destination}
            </small>
          </span>
          <span className="upcoming-tram-wait">
            <strong>{departure.countdownText}</strong>
            <small>{departure.gtfsRealtime ? "Live" : "Timetable"}</small>
          </span>
        </article>
      ))}
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
                    <small>
                      Platform {departure.platform || "—"} ·{" "}
                      {departure.destination}
                    </small>
                  </span>
                  <span className="later-train-wait">
                    <strong>{departure.countdownText}</strong>
                    <small>
                      {departure.gtfsRealtime ? "Live" : "Timetable"}
                    </small>
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

function TicketEmpty({ message }) {
  return (
    <div className="ticket-empty">
      <Clock3 aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

function TravelSkeleton() {
  return (
    <div className="travel-skeleton" aria-label="Loading departures">
      <div />
      <div />
      <div />
    </div>
  );
}

function TravelState({ icon: Icon, message, error = false, compact = false }) {
  return (
    <div
      className={`travel-state ${error ? "error" : ""} ${compact ? "compact" : ""}`}
    >
      <Icon aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

function readStored(key, fallback) {
  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function formatTripTime(utcValue) {
  if (!utcValue) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Brisbane",
  }).format(new Date(utcValue));
}
