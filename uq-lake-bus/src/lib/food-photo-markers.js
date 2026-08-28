import '../styles/food-map-photos.css';
import { trimFoodPhotoBlackBars } from './food-photo-display';

// Native image markers need no cross-origin pixel access. They use the same
// original photos as the feed while MapLibre still handles numeric clusters.
export function attachFoodPhotoMarkers(map, Marker, onSelect) {
  const markers = new Map();
  let dirty = true;
  const invalidate = () => { dirty = true; };
  const onSourceData = (event) => {
    if (event.sourceId === 'food-shouts') dirty = true;
  };
  const render = () => {
    if (!dirty || !map.getLayer('food-pins') || !map.isSourceLoaded('food-shouts')) return;
    dirty = false;
    const visible = new Set();
    for (const feature of map.queryRenderedFeatures({ layers: ['food-pins'] })) {
      const properties = feature.properties;
      const id = properties.id;
      if (!id || visible.has(id)) continue;
      visible.add(id);
      let item = markers.get(id);
      if (!item) {
        const element = document.createElement('div');
        element.className = 'food-photo-marker';
        // Size and clip before attaching/loading anything. Even during a CSS
        // reload a natural-size photo cannot spill over the map.
        Object.assign(element.style, { position: 'absolute', width: '44px', height: '44px', maxWidth: '44px', maxHeight: '44px', overflow: 'hidden', contain: 'size layout paint' });
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'food-photo-marker-button';
        Object.assign(button.style, { display: 'grid', placeItems: 'center', width: '44px', height: '44px', padding: '0', border: '0', borderRadius: '50%', background: 'transparent' });
        const frame = document.createElement('span');
        frame.className = 'food-photo-marker-frame';
        Object.assign(frame.style, { position: 'relative', display: 'block', boxSizing: 'border-box', width: 'var(--food-pin-size,34px)', height: 'var(--food-pin-size,34px)', overflow: 'hidden', border: '1.5px solid var(--food-pin-ring,#fff)', borderRadius: '50%' });
        const image = document.createElement('img');
        image.width = 64;
        image.height = 64;
        Object.assign(image.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%', objectFit: 'cover', objectPosition: 'center' });
        image.alt = '';
        image.decoding = 'async';
        image.draggable = false;
        // No crossOrigin attribute: normal public image display must not depend
        // on CORS headers or cached canvas-compatible responses.
        frame.append(image);
        button.append(frame);
        button.addEventListener('click', (event) => { event.stopPropagation(); onSelect(id); });
        element.append(button);
        item = { marker: new Marker({ element, anchor: 'center' }), button, frame, image, signature: '', urls: [], index: 0, attempted: '', cleaned: false };
        image.addEventListener('load', () => {
          const original = item.urls[item.index];
          if (!original || item.attempted === original || image.getAttribute('src') !== original) return;
          item.attempted = original;
          trimFoodPhotoBlackBars(original, 256).then((url) => {
            if (url !== original && markers.get(id) === item && item.urls[item.index] === original && image.getAttribute('src') === original) {
              item.cleaned = true;
              image.src = url;
            }
          });
        });
        image.addEventListener('error', () => {
          if (item.cleaned) { item.cleaned = false; image.src = item.urls[item.index]; return; }
          item.index += 1;
          if (item.urls[item.index]) image.src = item.urls[item.index];
          else { image.hidden = true; frame.classList.add('unavailable'); }
        });
        item.marker.setLngLat(feature.geometry.coordinates).addTo(map);
        markers.set(id, item);
      }
      let urls;
      try { urls = JSON.parse(properties.photoUrls || '[]'); } catch { urls = []; }
      if (!Array.isArray(urls)) urls = [];
      const signature = JSON.stringify(urls);
      if (signature !== item.signature) {
        item.signature = signature;
        item.urls = urls;
        item.index = 0;
        item.attempted = '';
        item.cleaned = false;
        item.frame.classList.toggle('unavailable', !urls[0]);
        item.image.hidden = !urls[0];
        if (urls[0]) item.image.src = urls[0];
        else item.image.removeAttribute('src');
      }
      item.button.setAttribute('aria-label', `Open ${properties.title || 'food post'}${properties.rankLabel ? `, ${properties.rankLabel}` : ''}`);
      item.button.title = properties.title || 'View food post';
      item.button.classList.toggle('selected', Number(properties.selected) === 1);
      item.button.style.setProperty('--food-pin-size', Number(properties.selected) === 1 ? '38px' : '34px');
      item.button.style.setProperty('--food-pin-ring', properties.rankColor
        ? `color-mix(in srgb, ${properties.rankColor} 55%, #ffffff)` : '#ffffff');
      item.marker.setLngLat(feature.geometry.coordinates);
    }
    for (const [id, item] of markers) {
      if (!visible.has(id)) { item.marker.remove(); markers.delete(id); }
    }
  };
  map.on('render', render);
  map.on('move', invalidate);
  map.on('sourcedata', onSourceData);
  map.triggerRepaint();
  return () => {
    map.off('render', render);
    map.off('move', invalidate);
    map.off('sourcedata', onSourceData);
    for (const item of markers.values()) item.marker.remove();
    markers.clear();
  };
}
