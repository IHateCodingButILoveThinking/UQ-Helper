import { ChevronRight, Gem, MapPin, Star, Utensils } from 'lucide-react';
import { publicFoodAuthorLabel, publicFoodRank } from '../lib/food-ranks';
import { footprintLocation } from '../lib/food-footprint';
import FoodCoverPhoto from './FoodCoverPhoto';
import { formatFoodPrice } from '../lib/food-price';

export default function FoodDiscoveryGrid({ posts, onSelect, placeLabel, relativeTime, loading }) {
  if (!posts.length) return <div className="food-discovery-empty" role="status">
    <Utensils size={26} aria-hidden="true" />
    <strong>{loading ? 'Loading finds…' : 'No finds in this area'}</strong>
    {!loading && <span>Try another filter or explore the map.</span>}
  </div>;

  return <div className="food-discovery-grid">
    {posts.map((post) => {
      const rank = publicFoodAuthorLabel(post.rankLabel);
      const authorRank = publicFoodRank(post.rankLabel);
      const accent = authorRank?.color || post.rankAccent;
      const place = placeLabel(post);
      const area = footprintLocation(post);
      const region = area.city || area.suburb;
      const rating = post.rating?.count > 0 && Number.isFinite(Number(post.rating.average));
      return <button type="button" key={post.id}
        className={`food-discovery-card ${accent ? 'has-rank' : ''} ${authorRank?.decorated ? 'has-rank-corner' : ''}`}
        style={accent ? { '--food-rank': accent } : undefined}
        onClick={() => onSelect(post)}>
        {authorRank?.decorated && <span className="food-discovery-rank-corner" aria-hidden="true"><Gem size={19} strokeWidth={1.7} /></span>}
        <FoodCoverPhoto post={post} />
        <div className="food-discovery-copy">
          <span className="food-discovery-meta">
            {region && <span className="food-discovery-area">{region}<span aria-hidden="true"> · </span></span>}
            <time dateTime={post.createdAt}>{relativeTime(post.createdAt)}</time>
          </span>
          {rank && <span className="food-discovery-author">{rank}</span>}
          <strong className="food-discovery-title">{post.title}</strong>
          {place && <span className="food-discovery-place"><MapPin size={12} aria-hidden="true" /><span>{place}</span></span>}
          {post.priceText && <span className="food-discovery-price"><span>Price</span> {formatFoodPrice(post)}</span>}
          {post.caption && <span className="food-discovery-caption">{post.caption}</span>}
        </div>
        <span className="food-discovery-side">
          <span className={rating ? 'food-discovery-rating' : 'food-discovery-unrated'}
            title={rating ? `${post.rating.count} ratings` : 'Not rated yet'}
            aria-label={rating ? `${Number(post.rating.average).toFixed(1)} out of 5, ${post.rating.count} ratings` : 'Not rated yet'}>
            <Star size={12} aria-hidden="true" fill={rating ? 'currentColor' : 'none'} />
            {rating ? Number(post.rating.average).toFixed(1) : '—'}
          </span>
          <span className="food-discovery-details">Details <ChevronRight size={12} aria-hidden="true" /></span>
        </span>
      </button>;
    })}
  </div>;
}
