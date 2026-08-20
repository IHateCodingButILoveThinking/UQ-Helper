import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  ArrowLeft,
  ChevronDown,
  Flag,
  LocateFixed,
  MapPin,
  Maximize2,
  MessageCircle,
  Minimize2,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";

import {
  createShoutOut,
  fetchShoutOutSummary,
  fetchShoutOuts,
  reactToShoutOut,
  reportShoutOut,
  SHOUTOUT_PLACES,
} from "../lib/shoutout-api";

const PLACE_STORAGE_KEY = "uq-shout-place-v1";
const POST_EMOJIS = ["", "👋", "☕", "📚", "🎉", "👀"];
const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "👀"];
const AVATAR_FACES = ["•ᴗ•", "•‿•", "•◡•", "^‿^", "•⌣•"];
const CAMPUS_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export default function ShoutOutPage({ onHome }) {
  const [placeId, setPlaceId] = useState(readStoredPlace);
  const [messages, setMessages] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [postEmoji, setPostEmoji] = useState("");
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState("");
  const [locationState, setLocationState] = useState("idle");
  const [userPosition, setUserPosition] = useState(null);
  const [reactionOpenId, setReactionOpenId] = useState("");
  const [reactedIds, setReactedIds] = useState(() => new Set());
  const [reportedIds, setReportedIds] = useState(() => new Set());
  const feedRef = useRef(null);
  const requestSequenceRef = useRef(0);

  const selectedPlace = useMemo(
    () => SHOUTOUT_PLACES.find((place) => place.id === placeId) ?? SHOUTOUT_PLACES[0],
    [placeId],
  );

  const loadMessages = useCallback(
    async ({ silent = false, signal } = {}) => {
      const requestId = ++requestSequenceRef.current;
      silent ? setRefreshing(true) : setLoading(true);
      if (!silent) setMessages([]);
      try {
        const [payload, summaryPayload] = await Promise.all([
          fetchShoutOuts(placeId, { signal }),
          fetchShoutOutSummary({ signal }).catch(() => null),
        ]);
        if (requestId !== requestSequenceRef.current) return;
        setMessages(payload.messages ?? []);
        if (summaryPayload) {
          setSummaries(
            Object.fromEntries(
              (summaryPayload.summaries ?? []).map((summary) => [summary.placeId, summary]),
            ),
          );
        }
        setError("");
      } catch (loadError) {
        if (loadError.name === "AbortError" || requestId !== requestSequenceRef.current) return;
        setError(loadError.message || "Shout outs are unavailable right now.");
      } finally {
        if (requestId === requestSequenceRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [placeId],
  );

  const scrollToPosts = useCallback(() => {
    const anchor = feedRef.current;
    if (!anchor) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    anchor.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => anchor.focus({ preventScroll: true }), reduceMotion ? 0 : 380);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadMessages({ signal: controller.signal });
    const intervalId = window.setInterval(
      () => loadMessages({ silent: true }),
      30_000,
    );
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [loadMessages]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PLACE_STORAGE_KEY, placeId);
    } catch {
      // Selection still works when storage is unavailable.
    }
    setNotice("");
    setReactionOpenId("");
  }, [placeId]);

  const submitMessage = async (event) => {
    event.preventDefault();
    if (!draft.trim() || posting) return;

    setPosting(true);
    setNotice("");
    try {
      const payload = await createShoutOut({
        placeId,
        message: draft,
        emoji: postEmoji,
      });
      setMessages((current) => [payload.message, ...current]);
      setSummaries((current) => {
        const previous = current[placeId];
        return {
          ...current,
          [placeId]: {
            placeId,
            messageCount: Number(previous?.messageCount ?? 0) + 1,
            latest: payload.message,
          },
        };
      });
      setDraft("");
      setPostEmoji("");
      setNotice("Posted for 7 days");
    } catch (postError) {
      setNotice(postError.message || "Could not post right now.");
    } finally {
      setPosting(false);
    }
  };

  const chooseNearestPlace = () => {
    if (!navigator.geolocation) {
      setLocationState("unsupported");
      return;
    }
    setLocationState("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nearest = [...SHOUTOUT_PLACES].sort(
          (a, b) =>
            distanceKm(coords.latitude, coords.longitude, a.latitude, a.longitude) -
            distanceKm(coords.latitude, coords.longitude, b.latitude, b.longitude),
        )[0];
        setUserPosition([coords.longitude, coords.latitude]);
        setPlaceId(nearest.id);
        setLocationState("ready");
      },
      () => setLocationState("denied"),
      { enableHighAccuracy: false, maximumAge: 120_000, timeout: 7000 },
    );
  };

  const react = async (messageId, emoji) => {
    if (reactedIds.has(messageId)) return;
    setReactionOpenId("");
    try {
      const payload = await reactToShoutOut(messageId, emoji);
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? { ...message, reactionCount: payload.reactionCount }
            : message,
        ),
      );
      setReactedIds((current) => new Set(current).add(messageId));
    } catch (reactionError) {
      setNotice(reactionError.message || "Could not add that reaction.");
    }
  };

  const report = async (messageId) => {
    if (reportedIds.has(messageId)) return;
    try {
      await reportShoutOut(messageId);
      setReportedIds((current) => new Set(current).add(messageId));
      setNotice("Thanks — report received");
    } catch (reportError) {
      setNotice(reportError.message || "Could not report this message.");
    }
  };

  return (
    <section className="shout-page" aria-label="UQ campus shout outs">
      <header className="shout-topbar">
        <button type="button" className="shout-icon-button" onClick={onHome} aria-label="Back to home">
          <ArrowLeft aria-hidden="true" />
        </button>
        <span className="shout-title-mark" aria-hidden="true"><MessageCircle /></span>
        <span className="shout-title-copy"><small>UQ St Lucia</small><h1>Shout Out</h1></span>
        <button
          type="button"
          className="shout-icon-button"
          onClick={() => loadMessages({ silent: true })}
          disabled={refreshing}
          aria-label="Refresh messages"
        >
          <RefreshCw className={refreshing ? "spinning" : ""} aria-hidden="true" />
        </button>
      </header>

      <section className="shout-map-card" aria-label="Choose a campus place">
        <div className="shout-map-head">
          <span><MapPin aria-hidden="true" /><strong>{selectedPlace.label}</strong></span>
          <button type="button" onClick={chooseNearestPlace} disabled={locationState === "loading"}>
            <LocateFixed aria-hidden="true" />
            {locationState === "loading" ? "Finding" : "Near me"}
          </button>
        </div>

        <CampusMap
          placeId={placeId}
          onSelect={setPlaceId}
          onViewPosts={scrollToPosts}
          summaries={summaries}
          userPosition={userPosition}
        />

        <div className="shout-place-strip" aria-label="Campus places">
          {SHOUTOUT_PLACES.map((place) => (
            <button
              key={place.id}
              type="button"
              className={place.id === placeId ? "selected" : ""}
              onClick={() => setPlaceId(place.id)}
            >
              {place.shortLabel}
            </button>
          ))}
        </div>

        {locationState === "denied" ? <p className="shout-location-note">Choose a place manually or allow location access.</p> : null}
      </section>

      <section className="shout-feed" aria-label={`Messages at ${selectedPlace.label}`}>
        <div className="shout-feed-head">
          <span><strong>{selectedPlace.shortLabel}</strong><small>{summaries[placeId]?.messageCount ?? messages.length} recent</small></span>
          <small>7-day posts</small>
        </div>

        <form className="shout-composer" onSubmit={submitMessage}>
          <div className="shout-compose-main">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={160}
              rows={2}
              aria-label={`Post at ${selectedPlace.label}`}
              placeholder={`What’s happening at ${selectedPlace.shortLabel}?`}
            />
            <button type="submit" disabled={!draft.trim() || posting} aria-label="Post shout out">
              <Send aria-hidden="true" />
            </button>
          </div>
          <div className="shout-compose-tools">
            <span className="shout-post-emojis" aria-label="Add an emoji">
              {POST_EMOJIS.slice(1).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={postEmoji === emoji ? "selected" : ""}
                  onClick={() => setPostEmoji((current) => current === emoji ? "" : emoji)}
                  aria-label={`Add ${emoji}`}
                  aria-pressed={postEmoji === emoji}
                >
                  {emoji}
                </button>
              ))}
            </span>
            <small>{draft.length}/160</small>
          </div>
        </form>

        <AnimatePresence>
          {notice ? (
            <motion.p className="shout-notice" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {notice}
            </motion.p>
          ) : null}
        </AnimatePresence>

        <div
          ref={feedRef}
          className="shout-feed-anchor"
          tabIndex={-1}
          aria-label={`Recent posts at ${selectedPlace.label}`}
        />

        {loading ? (
          <div className="shout-loading" aria-label="Loading messages">
            {[1, 2, 3].map((item) => <span key={item} />)}
          </div>
        ) : error ? (
          <div className="shout-empty"><MessageCircle aria-hidden="true" /><strong>Can’t connect yet</strong><span>{error}</span></div>
        ) : messages.length === 0 ? (
          <div className="shout-empty"><Sparkles aria-hidden="true" /><strong>Be the first here</strong><span>Leave a useful campus update.</span></div>
        ) : (
          <div className="shout-message-list">
            {messages.map((message) => (
              <motion.article
                key={message.id}
                className="shout-message"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                layout
              >
                <span className="shout-avatar" style={{ backgroundColor: message.avatarColor }} aria-hidden="true">
                  {AVATAR_FACES[message.avatarVariant % AVATAR_FACES.length]}
                </span>
                <div className="shout-message-body">
                  <div className="shout-message-meta">
                    <strong>Anonymous</strong>
                    <span>{relativeTime(message.createdAt)}</span>
                  </div>
                  <p>{message.emoji ? <b>{message.emoji}</b> : null}{message.message}</p>
                  <div className="shout-message-actions">
                    <button
                      type="button"
                      className={reactedIds.has(message.id) ? "reacted" : ""}
                      onClick={() => setReactionOpenId((current) => current === message.id ? "" : message.id)}
                      aria-label="React to message"
                    >
                      <span aria-hidden="true">♡</span>{message.reactionCount || "React"}
                    </button>
                    <button
                      type="button"
                      className={reportedIds.has(message.id) ? "reported" : ""}
                      onClick={() => report(message.id)}
                      aria-label="Report message"
                    >
                      <Flag aria-hidden="true" />{reportedIds.has(message.id) ? "Reported" : "Report"}
                    </button>
                  </div>
                  <AnimatePresence>
                    {reactionOpenId === message.id && !reactedIds.has(message.id) ? (
                      <motion.div className="shout-reaction-picker" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                        {REACTION_EMOJIS.map((emoji) => (
                          <button key={emoji} type="button" onClick={() => react(message.id, emoji)} aria-label={`React ${emoji}`}>{emoji}</button>
                        ))}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </section>

      <p className="shout-privacy-note">Location suggests a place only. Coordinates are never posted.</p>
    </section>
  );
}

function CampusMap({ placeId, onSelect, onViewPosts, summaries, userPosition }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const maplibreRef = useRef(null);
  const markersRef = useRef(new Map());
  const userMarkerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const selectedPlace =
    SHOUTOUT_PLACES.find((place) => place.id === placeId) ?? SHOUTOUT_PLACES[0];
  const selectedSummary = summaries[placeId];

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    let cancelled = false;
    let map;

    const startMap = async () => {
      try {
        const { default: maplibregl } = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;
        maplibreRef.current = maplibregl;

        const initialPlace =
          SHOUTOUT_PLACES.find((place) => place.id === placeId) ?? SHOUTOUT_PLACES[0];
        map = new maplibregl.Map({
          container: containerRef.current,
          style: CAMPUS_MAP_STYLE,
          center: [initialPlace.longitude, initialPlace.latitude],
          zoom: 15.55,
          minZoom: 10.2,
          maxZoom: 19,
          pitch: 0,
          bearing: 0,
          dragPan: false,
          scrollZoom: false,
          touchZoomRotate: false,
          attributionControl: false,
        });

        map.addControl(
          new maplibregl.NavigationControl({ showCompass: false, showZoom: true }),
          "bottom-right",
        );
        map.addControl(
          new maplibregl.AttributionControl({ compact: true }),
          "bottom-left",
        );

        SHOUTOUT_PLACES.forEach((place) => {
          const markerButton = document.createElement("button");
          markerButton.type = "button";
          markerButton.className = `shout-real-marker ${place.id === placeId ? "selected" : ""}`;
          markerButton.setAttribute("aria-label", `Show messages at ${place.label}`);
          markerButton.setAttribute("aria-pressed", String(place.id === placeId));
          markerButton.innerHTML = `<span aria-hidden="true"><b class="shout-marker-count"></b></span><small>${place.shortLabel}</small>`;
          markerButton.addEventListener("click", () => onSelect(place.id));

          const marker = new maplibregl.Marker({ element: markerButton, anchor: "bottom" })
            .setLngLat([place.longitude, place.latitude])
            .addTo(map);
          markersRef.current.set(place.id, { marker, markerButton, place });
        });

        map.on("load", () => {
          if (cancelled) return;
          setMapReady(true);
          map.resize();
        });
        map.on("error", () => {
          if (!cancelled) setMapError(true);
        });
        mapRef.current = map;
      } catch {
        if (!cancelled) setMapError(true);
      }
    };

    startMap();
    return () => {
      cancelled = true;
      markersRef.current.clear();
      userMarkerRef.current = null;
      maplibreRef.current = null;
      mapRef.current = null;
      map?.remove();
    };
  }, [onSelect]);

  useEffect(() => {
    markersRef.current.forEach(({ markerButton, place }) => {
      const selected = place.id === placeId;
      markerButton.classList.toggle("selected", selected);
      markerButton.setAttribute("aria-pressed", String(selected));
    });

    const selectedPlace = SHOUTOUT_PLACES.find((place) => place.id === placeId);
    if (mapRef.current && selectedPlace) {
      mapRef.current.easeTo({
        center: [selectedPlace.longitude, selectedPlace.latitude],
        zoom: Math.max(mapRef.current.getZoom(), 15.5),
        offset: [0, -28],
        duration: 420,
        essential: true,
      });
    }
  }, [placeId]);

  useEffect(() => {
    markersRef.current.forEach(({ markerButton, place }) => {
      const count = Number(summaries[place.id]?.messageCount ?? 0);
      const countBadge = markerButton.querySelector(".shout-marker-count");
      if (countBadge) countBadge.textContent = count > 99 ? "99+" : count > 0 ? String(count) : "";
      markerButton.classList.toggle("has-messages", count > 0);
      markerButton.setAttribute(
        "aria-label",
        `${place.label}, ${count} recent ${count === 1 ? "post" : "posts"}. Show latest`,
      );
    });
  }, [mapReady, summaries]);

  useEffect(() => {
    const resizeTimer = window.setTimeout(() => mapRef.current?.resize(), 280);
    const previousOverflow = document.body.style.overflow;
    const map = mapRef.current;

    if (expanded) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("shout-map-is-expanded");
      map?.dragPan.enable();
      map?.scrollZoom.enable();
      map?.touchZoomRotate.enable();
    } else {
      document.body.classList.remove("shout-map-is-expanded");
      map?.dragPan.disable();
      map?.scrollZoom.disable();
      map?.touchZoomRotate.disable();
    }

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setExpanded(false);
    };
    if (expanded) window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove("shout-map-is-expanded");
    };
  }, [expanded]);

  useEffect(() => {
    if (!mapRef.current || !maplibreRef.current || !userPosition) return;

    if (!userMarkerRef.current) {
      const dot = document.createElement("span");
      dot.className = "shout-user-location";
      dot.setAttribute("aria-label", "Your approximate location");
      userMarkerRef.current = new maplibreRef.current.Marker({ element: dot })
        .setLngLat(userPosition)
        .addTo(mapRef.current);
    } else {
      userMarkerRef.current.setLngLat(userPosition);
    }
  }, [mapReady, userPosition]);

  const viewPosts = () => {
    if (expanded) {
      setExpanded(false);
      window.setTimeout(onViewPosts, 300);
      return;
    }
    onViewPosts();
  };

  const messageCount = Number(selectedSummary?.messageCount ?? 0);
  const latest = selectedSummary?.latest;

  return (
    <div
      className={`shout-real-map-shell ${expanded ? "expanded" : ""}`}
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded ? "true" : undefined}
      aria-label={expanded ? `Full-size map, ${selectedPlace.label} selected` : undefined}
    >
      <div ref={containerRef} className="shout-real-map" aria-label="Interactive map of Brisbane and UQ St Lucia" />
      <button
        type="button"
        className="shout-map-expand"
        onClick={() => setExpanded((current) => !current)}
        aria-label={expanded ? "Close full-size map" : "Open full-size map"}
      >
        {expanded ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
      </button>
      {mapReady ? (
        <motion.aside
          key={placeId}
          className="shout-map-comment-preview"
          aria-live="polite"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span
            className="shout-map-preview-avatar"
            style={{ backgroundColor: latest?.avatarColor ?? "#78958c" }}
            aria-hidden="true"
          >
            {latest ? AVATAR_FACES[latest.avatarVariant % AVATAR_FACES.length] : "·"}
          </span>
          <span className="shout-map-preview-copy">
            <span className="shout-map-preview-head">
              <strong>{selectedPlace.shortLabel}</strong>
              <small>{messageCount} {messageCount === 1 ? "post" : "posts"}</small>
            </span>
            <p>
              {latest
                ? <>{latest.emoji ? <b>{latest.emoji}</b> : null}{latest.message}</>
                : "No recent posts here."}
            </p>
            <small className="shout-map-preview-meta">
              {latest ? `Anonymous · ${relativeTime(latest.createdAt)}` : "Start the conversation"}
            </small>
          </span>
          <button
            type="button"
            onClick={viewPosts}
            aria-label={messageCount ? `View all ${messageCount} posts` : `Post at ${selectedPlace.label}`}
          >
            <span>{messageCount ? `View all ${messageCount}` : "Post here"}</span>
            <ChevronDown aria-hidden="true" />
          </button>
        </motion.aside>
      ) : null}
      {!mapReady && !mapError ? <span className="shout-map-loading">Loading real map…</span> : null}
      {mapError && !mapReady ? <span className="shout-map-loading error">Map is temporarily unavailable.</span> : null}
    </div>
  );
}

function readStoredPlace() {
  try {
    const saved = window.localStorage.getItem(PLACE_STORAGE_KEY);
    return SHOUTOUT_PLACES.some((place) => place.id === saved)
      ? saved
      : "great-court";
  } catch {
    return "great-court";
  }
}

function relativeTime(value) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function distanceKm(latitude, longitude, targetLatitude, targetLongitude) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(targetLatitude - latitude);
  const longitudeDelta = toRadians(targetLongitude - longitude);
  const startLatitude = toRadians(latitude);
  const endLatitude = toRadians(targetLatitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
