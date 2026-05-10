import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Coffee,
  MapPin,
  Navigation,
  Search,
  Store,
  Utensils,
} from "lucide-react";

import foodServices from "../data/uqFoodDrinkRetailServices.json";

const FOOD_TAB_ID = "food";
const CAFE_TAB_ID = "cafes";
const FOOD_TABS = [
  {
    id: FOOD_TAB_ID,
    label: "Food",
    Icon: Utensils,
  },
  {
    id: CAFE_TAB_ID,
    label: "Cafes & Drinks",
    Icon: Coffee,
  },
];

// All logos sourced directly from campuses.uq.edu.au
const UQ_IMG = "https://campuses.uq.edu.au/files";
const BRAND_LOGOS = {
  "Bagel Boys": `${UQ_IMG}/13714/Bagel-Boys.jpg`,
  "Belltop Cafe": `${UQ_IMG}/13738/Belltop-Cafe.jpg`,
  "Boba Machine": `${UQ_IMG}/28346/Boba%20Machine.png`,
  "Bookmark Café": `${UQ_IMG}/23654/bookmark.png`,
  "Boost Juice": `${UQ_IMG}/13744/Boost-Juice.jpg`,
  BrewPoint: `${UQ_IMG}/13750/BrewPoint.jpg`,
  "Cafe Dose": `${UQ_IMG}/30104/Cafe%20Dose.jpg`,
  "Cafe Nano": `${UQ_IMG}/13768/Cafe-Nano.jpg`,
  Chatime: `${UQ_IMG}/13810/Chatime.jpg`,
  "Darwin's Cafe": `${UQ_IMG}/13819/Darwins.jpg`,
  Expresso: `${UQ_IMG}/30029/UQU_Expresso%20Logo_150x150.jpg`,
  "The Gourmet Press": `${UQ_IMG}/35813/gourmet-press-logo.jpg`,
  "Guzman y Gomez": `${UQ_IMG}/13849/Guzman-Y-Gomez.jpg`,
  "Kenko Sushi House": `${UQ_IMG}/13867/Kenko-Sushi-House.jpg`,
  "Lakeside Cafe": `${UQ_IMG}/13873/Lakeside-Cafe.jpg`,
  "Lolly Shop": `${UQ_IMG}/13879/Lolly-Shop.jpg`,
  "Main Course": `${UQ_IMG}/13885/Main-Course.jpg`,
  "Market Cart": `${UQ_IMG}/13891/Marketcart.jpg`,
  "Merlo Coffee": `${UQ_IMG}/13897/Merlo.jpg`,
  Merlo: `${UQ_IMG}/13897/Merlo.jpg`,
  "On a Roll Bakery": `${UQ_IMG}/13552/On-A-Roll-Bakery.jpg`,
  "Oriental Corner": `${UQ_IMG}/13561/Oriental-Corner.jpg`,
  "Pacemaker Cafe": `${UQ_IMG}/34097/pacemaker-logo.jpg`,
  "Pizza Caffe": `${UQ_IMG}/13585/Pizza-Caffe.jpg`,
  REDROOM: `${UQ_IMG}/13597/Red-Room.jpg`,
  "Saint Lucy Caffe e Cucina": `${UQ_IMG}/13606/Saint-Lucy.jpg`,
  Subway: `${UQ_IMG}/13633/Subway.jpg`,
  "Upbeat Cafe": `${UQ_IMG}/35821/Upbeat%20Cafe.jpg`,
};

const BRAND_TONES = {
  "Boost Juice": "boost",
  Chatime: "chatime",
  "Guzman y Gomez": "guzman",
  "Kenko Sushi House": "kenko",
  Subway: "subway",
};
const CAFE_AND_DRINK_KEYWORDS = [
  "bar",
  "belltop",
  "boba",
  "bookmark",
  "boost",
  "brew",
  "cafe",
  "caff",
  "café",
  "chatime",
  "coffee",
  "darwin",
  "dose",
  "drink",
  "expresso",
  "juice",
  "lakeside cafe",
  "merlo",
  "nano",
  "pacemaker",
  "redroom",
  "saint lucy",
  "upbeat",
  "walkway",
];

