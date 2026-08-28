import { useEffect, useState } from 'react';
import { foodPhotoUrls } from '../lib/food-photos';
import { trimFoodPhotoBlackBars } from '../lib/food-photo-display';

export default function FoodCoverPhoto({ post }) {
  const urls = foodPhotoUrls(post);
  return <OriginalPhoto key={JSON.stringify(urls)} urls={urls} />;
}

function OriginalPhoto({ urls }) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState('');
  const [cleaned, setCleaned] = useState(null);
  const source = urls[index];
  useEffect(() => {
    if (!source || loaded !== source) return;
    let cancelled = false;
    trimFoodPhotoBlackBars(source, 256).then((url) => {
      if (!cancelled && url !== source) setCleaned({ source, url });
    });
    return () => { cancelled = true; };
  }, [source, loaded]);
  return <span className="food-discovery-photo">
    {source ? <img src={cleaned?.source === source ? cleaned.url : source} alt="" loading="lazy" decoding="async" draggable={false}
      onLoad={() => setLoaded(source)}
      onError={() => {
        if (cleaned?.source === source) setCleaned(null);
        else setIndex((current) => current + 1);
      }} /> : <span className="food-photo-unavailable">Photo unavailable</span>}
  </span>;
}
