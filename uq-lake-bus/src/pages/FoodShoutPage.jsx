import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  ArrowLeft,
  Bell,
  Bookmark,
  BookmarkPlus,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Coffee,
  Compass,
  Flag,
  Globe2,
  Heart,
  List,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Maximize2,
  MessageCircle,
  ListChecks,
  Navigation,
  Pencil,
  Plus,
  Radar,
  RefreshCw,
  Search,
  Send,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  Utensils,
  X,
} from "lucide-react";

import { compressFoodImage, readFoodPhotoLocation } from "../lib/image-compression";
import { foodRankForLevel, foodRankStyle } from "../lib/food-ranks";
import {
  addFoodCollectionItem,
  createFoodComment,
  createFoodCollection,
  createFoodShout,
  deleteFoodComment,
  deleteFoodShout,
  getFoodProfileProgress,
  getFoodShout,
  listFoodActivity,
  listFoodCollections,
  listFoodComments,
  listFoodShouts,
  markFoodActivityRead,
  rateFoodShout,
  reportFoodComment,
  reportFoodShout,
  removeFoodCollectionItem,
  reverseFoodLocation,
  searchFoodPlaces,
  toggleFoodReaction,
  uploadFoodImage,
  updateFoodShout,
} from "../lib/food-shout-api";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_CENTER = [153.0133, -27.4971];
const CUISINES = ["All", "Chinese", "Singaporean", "Australian", "Japanese", "Korean", "Malaysian", "Indonesian", "Other"];
const BROWSE_REGION_GROUPS = [
  ["Default", [{ id: "au", label: "Australia", center: [134.5, -25.7], zoom: 3.2 }]],
  ["East Asia", [
    { id: "cn", label: "Mainland China", aliases: ["China", "CN"], center: [104.2, 35.8], zoom: 3.6 }, { id: "hk", label: "Hong Kong SAR (China)", aliases: ["Hong Kong", "HK", "China"], center: [114.17, 22.32], zoom: 9 },
    { id: "tw", label: "Taiwan (China)", aliases: ["Taiwan", "TW", "China"], center: [121, 23.7], zoom: 6.5 }, { id: "mo", label: "Macau SAR (China)", aliases: ["Macau", "Macao", "MO", "China"], center: [113.5439, 22.1987], zoom: 11 }, { id: "jp", label: "Japan", center: [138.2, 36.2], zoom: 4.6 },
    { id: "kr", label: "South Korea", center: [127.9, 36.3], zoom: 6 }, { id: "mn", label: "Mongolia", center: [103.8, 46.8], zoom: 4.4 },
  ]],
  ["Southeast Asia", [
    { id: "sg", label: "Singapore", center: [103.82, 1.35], zoom: 10 }, { id: "my", label: "Malaysia", center: [102.2, 4.2], zoom: 5.3 },
    { id: "id", label: "Indonesia", center: [117.3, -2.3], zoom: 3.8 }, { id: "ph", label: "Philippines", center: [122.8, 12.8], zoom: 4.8 },
    { id: "th", label: "Thailand", center: [101, 15.4], zoom: 5.2 }, { id: "vn", label: "Vietnam", center: [108.3, 16], zoom: 5.1 },
    { id: "kh", label: "Cambodia", center: [104.9, 12.6], zoom: 6 }, { id: "la", label: "Laos", center: [102.6, 19.9], zoom: 5.6 },
    { id: "mm", label: "Myanmar", center: [96.5, 21.1], zoom: 5.2 }, { id: "bn", label: "Brunei", center: [114.7, 4.5], zoom: 7.5 },
    { id: "tl", label: "Timor-Leste", center: [125.8, -8.8], zoom: 7 },
  ]],
  ["South & Central Asia", [
    { id: "in", label: "India", center: [79, 22.8], zoom: 4 }, { id: "pk", label: "Pakistan", center: [69.4, 30.4], zoom: 4.8 },
    { id: "bd", label: "Bangladesh", center: [90.3, 23.8], zoom: 6 }, { id: "lk", label: "Sri Lanka", center: [80.7, 7.8], zoom: 6.5 },
    { id: "np", label: "Nepal", center: [84.1, 28.3], zoom: 6 }, { id: "bt", label: "Bhutan", center: [90.4, 27.5], zoom: 7 },
    { id: "mv", label: "Maldives", center: [73.2, 3.2], zoom: 6 }, { id: "af", label: "Afghanistan", center: [66, 33.8], zoom: 5 },
    { id: "kz", label: "Kazakhstan", center: [67.3, 48], zoom: 3.8 }, { id: "uz", label: "Uzbekistan", center: [64.6, 41.4], zoom: 5.2 },
    { id: "kg", label: "Kyrgyzstan", center: [74.7, 41.2], zoom: 6 }, { id: "tj", label: "Tajikistan", center: [71, 38.8], zoom: 6 },
    { id: "tm", label: "Turkmenistan", center: [59.4, 39.1], zoom: 5.2 },
  ]],
  ["West Asia", [
    { id: "tr", label: "Türkiye", center: [35.2, 39], zoom: 5 }, { id: "ir", label: "Iran", center: [53.7, 32.3], zoom: 4.6 },
    { id: "iq", label: "Iraq", center: [43.7, 33], zoom: 5.4 }, { id: "lb", label: "Lebanon", center: [35.85, 33.9], zoom: 7.5 },
    { id: "sy", label: "Syria", center: [38.5, 35], zoom: 6 }, { id: "ps", label: "Palestine", center: [35.2, 31.9], zoom: 8 },
    { id: "jo", label: "Jordan", center: [36.3, 31.2], zoom: 6.5 }, { id: "il", label: "Israel", center: [34.9, 31.5], zoom: 7 },
    { id: "sa", label: "Saudi Arabia", center: [45, 24], zoom: 4.5 }, { id: "ae", label: "United Arab Emirates", center: [54.3, 24.3], zoom: 6.5 },
    { id: "qa", label: "Qatar", center: [51.2, 25.3], zoom: 8 }, { id: "kw", label: "Kuwait", center: [47.5, 29.3], zoom: 7 },
    { id: "om", label: "Oman", center: [56.1, 20.6], zoom: 5.5 }, { id: "ye", label: "Yemen", center: [47.5, 15.8], zoom: 5.4 },
    { id: "ge", label: "Georgia", center: [43.4, 42.1], zoom: 6.5 }, { id: "am", label: "Armenia", center: [45, 40.2], zoom: 7 },
    { id: "az", label: "Azerbaijan", center: [47.6, 40.3], zoom: 6.5 },
  ]],
];
const ALL_BROWSE_REGIONS = BROWSE_REGION_GROUPS.flatMap(([, regions]) => regions);
const TYPES = [
  ["dish", "Meal worth ordering"], ["drink", "Drink worth trying"], ["snack", "Snack worth sharing"], ["restaurant_find", "Hidden food spot"],
  ["market", "Food market"], ["cafe", "Cafe find"], ["dessert", "Sweet find"], ["deal", "Budget find"], ["other", "Food moment"],
];
const TYPE_FILTERS = [["all", "All"], ["meal", "Meals"], ["drink", "Drinks"], ["snack", "Snacks"]];
const VIBES = ["study-friendly", "quick-grab", "group-friendly", "quiet", "lively", "late-night", "takeaway-friendly", "solo-friendly"];
const DRAFT_KEY = "uq-food-shout-draft-v1";
const RECENT_LOCATIONS_KEY = "uq-food-recent-locations-v1";
const FOOD_MAP_VIEW_KEY = "uq-food-map-view-v1";
const DISPLAY_NAME_KEY = "uq-food-display-name-v1";
const ACTIVITY_ENABLED_KEY = "uq-food-activity-enabled-v1";

