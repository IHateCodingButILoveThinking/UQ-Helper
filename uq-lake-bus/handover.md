# UQ Helper project handover

Last updated: 25 August 2026

## Resume checkpoint — read this first after a crash

The active work is at **Stage 7: frontend publication and production QA**. Do not recreate the R2 bucket, rerun migrations `0006`–`0008`, or redeploy an older Worker. The backend is already live. The current local branch is one commit ahead of GitHub because terminal GitHub authentication is missing.

| Stage | Status | Completed and verified | Still required |
| --- | --- | --- | --- |
| 1. Product logic | Done | Food-first map, exact chosen pin, permanent food/drink posts, 1–3 images per post, comments/replies, rankings, reactions and owner editing | Do not reintroduce the legacy seven-day/1 km Shout Out rules into Food Shout |
| 2. Database | Done and live | Remote D1 migrations `0006`, `0007`, `0008` applied to `uq-helper-shoutouts` | Only add a new numbered migration for future schema changes |
| 3. Image storage | Done and live | Private Standard R2 bucket `uq-helper-food-images`; binding `FOOD_IMAGES`; user billing limit; 8 GB application ceiling | Monitor real usage after launch |
| 4. Worker API | Done and live | Worker `d813461a-4aa3-48c5-9249-03dc9825fa45`; health and read-only viewport smoke tests passed | Production end-to-end upload/delete test without leaving junk content |
| 5. Abuse protection | Done and live | Parameterised SQL, field/request limits, image signatures, storage reservation, device/network counters, duplicate detection, privacy-safe event log and temporary block list | Review thresholds after real usage; no system can permanently identify or disable a physical phone |
| 6. Frontend implementation | Done locally | Multi-photo picker, red 3-photo boundary, aggregate upload progress, gallery, 1400 px resize, 1.5 MB limit, smaller phone photo panels; production build passed | Publish local commit to GitHub/Vercel |
| 7. GitHub/Vercel publication | Blocked | The local HEAD commit `tighten mobile food photo uploads` contains the final phone-image changes and this crash-safe handover | Push failed because the terminal has no GitHub credentials. Push `main` from GitHub Desktop or a signed-in terminal |
| 8. Mobile visual QA | Partial | Food map and empty 1–3 photo composer visually checked; layout is compact and readable | Test 1, 2 and 3 real photos, gallery swiping/buttons, slow upload, denied location and small iPhone viewport on the deployed site |
| 9. Social end-to-end QA | Not done | Local API coverage exists | Test post, reply, reaction, notification, report, owner edit/delete and automatic cleanup across two devices |
| 10. Gold Coast QA | Partial | Journey order, reverse control, tram tracker and high-contrast CSS implemented | Run local transport server on port `8787`, then verify outbound, return and Tram Times at phone size |
| 11. PWA/device QA | Not done | Manifest and service worker exist | Verify Android install prompt and iPhone Add to Home Screen after frontend deployment |

### Confirmed crash/tester record

- The embedded browser repeatedly timed out or reset while reconnecting to `localhost`. This is a tester/session crash; the Vite production build and Worker syntax checks passed.
- The Gold Coast empty error during the last local screenshot was caused by the Vite proxy receiving `ECONNREFUSED` because the transport server on port `8787` was not running. It was not evidence that the production transport feed failed.
- A real iPhone/Safari application crash has **not yet been reproduced**. To reduce the most likely photo-memory pressure, phone images now resize to a 1400 px maximum edge, stop at 1.5 MB, and use smaller previews. Device testing is still required before calling that issue closed.
- No local development servers should be assumed to survive a crash. Restart only the server needed for the next QA step.

### Exact next action

1. Push the local `main` branch to `origin/main` from an authenticated Git client.
2. Wait for the connected Vercel deployment.
3. Open the deployed Food Shout page on the affected phone and test one photo first, then three photos.
4. If Safari still crashes, record the iPhone model, iOS version, browser/PWA mode, selected image count and the exact screen/action immediately before the crash.

