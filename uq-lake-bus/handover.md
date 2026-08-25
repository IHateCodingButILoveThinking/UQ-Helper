# UQ Helper project handover

Last updated: 25 August 2026

## Resume checkpoint — read this first after a crash

The active work is at **Stage 7: frontend publication and production QA**. Do not recreate the R2 bucket, rerun migrations `0006`–`0009`, or redeploy an older Worker. The backend is already live. The current local branch still needs to be pushed to GitHub/Vercel because terminal GitHub authentication is missing.

| Stage | Status | Completed and verified | Still required |
| --- | --- | --- | --- |
| 1. Product logic | Done | Food-first map, exact chosen pin, permanent food/drink posts, 1–3 images per post, comments/replies, rankings, reactions and owner editing | The user-facing name is **Foodie Finds**. Do not reintroduce the legacy seven-day/1 km Shout Out rules |
| 2. Database | Done and live | Remote D1 migrations `0006`–`0009` applied to `uq-helper-shoutouts`, including half-star food ratings | Only add a new numbered migration for future schema changes |
| 3. Image storage | Done and live | Private Standard R2 bucket `uq-helper-food-images`; binding `FOOD_IMAGES`; user billing limit; 8 GB application ceiling | Monitor real usage after launch |
| 4. Worker API | Done and live | Worker `1a577822-8949-46c7-8370-bf6a789147e6`; half-star ratings, map-bounded place search, delete-time R2 cleanup, health and read-only smoke tests passed | Production end-to-end upload/delete/rating test without leaving junk content |
| 5. Abuse protection | Done and live | Parameterised SQL, field/request limits, image signatures, storage reservation, device/network counters, duplicate detection, privacy-safe event log and temporary block list | Review thresholds after real usage; no system can permanently identify or disable a physical phone |
| 6. Frontend implementation | Done locally | Cleaner three-step composer, mobile-safe search focus, compact clustered food markers, 1200 px/600 KB browser image target, smaller detail photo, collapsed ratings/comments, on-demand comment editor and owner delete confirmation; production build passed | Publish local changes to GitHub/Vercel |
| 7. GitHub/Vercel publication | Blocked | The local HEAD commit `tighten mobile food photo uploads` contains the final phone-image changes and this crash-safe handover | Push failed because the terminal has no GitHub credentials. Push `main` from GitHub Desktop or a signed-in terminal |
| 8. Mobile visual QA | Partial | Foodie Finds map, renamed header/home card, Near me radar control, and empty 1–3 photo composer visually checked at 390 × 844; layout is compact and readable | Test 1, 2 and 3 real photos, gallery swiping/buttons, slow upload, denied location and small iPhone viewport on the deployed site |
| 9. Social end-to-end QA | Not done | Local API coverage exists | Test post, reply, reaction, notification, report, owner edit/delete and automatic cleanup across two devices |
| 10. Gold Coast QA | Done locally | Outbound, return, reverse control, Tram Times, Back to journey, later services, and high-contrast text verified at 390 × 844 with the local transport server | Repeat a short production smoke test after the frontend deploy |
| 11. PWA/device QA | Not done | Manifest and service worker exist | Verify Android install prompt and iPhone Add to Home Screen after frontend deployment |

### Confirmed crash/tester record

- The embedded browser repeatedly timed out or reset while reconnecting to `localhost`. This is a tester/session crash; the Vite production build and Worker syntax checks passed.
- The Gold Coast empty error during the last local screenshot was caused by the Vite proxy receiving `ECONNREFUSED` because the transport server on port `8787` was not running. It was not evidence that the production transport feed failed.
- A real iPhone/Safari application crash has **not yet been reproduced**. To reduce the most likely photo-memory pressure, phone images now resize to a 1400 px maximum edge, stop at 1.5 MB, and use smaller previews. Device testing is still required before calling that issue closed.
- No local development servers should be assumed to survive a crash. Restart only the server needed for the next QA step.

### Exact next action

1. Push the local `main` branch to `origin/main` from an authenticated Git client.
2. Wait for the connected Vercel deployment.
3. Open the deployed Foodie Finds page on the affected phone and test one photo first, then three photos.
4. If Safari still crashes, record the iPhone model, iOS version, browser/PWA mode, selected image count and the exact screen/action immediately before the crash.

## Foodie Finds implementation (current)

