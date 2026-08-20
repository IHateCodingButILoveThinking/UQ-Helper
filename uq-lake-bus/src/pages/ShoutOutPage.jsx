import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Flag,
  LocateFixed,
  MapPin,
  MessageCircle,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import {
  createShoutOut,
  fetchShoutOutSummary,
  fetchShoutOuts,
  reactToShoutOut,
  reportShoutOut,
} from "../lib/shoutout-api";

const POST_EMOJIS = ["", "👋", "☕", "📚", "🎉", "👀"];
const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "👀"];
const AVATAR_FACES = ["•ᴗ•", "•‿•", "•◡•", "^‿^", "•⌣•"];
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const BRISBANE_BOUNDS = {
  west: 152.7,
  south: -27.8,
  east: 153.5,
  north: -27.1,
};
const DEFAULT_CENTER = [153.0133, -27.4971];

export default function ShoutOutPage({ onHome }) {
  const [mapBounds, setMapBounds] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [reactedIds, setReactedIds] = useState(() => new Set());
  const [reportedIds, setReportedIds] = useState(() => new Set());
  const [reactionOpenId, setReactionOpenId] = useState("");
  const messageRequestRef = useRef(0);

  const updateMapBounds = useCallback((nextBounds) => {
    setMapBounds((current) => {
      if (
        current &&
        current.west === nextBounds.west &&
        current.south === nextBounds.south &&
        current.east === nextBounds.east &&
        current.north === nextBounds.north
      ) {
        return current;
      }
      return nextBounds;
    });
  }, []);

  useEffect(() => {
    if (!mapBounds) return undefined;
    const controller = new AbortController();

    const loadMapPosts = async () => {
      try {
        const payload = await fetchShoutOutSummary({
          bounds: mapBounds,
          signal: controller.signal,
        });
        const nextSummaries = payload.summaries ?? [];
        setSummaries(nextSummaries);
        setSelected((current) => {
          if (!current) return current;
          return nextSummaries.find((item) => item.placeId === current.placeId) ?? current;
        });
      } catch (error) {
        if (error.name !== "AbortError") console.error("Could not refresh map posts", error);
      } finally {
        if (!controller.signal.aborted) setMapLoading(false);
      }
    };

    loadMapPosts();
    const intervalId = window.setInterval(loadMapPosts, 30_000);
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [mapBounds]);

  useEffect(() => {
    if (!selected?.placeId) {
      setMessages([]);
      return undefined;
    }

    const requestId = ++messageRequestRef.current;
    const controller = new AbortController();
    setMessagesLoading(true);
    setReactionOpenId("");

    fetchShoutOuts(selected.placeId, { signal: controller.signal })
      .then((payload) => {
        if (requestId === messageRequestRef.current) setMessages(payload.messages ?? []);
      })
      .catch((error) => {
        if (error.name !== "AbortError" && requestId === messageRequestRef.current) {
          setMessages([]);
        }
      })
      .finally(() => {
        if (requestId === messageRequestRef.current) setMessagesLoading(false);
      });

    return () => controller.abort();
  }, [selected?.placeId]);

  const createPost = async ({ location, message, emoji }) => {
    const payload = await createShoutOut({ location, message, emoji });
    const postedMessage = payload.message;
    const postedLocation = postedMessage.location;
    const previous = summaries.find((item) => item.placeId === postedLocation.placeId);
    const nextSummary = {
      ...postedLocation,
      messageCount: Number(previous?.messageCount ?? 0) + 1,
      latest: postedMessage,
    };

    setSummaries((current) => [
      nextSummary,
      ...current.filter((item) => item.placeId !== nextSummary.placeId),
    ]);
    setSelected(nextSummary);
    setMessages((current) =>
      previous?.placeId === nextSummary.placeId ? [postedMessage, ...current] : [postedMessage],
    );
    return payload;
  };

  const react = async (messageId, emoji) => {
    if (reactedIds.has(messageId)) return;
    setReactionOpenId("");
    const payload = await reactToShoutOut(messageId, emoji);
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? { ...message, reactionCount: payload.reactionCount }
          : message,
      ),
    );
    setReactedIds((current) => new Set(current).add(messageId));
  };

  const report = async (messageId) => {
    if (reportedIds.has(messageId)) return;
    await reportShoutOut(messageId);
    setReportedIds((current) => new Set(current).add(messageId));
  };

  return (
    <section className="shout-page" aria-label="Brisbane shout-out map">
      <header className="shout-topbar">
        <button type="button" className="shout-icon-button" onClick={onHome} aria-label="Back to home">
          <ArrowLeft aria-hidden="true" />
        </button>
        <span className="shout-title-mark" aria-hidden="true"><MessageCircle /></span>
        <span className="shout-title-copy"><small>Brisbane</small><h1>Shout Out</h1></span>
        <span className="shout-safe-mark" title="Server-side safety checks" aria-label="Posts are safety checked">
          <ShieldCheck aria-hidden="true" />
        </span>
      </header>

      <ShoutMap
        summaries={summaries}
        selected={selected}
        onSelect={setSelected}
        onClearSelection={() => setSelected(null)}
        onBoundsChange={updateMapBounds}
        onCreate={createPost}
        mapLoading={mapLoading}
        messages={messages}
        messagesLoading={messagesLoading}
        reactionOpenId={reactionOpenId}
        setReactionOpenId={setReactionOpenId}
        reactedIds={reactedIds}
        reportedIds={reportedIds}
        onReact={react}
        onReport={report}
      />

      <p className="shout-privacy-note">
        Only the approximate pin you confirm is public. Posts disappear after 7 days.
      </p>
    </section>
  );
}