## Food Shout implementation (current)

- Replaced the active Shout Out page with a mobile-first, photo-first food discovery map while preserving the legacy page source for rollback/reference.
- Added D1 migrations `0006_food_shouts.sql`, `0007_food_identity_tone.sql`, and `0008_food_image_limits.sql` for uploads, permanent food posts, 1–3 ordered images, comments/replies, like/save, reports, freshness checks, tried votes, venue anchors, cached place search, custom display names, explicit comment meaning, storage accounting, abuse signals, and temporary blocks.
- Added an R2 binding named `FOOD_IMAGES` and a Worker Food API for image upload/serving, map queries, place search, create/detail/delete, comments/replies, reactions, reports, freshness, and tried votes.
- Added browser-side image resizing/WebP compression; re-encoding removes EXIF metadata and the selected map location is never read from the photo.
- Food pins preserve the exact user-confirmed six-decimal coordinate. Manual posting now enters a dedicated pin mode with a breathing centre marker and an explicit **Use exact pin** action.
- Food and drink posts do not expire (`expires_at` stays `NULL`). Unclaimed uploads still expire for storage hygiene.
- Added custom or stable random nicknames, plus commenter-selected `Loved it`, `Helpful`, and `Needs update` labels. This replaces unreliable hidden sentiment guessing.
- Owners can edit title, caption, nickname, price, cuisine, and category without replacing the photo or moving the exact pin. Comments can be individually reported as well as deleted by their author.
- The Worker now verifies JPEG/PNG/WebP file signatures instead of trusting the browser-provided MIME label; a mismatched local upload is rejected with HTTP 415.
- Each post accepts 1–3 photos. The composer has a visible red three-photo boundary and aggregate upload progress; the Worker independently rejects zero or four-plus photos.
- R2 is protected by an 8 GB application ceiling beneath the 10 GB free allowance, 1.5 MB per-image validation, one-hour expiry for abandoned uploads, daily device/network upload budgets, and storage reservations made before an object write. Phone images are resized to a 1400 px maximum edge before upload.
- Added a privacy-safe abuse shield. It measures write velocity for the anonymous client hash and a one-way network hash, detects same-device near-identical same-location posts within 24 hours, logs only rejection metadata, and temporarily blocks automated bursts. It does not store raw IP addresses or claim to identify a physical phone.
- Added viewport clustering, Search this area, dish/caption search, Cuisine and Budget filters, Nearby/My Shouts/Saved sheets, Top 3 food and Top 3 drink community rankings, detail sheets, one-level replies, report/delete, Still Good, and I Tried This.
- Category labels are now user-facing concepts such as `Dish worth ordering`, `Drink worth trying`, `Hidden food spot`, `Sweet find`, and `Budget find`. UI icons use Lucide rather than generated artwork.
- Local D1 migrations, Worker syntax, exact-coordinate API round-trip, permanent-post response, owned-post editing without location movement, custom name/comment tone, image upload/signature rejection, reactions, freshness, tried vote, comments/replies, and the production frontend build have been tested successfully.

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

### Data and product questions not fully resolved

- The tram tracker now uses a full-screen subview under `?page=gold-coast`; Back returns to the journey without adding another home tile.
- Whether to show a map-derived place label only, or place label plus approximate coordinate. Current implementation prefers both for clarity and privacy.
- Whether anonymous posts should last daily or weekly. The current backend uses seven-day expiry.
- Whether airport flight-number tracking is worth adding. A free, reliable Brisbane Airport live-flight API has not been selected, and the feature may distract from the core ground-transport use case.
- Whether to add third-party automated moderation. The present requirement is free-only, so the current design uses Worker validation, rate limits, reports, auto-hide, and expiry.
- The Worker validates that the submitted pin and submitted current location are within 1 km, but a normal web app cannot prove that client-provided GPS has not been spoofed. This is a useful safety/UX boundary, not tamper-proof presence verification.

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