- Renamed the active user-facing feature to **Foodie Finds** and replaced the Nearby sparkle with a clearer radar icon labelled **Near me**. The stable `?page=shout-outs` route and backend API/database names remain unchanged for compatibility.
- Replaced the active Shout Out page with a mobile-first, photo-first food discovery map while preserving the legacy page source for rollback/reference.
- Added D1 migrations `0006_food_shouts.sql`, `0007_food_identity_tone.sql`, and `0008_food_image_limits.sql` for uploads, permanent food posts, 1–3 ordered images, comments/replies, like/save, reports, freshness checks, tried votes, venue anchors, cached place search, custom display names, explicit comment meaning, storage accounting, abuse signals, and temporary blocks.
- Added an R2 binding named `FOOD_IMAGES` and a Worker Food API for image upload/serving, map queries, place search, create/detail/delete, comments/replies, reactions, reports, freshness, and tried votes.
- Added browser-side image resizing/WebP compression; re-encoding removes EXIF metadata and the selected map location is never read from the photo.
- Food pins preserve the exact user-confirmed six-decimal coordinate. Manual posting now enters a dedicated pin mode with a breathing centre marker and an explicit **Use exact pin** action.
- Food and drink posts do not expire (`expires_at` stays `NULL`). Unclaimed uploads still expire for storage hygiene.
- Added custom or stable random nicknames, plus commenter-selected `Loved it`, `Helpful`, and `Needs update` labels. This replaces unreliable hidden sentiment guessing.
- The top-right profile badge now shows the saved nickname's initials and opens a compact profile editor. A user can change the device-local nickname or jump to My finds without creating an account; the new name applies to future posts and comments.
- Fixed iPhone profile-field zoom by using 16 px mobile inputs and releasing keyboard focus on Save, Close, Enter, and My finds. The Foodie Finds header/back control remains sticky and readable down to a 320 px viewport.
- Added a searchable geographic country/region browser with Australia as the default and grouped Asian destinations including Hong Kong and Taiwan. Selecting a region moves the map and refreshes that viewport; cuisine remains a separate food-style filter.
- Applied the requested regional naming in the map picker: Mainland China, Hong Kong SAR (China), and Taiwan (China), with searchable China/HK/TW aliases.
- Simplified the Foodie map header to Back, the saved profile name, and a notification bell. The compact Activity sheet has an animated In-app alerts switch; disabling it stops polling, while enabling it checks at most every five minutes while the page is visible. It does not request phone push permission or use a paid notification service.
- Hardened phone photo preparation with a Safari fallback when `createImageBitmap` fails, JPEG/WebP fallback encoding, progressive downscaling for oversized images, a visible Preparing state, correct filename extensions, and a 90-second mobile upload timeout.
- Reduced the browser image target to a 1200 px long edge and 600 KB per image while retaining the server's 1.5 MB hard acceptance ceiling. Re-encoding strips metadata; the photo picker shows the compressed aggregate size.
- Reworked post details to show only the food, short note, place, cuisine/time/price/tags by default. The photo is shorter on phones; ratings and comments are collapsed and comments load only after expansion.
- Added a D1-backed 0.5–5 star rating model (`0009_food_ratings.sql`) with one editable rating per anonymous device. The comment editor appears only after Comment or Reply is tapped.
- Made individual map markers smaller and increased clustering. Markers use reusable locally drawn circular food-type thumbnails, so the fun visual does not download every post image or consume R2 storage.
- Place lookup is biased and bounded to the visible map area, uses a location-aware capped cache, and falls back to the exact manual pin when OpenStreetMap does not list a store. No paid Google Places API was added.
- Owner deletion is now two-step and visible without showing owner identity. The Worker removes deleted post images from R2 and releases counted storage when object deletion succeeds.
- Owners can edit title, caption, nickname, price, cuisine, and category without replacing the photo or moving the exact pin. Comments can be individually reported as well as deleted by their author.
- The Worker now verifies JPEG/PNG/WebP file signatures instead of trusting the browser-provided MIME label; a mismatched local upload is rejected with HTTP 415.
- Each post accepts 1–3 photos. The composer has a visible red three-photo boundary and aggregate upload progress; the Worker independently rejects zero or four-plus photos.
- The storage red line was not changed: the Worker still enforces 1.5 MB per image, three images per post, and the 8 GB application ceiling. Oversized photos are reduced in the browser to fit those existing limits.
- R2 is protected by an 8 GB application ceiling beneath the 10 GB free allowance, 1.5 MB per-image validation, one-hour expiry for abandoned uploads, daily device/network upload budgets, and storage reservations made before an object write. Phone images are resized to a 1400 px maximum edge before upload.
- Added a privacy-safe abuse shield. It measures write velocity for the anonymous client hash and a one-way network hash, detects same-device near-identical same-location posts within 24 hours, logs only rejection metadata, and temporarily blocks automated bursts. It does not store raw IP addresses or claim to identify a physical phone.
- Added viewport clustering, Search this area, dish/caption search, Cuisine and Budget filters, Nearby/My Shouts/Saved sheets, Top 3 food and Top 3 drink community rankings, detail sheets, one-level replies, report/delete, Still Good, and I Tried This.
- Category labels are now user-facing concepts such as `Dish worth ordering`, `Drink worth trying`, `Hidden food spot`, `Sweet find`, and `Budget find`. UI icons use Lucide rather than generated artwork.
- Local D1 migrations, Worker syntax, exact-coordinate API round-trip, permanent-post response, owned-post editing without location movement, custom name/comment tone, image upload/signature rejection, reactions, freshness, tried vote, comments/replies, and the production frontend build have been tested successfully.
- A real PNG upload returned HTTP 201 through the local Worker/R2 emulator. The temporary local object and emulator state were removed afterward; production storage was not touched.

