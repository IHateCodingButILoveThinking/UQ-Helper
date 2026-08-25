import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  ArrowLeft,
  Bookmark,
  Camera,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Coffee,
  Flag,
  Heart,
  LocateFixed,
  MapPin,
  MessageCircle,
  Navigation,
  Pencil,
  Plus,
  Radar,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
  Trophy,
  Utensils,
  X,
} from "lucide-react";

import { compressFoodImage } from "../lib/image-compression";
import {
  createFoodComment,
  createFoodShout,
  deleteFoodComment,
  deleteFoodShout,
  listFoodComments,
  listFoodShouts,
  markFoodTried,
  reportFoodComment,
  reportFoodShout,
  searchFoodPlaces,
  toggleFoodReaction,
  uploadFoodImage,
  updateFoodShout,
  verifyFoodShout,
} from "../lib/food-shout-api";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_CENTER = [153.0133, -27.4971];
const CUISINES = ["All", "Chinese", "Singaporean", "Australian", "Japanese", "Korean", "Malaysian", "Indonesian", "Other"];
const TYPES = [
  ["dish", "Dish worth ordering"], ["drink", "Drink worth trying"], ["restaurant_find", "Hidden food spot"],
  ["market", "Food market"], ["cafe", "Cafe find"], ["dessert", "Sweet find"], ["deal", "Budget find"], ["other", "Food moment"],
];
const VIBES = ["study-friendly", "quick-grab", "group-friendly", "quiet", "lively", "late-night", "takeaway-friendly", "solo-friendly"];
const DRAFT_KEY = "uq-food-shout-draft-v1";
const RECENT_LOCATIONS_KEY = "uq-food-recent-locations-v1";
const DISPLAY_NAME_KEY = "uq-food-display-name-v1";

