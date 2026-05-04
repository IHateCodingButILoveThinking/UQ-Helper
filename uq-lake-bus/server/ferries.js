import { fetchDepartures } from "./departures.js";

const FERRY_STOP_LOOKUP = "UQ St Lucia ferry terminal";
const FERRY_DISPLAY_NAME = "UQ St Lucia ferry terminal";
const FERRY_ROUTE_CODE = "F1";
const FERRY_ROUTE_NAME = "F1 Northshore Hamilton/UQ St Lucia";
const FERRY_DEPARTURE_LIMIT = 96;

export async function fetchFerryDepartures() {
  const timetable = await fetchDepartures({
    stopLookup: FERRY_STOP_LOOKUP,
    displayName: FERRY_DISPLAY_NAME,
    limit: FERRY_DEPARTURE_LIMIT,
  });
  const departures = (timetable.departures ?? [])
    .filter((departure) => {
      return String(departure.routeCode ?? "").toUpperCase() === FERRY_ROUTE_CODE;
    })
    .slice(0, 12)
    .map(normalizeFerryDeparture);

  return {
    generatedAt: new Date().toISOString(),
    routeCode: FERRY_ROUTE_CODE,
    routeName: FERRY_ROUTE_NAME,
    sourceUrl:
      timetable.sourceUrl ??
      "https://jp.translink.com.au/plan-your-journey/stops/uq-st-lucia-ferry-terminal",
    stopName: timetable.stopName ?? FERRY_DISPLAY_NAME,
    departures,
  };
}

function normalizeFerryDeparture(departure) {
  const countdownMinutes = Number.isFinite(departure.countdownMinutes)
    ? departure.countdownMinutes
    : 0;
  const status = getFerryStatus(departure);

  return {
    countdownMinutes,
    countdownText: departure.countdownText ?? formatFerryCountdown(countdownMinutes),
    currentLocation: getFerryCurrentLocation(countdownMinutes),
    destination: cleanFerryDestination(
      departure.destination,
      departure.fullHeadsign,
    ),
    displayTime: departure.displayTime,
    fullHeadsign: departure.fullHeadsign,
    id: departure.id,
    live: Boolean(departure.live),
    progressPercent: getCountdownProgressPercent(countdownMinutes),
    routeCode: FERRY_ROUTE_CODE,
    routeLabel: getFerryRouteLabel(departure),
    scheduledUtc: departure.scheduledUtc,
    status,
    terminal: "Terminal 1",
  };
}

function cleanFerryDestination(destination, headsign) {
  const rawDestination = String(destination || headsign || "Northshore Hamilton")
    .replace(/^towards\s+/i, "")
    .replace(/\bferry\b/gi, "")
    .replace(/\bterminal\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return rawDestination || "Northshore Hamilton";
}

function getFerryRouteLabel(departure) {
  const headsign = `${departure.fullHeadsign ?? ""} ${departure.destination ?? ""}`;

  return /speedycat/i.test(headsign) ? "SpeedyCat" : "CityCat";
}

function getFerryStatus(departure) {
  if (departure.live) {
    return "Normal";
  }

  return "Scheduled";
}

function getCountdownProgressPercent(minutesAway) {
  if (minutesAway <= 0) {
    return 100;
  }

  return Math.max(8, Math.min(100, Math.round(100 - (minutesAway / 60) * 100)));
}

function getFerryCurrentLocation(countdownMinutes) {
  const routeStops = [
    "UQ St Lucia",
    "Guyatt Park",
    "West End",
    "South Bank",
    "Riverside",
    "New Farm Park",
    "Northshore",
  ];
  const leadTimePercent = Math.min(Math.max(countdownMinutes, 0), 60) / 60;
  const progressIndex = Math.max(
    0,
    Math.min(
      routeStops.length - 1,
      Math.round(leadTimePercent * (routeStops.length - 1)),
    ),
  );

  return routeStops[progressIndex];
}

function formatFerryCountdown(minutesAway) {
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