### Deployment status

- R2 was enabled with a user-configured billing limit and the private Standard bucket `uq-helper-food-images` was created.
- Remote D1 migrations `0006`, `0007`, and `0008` were applied successfully.
- Worker version `d813461a-4aa3-48c5-9249-03dc9825fa45` is deployed with `DB`, `FOOD_IMAGES`, the 8 GB application safety ceiling, and the final 1.5 MB image limit. Production health and a read-only Food Shout viewport query both passed.
- The production frontend still needs to be deployed after final browser QA.

## Current task

Continue the mobile-first redesign and finish the two active feature areas:

1. Finish Gold Coast phone QA: outbound is train to Helensvale then tram; return is tram to Helensvale then train to Brisbane. Keep the reverse-direction control between the journey cards and text compact and high contrast.
2. Publish and verify Food Shout. The current Food Shout implementation uses the exact user-confirmed pin and permanent food/drink posts. The older general Shout Out page's approximate-pin, seven-day expiry and 1 km presence rules are legacy behaviour and must not be mixed into this feature.

The immediate work in progress is final mobile visual QA and frontend deployment. The D1 migrations, R2 bucket, Worker API, multi-photo validation, and abuse shield are deployed.

## Completed work

### App shell and home

- Removed the animated splash screen. The app now opens directly to the requested page.
- Kept the PWA install prompt on the home page.
- Added a web app manifest and service worker registration earlier in the project, so supported mobile browsers can install the app.
- Made Shout Out use the same home action-card system as Live Transport and Study Spaces instead of a separate inconsistent card.
- Separated the home trip choices for Gold Coast and Airport.
- Improved page-to-page transitions and moved transport Home navigation outside the Bus/Ferry/Train category control.

### General transport

- Bus, Ferry, and Train are separate navigation choices.
- Removed the old Plan button.
- Ferry defaults are centred on UQ Lakes and clearer waiting-time presentation.
- Train station choices support saving to local storage, searching, and fuzzy matching.
- The train page does not show departure details before a station has been saved.
- Added Roma Street to train choices.
- Fixed the Bus/Ferry selection-state issue where the selected section could fail to appear active.

### Gold Coast journey

