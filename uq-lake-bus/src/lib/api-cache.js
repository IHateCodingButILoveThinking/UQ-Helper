const DEFAULT_CACHE_TTL_MS = 60 * 1000;
const inflightRequests = new Map();

export const API_CACHE_TTLS = {
  board: 30 * 1000,
  ferries: 60 * 1000,
  foodReviews: 10 * 60 * 1000,
  foodServices: 6 * 60 * 60 * 1000,
  librarySpaces: 60 * 1000,
  plannerDepartures: 60 * 1000,
  stopSearch: 12 * 60 * 60 * 1000,
};

export async function getCachedData(
  key,
  fetchFn,
  {
    force = false,
    onBackgroundError,
    onUpdate,
    staleWhileRevalidate = false,
    ttlMs = DEFAULT_CACHE_TTL_MS,
    maxStaleMs = Infinity,
    validate,
  } = {},
) {
  const cachedPayload = force ? null : readCachedPayload(key);
  const cachedData = cachedPayload?.data;
  const hasValidCachedData = isValidCachedData(cachedData, validate);
  const cachedAgeMs = cachedPayload ? Date.now() - cachedPayload.cachedAt : Infinity;
  const cacheIsFresh = hasValidCachedData && cachedAgeMs < ttlMs;

  if (cacheIsFresh) {
    return cachedData;
  }

  if (
    staleWhileRevalidate &&
    hasValidCachedData &&
    cachedAgeMs <= maxStaleMs
  ) {
    void refreshCachedDataInBackground(key, fetchFn, {
      cachedData,
      onBackgroundError,
      onUpdate,
      ttlMs,
      validate,
    });

    return cachedData;
  }

  return runNetworkRequest(key, fetchFn, {
    requestMode: force ? "force" : "default",
    validate,
  });
}

function refreshCachedDataInBackground(
  key,
  fetchFn,
  { cachedData, onBackgroundError, onUpdate, validate },
) {
  return runNetworkRequest(key, fetchFn, {
    requestMode: "background",
    validate,
  })
    .then((nextData) => {
      if (
        typeof onUpdate === "function" &&
        !isSameCachedValue(cachedData, nextData)
      ) {
        onUpdate(nextData);
      }

      return nextData;
    })
    .catch((error) => {
      if (typeof onBackgroundError === "function") {
        onBackgroundError(error);
      }

      return cachedData;
    });
}

function runNetworkRequest(
  key,
  fetchFn,
  { requestMode = "default", validate } = {},
) {
  const inflightKey = `${key}::${requestMode}`;

  if (inflightRequests.has(inflightKey)) {
    return inflightRequests.get(inflightKey);
  }

  const nextRequest = Promise.resolve()
    .then(fetchFn)
    .then((data) => {
      if (isValidCachedData(data, validate)) {
        writeCachedPayload(key, data);
      }

      return data;
    })
    .finally(() => {
      inflightRequests.delete(inflightKey);
    });

  inflightRequests.set(inflightKey, nextRequest);

  return nextRequest;
}

function readCachedPayload(key) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const payload = JSON.parse(
      window.localStorage.getItem(buildCacheStorageKey(key)) ?? "null",
    );

    if (
      !payload ||
      typeof payload !== "object" ||
      typeof payload.cachedAt !== "number"
    ) {
      return null;
    }

    return payload;
  } catch (storageError) {
    console.error(`Could not read cached API payload for ${key}.`, storageError);
    return null;
  }
}

function writeCachedPayload(key, data) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      buildCacheStorageKey(key),
      JSON.stringify({
        cachedAt: Date.now(),
        data,
      }),
    );
  } catch (storageError) {
    console.error(`Could not write cached API payload for ${key}.`, storageError);
  }
}

function isValidCachedData(data, validate) {
  if (typeof validate === "function") {
    return validate(data);
  }

  return data !== undefined;
}

function isSameCachedValue(left, right) {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch (serializationError) {
    return left === right;
  }
}

function buildCacheStorageKey(key) {
  return `uq-app-cache:${key}`;
}
