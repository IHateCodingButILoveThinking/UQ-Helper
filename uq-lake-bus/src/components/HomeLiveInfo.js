import { useEffect, useMemo, useState } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Gauge,
  Sun,
  Wind,
} from "lucide-react";

const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=-27.4975&longitude=153.0137&current=temperature_2m,is_day,weather_code,wind_speed_10m&forecast_days=1&timezone=Australia%2FBrisbane";
const AIR_QUALITY_URL =
  "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=-27.4975&longitude=153.0137&current=us_aqi,pm2_5&timezone=Australia%2FBrisbane";
const CONDITIONS_CACHE_TTL_MS = 5 * 60 * 1000;
let homeConditionsCache = null;

export function HomeConditionsCard() {
  const cachedConditions = getCachedConditions();
  const [weather, setWeather] = useState(
    () => cachedConditions?.weather ?? null,
  );
  const [airQuality, setAirQuality] = useState(
    () => cachedConditions?.airQuality ?? null,
  );
  const [loading, setLoading] = useState(() => !cachedConditions);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    Promise.allSettled([
      fetchJson(WEATHER_URL, controller.signal),
      fetchJson(AIR_QUALITY_URL, controller.signal),
    ]).then(([weatherResult, airResult]) => {
      if (!isActive) {
        return;
      }

      const nextWeather =
        weatherResult.status === "fulfilled"
          ? weatherResult.value
          : homeConditionsCache?.weather ?? null;
      const nextAirQuality =
        airResult.status === "fulfilled"
          ? airResult.value
          : homeConditionsCache?.airQuality ?? null;

      if (weatherResult.status === "fulfilled") {
        setWeather(nextWeather);
      } else if (weatherResult.reason?.name !== "AbortError") {
        console.error("Could not load home weather.", weatherResult.reason);
      }

      if (airResult.status === "fulfilled") {
        setAirQuality(nextAirQuality);
      } else if (airResult.reason?.name !== "AbortError") {
        console.error("Could not load home air quality.", airResult.reason);
      }

      if (
        weatherResult.status === "fulfilled" ||
        airResult.status === "fulfilled"
      ) {
        homeConditionsCache = {
          airQuality: nextAirQuality,
          timestamp: Date.now(),
          weather: nextWeather,
        };
      }

      setLoading(false);
    });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, []);

  const current = weather?.current;
  const temperature = current?.temperature_2m;
  const windSpeed = current?.wind_speed_10m;
  const weatherCode = current?.weather_code;
  const aqi = airQuality?.current?.us_aqi;
  const weatherState = useMemo(
    () => getWeatherState(weatherCode, current?.is_day, windSpeed),
    [current?.is_day, weatherCode, windSpeed],
  );
  const airState = getAirQualityCategory(aqi);
  const WeatherIcon = weatherState.Icon;
  const hasWeather = Number.isFinite(temperature);

  return (
    <section
      className={`home-conditions-card weather-${weatherState.tone}`}
      aria-label="Today's weather and air quality at UQ St Lucia"
      aria-busy={loading}
    >
      <div className="home-weather-primary">
        <div className="home-weather-orb" aria-hidden="true">
          <WeatherIcon />
        </div>

        <div className="home-weather-copy" aria-live="polite">
          <small>UQ now</small>
          <div className="home-weather-reading">
            <strong>
              {loading ? "—" : hasWeather ? Math.round(temperature) : "—"}
              <sup>°</sup>
            </strong>
            <span>{loading ? "Checking" : weatherState.label}</span>
          </div>
        </div>
      </div>

      <div className="home-conditions-metrics">
        <div className="home-condition-metric">
          <span className="home-condition-metric-icon" aria-hidden="true">
            <Wind />
          </span>
          <span>
            <small>Wind</small>
            <strong>
              {Number.isFinite(windSpeed) ? `${Math.round(windSpeed)} km/h` : "—"}
            </strong>
          </span>
        </div>

        <div className={`home-condition-metric air-tone-${airState.tone}`}>
          <span className="home-condition-metric-icon" aria-hidden="true">
            <Gauge />
          </span>
          <span>
            <small>Air</small>
            <strong>
              {Number.isFinite(aqi) ? `${Math.round(aqi)} ${airState.label}` : "—"}
            </strong>
          </span>
        </div>
      </div>

      <small className="home-weather-attribution">Open-Meteo</small>
    </section>
  );
}

function getCachedConditions() {
  if (
    !homeConditionsCache ||
    Date.now() - homeConditionsCache.timestamp > CONDITIONS_CACHE_TTL_MS
  ) {
    return null;
  }

  return homeConditionsCache;
}

async function fetchJson(url, signal) {
  const response = await fetch(url, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  return response.json();
}

function getWeatherState(code, isDay, windSpeed) {
  if (!Number.isFinite(code)) {
    return { label: "Weather unavailable", tone: "unknown", Icon: CloudSun };
  }

  if (Number.isFinite(windSpeed) && windSpeed >= 30 && code < 51) {
    return { label: "Windy", tone: "cloudy", Icon: Wind };
  }

  if (code === 0) {
    return {
      label: isDay === 0 ? "Clear night" : "Sunny",
      tone: "sunny",
      Icon: Sun,
    };
  }

  if (code <= 2) {
    return { label: "Partly cloudy", tone: "cloudy", Icon: CloudSun };
  }

  if (code === 3) {
    return { label: "Cloudy", tone: "cloudy", Icon: Cloud };
  }

  if (code === 45 || code === 48) {
    return { label: "Foggy", tone: "foggy", Icon: CloudFog };
  }

  if (code >= 51 && code <= 57) {
    return { label: "Light drizzle", tone: "rainy", Icon: CloudDrizzle };
  }

  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 86)) {
    return { label: code >= 80 ? "Showers" : "Rainy", tone: "rainy", Icon: CloudRain };
  }

  if (code >= 95) {
    return { label: "Thunderstorms", tone: "stormy", Icon: CloudLightning };
  }

  return { label: "Overcast", tone: "cloudy", Icon: Cloud };
}

function getAirQualityCategory(aqi) {
  if (!Number.isFinite(aqi)) {
    return { label: "Unavailable", tone: "unknown" };
  }

  if (aqi <= 50) {
    return { label: "Good", tone: "good" };
  }

  if (aqi <= 100) {
    return { label: "Moderate", tone: "moderate" };
  }

  if (aqi <= 150) {
    return { label: "Sensitive", tone: "sensitive" };
  }

  if (aqi <= 200) {
    return { label: "Unhealthy", tone: "unhealthy" };
  }

  return { label: "Very poor", tone: "hazardous" };
}
