import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, ChevronRight, Footprints, Globe2, MapPin, RefreshCw, Utensils, X } from 'lucide-react';
import { getFoodFootprint } from '../lib/food-shout-api';
import { buildFoodFootprint, footprintCountryFlag } from '../lib/food-footprint';
import '../styles/food-footprint.css';

const views = [
  { id: 'countries', label: 'Countries & regions', short: 'Countries', Icon: Globe2 },
  { id: 'cities', label: 'Cities', short: 'Cities', Icon: Building2 },
  { id: 'suburbs', label: 'Suburbs', short: 'Suburbs', Icon: MapPin },
];

export default function FoodFootprintDialog({ onClose, onVisit, totalPosts }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const [payload, setPayload] = useState(null);
  const [view, setView] = useState('countries');
  const [error, setError] = useState('');
  const [visitMessage, setVisitMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);
  const closeCallback = useRef(onClose);
  closeCallback.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement;
    previousFocus?.blur?.();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (event) => {
      if (event.key === 'Escape') { event.stopPropagation(); closeCallback.current(); }
      if (event.key !== 'Tab') return;
      const elements = [...dialogRef.current.querySelectorAll('button:not(:disabled), [href]')];
      const first = elements[0];
      const last = elements.at(-1);
      if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      if (previousFocus?.isConnected) previousFocus.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
      setError('Your footprint took too long to load. Please try again.');
      setLoading(false);
    }, 12_000);
    setLoading(true);
    setError('');
    getFoodFootprint(controller.signal).then((data) => {
      if (!controller.signal.aborted) setPayload(data);
    }).catch(() => {
      if (!controller.signal.aborted) setError('Your footprint could not load. Please try again.');
    }).finally(() => {
      window.clearTimeout(timeout);
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [requestVersion]);

  const summary = useMemo(() => buildFoodFootprint(payload?.posts || []), [payload]);
  const places = summary[view];
  const total = payload?.legacy ? payload.complete ? summary.finds : Math.max(totalPosts || 0, summary.finds) : payload?.total;

  return createPortal(
    <div className="food-footprint-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="food-footprint-dialog" role="dialog" aria-modal="true" aria-labelledby="food-footprint-title" aria-describedby="food-footprint-note">
        <header className="food-footprint-header">
          <span className="food-footprint-mark"><Footprints size={23} aria-hidden="true" /></span>
          <div><small>YOUR FOOD TRAIL</small><h2 id="food-footprint-title">My footprint</h2></div>
          <button ref={closeRef} type="button" className="food-footprint-close" onClick={onClose} aria-label="Close footprint"><X size={22} /></button>
        </header>
        <div className="food-footprint-scroll">
          <div className="food-footprint-passport">
            <div className="food-footprint-passport-title"><span>Every find leaves a little trail.</span><Footprints size={27} aria-hidden="true" /></div>
            <div className="food-footprint-stats" aria-label="Your posted places">
              <span><Utensils size={16} aria-hidden="true" /><strong>{loading && !payload ? '—' : total ?? '—'}</strong><small>Finds logged</small></span>
              {views.map(({ id, short, Icon }) => <button type="button" key={id} className={view === id ? 'active' : ''} aria-pressed={view === id} onClick={() => setView(id)}><Icon size={16} aria-hidden="true" /><strong>{loading && !payload ? '—' : summary[id].length}</strong><small>{short}</small></button>)}
            </div>
          </div>
          <div className="food-footprint-section-title"><h3>{views.find((item) => item.id === view).label}</h3><span>{loading ? 'Loading…' : 'Latest first'}</span></div>
          {loading && !payload ? <p className="food-footprint-state" role="status">Gathering your food trail…</p> : error ? <div className="food-footprint-state" role="alert"><p>{error}</p><button type="button" onClick={() => setRequestVersion((value) => value + 1)}>Try again</button></div> : places.length ? (
            <div className="food-footprint-places">
              {places.map((place) => <button type="button" className="food-footprint-place" key={place.id} onClick={() => { if (onVisit(place) === false) setVisitMessage('The map is still loading. You can keep browsing your footprint.'); }} disabled={!place.points.length} aria-label={`Explore ${place.name} on the map`}>
                <span className="food-footprint-stamp" aria-hidden="true">{view === 'countries' ? footprintCountryFlag(place.country) : view === 'cities' ? <Building2 size={20} /> : <MapPin size={20} />}</span>
                <span className="food-footprint-place-copy"><strong>{place.name}</strong><small>{place.context || 'Country / region'}</small></span>
                <span className="food-footprint-place-count"><strong>{place.count}</strong><small>{place.count === 1 ? 'find' : 'finds'}</small></span><ChevronRight size={16} aria-hidden="true" />
              </button>)}
            </div>
          ) : <div className="food-footprint-state"><Footprints size={30} aria-hidden="true" /><strong>{summary.finds ? 'No named places here yet' : 'Your trail starts with a find'}</strong><p>{summary.finds ? 'Some older pins only have coordinates. Their place names aren’t available in saved data yet.' : 'Share a food find and its location will appear here.'}</p></div>}
          {payload && !error && <p className="food-footprint-coverage">{payload.complete ? '' : `Place counts cover the latest ${summary.finds} posts. `}{summary.unnamed > 0 ? `${summary.unnamed} ${summary.unnamed === 1 ? 'post has' : 'posts have'} incomplete place names.` : ''}</p>}
          {visitMessage && <p className="food-footprint-coverage" role="status">{visitMessage}</p>}
        </div>
        <footer className="food-footprint-footer"><p id="food-footprint-note">Based on your posts, not live tracking.</p><button type="button" onClick={() => setRequestVersion((value) => value + 1)} disabled={loading} aria-label="Refresh footprint"><RefreshCw size={16} /></button></footer>
      </section>
    </div>, document.body,
  );
}
