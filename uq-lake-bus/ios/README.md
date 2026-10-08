# UQ Campus for iPhone

A SwiftUI iOS 17+ application with two tabs:

- **Your day:** native HealthKit step totals, a daily goal and Swift Charts weekly activity.
- **Campus:** the existing hosted website, preserving the bus board and campus tools.

The native screen works independently of deploying the web changes. To see Health
steps inside the web dashboard in the Campus tab, deploy this repository's updated
frontend to the existing Vercel project first. The WKWebView points to
`https://uq-bus-time-board-gxyx.vercel.app/`; change `Coordinator.dashboardURL` in
`CampusWebView.swift` if the production hostname changes.

## Install on your iPhone

1. Open `UQCampus/UQCampus.xcodeproj` in Xcode.
2. Select the UQCampus target → Signing & Capabilities. Select your Apple Developer
   team and a unique bundle identifier. Keep the HealthKit capability enabled.
3. Connect your iPhone, select it as the run destination, enable Developer Mode if
   iOS asks, and run the app. Signing/provisioning is required; an unsigned build
   cannot be installed on a physical device.
4. Open **Your day → Connect Apple Health**, and allow read access to **Steps**.
5. Check that today's total matches Health and that the current week's totals
   update. The app uses Brisbane day boundaries, which can differ from Health's
   local-day display when travelling.

No database, server Health endpoint, subscription or new environment variables
are required. This is source for an iPhone app, not an App Store release or a
signed installable IPA. App Store distribution needs your signing, app icon,
privacy disclosures, privacy policy and Apple review.

## Data and permissions

Only `HKQuantityType(.stepCount)` is requested, for reading. No Health writes,
workouts or heart-rate access. HealthKit statistics aggregate the totals; raw
phone and Watch samples are not manually added together. No readable samples
remain “No data”, not zero: HealthKit deliberately does not disclose whether read
permission was denied. An explicit numeric zero is retained.

Refresh occurs while the app is active, on foregrounding and manually. This is
not continuous background sync; locked-device queries can fail and show an error.
Health totals remain in memory. Neither native code nor the web bridge uploads
them, puts them in URLs, logs them or persists them in localStorage. The saved
preferences only include connection intent and the native goal. The website's
manual step records and calendar retain their existing local storage behavior.

The bridge accepts only named actions from the production HTTPS hostname in the
main frame, rejects other origins/frames, and opens external navigation outside
the embedded page. The hosted first-party page must remain trusted: it receives
step totals in memory when displayed in this app. Disconnect clears native totals;
the web view clears its snapshot on its next refresh. To revoke OS permission,
use Apple's Health app permissions.

Safari and desktop browsers cannot read this native bridge and do not receive
Health data. There is no iCloud or cross-device sync. Native and web goal settings
are currently separate preferences.

## Verify

```sh
xcodebuild -project ios/UQCampus/UQCampus.xcodeproj -scheme UQCampus \
  -sdk iphonesimulator -configuration Debug \
  -derivedDataPath /tmp/uq-campus-ios-build CODE_SIGNING_ALLOWED=NO build
npm run test:life
npm run build
```

The unsigned simulator build verifies compilation, not real Health access.
On a physical iPhone test granting Steps access, denied/revoked access, no data,
phone/Watch aggregated totals, foreground refresh, disconnect and midnight rollover.

References: [HealthKit setup](https://developer.apple.com/documentation/healthkit/setting-up-healthkit),
[HealthKit statistics](https://developer.apple.com/documentation/healthkit/hkstatisticsquery),
[WebKit reply handler](https://developer.apple.com/documentation/webkit/wkscriptmessagehandlerwithreply).
