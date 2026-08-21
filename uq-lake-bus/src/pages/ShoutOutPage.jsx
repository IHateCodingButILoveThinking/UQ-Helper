import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  ChevronUp,
  Clock3,
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
  fetchShoutOutNotifications,
  fetchShoutOutSummary,
  fetchShoutOuts,
  markShoutOutNotificationsRead,
  reactToShoutOut,
  replyToShoutOut,
  reportShoutOut,
} from "../lib/shoutout-api";

const POST_EMOJIS = ["", "👋", "☕", "📚", "🎉", "👀"];
const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "👀"];
const AVATAR_FACES = ["•ᴗ•", "•‿•", "•◡•", "^‿^", "•⌣•"];
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const ASIA_PACIFIC_BOUNDS = {
  west: 25,
  south: -45,
  east: 180,
  north: 82,
};
const DEFAULT_CENTER = [153.0133, -27.4971];
const MAX_POST_DISTANCE_KM = 1;
const RECENT_ACTIVITY_MS = 30 * 60 * 1000;

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
  const [notifications, setNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
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

  useEffect(() => {
    const controller = new AbortController();
    const loadNotifications = () => {
      fetchShoutOutNotifications({ signal: controller.signal })
        .then((payload) => {
          setNotifications(payload.notifications ?? []);
          setUnreadCount(Number(payload.unreadCount ?? 0));
        })
        .catch((error) => {
          if (error.name !== "AbortError") console.error("Could not load notifications", error);
        });
    };
    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 30_000);
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, []);

  const createPost = async ({ location, currentLocation, message, emoji }) => {
    const payload = await createShoutOut({
      location,
      currentLocation,
      message,
      emoji,
    });
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

  const reply = async (messageId, message, emoji = "") => {
    const payload = await replyToShoutOut(messageId, message, emoji);
    setMessages((current) => [
      ...current.map((item) =>
        item.id === messageId
          ? { ...item, replyCount: Number(item.replyCount ?? 0) + 1 }
          : item,
      ),
      payload.message,
    ]);
    return payload;
  };

  const toggleNotifications = async () => {
    const nextOpen = !notificationOpen;
    setNotificationOpen(nextOpen);
    if (nextOpen && unreadCount) {
      setUnreadCount(0);
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      try {
        await markShoutOutNotificationsRead();
      } catch (error) {
        console.error("Could not mark notifications read", error);
      }
    }
  };

  return (
    <section className="shout-page" aria-label="Shout Out map">
      <header className="shout-topbar">
        <button type="button" className="shout-icon-button" onClick={onHome} aria-label="Back to home">
          <ArrowLeft aria-hidden="true" />
        </button>
        <span className="shout-title-copy"><h1>Shout Out</h1></span>
        <span className="shout-top-actions">
          <button
            type="button"
            className="shout-notification-button"
            aria-label={`${unreadCount} unread notifications`}
            aria-expanded={notificationOpen}
            onClick={toggleNotifications}
          >
            <Bell aria-hidden="true" />
            {unreadCount ? <i>{Math.min(unreadCount, 9)}{unreadCount > 9 ? "+" : ""}</i> : null}
          </button>
          <span className="shout-safe-mark" title="Server-side safety checks" aria-label="Posts are safety checked">
            <ShieldCheck aria-hidden="true" />
          </span>
        </span>
      </header>

      <AnimatePresence>
        {notificationOpen ? (
          <motion.aside
            className="shout-notification-panel"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            <strong>Activity</strong>
            {notifications.length ? notifications.slice(0, 6).map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  setNotificationOpen(false);
                  const summary = summaries.find((entry) => entry.placeId === item.placeId);
                  if (summary) setSelected(summary);
                }}
              >
                <span>{item.type === "reply" ? <MessageCircle /> : "♥"}</span>
                <span>
                  <strong>{item.type === "reply" ? "New reply" : "New reaction"}</strong>
                  <small>{item.placeLabel} · {relativeTime(item.createdAt)}</small>
                </span>
              </button>
            )) : <small>No new activity yet</small>}
          </motion.aside>
        ) : null}
      </AnimatePresence>

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
        onReply={reply}
        onReport={report}
      />

      <p className="shout-privacy-note">
        Asia + Australia · Post within 1 km of you · Pins disappear after 7 days.
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
  onReply,
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
  const [mapAttempt, setMapAttempt] = useState(0);
  const [mode, setMode] = useState("browse");
  const [pinCoordinate, setPinCoordinate] = useState(DEFAULT_CENTER);
  const [userCoordinate, setUserCoordinate] = useState(null);
  const [userLocatedAt, setUserLocatedAt] = useState(0);
  const [pinPlaceName, setPinPlaceName] = useState("");
  const [resolvedPinLabels, setResolvedPinLabels] = useState({});
  const [locating, setLocating] = useState(false);
  const [mapNotice, setMapNotice] = useState("");
  const [draft, setDraft] = useState("");
  const [postEmoji, setPostEmoji] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [replyToId, setReplyToId] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [replyError, setReplyError] = useState("");
  const [replying, setReplying] = useState(false);

  summariesRef.current = summaries;
  onSelectRef.current = onSelect;
  onBoundsChangeRef.current = onBoundsChange;
  modeRef.current = mode;

  const resolvePinLabelAt = useCallback((coordinate) => {
    const map = mapRef.current;
    if (!map || !coordinate?.length) return "";

    try {
      const point = map.project(coordinate);
      const features = map.queryRenderedFeatures([
        [point.x - 42, point.y - 42],
        [point.x + 42, point.y + 42],
      ]);
      return pickReadableMapLabel(features);
    } catch {
      return "";
    }
  }, []);

  const updateCurrentPinLabel = useCallback((coordinate) => {
    setPinPlaceName(resolvePinLabelAt(coordinate));
  }, [resolvePinLabelAt]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    let cancelled = false;
    let map;
    let pulseAnimationFrame;

    const startMap = async () => {
      try {
        const { default: maplibregl } = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;

        map = new maplibregl.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center: DEFAULT_CENTER,
          zoom: 12.7,
          minZoom: 3.4,
          maxZoom: 19,
          maxBounds: [
            [ASIA_PACIFIC_BOUNDS.west, ASIA_PACIFIC_BOUNDS.south],
            [ASIA_PACIFIC_BOUNDS.east, ASIA_PACIFIC_BOUNDS.north],
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
            const coordinate = [center.lng, center.lat];
            setPinCoordinate(coordinate);
            updateCurrentPinLabel(coordinate);
            map.once("idle", () => {
              if (modeRef.current === "pinning") updateCurrentPinLabel(coordinate);
            });
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
          map.addSource("shout-newest-point", {
            type: "geojson",
            data: emptyFeatureCollection(),
          });
          map.addSource("shout-post-range", {
            type: "geojson",
            data: emptyFeatureCollection(),
          });
          map.addSource("shout-user-point", {
            type: "geojson",
            data: emptyFeatureCollection(),
          });

          map.addLayer({
            id: "shout-user-accuracy",
            type: "circle",
            source: "shout-user-point",
            paint: {
              "circle-color": "#438fe3",
              "circle-radius": 16,
              "circle-opacity": 0.13,
            },
          });
          map.addLayer({
            id: "shout-user-dot",
            type: "circle",
            source: "shout-user-point",
            paint: {
              "circle-color": "#247bd1",
              "circle-radius": 7,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 3,
            },
          });

          map.addLayer({
            id: "shout-post-range-fill",
            type: "fill",
            source: "shout-post-range",
            layout: { visibility: "none" },
            paint: {
              "fill-color": "#1a8b6d",
              "fill-opacity": 0.1,
            },
          });
          map.addLayer({
            id: "shout-post-range-line",
            type: "line",
            source: "shout-post-range",
            layout: { visibility: "none" },
            paint: {
              "line-color": "#16836b",
              "line-width": 2,
              "line-dasharray": [2, 2],
              "line-opacity": 0.72,
            },
          });

          map.addLayer({
            id: "shout-newest-pulse",
            type: "circle",
            source: "shout-newest-point",
            paint: {
              "circle-color": "#ef6f52",
              "circle-radius": 18,
              "circle-opacity": 0.28,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 1,
              "circle-stroke-opacity": 0.5,
            },
          });

          map.addLayer({
            id: "shout-clusters",
            type: "circle",
            source: "shout-points",
            filter: ["has", "point_count"],
            paint: {
              "circle-color": "#6657c7",
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
              "circle-color": [
                "case",
                ["==", ["get", "selected"], 1], "#5744be",
                ["==", ["get", "recent"], 1], "#ef6f52",
                "#ffffff",
              ],
              "circle-radius": ["case", ["==", ["get", "selected"], 1], 12, 10],
              "circle-stroke-color": [
                "case",
                ["==", ["get", "recent"], 1], "#ffffff",
                "#6657c7",
              ],
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
              "text-color": [
                "case",
                ["==", ["get", "selected"], 1], "#ffffff",
                ["==", ["get", "recent"], 1], "#ffffff",
                "#5744be",
              ],
            },
          });

          const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          if (!reduceMotion) {
            const animateNewest = (timestamp) => {
              if (cancelled || !map.getLayer("shout-newest-pulse")) return;
              const phase = (Math.sin(timestamp / 520) + 1) / 2;
              map.setPaintProperty("shout-newest-pulse", "circle-radius", 15 + phase * 10);
              map.setPaintProperty("shout-newest-pulse", "circle-opacity", 0.36 - phase * 0.22);
              pulseAnimationFrame = window.requestAnimationFrame(animateNewest);
            };
            pulseAnimationFrame = window.requestAnimationFrame(animateNewest);
          }
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
          map.on("click", (event) => {
            if (modeRef.current !== "pinning") return;
            const coordinate = [event.lngLat.lng, event.lngLat.lat];
            setPinCoordinate(coordinate);
            updateCurrentPinLabel(coordinate);
            map.easeTo({ center: coordinate, duration: 260, essential: true });
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
      if (pulseAnimationFrame) window.cancelAnimationFrame(pulseAnimationFrame);
      mapRef.current = null;
      map?.remove();
    };
  }, [mapAttempt, updateCurrentPinLabel]);

  useEffect(() => {
    if (!mapReady) return;
    const source = mapRef.current?.getSource("shout-points");
    const newestSource = mapRef.current?.getSource("shout-newest-point");
    if (!source) return;
    const discoveredLabels = {};
    const newestSummary = findNewestSummary(summaries);
    const newestIsRecent = isRecentPost(newestSummary?.latest?.createdAt);
    source.setData({
      type: "FeatureCollection",
      features: summaries
        .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
        .map((item) => {
          const coordinate = [item.longitude, item.latitude];
          if (item.kind === "pin" && !resolvedPinLabels[item.placeId]) {
            const resolved = resolvePinLabelAt(coordinate);
            if (resolved) discoveredLabels[item.placeId] = resolved;
          }

          return {
            type: "Feature",
            geometry: { type: "Point", coordinates: coordinate },
            properties: {
              placeId: item.placeId,
              label: displayLocationLabel(item, { ...resolvedPinLabels, ...discoveredLabels }, { includeCoordinate: false }),
              messageCount: Number(item.messageCount ?? 0),
              selected: item.placeId === selected?.placeId ? 1 : 0,
              recent:
                newestIsRecent && item.placeId === newestSummary?.placeId ? 1 : 0,
            },
          };
        }),
    });
    newestSource?.setData(
      newestIsRecent &&
      newestSummary &&
      Number.isFinite(newestSummary.latitude) &&
      Number.isFinite(newestSummary.longitude)
        ? {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [newestSummary.longitude, newestSummary.latitude],
                },
                properties: { placeId: newestSummary.placeId },
              },
            ],
          }
        : emptyFeatureCollection(),
    );
    if (Object.keys(discoveredLabels).length) {
      setResolvedPinLabels((current) => ({ ...current, ...discoveredLabels }));
    }
  }, [mapReady, resolvedPinLabels, resolvePinLabelAt, selected?.placeId, summaries]);

  useEffect(() => {
    if (!mapReady) return;
    const rangeSource = mapRef.current?.getSource("shout-post-range");
    if (!rangeSource) return;
    rangeSource.setData(
      userCoordinate
        ? createRadiusFeature(userCoordinate, MAX_POST_DISTANCE_KM)
        : emptyFeatureCollection(),
    );
  }, [mapReady, userCoordinate]);

  useEffect(() => {
    if (!mapReady) return;
    const userSource = mapRef.current?.getSource("shout-user-point");
    if (!userSource) return;
    userSource.setData(
      userCoordinate
        ? {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: { type: "Point", coordinates: userCoordinate },
                properties: {},
              },
            ],
          }
        : emptyFeatureCollection(),
    );
  }, [mapReady, userCoordinate]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const visibility = mode === "pinning" || mode === "composing" ? "none" : "visible";
    [
      "shout-clusters",
      "shout-cluster-count",
      "shout-post-points",
      "shout-post-count",
      "shout-post-labels",
      "shout-newest-pulse",
    ].forEach((layerId) => {
      if (mapRef.current.getLayer(layerId)) {
        mapRef.current.setLayoutProperty(layerId, "visibility", visibility);
      }
    });
    const rangeVisibility = mode === "pinning" || mode === "composing" ? "visible" : "none";
    ["shout-post-range-fill", "shout-post-range-line"].forEach((layerId) => {
      if (mapRef.current.getLayer(layerId)) {
        mapRef.current.setLayoutProperty(layerId, "visibility", rangeVisibility);
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
    if (!mapReady || !mapRef.current) {
      setMapNotice("Map is still loading. Try again in a moment.");
      return;
    }
    if (!navigator.geolocation) {
      setMapNotice(
        forPosting
          ? "Current location is required to post"
          : "Current location is unavailable",
      );
      return;
    }
    setLocating(true);
    setMapNotice(forPosting ? "Finding you…" : "Finding your area…");

    const handleLocation = ({ coords }, canRetryForAccuracy = true) => {
        const insideAsiaPacific =
          coords.latitude >= ASIA_PACIFIC_BOUNDS.south &&
          coords.latitude <= ASIA_PACIFIC_BOUNDS.north &&
          coords.longitude >= ASIA_PACIFIC_BOUNDS.west &&
          coords.longitude <= ASIA_PACIFIC_BOUNDS.east;
        if (!insideAsiaPacific) {
          setMapNotice("Your location appears outside the supported Asia–Pacific map.");
          setLocating(false);
          return;
        }
        if (forPosting && Number(coords.accuracy) > 1000) {
          if (canRetryForAccuracy) {
            setMapNotice("Improving location accuracy…");
            navigator.geolocation.getCurrentPosition(
              (position) => handleLocation(position, false),
              handleLocationError,
              { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 },
            );
            return;
          }
          setMapNotice("Location is not accurate enough. Move near a window and try again.");
          setLocating(false);
          return;
        }
        const nextCoordinate = [coords.longitude, coords.latitude];
        setUserCoordinate(nextCoordinate);
        setUserLocatedAt(Date.now());
        setPinCoordinate(nextCoordinate);
        updateCurrentPinLabel(nextCoordinate);
        mapRef.current?.easeTo({
          center: nextCoordinate,
          zoom: Math.max(mapRef.current.getZoom(), 15),
          duration: 520,
          essential: true,
        });
        if (forPosting) setMode("pinning");
        setMapNotice(
          forPosting
            ? "Tap a spot or move the map inside the 1 km circle"
            : `Location found${Number.isFinite(coords.accuracy) ? ` · about ${Math.round(coords.accuracy)} m accuracy` : ""}`,
        );
        setLocating(false);
    };

    const handleLocationError = (error) => {
        const message = error?.code === 1
          ? "Location is blocked. Allow Location for this site in your browser settings."
          : error?.code === 2
            ? "Your phone could not find a location. Check Location Services and try again."
            : "Location took too long. Move to an open area and try again.";
        setMapNotice(message);
        setLocating(false);
    };

    navigator.geolocation.getCurrentPosition(
      (position) => handleLocation(position, true),
      handleLocationError,
      { enableHighAccuracy: false, maximumAge: 120_000, timeout: 12000 },
    );
  };

  const startPost = () => {
    onClearSelection();
    setPostError("");
    if (userCoordinate && Date.now() - userLocatedAt < 120_000) {
      setPinCoordinate(userCoordinate);
      updateCurrentPinLabel(userCoordinate);
      setMode("pinning");
      mapRef.current?.easeTo({
        center: userCoordinate,
        zoom: Math.max(mapRef.current.getZoom(), 15),
        duration: 420,
        essential: true,
      });
      setMapNotice("Tap a spot or move the map inside the 1 km circle");
      return;
    }
    setMapNotice("Allow Location once to choose a nearby public pin");
    locateUser(true);
  };

  const retryMap = () => {
    setMapError(false);
    setMapReady(false);
    setMapAttempt((current) => current + 1);
  };

  const submitPost = async (event) => {
    event.preventDefault();
    const pinDistance = distanceBetweenCoordinates(userCoordinate, pinCoordinate);
    if (
      !draft.trim() ||
      posting ||
      !userCoordinate ||
      !Number.isFinite(pinDistance) ||
      pinDistance > MAX_POST_DISTANCE_KM
    ) return;
    setPosting(true);
    setPostError("");
    try {
      await onCreate({
        location: { latitude: pinCoordinate[1], longitude: pinCoordinate[0] },
        currentLocation: {
          latitude: userCoordinate[1],
          longitude: userCoordinate[0],
        },
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

  const pinLabel =
    pinPlaceName ||
    formatCoordinateLabel({ latitude: pinCoordinate[1], longitude: pinCoordinate[0] });
  const selectedLabel = displayLocationLabel(selected, resolvedPinLabels);
  const pinDistanceKm = distanceBetweenCoordinates(userCoordinate, pinCoordinate);
  const pinWithinRange =
    Number.isFinite(pinDistanceKm) && pinDistanceKm <= MAX_POST_DISTANCE_KM;
  const newestSummary = findNewestSummary(summaries);
  const newestIsRecent = isRecentPost(newestSummary?.latest?.createdAt);
  const rootMessages = messages.filter((message) => !message.parentId);

  const submitReply = async (event, messageId) => {
    event.preventDefault();
    if (!replyDraft.trim() || replying) return;
    setReplying(true);
    setReplyError("");
    try {
      await onReply(messageId, replyDraft.trim());
      setReplyDraft("");
      setReplyToId("");
    } catch (error) {
      setReplyError(error.message || "Could not send this reply.");
    } finally {
      setReplying(false);
    }
  };

  const focusSummary = (summary) => {
    if (
      !summary ||
      !Number.isFinite(summary.latitude) ||
      !Number.isFinite(summary.longitude)
    ) return;
    setMode("browse");
    onSelect(summary);
    mapRef.current?.easeTo({
      center: [summary.longitude, summary.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 14),
      duration: 420,
    });
  };

  return (
    <section className={`shout-map-stage mode-${mode}`} aria-label="Interactive Asia–Pacific message map">
      <div ref={containerRef} className="shout-real-map" aria-label="Moveable map of Asia and Australia" />

      <div className="shout-map-toolbar">
        <span>
          <button type="button" onClick={() => locateUser(false)} disabled={locating || !mapReady} aria-label="Find my current location">
            <LocateFixed className={locating ? "locating" : ""} aria-hidden="true" />
            <span>{locating ? "Finding" : "Locate"}</span>
          </button>
          <button type="button" className="primary" onClick={startPost} disabled={locating}>
            <Plus aria-hidden="true" />Post
          </button>
        </span>
      </div>

      {mode === "browse" && newestSummary?.latest ? (
        <button
          type="button"
          className={`shout-latest-activity ${newestIsRecent ? "recent" : ""}`}
          onClick={() => focusSummary(newestSummary)}
          aria-label={`Show latest visible post from ${displayLocationLabel(
            newestSummary,
            resolvedPinLabels,
            { includeCoordinate: false },
          )}`}
        >
          <i aria-hidden="true" />
          <span>
            <strong>{newestIsRecent ? "New nearby" : "Latest nearby"}</strong>
            <small>{relativeTime(newestSummary.latest.createdAt)}</small>
          </span>
        </button>
      ) : null}

      {mode === "browse" ? (
        <div className="shout-visually-hidden" aria-label="Posts visible on the map">
          {summaries.map((summary) => (
            <button key={summary.placeId} type="button" onClick={() => onSelect(summary)}>
              {displayLocationLabel(summary, resolvedPinLabels)}, {summary.messageCount} posts
              {summary.placeId === newestSummary?.placeId ? ", latest visible post" : ""}
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
            <span>
              <strong>{pinLabel}</strong>
              <small className={pinWithinRange ? "inside" : "outside"}>
                {pinWithinRange
                  ? `${formatDistanceMetres(pinDistanceKm)} from you · tap or move map`
                  : `${formatDistanceMetres(pinDistanceKm)} from you · move inside the circle`}
              </small>
            </span>
            <button type="button" className="ghost" onClick={() => setMode("browse")}>Cancel</button>
            <button
              type="button"
              className="primary"
              onClick={() => setMode("composing")}
              disabled={!pinWithinRange}
            >
              {pinWithinRange ? "Post here" : "Outside 1 km"}
            </button>
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
              <span><MapPin aria-hidden="true" /><strong>{pinLabel}</strong></span>
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
              <button
                type="submit"
                className="shout-send-button"
                disabled={!draft.trim() || posting || !pinWithinRange}
              >
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
              <span className="shout-preview-meta">
                <strong>Anonymous</strong>
                <small><Clock3 aria-hidden="true" />{formatPostTime(selected.latest.createdAt)}</small>
              </span>
              <p>{selected.latest.emoji ? <b>{selected.latest.emoji}</b> : null}{selected.latest.message}</p>
              <small className="shout-preview-location">
                <MapPin aria-hidden="true" />{selectedLabel}
              </small>
            </span>
            <button type="button" className="shout-view-button" onClick={() => setMode("viewing")}>
              <span>{selected.messageCount}</span>View all <ChevronUp aria-hidden="true" />
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
              ) : rootMessages.map((message) => (
                <ShoutMessageThread
                  key={message.id}
                  message={message}
                  replies={messages.filter((item) => item.parentId === message.id)}
                  reactedIds={reactedIds}
                  reportedIds={reportedIds}
                  reactionOpenId={reactionOpenId}
                  setReactionOpenId={setReactionOpenId}
                  onReact={onReact}
                  onReport={onReport}
                  replyOpen={replyToId === message.id}
                  replyDraft={replyDraft}
                  replyError={replyToId === message.id ? replyError : ""}
                  replying={replying}
                  onReplyToggle={() => {
                    setReplyToId((current) => current === message.id ? "" : message.id);
                    setReplyDraft("");
                    setReplyError("");
                  }}
                  onReplyDraftChange={setReplyDraft}
                  onReplySubmit={(event) => submitReply(event, message.id)}
                />
              ))}
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {!mapReady && !mapError ? <span className="shout-map-loading">Loading map…</span> : null}
      {mapError && !mapReady ? (
        <span className="shout-map-loading error" role="alert">
          <strong>Map couldn’t load</strong>
          <small>Check your connection and try again.</small>
          <button type="button" onClick={retryMap}>Retry map</button>
        </span>
      ) : null}
      {mapReady && mapLoading ? <span className="shout-map-sync" aria-label="Loading nearby posts" /> : null}
    </section>
  );
}

function ShoutMessageThread({
  message,
  replies,
  reactedIds,
  reportedIds,
  reactionOpenId,
  setReactionOpenId,
  onReact,
  onReport,
  replyOpen,
  replyDraft,
  replyError,
  replying,
  onReplyToggle,
  onReplyDraftChange,
  onReplySubmit,
}) {
  const renderMessage = (item, nested = false) => (
    <article className={`shout-message ${nested ? "reply" : ""}`} key={item.id}>
      <span className="shout-avatar" style={{ backgroundColor: item.avatarColor }} aria-hidden="true">
        {AVATAR_FACES[item.avatarVariant % AVATAR_FACES.length]}
      </span>
      <div className="shout-message-body">
        <div className="shout-message-meta">
          <strong>{nested ? "Anonymous reply" : "Anonymous"}</strong>
          <span>{relativeTime(item.createdAt)} · {formatPostTime(item.createdAt)}</span>
        </div>
        <p>{item.emoji ? <b>{item.emoji}</b> : null}{item.message}</p>
        <div className="shout-message-actions">
          <button
            type="button"
            className={reactedIds.has(item.id) ? "reacted" : ""}
            onClick={() => setReactionOpenId((current) => current === item.id ? "" : item.id)}
          >
            ♡ {item.reactionCount || "React"}
          </button>
          {!nested ? (
            <button type="button" className="reply-action" onClick={onReplyToggle}>
              <MessageCircle aria-hidden="true" />{replies.length ? `${replies.length} replies` : "Reply"}
            </button>
          ) : null}
          <button
            type="button"
            className={reportedIds.has(item.id) ? "reported" : ""}
            onClick={() => onReport(item.id)}
          >
            <Flag aria-hidden="true" />{reportedIds.has(item.id) ? "Reported" : "Report"}
          </button>
        </div>
        {reactionOpenId === item.id && !reactedIds.has(item.id) ? (
          <div className="shout-reaction-picker">
            {REACTION_EMOJIS.map((emoji) => (
              <button key={emoji} type="button" onClick={() => onReact(item.id, emoji)}>{emoji}</button>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );

  return (
    <section className="shout-message-thread">
      {renderMessage(message)}
      {replies.length ? (
        <div className="shout-replies">
          {replies.map((reply) => renderMessage(reply, true))}
        </div>
      ) : null}
      {replyOpen ? (
        <form className="shout-reply-form" onSubmit={onReplySubmit}>
          <textarea
            value={replyDraft}
            onChange={(event) => onReplyDraftChange(event.target.value)}
            maxLength={160}
            rows={2}
            autoFocus
            placeholder="Write a safe reply…"
            aria-label="Reply to this post"
          />
          <span>
            <small>{replyError || `${replyDraft.length}/160`}</small>
            <button type="button" onClick={onReplyToggle}>Cancel</button>
            <button type="submit" disabled={!replyDraft.trim() || replying}>
              <Send aria-hidden="true" />{replying ? "Sending" : "Reply"}
            </button>
          </span>
        </form>
      ) : null}
    </section>
  );
}

function emptyFeatureCollection() {
  return { type: "FeatureCollection", features: [] };
}

function createRadiusFeature([longitude, latitude], radiusKm) {
  const earthRadiusKm = 6371;
  const angularDistance = radiusKm / earthRadiusKm;
  const latitudeRadians = (latitude * Math.PI) / 180;
  const longitudeRadians = (longitude * Math.PI) / 180;
  const coordinates = [];

  for (let step = 0; step <= 64; step += 1) {
    const bearing = (step / 64) * Math.PI * 2;
    const destinationLatitude = Math.asin(
      Math.sin(latitudeRadians) * Math.cos(angularDistance) +
        Math.cos(latitudeRadians) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const destinationLongitude =
      longitudeRadians +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitudeRadians),
        Math.cos(angularDistance) -
          Math.sin(latitudeRadians) * Math.sin(destinationLatitude),
      );
    coordinates.push([
      (destinationLongitude * 180) / Math.PI,
      (destinationLatitude * 180) / Math.PI,
    ]);
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [coordinates] },
        properties: {},
      },
    ],
  };
}

function findNewestSummary(summaries = []) {
  return summaries.reduce((newest, summary) => {
    const createdAt = new Date(summary?.latest?.createdAt ?? 0).getTime();
    const newestAt = new Date(newest?.latest?.createdAt ?? 0).getTime();
    return createdAt > newestAt ? summary : newest;
  }, null);
}

function isRecentPost(value) {
  const createdAt = new Date(value ?? 0).getTime();
  return Number.isFinite(createdAt) && Date.now() - createdAt <= RECENT_ACTIVITY_MS;
}

function distanceBetweenCoordinates(origin, destination) {
  if (!origin?.length || !destination?.length) return Number.NaN;
  const [originLongitude, originLatitude] = origin;
  const [destinationLongitude, destinationLatitude] = destination;
  if (
    ![originLongitude, originLatitude, destinationLongitude, destinationLatitude].every(
      Number.isFinite,
    )
  ) return Number.NaN;

  const earthRadiusKm = 6371;
  const latitudeDelta = ((destinationLatitude - originLatitude) * Math.PI) / 180;
  const longitudeDelta = ((destinationLongitude - originLongitude) * Math.PI) / 180;
  const originLatitudeRadians = (originLatitude * Math.PI) / 180;
  const destinationLatitudeRadians = (destinationLatitude * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitudeRadians) *
      Math.cos(destinationLatitudeRadians) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function formatDistanceMetres(distanceKm) {
  if (!Number.isFinite(distanceKm)) return "Distance unavailable";
  if (distanceKm < 1) return `${Math.max(0, Math.round(distanceKm * 1000))} m`;
  return `${distanceKm.toFixed(1)} km`;
}

function roundMapCoordinate(value) {
  return Math.round(value * 10_000) / 10_000;
}

function displayLocationLabel(item, resolvedLabels = {}, { includeCoordinate = true } = {}) {
  if (!item) return "Pinned spot";

  const resolved = resolvedLabels[item.placeId];
  const storedLabel =
    item.label && item.label !== "Pinned spot" && item.label !== "Near this point"
      ? item.label
      : "";
  const readableLabel = item.kind === "pin"
    ? resolved || storedLabel
    : storedLabel || resolved;
  const coordinateLabel = formatCoordinateLabel(item);

  if (!includeCoordinate) return readableLabel || coordinateLabel || "Pinned spot";
  if (readableLabel && coordinateLabel) return `${readableLabel} · ${coordinateLabel}`;
  return readableLabel || coordinateLabel || "Pinned spot";
}

function formatCoordinateLabel(location) {
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "";

  const latDirection = latitude < 0 ? "S" : "N";
  const lngDirection = longitude < 0 ? "W" : "E";
  return `${Math.abs(latitude).toFixed(4)}° ${latDirection}, ${Math.abs(longitude).toFixed(4)}° ${lngDirection}`;
}

function pickReadableMapLabel(features = []) {
  const ranked = features
    .filter((feature) => feature?.source !== "shout-points")
    .map((feature, index) => {
      const properties = feature.properties ?? {};
      const label =
        properties["name:en"] ||
        properties.name_en ||
        properties.name ||
        properties.ref ||
        "";
      const cleanLabel = String(label).trim();
      if (!cleanLabel || cleanLabel.length > 60) return null;

      return {
        label: cleanLabel,
        score: scoreMapLabel(feature, cleanLabel),
        index,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  return ranked[0]?.label ?? "";
}

function scoreMapLabel(feature, label) {
  const layerId = String(feature?.layer?.id ?? "").toLowerCase();
  const sourceLayer = String(feature?.sourceLayer ?? feature?.sourceLayerId ?? "").toLowerCase();
  const kind = `${layerId} ${sourceLayer}`;
  const normalized = label.toLowerCase();

  if (/building|campus|university|school|library|poi|amenity|shop|park|garden|attraction/.test(kind)) {
    return 80;
  }
  if (/place|suburb|neighbourhood|neighborhood|locality/.test(kind)) return 65;
  if (/station|stop|tram|rail|transport/.test(kind)) return 55;
  if (/road|street|path|highway/.test(kind)) return 35;
  if (/water|river|creek/.test(kind)) return 20;
  if (/unnamed|parking|toilets/.test(normalized)) return 5;
  return 30;
}

function relativeTime(value) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function formatPostTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
