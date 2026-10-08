# UQ Lakes Bus Board

A minimal React app for the upcoming buses around UQ Lakes station.

## Run

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run dev
```

3. Open:

```text
http://127.0.0.1:4173
```

If you want the built single-server version instead:

```bash
npm run build
npm run start
```

Then open:

```text
http://127.0.0.1:8787
```

The frontend is React with Vite, and the backend is a tiny Express endpoint that:

- reads the official Translink UQ Lakes station metadata
- loads each UQ Lakes stop's full timetable page for today
- extracts the structured departure payload embedded in the official page
- merges the upcoming departures into one clean board

## Favourites and reminders

- Users can save favourite routes in the browser with `localStorage`.
- Optional reminder notifications can be set for one specific upcoming departure.
- Current reminders are browser notifications and in-app toasts that warn again at about 5, 3, and 1 minute before departure while the page is still open, then clear themselves after the bus departs.
- True push notifications after the tab is closed will need a service worker plus a server-side database for push subscriptions and saved favourites.

Track how congested of the bus
And The station status how many people
# UQ Campus Helper

## Cloudflare Shout Out API

The anonymous campus Shout Out feature uses a Cloudflare Worker and D1 database.
The frontend never stores or sends a user's precise location; geolocation is used
only in the browser to suggest the nearest supported campus place.

```bash
npx wrangler login
npm run db:migrate:shoutouts
npm run deploy:shoutouts
```

Worker configuration and migrations live in `cloudflare/shoutouts/`.

### Compact personal dashboard

The existing home screen now includes a compact **Your day** section below the
weather card: Next Class, Daily Steps and a seven-day steps chart. Existing
branding, home widgets, customization, trips and transport pages are preserved.
The home view shows one class and a compact step total. Class details and grouped settings open in a separate sheet.

**Calendar:** paste a private UQ subscription link in Dashboard settings. HTTPS
and `webcal://` links on `timetable.my.uq.edu.au/aplus/rest/calendar/ical/` are
accepted, including URLs without an `.ics` suffix. The client sends the link in
the JSON body of `POST /api/calendar`. The Vercel function validates the allowlist,
rejects non-public DNS answers, pins the HTTPS connection to a checked address,
verifies TLS, rejects redirects, caps responses at 1 MB and times out downloads.
Responses are private/no-store; the function neither persists nor logs the URL
or timetable. The same handler runs through Express for local development.

`ical.js` expands recurrence rules, EXDATEs and recurrence exceptions, including
moved and cancelled classes. Embedded VTIMEZONE definitions are supported; IANA
timezones without embedded definitions use the runtime's Intl timezone data.
Floating times and date-only events use Australia/Brisbane. The display always
uses Brisbane time. Current classes, the next upcoming event, today's remaining
classes, location and description are available. No timetable is hardcoded.
Sync runs on opening the home dashboard, every 30 minutes while mounted, on
returning to a stale visible dashboard, and using manual refresh. Failed syncs
keep the last successful calendar with a visible error.

`.ics` imports stay in the browser and are snapshots, not subscriptions. Expansion
covers the next 366 days and is bounded to 3,000 VEVENTs, 100,000 iterations and
5,000 upcoming occurrences. Sub-hour/day-frequency rules (SECONDLY, MINUTELY,
HOURLY), unsupported timezones and invalid/oversized calendars report errors
rather than silently showing incorrect data. Other subscription providers are
not enabled; add one only after reviewing its hostname, paths and fetch behavior.

**Steps:** manual daily totals, default goal of 10,000, editable goal, percentages,
source and update timestamp. The Recharts Monday–Sunday chart updates immediately,
includes exact-value tooltips and an accessible totals list, highlights days
meeting the current goal, and distinguishes missing entries from explicit zero.
Calendar, goal and step records are stored in `uq-life-v1` in localStorage. There
is no account, database, encryption at rest or device-to-device sync. Anyone
using the browser profile can access this data; settings explains this and can
remove dashboard data without affecting bus favourites or home customization.
Storage failures are surfaced instead of claiming persistence succeeded.

**Added packages:** `ical.js`, `recharts`, `ipaddr.js`.

**Implementation files:**
- `src/components/LifeDashboard.jsx`: dashboard, cards, chart and settings.
- `src/styles/life-dashboard.css`: styles scoped to the addition.
- `src/lib/calendar-sync.js`, `src/lib/life-data.js`: syncing, local records and Brisbane dates.
- `shared/calendar.js`: feed URL validation and calendar expansion.
- `server/calendar.js`, `api/calendar.js`: protected calendar fetcher and Vercel handler.
- `tests/life.test.js`: parser, timezone, cancellation, security, endpoint and steps checks.
- `src/App.js`, `server/index.js`, `vercel.json`: home insertion and API wiring.

**Run and deploy:** from `uq-lake-bus`, run `npm install`, `npm run dev`,
`npm run test:life`, and `npm run build`. Deploy through the existing Vercel project
with `uq-lake-bus` as its root directory (or use `npx vercel --prod` from that
folder after linking the project). **No new environment variables are required.**
There is no configured lint script or TypeScript setup in this JavaScript project.
A genuine private subscription is still needed to verify the live UQ feed end to
end; automated calendar tests use synthetic ICS fixtures only.

**Native Apple Health:** see `ios/README.md` for the SwiftUI iPhone app, HealthKit reader and device setup. The native bridge provides steps only inside the iPhone app; ordinary browsers retain manual entry. Health totals are not persisted in localStorage or uploaded.

**Future integrations:** Google/Outlook OAuth and cross-device Health sync are not implemented; no inactive Connect buttons are shown. A future Apple Shortcuts receiver
must use HTTPS POST, user-scoped revocable credentials, schema validation,
rate limits and durable per-user storage before accepting step updates; incoming
records can use the current `{ value, updatedAt, source }` shape. Never accept
unauthenticated health writes or expose OAuth secrets in the client. Browser
JavaScript has no direct access to Apple Health or Apple Calendar databases.