export default function FoodShoutPage({ onHome }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const selectedRef = useRef(null);
  const fetchSequenceRef = useRef(0);
  const fetchAbortRef = useRef(null);
  const fetchVisibleRef = useRef(null);
  const areaCacheRef = useRef(new Map());
  const [initialMapView] = useState(() => readFoodMapView() || recentFoodMapView());
  const [mapReady, setMapReady] = useState(false);
  const [viewMode, setViewMode] = useState("map");
  const [mapError, setMapError] = useState("");
  const [bounds, setBounds] = useState(null);
  const [pendingBounds, setPendingBounds] = useState(null);
  const [shouts, setShouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [browseRegion, setBrowseRegion] = useState(() => regionById(initialMapView?.regionId || "au"));
  const browseRegionRef = useRef(browseRegion);
  const [feedOpen, setFeedOpen] = useState(false);
  const [topOpen, setTopOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(() => readDisplayName());
  const [profileProgress, setProfileProgress] = useState(() => emptyFoodProfileProgress());
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityEnabled, setActivityEnabled] = useState(() => readActivityEnabled());
  const [activityLoading, setActivityLoading] = useState(false);
  const [activity, setActivity] = useState({ unreadCount: 0, notifications: [] });
  const [query, setQuery] = useState("");
  const [placeResults, setPlaceResults] = useState([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [searchedPlace, setSearchedPlace] = useState(null);
  const [googleReturnOpen, setGoogleReturnOpen] = useState(false);
  const [googleReturnValue, setGoogleReturnValue] = useState("");
  const [composerLocation, setComposerLocation] = useState(null);
  const [cuisine, setCuisine] = useState("All");
  const [foodType, setFoodType] = useState("all");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [budget, setBudget] = useState(false);
  const [mine, setMine] = useState(false);
  const [saved, setSaved] = useState(false);
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [toast, setToast] = useState(null);

  selectedRef.current = selected;
  browseRegionRef.current = browseRegion;

  useEffect(() => {
    const sharedId = new URLSearchParams(window.location.search).get("find");
    if (!/^[0-9a-f-]{36}$/i.test(sharedId || "")) return undefined;
    const controller = new AbortController();
    getFoodShout(sharedId, controller.signal).then((payload) => setSelected(payload.shout)).catch(() => {});
    return () => controller.abort();
  }, []);

  const loadActivity = useCallback(async (signal) => {
    try {
      const payload = await listFoodActivity(signal);
      const next = { unreadCount: payload.unreadCount || 0, notifications: payload.notifications || [] };
      setActivity(next);
      return next;
    } catch (error) {
      if (error.name !== "AbortError") setToast({ text: "Activity is unavailable right now." });
    }
  }, []);

  useEffect(() => {
    if (!activityEnabled) return undefined;
    const controller = new AbortController();
    setActivityLoading(true);
    loadActivity(controller.signal).finally(() => { if (!controller.signal.aborted) setActivityLoading(false); });
    const timer = window.setInterval(() => { if (!document.hidden) loadActivity(); }, 5 * 60_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [activityEnabled, loadActivity]);

  const loadProfileProgress = useCallback(async (signal) => {
    try {
      const payload = await getFoodProfileProgress(signal);
      setProfileProgress(payload);
      return payload;
    } catch (error) {
      if (error.name !== "AbortError") setProfileProgress((current) => ({ ...current, unavailable: true }));
    }
  }, []);

  const loadCollections = useCallback(async (signal) => {
    try {
      setCollectionsLoading(true);
      const payload = await listFoodCollections(signal);
      setCollections(payload.collections || []);
      return payload.collections || [];
    } catch (error) {
      if (error.name !== "AbortError") setToast({ text: "Collections are unavailable right now." });
      return [];
    } finally {
      if (!signal?.aborted) setCollectionsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadProfileProgress(controller.signal);
    return () => controller.abort();
  }, [loadProfileProgress]);

  useEffect(() => {
    if (!profileOpen && !collectionsOpen) return undefined;
    const controller = new AbortController();
    loadCollections(controller.signal);
    return () => controller.abort();
  }, [collectionsOpen, loadCollections, profileOpen]);

  const fetchVisible = useCallback(async (nextBounds = bounds, signal, { replace = false, force = false } = {}) => {
    if (!nextBounds) return;
    fetchAbortRef.current?.abort();
    const requestController = new AbortController();
    fetchAbortRef.current = requestController;
    if (signal) {
      if (signal.aborted) requestController.abort();
      else signal.addEventListener("abort", () => requestController.abort(), { once: true });
    }
    const requestId = ++fetchSequenceRef.current;
    const cacheKey = foodAreaCacheKey(nextBounds, { cuisine, foodType, budget, mine, saved });
    const cached = areaCacheRef.current.get(cacheKey);
    setLoadError("");
    if (!force && cached && Date.now() - cached.savedAt < 2 * 60_000) {
      setShouts((current) => replace ? uniqueFoodShouts(cached.shouts) : mergeFoodShouts(current, cached.shouts));
      setBounds(nextBounds);
      setPendingBounds(null);
      setLoading(false);
      if (fetchAbortRef.current === requestController) fetchAbortRef.current = null;
      return;
    }
    setLoading(true);
    try {
      const payload = await listFoodShouts({
        bounds: nextBounds,
        cuisine,
        type: foodType,
        budget,
        mine,
        saved,
        signal: requestController.signal,
      });
      if (requestId === fetchSequenceRef.current) {
        areaCacheRef.current.set(cacheKey, { savedAt: Date.now(), shouts: payload.shouts || [] });
        trimFoodAreaCache(areaCacheRef.current);
        setShouts((current) => replace
          ? uniqueFoodShouts(payload.shouts || [])
          : mergeFoodShouts(current, payload.shouts || []));
        setBounds(nextBounds);
        setPendingBounds(null);
      }
    } catch (error) {
      if (error.name !== "AbortError" && requestId === fetchSequenceRef.current) setLoadError(error.message);
    } finally {
      if (!requestController.signal.aborted && requestId === fetchSequenceRef.current) setLoading(false);
      if (fetchAbortRef.current === requestController) fetchAbortRef.current = null;
    }
  }, [bounds, budget, cuisine, foodType, mine, saved]);
  fetchVisibleRef.current = fetchVisible;

  useEffect(() => {
    if (!bounds) return undefined;
    const controller = new AbortController();
    fetchVisible(bounds, controller.signal, { replace: true });
    return () => controller.abort();
  }, [budget, cuisine, foodType, mine, saved]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return undefined;
    let cancelled = false;
    let map;
    let pulseFrame;
    let moveFetchTimer;
    import("maplibre-gl").then(({ default: maplibregl }) => {
      if (cancelled) return;
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLE,
        center: initialMapView ? [initialMapView.longitude, initialMapView.latitude] : DEFAULT_CENTER,
        zoom: initialMapView?.zoom ?? 13,
        minZoom: 2.4,
        maxZoom: 19,
        attributionControl: false,
        powerPreference: "high-performance",
      });
      mapRef.current = map;
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
      map.on("load", () => {
        if (cancelled) return;
        Object.entries({
          "food-icon-default": ["🍜", "#fff7ee", "#f26442"],
          "food-icon-drink": ["🧋", "#eef9fb", "#2c94b5"],
          "food-icon-snack": ["🥟", "#fff8dc", "#d58b20"],
          "food-icon-dessert": ["🍰", "#fff1fb", "#c466d8"],
          "food-icon-market": ["🥕", "#f3f8eb", "#6b8e42"],
          "food-icon-you": ["🦎", "#e5fff5", "#168466"],
        }).forEach(([name, values]) => map.addImage(name, makeMapFoodIcon(...values), { pixelRatio: 2 }));
        map.addSource("food-shouts", { type: "geojson", data: emptyGeoJson(), cluster: true, clusterRadius: 62, clusterMaxZoom: 16 });
        map.addSource("food-place-result", { type: "geojson", data: emptyGeoJson() });
        map.addSource("food-user-location", { type: "geojson", data: emptyGeoJson() });
        map.addLayer({
          id: "food-clusters", type: "circle", source: "food-shouts", filter: ["has", "point_count"],
          paint: { "circle-color": "#ff7043", "circle-radius": ["step", ["get", "point_count"], 18, 10, 22, 30, 26], "circle-stroke-width": 3, "circle-stroke-color": "#fff" },
        });
        map.addLayer({
          id: "food-cluster-count", type: "symbol", source: "food-shouts", filter: ["has", "point_count"],
          layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 13 }, paint: { "text-color": "#fff" },
        });
        map.addLayer({
          id: "food-latest-pulse", type: "circle", source: "food-shouts", filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "latest"], 1]],
          paint: { "circle-color": ["case", ["!=", ["get", "rankColor"], ""], ["get", "rankColor"], "#ff8a4c"], "circle-radius": 16, "circle-opacity": .24, "circle-blur": .45, "circle-stroke-width": 2, "circle-stroke-color": "rgba(255,255,255,.85)" },
        });
        map.addLayer({
          id: "food-pins", type: "circle", source: "food-shouts", filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": ["case", ["==", ["get", "selected"], 1], "#ff7043", "#fff8ef"],
            "circle-radius": ["case", ["==", ["get", "selected"], 1], 20, 16],
            "circle-stroke-width": ["case", ["==", ["get", "selected"], 1], 4, 3],
            "circle-stroke-color": ["case", ["!=", ["get", "rankColor"], ""], ["get", "rankColor"], ["match", ["get", "type"], "dessert", "#c466d8", "snack", "#d58b20", "drink", "#2c94b5", "market", "#6b8e42", "#ff7043"]],
          },
        });
        map.addLayer({
          id: "food-pin-glyphs", type: "symbol", source: "food-shouts", filter: ["!", ["has", "point_count"]],
          layout: {
            "icon-image": ["get", "icon"],
            "icon-size": ["case", ["==", ["get", "selected"], 1], 1.15, .96],
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
        });
        map.addLayer({ id: "food-place-result-pulse", type: "circle", source: "food-place-result", paint: { "circle-color": "#28735e", "circle-radius": 22, "circle-opacity": .14, "circle-stroke-width": 2, "circle-stroke-color": "#fff" } });
        map.addLayer({ id: "food-place-result-pin", type: "symbol", source: "food-place-result", layout: { "icon-image": "food-icon-market", "icon-size": 1.08, "icon-allow-overlap": true } });
        map.addLayer({ id: "food-user-location-halo", type: "circle", source: "food-user-location", paint: { "circle-color": "#1bb88e", "circle-radius": 20, "circle-opacity": .18, "circle-stroke-width": 2, "circle-stroke-color": "rgba(255,255,255,.95)" } });
        map.addLayer({ id: "food-user-location-pin", type: "symbol", source: "food-user-location", layout: { "icon-image": "food-icon-you", "icon-size": 1.08, "icon-allow-overlap": true, "icon-ignore-placement": true, "text-field": "You’re here", "text-size": 11, "text-offset": [0, 2.4], "text-anchor": "top", "text-allow-overlap": true, "text-ignore-placement": true }, paint: { "text-color": "#145847", "text-halo-color": "rgba(255,255,255,.96)", "text-halo-width": 2 } });
        map.on("click", "food-clusters", async (event) => {
          const feature = map.queryRenderedFeatures(event.point, { layers: ["food-clusters"] })[0];
          if (!feature) return;
          const zoom = await map.getSource("food-shouts").getClusterExpansionZoom(feature.properties.cluster_id);
          map.easeTo({ center: feature.geometry.coordinates, zoom, duration: 360 });
        });
        map.on("click", "food-pins", (event) => {
          const id = event.features?.[0]?.properties?.id;
          const item = shoutsRef.current.find((shout) => shout.id === id);
          if (item) setSelected(item);
        });
        ["food-clusters", "food-pins"].forEach((layer) => {
          map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
        });
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          const animatePulse = (time) => {
            if (cancelled || !map.getLayer("food-latest-pulse")) return;
            const phase = (Math.sin(time / 620) + 1) / 2;
            map.setPaintProperty("food-latest-pulse", "circle-radius", 14 + phase * 11);
            map.setPaintProperty("food-latest-pulse", "circle-opacity", .3 - phase * .24);
            map.setPaintProperty("food-user-location-halo", "circle-radius", 17 + phase * 8);
            map.setPaintProperty("food-user-location-halo", "circle-opacity", .26 - phase * .17);
            pulseFrame = requestAnimationFrame(animatePulse);
          };
          pulseFrame = requestAnimationFrame(animatePulse);
        }
        const initial = expandBounds(readBounds(map), .4);
        saveFoodMapView(map, browseRegionRef.current.id);
        setBounds(initial);
        fetchVisibleRef.current?.(initial);
        setMapReady(true);
      });
      map.on("moveend", () => {
        if (!map.loaded()) return;
        saveFoodMapView(map, browseRegionRef.current.id);
        const next = expandBounds(readBounds(map), .4);
        setPendingBounds(next);
        window.clearTimeout(moveFetchTimer);
        moveFetchTimer = window.setTimeout(() => fetchVisibleRef.current?.(next), 320);
      });
      map.on("error", () => setMapError("The map could not finish loading. Check your connection and try again."));
    }).catch(() => setMapError("The map is unavailable in this browser."));
    return () => { cancelled = true; if (pulseFrame) cancelAnimationFrame(pulseFrame); window.clearTimeout(moveFetchTimer); fetchAbortRef.current?.abort(); map?.remove(); mapRef.current = null; };
  }, []);

  const shoutsRef = useRef(shouts);
  shoutsRef.current = shouts;
  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("food-shouts");
    if (!source) return;
    let cancelled = false;
    const latestShoutId = shouts.reduce((latest, shout) => {
      const createdAt = new Date(shout.createdAt).getTime();
      return !latest || createdAt > latest.createdAt ? { id: shout.id, createdAt } : latest;
    }, null)?.id;
    const viewerRank = foodRankForLevel(profileProgress.level);
    const setMapData = () => source.setData({
      type: "FeatureCollection", features: shouts.map((shout) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [shout.longitude, shout.latitude] },
        properties: { id: shout.id, type: shout.shoutType, icon: map.hasImage(photoIconName(shout.id)) ? photoIconName(shout.id) : fallbackFoodIcon(shout.shoutType), selected: shout.id === selected?.id ? 1 : 0, latest: shout.id === latestShoutId ? 1 : 0, rankColor: shout.viewerOwned ? viewerRank.color : "" },
      })),
    });
    setMapData();
    Promise.all(shouts.map(async (shout) => {
      const name = photoIconName(shout.id);
      if (!shout.imageUrl || map.hasImage(name)) return;
      try { map.addImage(name, await makeMapPhotoIcon(shout.imageUrl), { pixelRatio: 2 }); } catch { /* keep the food-type fallback */ }
    })).then(() => { if (!cancelled && map.getSource("food-shouts")) setMapData(); });
    return () => { cancelled = true; };
  }, [profileProgress.level, selected?.id, shouts]);

  useEffect(() => {
    const source = mapRef.current?.getSource("food-place-result");
    if (!source) return;
    source.setData(searchedPlace ? { type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Point", coordinates: [searchedPlace.longitude, searchedPlace.latitude] }, properties: {} }] } : emptyGeoJson());
  }, [mapReady, searchedPlace]);

  useEffect(() => {
    const source = mapRef.current?.getSource("food-user-location");
    if (!source) return;
    source.setData(userLocation ? {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: { type: "Point", coordinates: [userLocation.longitude, userLocation.latitude] }, properties: {} }],
    } : emptyGeoJson());
  }, [mapReady, userLocation]);

  const locate = () => {
    if (!navigator.geolocation) return setToast({ text: "Location is not supported by this browser." });
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation({ latitude: coords.latitude, longitude: coords.longitude });
        const map = mapRef.current;
        if (map) {
          let fallbackTimer;
          const finishLocate = () => {
            window.clearTimeout(fallbackTimer);
            setLocating(false);
          };
          map.once("moveend", finishLocate);
          map.easeTo({ center: [coords.longitude, coords.latitude], zoom: 15, duration: 500 });
          fallbackTimer = window.setTimeout(finishLocate, 1000);
        } else setLocating(false);
      },
      (error) => {
        setToast({ text: foodLocationErrorMessage(error) });
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 9000, maximumAge: 120000 },
    );
  };

  const submitSearch = async (event) => {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) return;
    releaseMobileFocus();
    setPlaceSearching(true);
    const center = mapRef.current?.getCenter();
    const visible = mapRef.current?.getBounds();
    try {
      const payload = await searchFoodPlaces(cleanQuery, { latitude: center?.lat, longitude: center?.lng, west: visible?.getWest(), south: visible?.getSouth(), east: visible?.getEast(), north: visible?.getNorth(), unbounded: true, country: browseRegion.id });
      setPlaceResults(payload.results || []);
    } catch (error) { setToast({ text: error.message }); }
    finally { setPlaceSearching(false); }
  };

  const selectMapPlace = (place) => {
    setViewMode("map");
    setSearchedPlace(place);
    setPlaceResults([]);
    setQuery(place.name || place.label);
    mapRef.current?.easeTo({ center: [place.longitude, place.latitude], zoom: 17, duration: 520 });
  };

  const postAtPlace = (place) => {
    setComposerLocation(place);
    setComposerOpen(true);
  };

  const importGoogleMapPlace = (event) => {
    event.preventDefault();
    const imported = parseSharedMapLocation(googleReturnValue);
    if (!imported) return setToast({ text: "Paste a full Maps link containing coordinates, or latitude and longitude." });
    setGoogleReturnOpen(false); setGoogleReturnValue(""); selectMapPlace(imported);
  };

  const selectBrowseRegion = (region) => {
    browseRegionRef.current = region;
    setBrowseRegion(region);
    setRegionOpen(false);
    const map = mapRef.current;
    if (!map) return;
    setLoading(true);
    map.easeTo({ center: region.center, zoom: region.zoom, duration: 650 });
  };

  const openActivity = async () => {
    setActivityOpen(true);
    if (!activityEnabled) return;
    setActivityLoading(true);
    await loadActivity();
    setActivityLoading(false);
  };

  const toggleActivity = (enabled) => {
    setActivityEnabled(enabled);
    try { localStorage.setItem(ACTIVITY_ENABLED_KEY, enabled ? "1" : "0"); } catch { /* optional */ }
    if (!enabled) { setActivityLoading(false); setActivity((current) => ({ ...current, unreadCount: 0 })); }
  };

  const openActivityItem = async (item) => {
    if (!item.parentMessageId) return;
    try {
      if (!item.read) {
        await markFoodActivityRead(item.id);
        setActivity((current) => ({
          unreadCount: Math.max(0, current.unreadCount - 1),
          notifications: current.notifications.map((notification) => notification.id === item.id ? { ...notification, read: true } : notification),
        }));
      }
      const payload = await getFoodShout(item.parentMessageId);
      setSelected({ ...payload.shout, openComments: true });
      setActivityOpen(false);
    } catch {
      setToast({ text: "That food find is no longer available." });
    }
  };

  const refreshAfterCreate = (shout) => {
    setComposerOpen(false);
    setComposerLocation(null);
    setSelected(shout);
    setCuisine("All");
    setFoodType("all");
    setBudget(false);
    setMine(false);
    setSaved(false);
    setShouts((items) => [shout, ...items.filter((item) => item.id !== shout.id)]);
    loadProfileProgress();
    const map = mapRef.current;
    let synced = false;
    let refreshTimer;
    const syncOnce = () => {
      if (synced) return;
      synced = true;
      window.clearTimeout(refreshTimer);
      if (!map) return;
      saveFoodMapView(map, browseRegionRef.current.id);
      const next = expandBounds(readBounds(map), .4);
      setBounds(next);
      window.setTimeout(() => fetchVisibleRef.current?.(next), 250);
    };
    if (map) {
      map.once("moveend", syncOnce);
      map.easeTo({ center: [shout.longitude, shout.latitude], zoom: 15, duration: 420 });
      refreshTimer = window.setTimeout(syncOnce, 900);
    } else {
      syncOnce();
    }
    setToast({ text: "Food find posted", action: "Undo", onAction: async () => {
      setShouts((items) => items.filter((item) => item.id !== shout.id));
      setSelected(null);
      await deleteFoodShout(shout.id);
      const currentMap = mapRef.current;
      if (currentMap) fetchVisibleRef.current?.(expandBounds(readBounds(currentMap), .4), undefined, { force: true });
    } });
  };

  const refreshMap = () => {
    const map = mapRef.current;
    const next = map ? expandBounds(readBounds(map), .4) : bounds;
    if (next) fetchVisible(next, undefined, { force: true });
  };
  const createCollection = async (title) => {
    const payload = await createFoodCollection(title);
    setCollections((items) => [payload.collection, ...items]);
    setToast({ text: "Collection created" });
    return payload.collection;
  };
  const toggleCollectionItem = async (collection, shoutId) => {
    const included = collection.shoutIds?.includes(shoutId);
    const payload = included
      ? await removeFoodCollectionItem(collection.id, shoutId)
      : await addFoodCollectionItem(collection.id, shoutId);
    setCollections((items) => items.map((item) => item.id === payload.collection.id ? payload.collection : item));
    setToast({ text: included ? "Removed from collection" : "Added to collection" });
    return payload.collection;
  };
  const listShouts = useMemo(() => shouts
    .filter((shout) => !bounds || shoutInsideBounds(shout, bounds))
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)), [bounds, shouts]);
  const profileRank = foodRankForLevel(profileProgress.level);
  const activeFilterCount = Number(foodType !== "all") + Number(cuisine !== "All") + Number(budget);

  return (
    <section className="food-page" aria-label="Foodie Finds map">
      <header className="food-topbar">
        <button className="food-icon-button" type="button" onClick={onHome} aria-label="Back to home"><ArrowLeft size={21} /></button>
        <button className={`food-profile-summary compact rank-${profileRank.key}`} style={foodRankStyle(profileRank)} type="button" onClick={() => setProfileOpen(true)} aria-label={`Open profile for ${profileName}, ${profileRank.label}, level ${profileProgress.level}`}><span>{displayInitials(profileName)}<em>Lv {profileProgress.level}</em></span></button>
        <span className="food-topbar-spacer" />
        <button className="food-country-topbar flag-only" onClick={() => setRegionOpen(true)} type="button" aria-label={`Change map country, currently ${browseRegion.label}`}><span className="food-country-flag" aria-hidden="true">{regionFlag(browseRegion.id)}</span></button>
        <div className="food-view-toggle" role="group" aria-label="Choose map or list view"><button className={viewMode === "map" ? "active" : ""} type="button" onClick={() => setViewMode("map")} aria-label="Map view" aria-pressed={viewMode === "map"}><MapIcon size={17} /></button><button className={viewMode === "list" ? "active" : ""} type="button" onClick={() => setViewMode("list")} aria-label="List view" aria-pressed={viewMode === "list"}><List size={17} /></button></div>
        <button className="food-icon-button food-notification-button" type="button" onClick={openActivity} aria-label={`Notifications${activity.unreadCount ? `, ${activity.unreadCount} unread` : ""}`}><Bell size={20} />{activity.unreadCount > 0 && <span className="food-notification-badge" aria-hidden="true">{activity.unreadCount > 9 ? "9+" : activity.unreadCount}</span>}</button>
      </header>

      <div className={`food-map-shell ${searchedPlace ? "has-place-selection" : ""} ${viewMode === "list" ? "list-mode" : "map-mode"}`}>
        <div ref={mapContainerRef} className="food-map" aria-label="Interactive food discovery map" />
        {viewMode === "list" && <section className="food-list-view" aria-label="Food finds in this area">{listShouts.length ? <div className="food-list-view-grid">{listShouts.map((shout) => <button className={shout.viewerOwned ? "viewer-ranked" : ""} style={shout.viewerOwned ? foodRankStyle(profileRank) : undefined} type="button" onClick={() => setSelected(shout)} key={shout.id}><img src={shout.imageUrl} alt="" /><span><small>{shout.shoutType === "drink" ? "DRINK" : shout.shoutType === "snack" ? "SNACK" : "FOOD FIND"} · {relativeTime(shout.createdAt)}</small><strong>{shout.title}</strong>{foodPlaceLabel(shout) && <em><MapPin size={11} /> {foodPlaceLabel(shout)}</em>}<b>{shout.rating?.count ? <><Star size={12} fill="currentColor" /> {shout.rating.average.toFixed(1)} <i>({shout.rating.count})</i></> : "Not rated"}</b></span><ChevronRight size={18} /></button>)}</div> : <div className="food-list-empty"><Utensils size={24} /><strong>No finds in this area</strong><span>Move the map or share the first one.</span></div>}</section>}
        {viewMode === "list" && <form className={`food-search ${searchedPlace ? "active" : ""}`} onSubmit={submitSearch}>
          <Search size={18} aria-hidden="true" />
          <input value={query} onChange={(event) => { setQuery(event.target.value); setPlaceResults([]); setSearchedPlace(null); setGoogleReturnOpen(false); }} placeholder="Find a store or address" aria-label="Find a store or address" inputMode="search" enterKeyHint="search" autoComplete="street-address" />
          {query && <button type="button" onClick={() => { setQuery(""); setPlaceResults([]); setSearchedPlace(null); setGoogleReturnOpen(false); }} aria-label="Clear search"><X size={17} /></button>}
        </form>}

        <div className="food-filter-row collapsed" aria-label="Food filters"><button className={`food-filter-menu-toggle ${activeFilterCount ? "active" : ""}`} aria-label="Open food filters" onClick={() => setFiltersExpanded(true)} type="button"><SlidersHorizontal size={16} /> {activeFilterCount ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"}` : "Filters"}<ChevronDown size={14} /></button></div>

        {viewMode === "list" && placeResults.length > 0 && <div className="food-map-place-results" aria-live="polite"><div className="food-place-results-count">{placeResults.length} matching location{placeResults.length === 1 ? "" : "s"}</div>{placeResults.map((place) => <button type="button" onClick={() => selectMapPlace(place)} key={place.providerPlaceId}><MapPin size={16} /><span><strong>{placeResultName(place)}</strong><small>{placeResultLabel(place)}</small></span><ChevronRight size={15} /></button>)}</div>}
        {viewMode === "list" && !placeSearching && query.trim().length > 1 && !searchedPlace && placeResults.length === 0 && <div className="food-google-search-actions"><a className="food-google-search-link" href={googleMapsSearchUrl(query)} target="_blank" rel="noreferrer" onClick={() => setGoogleReturnOpen(true)}><Navigation size={15} /> Open Google Maps</a><button type="button" onClick={() => setGoogleReturnOpen((value) => !value)}>Paste location</button></div>}
        {viewMode === "list" && googleReturnOpen && !searchedPlace && <form className="food-map-google-return" onSubmit={importGoogleMapPlace}><input value={googleReturnValue} onChange={(event) => setGoogleReturnValue(event.target.value)} placeholder="Full Maps link or -27.47, 153.02" aria-label="Return a Google Maps location" autoCapitalize="off" autoCorrect="off" /><button type="submit">Use</button><button type="button" onClick={() => setGoogleReturnOpen(false)} aria-label="Close Google location field"><X size={15} /></button></form>}
        {searchedPlace && <div className="food-searched-place"><span><strong>{searchedPlace.name || "Chosen location"}</strong><small>{searchedPlace.label}</small></span><a href={googleMapsSearchUrl(searchedPlace)} target="_blank" rel="noreferrer" aria-label="Open in Google Maps"><Navigation size={16} /></a><button type="button" onClick={() => postAtPlace(searchedPlace)}><Plus size={16} /> Post here</button></div>}

        <div className="food-map-actions">
          <button type="button" onClick={refreshMap} disabled={loading || !bounds} aria-label={loading ? "Refreshing this area" : "Refresh this area"} className={loading ? "loading" : ""}><RefreshCw size={19} /></button>
          <button type="button" onClick={() => { setViewMode("map"); locate(); }} aria-label="Find my location" className={locating ? "loading" : ""}><LocateFixed size={21} /></button>
          <button type="button" onClick={() => { setComposerLocation(null); setComposerOpen(true); }} className="food-post-fab"><Plus size={23} /> Post</button>
        </div>

        {loading && <div className="food-map-status">Finding good food…</div>}
        {(mapError || loadError) && <div className="food-map-error"><span>{mapError || loadError}</span><button type="button" onClick={() => fetchVisible(pendingBounds || bounds)}>Try again</button></div>}
      </div>

      <AnimatePresence>
        {selected && <FoodDetail key={selected.id} shout={selected} map={mapRef.current} countryCode={browseRegion.id} guide={profileProgress.guide} rank={foodRankForLevel(profileProgress.level)} collections={collections} onToggleCollection={toggleCollectionItem} onClose={() => setSelected(null)} onChange={(next) => { setSelected(next); setShouts((items) => items.map((item) => item.id === next.id ? next : item)); }} onDeleted={() => { setSelected(null); fetchVisible(bounds); loadProfileProgress(); }} />}
        {composerOpen && <FoodComposer map={mapRef.current} initialLocation={composerLocation} countryCode={browseRegion.id} onClose={() => { setComposerOpen(false); setComposerLocation(null); }} onCreated={refreshAfterCreate} />}
        {filtersExpanded && <FilterMenuSheet foodType={foodType} cuisine={cuisine} budget={budget} onApply={({ type, selectedCuisine, selectedBudget }) => { setFoodType(type); setCuisine(selectedCuisine); setBudget(selectedBudget); setFiltersExpanded(false); }} onNear={() => { setFiltersExpanded(false); setFeedOpen(true); }} onRated={() => { setFiltersExpanded(false); setTopOpen(true); }} onClose={() => setFiltersExpanded(false)} />}
        {regionOpen && <RegionSheet selected={browseRegion} onSelect={selectBrowseRegion} onClose={() => setRegionOpen(false)} />}
        {activityOpen && <ActivitySheet activity={activity} enabled={activityEnabled} loading={activityLoading} onToggle={toggleActivity} onSelect={openActivityItem} onClose={() => setActivityOpen(false)} />}
        {feedOpen && <FoodFeed shouts={shouts} mine={mine} saved={saved} onMode={(mode) => { setMine(mode === "mine"); setSaved(mode === "saved"); }} onClose={() => { setFeedOpen(false); setMine(false); setSaved(false); }} onSelect={(shout) => { setSelected(shout); setFeedOpen(false); }} />}
        {topOpen && <TopPicks shouts={shouts} onClose={() => setTopOpen(false)} onSelect={(shout) => { setSelected(shout); setTopOpen(false); }} />}
        {profileOpen && <ProfileSheet displayName={profileName} progress={profileProgress} collections={collections} collectionsLoading={collectionsLoading} onClose={() => setProfileOpen(false)} onSaved={(name) => { setProfileName(name); setToast({ text: "Nickname saved" }); }} onOpenCollections={() => { setProfileOpen(false); setCollectionsOpen(true); }} onOpenFinds={() => { setProfileOpen(false); setMine(true); setSaved(false); setFeedOpen(true); }} />}
        {collectionsOpen && <CollectionSheet collections={collections} loading={collectionsLoading} progress={profileProgress} onCreate={createCollection} onClose={() => setCollectionsOpen(false)} />}
      </AnimatePresence>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </section>
  );
}

