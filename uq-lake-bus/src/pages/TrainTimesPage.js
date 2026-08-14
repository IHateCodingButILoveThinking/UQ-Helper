import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Radio,
  RefreshCw,
  TrainFront,
} from "lucide-react";

const TRAIN_REFRESH_MS = 30_000;
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
  },
];

export default function TrainTimesPage({ modeSelector }) {
  const stationPickerRef = useRef(null);
  const [selectedStationId, setSelectedStationId] = useState("boggo-road");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const activeStation =
    TRAIN_STATIONS.find((station) => station.id === selectedStationId) ??
    TRAIN_STATIONS[0];

  const loadTrains = async ({ silent = false } = {}) => {
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

      setData(await response.json());
      setError("");
    } catch (fetchError) {
      console.error(fetchError);
      setError("Train times are unavailable right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let isActive = true;

    const load = async (options) => {
      if (isActive) {
        await loadTrains(options);
      }
    };

    load();
    const intervalId = window.setInterval(
      () => load({ silent: true }),
      TRAIN_REFRESH_MS,
    );

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [activeStation.stopName]);

  const departures = data?.departures ?? [];
  const scrollStations = (direction) => {
    stationPickerRef.current?.scrollBy({
      behavior: "smooth",
      left: direction * 160,
    });
  };

  return (
    <section className="train-page" aria-label="Live train times">
      {modeSelector}

      <div className="train-station-carousel">
        <button
          type="button"
          className="train-station-scroll"
          aria-label="Scroll train stations left"
          onClick={() => scrollStations(-1)}
        >
          <ChevronLeft aria-hidden="true" />
        </button>

        <div
          ref={stationPickerRef}
          className="train-station-picker"
          aria-label="Choose train station"
        >
          {TRAIN_STATIONS.map((station) => (
            <button
              key={station.id}
              type="button"
              className={selectedStationId === station.id ? "active" : ""}
              aria-pressed={selectedStationId === station.id}
              onClick={(event) => {
                event.currentTarget.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "center",
                });

                if (station.id !== selectedStationId) {
                  setData(null);
                  setError("");
                  setSelectedStationId(station.id);
                }
              }}
            >
              {station.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="train-station-scroll"
          aria-label="Scroll train stations right"
          onClick={() => scrollStations(1)}
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

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
                transition={{ delay: Math.min(index * 0.035, 0.25) }}
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
