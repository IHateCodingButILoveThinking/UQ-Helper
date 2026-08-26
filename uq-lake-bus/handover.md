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

### Header refresh and floating-action collision fix (completed locally)

- Added a compact refresh icon directly after the full profile name in the shared top-bar capsule. It reloads food posts for the current visible map area and spins while loading.
- Locate and Post now share a shorter horizontal bottom dock instead of stacking vertically, reducing the amount of map content they cover.
- A selected store already has its own **Post here** action, so the global Post button now hides in that state and Locate rises above the selected-place card. This removes the previous overlap between all three controls.
- Verified the complete header at 390 px and 320 px widths. `npm run build` and `git diff --check` pass.

### Locate fetch and persistent in-session pins (completed locally)

- Fixed Locate so it fetches the newly visible GPS area automatically after the map finishes moving. The locate spinner now stays active until the nearby-post request completes.
- Normal area fetches now merge fresh results into up to 500 already loaded pins instead of replacing the whole map collection. Travelling or locating to another area therefore no longer erases previously loaded posts; panning back shows those cached pins immediately.
- Changing Meals/Drinks/Snacks, cuisine, budget, My finds, or Saved still deliberately replaces the collection so pins always respect the active filter.
- Confirmed the existing Cloudflare R2 upload guard reserves space before `put()` and rejects the image before storage when the hard ceiling is reached. The configured ceiling remains 8 GiB, below Cloudflare Standard R2's current 10 GB-month free storage allowance; the requested red line was not increased.
- `npm run build`, Worker syntax validation, and `git diff --check` pass.

### Persisted address edits and confidence-ranked place lookup (completed and Worker deployed)

- Root cause: the public Cloudflare Worker predated the coordinate/location portion of the PATCH handler. The frontend could submit a new address, but the deployed API still returned the old location. The corrected Worker is live as version `4aa91c1c-037c-45e5-86e9-b3c27839f3c8`.
- Fixed a second failure where OpenStreetMap labels could be 160 characters while D1 enforces a 120-character `location_label`. New geocoding results are now safely capped before create/edit submission.
- Food-detail editing verifies that Cloudflare returned the exact requested coordinates and venue name before closing the editor. After a successful save, the local pin moves immediately, the map centres on the corrected store, and the location is added to recent places.
- Kept OpenFreeMap as the map layer and did not add Geoapify because it requires an API key, has soft free-plan limits, and requires additional attribution. This preserves the no-paid-services constraint.
- Upgraded the existing OpenStreetMap/Nominatim lookup instead: Australia searches add country context, request multiple candidates, score name/address/locality coverage plus map proximity, reject country mismatches and results below 0.52 confidence, cache only successful matches for 30 days, and never place an uncertain marker.
- Live smoke test: `Haidilao Sunnybank` returned the correct `341 Mains Road, Sunnybank, Queensland, Australia` branch at `-27.5729978, 153.0643288`, 0.5 km from the test bias, confidence `0.829`.
- Added an ownership check before venue resolution so unauthorised PATCH requests cannot create stray venue anchors. Frontend build, Worker syntax checks, and both deployments passed.

### Clear selected-versus-saved address state (completed locally)

- Reviewed open-source place-picker patterns and kept the refinement focused: selection confirmation, match quality, and an explicit final save instead of adding more controls or decoration.
- Location search results now label candidates as **Strong match**, **Good match**, or **Possible match**, alongside distance and address, so users can compare branches before moving a pin.
- After choosing a new store/address, the editor shows **New address selected** and changes the primary action to **Save new address**. This makes it clear that choosing a result is not the same as persisting it.
- Cancel now fully restores the saved post fields and saved coordinates, closes the location picker, and removes any pending-location state. Reopening Edit can no longer show an abandoned address from the previous attempt.
- An empty confident search explains how to retry with store + suburb/city + state. No new API, subscription, storage, or paid service was added.
- `npm run build` and `git diff --check` pass.