function FoodComposer({ map, initialLocation = null, countryCode = "au", onClose, onCreated }) {
  const fileRef = useRef(null);
  const photoLocationRequestRef = useRef(0);
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState([]);
  const [photoLocation, setPhotoLocation] = useState(null);
  const [photoLocationResolving, setPhotoLocationResolving] = useState(false);
  const [location, setLocation] = useState(initialLocation);
  const [locationMode, setLocationMode] = useState(initialLocation ? "search" : "");
  const [locationSearch, setLocationSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [sharedMapValue, setSharedMapValue] = useState("");
  const [form, setForm] = useState(() => readDraft());
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [preparingStatus, setPreparingStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  const [manualPicking, setManualPicking] = useState(false);
  const [displayName, setDisplayName] = useState(() => readDisplayName());

  useEffect(() => {
    if (form.title || form.caption || form.priceText) localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form]);
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl)), []);

  const choosePhotos = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setError("");
    const available = 3 - photos.length;
    if (available <= 0 || files.length > available) return setError("Three photos is the maximum for one post.");
    setPreparing(true);
    try {
      const prepared = [];
      let detectedLocation = null;
      for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
        const file = files[fileIndex];
        setPreparingStatus(`Preparing ${fileIndex + 1} of ${files.length}`);
        const [photo, gps] = await Promise.all([compressFoodImage(file), readFoodPhotoLocation(file)]);
        prepared.push({ ...photo, gps });
        if (!detectedLocation && gps) detectedLocation = gps;
      }
      setPhotos((current) => [...current, ...prepared]);
      if (detectedLocation && !photoLocation) {
        const requestId = ++photoLocationRequestRef.current;
        const detected = { ...detectedLocation, name: "", label: "Location detected from photo" };
        setPhotoLocation(detected);
        setLocation(detected);
        setLocationMode("photo");
        setPhotoLocationResolving(true);
        try {
          const payload = await reverseFoodLocation(detected.latitude, detected.longitude);
          if (requestId === photoLocationRequestRef.current && payload.place) {
            const resolved = { ...detected, ...payload.place, latitude: detected.latitude, longitude: detected.longitude };
            setPhotoLocation(resolved);
            setLocation(resolved);
          }
        } catch { /* Photo GPS remains usable even when the place name cannot be resolved. */ }
        finally { if (requestId === photoLocationRequestRef.current) setPhotoLocationResolving(false); }
      }
    }
    catch (nextError) { setError(nextError.message); }
    finally { setPreparing(false); setPreparingStatus(""); if (fileRef.current) fileRef.current.value = ""; }
  };

  const removePhoto = (index) => {
    URL.revokeObjectURL(photos[index].previewUrl);
    const next = photos.filter((_, photoIndex) => photoIndex !== index);
    setPhotos(next);
    const remainingGps = next.find((photo) => photo.gps)?.gps || null;
    if (!remainingGps) {
      photoLocationRequestRef.current += 1;
      setPhotoLocation(null);
      setPhotoLocationResolving(false);
      if (locationMode === "photo") { setLocation(initialLocation); setLocationMode(initialLocation ? "search" : ""); }
    }
  };

  const currentLocation = () => {
    setError("");
    if (!navigator.geolocation) return setError("Location is not supported. Search or choose the map instead.");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const next = { latitude: coords.latitude, longitude: coords.longitude, label: coordinateLabel(coords.latitude, coords.longitude) };
      setLocation(next); setLocationMode("current"); setStep(3);
      saveRecentLocation(next);
    }, (geoError) => {
      setError(foodLocationErrorMessage(geoError, "Search a past place or pick the map manually."));
    }, { enableHighAccuracy: false, timeout: 9000, maximumAge: 120000 });
  };

  const searchLocation = async (event) => {
    event.preventDefault();
    const cleanQuery = locationSearch.trim();
    if (cleanQuery.length < 2) return;
    releaseMobileFocus();
    setSearching(true); setError("");
    setSearchAttempted(true);
    const center = map?.getCenter();
    const visible = map?.getBounds();
    try {
      setSearchResults((await searchFoodPlaces(cleanQuery, {
        latitude: center?.lat,
        longitude: center?.lng,
        west: visible?.getWest(),
        south: visible?.getSouth(),
        east: visible?.getEast(),
        north: visible?.getNorth(),
        unbounded: true,
        country: countryCode,
      })).results || []);
    }
    catch (nextError) { setError(nextError.message); }
    finally { setSearching(false); }
  };

  const confirmManualLocation = () => {
    const center = map?.getCenter();
    const latitude = center?.lat ?? DEFAULT_CENTER[1];
    const longitude = center?.lng ?? DEFAULT_CENTER[0];
    setLocation({ latitude, longitude, label: coordinateLabel(latitude, longitude) });
    setLocationMode("manual"); setManualPicking(false); setStep(3);
  };

  const importSharedLocation = (event) => {
    event.preventDefault();
    const imported = parseSharedMapLocation(sharedMapValue);
    if (!imported) return setError("Open the place in Google Maps, tap Share → Copy link, then paste the full link here.");
    releaseMobileFocus(); setError(""); setLocation(imported); setLocationMode("google"); setStep(3); saveRecentLocation(imported);
  };
  const countryMismatch = locationCountryMismatch(location, countryCode);

  const publish = async () => {
    if (photos.length < 1 || photos.length > 3 || !location || !form.title.trim()) return setError("Add 1–3 photos, a title, and a location.");
    setPosting(true); setError("");
    try {
      const id = crypto.randomUUID();
      const uploads = [];
      for (let index = 0; index < photos.length; index += 1) {
        setUploadStage(`Uploading photo ${index + 1} of ${photos.length}`);
        const upload = await uploadFoodImage({
          ...photos[index],
          postId: id,
          onProgress: (photoProgress) => setProgress(Math.round(((index + photoProgress / 100) / photos.length) * 100)),
        });
        uploads.push(upload);
      }
      setUploadStage("Saving your find");
      const payload = await createFoodShout({
        id, imageKeys: uploads.map((upload) => upload.objectKey), displayName: displayName.trim() || readDisplayName(), title: form.title.trim(), caption: form.caption.trim(), priceText: form.priceText.trim(),
        cuisine: form.cuisine, shoutType: form.shoutType, vibeTags: form.vibeTags,
        latitude: location.latitude, longitude: location.longitude, locationLabel: location.label,
        placeName: location.name || null, provider: location.provider || null, providerPlaceId: location.providerPlaceId || null,
      });
      localStorage.removeItem(DRAFT_KEY);
      saveDisplayName(displayName);
      saveRecentLocation(location);
      onCreated(payload.shout);
    } catch (nextError) { setError(nextError.message); }
    finally { setPosting(false); setUploadStage(""); setProgress(0); }
  };

  if (manualPicking) return <>
    <div className="food-exact-pin" aria-hidden="true"><span><MapPin size={28} /></span></div>
    <motion.div className="food-pin-confirm" initial={{ y: 120 }} animate={{ y: 0 }} exit={{ y: 120 }}>
      <div><strong>Place the exact pin</strong><small>Move and zoom the map. The centre point is saved exactly.</small></div>
      <div><button type="button" onClick={() => setManualPicking(false)}>Cancel</button><button type="button" onClick={confirmManualLocation}><Check size={17} /> Use exact pin</button></div>
    </motion.div>
  </>;

  return (
    <Sheet className="food-composer" onClose={onClose} label="Create a food find">
      <div className="food-sheet-head"><div><span>STEP {step} OF 3</span><h2>{step === 1 ? "Add photos" : step === 2 ? "Set the place" : "Share the details"}</h2></div><div className="food-sheet-actions">{step > 1 && <button type="button" onClick={() => setStep((value) => value - 1)} aria-label="Previous step"><ArrowLeft /></button>}<button type="button" onClick={() => { releaseMobileFocus(); onClose(); }} aria-label="Close"><X /></button></div></div>
      <div className="food-progress"><i style={{ width: `${step / 3 * 100}%` }} /></div>
      {step === 1 && <div className="food-photo-step">
        <div className="food-photo-limit-head"><strong>Photos</strong><span>{photos.length} / 3{photos.length ? ` · ${formatBytes(photos.reduce((total, photo) => total + photo.blob.size, 0))}` : " max"}</span></div>
        <div className="food-photo-limit" aria-label={`${photos.length} of 3 photos selected`}><i style={{ width: `${photos.length / 3 * 100}%` }} /><b aria-hidden="true" /></div>
        {photos.length > 0 && <div className="food-photo-tray" aria-label="Selected photos">{photos.map((photo, index) => <figure key={photo.previewUrl}><img src={photo.previewUrl} alt={`Selected food ${index + 1}`} /><button type="button" onClick={() => removePhoto(index)} aria-label={`Remove photo ${index + 1}`}><X size={15} /></button><span>{index + 1}</span></figure>)}{photos.length < 3 && <button className="food-photo-add-tile" type="button" disabled={preparing} onClick={() => fileRef.current?.click()}>{preparing ? <span className="food-photo-spinner" /> : <Camera size={22} />}<strong>{preparing ? preparingStatus : "Add photo"}</strong></button>}</div>}
        {photoLocation && !initialLocation && <div className="food-photo-location smart"><span><Sparkles size={18} /><span><strong>{photoLocationResolving ? "Naming this place…" : "Location detected from photo"}</strong><small>{photoLocationResolving ? "Matching the nearby address" : photoLocation.name || photoLocation.label}</small></span></span><button type="button" disabled={photoLocationResolving} onClick={() => setStep(2)}>Edit</button></div>}
        {photos.length === 0 && <button className="food-photo-picker" type="button" disabled={preparing} aria-busy={preparing} onClick={() => fileRef.current?.click()}>
          <span>{preparing ? <span className="food-photo-spinner" /> : <Camera size={28} />}</span><strong>{preparing ? preparingStatus || "Preparing your photo…" : "Take or choose photos"}</strong><small>{preparing ? "Compressing for a faster upload" : "Choose 1–3 at once"}</small>
        </button>}
        <p className="food-photo-tip"><Sparkles size={14} /> Camera location on? We can tag the place automatically.</p>
        <input ref={fileRef} hidden multiple type="file" accept="image/*,.heic,.heif" onChange={(event) => choosePhotos(event.target.files)} />
        {photos.length > 0 && <button className="food-primary" type="button" disabled={photoLocationResolving} onClick={() => setStep(initialLocation || photoLocation ? 3 : 2)}>{photoLocationResolving ? "Finding the place…" : photoLocation ? "Continue with this place" : "Continue"} <ChevronRight size={18} /></button>}
      </div>}
      {step === 2 && <div className="food-location-step">
        {location && <div className="food-current-place"><span className="food-current-place-icon">{locationMode === "photo" ? <Sparkles size={18} /> : <MapPin size={18} />}</span><span><small>CURRENT CHOICE</small><strong>{location.name || (locationMode === "photo" ? "Photo location" : locationMode === "current" ? "Current location" : locationMode === "manual" ? "Dropped pin" : "Selected place")}</strong>{location.name && <em>{location.label}</em>}</span><button type="button" onClick={() => setStep(3)}>Keep</button></div>}
        <div className="food-place-panel">
          <label htmlFor="food-place-query">Search store or address</label>
          <form className="food-place-search" onSubmit={searchLocation}><Search size={18} /><input id="food-place-query" value={locationSearch} onChange={(event) => { setLocationSearch(event.target.value); setSearchAttempted(false); setError(""); }} placeholder="Restaurant, suburb or address" aria-label="Store name or address" inputMode="search" enterKeyHint="search" autoComplete="off" /><button type="submit" disabled={searching || locationSearch.trim().length < 2} aria-label="Search stores">{searching ? <span className="food-mini-spinner" /> : <Search size={17} />}</button></form>
          <small>Optional—use GPS or drop a pin instead.</small>
        </div>
        {searchResults.length > 0 && <div className="food-place-results" aria-live="polite">{searchResults.map((place) => <button type="button" key={place.providerPlaceId} onClick={() => { releaseMobileFocus(); setLocation(place); setLocationMode("search"); setStep(3); saveRecentLocation(place); }}><MapPin size={17} /><span><strong>{placeResultName(place)}</strong><small>{placeResultLabel(place)}</small></span><ChevronRight size={16} /></button>)}</div>}
        {searchAttempted && !searching && searchResults.length === 0 && <div className="food-place-empty"><strong>Store not listed</strong><span>Try Google or drop a pin.</span></div>}
        {locationSearch.trim().length > 1 && <a className="food-composer-google" href={googleMapsSearchUrl(locationSearch)} target="_blank" rel="noreferrer"><Navigation size={15} /> Search Google Maps</a>}
        <div className="food-location-options">
          <button type="button" onClick={currentLocation}><LocateFixed /><span><strong>I'm here</strong><small>Use GPS</small></span></button>
          <button type="button" onClick={() => { releaseMobileFocus(); setManualPicking(true); }}><Navigation /><span><strong>Drop a pin</strong><small>Exact spot</small></span></button>
        </div>
        <details className="food-google-import"><summary><Navigation size={15} /><span>Use a Google Maps link</span><em>Optional</em></summary><div className="food-google-help"><strong>Where do I find it?</strong><span>Open the place → Share → Copy link</span></div><form onSubmit={importSharedLocation}><input value={sharedMapValue} onChange={(event) => { setSharedMapValue(event.target.value); setError(""); }} placeholder="Paste the copied link here" aria-label="Google Maps link or coordinates" autoCapitalize="off" autoCorrect="off" /><button type="submit" disabled={!sharedMapValue.trim()}>Use</button></form><small>No link? Search above, use GPS, or drop a pin.</small></details>
        <RecentLocations onSelect={(place) => { setLocation(place); setLocationMode("recent"); setStep(3); }} />
        <p className="food-attribution">Place search © OpenStreetMap contributors</p>
      </div>}
      {step === 3 && <div className="food-details-step">
        <div className="food-compose-summary"><img src={photos[0]?.previewUrl} alt="" /><div><strong>{location?.name || location?.label}</strong><small><MapPin size={13} /> {photos.length} photo{photos.length === 1 ? "" : "s"} · {locationMode === "current" ? "Current location" : locationMode === "manual" ? "Map pin" : locationMode === "google" ? "Google location" : locationMode === "photo" ? "Photo GPS" : "Chosen place"}</small></div><button type="button" onClick={() => setStep(2)}>Change</button></div>
        {countryMismatch && <div className="food-country-warning"><Globe2 size={17} /><span><strong>This place is outside {regionShortCode(regionById(countryCode))}</strong><small>Posting is allowed. Select {countryMismatch.actual.toUpperCase()} in the map header to view posts there.</small></span></div>}
        {!location?.providerPlaceId && <label>Store name <small>Optional</small><input maxLength={100} value={location?.name || ""} onChange={(event) => setLocation((current) => ({ ...current, name: event.target.value }))} placeholder="Add the venue name" enterKeyHint="next" /></label>}
        <label>What did you find? <input maxLength={80} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Amazing beef noodles" enterKeyHint="next" /></label>
        <label>Quick note <textarea maxLength={280} rows={2} value={form.caption} onChange={(event) => setForm({ ...form, caption: event.target.value })} placeholder="Why is it worth trying?" /></label>
        <details className="food-more-fields">
          <summary><Plus size={16} /> Add price, cuisine and tags</summary>
          <div className="food-field-grid"><label>Price <input maxLength={40} value={form.priceText} onChange={(event) => setForm({ ...form, priceText: event.target.value })} placeholder="$12" /></label><label>Cuisine <select value={form.cuisine} onChange={(event) => setForm({ ...form, cuisine: event.target.value })}>{CUISINES.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label></div>
          <label>Type <select value={form.shoutType} onChange={(event) => setForm({ ...form, shoutType: event.target.value })}>{TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <fieldset><legend>Good for <small>up to 3</small></legend><div className="food-vibes">{VIBES.map((vibe) => <button type="button" className={form.vibeTags.includes(vibe) ? "active" : ""} onClick={() => setForm({ ...form, vibeTags: toggleVibe(form.vibeTags, vibe) })} key={vibe}>{vibe.replaceAll("-", " ")}</button>)}</div></fieldset>
        </details>
        {posting && <div className="food-upload-status"><span className="food-photo-spinner" /><span><strong>{uploadStage || "Preparing upload"}</strong><small>Keep this screen open</small></span><b>{progress}%</b></div>}
        {posting && <div className="food-upload-progress" role="progressbar" aria-label="Photo upload progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}><i style={{ width: `${progress}%` }} /></div>}
        <button className="food-primary" disabled={posting || !form.title.trim()} type="button" onClick={publish}>{posting ? "Sharing…" : "Share find"} <Send size={18} /></button>
      </div>}
      {error && <p className="food-form-error" role="alert">{error}</p>}
    </Sheet>
  );
}

function FoodDetail({ shout, map, countryCode, guide, rank, collections = [], onToggleCollection, onClose, onChange, onDeleted }) {
  const gallery = shout.images?.length ? shout.images : [{ url: shout.imageUrl }];
  const [activePhoto, setActivePhoto] = useState(0);
  const [failedImages, setFailedImages] = useState([]);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [displayName, setDisplayName] = useState(() => readDisplayName());
  const [tone, setTone] = useState("helpful");
  const [editing, setEditing] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [locationDirty, setLocationDirty] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState(shout.openComments ? "comments" : null);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [ratingValue, setRatingValue] = useState(() => shout.rating?.viewerValue ?? null);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [rewardMessage, setRewardMessage] = useState("");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);
  const [collectionBusy, setCollectionBusy] = useState("");
  const [editLocation, setEditLocation] = useState(() => ({
    latitude: shout.latitude,
    longitude: shout.longitude,
    label: shout.locationLabel,
    name: shout.placeName,
    provider: shout.provider,
    providerPlaceId: shout.providerPlaceId,
  }));
  const [locationEditorOpen, setLocationEditorOpen] = useState(false);
  const [editForm, setEditForm] = useState(() => ({
    title: shout.title,
    caption: shout.caption,
    displayName: shout.displayName || readDisplayName(),
    priceText: shout.priceText || "",
    cuisine: shout.cuisine,
    shoutType: shout.shoutType,
    vibeTags: shout.vibeTags || [],
  }));
  useEffect(() => {
    if (feedbackMode !== "comments" || commentsLoaded) return undefined;
    const controller = new AbortController();
    listFoodComments(shout.id, controller.signal).then((data) => { setComments(data.comments || []); setCommentsLoaded(true); }).catch(() => {});
    return () => controller.abort();
  }, [commentsLoaded, feedbackMode, shout.id]);
  const react = async (kind) => {
    const activeKey = kind === "like" ? "viewerLiked" : "viewerSaved";
    const countKey = kind === "like" ? "likeCount" : "saveCount";
    try { const result = await toggleFoodReaction(shout.id, kind, shout[activeKey]); onChange({ ...shout, [activeKey]: result.active, [countKey]: result.count }); } catch (nextError) { setError(nextError.message); }
  };
  const submitComment = async (event) => {
    event.preventDefault(); if (!comment.trim()) return;
    setBusy(true); setError("");
    try { const result = await createFoodComment(shout.id, comment.trim(), replyTo?.id, displayName.trim() || readDisplayName(), tone); saveDisplayName(displayName); setComments((items) => [...items, result.comment]); setComment(""); setReplyTo(null); releaseMobileFocus(); if (result.earnedXp) setRewardMessage(`+${result.earnedXp} EXP · First comment`); onChange({ ...shout, commentCount: shout.commentCount + 1 }); }
    catch (nextError) { setError(nextError.message); } finally { setBusy(false); }
  };
  const roots = comments.filter((item) => !item.parentCommentId);
  const saveEdit = async () => {
    if (!editForm.title.trim()) return setError("Keep a short title for this food find.");
    setEditBusy(true); setError("");
    try {
      const payload = await updateFoodShout(shout.id, {
        ...editForm,
        latitude: editLocation.latitude,
        longitude: editLocation.longitude,
        locationLabel: editLocation.label,
        placeName: editLocation.name || null,
        provider: editLocation.provider || null,
        providerPlaceId: editLocation.providerPlaceId || null,
      });
      const saved = payload.shout;
      const coordinatesSaved = Number.isFinite(saved?.latitude) && Number.isFinite(saved?.longitude)
        && Math.abs(saved.latitude - editLocation.latitude) <= .000002
        && Math.abs(saved.longitude - editLocation.longitude) <= .000002;
      const expectedPlaceName = String(editLocation.name || "").trim();
      const placeNameSaved = !expectedPlaceName || String(saved?.placeName || "").trim() === expectedPlaceName;
      if (!coordinatesSaved || !placeNameSaved) throw new Error("The address was not saved by the server. Please try again.");
      setEditLocation({
        latitude: saved.latitude,
        longitude: saved.longitude,
        label: saved.locationLabel,
        name: saved.placeName,
        provider: saved.provider,
        providerPlaceId: saved.providerPlaceId,
      });
      saveRecentLocation({ latitude: saved.latitude, longitude: saved.longitude, label: saved.locationLabel, name: saved.placeName });
      onChange(payload.shout);
      saveDisplayName(editForm.displayName);
      setLocationDirty(false);
      setEditing(false);
      map?.easeTo({ center: [saved.longitude, saved.latitude], zoom: Math.max(map.getZoom(), 15), duration: 420 });
    } catch (nextError) { setError(nextError.message); }
    finally { setEditBusy(false); }
  };
  const cancelEdit = () => {
    setEditForm({
      title: shout.title,
      caption: shout.caption,
      displayName: shout.displayName || readDisplayName(),
      priceText: shout.priceText || "",
      cuisine: shout.cuisine,
      shoutType: shout.shoutType,
      vibeTags: shout.vibeTags || [],
    });
    setEditLocation({
      latitude: shout.latitude,
      longitude: shout.longitude,
      label: shout.locationLabel,
      name: shout.placeName,
      provider: shout.provider,
      providerPlaceId: shout.providerPlaceId,
    });
    setLocationEditorOpen(false);
    setLocationDirty(false);
    setEditing(false);
  };
  const removePost = async () => {
    setDeleteBusy(true); setError("");
    try { await deleteFoodShout(shout.id); onDeleted(); }
    catch (nextError) { setError(nextError.message); setDeleteConfirm(false); }
    finally { setDeleteBusy(false); }
  };
  const submitRating = async () => {
    setRatingBusy(true); setError("");
    try { const rating = await rateFoodShout(shout.id, ratingValue); if (rating.earnedXp) setRewardMessage(`+${rating.earnedXp} EXP · First rating`); onChange({ ...shout, rating }); }
    catch (nextError) { setError(nextError.message); }
    finally { setRatingBusy(false); }
  };
  const openCommentComposer = (item = null) => {
    setReplyTo(item);
    window.requestAnimationFrame(() => document.getElementById(`comment-${shout.id}`)?.focus());
  };
  const toggleComments = () => {
    if (feedbackMode === "comments") { setFeedbackMode(null); setReplyTo(null); releaseMobileFocus(); return; }
    setFeedbackMode("comments");
    window.setTimeout(() => document.getElementById(`comment-${shout.id}`)?.focus(), 220);
  };
  const toggleCollection = async (collection) => {
    if (!onToggleCollection) return;
    setCollectionBusy(collection.id);
    try { await onToggleCollection(collection, shout.id); }
    catch (nextError) { setError(nextError.message); }
    finally { setCollectionBusy(""); }
  };
  const readablePlace = foodPlaceLabel(shout);
  const sharePost = async () => {
    const shareUrl = foodShareUrl(shout.id);
    const shareData = { title: shout.title, text: [shout.caption, readablePlace].filter(Boolean).join(" · "), url: shareUrl };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus("Link copied");
        window.setTimeout(() => setShareStatus(""), 1800);
      }
    } catch (shareError) {
      if (shareError?.name !== "AbortError") setError("This link could not be shared. Try again.");
    }
  };
  const activeImage = gallery[activePhoto];
  const showRankSeal = shout.viewerOwned && rank?.key && rank.key !== "bronze";
  return <Sheet className="food-detail" onClose={onClose} label={shout.title}>
    <div className="food-detail-media food-detail-player">
      <figure>{failedImages.includes(activePhoto) || !(activeImage?.url || shout.imageUrl) ? <div className="food-photo-fallback"><Utensils size={25} /><span>Photo unavailable</span></div> : <motion.img key={activePhoto} initial={{ opacity: .35, scale: 1.025 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .22 }} src={activeImage?.url || shout.imageUrl} alt={`${shout.title}, photo ${activePhoto + 1}`} onError={() => setFailedImages((items) => items.includes(activePhoto) ? items : [...items, activePhoto])} />}</figure>
      <div className="food-detail-top-actions"><button type="button" onClick={sharePost} aria-label="Share this food find"><Share2 size={18} /></button><button type="button" onClick={onClose} aria-label="Close"><X /></button></div>{shareStatus && <b className="food-share-status">{shareStatus}</b>}<span>{typeLabel(shout.shoutType)}</span>
      <button type="button" className="food-detail-expand-photo" onClick={() => setGalleryOpen(true)} aria-label="View photo gallery"><Maximize2 size={17} /></button>
      {gallery.length > 1 && <div className="food-detail-thumbnails" aria-label="Choose food photo">{gallery.slice(0, 3).map((image, index) => <button type="button" className={activePhoto === index ? "active" : ""} onClick={() => setActivePhoto(index)} aria-label={`Show photo ${index + 1}`} aria-pressed={activePhoto === index} key={image.objectKey || index}>{failedImages.includes(index) || !(image.url || shout.imageUrl) ? <Utensils size={15} /> : <img src={image.url || shout.imageUrl} alt="" onError={() => setFailedImages((items) => items.includes(index) ? items : [...items, index])} />}</button>)}</div>}
    </div>
    <div className="food-detail-body">
      {editing ? <div className="food-inline-edit">
        <label>Title<input maxLength={80} value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} /></label>
        <label>Caption<textarea rows={3} maxLength={280} value={editForm.caption} onChange={(event) => setEditForm({ ...editForm, caption: event.target.value })} /></label>
        <button className="food-edit-location-button" type="button" onClick={() => setLocationEditorOpen((value) => !value)}><MapPin size={16} /><span><strong>Location</strong><small>{editLocation.name || editLocation.label}</small></span><ChevronRight size={16} /></button>
        {locationEditorOpen && <FoodLocationEditor map={map} countryCode={countryCode} value={editLocation} onChange={(next) => { setEditLocation(next); setLocationDirty(true); setLocationEditorOpen(false); }} />}
        {locationDirty && <div className="food-location-pending" role="status"><Check size={16} /><span><strong>New address selected</strong><small>Review it above, then save the post.</small></span></div>}
        <div className="food-field-grid"><label>Price<input maxLength={40} value={editForm.priceText} onChange={(event) => setEditForm({ ...editForm, priceText: event.target.value })} /></label><label>Cuisine<select value={editForm.cuisine} onChange={(event) => setEditForm({ ...editForm, cuisine: event.target.value })}>{CUISINES.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label></div>
        <label>Kind<select value={editForm.shoutType} onChange={(event) => setEditForm({ ...editForm, shoutType: event.target.value })}>{TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <div className="food-inline-edit-actions"><button type="button" onClick={cancelEdit}>Cancel</button><button type="button" disabled={editBusy} onClick={saveEdit}>{editBusy ? "Saving…" : locationDirty ? "Save new address" : "Save changes"}</button></div>
      </div> : <><h2>{shout.title}</h2>{shout.caption && <p className="food-caption">{shout.caption}</p>}</>}
      {readablePlace && <div className="food-location-line"><MapPin size={17} /><span><strong>{readablePlace}</strong></span><a href={googleMapsSearchUrl(shout)} target="_blank" rel="noreferrer" aria-label="Open this place in Google Maps"><Navigation size={14} /> Google</a></div>}
      <div className="food-meta-row"><span>{shout.cuisine}</span><span><Clock3 size={13} /> {relativeTime(shout.createdAt)}</span>{shout.priceText && <span><CircleDollarSign size={15} /> {shout.priceText}</span>}{shout.vibeTags.map((tag) => <span key={tag}>{tag.replaceAll("-", " ")}</span>)}</div>
      {showRankSeal && <span className="food-post-rank" style={foodRankStyle(rank)}><Trophy size={13} /> {rank.label}</span>}
      {shout.viewerOwned && guide && <span className="food-guide-title"><Compass size={13} /> {guide.title}</span>}
      <div className="food-engagement-bar" aria-label="Food feedback">
        <button type="button" className={feedbackMode === "rating" ? "active" : ""} onClick={() => setFeedbackMode((mode) => mode === "rating" ? null : "rating")} aria-expanded={feedbackMode === "rating"}><Star size={19} fill={shout.rating?.count ? "currentColor" : "none"} /><span><strong>{shout.rating?.count ? shout.rating.average : "Rate"}</strong><small>{shout.rating?.count ? `${shout.rating.count} rating${shout.rating.count === 1 ? "" : "s"}` : "Your taste"}</small></span></button>
        <button type="button" className={feedbackMode === "comments" ? "active" : ""} onClick={toggleComments} aria-expanded={feedbackMode === "comments"}><MessageCircle size={19} /><span><strong>{shout.commentCount || "Comment"}</strong><small>{shout.commentCount ? `${shout.commentCount} comment${shout.commentCount === 1 ? "" : "s"}` : "Say something"}</small></span></button>
        <button type="button" className={shout.viewerSaved ? "active" : ""} onClick={() => react("save")}><Bookmark size={19} fill={shout.viewerSaved ? "currentColor" : "none"} /><span><strong>{shout.viewerSaved ? "Saved" : "Save"}</strong><small>For later</small></span></button>
      </div>
      {rewardMessage && <p className="food-engagement-reward" role="status">{rewardMessage}</p>}
      {collections.length > 0 && <button type="button" className="food-collection-link" onClick={() => setCollectionPickerOpen(true)}><BookmarkPlus size={17} /><span><strong>Add to a list</strong><small>Save this find in a collection</small></span><ChevronRight size={17} /></button>}
      <AnimatePresence mode="wait">
        {feedbackMode === "rating" && <motion.section className="food-feedback-popover food-rating-popover" key="rating" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .18 }}>
          <div className="food-feedback-popover-head"><span><strong>{ratingValue === null ? "Choose your rating" : "Your rating"}</strong><small>{shout.rating?.count ? `Community average ${shout.rating.average}` : "Not rated yet · be the first"}</small></span><b>{ratingValue === null ? "—" : ratingValue.toFixed(1)}</b></div>
          <RatingPicker value={ratingValue} onChange={setRatingValue} />
          <button className="food-rating-save" type="button" disabled={ratingBusy || ratingValue === null || shout.rating?.viewerValue === ratingValue} onClick={submitRating}>{ratingBusy ? "Saving…" : ratingValue === null ? "Select a rating" : shout.rating?.viewerValue ? "Update rating" : "Save rating"}</button>
        </motion.section>}
      </AnimatePresence>
      {collectionPickerOpen && <CollectionPicker collections={collections} shoutId={shout.id} busyId={collectionBusy} onToggle={toggleCollection} onClose={() => setCollectionPickerOpen(false)} />}
      {galleryOpen && <FoodPhotoGallery gallery={gallery} activePhoto={activePhoto} onSelect={setActivePhoto} onClose={() => setGalleryOpen(false)} title={shout.title} />}
      {feedbackMode === "comments" && <BodyPortal><div className="food-comments-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) { setReplyTo(null); setFeedbackMode(null); releaseMobileFocus(); } }}><motion.section className="food-comments-modal" role="dialog" aria-modal="true" aria-label={`Comments for ${shout.title}`} key="comments" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} transition={{ duration: .2 }}>
        <div className="food-comments-modal-head"><span><small>{replyTo ? "REPLY" : "FOOD FIND"}</small><strong>{replyTo ? "Reply" : "Comments"}</strong><em>{replyTo ? "Join the conversation" : `${shout.commentCount || comments.length || 0} total`}</em></span><button type="button" onClick={() => { setReplyTo(null); setFeedbackMode(null); releaseMobileFocus(); }} aria-label={replyTo ? "Close reply" : "Close comments"}><X size={19} /></button></div>
        <section className="food-comments-modal-list" aria-label="Comments and replies"><section className="food-comments">{!commentsLoaded && <p className="food-comment-empty">Loading comments…</p>}{commentsLoaded && roots.length === 0 && <p className="food-comment-empty">No comments yet.</p>}{roots.map((item) => <div className="food-comment food-comment-anonymous" key={item.id}><div><div><span className={`food-tone ${item.tone}`}>{toneLabel(item.tone)}</span><time>{relativeTime(item.createdAt)}</time></div><p>{item.body}</p><div className="food-comment-actions"><button type="button" onClick={() => openCommentComposer(item)}>Reply</button><button type="button" onClick={async () => { await reportFoodComment(item.id, "inappropriate"); setError("Comment report received. Thank you."); }}><Flag size={12} /> Report</button>{item.viewerOwned && <button type="button" onClick={async () => { await deleteFoodComment(item.id); setComments((items) => items.filter((entry) => entry.id !== item.id && entry.parentCommentId !== item.id)); }}><Trash2 size={13} /> Delete</button>}</div>{comments.filter((reply) => reply.parentCommentId === item.id).map((reply) => <div className="food-reply" key={reply.id}><span><b>{toneLabel(reply.tone)}</b> · {relativeTime(reply.createdAt)}</span><span>{reply.body}</span></div>)}</div></div>)}</section></section>
        <form className="food-comment-form food-comments-modal-composer food-comment-quick" onSubmit={submitComment}>{replyTo && <div className="food-replying"><span><small>REPLYING TO</small><strong>“{replyTo.body.slice(0, 80)}”</strong></span><button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X size={13} /></button></div>}<div className="food-feeling-choices" aria-label="Comment feeling">{[["loved_it", "😍", "Loved it"], ["helpful", "💡", "Helpful"], ["needs_update", "⚠️", "Needs update"]].map(([value, emoji, label]) => <button type="button" className={tone === value ? "active" : ""} onClick={() => setTone(value)} aria-label={label} aria-pressed={tone === value} key={value}>{emoji}</button>)}</div><label><input id={`comment-${shout.id}`} maxLength={160} value={comment} onChange={(event) => setComment(event.target.value)} placeholder={replyTo ? "Write a reply…" : "Write a comment…"} /><button type="submit" disabled={busy || !comment.trim()} aria-label="Send comment"><Send size={18} /></button></label></form>
        {error && <p className="food-form-error" role="alert">{error}</p>}<div className="food-danger-row"><button type="button" onClick={async () => { await reportFoodShout(shout.id, "inappropriate"); setError("Report received. Thank you."); }}><Flag size={15} /> Report post</button></div>
      </motion.section></div></BodyPortal>}
      {shout.viewerOwned && <div className="food-owner-tools food-owner-tools-compact"><button type="button" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</button><button type="button" className="danger" onClick={() => setDeleteConfirm(true)}><Trash2 size={14} /> Delete</button></div>}
      {deleteConfirm && <div className="food-delete-confirm" role="alertdialog" aria-label="Delete this food find"><div><strong>Delete this find?</strong><span>It will disappear from the map.</span></div><div><button type="button" onClick={() => setDeleteConfirm(false)}>Keep it</button><button type="button" disabled={deleteBusy} onClick={removePost}>{deleteBusy ? "Deleting…" : "Delete"}</button></div></div>}
      {error && <p className="food-form-error">{error}</p>}
    </div>
  </Sheet>;
}

