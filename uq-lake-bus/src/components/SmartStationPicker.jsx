import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export default function SmartStationPicker({
  ariaLabel,
  onChange,
  stations,
  tone = "light",
  value,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const selected = stations.find((station) => station.id === value) ?? stations[0];
  const matches = useMemo(
    () => findMatches(stations, query),
    [stations, query],
  );

  useEffect(() => {
    if (!open) return undefined;
    window.requestAnimationFrame(() => inputRef.current?.focus());
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  const choose = (station) => {
    onChange(station.id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className={`smart-station-picker ${tone}`} ref={rootRef}>
      <button
        type="button"
        className="smart-station-trigger"
        aria-label={`${ariaLabel}: ${selected.label}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <strong>{selected.label}</strong>
        <ChevronDown aria-hidden="true" />
      </button>

      {open ? (
        <div className="smart-station-popover">
          <div className="smart-station-search">
            <Search aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              aria-label={`Search ${ariaLabel.toLowerCase()}`}
              placeholder="Type a station"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setOpen(false);
                if (event.key === "Enter" && matches[0]) {
                  event.preventDefault();
                  choose(matches[0]);
                }
              }}
            />
            {query ? (
              <button type="button" aria-label="Clear station search" onClick={() => setQuery("")}><X aria-hidden="true" /></button>
            ) : null}
          </div>
          <div className="smart-station-results">
            {matches.length ? matches.slice(0, 8).map((station) => (
              <button type="button" className={station.id === selected.id ? "selected" : ""} key={station.id} onClick={() => choose(station)}>
                <span>{station.label}</span>
                {station.id === selected.id ? <Check aria-hidden="true" /> : null}
              </button>
            )) : <p>No close match</p>}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function findMatches(stations, query) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return stations;
  return stations
    .map((station) => ({ station, score: stationScore(station.label, normalizedQuery) }))
    .filter(({ score }) => score < 9)
    .sort((a, b) => a.score - b.score || a.station.label.localeCompare(b.station.label))
    .map(({ station }) => station);
}

function stationScore(label, query) {
  const normalizedLabel = normalize(label);
  if (normalizedLabel === query) return 0;
  if (normalizedLabel.startsWith(query)) return 1;
  if (normalizedLabel.includes(query)) return 2;
  const distance = levenshtein(normalizedLabel, query);
  const allowance = Math.max(2, Math.round(query.length * 0.34));
  return distance <= allowance ? 3 + distance : 99;
}

function normalize(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function levenshtein(left, right) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const previous = row[rightIndex];
      row[rightIndex] = Math.min(
        row[rightIndex] + 1,
        row[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = previous;
    }
  }
  return row[right.length];
}
