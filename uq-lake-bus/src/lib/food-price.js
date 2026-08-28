import { footprintLocation } from './food-footprint';

export function formatFoodPrice(post) {
  const price = String(post.priceText || '').trim();
  if (!price) return '';
  // Preserve explicitly supplied currencies, including overseas food posts.
  if (/\p{Sc}/u.test(price)) return price;
  if (/^AUD\s*\d/i.test(price)) return price.replace(/^AUD\s*/i, 'AUD $');
  const { country } = footprintLocation(post);
  const isAustralian = country === 'au' || (!country &&
    Number.isFinite(post.latitude) && Number.isFinite(post.longitude) &&
    post.latitude >= -44.5 && post.latitude <= -10 &&
    post.longitude >= 112 && post.longitude <= 154.5);
  // Only label numeric amounts/ranges. Don't turn "2 for 1" or free-text
  // descriptions into a misleading price, and never rewrite stored data.
  const numericPrice = /^\d[\d,.]*(?:\s*[-–—]\s*\d[\d,.]*)?(?:\s*\+|\s*(?:\/|per\b)\s*[a-z ]+)?$/i;
  return isAustralian && numericPrice.test(price) ? `$${price}` : price;
}