- The default direction is **To Gold Coast**.
- The route is now split into two cards rather than mixed into one overloaded panel.
- Outbound order is **selected Brisbane train station → Helensvale**, followed by **Helensvale → Gold Coast by tram**.
- Return order is reversed: **selected Gold Coast tram station → Helensvale**, followed by **Helensvale → selected Brisbane train station**.
- The direction switch is placed between the two cards.
- Helensvale is the fixed/default transfer station for the outbound tram connection.
- Later trains are available in an expander directly under the current train.
- Scheduled time, platform, wait time, and Live/Timetable status have been separated into clearer facts.
- Expanded the tram list to all 27 current G:link stations and corrected their coordinates.
- Increased the fuzzy station picker from eight visible matches to all scrollable matches.
- Added the Translink Tram GTFS-Realtime feed and fixed L1 departures being misclassified as rail.
- Direction matching prefers the structured North/South field and only falls back to destination text.
- Added a focused Tram Times subview for checking any stop without mixing that task into the main journey.
- Clarified outbound card wording as Train then Tram, uses “change time” for transfer buffers, and identifies the tram tracker as both-direction data.
- Airport and Gold Coast pages now have their own compact back-to-home headers instead of reusing transport tabs.
- Fixed washed-out return-tram text with explicit opaque, high-contrast colors for the label, platform, time, and Live/Timetable facts.
- Fixed a CSS specificity conflict where the return tram's `good`/`neutral` state replaced the light featured background. The primary tram row now always retains its pale high-contrast surface.
- The return tram card now shows the current tram plus two later trams, so missing the first service does not create a dead end.
- Added a compact Tram quick action in the Gold Coast header and background-prefetched its default station data. The focused tracker now shows the next three trams.

### Airport

- Kept Airport separate from the Gold Coast flow.
- Simplified the Airtrain information and fare/timetable links.
- Kept fare information explicit that Airtrain is a private operator and exact fares should be checked.
- Flight-number tracking was discussed but intentionally not implemented yet because usefulness and a reliable free live-flight source have not been decided.

### Shout Out map and Cloudflare

- Replaced the cartoon-map direction with a real interactive MapLibre vector map.
- Expanded viewport browsing and pin storage from Brisbane to mainland Australia and Tasmania.
- Expanded browsing and posting again to cover Asia plus Australia, while retaining the same 1 km current-location check, approximate public pins, moderation, reporting, and seven-day expiry.
- Added a horizontally scrollable country shortcut rail at the top of the map. Country choices move/fit the real map instead of creating separate pages, so users can quickly track posts in Australia and major Asian regions.
- Turned Recent into a chronological feed for the visible country/map area. It shows newest-to-oldest location, text, relative time, exact time, and returns to the selected map pin.
- Added a mobile pin flow: enter posting mode, move the map beneath the centre pin, confirm the location, then compose.
- Geolocation is requested only after the user chooses Locate; it centres the map but does not automatically publish exact device coordinates.
- Publishing now requires a fresh current-location action. The chosen pin must remain inside a visible 1 km circle; both client and Worker reject an out-of-range pin.
- Improved unreliable phone location handling: the map now requests a normal location fix first, retries with high accuracy only when posting needs it, explains denied/unavailable/timeout states, reports when the map is not ready, and shows a blue current-location dot after success.
- Removed the silent disabled Locate state found on slower iPhones. Locate now always responds, and denied/unavailable/timeout states open a persistent recovery panel with Safari website-setting instructions and a Try again action.
- Pin placement now supports tapping a map spot as well as moving the map beneath the centre pin. A location fix can be reused for two minutes so reopening the composer is immediate without silently keeping stale coordinates.
- Current location is used for the distance check but is not written to D1. The public pin remains snapped to approximately 50 m.
- The confirmed public pin is snapped to an approximate location by the Worker.
- The UI attempts to derive a recognisable place name from visible vector-map labels and falls back to explicit coordinates instead of saying only “near this pin”.
- Existing posts can appear as map markers with a selected-post preview and message list.
- The newest visible post has a coral activity marker and a compact “New nearby” control. It breathes only when the post is less than 30 minutes old and becomes static when reduced motion is requested.
- The compact preview now presents Anonymous, exact posted date/time, message text, recognisable area, approximate coordinate, post count, and a View all action in a consistent order.
- Added viewport map queries and location-aware message creation to the frontend API helper.
- The Cloudflare Worker supports pinned locations, map bounds, seven-day expiry, reports, rate limits, and hidden posts after the report threshold.
- Added D1 migration `0003_australia_locations.sql`, which rebuilds only the location table with Australian bounds while copying all existing location rows.
- Added stronger server-side rejection for links/contact details and phrase-based dangerous content. Rejected content is not inserted into D1.
- Cloudflare Worker URL: <https://uq-helper-api.zeyi-yang.workers.dev/>
- Added one-level anonymous replies below map posts. Replies reuse the same 160-character limit, safety moderation, cooldown, daily limit, reports, reactions, and parent-post expiry.
- Added a compact in-app Activity inbox for reply and reaction notifications. Notifications are tied to the anonymous device token, contain no email/account data, and expire with the post.
- Added a 6.5-second tappable in-app notification popup. It can open the correct post thread even when the post is outside the current country viewport; the Activity inbox remains as the durable in-app history.
- Clarified and repaired replies: the action always reads `Reply` with an optional count, scrolls the composer into view, shows visible submission errors, and uses a five-second reply cooldown instead of the normal 30-second new-post cooldown.
- Added and deployed D1 migration `0004_replies_notifications.sql`; deployed Worker version `67a521d8-70a3-4750-a255-5a566957876a`.
- Added and deployed D1 migration `0005_asia_pacific_locations.sql`; deployed Worker version `da60a0a5-4b4e-479a-a683-be7bf4903920` and verified a Singapore viewport query.
- Added and deployed the read-only `/api/recent` endpoint in Worker version `697a2bf2-0d1e-4983-a1c7-b3a35f9730f5`; verified Brisbane results are ordered by descending creation time.
- Deployed cross-country notification locations and the reply-specific cooldown in Worker version `d554e469-75d7-485f-baaf-4968b98f2cf9`; smoke-tested notifications and the reply route without creating public content.

