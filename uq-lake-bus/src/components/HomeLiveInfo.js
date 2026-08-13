import { useEffect, useState } from "react";
import { CloudSun, Wind } from "lucide-react";

const AIR_QUALITY_URL =
  "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=-27.4975&longitude=153.0137&current=us_aqi,pm2_5&timezone=Australia%2FBrisbane";
const AIR_QUALITY_SOURCE_URL = "https://open-meteo.com/en/docs/air-quality-api";

export function AirQualityPill() {
  const [airQuality, setAirQuality] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetch(AIR_QUALITY_URL, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load air quality.");
        }

        return response.json();
      })
      .then(setAirQuality)
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Could not load home air quality.", error);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const aqi = airQuality?.current?.us_aqi;
  const category = getAirQualityCategory(aqi);

  return (
    <a
      className={`home-air-pill tone-${category.tone}`}
      href={AIR_QUALITY_SOURCE_URL}
      target="_blank"
      rel="noreferrer"
      aria-label={
        Number.isFinite(aqi)
          ? `Air quality is ${category.label}, AQI ${Math.round(aqi)}. View Open-Meteo source.`
          : "Air quality is unavailable. View Open-Meteo source."
      }
    >
      <span className="home-air-icon" aria-hidden="true">
        {loading ? <CloudSun /> : <Wind />}
      </span>
      <span className="home-air-copy">
        <small>Air now</small>
        <strong>{loading ? "Checking" : category.label}</strong>
      </span>
      <span className="home-air-value">
        {Number.isFinite(aqi) ? Math.round(aqi) : "—"}
        <small>AQI</small>
      </span>
    </a>
  );
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
