import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  Clock3,
  Plus,
  Radio,
  RefreshCw,
  Search,
  TrainFront,
  X,
} from "lucide-react";

const TRAIN_REFRESH_MS = 30_000;
const TRAIN_CACHE_TTL_MS = 30_000;
const SAVED_TRAIN_STATIONS_KEY = "uq-train-saved-stations-v1";
const GTFS_RT_SOURCE_URL =
  "https://translink.com.au/about-translink/open-data/gtfs-rt";
const TRAIN_STATIONS = [
  {
    id: "boggo-road",
    kicker: "Closest rail interchange to UQ",
    label: "Boggo Road",
    platformLabel: "Platforms 6–8",
    stopName: "Boggo Road station",
  },
  {
    id: "toowong",
    kicker: "Western rail connection",
    label: "Toowong",
    platformLabel: "Both platforms",
    stopName: "Toowong station",
  },
  {
    id: "roma-street",
    kicker: "Central city rail interchange",
    label: "Roma Street",
    platformLabel: "All platforms",
    stopName: "Roma Street station",
    aliases: ["Roma St", "Brisbane city"],
  },
  createStation("south-bank", "South Bank", ["Southbank"]),
  createStation("south-brisbane", "South Brisbane", ["South Bris"]),
  createStation("central", "Central", ["Brisbane Central", "CBD"]),
  createStation("fortitude-valley", "Fortitude Valley", ["The Valley"]),
  createStation("bowen-hills", "Bowen Hills"),
  createStation("milton", "Milton"),
  createStation("auchenflower", "Auchenflower"),
  createStation("taringa", "Taringa"),
  createStation("indooroopilly", "Indooroopilly", ["Indro"]),
  createStation("sherwood", "Sherwood"),
  createStation("corinda", "Corinda"),
  createStation("oxley", "Oxley"),
  createStation("darra", "Darra"),
  createStation("park-road", "Park Road"),
  createStation("dutton-park", "Dutton Park"),
  createStation("fairfield", "Fairfield"),
  createStation("yeronga", "Yeronga"),
  createStation("yeerongpilly", "Yeerongpilly"),
  createStation("moorooka", "Moorooka"),
  createStation("rocklea", "Rocklea"),
  createStation("coopers-plains", "Coopers Plains", ["Cooper Plains"]),
  createStation("sunnybank", "Sunnybank"),
  createStation("altandi", "Altandi"),
  createStation("kuraby", "Kuraby"),
  createStation("albion", "Albion"),
  createStation("wooloowin", "Wooloowin"),
  createStation("eagle-junction", "Eagle Junction"),
  createStation("nundah", "Nundah"),
  createStation("northgate", "Northgate"),
  createStation("international-airport", "International Airport", [
    "Brisbane International Airport",
    "Airport international",
  ]),
  createStation("domestic-airport", "Domestic Airport", [
    "Brisbane Domestic Airport",
    "Airport domestic",
  ]),
];
const DEFAULT_SAVED_STATION_IDS = [];
const trainDepartureCache = new Map();