## Work completed in the current session

- Removed the remaining splash-screen state, timer, component, and session-storage helper from `src/App.js`.
- Reshaped `GoldCoastTravelPage.jsx` into outbound and return journey order.
- Removed the confusing all-purpose inline tram tracker from the main journey flow.
- Moved the reverse-direction button between train and tram cards.
- Fixed missing Shout Out map label helpers and made the composer display a derived area plus approximate coordinate.
- Removed the duplicated visible “Brisbane” heading from Shout Out.
- Raised the opacity/contrast of secondary text, platform facts, later-departure text, transfer labels, and empty states on dark Gold Coast cards.
- Verified the live Cloudflare health and `/api/map` endpoints. The Worker and pinned-location migration are active and returning current posts.
- Corrected the Shout Out top bar to a compact three-column mobile layout, moved map actions to the top-right, increased their tap targets, and added a retry action for transient map-loading failures.
- Added a focused Tram Times subview inside the Gold Coast feature. It keeps station search and Near Me out of the main journey, shows four upcoming trams in either direction, remembers its own station, and rejects misleading “nearby” suggestions when the nearest stop is more than 10 km away.
- Added Australia-wide Shout Out browsing, a visible 1 km posting radius, current-location enforcement, a newest-post activity pulse, and clearer location/time/text detail sheets.
- Validated the Australia D1 migration in SQLite, validated an in-range Sydney post (201), validated an out-of-range Brisbane-to-Sydney pin rejection (422), passed Worker syntax checking, `git diff --check`, and the production build.
- Gave the home Shout Out card a coral activity accent, Gold Coast a sea accent with a sunny-yellow icon, and Airport a distinct blue Live dot. Live Transport and Study Spaces were deliberately left unchanged.
- Replaced green map message markers/clusters with a violet community accent while preserving coral for the newest-post pulse.
- Applied remote D1 migrations `0003` and `0004`, deployed the Worker, and verified health, map, notification, and reply-aware message responses.

## Unfinished work

### Highest priority

- Complete the remaining Food Shout detail/gallery browser testing with real user-selected photos. The map and empty composer were visually verified; automated browser upload was intentionally not used to avoid publishing test content.
- Visually verify the new focused tram-times subview and its Back-to-journey behavior on a phone viewport.
- Run mobile visual QA at approximately 390 × 844 for Home, Gold Coast outbound, Gold Coast return, Airport, and Shout Out.
- Repeat Gold Coast data QA with the local transport API on port 8787 running. The last empty state was caused by the Vite proxy receiving `ECONNREFUSED` from the stopped local API, not evidence of a production feed failure.

### Shout Out follow-up