function FoodLocationEditor({ map, countryCode, value, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const search = async (event) => {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setBusy(true); setError("");
    const center = map?.getCenter();
    const visible = map?.getBounds();
    try {
      const payload = await searchFoodPlaces(query.trim(), {
        latitude: center?.lat,
        longitude: center?.lng,
        west: visible?.getWest(),
        south: visible?.getSouth(),
        east: visible?.getEast(),
        north: visible?.getNorth(),
        country: countryCode,
        unbounded: true,
      });
      const nextResults = payload.results || [];
      setResults(nextResults);
      if (!nextResults.length) setError("No confident match. Add the suburb or city and state, then search again.");
    } catch (nextError) { setError(nextError.message); }
    finally { setBusy(false); }
  };
  const useCurrentLocation = () => {
    if (!navigator.geolocation) return setError("Location is unavailable. Search for the store instead.");
    setBusy(true); setError("");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      onChange({ latitude: coords.latitude, longitude: coords.longitude, label: coordinateLabel(coords.latitude, coords.longitude), name: "" });
      setBusy(false);
    }, (geoError) => { setError(foodLocationErrorMessage(geoError, "Search for the store instead.")); setBusy(false); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  };
  const useMapCentre = () => {
    const center = map?.getCenter();
    if (!center) return setError("Move the map first, then try again.");
    onChange({ latitude: center.lat, longitude: center.lng, label: coordinateLabel(center.lat, center.lng), name: "" });
  };
  const mismatch = locationCountryMismatch(value, countryCode);
  return <section className="food-location-editor">
    <div className="food-location-editor-current"><MapPin size={16} /><span><strong>{value.name || "Exact map point"}</strong><small>{value.label}</small></span></div>
    {mismatch && <div className="food-country-warning"><Globe2 size={17} /><span><strong>Outside {regionShortCode(regionById(countryCode))}</strong><small>Updating is allowed. Select {mismatch.actual.toUpperCase()} in the map header to view it there.</small></span></div>}
    <form className="food-place-search" onSubmit={search}><Search size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setError(""); }} placeholder="Store + suburb or city" aria-label="Search a new store or address" /><button disabled={busy || query.trim().length < 2} aria-label="Search locations">{busy ? <span className="food-mini-spinner" /> : <Search size={16} />}</button></form>
    <small className="food-location-search-hint">For the correct branch, include suburb/city and state.</small>
    {results.length > 0 && <div className="food-place-results">{results.map((place) => <button type="button" onClick={() => onChange(place)} key={place.providerPlaceId}><MapPin size={16} /><span><strong>{placeResultName(place)}</strong><small>{placeResultLabel(place)}</small></span><ChevronRight size={15} /></button>)}</div>}
    <div className="food-location-editor-actions"><button type="button" onClick={useCurrentLocation}><LocateFixed size={16} /> I'm here</button><button type="button" onClick={useMapCentre}><Navigation size={16} /> Map centre</button>{query.trim().length > 1 && <a href={googleMapsSearchUrl(query)} target="_blank" rel="noreferrer"><Search size={15} /> Google</a>}</div>
    {error && <p className="food-form-error">{error}</p>}
  </section>;
}