export default function FoodShoutPage({ onHome }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const selectedRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [bounds, setBounds] = useState(null);
  const [pendingBounds, setPendingBounds] = useState(null);
  const [shouts, setShouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [topOpen, setTopOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(() => readDisplayName());
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [cuisine, setCuisine] = useState("All");
  const [budget, setBudget] = useState(false);
  const [mine, setMine] = useState(false);
  const [saved, setSaved] = useState(false);
  const [locating, setLocating] = useState(false);
  const [toast, setToast] = useState(null);

  selectedRef.current = selected;

  const fetchVisible = useCallback(async (nextBounds = bounds, signal) => {
    if (!nextBounds) return;
    setLoading(true);
    setLoadError("");
    try {
      const payload = await listFoodShouts({
        bounds: nextBounds,
        cuisine,
        query: submittedQuery,
        budget,
        mine,
        saved,
        signal,
      });
      setShouts(payload.shouts || []);
      setBounds(nextBounds);
      setPendingBounds(null);
    } catch (error) {
      if (error.name !== "AbortError") setLoadError(error.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [bounds, budget, cuisine, mine, saved, submittedQuery]);

  useEffect(() => {
    if (!bounds) return undefined;
    const controller = new AbortController();
    fetchVisible(bounds, controller.signal);
    return () => controller.abort();
  }, [budget, cuisine, mine, saved, submittedQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return undefined;
    let cancelled = false;
    let map;
    let pulseFrame;
    import("maplibre-gl").then(({ default: maplibregl }) => {
      if (cancelled) return;
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLE,
        center: DEFAULT_CENTER,
        zoom: 13,
        minZoom: 2.4,
        maxZoom: 19,
        attributionControl: false,
        powerPreference: "high-performance",
      });
      mapRef.current = map;
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
      map.on("load", () => {
        if (cancelled) return;
        map.addSource("food-shouts", { type: "geojson", data: emptyGeoJson(), cluster: true, clusterRadius: 52, clusterMaxZoom: 15 });
        map.addLayer({
          id: "food-clusters", type: "circle", source: "food-shouts", filter: ["has", "point_count"],
          paint: { "circle-color": "#ff7043", "circle-radius": ["step", ["get", "point_count"], 22, 10, 27, 30, 32], "circle-stroke-width": 4, "circle-stroke-color": "#fff" },
        });
        map.addLayer({
          id: "food-cluster-count", type: "symbol", source: "food-shouts", filter: ["has", "point_count"],
          layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 13 }, paint: { "text-color": "#fff" },
        });
        map.addLayer({
          id: "food-active-pulse", type: "circle", source: "food-shouts", filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "active"], 1]],
          paint: { "circle-color": "#ff7043", "circle-radius": 21, "circle-opacity": .2, "circle-stroke-width": 1, "circle-stroke-color": "#fff" },
        });
        map.addLayer({
          id: "food-pins", type: "circle", source: "food-shouts", filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": ["case", ["==", ["get", "selected"], 1], "#ff7043", "#fff8ef"],
            "circle-radius": ["case", ["==", ["get", "selected"], 1], 16, 13],
            "circle-stroke-width": 4,
            "circle-stroke-color": ["match", ["get", "type"], "dessert", "#c466d8", "drink", "#2c94b5", "market", "#6b8e42", "#ff7043"],
          },
        });
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
            if (cancelled || !map.getLayer("food-active-pulse")) return;
            const phase = (Math.sin(time / 520) + 1) / 2;
            map.setPaintProperty("food-active-pulse", "circle-radius", 18 + phase * 10);
            map.setPaintProperty("food-active-pulse", "circle-opacity", .28 - phase * .2);
            pulseFrame = requestAnimationFrame(animatePulse);
          };
          pulseFrame = requestAnimationFrame(animatePulse);
        }
        const initial = readBounds(map);
        setBounds(initial);
        fetchVisible(initial);
        setMapReady(true);
      });
      map.on("moveend", () => {
        if (!map.loaded()) return;
        const next = readBounds(map);
        setPendingBounds(next);
      });
      map.on("error", () => setMapError("The map could not finish loading. Check your connection and try again."));
    }).catch(() => setMapError("The map is unavailable in this browser."));
    return () => { cancelled = true; if (pulseFrame) cancelAnimationFrame(pulseFrame); map?.remove(); mapRef.current = null; };
  }, []);

  const shoutsRef = useRef(shouts);
  shoutsRef.current = shouts;
  useEffect(() => {
    const source = mapRef.current?.getSource("food-shouts");
    if (!source) return;
    source.setData({
      type: "FeatureCollection",
      features: shouts.map((shout) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [shout.longitude, shout.latitude] },
        properties: { id: shout.id, type: shout.shoutType, selected: shout.id === selected?.id ? 1 : 0, active: Date.now() - new Date(shout.createdAt).getTime() < 24 * 60 * 60 * 1000 ? 1 : 0 },
      })),
    });
  }, [selected?.id, shouts]);

  const locate = () => {
    if (!navigator.geolocation) return setToast({ text: "Location is not supported by this browser." });
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        mapRef.current?.easeTo({ center: [coords.longitude, coords.latitude], zoom: 15, duration: 500 });
        setLocating(false);
      },
      (error) => {
        const message = error.code === 1
          ? "Location is off. In iPhone Settings, allow Safari location, then try again."
          : "We could not get your location. You can still search or pin the map.";
        setToast({ text: message });
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 9000, maximumAge: 120000 },
    );
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setSubmittedQuery(query.trim());
  };

  const refreshAfterCreate = async (shout) => {
    setComposerOpen(false);
    setSelected(shout);
    mapRef.current?.easeTo({ center: [shout.longitude, shout.latitude], zoom: 15, duration: 420 });
    const next = readBounds(mapRef.current);
    await fetchVisible(next);
    setToast({ text: "Food find posted", action: "Undo", onAction: async () => { await deleteFoodShout(shout.id); setSelected(null); fetchVisible(next); } });
  };

  return (
    <section className="food-page" aria-label="Foodie Finds map">
      <header className="food-topbar">
        <button className="food-icon-button" type="button" onClick={onHome} aria-label="Back to home"><ArrowLeft size={21} /></button>
        <div className="food-title"><span className="food-title-mark"><Utensils size={20} /></span><div><h1>Foodie Finds</h1><p>What people actually ate</p></div></div>
        <button className="food-avatar-button" type="button" onClick={() => setProfileOpen(true)} aria-label={`Edit profile for ${profileName}`}>{displayInitials(profileName)}</button>
      </header>

      <div className="food-map-shell">
        <div ref={mapContainerRef} className="food-map" aria-label="Interactive food discovery map" />
        <form className="food-search" onSubmit={submitSearch}>
          <Search size={18} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search dishes, markets, cheap eats" aria-label="Search Foodie Finds" />
          {query && <button type="button" onClick={() => { setQuery(""); setSubmittedQuery(""); }} aria-label="Clear search"><X size={17} /></button>}
        </form>

        <div className="food-filter-row" aria-label="Food filters">
          <button className={cuisine !== "All" ? "active" : ""} onClick={() => setFilterOpen(true)} type="button"><SlidersHorizontal size={15} /> {cuisine === "All" ? "Cuisine" : cuisine}</button>
          <button className={budget ? "active" : ""} onClick={() => setBudget((value) => !value)} type="button"><CircleDollarSign size={15} /> Budget</button>
          <button onClick={() => setFeedOpen(true)} type="button"><Radar size={15} strokeWidth={2.2} /> Near me</button>
          <button onClick={() => setTopOpen(true)} type="button"><Trophy size={15} /> Top picks</button>
        </div>

        {pendingBounds && mapReady && <button className="food-area-search" type="button" onClick={() => fetchVisible(pendingBounds)}><Search size={15} /> Search this area</button>}
        <div className="food-map-actions">
          <button type="button" onClick={locate} aria-label="Find my location" className={locating ? "loading" : ""}><LocateFixed size={21} /></button>
          <button type="button" onClick={() => setComposerOpen(true)} className="food-post-fab"><Plus size={23} /> Post</button>
        </div>

        {loading && <div className="food-map-status">Finding good food…</div>}
        {(mapError || loadError) && <div className="food-map-error"><span>{mapError || loadError}</span><button type="button" onClick={() => fetchVisible(pendingBounds || bounds)}>Try again</button></div>}
        {!loading && !loadError && shouts.length === 0 && <div className="food-empty-map"><Camera size={24} /><strong>No finds here yet</strong><span>Be the first to share what you ate.</span></div>}
      </div>

      <AnimatePresence>
        {selected && <FoodDetail key={selected.id} shout={selected} onClose={() => setSelected(null)} onChange={(next) => { setSelected(next); setShouts((items) => items.map((item) => item.id === next.id ? next : item)); }} onDeleted={() => { setSelected(null); fetchVisible(bounds); }} />}
        {composerOpen && <FoodComposer map={mapRef.current} onClose={() => setComposerOpen(false)} onCreated={refreshAfterCreate} />}
        {filterOpen && <FilterSheet cuisine={cuisine} onCuisine={(value) => { setCuisine(value); setFilterOpen(false); }} onClose={() => setFilterOpen(false)} />}
        {feedOpen && <FoodFeed shouts={shouts} mine={mine} saved={saved} onMode={(mode) => { setMine(mode === "mine"); setSaved(mode === "saved"); }} onClose={() => { setFeedOpen(false); setMine(false); setSaved(false); }} onSelect={(shout) => { setSelected(shout); setFeedOpen(false); }} />}
        {topOpen && <TopPicks shouts={shouts} onClose={() => setTopOpen(false)} onSelect={(shout) => { setSelected(shout); setTopOpen(false); }} />}
        {profileOpen && <ProfileSheet displayName={profileName} onClose={() => setProfileOpen(false)} onSaved={(name) => { setProfileName(name); setProfileOpen(false); setToast({ text: "Nickname saved" }); }} onOpenFinds={() => { setProfileOpen(false); setMine(true); setSaved(false); setFeedOpen(true); }} />}
      </AnimatePresence>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </section>
  );
}