export default function FoodDirectoryPage() {
  const [activeTabId, setActiveTabId] = useState(FOOD_TAB_ID);
  const [searchQuery, setSearchQuery] = useState("");
  const services = useMemo(() => {
    return foodServices
      .filter((service) => {
        return service.category === "Food and drink";
      })
      .map((service) => {
        const tabId = getFoodServiceTabId(service);

        return {
          ...service,
          brandTone: BRAND_TONES[service.name] ?? "default",
          logoUrl: BRAND_LOGOS[service.name] ?? "",
          tabId,
        };
      })
      .sort((left, right) => {
        const tabDifference =
          FOOD_TABS.findIndex((tab) => tab.id === left.tabId) -
          FOOD_TABS.findIndex((tab) => tab.id === right.tabId);

        if (tabDifference !== 0) {
          return tabDifference;
        }

        return left.name.localeCompare(right.name, "en", {
          sensitivity: "base",
        });
      });
  }, []);
  const tabCounts = useMemo(() => {
    return services.reduce((counts, service) => {
      counts[service.tabId] = (counts[service.tabId] ?? 0) + 1;
      return counts;
    }, {});
  }, [services]);
  const activeServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return services.filter((service) => {
      const isInActiveTab = service.tabId === activeTabId;

      if (!isInActiveTab) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [service.name, service.location, service.campus]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [activeTabId, searchQuery, services]);
  const activeTab = FOOD_TABS.find((tab) => tab.id === activeTabId);
  const ActiveTabIcon = activeTab?.Icon ?? Store;

  return (
    <section className="food-directory-page" aria-label="UQ food and drink">
      <div className="food-directory-tabs" aria-label="Food directory tabs">
        {FOOD_TABS.map(({ Icon, id, label }) => (
          <button
            key={id}
            type="button"
            className={`food-directory-tab ${activeTabId === id ? "active" : ""}`}
            aria-pressed={activeTabId === id}
            onClick={() => setActiveTabId(id)}
          >
            {activeTabId === id ? (
              <motion.span
                className="food-directory-tab-indicator"
                layoutId="food-directory-tab-indicator"
                transition={{ type: "spring", stiffness: 460, damping: 34 }}
                aria-hidden="true"
              />
            ) : null}
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="food-directory-section-head">
        <div>
          <strong>
            <ActiveTabIcon aria-hidden="true" />
            {activeTab?.label ?? "Food"}
          </strong>
        </div>
        <p>{activeServices.length} places</p>
      </div>

      <motion.div className="food-directory-list" layout>
        <AnimatePresence mode="popLayout" initial={false}>
          {activeServices.map((service, index) => (
            <FoodServiceCard key={service.id} service={service} index={index} />
          ))}
        </AnimatePresence>
      </motion.div>

      {activeServices.length ? null : (
        <div className="food-directory-empty">
          No matching places in this tab.
        </div>
      )}
    </section>
  );
}

function FoodServiceCard({ service, index }) {
  const initials = getBrandInitials(service.name);

  return (
    <motion.article
      className="food-service-card"
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{
        delay: Math.min(index * 0.025, 0.16),
        duration: 0.24,
        ease: "easeOut",
      }}
    >
      <FoodServiceLogo initials={initials} service={service} />

      <div className="food-service-main">
        <div className="food-service-title-row">
          <h2>{service.name}</h2>
          <span>{service.campus}</span>
        </div>

        <div className="food-service-actions">
          {service.google_maps_url ? (
            <a
              className="food-service-map-button"
              href={service.google_maps_url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${service.name} in Google Maps`}
            >
              <Navigation aria-hidden="true" />
              <span>Google Maps</span>
            </a>
          ) : null}

          {service.apple_maps_url ? (
            <a
              className="food-service-map-button"
              href={service.apple_maps_url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${service.name} in Apple Maps`}
            >
              <span className="apple-map-icon"></span>
              <span>Apple Maps</span>
            </a>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}

function FoodServiceLogo({ initials, service }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showLogo = service.logoUrl && !imageFailed;

  return (
    <div
      className={`food-service-logo ${service.brandTone} ${
        showLogo ? "has-image" : ""
      }`}
    >
      <span>{initials}</span>
      {showLogo ? (
        <img
          src={service.logoUrl}
          alt={`${service.name} logo`}
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : null}
    </div>
  );
}

function getFoodServiceTabId(service) {
  const haystack = `${service.name} ${service.location}`.toLowerCase();
  const isCafeOrDrink = CAFE_AND_DRINK_KEYWORDS.some((keyword) => {
    return haystack.includes(keyword);
  });

  return isCafeOrDrink ? CAFE_TAB_ID : FOOD_TAB_ID;
}

function getBrandInitials(name) {
  const words = name.replace(/&/g, " ").split(/\s+/).filter(Boolean);

  if (!words.length) {
    return "UQ";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}