export default function TrainTimesPage({ modeSelector }) {
  const [savedStationIds, setSavedStationIds] = useState(getSavedStationIds);
  const [selectedStationId, setSelectedStationId] = useState(
    () => getSavedStationIds()[0] ?? "",
  );
  const [stationSearchOpen, setStationSearchOpen] = useState(
    () => getSavedStationIds().length === 0,
  );
  const [stationQuery, setStationQuery] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const stationSearchRef = useRef(null);
  const savedStationStripRef = useRef(null);
  const requestIdRef = useRef(0);
  const activeStation = TRAIN_STATIONS.find(
    (station) => station.id === selectedStationId,
  );
  const savedStations = savedStationIds
    .map((id) => TRAIN_STATIONS.find((station) => station.id === id))
    .filter(Boolean);
  const stationMatches = useMemo(
    () => findStationMatches(stationQuery, savedStationIds),
    [stationQuery, savedStationIds],
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SAVED_TRAIN_STATIONS_KEY,
        JSON.stringify(savedStationIds),
      );
    } catch {
      // The picker still works if storage is unavailable or disabled.
    }
  }, [savedStationIds]);

  useEffect(() => {
    if (stationSearchOpen) {
      window.requestAnimationFrame(() => stationSearchRef.current?.focus());
    }
  }, [stationSearchOpen]);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      savedStationStripRef.current
        ?.querySelector(`[data-station-id="${selectedStationId}"]`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
    });
  }, [selectedStationId]);

  const loadTrains = async ({ silent = false } = {}) => {
    if (!activeStation) {
      setData(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch(
        `/api/departures?stopName=${encodeURIComponent(activeStation.stopName)}&limit=24`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("Could not load train departures.");
      }

      const nextData = await response.json();

      if (requestId !== requestIdRef.current) {
        return;
      }

      trainDepartureCache.set(activeStation.stopName, {
        data: nextData,
        timestamp: Date.now(),
      });
      setData(nextData);
      setError("");
    } catch (fetchError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      console.error(fetchError);
      setError("Train times are unavailable right now.");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    if (!activeStation) {
      setData(null);
      setError("");
      setLoading(false);
      return undefined;
    }

    const cachedData = getCachedTrainData(activeStation.stopName);

    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      loadTrains({ silent: true });
    } else {
      loadTrains();
    }

    const intervalId = window.setInterval(
      () => loadTrains({ silent: true }),
      TRAIN_REFRESH_MS,
    );

    return () => {
      requestIdRef.current += 1;
      window.clearInterval(intervalId);
    };
  }, [activeStation?.stopName]);

  const selectStation = (stationId) => {
    if (stationId === selectedStationId) {
      return;
    }

    requestIdRef.current += 1;
    const nextStation = TRAIN_STATIONS.find(
      (station) => station.id === stationId,
    );
    const cachedData = nextStation
      ? getCachedTrainData(nextStation.stopName)
      : null;

    setData(cachedData);
    setLoading(Boolean(nextStation) && !cachedData);
    setRefreshing(false);
    setError("");
    setSelectedStationId(stationId);
  };

  const saveStation = (station) => {
    setSavedStationIds((currentIds) =>
      currentIds.includes(station.id)
        ? currentIds
        : [...currentIds, station.id],
    );
    selectStation(station.id);
    setStationQuery("");
    setStationSearchOpen(false);
  };

  const removeStation = (stationId) => {
    const stationIndex = savedStationIds.indexOf(stationId);
    const nextIds = savedStationIds.filter((id) => id !== stationId);
    setSavedStationIds(nextIds);

    if (stationId === selectedStationId) {
      selectStation(nextIds[Math.max(0, stationIndex - 1)] ?? nextIds[0] ?? "");
    }

    if (nextIds.length === 0) {
      setStationSearchOpen(true);
    }
  };

  const departures = data?.departures ?? [];
  return (
    <section className="train-page" aria-label="Live train times">
      {modeSelector}

      <section className="train-station-panel" aria-label="Your train stations">
        <div className="train-station-panel-head">
          <div>
            <span>Your stations</span>
            <strong>Tap a station to see its next trains</strong>
          </div>
          <button
            type="button"
            className={stationSearchOpen ? "train-add-station active" : "train-add-station"}
            aria-label={stationSearchOpen ? "Close station search" : "Add station"}
            aria-expanded={stationSearchOpen}
            aria-controls="train-station-search"
            onClick={() => setStationSearchOpen((isOpen) => !isOpen)}
          >
            {stationSearchOpen ? <X aria-hidden="true" /> : <Plus aria-hidden="true" />}
            <span>{stationSearchOpen ? "Close" : "Add station"}</span>
          </button>
        </div>

        <div
          ref={savedStationStripRef}
          className="train-saved-stations"
          aria-label="Saved train stations"
        >
          {savedStations.map((station) => (
            <div
              data-station-id={station.id}
              className={
                selectedStationId === station.id
                  ? "train-saved-station active"
                  : "train-saved-station"
              }
              key={station.id}
            >
              <button
                type="button"
                className="train-saved-station-select"
                aria-pressed={selectedStationId === station.id}
                onClick={(event) => {
                  event.currentTarget.parentElement?.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                    inline: "center",
                  });
                  selectStation(station.id);
                }}
              >
                <TrainFront aria-hidden="true" />
                <span>{station.label}</span>
              </button>
              <button
                type="button"
                className="train-saved-station-remove"
                aria-label={`Remove ${station.label} from saved stations`}
                onClick={() => removeStation(station.id)}
              >
                <X aria-hidden="true" />
              </button>
            </div>
          ))}
          {savedStations.length === 0 ? (
            <p className="train-empty-stations">
              No stations saved yet. Find one below to start.
            </p>
          ) : null}
        </div>

        {stationSearchOpen ? (
          <form
            id="train-station-search"
            className="train-station-search"
            onSubmit={(event) => {
              event.preventDefault();
              if (stationMatches[0]) {
                saveStation(stationMatches[0]);
              }
            }}
          >
            <label htmlFor="train-station-query">Find a train station</label>
            <div className="train-station-search-field">
              <Search aria-hidden="true" />
              <input
                id="train-station-query"
                ref={stationSearchRef}
                type="search"
                autoComplete="off"
                value={stationQuery}
                placeholder="Try ‘Central’ or ‘Roma Stret’"
                onChange={(event) => setStationQuery(event.target.value)}
              />
              {stationQuery ? (
                <button
                  type="button"
                  aria-label="Clear station search"
                  onClick={() => setStationQuery("")}
                >
                  <X aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <small className="train-search-hint">
              Search by full name, a few letters, or a close spelling.
            </small>

            <div className="train-station-results" aria-live="polite">
              {stationMatches.length ? (
                stationMatches.map((station) => {
                  const isSaved = savedStationIds.includes(station.id);
                  return (
                    <button
                      type="button"
                      className="train-station-result"
                      key={station.id}
                      onClick={() => saveStation(station)}
                    >
                      <span>
                        <strong>{station.label}</strong>
                        <small>{station.stopName}</small>
                      </span>
                      {isSaved ? (
                        <span className="train-result-saved">
                          <Check aria-hidden="true" /> Saved
                        </span>
                      ) : (
                        <Plus aria-hidden="true" />
                      )}
                    </button>
                  );
                })
              ) : (
                <p className="train-no-station-results">
                  No close station match. Try a nearby suburb or a shorter name.
                </p>
              )}
            </div>
          </form>
        ) : null}
      </section>

      {activeStation ? (
        <>
      <header className="train-hero">
        <div className="train-hero-icon" aria-hidden="true">
          <TrainFront />
        </div>
        <div className="train-hero-copy">
          <span className="train-kicker">{activeStation.kicker}</span>
          <h1>{activeStation.label} trains</h1>
          <p>Official predictions from Translink GTFS-Realtime.</p>
        </div>
        <button
          type="button"
          className="train-refresh"
          aria-label="Refresh train departures"
          disabled={loading || refreshing}
          onClick={() => loadTrains({ silent: true })}
        >
          <RefreshCw className={loading || refreshing ? "spinning" : ""} />
        </button>
      </header>

      <div className="train-summary-bar">
        <span>
          <Radio aria-hidden="true" />
          {data?.gtfsRealtime ? "GTFS-RT connected" : "Schedule available"}
        </span>
        <small>Refreshes every 30 sec</small>
      </div>

      <section className="train-board" aria-label="Upcoming trains">
        <div className="train-board-head">
          <div>
            <span>Departures</span>
            <h2>Leaving {activeStation.label}</h2>
          </div>
          <span className="train-platform-note">
            {activeStation.platformLabel}
          </span>
        </div>

        {loading ? (
          <div className="train-list">
            {Array.from({ length: 5 }, (_, index) => (
              <div className="train-row skeleton-card" key={index} />
            ))}
          </div>
        ) : error ? (
          <div className="train-state-card error">
            <AlertCircle aria-hidden="true" />
            <p>{error}</p>
          </div>
        ) : departures.length ? (
          <div className="train-list">
            {departures.slice(0, 12).map((departure, index) => (
              <motion.article
                className="train-row"
                key={departure.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: Math.min(index * 0.018, 0.11),
                  duration: 0.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <span className="train-node" aria-hidden="true">
                  <TrainFront />
                </span>
                <span className="train-route-copy">
                  <small>
                    {getRailLineLabel(
                      departure.routeCode,
                      departure.destination,
                    )}
                  </small>
                  <strong>{departure.destination}</strong>
                  <span>
                    Platform {departure.platform || "—"} · {departure.routeCode}
                  </span>
                </span>
                <span className="train-time-copy">
                  <strong>{departure.countdownText}</strong>
                  <span>{departure.displayTime}</span>
                  <small className={departure.gtfsRealtime ? "live" : "scheduled"}>
                    {departure.gtfsRealtime ? "GTFS live" : "Scheduled"}
                  </small>
                </span>
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="train-state-card">
            <Clock3 aria-hidden="true" />
            <p>No upcoming trains are listed.</p>
          </div>
        )}
      </section>

      <a
        className="train-source-link"
        href={GTFS_RT_SOURCE_URL}
        target="_blank"
        rel="noreferrer"
      >
        Translink open-data source
        <ArrowUpRight aria-hidden="true" />
      </a>
        </>
      ) : null}
    </section>
  );
}

function getRailLineLabel(routeCode, destination) {
  const code = String(routeCode ?? "").toUpperCase();
  const destinationLabel = String(destination ?? "").toLowerCase();

  if (destinationLabel.includes("airport")) {
    return "Airport line";
  }

  if (destinationLabel.includes("varsity lakes")) {
    return "Gold Coast line";
  }

  if (destinationLabel.includes("beenleigh") || code.includes("BN")) {
    return "Beenleigh line";
  }

  if (destinationLabel.includes("shorncliffe")) {
    return "Shorncliffe line";
  }

  if (destinationLabel.includes("cleveland")) {
    return "Cleveland line";
  }

  if (code.includes("SP")) {
    return "Springfield line";
  }

  if (code.includes("IP")) {
    return "Ipswich line";
  }

  if (code.includes("CA")) {
    return "Caboolture line";
  }

  if (code.includes("NA")) {
    return "Nambour line";
  }

  return "Queensland Rail";
}

function createStation(id, label, aliases = []) {
  return {
    id,
    aliases,
    kicker: "Saved rail station",
    label,
    platformLabel: "Check platform on service",
    stopName: `${label} station`,
  };
}

function getCachedTrainData(stopName) {
  const cached = trainDepartureCache.get(stopName);

  if (!cached || Date.now() - cached.timestamp > TRAIN_CACHE_TTL_MS) {
    trainDepartureCache.delete(stopName);
    return null;
  }

  return cached.data;
}

function getSavedStationIds() {
  if (typeof window === "undefined") {
    return DEFAULT_SAVED_STATION_IDS;
  }

  try {
    const savedIds = JSON.parse(
      window.localStorage.getItem(SAVED_TRAIN_STATIONS_KEY) ?? "[]",
    );
    const validIds = [...new Set(savedIds)].filter((id) =>
      TRAIN_STATIONS.some((station) => station.id === id),
    );

    return validIds.length ? validIds : DEFAULT_SAVED_STATION_IDS;
  } catch {
    return DEFAULT_SAVED_STATION_IDS;
  }
}

function findStationMatches(query, savedStationIds) {
  const normalizedQuery = normalizeStationSearch(query);

  if (!normalizedQuery) {
    return TRAIN_STATIONS.filter(
      (station) => !savedStationIds.includes(station.id),
    ).slice(0, 8);
  }

  return TRAIN_STATIONS.map((station) => ({
    station,
    score: Math.max(
      ...[station.label, station.stopName, ...(station.aliases ?? [])].map(
        (candidate) => getFuzzyScore(normalizedQuery, candidate),
      ),
    ),
  }))
    .filter(({ score }) => score >= 44)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.station.label.localeCompare(right.station.label);
    })
    .slice(0, 8)
    .map(({ station }) => station);
}

function getFuzzyScore(normalizedQuery, candidate) {
  const normalizedCandidate = normalizeStationSearch(candidate);

  if (!normalizedCandidate) {
    return 0;
  }

  if (normalizedCandidate === normalizedQuery) {
    return 100;
  }

  if (normalizedCandidate.startsWith(normalizedQuery)) {
    return 92 - Math.min(normalizedCandidate.length - normalizedQuery.length, 12);
  }

  if (normalizedCandidate.includes(normalizedQuery)) {
    return 82 - Math.min(normalizedCandidate.length - normalizedQuery.length, 12);
  }

  const candidateWords = normalizedCandidate.split(" ");
  const queryWords = normalizedQuery.split(" ");
  const allWordsCloselyMatch = queryWords.every((queryWord) =>
    candidateWords.some((candidateWord) => {
      if (candidateWord.startsWith(queryWord)) {
        return true;
      }

      const distance = getEditDistance(queryWord, candidateWord);
      return distance <= Math.max(1, Math.floor(candidateWord.length * 0.3));
    }),
  );

  if (allWordsCloselyMatch) {
    return 74;
  }

  const editDistance = getEditDistance(normalizedQuery, normalizedCandidate);
  const similarity = 1 - editDistance / Math.max(
    normalizedQuery.length,
    normalizedCandidate.length,
  );

  return Math.round(similarity * 70);
}

function normalizeStationSearch(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(train|railway|rail|station)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getEditDistance(left, right) {
  const previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previousRow[0];
    previousRow[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previousRow[rightIndex];
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      previousRow[rightIndex] = Math.min(
        previousRow[rightIndex] + 1,
        previousRow[rightIndex - 1] + 1,
        diagonal + substitutionCost,
      );
      diagonal = above;
    }
  }

  return previousRow[right.length];
}