### Per-reply unread notification badge (completed and Worker deployed)

- Fixed the bell behavior that previously marked every notification as read as soon as the Activity sheet opened.
- The coral number badge now remains on the bell while replies are unread. Opening the bell only refreshes the list; it does not clear the number.
- Tapping an individual reply marks only that notification as read, decreases the badge by one, and opens the matching food post with Comments expanded. Other unread replies remain counted after closing or refreshing.
- Unread rows now have a compact coral dot, and the floating badge has stronger top-right positioning, contrast, shadow, and a short appearance animation.
- The notification read endpoint remains backward compatible: Foodie Finds sends a notification ID for per-item reads, while older callers without an ID can still mark all notifications read.
- Deployed Cloudflare Worker version `99d68961-e393-4801-8e49-4284a034ce96`. A live no-op smoke request against a nonexistent UUID returned `{ accepted: true, updated: 0 }`; no user data was created or changed.
- No paid Cloudflare feature or new storage was introduced. Frontend production build, Worker syntax validation, and `git diff --check` pass.

### Photo-location magic and automatic map loading (completed and Worker deployed)

- EXIF GPS is no longer shown as raw developer-style coordinates. A new cached OpenStreetMap reverse-geocoding endpoint converts photo GPS into a venue/address and keeps the original precise photo coordinates for the post.
- Step 1 now shows a compact **Location detected from photo** card with a human-readable place, an **Edit** action, and a short camera-location tip. When photo GPS succeeds, Continue skips the location-search step and goes directly to Details.
- The venue search field is explicitly optional because GPS and map-pin alternatives exist. Short/empty searches no longer show a contradictory validation error, and **Bring a Google location back** is now **Paste a Google Maps link**.
- Mobile sheets now lock background scrolling to prevent the double-scrollbar/focus trap. Details fields use softer fills, selected vibe tags use the coral brand fill with white text, and **Share find** remains sticky near the bottom while optional fields expand.
- Map posts still load automatically on initial map load. After movement, a 320 ms debounced fetch now runs automatically; the old required **Search this area** action was removed.
- Map requests fetch a 40% padded viewport, reuse a two-minute/40-area in-memory cache, abort the previous network request, merge new posts without clearing existing markers, and preserve the existing MapLibre clustering. The manual refresh icon bypasses the cache to request the newest posts.
- D1 still receives bounded north/south/east/west queries and does not send the whole database. The existing 500-pin client cap and Cloudflare storage/upload red line remain unchanged.
- Decorative mascot, price badges on pins, and a permanent bottom carousel were intentionally not added in this pass because they would increase crowding and compete with the map's primary search/post actions.
- Deployed Cloudflare Worker version `f326c8fd-d579-4f15-ba36-44aa3108ca3d`. Live smoke test resolved the known coordinate to **Haidilao Hot Pot, 341 Mains Road, Sunnybank**. No paid API or subscription was added; successful reverse results use the existing D1 cache for 30 days.
- Frontend production build, Worker syntax validation, deployment, live reverse-geocoding smoke test, and `git diff --check` pass.

### Honest unrated-store state (completed locally)

- New food finds no longer preselect a misleading 5.0-star rating for a user who has not rated them.
- The rating panel starts with empty stars, **Not rated yet · be the first**, and a disabled **Select a rating** action. Save becomes available only after the user deliberately chooses a 0.5–5.0 value.
- Existing users still see their previously saved personal rating when reopening the panel, and the public average remains hidden until at least one real rating exists.
- Frontend production build and `git diff --check` pass; this is frontend-only and needs no Worker or paid service change.

### Optional Google Maps link guidance (completed locally)