function FoodComposer({ map, onClose, onCreated }) {
  const fileRef = useRef(null);
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState([]);
  const [location, setLocation] = useState(null);
  const [locationMode, setLocationMode] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [form, setForm] = useState(() => readDraft());
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);
  const [progress, setProgress] = useState(0);
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
    try {
      const prepared = [];
      for (const file of files) prepared.push(await compressFoodImage(file));
      setPhotos((current) => [...current, ...prepared]);
    }
    catch (nextError) { setError(nextError.message); }
    finally { if (fileRef.current) fileRef.current.value = ""; }
  };

  const removePhoto = (index) => {
    setPhotos((current) => {
      URL.revokeObjectURL(current[index].previewUrl);
      return current.filter((_, photoIndex) => photoIndex !== index);
    });
  };

  const currentLocation = () => {
    setError("");
    if (!navigator.geolocation) return setError("Location is not supported. Search or choose the map instead.");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const next = { latitude: coords.latitude, longitude: coords.longitude, label: coordinateLabel(coords.latitude, coords.longitude) };
      setLocation(next); setLocationMode("current"); setStep(3);
      saveRecentLocation(next);
    }, (geoError) => {
      setError(geoError.code === 1 ? "Location permission is off. Search a past place or pick the map manually." : "Location was unavailable. Search or pick manually.");
    }, { enableHighAccuracy: false, timeout: 9000, maximumAge: 120000 });
  };

  const searchLocation = async (event) => {
    event.preventDefault();
    setSearching(true); setError("");
    try { setSearchResults((await searchFoodPlaces(locationSearch)).results || []); }
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

  const publish = async () => {
    if (photos.length < 1 || photos.length > 3 || !location || !form.title.trim()) return setError("Add 1–3 photos, a title, and a location.");
    setPosting(true); setError("");
    try {
      const id = crypto.randomUUID();
      const uploads = [];
      for (let index = 0; index < photos.length; index += 1) {
        const upload = await uploadFoodImage({
          ...photos[index],
          postId: id,
          onProgress: (photoProgress) => setProgress(Math.round(((index + photoProgress / 100) / photos.length) * 100)),
        });
        uploads.push(upload);
      }
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
    finally { setPosting(false); }
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
      <div className="food-sheet-head"><div><span>STEP {step} OF 3</span><h2>{step === 1 ? "Share a food find" : step === 2 ? "Where was it?" : "Make it useful"}</h2></div><button type="button" onClick={onClose} aria-label="Close"><X /></button></div>
      <div className="food-progress"><i style={{ width: `${step / 3 * 100}%` }} /></div>
      {step === 1 && <div className="food-photo-step">
        <div className="food-photo-limit-head"><strong>Photos</strong><span>{photos.length} / 3 max</span></div>
        <div className="food-photo-limit" aria-label={`${photos.length} of 3 photos selected`}><i style={{ width: `${photos.length / 3 * 100}%` }} /><b aria-hidden="true" /></div>
        {photos.length > 0 && <div className="food-photo-grid">{photos.map((photo, index) => <figure key={photo.previewUrl}><img src={photo.previewUrl} alt={`Selected food ${index + 1}`} /><button type="button" onClick={() => removePhoto(index)} aria-label={`Remove photo ${index + 1}`}><X size={16} /></button><span>{index + 1}</span></figure>)}</div>}
        {photos.length < 3 && <button className="food-photo-picker" type="button" onClick={() => fileRef.current?.click()}>
          <span><Camera size={28} /></span><strong>{photos.length ? "Add another photo" : "Take or choose photos"}</strong><small>At least 1 · maximum 3</small>
        </button>}
        <input ref={fileRef} hidden multiple type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(event) => choosePhotos(event.target.files)} />
        {photos.length > 0 && <button className="food-primary" type="button" onClick={() => setStep(2)}>Continue <ChevronRight size={18} /></button>}
      </div>}
      {step === 2 && <div className="food-location-step">
        <button className="food-choice" type="button" onClick={currentLocation}><LocateFixed /><span><strong>Use where I am now</strong><small>Fastest for something you just ate</small></span><ChevronRight /></button>
        <form className="food-place-search" onSubmit={searchLocation}><Search size={18} /><input value={locationSearch} onChange={(event) => setLocationSearch(event.target.value)} placeholder="Search a place you visited" /><button type="submit" disabled={searching}>{searching ? "…" : "Go"}</button></form>
        {searchResults.length > 0 && <div className="food-place-results">{searchResults.map((place) => <button type="button" key={place.providerPlaceId} onClick={() => { setLocation(place); setLocationMode("search"); setStep(3); saveRecentLocation(place); }}><MapPin size={17} /><span><strong>{place.name}</strong><small>{place.label}</small></span></button>)}</div>}
        <button className="food-choice" type="button" onClick={() => setManualPicking(true)}><Navigation /><span><strong>Place an exact map pin</strong><small>Move and zoom before you confirm</small></span><ChevronRight /></button>
        <RecentLocations onSelect={(place) => { setLocation(place); setLocationMode("recent"); setStep(3); }} />
        <p className="food-attribution">Place search © OpenStreetMap contributors</p>
      </div>}
      {step === 3 && <div className="food-details-step">
        <div className="food-compose-summary"><img src={photos[0]?.previewUrl} alt="" /><div><strong>{location?.name || location?.label}</strong><small><MapPin size={13} /> {photos.length} photo{photos.length === 1 ? "" : "s"} · {locationMode === "current" ? "Current location" : locationMode === "manual" ? "Map pin" : "Chosen place"}</small></div><button type="button" onClick={() => setStep(2)}>Change</button></div>
        <label>What did you find? <input maxLength={80} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Amazing beef noodles" /></label>
        <label>Your display name <input maxLength={24} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="e.g. Noodle Fox" /><small className="food-field-help">Use a nickname, or keep the random one.</small></label>
        <label>Tell people about it <textarea maxLength={280} rows={3} value={form.caption} onChange={(event) => setForm({ ...form, caption: event.target.value })} placeholder="What made it worth finding?" /></label>
        <div className="food-field-grid"><label>Price <input maxLength={40} value={form.priceText} onChange={(event) => setForm({ ...form, priceText: event.target.value })} placeholder="$12" /></label><label>Cuisine <select value={form.cuisine} onChange={(event) => setForm({ ...form, cuisine: event.target.value })}>{CUISINES.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label></div>
        <label>Type <select value={form.shoutType} onChange={(event) => setForm({ ...form, shoutType: event.target.value })}>{TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <fieldset><legend>Good for <small>up to 3</small></legend><div className="food-vibes">{VIBES.map((vibe) => <button type="button" className={form.vibeTags.includes(vibe) ? "active" : ""} onClick={() => setForm({ ...form, vibeTags: toggleVibe(form.vibeTags, vibe) })} key={vibe}>{vibe.replaceAll("-", " ")}</button>)}</div></fieldset>
        <button className="food-primary" disabled={posting || !form.title.trim()} type="button" onClick={publish}>{posting ? `Uploading ${progress}%` : "Share find"} <Send size={18} /></button>
        {posting && <div className="food-upload-progress" role="progressbar" aria-label="Photo upload progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}><i style={{ width: `${progress}%` }} /></div>}
      </div>}
      {error && <p className="food-form-error" role="alert">{error}</p>}
    </Sheet>
  );
}

function FoodDetail({ shout, onClose, onChange, onDeleted }) {
  const gallery = shout.images?.length ? shout.images : [{ url: shout.imageUrl }];
  const [activePhoto, setActivePhoto] = useState(0);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [displayName, setDisplayName] = useState(() => readDisplayName());
  const [tone, setTone] = useState("helpful");
  const [editing, setEditing] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editForm, setEditForm] = useState(() => ({
    title: shout.title,
    caption: shout.caption,
    displayName: shout.displayName || readDisplayName(),
    priceText: shout.priceText || "",
    cuisine: shout.cuisine,
    shoutType: shout.shoutType,
    vibeTags: shout.vibeTags || [],
  }));
  useEffect(() => { const controller = new AbortController(); listFoodComments(shout.id, controller.signal).then((data) => setComments(data.comments || [])).catch(() => {}); return () => controller.abort(); }, [shout.id]);
  const react = async (kind) => {
    const activeKey = kind === "like" ? "viewerLiked" : "viewerSaved";
    const countKey = kind === "like" ? "likeCount" : "saveCount";
    try { const result = await toggleFoodReaction(shout.id, kind, shout[activeKey]); onChange({ ...shout, [activeKey]: result.active, [countKey]: result.count }); } catch (nextError) { setError(nextError.message); }
  };
  const submitComment = async (event) => {
    event.preventDefault(); if (!comment.trim()) return;
    setBusy(true); setError("");
    try { const result = await createFoodComment(shout.id, comment.trim(), replyTo?.id, displayName.trim() || readDisplayName(), tone); saveDisplayName(displayName); setComments((items) => [...items, result.comment]); setComment(""); setReplyTo(null); onChange({ ...shout, commentCount: shout.commentCount + 1 }); }
    catch (nextError) { setError(nextError.message); } finally { setBusy(false); }
  };
  const roots = comments.filter((item) => !item.parentCommentId);
  const saveEdit = async () => {
    if (!editForm.title.trim()) return setError("Keep a short title for this food find.");
    setEditBusy(true); setError("");
    try {
      const payload = await updateFoodShout(shout.id, editForm);
      onChange(payload.shout);
      saveDisplayName(editForm.displayName);
      setEditing(false);
    } catch (nextError) { setError(nextError.message); }
    finally { setEditBusy(false); }
  };
  return <Sheet className="food-detail" onClose={onClose} label={shout.title}>
    <div className="food-detail-photo"><img src={gallery[activePhoto]?.url || shout.imageUrl} alt={`${shout.title}${gallery.length > 1 ? `, photo ${activePhoto + 1}` : ""}`} /><button type="button" onClick={onClose} aria-label="Close"><X /></button><span>{typeLabel(shout.shoutType)}</span>{gallery.length > 1 && <div className="food-gallery-dots" aria-label="Choose photo">{gallery.map((image, index) => <button type="button" className={index === activePhoto ? "active" : ""} onClick={() => setActivePhoto(index)} key={image.objectKey || index} aria-label={`Show photo ${index + 1}`} />)}</div>}</div>
    <div className="food-detail-body">
      <div className="food-detail-kicker"><span>{shout.cuisine}</span><span>·</span><span>{shout.displayName || "Food explorer"}</span><span>·</span><span><Clock3 size={13} /> {relativeTime(shout.createdAt)}</span></div>
      {editing ? <div className="food-inline-edit">
        <label>Title<input maxLength={80} value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} /></label>
        <label>Caption<textarea rows={3} maxLength={280} value={editForm.caption} onChange={(event) => setEditForm({ ...editForm, caption: event.target.value })} /></label>
        <div className="food-field-grid"><label>Name<input maxLength={24} value={editForm.displayName} onChange={(event) => setEditForm({ ...editForm, displayName: event.target.value })} /></label><label>Price<input maxLength={40} value={editForm.priceText} onChange={(event) => setEditForm({ ...editForm, priceText: event.target.value })} /></label></div>
        <div className="food-field-grid"><label>Cuisine<select value={editForm.cuisine} onChange={(event) => setEditForm({ ...editForm, cuisine: event.target.value })}>{CUISINES.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label><label>Kind<select value={editForm.shoutType} onChange={(event) => setEditForm({ ...editForm, shoutType: event.target.value })}>{TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
        <div className="food-inline-edit-actions"><button type="button" onClick={() => setEditing(false)}>Cancel</button><button type="button" disabled={editBusy} onClick={saveEdit}>{editBusy ? "Saving…" : "Save changes"}</button></div>
      </div> : <><h2>{shout.title}</h2>{shout.caption && <p className="food-caption">{shout.caption}</p>}</>}
      <div className="food-location-line"><MapPin size={17} /><span><strong>{shout.placeName || shout.locationLabel}</strong>{shout.placeName && <small>{shout.locationLabel}</small>}</span></div>
      <div className="food-meta-row">{shout.priceText && <span><CircleDollarSign size={15} /> {shout.priceText}</span>}{shout.vibeTags.map((tag) => <span key={tag}>{tag.replaceAll("-", " ")}</span>)}</div>
      <div className="food-social-row"><button className={shout.viewerLiked ? "active" : ""} onClick={() => react("like")}><Heart size={19} fill={shout.viewerLiked ? "currentColor" : "none"} /> {shout.likeCount || "Like"}</button><button className={shout.viewerSaved ? "active" : ""} onClick={() => react("save")}><Bookmark size={19} fill={shout.viewerSaved ? "currentColor" : "none"} /> {shout.viewerSaved ? "Saved" : "Save"}</button><button onClick={() => document.getElementById(`comment-${shout.id}`)?.focus()}><MessageCircle size={19} /> {shout.commentCount || "Comment"}</button></div>
      <div className="food-proof-grid"><div><span>STILL GOOD?</span><strong>{shout.freshness.confirmed ? `${shout.freshness.confirmed} confirmed` : "Be first"}</strong><div><button onClick={async () => onChange({ ...shout, freshness: await verifyFoodShout(shout.id, "confirmed") })}><Check size={14} /> Yes</button><button onClick={async () => onChange({ ...shout, freshness: await verifyFoodShout(shout.id, "unsure") })}>Not sure</button></div></div><div><span>I TRIED THIS</span><strong>{shout.tried.total ? `${shout.tried.adjustedWouldGetAgain}% again` : "No votes yet"}</strong><button onClick={async () => onChange({ ...shout, tried: await markFoodTried(shout.id, "would_get_again") })}>Would get again</button></div></div>
      <section className="food-comments"><h3>Comments <span>{comments.length}</span></h3>{roots.length === 0 && <p className="food-comment-empty">Ask a question or share what you tried.</p>}{roots.map((item) => <div className="food-comment" key={item.id}><span className="food-random-avatar">{avatarText(item.id)}</span><div><div><strong>{item.displayName || "Food explorer"}</strong><span className={`food-tone ${item.tone}`}>{toneLabel(item.tone)}</span><time>{relativeTime(item.createdAt)}</time></div><p>{item.body}</p><div className="food-comment-actions"><button onClick={() => setReplyTo(item)}>Reply</button><button onClick={async () => { await reportFoodComment(item.id, "inappropriate"); setError("Comment report received. Thank you."); }}><Flag size={12} /> Report</button>{item.viewerOwned && <button onClick={async () => { await deleteFoodComment(item.id); setComments((items) => items.filter((entry) => entry.id !== item.id && entry.parentCommentId !== item.id)); }}><Trash2 size={13} /> Delete</button>}</div>{comments.filter((reply) => reply.parentCommentId === item.id).map((reply) => <div className="food-reply" key={reply.id}><strong>↳ {reply.displayName || "Food explorer"} · {toneLabel(reply.tone)}</strong><span>{reply.body}</span></div>)}</div></div>)}</section>
      <form className="food-comment-form" onSubmit={submitComment}>{replyTo && <div>Replying to “{replyTo.body.slice(0, 32)}” <button type="button" onClick={() => setReplyTo(null)}>Cancel</button></div>}<div className="food-comment-context"><input aria-label="Your display name" maxLength={24} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /><select aria-label="Comment meaning" value={tone} onChange={(event) => setTone(event.target.value)}><option value="loved_it">Loved it</option><option value="helpful">Helpful</option><option value="needs_update">Needs update</option></select></div><label><input id={`comment-${shout.id}`} maxLength={160} value={comment} onChange={(event) => setComment(event.target.value)} placeholder={replyTo ? "Write a reply" : "Add a comment"} /><button disabled={busy || !comment.trim()} aria-label="Send comment"><Send size={18} /></button></label></form>
      <div className="food-danger-row"><button onClick={async () => { await reportFoodShout(shout.id, "inappropriate"); setError("Report received. Thank you."); }}><Flag size={15} /> Report</button>{shout.viewerOwned && <><button onClick={() => setEditing(true)}><Pencil size={14} /> Edit</button><button onClick={async () => { await deleteFoodShout(shout.id); onDeleted(); }}><Trash2 size={15} /> Delete my post</button></>}</div>
      {error && <p className="food-form-error">{error}</p>}
    </div>
  </Sheet>;
}

function TopPicks({ shouts, onClose, onSelect }) {
  const rankedFood = useMemo(() => rankShouts(shouts.filter((item) => item.shoutType !== "drink")).slice(0, 3), [shouts]);
  const rankedDrinks = useMemo(() => rankShouts(shouts.filter((item) => item.shoutType === "drink")).slice(0, 3), [shouts]);
  return <Sheet className="food-top-picks" onClose={onClose} label="Top food and drink picks">
    <div className="food-sheet-head"><div><span>COMMUNITY PICKS</span><h2>Best in this area</h2></div><button onClick={onClose} aria-label="Close"><X /></button></div>
    <p className="food-ranking-note">Ranked from likes, comments, “tried this,” and freshness checks—not hidden AI scoring.</p>
    <TopPickGroup title="Top food finds" icon={<Utensils size={18} />} items={rankedFood} onSelect={onSelect} />
    <TopPickGroup title="Top drinks" icon={<Coffee size={18} />} items={rankedDrinks} onSelect={onSelect} />
  </Sheet>;
}

function TopPickGroup({ title, icon, items, onSelect }) {
  return <section className="food-top-group"><h3>{icon}{title}</h3>{items.length === 0 ? <p>No picks in this map area yet.</p> : items.map((item, index) => <button type="button" onClick={() => onSelect(item)} key={item.id}><b>{index + 1}</b><img src={item.imageUrl} alt="" /><span><strong>{item.title}</strong><small>{item.placeName || item.locationLabel}</small><em>{communityScore(item)} community points</em></span><ChevronRight size={18} /></button>)}</section>;
}

function FilterSheet({ cuisine, onCuisine, onClose }) { return <Sheet className="food-filter-sheet" onClose={onClose} label="Cuisine filter"><div className="food-sheet-head"><div><span>FILTER</span><h2>What sounds good?</h2></div><button onClick={onClose}><X /></button></div><div className="food-cuisine-grid">{CUISINES.map((item) => <button className={cuisine === item ? "active" : ""} onClick={() => onCuisine(item)} key={item}>{item === "All" ? "Everything" : item}</button>)}</div></Sheet>; }

function FoodFeed({ shouts, mine, saved, onMode, onClose, onSelect }) { return <Sheet className="food-feed" onClose={onClose} label="Foodie Finds feed"><div className="food-sheet-head"><div><span>YOUR MAP</span><h2>Foodie finds</h2></div><button onClick={onClose}><X /></button></div><div className="food-feed-tabs"><button className={!mine && !saved ? "active" : ""} onClick={() => onMode("nearby")}>Near me</button><button className={mine ? "active" : ""} onClick={() => onMode("mine")}>My finds</button><button className={saved ? "active" : ""} onClick={() => onMode("saved")}>Saved</button></div>{shouts.length === 0 ? <div className="food-feed-empty"><Utensils /><strong>No food finds here yet</strong><span>Move the map or share the first one.</span></div> : <div className="food-feed-list">{shouts.map((shout) => <button key={shout.id} onClick={() => onSelect(shout)}><img src={shout.imageUrl} alt="" /><span><small>{shout.cuisine} · {relativeTime(shout.createdAt)}</small><strong>{shout.title}</strong><em><MapPin size={12} /> {shout.placeName || shout.locationLabel}</em></span><ChevronRight /></button>)}</div>}</Sheet>; }

function ProfileSheet({ displayName, onClose, onSaved, onOpenFinds }) {
  const [name, setName] = useState(displayName);
  const cleanName = name.trim().slice(0, 24);
  const save = () => {
    if (!cleanName) return;
    saveDisplayName(cleanName);
    onSaved(cleanName);
  };

  return <Sheet className="food-profile" onClose={onClose} label="Edit Foodie Finds profile">
    <div className="food-sheet-head"><div><span>YOUR PROFILE</span><h2>Pick a fun name</h2></div><button type="button" onClick={onClose} aria-label="Close profile"><X /></button></div>
    <div className="food-profile-card">
      <span className="food-profile-avatar" aria-hidden="true">{displayInitials(cleanName || displayName)}</span>
      <label><span>Display name</span><div><Pencil size={16} /><input maxLength={24} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Noodle Fox" /></div></label>
      <small>This name appears on new finds and comments. No account needed.</small>
    </div>
    <button className="food-primary" disabled={!cleanName} type="button" onClick={save}>Save nickname <Check size={18} /></button>
    <button className="food-profile-finds" type="button" onClick={onOpenFinds}><Utensils size={18} /><span><strong>My finds</strong><small>See everything you shared</small></span><ChevronRight size={18} /></button>
  </Sheet>;
}

function RecentLocations({ onSelect }) { const places = readRecentLocations(); if (!places.length) return null; return <div className="food-recent-locations"><span>RECENT PLACES</span>{places.map((place, index) => <button type="button" key={`${place.latitude}-${place.longitude}-${index}`} onClick={() => onSelect(place)}><Clock3 size={15} /> {place.name || place.label}</button>)}</div>; }

function Sheet({ children, className, label, onClose }) { useEffect(() => { const closeOnEscape = (event) => { if (event.key === "Escape") onClose?.(); }; window.addEventListener("keydown", closeOnEscape); return () => window.removeEventListener("keydown", closeOnEscape); }, [onClose]); return <motion.div className="food-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.section role="dialog" aria-modal="true" aria-label={label} className={`food-sheet ${className}`} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 390, damping: 38 }}><div className="food-sheet-grabber" />{children}</motion.section></motion.div>; }

function Toast({ toast, onClose }) { useEffect(() => { const timer = setTimeout(onClose, 5200); return () => clearTimeout(timer); }, [onClose]); return <div className="food-toast" role="status"><Check size={17} /><span>{toast.text}</span>{toast.action && <button onClick={() => { toast.onAction?.(); onClose(); }}>{toast.action}</button>}<button aria-label="Dismiss" onClick={onClose}><X size={16} /></button></div>; }

function emptyGeoJson() { return { type: "FeatureCollection", features: [] }; }
function readBounds(map) { const value = map.getBounds(); return { west: round(value.getWest()), south: round(value.getSouth()), east: round(value.getEast()), north: round(value.getNorth()) }; }
function round(value) { return Math.round(value * 100000) / 100000; }
function typeLabel(value) { return TYPES.find(([key]) => key === value)?.[1] || "Food find"; }
function coordinateLabel(latitude, longitude) { return `${Math.abs(latitude).toFixed(6)}° ${latitude < 0 ? "S" : "N"}, ${Math.abs(longitude).toFixed(6)}° ${longitude < 0 ? "W" : "E"}`; }
function relativeTime(value) { const seconds = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return "just now"; if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`; if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`; return `${Math.floor(seconds / 86400)}d ago`; }
function avatarText(id) { return ["◡", "ᴗ", "•", "✦"][id.charCodeAt(0) % 4]; }
function communityScore(shout) { return Number(shout.likeCount || 0) * 2 + Number(shout.commentCount || 0) * 3 + Number(shout.tried?.total || 0) * 3 + Number(shout.freshness?.confirmed || 0); }
function rankShouts(items) { return [...items].sort((a, b) => communityScore(b) - communityScore(a) || new Date(b.createdAt) - new Date(a.createdAt)); }
function toneLabel(tone) { return tone === "loved_it" ? "Loved it" : tone === "needs_update" ? "Needs update" : "Helpful"; }
function readDisplayName() { try { const saved = localStorage.getItem(DISPLAY_NAME_KEY); if (saved) return saved; const first = ["Noodle", "Mango", "Chilli", "Bento", "Mochi"][Math.floor(Math.random() * 5)]; const second = ["Fox", "Otter", "Koala", "Panda", "Gecko"][Math.floor(Math.random() * 5)]; const value = `${first} ${second}`; localStorage.setItem(DISPLAY_NAME_KEY, value); return value; } catch { return "Food explorer"; } }
function saveDisplayName(value) { try { const clean = value.trim().slice(0, 24); if (clean) localStorage.setItem(DISPLAY_NAME_KEY, clean); } catch { /* optional */ } }
function displayInitials(value) { const parts = String(value || "ME").trim().split(/\s+/).filter(Boolean); return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "ME"; }
function readDraft() { try { return { title: "", caption: "", priceText: "", cuisine: "Other", shoutType: "dish", vibeTags: [], ...JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") }; } catch { return { title: "", caption: "", priceText: "", cuisine: "Other", shoutType: "dish", vibeTags: [] }; } }
function toggleVibe(current, vibe) { if (current.includes(vibe)) return current.filter((item) => item !== vibe); if (current.length >= 3) return current; return [...current, vibe]; }
function readRecentLocations() { try { return JSON.parse(localStorage.getItem(RECENT_LOCATIONS_KEY) || "[]").slice(0, 4); } catch { return []; } }
function saveRecentLocation(location) { try { const current = readRecentLocations().filter((item) => Math.abs(item.latitude - location.latitude) > .00001 || Math.abs(item.longitude - location.longitude) > .00001); localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify([location, ...current].slice(0, 5))); } catch { /* storage is optional */ } }
