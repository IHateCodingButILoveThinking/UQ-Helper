# UQ Helper project handover

Last updated: 21 August 2026

## Current task

Continue the mobile-first redesign and finish the two active feature areas:

1. Make the Gold Coast journey flow immediately understandable: outbound is train to Helensvale, then tram; return is tram to Helensvale, then train to Brisbane. Keep the reverse-direction control between the two journey cards and keep text compact and high contrast.
2. Finish the Shout Out map as a simple Australia-wide browsing experience. Publishing requires current-location permission and the confirmed public pin must remain within 1 km of that location.

The immediate work in progress is mobile visual QA and frontend deployment. The D1 migrations and Worker API are already deployed.

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
- Added a mobile pin flow: enter posting mode, move the map beneath the centre pin, confirm the location, then compose.
- Geolocation is requested only after the user chooses Locate; it centres the map but does not automatically publish exact device coordinates.
- Publishing now requires a fresh current-location action. The chosen pin must remain inside a visible 1 km circle; both client and Worker reject an out-of-range pin.
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
- Added and deployed D1 migration `0004_replies_notifications.sql`; deployed Worker version `67a521d8-70a3-4750-a255-5a566957876a`.

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

- Complete visual browser testing of the Shout Out map. The local server, OpenFreeMap style URL, live Worker, and D1 map endpoint have been verified; the embedded tester could not reconnect to localhost after an earlier connection-error page.
- Visually verify the new focused tram-times subview and its Back-to-journey behavior on a phone viewport.
- Run mobile visual QA at approximately 390 × 844 for Home, Gold Coast outbound, Gold Coast return, Airport, and Shout Out.

### Shout Out follow-up

- Deploy the frontend containing the new reply/activity UI. The compatible Worker and D1 schema are already live.
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