function TopPicks({ shouts, onClose, onSelect }) {
  const rankedFood = useMemo(() => rankRecommended(shouts.filter((item) => item.shoutType !== "drink")).slice(0, 3), [shouts]);
  const rankedDrinks = useMemo(() => rankRecommended(shouts.filter((item) => item.shoutType === "drink")).slice(0, 3), [shouts]);
  const notRecommended = useMemo(() => rankNotRecommended(shouts).slice(0, 3), [shouts]);
  return <Sheet className="food-top-picks" onClose={onClose} label="Top food and drink picks">
    <div className="food-sheet-head"><div><span>RATED NEARBY</span><h2>Worth it—or not</h2></div><button onClick={onClose} aria-label="Close"><X /></button></div>
    <p className="food-ranking-note">Recommended requires 4.0+ stars. Below 3.0 appears under Not recommended. Unrated finds are never guessed.</p>
    <TopPickGroup title="Top food finds" icon={<Utensils size={18} />} items={rankedFood} onSelect={onSelect} />
    <TopPickGroup title="Top drinks" icon={<Coffee size={18} />} items={rankedDrinks} onSelect={onSelect} />
    <TopPickGroup title="Not recommended" icon={<Flag size={17} />} items={notRecommended} onSelect={onSelect} variant="bad" />
  </Sheet>;
}

