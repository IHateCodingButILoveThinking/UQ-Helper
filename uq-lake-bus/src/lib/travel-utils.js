export async function fetchTravelDepartures(stopName, limit = 96) {
  const response = await fetch(
    `/api/departures?stopName=${encodeURIComponent(stopName)}&limit=${limit}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error("Live departures could not be loaded.");
  }

  return response.json();
}

export function isGoldCoastTrain(departure) {
  const destination = departure.destination?.toLowerCase() ?? "";
  return (
    !isTram(departure) &&
    (destination.includes("varsity lakes") ||
      destination.includes("robina") ||
      destination.includes("gold coast"))
  );
}

export function isAirportTrain(departure) {
  return departure.destination?.toLowerCase().includes("airport") ?? false;
}

export function isTram(departure) {
  return departure.routeCode?.toUpperCase() === "L1";
}

export function isTramDirection(departure, direction) {
  const destination = departure.destination?.toLowerCase() ?? "";
  return direction === "north"
    ? destination.includes("helensvale")
    : destination.includes("burleigh") || destination.includes("broadbeach");
}

export function findNearestStation(latitude, longitude, stations) {
  return stations.reduce((nearest, station) => {
    const distanceKm = haversineKm(
      latitude,
      longitude,
      station.latitude,
      station.longitude,
    );
    return !nearest || distanceKm < nearest.distanceKm
      ? { ...station, distanceKm }
      : nearest;
  }, null);
}

export function findTransfer(train, helensvaleDepartures, minimumMinutes = 4) {
  if (!train?.tripId) return null;
  const trainAtHelensvale = helensvaleDepartures.find(
    (departure) => departure.tripId === train.tripId,
  );
  if (!trainAtHelensvale?.scheduledUtc) return null;

  const minimumTramTime =
    new Date(trainAtHelensvale.scheduledUtc).getTime() + minimumMinutes * 60_000;
  const tram = helensvaleDepartures
    .filter(
      (departure) =>
        isTram(departure) &&
        isTramDirection(departure, "south") &&
        new Date(departure.scheduledUtc).getTime() >= minimumTramTime,
    )
    .sort(byDepartureTime)[0];

  if (!tram) return { trainAtHelensvale, tram: null, bufferMinutes: null };
  return {
    trainAtHelensvale,
    tram,
    bufferMinutes: Math.round(
      (new Date(tram.scheduledUtc) - new Date(trainAtHelensvale.scheduledUtc)) /
        60_000,
    ),
  };
}

export function findBrisbaneTransfer({
  destinationDepartures,
  helensvaleDepartures,
  minimumMinutes = 4,
  tram,
  tramStartsAtHelensvale = false,
  tramTravelMinutes = 0,
}) {
  const tramAtHelensvale = tramStartsAtHelensvale
    ? null
    : helensvaleDepartures.find(
        (departure) => departure.tripId && departure.tripId === tram?.tripId,
      );
  const estimatedArrivalAt =
    !tramStartsAtHelensvale && !tramAtHelensvale && tram?.scheduledUtc
      ? new Date(tram.scheduledUtc).getTime() + tramTravelMinutes * 60_000
      : null;
  const tramArrivalAt = tramAtHelensvale?.scheduledUtc
    ? new Date(tramAtHelensvale.scheduledUtc).getTime()
    : estimatedArrivalAt;
  const readyAt = tramStartsAtHelensvale
    ? Date.now()
    : tramArrivalAt
      ? tramArrivalAt + minimumMinutes * 60_000
      : null;

  if (!readyAt) return null;

  const train = helensvaleDepartures
    .filter(
      (departure) =>
        !isTram(departure) &&
        departure.tripId &&
        new Date(departure.scheduledUtc).getTime() >= readyAt &&
        destinationDepartures.some(
          (destinationDeparture) =>
            destinationDeparture.tripId === departure.tripId &&
            new Date(destinationDeparture.scheduledUtc) >
              new Date(departure.scheduledUtc),
        ),
    )
    .sort(byDepartureTime)[0];

  if (!train) {
    return { tramAtHelensvale, tramArrivalUtc: tramArrivalAt ? new Date(tramArrivalAt).toISOString() : null, estimatedTramArrival: Boolean(estimatedArrivalAt), train: null, trainAtDestination: null, bufferMinutes: null };
  }

  const trainAtDestination = destinationDepartures.find(
    (departure) => departure.tripId === train.tripId,
  );

  return {
    tramAtHelensvale,
    tramArrivalUtc: tramArrivalAt ? new Date(tramArrivalAt).toISOString() : null,
    estimatedTramArrival: Boolean(estimatedArrivalAt),
    train,
    trainAtDestination,
    bufferMinutes: tramStartsAtHelensvale
      ? null
      : Math.round(
          (new Date(train.scheduledUtc).getTime() - tramArrivalAt) /
            60_000,
        ),
  };
}

export function formatDistance(distanceKm) {
  return distanceKm < 1
    ? `${Math.round(distanceKm * 1000)} m away`
    : `${distanceKm.toFixed(1)} km away`;
}

export function byDepartureTime(a, b) {
  return new Date(a.scheduledUtc) - new Date(b.scheduledUtc);
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
