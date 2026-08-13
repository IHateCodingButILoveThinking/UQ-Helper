import GtfsRealtimeBindings from "gtfs-realtime-bindings";

const GTFS_RT_BASE_URL =
  "https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates";
const GTFS_RT_SOURCE_URL =
  "https://translink.com.au/about-translink/open-data/gtfs-rt";
const GTFS_RT_TIMEOUT_MS = 8_000;
const MAX_NEAREST_STOP_DIFFERENCE_MS = 20 * 60 * 1000;

const MODE_FEED_PATHS = Object.freeze({
  bus: "Bus",
  ferry: "Ferry",
  rail: "Rail",
});

export async function applyGtfsRealtime(departures = []) {
  if (!departures.length) {
    return {
      departures,
      gtfsRealtime: false,
      sourceUrl: GTFS_RT_SOURCE_URL,
    };
  }

  const modes = Array.from(new Set(departures.map(getDepartureMode)));
  const feedResults = await Promise.allSettled(
    modes.map(async (mode) => [mode, await fetchTripUpdates(mode)]),
  );
  const feeds = new Map(
    feedResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value),
  );

  const enrichedDepartures = departures.map((departure) => {
    const feed = feeds.get(getDepartureMode(departure));
    const realtimeMatch = feed
      ? findRealtimeMatch(departure, feed.tripUpdates)
      : null;

    if (!realtimeMatch) {
      return markAsScheduled(departure);
    }

    const realtimeEpochSeconds = getStopTimeEpoch(realtimeMatch.stopUpdate);
    const realtimeUtc = Number.isFinite(realtimeEpochSeconds)
      ? new Date(realtimeEpochSeconds * 1000).toISOString()
      : departure.scheduledUtc;
    const minutesAway = Math.ceil(
      (new Date(realtimeUtc).getTime() - Date.now()) / 60_000,
    );
    const cancelled =
      Number(realtimeMatch.tripUpdate.trip?.scheduleRelationship) === 3 ||
      Number(realtimeMatch.stopUpdate?.scheduleRelationship) === 1;

    return {
      ...departure,
      cancelled,
      countdownMinutes: Math.max(minutesAway, 0),
      countdownText: cancelled ? "Cancelled" : formatCountdown(minutesAway),
      delaySeconds: getStopTimeDelay(realtimeMatch.stopUpdate),
      displayTime: formatTime(realtimeUtc),
      gtfsRealtime: true,
      live: !cancelled,
      realtimeSource: "Translink GTFS-Realtime v2.0",
      scheduledUtc: realtimeUtc,
      tripId: realtimeMatch.tripUpdate.trip?.tripId ?? null,
    };
  });

  return {
    departures: enrichedDepartures.sort(
      (left, right) =>
        new Date(left.scheduledUtc).getTime() -
        new Date(right.scheduledUtc).getTime(),
    ),
    feedTimestamp: getLatestFeedTimestamp(feeds),
    gtfsRealtime: feeds.size > 0,
    sourceUrl: GTFS_RT_SOURCE_URL,
  };
}

async function fetchTripUpdates(mode) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GTFS_RT_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${GTFS_RT_BASE_URL}/${MODE_FEED_PATHS[mode]}`,
      {
        headers: { accept: "application/x-protobuf" },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error(`GTFS-Realtime ${mode} feed returned ${response.status}.`);
    }

    const feed =
      GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
        new Uint8Array(await response.arrayBuffer()),
      );

    return {
      timestamp: toNumber(feed.header?.timestamp),
      tripUpdates: feed.entity
        .map((entity) => entity.tripUpdate)
        .filter(Boolean),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function findRealtimeMatch(departure, tripUpdates) {
  const baseTripId = String(departure.id ?? "").split("_").at(-1);
  const routeCode = String(departure.routeCode ?? "").toUpperCase();
  const scheduledMs = new Date(departure.scheduledUtc).getTime();
  const tripUpdate = tripUpdates.find((candidate) => {
    const tripId = String(candidate.trip?.tripId ?? "");
    const routeId = String(candidate.trip?.routeId ?? "").toUpperCase();

    return (
      (baseTripId && tripId.startsWith(`${baseTripId}-`)) ||
      (baseTripId === tripId && routeId.startsWith(`${routeCode}-`))
    );
  });

  if (!tripUpdate) {
    return null;
  }

  const normalizedStopId = normalizeStopId(departure.stopId);
  const exactStopUpdate = tripUpdate.stopTimeUpdate?.find(
    (stopUpdate) => normalizeStopId(stopUpdate.stopId) === normalizedStopId,
  );

  if (exactStopUpdate) {
    return { stopUpdate: exactStopUpdate, tripUpdate };
  }

  const nearestStopUpdate = (tripUpdate.stopTimeUpdate ?? [])
    .map((stopUpdate) => ({
      differenceMs: Math.abs(getStopTimeEpoch(stopUpdate) * 1000 - scheduledMs),
      stopUpdate,
    }))
    .filter((candidate) => Number.isFinite(candidate.differenceMs))
    .sort((left, right) => left.differenceMs - right.differenceMs)[0];

  if (
    nearestStopUpdate &&
    nearestStopUpdate.differenceMs <= MAX_NEAREST_STOP_DIFFERENCE_MS
  ) {
    return { stopUpdate: nearestStopUpdate.stopUpdate, tripUpdate };
  }

  return null;
}

function markAsScheduled(departure) {
  const scheduledUtc = departure.scheduledTimetableUtc || departure.scheduledUtc;
  const minutesAway = Math.ceil(
    (new Date(scheduledUtc).getTime() - Date.now()) / 60_000,
  );

  return {
    ...departure,
    countdownMinutes: Math.max(minutesAway, 0),
    countdownText: formatCountdown(minutesAway),
    displayTime: formatTime(scheduledUtc),
    gtfsRealtime: false,
    live: false,
    realtimeSource: null,
    scheduledUtc,
  };
}

function getDepartureMode(departure) {
  const stopId = String(departure.stopId ?? "");
  const routeCode = String(departure.routeCode ?? "").toUpperCase();

  if (stopId.startsWith("SI:") || routeCode.startsWith("F")) {
    return "ferry";
  }

  if (normalizeStopId(stopId).startsWith("6")) {
    return "rail";
  }

  return "bus";
}

function normalizeStopId(stopId) {
  return String(stopId ?? "")
    .replace(/^SI:/i, "")
    .replace(/^0+/, "");
}

function getStopTimeEpoch(stopUpdate) {
  return toNumber(stopUpdate?.departure?.time ?? stopUpdate?.arrival?.time);
}

function getStopTimeDelay(stopUpdate) {
  const delay = toNumber(
    stopUpdate?.departure?.delay ?? stopUpdate?.arrival?.delay,
  );

  return Number.isFinite(delay) ? delay : null;
}

function getLatestFeedTimestamp(feeds) {
  const timestamps = Array.from(feeds.values())
    .map((feed) => feed.timestamp)
    .filter(Number.isFinite);

  if (!timestamps.length) {
    return null;
  }

  return new Date(Math.max(...timestamps) * 1000).toISOString();
}

function toNumber(value) {
  if (value === undefined || value === null) {
    return Number.NaN;
  }

  return Number(value.toString());
}

function formatTime(dateTime) {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Brisbane",
  }).format(new Date(dateTime));
}

function formatCountdown(minutesAway) {
  if (minutesAway <= 0) {
    return "Now";
  }

  if (minutesAway < 60) {
    return `${minutesAway} min`;
  }

  const hours = Math.floor(minutesAway / 60);
  const minutes = minutesAway % 60;

  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}