function TopPickGroup({ title, icon, items, onSelect, variant = "good" }) {
  return <section className={`food-top-group ${variant}`}><h3>{icon}{title}</h3>{items.length === 0 ? <p>{variant === "bad" ? "No low-rated finds here." : "No 4-star picks here yet."}</p> : items.map((item, index) => <button type="button" onClick={() => onSelect(item)} key={item.id}><b>{variant === "bad" ? "!" : index + 1}</b><img src={item.imageUrl} alt="" /><span><strong>{item.title}</strong>{foodPlaceLabel(item) && <small>{foodPlaceLabel(item)}</small>}<em><Star size={12} fill="currentColor" /> {item.rating.average.toFixed(1)} · {item.rating.count} rating{item.rating.count === 1 ? "" : "s"}</em></span><ChevronRight size={18} /></button>)}</section>;
}

function FilterMenuSheet({ foodType, cuisine, budget, onApply, onNear, onRated, onClose }) {
  const [draftType, setDraftType] = useState(foodType);
  const [draftCuisine, setDraftCuisine] = useState(cuisine);
  const [draftBudget, setDraftBudget] = useState(budget);
  const [cuisineOpen, setCuisineOpen] = useState(false);
  return <Sheet className="food-filter-menu-sheet" onClose={onClose} label="Food filters">
    <div className="food-sheet-head"><div><span>DISCOVER</span><h2>Filter finds</h2></div><button type="button" onClick={onClose} aria-label="Close filters"><X /></button></div>
    <div className="food-filter-menu-section"><span>TYPE</span><div className="food-filter-menu-grid">{TYPE_FILTERS.map(([value, label]) => <button className={draftType === value ? "active" : ""} type="button" onClick={() => setDraftType(value)} key={value}>{label}</button>)}</div></div>
    <div className="food-filter-menu-section"><span>MORE</span><div className="food-filter-menu-grid"><button className={draftCuisine !== "All" ? "active" : ""} type="button" onClick={() => setCuisineOpen((value) => !value)}>{draftCuisine === "All" ? "Cuisine" : draftCuisine}<ChevronDown size={14} /></button><button className={draftBudget ? "active" : ""} type="button" onClick={() => setDraftBudget((value) => !value)}><CircleDollarSign size={15} /> Budget</button><button type="button" onClick={onNear}><LocateFixed size={15} /> Near me</button><button type="button" onClick={onRated}><Trophy size={15} /> Rated picks</button></div></div>
    {cuisineOpen && <div className="food-filter-cuisine-grid" aria-label="Cuisine choices">{CUISINES.map((item) => <button className={draftCuisine === item ? "active" : ""} type="button" onClick={() => { setDraftCuisine(item); setCuisineOpen(false); }} key={item}>{item === "All" ? "Everything" : item}</button>)}</div>}
    <button className="food-filter-done" type="button" onClick={() => onApply({ type: draftType, selectedCuisine: draftCuisine, selectedBudget: draftBudget })}>Show finds</button>
  </Sheet>;
}