function ShoutMap({
  summaries,
  selected,
  onSelect,
  onClearSelection,
  onBoundsChange,
  onCreate,
  mapLoading,
  messages,
  messagesLoading,
  reactionOpenId,
  setReactionOpenId,
  reactedIds,
  reportedIds,
  onReact,
  onReport,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const summariesRef = useRef(summaries);
  const onSelectRef = useRef(onSelect);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const modeRef = useRef("browse");
  const textareaRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mode, setMode] = useState("browse");
  const [pinCoordinate, setPinCoordinate] = useState(DEFAULT_CENTER);
  const [locating, setLocating] = useState(false);
  const [mapNotice, setMapNotice] = useState("");
  const [draft, setDraft] = useState("");
  const [postEmoji, setPostEmoji] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");

  summariesRef.current = summaries;
  onSelectRef.current = onSelect;
  onBoundsChangeRef.current = onBoundsChange;
  modeRef.current = mode;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    let cancelled = false;
    let map;

    const startMap = async () => {
      try {
        const { default: maplibregl } = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;

        map = new maplibregl.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center: DEFAULT_CENTER,
          zoom: 12.7,
          minZoom: 9.8,
          maxZoom: 19,
          maxBounds: [
            [BRISBANE_BOUNDS.west, BRISBANE_BOUNDS.south],
            [BRISBANE_BOUNDS.east, BRISBANE_BOUNDS.north],
          ],
          pitch: 0,
          bearing: 0,
          attributionControl: false,
          powerPreference: "high-performance",
        });

        map.addControl(new maplibregl.AttributionControl({ compact: true }), "top-left");

        const publishBounds = () => {
          const bounds = map.getBounds();
          onBoundsChangeRef.current({
            west: roundMapCoordinate(bounds.getWest()),
            south: roundMapCoordinate(bounds.getSouth()),
            east: roundMapCoordinate(bounds.getEast()),
            north: roundMapCoordinate(bounds.getNorth()),
          });
          if (modeRef.current === "pinning") {
            const center = map.getCenter();
            setPinCoordinate([center.lng, center.lat]);
          }
        };

        map.on("load", () => {
          if (cancelled) return;
          map.addSource("shout-points", {
            type: "geojson",
            data: emptyFeatureCollection(),
            cluster: true,
            clusterMaxZoom: 15,
            clusterRadius: 48,
          });

          map.addLayer({
            id: "shout-clusters",
            type: "circle",
            source: "shout-points",
            filter: ["has", "point_count"],
            paint: {
              "circle-color": "#16755d",
              "circle-radius": ["step", ["get", "point_count"], 19, 10, 23, 30, 27],
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 3,
              "circle-opacity": 0.94,
            },
          });
          map.addLayer({
            id: "shout-cluster-count",
            type: "symbol",
            source: "shout-points",
            filter: ["has", "point_count"],
            layout: {
              "text-font": ["Noto Sans Regular"],
              "text-field": ["get", "point_count_abbreviated"],
              "text-size": 12,
            },
            paint: { "text-color": "#ffffff" },
          });
          map.addLayer({
            id: "shout-post-points",
            type: "circle",
            source: "shout-points",
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-color": ["case", ["==", ["get", "selected"], 1], "#0b7057", "#ffffff"],
              "circle-radius": ["case", ["==", ["get", "selected"], 1], 12, 10],
              "circle-stroke-color": "#16755d",
              "circle-stroke-width": 3,
              "circle-translate": [0, 0],
            },
          });
          map.addLayer({
            id: "shout-post-count",
            type: "symbol",
            source: "shout-points",
            filter: ["!", ["has", "point_count"]],
            layout: {
              "text-font": ["Noto Sans Regular"],
              "text-field": ["to-string", ["get", "messageCount"]],
              "text-size": 10,
            },
            paint: {
              "text-color": ["case", ["==", ["get", "selected"], 1], "#ffffff", "#12674f"],
            },
          });
          map.addLayer({
            id: "shout-post-labels",
            type: "symbol",
            source: "shout-points",
            minzoom: 14.2,
            filter: ["!", ["has", "point_count"]],
            layout: {
              "text-font": ["Noto Sans Regular"],
              "text-field": ["get", "label"],
              "text-size": 11,
              "text-offset": [0, 1.8],
              "text-anchor": "top",
              "text-max-width": 9,
            },
            paint: {
              "text-color": "#26463d",
              "text-halo-color": "#ffffff",
              "text-halo-width": 1.5,
            },
          });

          map.on("click", "shout-clusters", async (event) => {
            if (modeRef.current !== "browse") return;
            const feature = event.features?.[0];
            const source = map.getSource("shout-points");
            if (!feature || !source) return;
            const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id);
            map.easeTo({ center: feature.geometry.coordinates, zoom, duration: 360 });
          });
          map.on("click", "shout-post-points", (event) => {
            if (modeRef.current !== "browse") return;
            const placeId = event.features?.[0]?.properties?.placeId;
            const summary = summariesRef.current.find((item) => item.placeId === placeId);
            if (!summary) return;
            setMode("browse");
            onSelectRef.current(summary);
          });
          ["shout-clusters", "shout-post-points"].forEach((layerId) => {
            map.on("mouseenter", layerId, () => { map.getCanvas().style.cursor = "pointer"; });
            map.on("mouseleave", layerId, () => { map.getCanvas().style.cursor = ""; });
          });

          setMapReady(true);
          publishBounds();
          map.resize();
        });
        map.on("moveend", publishBounds);
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
      mapRef.current = null;
      map?.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    const source = mapRef.current?.getSource("shout-points");
    if (!source) return;
    source.setData({
      type: "FeatureCollection",
      features: summaries
        .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
        .map((item) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [item.longitude, item.latitude] },
          properties: {
            placeId: item.placeId,
            label: item.kind === "pin" ? "Near this point" : item.label,
            messageCount: Number(item.messageCount ?? 0),
            selected: item.placeId === selected?.placeId ? 1 : 0,
          },
        })),
    });
  }, [mapReady, selected?.placeId, summaries]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const visibility = mode === "pinning" || mode === "composing" ? "none" : "visible";
    ["shout-clusters", "shout-cluster-count", "shout-post-points", "shout-post-count", "shout-post-labels"].forEach((layerId) => {
      if (mapRef.current.getLayer(layerId)) {
        mapRef.current.setLayoutProperty(layerId, "visibility", visibility);
      }
    });
  }, [mapReady, mode]);

  useEffect(() => {
    const closePanel = (event) => {
      if (event.key !== "Escape" || mode === "browse") return;
      setMode("browse");
      setPostError("");
    };
    window.addEventListener("keydown", closePanel);
    return () => window.removeEventListener("keydown", closePanel);
  }, [mode]);

  useEffect(() => {
    if (mode === "composing") window.setTimeout(() => textareaRef.current?.focus(), 180);
  }, [mode]);

  useEffect(() => {
    if (!mapNotice) return undefined;
    const timerId = window.setTimeout(() => setMapNotice(""), 3600);
    return () => window.clearTimeout(timerId);
  }, [mapNotice]);

  const locateUser = (forPosting = false) => {
    if (!navigator.geolocation) {
      setMapNotice("Move the map to choose a spot");
      return;
    }
    setLocating(true);
    setMapNotice(forPosting ? "Finding you…" : "Finding your area…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const insideBrisbane =
          coords.latitude >= BRISBANE_BOUNDS.south &&
          coords.latitude <= BRISBANE_BOUNDS.north &&
          coords.longitude >= BRISBANE_BOUNDS.west &&
          coords.longitude <= BRISBANE_BOUNDS.east;
        if (!insideBrisbane) {
          setMapNotice("Posting is available in Brisbane");
          setLocating(false);
          return;
        }
        mapRef.current?.easeTo({
          center: [coords.longitude, coords.latitude],
          zoom: Math.max(mapRef.current.getZoom(), 15),
          duration: 520,
          essential: true,
        });
        setPinCoordinate([coords.longitude, coords.latitude]);
        setMapNotice(forPosting ? "Move the map if needed" : "You’re near the centre pin");
        setLocating(false);
      },
      () => {
        setMapNotice(forPosting ? "Move the map to choose a spot" : "Location was not shared");
        setLocating(false);
      },
      { enableHighAccuracy: false, maximumAge: 120_000, timeout: 7000 },
    );
  };

  const startPost = () => {
    const center = mapRef.current?.getCenter();
    if (center) setPinCoordinate([center.lng, center.lat]);
    onClearSelection();
    setMode("pinning");
    setPostError("");
    locateUser(true);
  };

  const submitPost = async (event) => {
    event.preventDefault();
    if (!draft.trim() || posting) return;
    setPosting(true);
    setPostError("");
    try {
      await onCreate({
        location: { latitude: pinCoordinate[1], longitude: pinCoordinate[0] },
        message: draft,
        emoji: postEmoji,
      });
      setDraft("");
      setPostEmoji("");
      setMode("browse");
      setMapNotice("Posted for 7 days");
    } catch (error) {
      setPostError(error.message || "Could not post right now.");
    } finally {
      setPosting(false);
    }
  };

  const selectedLabel = selected?.kind === "pin" ? "Near this point" : selected?.label;

  return (
    <section className={`shout-map-stage mode-${mode}`} aria-label="Interactive Brisbane message map">
      <div ref={containerRef} className="shout-real-map" aria-label="Moveable map of Brisbane" />

      <div className="shout-map-toolbar">
        <span><MapPin aria-hidden="true" />Brisbane</span>
        <span>
          <button type="button" onClick={() => locateUser(false)} disabled={locating} aria-label="Find my area">
            <LocateFixed aria-hidden="true" />
          </button>
          <button type="button" className="primary" onClick={startPost}>
            <Plus aria-hidden="true" />Post
          </button>
        </span>
      </div>

      {mode === "browse" ? (
        <div className="shout-visually-hidden" aria-label="Posts visible on the map">
          {summaries.map((summary) => (
            <button key={summary.placeId} type="button" onClick={() => onSelect(summary)}>
              {summary.kind === "pin" ? "Post near a pinned point" : summary.label}, {summary.messageCount} posts
            </button>
          ))}
        </div>
      ) : null}

      {mapNotice ? (
        <AnimatePresence mode="wait">
          <motion.p
            key={mapNotice}
            className="shout-map-toast"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {mapNotice}
          </motion.p>
        </AnimatePresence>
      ) : null}

      {mode === "pinning" ? (
        <>
          <span className="shout-center-pin" aria-hidden="true"><MapPin /></span>
          <motion.div className="shout-pin-bar" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <span><strong>Choose a spot</strong><small>Move the map under the pin</small></span>
            <button type="button" className="ghost" onClick={() => setMode("browse")}>Cancel</button>
            <button type="button" className="primary" onClick={() => setMode("composing")}>Post here</button>
          </motion.div>
        </>
      ) : null}

      <AnimatePresence mode="wait">
        {mode === "composing" ? (
          <motion.form
            className="shout-map-sheet shout-compose-sheet"
            onSubmit={submitPost}
            role="dialog"
            aria-label="Create a post at the selected pin"
            initial={{ y: 36, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 22, opacity: 0 }}
          >
            <header>
              <span><MapPin aria-hidden="true" /><strong>Post near this pin</strong></span>
              <button type="button" onClick={() => setMode("pinning")} aria-label="Move the pin"><X aria-hidden="true" /></button>
            </header>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={160}
              rows={3}
              placeholder="What’s happening here?"
              aria-label="Shout-out message"
            />
            <div className="shout-compose-row">
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
              <button type="submit" className="shout-send-button" disabled={!draft.trim() || posting}>
                <Send aria-hidden="true" />{posting ? "Posting" : "Post"}
              </button>
            </div>
            <p className="shout-safety-note"><ShieldCheck aria-hidden="true" />Links, contact details and unsafe posts are blocked.</p>
            {postError ? <p className="shout-post-error" role="alert">{postError}</p> : null}
          </motion.form>
        ) : null}

        {mode === "browse" && selected?.latest ? (
          <motion.aside
            key={selected.placeId}
            className="shout-map-sheet shout-preview-sheet"
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 18, opacity: 0 }}
            aria-label={`Latest post ${selectedLabel}`}
          >
            <span className="shout-preview-avatar" style={{ backgroundColor: selected.latest.avatarColor }} aria-hidden="true">
              {AVATAR_FACES[selected.latest.avatarVariant % AVATAR_FACES.length]}
            </span>
            <span className="shout-preview-copy">
              <span><strong>{selectedLabel}</strong><small>{selected.messageCount} {selected.messageCount === 1 ? "post" : "posts"}</small></span>
              <p>{selected.latest.emoji ? <b>{selected.latest.emoji}</b> : null}{selected.latest.message}</p>
              <small>Anonymous · {relativeTime(selected.latest.createdAt)}</small>
            </span>
            <button type="button" className="shout-view-button" onClick={() => setMode("viewing")}>
              View <ChevronUp aria-hidden="true" />
            </button>
            <button type="button" className="shout-sheet-close" onClick={onClearSelection} aria-label="Close post preview">
              <X aria-hidden="true" />
            </button>
          </motion.aside>
        ) : null}

        {mode === "viewing" && selected ? (
          <motion.section
            className="shout-map-sheet shout-thread-sheet"
            role="dialog"
            aria-label={`Posts ${selectedLabel}`}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
          >
            <header>
              <span><strong>{selectedLabel}</strong><small>{selected.messageCount} recent</small></span>
              <button type="button" onClick={() => setMode("browse")} aria-label="Collapse posts"><ChevronDown aria-hidden="true" /></button>
            </header>
            <div className="shout-thread-list">
              {messagesLoading ? (
                <div className="shout-thread-loading"><span /><span /><span /></div>
              ) : messages.length === 0 ? (
                <div className="shout-thread-empty"><Sparkles aria-hidden="true" />No recent posts</div>
              ) : messages.map((message) => (
                <article className="shout-message" key={message.id}>
                  <span className="shout-avatar" style={{ backgroundColor: message.avatarColor }} aria-hidden="true">
                    {AVATAR_FACES[message.avatarVariant % AVATAR_FACES.length]}
                  </span>
                  <div className="shout-message-body">
                    <div className="shout-message-meta"><strong>Anonymous</strong><span>{relativeTime(message.createdAt)}</span></div>
                    <p>{message.emoji ? <b>{message.emoji}</b> : null}{message.message}</p>
                    <div className="shout-message-actions">
                      <button
                        type="button"
                        className={reactedIds.has(message.id) ? "reacted" : ""}
                        onClick={() => setReactionOpenId((current) => current === message.id ? "" : message.id)}
                      >
                        ♡ {message.reactionCount || "React"}
                      </button>
                      <button
                        type="button"
                        className={reportedIds.has(message.id) ? "reported" : ""}
                        onClick={() => onReport(message.id)}
                      >
                        <Flag aria-hidden="true" />{reportedIds.has(message.id) ? "Reported" : "Report"}
                      </button>
                    </div>
                    {reactionOpenId === message.id && !reactedIds.has(message.id) ? (
                      <div className="shout-reaction-picker">
                        {REACTION_EMOJIS.map((emoji) => (
                          <button key={emoji} type="button" onClick={() => onReact(message.id, emoji)}>{emoji}</button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {!mapReady && !mapError ? <span className="shout-map-loading">Loading map…</span> : null}
      {mapError && !mapReady ? <span className="shout-map-loading error">Map unavailable</span> : null}
      {mapReady && mapLoading ? <span className="shout-map-sync" aria-label="Loading nearby posts" /> : null}
    </section>
  );
}

function emptyFeatureCollection() {
  return { type: "FeatureCollection", features: [] };
}

function roundMapCoordinate(value) {
  return Math.round(value * 10_000) / 10_000;
}

function relativeTime(value) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
