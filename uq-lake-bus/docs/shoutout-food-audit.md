# ShoutOut Food Map architecture audit

Updated: 25 August 2026

## Existing flow

- React renders `ShoutOutPage.jsx`; MapLibre uses OpenFreeMap vector tiles.
- The browser stores an anonymous random device token. The Worker stores only its SHA-256 hash.
- Posting currently supports current-location confirmation, a manually adjusted approximate pin, a 1 km safety radius, text, one optional emoji, and seven-day expiry.
- D1 `messages` rows are tied to `shout_locations`, whose coordinates are snapped to approximately 50 m.
- One-level replies use `messages.parent_id`. Reactions, reports, notification rows, rate limits, and automatic expiry already exist.
- Map reads are bounded by the current viewport. Pins use MapLibre clustering.
- There is no account/login model and no recoverable identity beyond the anonymous browser token.

## Existing Cloudflare resources

- Worker: `uq-helper-api`
- D1 binding: `DB` → `uq-helper-shoutouts`
- Scheduled cleanup: daily
- No R2 binding, image upload path, Turnstile binding, or image metadata table exists yet.

## Implementation decision

Add Food Shout tables and `/api/shouts` routes alongside the legacy message API. Do not rewrite or drop legacy tables. Move the Shout Out UI to the food model only after the Food Shout create/read flow is operational.

The anonymous device hash remains the MVP `user_id` equivalent. It enables ownership, My Shouts, delete, one-vote rules, and notifications without collecting email or profile data. It is not a full account and does not synchronize across browsers.

Images are compressed in the browser, validated again by the Worker, stored in R2, and referenced from D1 by object key. The selected map location is always explicit and never extracted from EXIF.

Place search is provider-abstracted behind the Worker. Public Nominatim, if used, is submit-only, rate-limited, cached, attributed, and never called for per-keystroke autocomplete.