- Deploy the frontend containing the Food Shout map, 1–3 photo composer, reply/activity UI, and gallery. The compatible Worker, D1 schema, and R2 bucket are live.
- Confirm map marker counts and latest previews update after posting without a full reload.
- Add/verify accessible 44 px map controls, focus return from the composer sheet, Escape handling, and reduced-motion behaviour.
- Verify the vector-label lookup produces useful names across Australian cities and regional areas. Some places may still fall back to coordinates when the tile has no nearby label.
- Add moderation tests for obfuscated links, `.au` domains, IP addresses, contact handles, dangerous phrases, and benign phrases such as “wifi is dead”. Regex moderation reduces abuse but cannot guarantee that every unsafe message is detected.
- Verify reports, expiry cleanup, and pin cleanup against the remote D1 database.
- Test replies and cross-device reply/reaction notifications end to end. Existing posts created before migration have no anonymous author hash, so only posts created after this release can receive notifications.
- Web Push while the PWA is fully closed is not implemented. Current notifications appear inside Shout Out while the app is open; true phone push requires Push API subscriptions, VAPID keys, and a service-worker push handler.

### Foodie Finds post-detail redesign (completed locally)

- Replaced the oversized ratings/comments accordion with a compact three-action row: rating, comments, and save.
- Rating and comments now open as separate animated panels. Tapping Comment opens and focuses a text-first composer immediately; Reply reuses the same field.
- Comment identity is intentionally hidden in the post detail. Entries show only the selected feeling, relative time, message, and minimal reply/report controls.
- Ratings use a visual half-star picker from 0.5 to 5 instead of a range slider.
- One, two, or three uploaded photos use a fixed connected collage. Three photos use one large image plus two stacked images, with no horizontal scrolling.
- Broken or missing image objects show a warm food-themed fallback instead of an empty image box.
- The detail sheet no longer shows post-owner identity. Owner-only Edit and Delete controls remain available.
- Raw coordinates and generic pin labels are hidden from detail/feed/ranking cards. A location is displayed only when a meaningful `placeName` was found; the exact coordinates remain internal for map placement.
- Mobile QA was completed at the current 430 px in-app viewport for the collapsed detail, half-star rating panel, comments panel, and tap-to-open comment editor. No live rating, comment, deletion, or upload was submitted during QA.
- `npm run build` passes. The only output is the existing Vite large-chunk warning.

### Store discovery and photo-map update (completed locally, Worker deploy pending)

- The main map search now finds stores and full addresses instead of filtering only existing posts. Choosing a result moves the map to it and exposes compact Google Maps and **Post here** actions.
- Composer place search is no longer hard-bounded to the current viewport. Map position is still used as a ranking hint, while global matches remain eligible.
- Added key-free Google Maps URL handoffs for a typed query, selected place, and a post with a verified place name. This does not add Google Places billing or import Google listings into the database.
- Exact manual pin selection remains available worldwide. The Worker coordinate validation now accepts world coordinates instead of the earlier Asia-Pacific bounds.
- When a new business is absent from OpenStreetMap, the user can hand off the query to Google Maps, return to drop the exact pin, and enter a custom store name before publishing.
- Added top-level **All / Meals / Drinks / Snacks** filters. Snack is also a valid post type; the snack filter includes snack, dessert and cafe entries, while Meals includes dishes and food-spot finds.
- Map pins now attempt to use the post's first real food photo as a small circular image marker. Existing category artwork remains a fallback when an image is missing or cannot be decoded. The breathing ring still identifies recent posts and clustering remains enabled.
- Replaced the static detail collage with one efficient hero photo plus up to three attached, tap-select thumbnails; it never requires horizontal image scrolling.
- Removed both versions of the “No finds here yet” empty-state notification from the map and Nearby feed.
- Local mobile UI and store-search results were checked read-only. `npm run build` and `git diff --check` pass; the existing Vite large-chunk warning remains.
- Cloudflare deployment is pending because the saved Wrangler authentication expired on 2026-08-25. Run `npx wrangler login`, then deploy the existing `cloudflare/shoutouts` Worker. No schema migration is required for this update.
- Branch search now requests and displays up to 12 address-labelled matches instead of silently truncating the list to five/six. The cache key was versioned so an older one-branch response is not reused after deployment.
- The country/region selector moved from the horizontally scrolling food filters into the fixed header. It remains readable at the mobile breakpoint and collapses to a globe-only control at 320 px.
- Standard Google Maps URLs cannot call back into this PWA. The composer therefore has a compact **Bring a Google location back** field that locally parses full Google Maps URLs containing coordinates, `!3d…!4d…` place links, `@lat,lng` links, or plain `lat,lng`. Short `maps.app.goo.gl` links are not resolved automatically.
- The same Google-return parser is now accessible directly under the main map search. A valid pasted link/coordinate moves the map and creates the normal Google Maps + **Post here** card without requiring the user to start the composer first.
- At phone widths the header uses the profile avatar without the display-name text, leaving a stable centred country selector and preventing overlap with the notification button.
- The refreshed header and category row were visually checked in the in-app mobile viewport on 2026-08-25. The build still passes.