- The Google Maps import is now clearly labelled **Optional** so users understand that store search, GPS, and Drop a pin remain the simpler primary choices.
- Expanding it shows one compact instruction: **Open the place → Share → Copy link**, followed by a clearly labelled paste field.
- The Use action stays disabled until something is pasted, and an invalid value now explains exactly how to obtain the correct link instead of returning a technical coordinate-focused error.
- The helper closes with **No link? Search above, use GPS, or drop a pin**, preventing the feature from becoming a blocker.
- Frontend production build and `git diff --check` pass; no backend, paid API, or deployment change is required.

### Compact mobile photo upload and place step (completed locally)

- The first photo still uses a clear large chooser, but once a photo is selected it collapses into a fixed three-slot thumbnail tray. Users can review, remove, and add all 1–3 photos without scrolling through a tall gallery.
- Photo preparation now reports **Preparing X of Y** and explains that images are being compressed for faster upload.
- Step 2 is renamed **Set the place** and starts with the currently detected/selected location plus a one-tap **Keep** action. Search stays primary, GPS and Drop a pin are grouped as equal quick actions, and Google Maps import sits below them as an optional secondary method.
- The composer header remains visible while scrolling. During publishing, a compact status card reports **Uploading photo X of Y** and **Saving your find**, with aggregate percentage and a progress bar.
- Mobile browser QA opened the updated Step 1 at the live local server: the composer had matching `clientHeight`/`scrollHeight` (368 px) with document/body scrolling locked, confirming no initial double scroll.
- Frontend production build and `git diff --check` pass; no backend, storage, paid API, or deployment change is required.

### Foodie XP levels and compact profile (completed and Worker deployed)

- Added anonymous, device-based Foodie XP derived from valid active food posts; no account, new table, or additional storage service is required.
- XP rules: **+20** per valid find, **+10** the first time that device posts in a new roughly 1 km geohash area, and **+5** when the third distinct place is posted within a 30-minute food trail.
- Anti-spam limits: only the first **5 posts per local day** can earn XP and daily XP is capped at **120**. Posting remains allowed after the cap, but the profile history records **Daily limit reached** and awards 0 XP.
- Level thresholds grow progressively. Titles begin **Noodle Newbie**, **Snack Scout**, **Dish Hunter**, **Flavour Mapper**, **City Taster**, and **Food Trailblazer**.
- The top profile/name capsule now has a compact `Lv N` badge. Opening it shows a compact editable nickname row, level card, animated progress bar, XP needed for the next level, today's XP/post limits, three rule cards, expandable recent XP history, and My finds.
- Deleting a post removes its derived XP, preventing post-delete farming. Progress refreshes after a successful post or deletion.
- Deployed Cloudflare Worker version `ad7b9a84-001b-4725-a17f-471054f6fcf2`. A read-only live smoke test returned the correct new-device Level 1/0 XP profile.
- Mobile browser QA at 381 px showed the complete 517 px profile with matching client/scroll width (381 px), no horizontal overflow, and the `Lv 1` name badge visible. Frontend production build, Worker syntax checks, deployment, live API check, and `git diff --check` pass.

### Lightweight map/list header and ranked EXP profile (completed locally)