function RegionSheet({ selected, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const matchesRegion = (region) => region.label.toLowerCase().includes(normalizedQuery) || region.aliases?.some((alias) => alias.toLowerCase().includes(normalizedQuery));
  const hasMatch = BROWSE_REGION_GROUPS.some(([group, regions]) => group.toLowerCase().includes(normalizedQuery) || regions.some(matchesRegion));
  return <Sheet className="food-region-sheet" onClose={onClose} label="Choose a country or region">
    <div className="food-sheet-head"><div><span>MAP REGION</span><h2>Find food around Asia</h2></div><button onClick={onClose} aria-label="Close regions"><X /></button></div>
    <label className="food-region-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search countries or regions" aria-label="Search countries or regions" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear region search"><X size={15} /></button>}</label>
    {BROWSE_REGION_GROUPS.map(([group, regions]) => {
      const visible = regions.filter((region) => !normalizedQuery || matchesRegion(region) || group.toLowerCase().includes(normalizedQuery));
      if (!visible.length) return null;
      return <section className="food-cuisine-group" key={group}><h3>{group}</h3><div className="food-cuisine-grid">{visible.map((region) => <button className={selected.id === region.id ? "active" : ""} onClick={() => onSelect(region)} key={region.id}>{region.label}</button>)}</div></section>;
    })}
    {normalizedQuery && !hasMatch && <p className="food-region-empty">No matching region.</p>}
  </Sheet>;
}

function FoodFeed({ shouts, mine, saved, onMode, onClose, onSelect }) { return <Sheet className="food-feed" onClose={onClose} label="Foodie Finds feed"><div className="food-sheet-head"><div><span>YOUR MAP</span><h2>Foodie finds</h2></div><button onClick={onClose}><X /></button></div><div className="food-feed-tabs"><button className={!mine && !saved ? "active" : ""} onClick={() => onMode("nearby")}><LocateFixed size={15} />Near me</button><button className={mine ? "active" : ""} onClick={() => onMode("mine")}><Utensils size={15} />My posts</button><button className={saved ? "active" : ""} onClick={() => onMode("saved")}><Bookmark size={15} />Saved</button></div>{shouts.length > 0 && <div className="food-feed-list">{shouts.map((shout) => <button key={shout.id} onClick={() => onSelect(shout)}><img src={shout.imageUrl} alt="" /><span><small>{shout.cuisine} · {relativeTime(shout.createdAt)}</small><strong>{shout.title}</strong>{foodPlaceLabel(shout) && <em><MapPin size={12} /> {foodPlaceLabel(shout)}</em>}</span><ChevronRight /></button>)}</div>}</Sheet>; }

function ActivitySheet({ activity, enabled, loading, onToggle, onSelect, onClose }) {
  return <Sheet className="food-activity" onClose={onClose} label="Foodie Finds notifications">
    <div className="food-sheet-head"><div><span>FOODIE FINDS</span><h2>Activity</h2></div><button type="button" onClick={onClose} aria-label="Close notifications"><X /></button></div>
    <div className="food-alert-setting"><span><strong>Alerts</strong><small>In app</small></span><button type="button" role="switch" aria-label="In-app alerts" aria-checked={enabled} className={enabled ? "on" : ""} onClick={() => onToggle(!enabled)}><i /></button></div>
    {!enabled && <div className="food-activity-empty"><Bell /><strong>Alerts off</strong></div>}
    {enabled && loading && <div className="food-activity-empty"><span className="food-photo-spinner" /><strong>Checking activity…</strong></div>}
    {enabled && !loading && activity.notifications.length === 0 && <div className="food-activity-empty"><Bell /><strong>No new replies</strong></div>}
    {enabled && !loading && activity.notifications.length > 0 && <div className="food-activity-list">{activity.notifications.map((item) => { const ratingValue = item.messageId?.startsWith("rating:") ? item.messageId.slice(7) : ""; return <button type="button" className={item.read ? "" : "unread"} onClick={() => onSelect(item)} aria-label={`${item.read ? "Read" : "Unread"} ${ratingValue ? "rating" : item.type === "reaction" ? "reaction" : "reply"}`} key={item.id}><span className="food-activity-icon">{ratingValue ? <Star size={17} /> : item.type === "reaction" ? <Heart size={17} /> : <MessageCircle size={17} />}</span><span><strong>{ratingValue ? "New rating" : item.type === "reaction" ? "New reaction" : "New reply"}{!item.read && <i className="food-unread-dot" aria-hidden="true" />}</strong><small>{ratingValue ? `${ratingValue} stars${item.contextTitle ? ` · ${item.contextTitle}` : ""}` : item.message ? `${item.contextTitle ? `${item.contextTitle}: ` : ""}${item.message}` : relativeTime(item.createdAt)}</small></span><ChevronRight size={17} /></button>; })}</div>}
    <p className="food-activity-note">In-app only</p>
  </Sheet>;
}

function ProfileSheet({ displayName, progress = emptyFoodProfileProgress(), collections = [], collectionsLoading, onClose, onSaved, onOpenCollections, onOpenFinds }) {
  const [name, setName] = useState(displayName);
  const [editingName, setEditingName] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const cleanName = name.trim().slice(0, 24);
  const nameChanged = cleanName && cleanName !== displayName;
  const rank = foodRankForLevel(progress.level);
  const releaseFocus = () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  };
  const save = () => {
    if (!cleanName) return;
    releaseFocus();
    saveDisplayName(cleanName);
    onSaved(cleanName);
    setEditingName(false);
  };
  const cancelEdit = () => { releaseFocus(); setName(displayName); setEditingName(false); };

  return <Sheet className={`food-profile rank-${rank.key}`} onClose={onClose} label="Foodie Finds profile and rank">
    <div className="food-sheet-head"><div><span>YOUR FOODIE PROFILE</span><h2>{rank.label}</h2></div><button type="button" onClick={() => { releaseFocus(); onClose(); }} aria-label="Close profile"><X /></button></div>
    <button className="food-profile-name-button" type="button" onClick={() => setEditingName(true)}><span className="food-profile-avatar" aria-hidden="true">{displayInitials(displayName)}</span><span><small>DISPLAY NAME</small><strong>{displayName}</strong></span><Pencil size={16} /></button>
    <section className="food-level-card" style={foodRankStyle(rank)} aria-label={`Level ${progress.level}, ${rank.label}`}>
      <div className="food-level-head"><span className="food-rank-gem"><i /><b>{rank.division}</b></span><div><strong>{rank.label}</strong><small>Level {progress.level} · {progress.totalXp} EXP</small><small>{progress.totalPosts == null ? "EXP from all active posts" : `${progress.totalPosts} posts counted`}</small></div><em>{progress.xpToNextLevel} EXP<br />to next</em></div>
      <div className="food-level-progress" role="progressbar" aria-label="Level progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress.progressPercent}><i style={{ width: `${progress.progressPercent}%` }} /></div>
      <div className="food-level-daily"><span><strong>Today</strong><small>{progress.daily.xp}/{progress.daily.cap} EXP</small></span><span><strong>{progress.daily.scoringPosts}/{progress.daily.postLimit}</strong><small>rewarded posts</small></span></div>
    </section>
    <FoodBadgeShelf badges={progress.badges || []} guide={progress.guide} />
    <button className="food-exp-hint" type="button" onClick={() => setRulesOpen(true)}><ListChecks size={17} /><span><strong>How to grow</strong><small>Quick EXP rules</small></span><ChevronRight size={17} /></button>
    <details className="food-xp-history"><summary><span><Clock3 size={16} /> EXP history</span><small>{progress.history.length ? `${progress.history.length} recent` : "No EXP yet"}</small><ChevronRight size={16} /></summary>{progress.history.length ? <div>{progress.history.map((item) => <article key={item.id}><span><strong>{item.title}</strong><small>{relativeTime(item.createdAt)}{item.bonuses.length ? ` · ${item.bonuses.map((bonus) => bonus.label).join(" + ")}` : item.capped ? " · Daily limit reached" : ""}</small></span><b className={item.xp ? "" : "muted"}>+{item.xp}</b></article>)}</div> : <p>Share a valid food find to earn your first EXP.</p>}</details>
    <button className="food-profile-collections" type="button" onClick={() => { releaseFocus(); onOpenCollections(); }}><BookmarkPlus size={18} /><span><strong>Collections</strong><small>{progress.totalPosts < 5 ? `Unlock at 5 finds · ${progress.totalPosts}/5` : collectionsLoading ? "Loading lists…" : collections.length ? `${collections.length} curated list${collections.length === 1 ? "" : "s"}` : "Create your first list"}</small></span><ChevronRight size={18} /></button>
    <button className="food-profile-finds" type="button" onClick={() => { releaseFocus(); onOpenFinds(); }}><Utensils size={18} /><span><strong>My posts</strong><small>See everything you shared</small></span><ChevronRight size={18} /></button>
    {editingName && <BodyPortal><div className="food-name-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) cancelEdit(); }}><form className="food-name-dialog" role="dialog" aria-modal="true" aria-label="Edit display name" onSubmit={(event) => { event.preventDefault(); save(); }}><div className="food-name-dialog-head"><span><small>YOUR PROFILE</small><strong>Edit display name</strong></span><button type="button" onClick={cancelEdit} aria-label="Close name editor"><X size={17} /></button></div><label><span>Name</span><input autoFocus value={name} maxLength={24} onChange={(event) => setName(event.target.value)} placeholder="Enter a display name" /></label><div className="food-name-dialog-actions"><button type="button" onClick={cancelEdit}>Cancel</button><button type="submit" disabled={!nameChanged}>Save</button></div></form></div></BodyPortal>}
    {rulesOpen && <BodyPortal><div className="food-exp-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setRulesOpen(false); }}><section className="food-exp-dialog" role="dialog" aria-modal="true" aria-label="How to earn EXP"><div className="food-name-dialog-head"><span><small>PROGRESS</small><strong>How to grow</strong></span><button type="button" onClick={() => setRulesOpen(false)} aria-label="Close EXP rules"><X size={17} /></button></div><p>Small, useful finds earn more when they add something new.</p><div className="food-xp-rules"><span><b>+{progress.rules.postXp}</b><small>Valid find</small></span><span><b>+{progress.rules.newAreaXp}</b><small>New area</small></span><span><b>+{progress.rules.trailXp}</b><small>3-stop trail</small></span></div><small className="food-exp-limit">First {progress.rules.dailyPostLimit} posts per day can earn EXP · daily cap {progress.rules.dailyXpCap}.</small></section></div></BodyPortal>}
  </Sheet>;
}

function BodyPortal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function FoodBadgeShelf({ badges, guide }) {
  if (!badges.length) return null;
  return <section className="food-badge-shelf" aria-label="Foodie achievements">
    <div className="food-badge-shelf-head"><span><strong>Badge shelf</strong><small>{badges.filter((badge) => badge.unlocked).length}/{badges.length} earned</small></span>{guide && <em><Compass size={13} /> {guide.title}</em>}</div>
    <div className="food-badge-row">{badges.map((badge) => <span className={`food-badge ${badge.unlocked ? "earned" : "locked"} ${badge.key}`} title={badge.hint} key={badge.key}><FoodBadgeIcon badge={badge} /><span><strong>{badge.label}</strong><small>{badge.unlocked ? "Earned" : badge.hint}</small></span></span>)}</div>
  </section>;
}

function FoodBadgeIcon({ badge }) {
  if (badge.icon === "map") return <MapIcon size={18} />;
  if (badge.icon === "heart") return <Heart size={18} fill="currentColor" />;
  if (badge.icon === "guide") return <Compass size={18} />;
  return <Utensils size={18} />;
}

function CollectionSheet({ collections, loading, progress, onCreate, onClose }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const unlocked = Number(progress.totalPosts || 0) >= 5;
  const submit = async (event) => {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true); setError("");
    try { await onCreate(title.trim()); setTitle(""); }
    catch (nextError) { setError(nextError.message); }
    finally { setBusy(false); }
  };
  return <Sheet className="food-collections-sheet" onClose={onClose} label="Your food collections">
    <div className="food-sheet-head"><div><span>CURATED LISTS</span><h2>Collections</h2></div><button type="button" onClick={onClose} aria-label="Close collections"><X /></button></div>
    {!unlocked ? <section className="food-collections-lock"><span><BookmarkPlus size={21} /></span><div><strong>Keep sharing to unlock lists</strong><small>{progress.totalPosts || 0}/5 finds · Save your best spots into a compact collection.</small></div></section> : <>
      <form className="food-collection-create" onSubmit={submit}><input value={title} maxLength={48} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Sunnybank noodle run" aria-label="Collection name" /><button type="submit" disabled={busy || !title.trim()} aria-label="Create collection"><Plus size={18} /></button></form>
      {error && <p className="food-form-error" role="alert">{error}</p>}
      {loading ? <div className="food-collections-empty"><span className="food-photo-spinner" /><strong>Loading your lists…</strong></div> : collections.length ? <div className="food-collection-list">{collections.map((collection) => <article key={collection.id}><span><Bookmark size={17} /><i>{collection.itemCount}</i></span><div><strong>{collection.title}</strong><small>{collection.itemCount ? `${collection.itemCount} saved find${collection.itemCount === 1 ? "" : "s"}` : "Ready for your first find"}</small></div><em>List</em></article>)}</div> : <div className="food-collections-empty"><BookmarkPlus size={22} /><strong>Make your first list</strong><small>Keep favourites together without cluttering the map.</small></div>}
    </>}
  </Sheet>;
}

function CollectionPicker({ collections, shoutId, busyId, onToggle, onClose }) {
  return <BodyPortal><div className="food-collection-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="food-collection-picker" role="dialog" aria-modal="true" aria-label="Add food find to a collection"><div className="food-name-dialog-head"><span><small>CURATED LISTS</small><strong>Save to a list</strong></span><button type="button" onClick={onClose} aria-label="Close collection picker"><X size={17} /></button></div><div className="food-collection-picker-list">{collections.map((collection) => { const included = collection.shoutIds?.includes(shoutId); return <button type="button" className={included ? "added" : ""} disabled={busyId === collection.id} onClick={() => onToggle(collection)} key={collection.id}><span><Bookmark size={16} fill={included ? "currentColor" : "none"} /></span><strong>{collection.title}</strong><em>{busyId === collection.id ? "Saving…" : included ? "Added" : "Add"}</em></button>; })}</div></section></div></BodyPortal>;
}

function FoodPhotoGallery({ gallery, activePhoto, onSelect, onClose, title }) {
  const total = gallery.length;
  const image = gallery[activePhoto];
  const [cleanImageUrl, setCleanImageUrl] = useState("");
  const previous = () => onSelect((activePhoto - 1 + total) % total);
  const next = () => onSelect((activePhoto + 1) % total);
  useEffect(() => {
    let cancelled = false;
    const sourceUrl = image?.url || "";
    setCleanImageUrl(sourceUrl);
    if (!sourceUrl) return undefined;
    trimGalleryBlackBars(sourceUrl).then((nextUrl) => { if (!cancelled && nextUrl) setCleanImageUrl(nextUrl); }).catch(() => {});
    return () => { cancelled = true; };
  }, [image?.url]);
  return <BodyPortal><div className="food-photo-gallery-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <motion.section className="food-photo-gallery" role="dialog" aria-modal="true" aria-label={`Photos for ${title}`} initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .98 }} transition={{ duration: .18 }}>
      {cleanImageUrl && <div className="food-photo-gallery-ambient" aria-hidden="true"><img src={cleanImageUrl} alt="" /></div>}
      <div className="food-photo-gallery-head"><span>{activePhoto + 1} of {total}</span><button type="button" onClick={onClose} aria-label="Close photo gallery"><X size={22} /></button></div>
      <motion.div className="food-photo-gallery-frame" drag={total > 1 ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={.2} onDragEnd={(_, info) => { if (info.offset.x <= -45) next(); if (info.offset.x >= 45) previous(); }}>
        {cleanImageUrl ? <motion.img key={image.objectKey || image.url || activePhoto} initial={{ opacity: .35, scale: 1.015 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .18 }} src={cleanImageUrl} alt={`${title}, photo ${activePhoto + 1}`} /> : <div className="food-photo-fallback"><Utensils size={30} /><span>Photo unavailable</span></div>}
      </motion.div>
      {total > 1 && <><button type="button" className="food-photo-gallery-nav previous" onClick={previous} aria-label="Previous photo"><ChevronLeft size={23} /></button><button type="button" className="food-photo-gallery-nav next" onClick={next} aria-label="Next photo"><ChevronRight size={23} /></button><div className="food-photo-gallery-dots" aria-label={`Photo ${activePhoto + 1} of ${total}`}>{gallery.map((item, index) => <button type="button" key={item.objectKey || item.url || index} className={index === activePhoto ? "active" : ""} onClick={() => onSelect(index)} aria-label={`Show photo ${index + 1}`} />)}</div></>}
    </motion.section>
  </div></BodyPortal>;
}

function RecentLocations({ onSelect }) { const places = readRecentLocations(); if (!places.length) return null; return <div className="food-recent-locations"><span>RECENT PLACES</span>{places.map((place, index) => <button type="button" key={`${place.latitude}-${place.longitude}-${index}`} onClick={() => onSelect(place)}><Clock3 size={15} /> {place.name || place.label}</button>)}</div>; }

function Sheet({ children, className, label, onClose }) {
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose?.(); };
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [onClose]);
  return <motion.div className="food-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.section role="dialog" aria-modal="true" aria-label={label} className={`food-sheet ${className}`} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 390, damping: 38 }}>{children}</motion.section></motion.div>;
}

function Toast({ toast, onClose }) { useEffect(() => { const timer = setTimeout(onClose, 5200); return () => clearTimeout(timer); }, [onClose]); return <div className="food-toast" role="status"><Check size={17} /><span>{toast.text}</span>{toast.action && <button onClick={() => { toast.onAction?.(); onClose(); }}>{toast.action}</button>}<button aria-label="Dismiss" onClick={onClose}><X size={16} /></button></div>; }

function StarDisplay({ value }) {
  return <span className="food-stars" aria-label={`${Number(value || 0).toFixed(1)} out of 5 stars`}>{[0, 1, 2, 3, 4].map((index) => <span className="food-star" style={{ "--star-fill": `${Math.max(0, Math.min(1, Number(value || 0) - index)) * 100}%` }} key={index}><Star size={18} /><span><Star size={18} fill="currentColor" /></span></span>)}</span>;
}

function RatingPicker({ value, onChange }) {
  return <div className="food-rating-picker" role="radiogroup" aria-label="Your food rating">{[1, 2, 3, 4, 5].map((star) => <span className="food-rating-choice" style={{ "--star-fill": `${Math.max(0, Math.min(1, Number(value || 0) - (star - 1))) * 100}%` }} key={star}><Star size={34} /><span><Star size={34} fill="currentColor" /></span><button type="button" role="radio" aria-label={`${star - .5} stars`} aria-checked={value === star - .5} onClick={() => onChange(star - .5)} /><button type="button" role="radio" aria-label={`${star} stars`} aria-checked={value === star} onClick={() => onChange(star)} /></span>)}</div>;
}

function releaseMobileFocus() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
}

async function trimGalleryBlackBars(url) {
  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) return url;
  const bitmap = await createImageBitmap(await response.blob(), { imageOrientation: "from-image" });
  try {
    const sampleScale = Math.min(1, 220 / Math.max(bitmap.width, bitmap.height));
    const sampleWidth = Math.max(1, Math.round(bitmap.width * sampleScale));
    const sampleHeight = Math.max(1, Math.round(bitmap.height * sampleScale));
    const sample = document.createElement("canvas");
    sample.width = sampleWidth; sample.height = sampleHeight;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context) return url;
    context.drawImage(bitmap, 0, 0, sampleWidth, sampleHeight);
    const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
    const isBlackRow = (row) => {
      let black = 0;
      for (let x = 0; x < sampleWidth; x += 1) {
        const offset = (row * sampleWidth + x) * 4;
        if (pixels[offset] < 13 && pixels[offset + 1] < 13 && pixels[offset + 2] < 13 && pixels[offset + 3] > 220) black += 1;
      }
      return black / sampleWidth > .985;
    };
    const isBlackColumn = (column) => {
      let black = 0;
      for (let y = 0; y < sampleHeight; y += 1) {
        const offset = (y * sampleWidth + column) * 4;
        if (pixels[offset] < 13 && pixels[offset + 1] < 13 && pixels[offset + 2] < 13 && pixels[offset + 3] > 220) black += 1;
      }
      return black / sampleHeight > .985;
    };
    const scanEdge = (length, at) => { let count = 0; while (count < length * .7 && at(count)) count += 1; return count; };
    const top = scanEdge(sampleHeight, (index) => isBlackRow(index));
    const bottom = scanEdge(sampleHeight, (index) => isBlackRow(sampleHeight - 1 - index));
    const left = scanEdge(sampleWidth, (index) => isBlackColumn(index));
    const right = scanEdge(sampleWidth, (index) => isBlackColumn(sampleWidth - 1 - index));
    if (top + bottom < sampleHeight * .06 && left + right < sampleWidth * .06) return url;
    const x = Math.round(left / sampleWidth * bitmap.width);
    const y = Math.round(top / sampleHeight * bitmap.height);
    const width = Math.round((sampleWidth - left - right) / sampleWidth * bitmap.width);
    const height = Math.round((sampleHeight - top - bottom) / sampleHeight * bitmap.height);
    if (width < bitmap.width * .45 || height < bitmap.height * .3) return url;
    const output = document.createElement("canvas");
    output.width = width; output.height = height;
    const outputContext = output.getContext("2d", { alpha: false });
    if (!outputContext) return url;
    outputContext.drawImage(bitmap, x, y, width, height, 0, 0, width, height);
    return output.toDataURL("image/jpeg", .92);
  } finally { bitmap.close?.(); }
}