### Data and product questions not fully resolved

- The tram tracker now uses a full-screen subview under `?page=gold-coast`; Back returns to the journey without adding another home tile.
- Whether to show a map-derived place label only, or place label plus approximate coordinate. Current implementation prefers both for clarity and privacy.
- Whether anonymous posts should last daily or weekly. The current backend uses seven-day expiry.
- Whether airport flight-number tracking is worth adding. A free, reliable Brisbane Airport live-flight API has not been selected, and the feature may distract from the core ground-transport use case.
- Whether to add third-party automated moderation. The present requirement is free-only, so the current design uses Worker validation, rate limits, reports, auto-hide, and expiry.
- The Worker validates that the submitted pin and submitted current location are within 1 km, but a normal web app cannot prove that client-provided GPS has not been spoofed. This is a useful safety/UX boundary, not tamper-proof presence verification.

### Exact store search, photo GPS, and post refresh (completed locally; Worker deploy pending)

- Store/address queries now include the selected country code, use a versioned search cache, and sort equivalent branch matches by distance from the current map position. Search results show their distance when available. The free provider remains OpenStreetMap/Nominatim, so a business that exists only in Google Maps still cannot be imported automatically without a paid Places integration.
- Verified that the free provider currently returns **Haidilao Hot Pot, 341 Mains Road, Sunnybank** for an Australia-constrained Haidilao search near Brisbane. The Worker update must be deployed before the production app receives the new country filter/ranking response.
- Added local EXIF GPS reading for selected food photos using the open-source `exifr` package. When a photo contains GPS metadata, Step 1 shows its exact latitude/longitude and a compact **Use it** action. Metadata is read on-device and kept in the current composer state; it is not copied into browser localStorage.
- If iPhone privacy or another app strips photo GPS, the UI does not guess a location and the existing store search, GPS, and exact-pin choices remain available.
- A successful post is inserted into the current map state immediately. The map then moves to the post and revalidates once after `moveend`, fixing the old race where the app fetched the previous viewport and appeared not to refresh.
- `npm run build` and `git diff --check` pass. The existing large-chunk warning remains.

### Latest-post signal, bilingual search, and sharing (completed locally; Worker deploy pending)

- Only the newest visible food post now receives the breathing map halo. The previous implementation pulsed every post from the last 24 hours, which made the signal ambiguous. The new halo is slower, softer, and remains static when reduced motion is enabled.
- English and Chinese place searches now request bilingual OpenStreetMap names. Results prefer the language used in the query and show the alternate English/Chinese name when OpenStreetMap provides one.
- Food detail has a compact native Share action. Shared URLs include `?page=shout-outs&find=<post-id>` and open the referenced post directly; browsers without the native share sheet copy the link instead.
- Photo GPS, exact pin, current GPS, recent locations, and store/address search remain the compact location choices. No paid map or sharing service was added.

### Location correction, stable map refresh, rating lists, and country header (completed locally; Worker deploy pending)

- Owners can now change a published post's location from Edit using store/address search, current GPS, the current map centre, or the existing Google Maps handoff. The Worker PATCH route updates coordinates, label, provider identity, venue anchor, and geohash together.
- Map requests now carry a monotonic request sequence so an older response cannot overwrite newer pins. Publishing inserts the post immediately, clears filters that could hide it, moves the map, and revalidates through the latest filter-aware fetch function.
- Rated Picks uses explicit rating thresholds: 4.0+ is eligible for recommended lists, below 3.0 is eligible for Not recommended, and unrated finds appear in neither list. Ranking is by rating average, then rating count, then recency; likes/comments cannot turn a low-rated find into a recommendation.
- The header country control now uses a real flag emoji plus a compact code (`AUS`, `CN`, `TW`, `HK`, `MO`, `SG`, `MY`, etc.) instead of the full country name. Per the requested display rule, Hong Kong uses `🇭🇰🇨🇳 HK`, Taiwan uses `🇨🇳 TW`, and Macau uses `🇲🇴🇨🇳 MO`.
- Posting is not blocked when the selected place belongs to a different available country. The composer and location editor show a compact mismatch warning telling the user which country code to select in the header.
- OpenStreetMap search results now carry their country code so mismatch warnings are exact for searched stores. GPS/photo/manual coordinates use a local best-effort region estimate only for the warning and never block posting.
- Mobile browser QA confirmed the compact `🇦🇺 AUS` header and the Top/Not recommended sheet. The build, Worker syntax check, and `git diff --check` pass.