- Removed the oversized combined header capsule. Back, profile, country, Map/List, and notifications are now independent 40 px controls with consistent rounding and spacing.
- The profile is a circular initials avatar with a tiny overlaid `Lv N` badge. The country control is now a standalone flag only, and refresh moved to the reachable bottom action dock beside Locate and Post.
- Added a compact, accessible Map/List segmented control. List mode presents food-first cards from the current padded map area with photo, post type, relative time, venue, and honest rating state; it does not trigger another paid service or duplicate storage.
- Collapsed the long category strip behind one **Filters** control. Expanding it reveals meal/drink/snack, cuisine, budget, Near me, and Rated picks in the existing horizontal strip.
- Renamed **My finds** to **My posts** and added clear icons to Near me, My posts, and Saved.
- Changed user-facing XP copy to **EXP** and replaced novelty titles with a staged original rank ladder: Bronze, Silver, Gold, Plat, Diamond, and Aurora, each with IV–I divisions (Aurora becomes a star tier). Existing progressively harder level thresholds and anti-spam daily limits remain intact.
- Rank presentation is isolated in `src/lib/food-ranks.js`. Rank color now styles the avatar ring, compact gem, progress bar, and profile accents. The display name is read-only by default and opens an edit row only when tapped; save, Escape, and sheet close release mobile keyboard focus.
- The newest current-user map pulse and the user's own list cards inherit the current rank accent. A first rating from another device now creates a compact **New rating** bell item using the existing notification table; updates to the same rating do not create repeated notifications.
- Worker progress responses now include the rank metadata and return the rank label as the profile title. This Worker change is local and has **not** been deployed in this pass; the frontend remains backward compatible with the currently deployed progress response.
- Mobile browser QA at 381 × 747 confirmed: no horizontal overflow (`body` and header both 381 px), Map/List switching works, 26 current-area list cards render, filters expand without widening the page, and the complete Bronze IV/EXP profile is readable. `npm run build` and `git diff --check` pass.
- Design direction was informed by open-source segmented-control and gamification UI patterns, but no third-party runtime, asset, paid API, or copied game identity was added.

### Compact search, filter sheet, and existing-post EXP reconciliation (completed locally)

- Search is now a header icon that opens the existing store/address lookup only when needed. The map stays unobstructed by a permanent input, while List mode uses the same search icon without spending vertical space on a search bar.
- Filters are now a bottom sheet instead of a horizontal expansion. Type, cuisine, budget, Near me, and Rated picks remain available, but the map only shows one compact Filters control and an active-filter count.
- List mode now reduces its top inset when search is closed, keeping more food cards visible on a phone. Search and filter interactions were checked at 381 px with no horizontal overflow.
- The profile progress endpoint already recalculates EXP from the full active post history on each request, so older posts are included automatically with the same base, new-area, and food-trail rules; deleting a post removes its derived EXP. No per-account migration or extra table is required.
- Existing device-owned post cards and the latest owned pulse inherit the current rank accent. This keeps the rank identity visible without adding labels to every community post.
- Frontend production build, Worker syntax validation, and `git diff --check` pass. No new paid service or subscription was introduced.

### Filter apply flow and grid-only search (completed in code; user will verify)

- Filter choices are now draft values inside the bottom sheet. Selecting Meals, Drinks, Snacks, cuisine, or Budget no longer changes the active query immediately; only **Show finds** commits all staged values and closes the sheet.
- Removed the Find icon from the map header. The map header remains focused on navigation, profile, country, view, and notifications.
- List/Grid view now places the existing store/address search field beside the Filters control in one compact top row. The map has no persistent search field, while list search still supports place candidates and Google Maps fallback.
- The search submit control remains visually distinct from the map/list navigation controls and the input's leading search affordance.
- Display-name editing now opens a dedicated centered dialog with a focused input, Cancel, Save name, Escape handling, and outside-click close. Saving and cancelling explicitly release keyboard focus to avoid the mobile viewport staying zoomed.
- Per request, this follow-up was code-focused; the user will perform the next visual/device check.

### Search deduplication and retrospective EXP clarity (completed in code; user will verify)

- Removed the duplicate trailing search icon from the List/Grid search form. The single leading magnifier remains the search affordance and Enter submits the query.
- Kept the List/Grid search field and Filters control on the same 44 px baseline/radius so the top row reads as one consistent control group.
- The profile level card now distinguishes the two cases cleanly: newer progress responses show the total number of active posts counted, while older deployed responses show **EXP from all active posts** instead of incorrectly displaying zero. The Worker calculation already walks all active posts, including posts made before the ranking feature existed.
- Added a compact **How to grow** hint to the profile. The three EXP rules and daily cap now open in a small dismissible dialog instead of occupying the profile card permanently.
- No tests were run for this follow-up, per user request.

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
