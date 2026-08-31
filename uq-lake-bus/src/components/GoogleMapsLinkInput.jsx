import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ChevronRight, MapPin, X } from "lucide-react";
import { findGooglePlaceMatches, importGoogleMapsLink } from "../lib/google-maps-link";
import CopyPlaceButton from "./CopyPlaceButton";
import "../styles/google-maps-link.css";

export default function GoogleMapsLinkInput({ onLocation, onSearch, onClose, getSearchContext }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [candidate, setCandidate] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loadingLabel, setLoadingLabel] = useState("Opening link…");
  const requestRef = useRef(null);
  const statusId = useId();
  useEffect(() => () => requestRef.current?.abort(), []);

  const resolveName = async (name, controller, continueAfterMatch = false) => {
    setLoadingLabel("Finding the location…");
    const places = await findGooglePlaceMatches(name, getSearchContext?.() || {}, controller.signal);
    if (controller.signal.aborted) return;
    if (places.length === 1) {
      setSuggestion("");
      setCandidate(places[0]);
      setMatches([]);
      if (continueAfterMatch) onLocation(places[0]);
    } else if (places.length > 1) {
      setMatches(places);
      setError("");
    } else {
      setError("Couldn't convert this place into a reliable map pin. Try another Google place share link.");
    }
  };

  const useNamedLocation = async () => {
    if (busy || !suggestion) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setError("");
    try { await resolveName(suggestion, controller, true); }
    catch (nextError) { if (!controller.signal.aborted) setError(nextError.message); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy || !value.trim()) return;
    // Dismiss the phone keyboard; no forced focus/zoom when lookup finishes.
    event.currentTarget.querySelector("input")?.blur();
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setError("");
    setSuggestion("");
    setCandidate(null);
    setMatches([]);
    setLoadingLabel("Opening link…");
    try {
      const result = await importGoogleMapsLink(value, controller.signal);
      if (controller.signal.aborted) return;
      if (result.location) setCandidate(result.location);
      else {
        setSuggestion(result.query);
        if (result.query) await resolveName(result.query, controller);
        else setError("This link doesn't identify a place. Open the store in Google Maps → Share → Copy link.");
      }
    } catch (nextError) {
      if (!controller.signal.aborted) setError(nextError.message);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  return <div className="food-map-link-entry">
    <form onSubmit={submit} aria-busy={busy}>
      <input value={value} onChange={(event) => {
        requestRef.current?.abort();
        setBusy(false);
        setValue(event.target.value);
        setError("");
        setSuggestion("");
        setCandidate(null);
        setMatches([]);
      }} placeholder="Paste Google Maps link" aria-label="Google Maps share link or coordinates"
        aria-describedby={error || busy ? statusId : undefined}
        autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint="go" />
      <button type="submit" disabled={busy || !value.trim()} aria-label={busy ? "Opening Google Maps link" : "Check Google Maps link"}>
        {busy ? <span className="food-mini-spinner" aria-hidden="true" /> : "Check link"}
      </button>
      {onClose && <button type="button" className="food-map-link-close" onClick={onClose} aria-label="Close link field"><X size={17} /></button>}
    </form>
    {(busy || error) && <p id={statusId} role="status">{busy ? loadingLabel : error}</p>}
    {candidate && <section className="food-map-link-confirm" aria-label="Confirm this place" aria-live="polite">
        <small>Map pin found · check before posting</small>
      <div className="food-map-link-confirm-place">
        <MapPin size={18} aria-hidden="true" />
        <div><strong>{candidate.name || "Pinned location"}</strong><span>{candidate.label}</span></div>
        <CopyPlaceButton text={candidate.name || `${candidate.latitude}, ${candidate.longitude}`}
          label={candidate.name ? "Copy place name" : "Copy coordinates"} />
      </div>
      <div className="food-map-link-confirm-actions">
        <button type="button" className="food-map-link-use" onClick={() => onLocation(candidate)}>
          <MapPin size={16} aria-hidden="true" /> Use this location <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </section>}
    {suggestion && <>
      <div className="food-map-link-result"><span>{suggestion}</span><CopyPlaceButton text={suggestion} /></div>
      {matches.length > 1 ? <div className="food-map-link-matches">
        <small>Which location is yours?</small>
        {matches.map((place) => <button type="button" key={place.providerPlaceId || `${place.latitude}:${place.longitude}`}
          onClick={() => { setCandidate(place); setSuggestion(""); setMatches([]); setError(""); }}>
          <MapPin size={16} aria-hidden="true" /><span><strong>{place.name}</strong><small>{place.label}</small></span><ChevronRight size={16} aria-hidden="true" />
        </button>)}
      </div> : <button type="button" className="food-map-link-use food-map-link-named-use" disabled={busy} onClick={useNamedLocation}>
        <MapPin size={16} aria-hidden="true" /> {busy ? "Finding location…" : "Use this location"} <ArrowRight size={16} aria-hidden="true" />
      </button>}
      {onSearch && !busy && !matches.length && <button type="button" className="food-map-link-search" onClick={() => {
        onSearch(suggestion);
        setError("");
        setSuggestion("");
      }}><strong>Search this place</strong></button>}
    </>}
  </div>;
}