### Food reply notifications (completed locally; Worker deploy pending)

- Fixed the shared notification reader so Foodie Finds notifications join `food_comments` and `food_shouts`, not only the older map-message tables. The bell now receives the actual reply text plus the food-post title.
- A reply to a comment now notifies that comment's author. A new top-level comment notifies the post author. Self-replies do not create notifications.
- Selecting a food reply notification opens the original food post with its Comments panel already expanded and loaded.
- The existing in-app badge loads on page entry and refreshes periodically while alerts are enabled. This is still in-app activity, not operating-system Web Push when the PWA is closed.
- Verified the SQL path in an isolated temporary SQLite database: a sample reply returned `I loved this too | Great noodles | post-owner`. No Cloudflare data or public comment was created. The frontend build and both Worker syntax checks pass.

### Posts outside Brisbane after refresh (completed locally)

- Fixed the apparent disappearing-post issue for trips such as Perth. The API intentionally loads only posts inside the visible map bounds, but the page previously reset the map to Brisbane after every refresh.
- The food map now saves its last centre, zoom, and selected country locally and restores that viewport on the next visit.
- On the first visit after this fix, when no saved viewport exists yet, the page uses the most recently chosen or posted food location as a recovery fallback. This should reopen near the existing Perth post instead of Brisbane.
- The saved viewport is local-only and does not increase Cloudflare storage usage or add any paid service. `npm run build` and `git diff --check` pass.

### Compact Foodie Finds header (completed locally)

- Reworked the mobile top bar from four competing controls into three clear toolbar groups: Back, a shared profile/country capsule, and Notifications.
- The display name remains visible on small phones instead of collapsing to an unexplained avatar. Long names truncate safely, while the country stays independently clickable with a compact flag, code, and disclosure chevron.
- Reduced the header and edge controls from 68/44 px to 64/40 px while preserving accessible tap areas and clearer separation. The map height now accounts for the shorter header.
- Verified the layout at 390 px and 320 px widths; no overlap or horizontal overflow was found. The production build and `git diff --check` pass.

## Recommended next implementation order

1. Visually verify Shout Out at 390 × 844, including New nearby, 1 km boundary, denied location, out-of-range pin, details, and reduced motion.
2. Visually verify the focused tram tracker and both Gold Coast directions.
3. Deploy the frontend, then smoke-test an Australian pin outside Brisbane.
4. Test a reply and reaction from a second browser/device and confirm the Activity badge on the original device.
5. Test outbound and return transfers with live and timetable-only rows.
6. Test installability on Android Chrome and iPhone Safari/Add to Home Screen.

## Local development

Project directory:

`/Users/yeezy/Documents/GitHub/UQ BUS TIME BOARD/uq-lake-bus`

Commands:

```bash
npm run dev
npm run build
npm run dev:shoutouts
npm run db:migrate:shoutouts
npm run deploy:shoutouts
```

Useful local URLs:

- Home: <http://127.0.0.1:4173/>
- Gold Coast: <http://127.0.0.1:4173/?page=gold-coast>
- Airport: <http://127.0.0.1:4173/?page=airport>
- Shout Out: <http://127.0.0.1:4173/?page=shout-outs>

## Main files currently changed

- `src/App.js`
- `src/pages/GoldCoastTravelPage.jsx`
- `src/pages/AirportTravelPage.jsx`
- `src/pages/ShoutOutPage.jsx`
- `src/styles/travel.css`
- `src/styles/home-live-info.css`
- `src/lib/travel-data.js`
- `src/lib/travel-utils.js`
- `src/components/SmartStationPicker.jsx`
- `server/gtfs-realtime.js`

The working tree already contained a large set of in-progress UI changes. Preserve these changes and avoid resetting unrelated work.
