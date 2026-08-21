import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  Clock3,
  CreditCard,
  LocateFixed,
  Plane,
  RefreshCw,
  TrainFront,
} from "lucide-react";

import { AIRPORT_RAIL_STATIONS } from "../lib/travel-data";
import {
  byDepartureTime,
  fetchTravelDepartures,
  findNearestStation,
  formatDistance,
  isAirportTrain,
} from "../lib/travel-utils";
import SmartStationPicker from "../components/SmartStationPicker";

const REFRESH_MS = 30_000;
const STORAGE_KEY = "uq-travel-airport-rail-v1";
const AIRTRAIN_URL = "https://www.airtrain.com.au/";
const AIRTRAIN_TIMETABLE_URL = "https://www.airtrain.com.au/timetable/";
const BRISBANE_AIRPORT_FLIGHTS_URL =
  "https://www.bne.com.au/passenger/flights/arrivals-departures";

export default function AirportTravelPage({ onHome }) {
  const [stationId, setStationId] = useState(() => readStored(STORAGE_KEY, "central"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [locationState, setLocationState] = useState({ status: "idle" });
  const requestIdRef = useRef(0);
  const station =
    AIRPORT_RAIL_STATIONS.find((item) => item.id === stationId) ??
    AIRPORT_RAIL_STATIONS[4];

  const loadDepartures = async ({ silent = false } = {}) => {
    const requestId = ++requestIdRef.current;
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const nextData = await fetchTravelDepartures(station.stopName);
      if (requestId !== requestIdRef.current) return;
      setData(nextData);
      setError("");
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      console.error(loadError);
      setError("Airport train departures are unavailable right now.");
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
  }, [station.stopName]);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, stationId); } catch { /* optional */ }
  }, [stationId]);

  const trains = useMemo(
    () => (data?.departures ?? []).filter(isAirportTrain).sort(byDepartureTime),
    [data],
  );

  const useLocation = () => {
    if (!navigator.geolocation) {
      setLocationState({ status: "error", message: "Location is not supported on this device." });
      return;
    }
    setLocationState({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nearest = findNearestStation(
          coords.latitude,
          coords.longitude,
          AIRPORT_RAIL_STATIONS,
        );
        setStationId(nearest.id);
        setLocationState({ status: "ready", nearest });
      },
      () => setLocationState({ status: "error", message: "Location was not shared. Choose a station below instead." }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  return (
    <section className="travel-page airport-travel-page" aria-label="Travel to Brisbane Airport">
      <header className="trip-page-top airport">
        <button type="button" className="trip-back-button" aria-label="Back to home" onClick={onHome}>
          <ArrowLeft aria-hidden="true" />
        </button>
        <span className="trip-page-mark airport"><Plane aria-hidden="true" /></span>
        <h1>Airport</h1>
        <span className={`trip-data-dot ${data?.gtfsRealtime ? "live" : ""}`}>{data?.gtfsRealtime ? "Live" : "Times"}</span>
        <button type="button" className="trip-icon-button" aria-label="Use my location" onClick={useLocation} disabled={locationState.status === "loading"}><LocateFixed aria-hidden="true" /></button>
        <button type="button" className="trip-icon-button" aria-label="Refresh airport departures" disabled={loading || refreshing} onClick={() => loadDepartures({ silent: true })}><RefreshCw className={loading || refreshing ? "spinning" : ""} /></button>
      </header>

      {locationState.status === "ready" ? <p className="trip-utility-note airport">{locationState.nearest.label} · {formatDistance(locationState.nearest.distanceKm)}</p> : null}
      {locationState.status === "error" ? <p className="trip-utility-note error">{locationState.message}</p> : null}

      <section className="trip-control-bar airport-one">
        <label>Train from</label>
        <SmartStationPicker ariaLabel="Airport train from" stations={AIRPORT_RAIL_STATIONS} value={station.id} onChange={setStationId} />
      </section>

      {loading ? (
        <div className="travel-skeleton"><div /><div /><div /></div>
      ) : error ? (
        <TravelState Icon={AlertCircle} message={error} error />
      ) : trains.length ? (
        <section className="airport-board" aria-label="Upcoming Airport line trains">
          <div className="airport-next-train">
            <span className="airport-next-icon"><Plane aria-hidden="true" /></span>
            <div>
              <small>Next train to Brisbane Airport</small>
              <h2>{trains[0].countdownText}</h2>
              <div className="airport-next-facts">
                <span>Departs <b>{trains[0].displayTime}</b></span>
                <span>Platform <b>{trains[0].platform || "—"}</b></span>
              </div>
            </div>
            <span className={trains[0].gtfsRealtime ? "airport-live-tag" : "airport-live-tag scheduled"}>{trains[0].gtfsRealtime ? "Live" : "Scheduled"}</span>
          </div>
          <div className="travel-section-head airport-upcoming-head"><span>Following trains</span><strong>from {station.label}</strong></div>
          <div className="travel-departure-list">
            {trains.slice(1, 4).map((departure, index) => (
              <motion.article className="travel-departure-row" key={departure.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.025 }}>
                <span><strong>{departure.destination}</strong><small>Platform {departure.platform || "—"} · Airport line</small></span>
                <span><strong>{departure.countdownText}</strong><small>Departs {departure.displayTime}</small></span>
              </motion.article>
            ))}
          </div>
        </section>
      ) : (
        <TravelState Icon={Clock3} message={`No Airport-bound trains are listed from ${station.label}.`} />
      )}

      <section className="airtrain-info" aria-label="Airtrain fares and payment">
        <div className="airtrain-info-head"><span><TrainFront aria-hidden="true" /></span><div><small>Private rail</small><h2>Airtrain</h2></div></div>
        <div className="airtrain-facts">
          <div><Banknote aria-hidden="true" /><span><strong>From $23.30</strong><small>City–airport · check exact fare</small></span></div>
          <div><CreditCard aria-hidden="true" /><span><strong>Card or go card</strong><small>Airtrain fares apply</small></span></div>
        </div>
        <div className="airtrain-actions">
          <a href={AIRTRAIN_URL} target="_blank" rel="noreferrer">Fares & tickets <ArrowUpRight aria-hidden="true" /></a>
          <a className="secondary" href={AIRTRAIN_TIMETABLE_URL} target="_blank" rel="noreferrer">Timetable <ArrowUpRight aria-hidden="true" /></a>
        </div>
      </section>

      <a className="flight-status-link" href={BRISBANE_AIRPORT_FLIGHTS_URL} target="_blank" rel="noreferrer">
        <Plane aria-hidden="true" />
        <strong>Track a flight</strong>
        <span>Flight number, city or airline</span>
        <ArrowUpRight aria-hidden="true" />
      </a>
    </section>
  );
}

function TravelState({ Icon, message, error = false }) {
  return <div className={`travel-state ${error ? "error" : ""}`}><Icon aria-hidden="true" /><p>{message}</p></div>;
}

function readStored(key, fallback) {
  try { return window.localStorage.getItem(key) || fallback; } catch { return fallback; }
}