function foodLocationErrorMessage(error, fallback = "You can still search or drop a pin.") {
  if (!window.isSecureContext) return "Location needs the secure website version. Open the HTTPS app link, then try again.";
  if (error?.code === 1) {
    const installed = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
    return installed
      ? `Location is blocked for this Home Screen app. In iPhone Settings, allow Location Services for this app or website, then close and reopen it. ${fallback}`
      : `Location permission is off. Allow it in Safari settings, then try again. ${fallback}`;
  }
  if (error?.code === 3) return `Location took too long. Check signal and try again. ${fallback}`;
  return `We could not get your location. ${fallback}`;
}

async function makeMapPhotoIcon(url) {
  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) throw new Error("Photo unavailable");
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement("canvas");
  const size = 72;
  canvas.width = size; canvas.height = size;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, size, size);
  context.save(); context.beginPath(); context.arc(size / 2, size / 2, 31, 0, Math.PI * 2); context.clip();
  const scale = Math.max(62 / bitmap.width, 62 / bitmap.height);
  const width = bitmap.width * scale; const height = bitmap.height * scale;
  context.drawImage(bitmap, (size - width) / 2, (size - height) / 2, width, height); context.restore();
  context.beginPath(); context.arc(size / 2, size / 2, 32, 0, Math.PI * 2); context.lineWidth = 6; context.strokeStyle = "#ffffff"; context.stroke();
  context.beginPath(); context.arc(size / 2, size / 2, 34.5, 0, Math.PI * 2); context.lineWidth = 2; context.strokeStyle = "rgba(47,33,29,.28)"; context.stroke();
  bitmap.close?.();
  return context.getImageData(0, 0, size, size);
}

function makeMapFoodIcon(emoji, background, border) {
  const canvas = document.createElement("canvas");
  canvas.width = 48; canvas.height = 48;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, 48, 48);
  context.beginPath(); context.arc(24, 24, 20, 0, Math.PI * 2);
  context.fillStyle = background; context.fill();
  context.lineWidth = 4; context.strokeStyle = "#ffffff"; context.stroke();
  context.beginPath(); context.arc(24, 24, 17.5, 0, Math.PI * 2);
  context.lineWidth = 2; context.strokeStyle = border; context.stroke();
  context.font = '22px -apple-system,BlinkMacSystemFont,"Segoe UI Emoji",sans-serif';
  context.textAlign = "center"; context.textBaseline = "middle";
  context.fillText(emoji, 24, 25);
  return context.getImageData(0, 0, 48, 48);
}

function emptyGeoJson() { return { type: "FeatureCollection", features: [] }; }
function uniqueFoodShouts(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
function mergeFoodShouts(current, incoming) {
  const fresh = uniqueFoodShouts(incoming);
  const freshIds = new Set(fresh.map((item) => item.id));
  return [...fresh, ...current.filter((item) => !freshIds.has(item.id))].slice(0, 500);
}
function shoutInsideBounds(shout, bounds) { return Number(shout.latitude) >= bounds.south && Number(shout.latitude) <= bounds.north && Number(shout.longitude) >= bounds.west && Number(shout.longitude) <= bounds.east; }
function readBounds(map) { const value = map.getBounds(); return { west: round(value.getWest()), south: round(value.getSouth()), east: round(value.getEast()), north: round(value.getNorth()) }; }
function expandBounds(bounds, ratio = .4) {
  const longitudePadding = Math.max(.01, (bounds.east - bounds.west) * ratio / 2);
  const latitudePadding = Math.max(.01, (bounds.north - bounds.south) * ratio / 2);
  return {
    west: round(Math.max(-180, bounds.west - longitudePadding)),
    south: round(Math.max(-90, bounds.south - latitudePadding)),
    east: round(Math.min(180, bounds.east + longitudePadding)),
    north: round(Math.min(90, bounds.north + latitudePadding)),
  };
}
function foodAreaCacheKey(bounds, filters) {
  const grid = (value) => (Math.round(Number(value) * 50) / 50).toFixed(2);
  return [grid(bounds.west), grid(bounds.south), grid(bounds.east), grid(bounds.north), filters.cuisine, filters.foodType, filters.budget ? 1 : 0, filters.mine ? 1 : 0, filters.saved ? 1 : 0].join(":");
}
function trimFoodAreaCache(cache) { while (cache.size > 40) cache.delete(cache.keys().next().value); }
function round(value) { return Math.round(value * 100000) / 100000; }
function photoIconName(id) { return `food-photo-${String(id).replace(/[^a-z0-9-]/gi, "")}`; }
function fallbackFoodIcon(type) { return type === "drink" || type === "cafe" ? "food-icon-drink" : type === "snack" ? "food-icon-snack" : type === "dessert" ? "food-icon-dessert" : type === "market" ? "food-icon-market" : "food-icon-default"; }
function googleMapsSearchUrl(place) { const query = typeof place === "string" ? place.trim() : place?.placeName || place?.name ? `${place.placeName || place.name}${place.locationLabel || place.label ? `, ${place.locationLabel || place.label}` : ""}` : Number.isFinite(place?.latitude) && Number.isFinite(place?.longitude) ? `${place.latitude},${place.longitude}` : "restaurants"; return `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query })}`; }
function parseSharedMapLocation(value) { const raw = String(value || "").trim(); if (!raw) return null; let text = raw; try { text = decodeURIComponent(raw); } catch { /* keep the original text */ } const dataMatch = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i); const atMatch = text.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/); const queryMatch = text.match(/[?&](?:query|q|ll)=(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/i); const rawMatch = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*$/); const match = dataMatch || atMatch || queryMatch || rawMatch; if (!match) return null; const latitude = Number(match[1]); const longitude = Number(match[2]); if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null; const placeMatch = text.match(/\/place\/([^/@?]+)/i); const name = placeMatch ? placeMatch[1].replaceAll("+", " ").trim() : ""; return { latitude, longitude, name, label: coordinateLabel(latitude, longitude) }; }
function typeLabel(value) { return TYPES.find(([key]) => key === value)?.[1] || "Food find"; }
function coordinateLabel(latitude, longitude) { return `${Math.abs(latitude).toFixed(6)}° ${latitude < 0 ? "S" : "N"}, ${Math.abs(longitude).toFixed(6)}° ${longitude < 0 ? "W" : "E"}`; }
function placeResultName(place) { return [place?.name, place?.secondaryName].filter(Boolean).join(" · "); }
function placeResultLabel(place) {
  const distance = Number.isFinite(place?.distanceKm) ? place.distanceKm < 1 ? `${Math.max(1, Math.round(place.distanceKm * 1000))} m` : `${place.distanceKm.toFixed(1)} km` : "";
  const quality = Number(place?.confidence) >= .8 ? "Strong match" : Number(place?.confidence) >= .65 ? "Good match" : Number.isFinite(Number(place?.confidence)) ? "Possible match" : "";
  return [quality, distance, place?.label].filter(Boolean).join(" · ");
}
function foodShareUrl(id) { const url = new URL(window.location.href); url.searchParams.set("page", "shout-outs"); url.searchParams.set("find", id); return url.toString(); }
function regionById(id) { return ALL_BROWSE_REGIONS.find((region) => region.id === id) || ALL_BROWSE_REGIONS[0]; }
function regionShortCode(region) { return region?.id === "au" ? "AUS" : String(region?.id || "").toUpperCase(); }
function regionFlag(id) {
  if (id === "hk") return "🇭🇰🇨🇳";
  if (id === "tw") return "🇨🇳";
  if (id === "mo") return "🇲🇴🇨🇳";
  return /^[a-z]{2}$/i.test(id || "") ? String(id).toUpperCase().replace(/[A-Z]/g, (letter) => String.fromCodePoint(127397 + letter.charCodeAt(0))) : "🌏";
}
function inferLocationRegionId(location) {
  if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return null;
  let actual = String(location.countryCode || "").toLowerCase();
  if (!actual) {
    const latitude = location.latitude;
    const longitude = location.longitude;
    if (latitude >= -44.5 && latitude <= -9 && longitude >= 112 && longitude <= 154.5) actual = "au";
    else actual = ALL_BROWSE_REGIONS.reduce((closest, region) => {
      const distance = (latitude - region.center[1]) ** 2 + ((longitude - region.center[0]) * Math.cos(latitude * Math.PI / 180)) ** 2;
      return !closest || distance < closest.distance ? { id: region.id, distance } : closest;
    }, null)?.id || "";
  }
  return actual;
}
function locationCountryMismatch(location, selectedCountry) {
  const actual = inferLocationRegionId(location);
  return actual && actual !== selectedCountry ? { actual, selected: selectedCountry } : null;
}
function foodPlaceLabel(shout) { const value = String(shout.placeName || "").trim(); if (!value || /^(current|chosen|pinned|dropped) location$/i.test(value) || /^[-+]?\d+(?:\.\d+)?(?:°|\s*,)/.test(value) || /\d+(?:\.\d+)?°\s*[NS].*\d+(?:\.\d+)?°\s*[EW]/i.test(value)) return ""; return value; }
function relativeTime(value) { const seconds = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return "just now"; if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`; if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`; return `${Math.floor(seconds / 86400)}d ago`; }
function formatBytes(value) { return value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`; }
function avatarText(id) { return ["◡", "ᴗ", "•", "✦"][id.charCodeAt(0) % 4]; }
function rankRecommended(items) { return items.filter((item) => Number(item.rating?.count || 0) > 0 && Number(item.rating?.average || 0) >= 4).sort((a, b) => Number(b.rating.average) - Number(a.rating.average) || Number(b.rating.count) - Number(a.rating.count) || new Date(b.createdAt) - new Date(a.createdAt)); }
function rankNotRecommended(items) { return items.filter((item) => Number(item.rating?.count || 0) > 0 && Number(item.rating?.average || 0) < 3).sort((a, b) => Number(a.rating.average) - Number(b.rating.average) || Number(b.rating.count) - Number(a.rating.count) || new Date(b.createdAt) - new Date(a.createdAt)); }
function toneLabel(tone) { return tone === "loved_it" ? "Loved it" : tone === "needs_update" ? "Needs update" : "Helpful"; }
function readDisplayName() { try { const saved = localStorage.getItem(DISPLAY_NAME_KEY); if (saved) return saved; const first = ["Noodle", "Mango", "Chilli", "Bento", "Mochi"][Math.floor(Math.random() * 5)]; const second = ["Fox", "Otter", "Koala", "Panda", "Gecko"][Math.floor(Math.random() * 5)]; const value = `${first} ${second}`; localStorage.setItem(DISPLAY_NAME_KEY, value); return value; } catch { return "Food explorer"; } }
function emptyFoodProfileProgress() { return { totalXp: 0, totalPosts: 0, level: 1, title: "Bronze IV", currentLevelXp: 0, nextLevelXp: 50, xpToNextLevel: 50, progressPercent: 0, daily: { xp: 0, cap: 120, scoringPosts: 0, postLimit: 5 }, rules: { postXp: 20, newAreaXp: 10, trailXp: 5, trailMinutes: 30, dailyPostLimit: 5, dailyXpCap: 120 }, guide: null, badges: [{ key: "first-bite", label: "First bite", hint: "Share your first find", icon: "bite", unlocked: false }, { key: "map-muncher", label: "Map muncher", hint: "Share 5 food finds", icon: "map", unlocked: false }, { key: "crowd-pleaser", label: "Crowd pleaser", hint: "Earn 4.5+ from 3 ratings", icon: "heart", unlocked: false }, { key: "local-guide", label: "Local guide", hint: "Share 3 finds in one area", icon: "guide", unlocked: false }], history: [] }; }
function saveDisplayName(value) { try { const clean = value.trim().slice(0, 24); if (clean) localStorage.setItem(DISPLAY_NAME_KEY, clean); } catch { /* optional */ } }
function readActivityEnabled() { try { return localStorage.getItem(ACTIVITY_ENABLED_KEY) !== "0"; } catch { return true; } }
function displayInitials(value) { const parts = String(value || "ME").trim().split(/\s+/).filter(Boolean); return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "ME"; }
function readDraft() { try { return { title: "", caption: "", priceText: "", cuisine: "Other", shoutType: "dish", vibeTags: [], ...JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") }; } catch { return { title: "", caption: "", priceText: "", cuisine: "Other", shoutType: "dish", vibeTags: [] }; } }
function toggleVibe(current, vibe) { if (current.includes(vibe)) return current.filter((item) => item !== vibe); if (current.length >= 3) return current; return [...current, vibe]; }
function readRecentLocations() { try { return JSON.parse(localStorage.getItem(RECENT_LOCATIONS_KEY) || "[]").slice(0, 4); } catch { return []; } }
function saveRecentLocation(location) { try { const current = readRecentLocations().filter((item) => Math.abs(item.latitude - location.latitude) > .00001 || Math.abs(item.longitude - location.longitude) > .00001); localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify([location, ...current].slice(0, 5))); } catch { /* storage is optional */ } }
function readFoodMapView() {
  try {
    const view = JSON.parse(localStorage.getItem(FOOD_MAP_VIEW_KEY) || "null");
    const longitude = Number(view?.longitude);
    const latitude = Number(view?.latitude);
    const zoom = Number(view?.zoom);
    if (!Number.isFinite(longitude) || Math.abs(longitude) > 180 || !Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(zoom) || zoom < 2.4 || zoom > 19) return null;
    return { longitude, latitude, zoom, regionId: regionById(view?.regionId).id };
  } catch { return null; }
}
function recentFoodMapView() {
  const location = readRecentLocations()[0];
  if (!location || !Number.isFinite(Number(location.longitude)) || !Number.isFinite(Number(location.latitude))) return null;
  return { longitude: Number(location.longitude), latitude: Number(location.latitude), zoom: 15, regionId: inferLocationRegionId(location) || "au" };
}
function saveFoodMapView(map, regionId) {
  try {
    const center = map?.getCenter();
    const zoom = map?.getZoom();
    if (!Number.isFinite(center?.lng) || !Number.isFinite(center?.lat) || !Number.isFinite(zoom)) return;
    localStorage.setItem(FOOD_MAP_VIEW_KEY, JSON.stringify({
      longitude: Math.round(center.lng * 10000) / 10000,
      latitude: Math.round(center.lat * 10000) / 10000,
      zoom: Math.round(zoom * 100) / 100,
      regionId: regionById(regionId).id,
    }));
  } catch { /* storage is optional */ }
}
