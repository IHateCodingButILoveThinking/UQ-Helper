import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  ChevronLeft,
  Clock,
  Coffee,
  MapPin,
  Navigation,
  Search,
  ShoppingBag,
  Utensils,
} from "lucide-react";
import { API_CACHE_TTLS, getCachedData } from "../lib/api-cache";

const FOOD_TAB_ID = "food";
const CAFE_TAB_ID = "cafes";
const RETAIL_TAB_ID = "retail";
const FOOD_SERVICES_ENDPOINT = "/api/food-services";
const FOOD_REVIEW_ENDPOINT = "/api/food-reviews";

const ALL_FILTER = "All";

const FOOD_TABS = [
  {
    id: FOOD_TAB_ID,
    label: "Food",
    Icon: Utensils,
  },
  {
    id: CAFE_TAB_ID,
    label: "Cafes",
    Icon: Coffee,
  },
  {
    id: RETAIL_TAB_ID,
    label: "Services",
    Icon: ShoppingBag,
  },
];

const CAMPUS_FILTERS = ["St Lucia", "Gatton", "Herston"];

const BRAND_TONES = {
  "Boost Juice": "boost",
  Chatime: "chatime",
  "Guzman y Gomez": "guzman",
  "Kenko Sushi House": "kenko",
  Subway: "subway",
};

const MANUAL_OPENING_HOURS = [
  // ── Bagel Boys ─────────────────────────────────────────────────────────────
  {
    matchAll: ["bagel boys"],
    matchAny: ["train carriage", "building 63"],
    openingHours: [
      "Monday: 7:00 AM – 4:00 PM",
      "Tuesday: 7:00 AM – 4:00 PM",
      "Wednesday: 7:00 AM – 4:00 PM",
      "Thursday: 7:00 AM – 4:00 PM",
      "Friday: 7:00 AM – 4:00 PM",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },
  {
    matchAll: ["bagel boys"],
    matchAny: [
      "bsl",
      "library forecourt",
      "biological sciences",
      "building 94",
    ],
    openingHours: [
      "Monday: 7:00 AM – 6:00 PM",
      "Tuesday: 7:00 AM – 6:00 PM",
      "Wednesday: 7:00 AM – 6:00 PM",
      "Thursday: 7:00 AM – 6:00 PM",
      "Friday: 7:00 AM – 6:00 PM",
      "Saturday: 9:00 AM – 4:00 PM",
      "Sunday: 9:00 AM – 4:00 PM",
    ],
  },
  {
    matchAll: ["bagel boys"],
    openingHours: [
      "Monday: 7:00 AM – 6:00 PM",
      "Tuesday: 7:00 AM – 6:00 PM",
      "Wednesday: 7:00 AM – 6:00 PM",
      "Thursday: 7:00 AM – 6:00 PM",
      "Friday: 7:00 AM – 6:00 PM",
      "Saturday: 9:00 AM – 4:00 PM",
      "Sunday: 9:00 AM – 4:00 PM",
    ],
  },

  // ── Belltop Cafe ────────────────────────────────────────────────────────────
  // Source: Waze / Zest (Mon–Fri 7:00 AM – 2:00 PM)
  {
    matchAny: ["belltop"],
    openingHours: [
      "Monday: 7:00 AM – 2:00 PM",
      "Tuesday: 7:00 AM – 2:00 PM",
      "Wednesday: 7:00 AM – 2:00 PM",
      "Thursday: 7:00 AM – 2:00 PM",
      "Friday: 7:00 AM – 2:00 PM",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },

  // ── Boba Machine ────────────────────────────────────────────────────────────
  // Automated 24/7 robotic bubble tea machine
  {
    matchAny: ["boba machine"],
    openingHours: [
      "Monday: 24 hours",
      "Tuesday: 24 hours",
      "Wednesday: 24 hours",
      "Thursday: 24 hours",
      "Friday: 24 hours",
      "Saturday: 24 hours",
      "Sunday: 24 hours",
    ],
  },

  // ── Bookmark Café ───────────────────────────────────────────────────────────
  // Source: Facebook page (Mon–Fri 8:00 AM – 2:00 PM)
  {
    matchAny: ["bookmark"],
    openingHours: [
      "Monday: 8:00 AM – 2:00 PM",
      "Tuesday: 8:00 AM – 2:00 PM",
      "Wednesday: 8:00 AM – 2:00 PM",
      "Thursday: 8:00 AM – 2:00 PM",
      "Friday: 8:00 AM – 2:00 PM",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },

  // ── Kenko Sushi House ───────────────────────────────────────────────────────
  {
    matchAny: ["kenko", "kenko sushi", "kenko sushi house"],
    openingHours: [
      "Monday: 9:30 AM – 5:30 PM",
      "Tuesday: 9:30 AM – 6:30 PM",
      "Wednesday: 9:30 AM – 6:30 PM",
      "Thursday: 9:30 AM – 4:00 PM",
      "Friday: 9:30 AM – 6:30 PM",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },

  // ── Lakeside Cafe ───────────────────────────────────────────────────────────
  // Source: Green Caffeen (Mon–Fri 7:00 AM – 4:30 PM)
  {
    matchAny: ["lakeside"],
    openingHours: [
      "Monday: 7:00 AM – 4:30 PM",
      "Tuesday: 7:00 AM – 4:30 PM",
      "Wednesday: 7:00 AM – 4:30 PM",
      "Thursday: 7:00 AM – 4:30 PM",
      "Friday: 7:00 AM – 4:30 PM",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },

  // ── Market Cart ─────────────────────────────────────────────────────────────
  // Source: marketcart.com.au (Mon–Fri 7:00 AM – 6:00 PM)
  {
    matchAny: ["market cart", "marketcart"],
    openingHours: [
      "Monday: 7:00 AM – 6:00 PM",
      "Tuesday: 7:00 AM – 6:00 PM",
      "Wednesday: 7:00 AM – 6:00 PM",
      "Thursday: 7:00 AM – 6:00 PM",
      "Friday: 7:00 AM – 6:00 PM",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },

  // ── Merlo Coffee ────────────────────────────────────────────────────────────
  // Source: merlo.com.au/pages/location-merlo-coffee-uq
  {
    matchAny: ["merlo"],
    openingHours: [
      "Monday: 7:00 AM – 6:00 PM",
      "Tuesday: 7:00 AM – 6:00 PM",
      "Wednesday: 7:00 AM – 6:00 PM",
      "Thursday: 7:00 AM – 6:00 PM",
      "Friday: 7:00 AM – 6:00 PM",
      "Saturday: 7:00 AM – 3:00 PM",
      "Sunday: Closed",
    ],
  },

  // ── Oriental Corner ─────────────────────────────────────────────────────────
  {
    matchAny: ["oriental corner"],
    openingHours: [
      "Monday: 10:00 AM – 5:00 PM",
      "Tuesday: 10:00 AM – 5:00 PM",
      "Wednesday: 10:00 AM – 5:00 PM",
      "Thursday: 10:00 AM – 5:00 PM",
      "Friday: 10:00 AM – 5:00 PM",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },

  // ── Saint Lucy Caffe e Cucina ───────────────────────────────────────────────
  // Source: Yelp (updated March 2026)
  {
    matchAny: ["saint lucy", "saint lucy caffe"],
    openingHours: [
      "Monday: 7:00 AM – 3:00 PM",
      "Tuesday: 7:00 AM – 9:00 PM",
      "Wednesday: 7:00 AM – 9:00 PM",
      "Thursday: 7:00 AM – 9:00 PM",
      "Friday: 7:00 AM – 9:00 PM",
      "Saturday: 7:00 AM – 9:00 PM",
      "Sunday: 7:00 AM – 3:00 PM",
    ],
  },

  // ── Gatton Dining Hall ──────────────────────────────────────────────────────
  {
    matchAny: ["dining hall", "gatton dining"],
    openingHours: [
      "Monday: Breakfast 7:00 AM – 9:00 AM · Lunch 11:30 AM – 1:30 PM · Dinner 5:30 PM – 7:00 PM",
      "Tuesday: Breakfast 7:00 AM – 9:00 AM · Lunch 11:30 AM – 1:30 PM · Dinner 5:30 PM – 7:00 PM",
      "Wednesday: Breakfast 7:00 AM – 9:00 AM · Lunch 11:30 AM – 1:30 PM · Dinner 5:30 PM – 7:00 PM",
      "Thursday: Breakfast 7:00 AM – 9:00 AM · Lunch 11:30 AM – 1:30 PM · Dinner 5:30 PM – 7:00 PM",
      "Friday: Breakfast 7:00 AM – 9:00 AM · Lunch 11:30 AM – 1:30 PM · Dinner 5:30 PM – 7:00 PM",
      "Saturday: Breakfast 7:30 AM – 9:00 AM · Lunch 12:00 PM – 1:00 PM · Dinner 5:30 PM – 7:00 PM",
      "Sunday: Breakfast 7:30 AM – 9:00 AM · Lunch 12:00 PM – 1:00 PM · Dinner 5:30 PM – 7:00 PM",
    ],
  },

  // ── Walkway Cafe ────────────────────────────────────────────────────────────
  {
    matchAny: ["walkway cafe", "walkway café"],
    openingHours: [
      "Monday: 7:30 AM – 2:00 PM",
      "Tuesday: 7:30 AM – 2:00 PM",
      "Wednesday: 7:30 AM – 2:00 PM",
      "Thursday: 7:30 AM – 2:00 PM",
      "Friday: 7:30 AM – 2:00 PM",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },

  // ── Coffee Pod ──────────────────────────────────────────────────────────────
  {
    matchAny: ["coffee pod"],
    openingHours: [
      "Monday: 7:00 AM – 1:30 PM",
      "Tuesday: 7:00 AM – 1:30 PM",
      "Wednesday: 7:00 AM – 1:30 PM",
      "Thursday: 7:00 AM – 1:30 PM",
      "Friday: 7:00 AM – 1:30 PM",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },

  // ── Darwin's Cafe ───────────────────────────────────────────────────────────
  {
    matchAny: ["darwin", "darwin's"],
    openingHours: [
      "Monday: 7:00 AM – 4:00 PM",
      "Tuesday: 7:00 AM – 4:00 PM",
      "Wednesday: 7:00 AM – 4:00 PM",
      "Thursday: 7:00 AM – 4:00 PM",
      "Friday: 7:00 AM – 4:00 PM",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },

  // ── Main Course ─────────────────────────────────────────────────────────────
  {
    matchAny: ["main course"],
    openingHours: [
      "Monday: 8:00 AM – 3:00 PM",
      "Tuesday: 8:00 AM – 3:00 PM",
      "Wednesday: 8:00 AM – 3:00 PM",
      "Thursday: 8:00 AM – 3:00 PM",
      "Friday: 8:00 AM – 3:00 PM",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },

  // ── Expresso ────────────────────────────────────────────────────────────────
  {
    matchAny: ["expresso"],
    openingHours: [
      "Monday: 11:00 AM – 3:00 PM",
      "Tuesday: 11:00 AM – 3:00 PM",
      "Wednesday: 11:00 AM – 3:00 PM",
      "Thursday: 11:00 AM – 3:00 PM",
      "Friday: 11:00 AM – 3:00 PM",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },

  // ── On a Roll Bakery ────────────────────────────────────────────────────────
  {
    matchAny: ["on a roll"],
    openingHours: [
      "Monday: 7:00 AM – 5:00 PM",
      "Tuesday: 7:00 AM – 5:00 PM",
      "Wednesday: 7:00 AM – 5:00 PM",
      "Thursday: 7:00 AM – 5:00 PM",
      "Friday: 7:00 AM – 5:00 PM",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },

  // ── Pizza Caffe ─────────────────────────────────────────────────────────────
  {
    matchAny: ["pizza caffe", "pizza caff"],
    openingHours: [
      "Monday: 12:00 PM – 3:00 PM",
      "Tuesday: 12:00 PM – 4:00 PM",
      "Wednesday: 12:00 PM – 7:00 PM",
      "Thursday: 12:00 PM – 7:00 PM",
      "Friday: 12:00 PM – 7:00 PM",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },

  // ── REDROOM ─────────────────────────────────────────────────────────────────
  {
    matchAny: ["redroom", "red room"],
    openingHours: [
      "Monday: 11:00 AM – 5:00 PM",
      "Tuesday: 11:00 AM – 8:00 PM",
      "Wednesday: 11:00 AM – 8:00 PM",
      "Thursday: 11:00 AM – 9:00 PM",
      "Friday: 11:00 AM – 9:00 PM",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },

  // ── Lolly Shop ──────────────────────────────────────────────────────────────
  {
    matchAny: ["lolly shop"],
    openingHours: [
      "Monday: 9:30 AM – 5:00 PM",
      "Tuesday: 9:30 AM – 5:00 PM",
      "Wednesday: 9:30 AM – 4:00 PM",
      "Thursday: 9:30 AM – 5:00 PM",
      "Friday: Closed",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },

  // ── Boost Juice ─────────────────────────────────────────────────────────────
  {
    matchAny: ["boost juice"],
    openingHours: [
      "Monday: 7:00 AM – 6:30 PM",
      "Tuesday: 7:00 AM – 6:30 PM",
      "Wednesday: 7:00 AM – 6:30 PM",
      "Thursday: 7:00 AM – 6:30 PM",
      "Friday: 7:00 AM – 6:30 PM",
      "Saturday: 8:00 AM – 5:00 PM",
      "Sunday: 8:30 AM – 4:30 PM",
    ],
  },

  // ── Chatime ─────────────────────────────────────────────────────────────────
  {
    matchAny: ["chatime"],
    openingHours: [
      "Monday: 7:30 AM – 7:00 PM",
      "Tuesday: 7:30 AM – 7:00 PM",
      "Wednesday: 7:30 AM – 7:00 PM",
      "Thursday: 7:30 AM – 7:00 PM",
      "Friday: 7:30 AM – 7:00 PM",
      "Saturday: 7:30 AM – 7:00 PM",
      "Sunday: Closed",
    ],
  },

  // ── Guzman y Gomez ──────────────────────────────────────────────────────────
  {
    matchAny: ["guzman y gomez", "gyg"],
    openingHours: [
      "Monday: 7:00 AM – 8:00 PM",
      "Tuesday: 7:00 AM – 8:00 PM",
      "Wednesday: 7:00 AM – 8:00 PM",
      "Thursday: 7:00 AM – 8:00 PM",
      "Friday: 7:00 AM – 8:00 PM",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },

  // ── Subway ──────────────────────────────────────────────────────────────────
  {
    matchAny: ["subway"],
    openingHours: [
      "Monday: 7:30 AM – 8:00 PM",
      "Tuesday: 7:30 AM – 8:00 PM",
      "Wednesday: 7:30 AM – 8:00 PM",
      "Thursday: 7:30 AM – 8:00 PM",
      "Friday: 7:30 AM – 8:00 PM",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },

  // ── BrewPoint ───────────────────────────────────────────────────────────────
  {
    matchAny: ["brewpoint", "synthetic fields"],
    openingHours: [
      "Monday: 7:00 AM – 11:00 AM",
      "Tuesday: 7:00 AM – 11:00 AM",
      "Wednesday: 7:00 AM – 11:00 AM",
      "Thursday: 7:00 AM – 11:00 AM",
      "Friday: 7:00 AM – 11:00 AM",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },

  // ── Microwave ───────────────────────────────────────────────────────────────
  {
    matchAny: ["microwave"],
    openingHours: [
      "Monday: 7:00 AM – 7:00 PM",
      "Tuesday: 7:00 AM – 7:00 PM",
      "Wednesday: 7:00 AM – 7:00 PM",
      "Thursday: 7:00 AM – 7:00 PM",
      "Friday: 7:00 AM – 7:00 PM",
      "Saturday: 24 hours",
      "Sunday: 24 hours",
    ],
  },

  // ── Food Co-op ──────────────────────────────────────────────────────────────
  {
    matchAny: ["food co-op", "food coop"],
    openingHours: [
      "Monday: 9:00 AM – 3:00 PM",
      "Tuesday: 9:00 AM – 3:00 PM",
      "Wednesday: 9:00 AM – 3:00 PM",
      "Thursday: 9:00 AM – 3:00 PM",
      "Friday: 9:00 AM – 3:00 PM",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },
  {
    matchAny: ["upbeat cafe", "upbeat café", "upbeat"],
    openingHours: [
      "Monday: 6:30 AM – 6:30 PM",
      "Tuesday: 6:30 AM – 6:30 PM",
      "Wednesday: 6:30 AM – 6:30 PM",
      "Thursday: 6:30 AM – 6:30 PM",
      "Friday: 6:30 AM – 6:30 PM",
      "Saturday: 6:30 AM – 6:30 PM",
      "Sunday: 6:30 AM – 6:30 PM",
    ],
  },
  {
    matchAny: ["gourmet", "gourmet cafe", "gourmet café"],
    openingHours: [
      "Monday: 6:30 AM – 2:00 PM",
      "Tuesday: 6:30 AM – 2:00 PM",
      "Wednesday: 6:30 AM – 2:00 PM",
      "Thursday: 6:30 AM – 2:00 PM",
      "Friday: 6:30 AM – 2:00 PM",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },
  {
    matchAny: ["nano", "nano cafe", "nano café"],
    openingHours: [
      "Monday: 7:00 AM – 3:00 PM",
      "Tuesday: 7:00 AM – 3:00 PM",
      "Wednesday: 7:00 AM – 3:00 PM",
      "Thursday: 7:00 AM – 3:00 PM",
      "Friday: 7:00 AM – 3:00 PM",
      "Saturday: Closed",
      "Sunday: Closed",
    ],
  },
];

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

const listVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: {
    filter: "blur(4px)",
    opacity: 0,
    scale: 0.85,
    y: 30,
  },
  visible: {
    filter: "blur(0px)",
    opacity: 1,
    scale: 1,
    transition: {
      damping: 22,
      mass: 0.8,
      stiffness: 350,
      type: "spring",
    },
    y: 0,
  },
  exit: {
    filter: "blur(3px)",
    opacity: 0,
    scale: 0.94,
    transition: {
      duration: 0.18,
      ease: "easeOut",
    },
    y: -12,
  },
};

export default function FoodDirectoryPage() {
  const [activeTabId, setActiveTabId] = useState(FOOD_TAB_ID);
  const [activeCampus, setActiveCampus] = useState("St Lucia");
  const [activeStatus, setActiveStatus] = useState(ALL_FILTER);
  const [foodError, setFoodError] = useState("");
  const [foodSource, setFoodSource] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [reviewLookup, setReviewLookup] = useState({});
  const [reviewSourceState, setReviewSourceState] = useState("loading");
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    const timerId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);
  const services = useMemo(() => {
    const rawServices = foodSource?.services ?? [];

    const outletCountByName = rawServices.reduce((counts, service) => {
      counts[service.name] = (counts[service.name] ?? 0) + 1;
      return counts;
    }, {});

    return rawServices
      .map((service) => {
        const review = getReviewForService(reviewLookup, service);
        const cleanLocationLabel = getCleanLocationLabel(service);
        const openNow = getServiceOpenNow(review, service, currentTime);

        return {
          ...service,
          locationLabel: cleanLocationLabel,
          brandTone: BRAND_TONES[service.name] ?? "default",
          duplicateCount: outletCountByName[service.name] ?? 1,
          appleMapsUrl: getAppleMapsUrl(service, review),
          googleMapsUrl: review?.googleMapsUri || service.google_maps_url || "",
          openingHoursLabel: getOpeningHoursLabel(review, service, currentTime),
          openNow,
          review,
          statusId: getServiceStatusId(review, openNow),
          tabId: getFoodServiceTabId(service),
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
  }, [foodSource, reviewLookup, currentTime]);

  const query = searchQuery.trim().toLowerCase();

  const filteredServicesForTabs = useMemo(() => {
    return services.filter((service) => {
      if (activeCampus !== ALL_FILTER && service.campus !== activeCampus) {
        return false;
      }

      if (activeStatus !== ALL_FILTER && service.statusId !== activeStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      return doesServiceMatchQuery(service, query);
    });
  }, [activeCampus, activeStatus, query, services]);

  const tabCounts = useMemo(() => {
    return filteredServicesForTabs.reduce((counts, service) => {
      counts[service.tabId] = (counts[service.tabId] ?? 0) + 1;
      return counts;
    }, {});
  }, [filteredServicesForTabs]);

  const activeServices = useMemo(() => {
    return filteredServicesForTabs.filter((service) => {
      return service.tabId === activeTabId;
    });
  }, [activeTabId, filteredServicesForTabs]);

  const isLoadingFood = !foodSource && !foodError;

  const filterChips = useMemo(() => {
    const campusChips = CAMPUS_FILTERS.map((campus) => ({
      Icon: MapPin,
      id: campus,
      isActive: activeCampus === campus,
      label: campus,
      onClick: () => setActiveCampus(campus),
      tone: "campus",
    }));

    const statusChip = {
      Icon: Clock,
      disabled: isLoadingFood,
      id: "open",
      isActive: activeStatus === "open",
      label: "Now open",
      onClick: () => {
        setActiveStatus((currentStatus) =>
          currentStatus === "open" ? ALL_FILTER : "open",
        );
      },
      tone: "status",
    };

    return [...campusChips, statusChip];
  }, [activeCampus, activeStatus, isLoadingFood]);

  useEffect(() => {
    if ((tabCounts[activeTabId] ?? 0) > 0) {
      return;
    }

    const nextTabId = FOOD_TABS.find((tab) => (tabCounts[tab.id] ?? 0) > 0)?.id;

    if (nextTabId) {
      setActiveTabId(nextTabId);
    }
  }, [activeTabId, tabCounts]);

  useEffect(() => {
    let isCancelled = false;

    async function loadFoodServices() {
      try {
        const payload = await getCachedData(
          "food-services",
          async () => {
            const response = await fetch(FOOD_SERVICES_ENDPOINT);

            if (!response.ok) {
              throw new Error(
                `Food services endpoint returned ${response.status}.`,
              );
            }

            return response.json();
          },
          {
            onUpdate: (freshPayload) => {
              if (isCancelled) {
                return;
              }

              setFoodSource(freshPayload);
              setFoodError("");
            },
            staleWhileRevalidate: true,
            ttlMs: API_CACHE_TTLS.foodServices,
            validate: (nextPayload) => Array.isArray(nextPayload?.services),
          },
        );

        if (!isCancelled) {
          setFoodSource(payload);
          setFoodError("");
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Could not load UQ food services.", error);
          setFoodError("Food and retail places are taking a moment to load.");
        }
      }
    }

    async function loadFoodReviews() {
      try {
        const payload = await getCachedData(
          "food-reviews",
          async () => {
            const response = await fetch(FOOD_REVIEW_ENDPOINT);

            if (!response.ok) {
              throw new Error(`Food review endpoint returned ${response.status}.`);
            }

            return response.json();
          },
          {
            onUpdate: (freshPayload) => {
              if (isCancelled) {
                return;
              }

              setReviewLookup(freshPayload.reviews ?? {});
              setReviewSourceState(
                freshPayload.configured ? "ready" : "not-configured",
              );
            },
            staleWhileRevalidate: true,
            ttlMs: API_CACHE_TTLS.foodReviews,
            validate: (nextPayload) =>
              Boolean(nextPayload) && typeof nextPayload === "object",
          },
        );

        if (isCancelled) {
          return;
        }

        setReviewLookup(payload.reviews ?? {});
        setReviewSourceState(payload.configured ? "ready" : "not-configured");
      } catch (error) {
        if (!isCancelled) {
          console.error("Could not load Google food review data.", error);
          setReviewSourceState("unavailable");
        }
      }
    }

    loadFoodServices();
    loadFoodReviews();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <section className="food-directory-page" aria-label="UQ food and drink">
      {/* ── Hero: back button + heading side by side ── */}
      <div className="food-directory-hero">
        <div className="food-directory-heading">
          <h1>Food &amp; drinks</h1>
        </div>
      </div>

      <div className="food-directory-toolbar">
        <div className="food-directory-search-row">
          <label
            className="food-directory-search"
            htmlFor="food-directory-search"
          >
            <Search aria-hidden="true" />
            <input
              id="food-directory-search"
              type="search"
              placeholder="Search outlet or area"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
        </div>

        <div className="food-filter-scroll" aria-label="Food filters">
          {filterChips.map(
            ({
              Icon,
              disabled = false,
              id,
              isActive,
              label,
              onClick,
              tone,
            }) => (
              <motion.button
                key={`${tone}-${id}`}
                type="button"
                className={`food-filter-chip ${tone} ${
                  isActive ? "active" : ""
                }`}
                disabled={disabled}
                aria-pressed={isActive}
                onClick={onClick}
                whileHover={{ scale: 1.025 }}
                whileTap={{ scale: 0.96 }}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </motion.button>
            ),
          )}
        </div>

        <div className="food-directory-tabs" aria-label="Food directory tabs">
          {FOOD_TABS.map(({ Icon, id, label }) => (
            <motion.button
              key={id}
              type="button"
              className={`food-directory-tab tab-${id} ${
                activeTabId === id ? "active" : ""
              }`}
              aria-pressed={activeTabId === id}
              onClick={() => setActiveTabId(id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
            >
              {activeTabId === id ? (
                <motion.span
                  className="food-directory-tab-indicator"
                  layoutId="food-directory-tab-indicator"
                  transition={{ type: "spring", stiffness: 520, damping: 38 }}
                  aria-hidden="true"
                />
              ) : null}

              <Icon aria-hidden="true" />
              <span>{label}</span>
              <strong>{tabCounts[id] ?? 0}</strong>
            </motion.button>
          ))}
        </div>
      </div>

      {foodError ? (
        <div className="food-directory-empty">
          {foodError} Please try again in a minute.
        </div>
      ) : null}

      {isLoadingFood ? <FoodSkeletonList /> : null}

      {!isLoadingFood ? (
        <motion.div
          className="food-directory-list"
          layout
          variants={listVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {activeServices.map((service) => (
              <FoodServiceCard key={service.id} service={service} />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : null}

      {!isLoadingFood && !activeServices.length ? (
        <div className="food-directory-empty">
          No matching places in this filter.
        </div>
      ) : null}
    </section>
  );
}

function FoodSkeletonList() {
  return (
    <div className="food-directory-list" aria-label="Loading food outlets">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="food-service-card skeleton" key={index}>
          <div className="food-service-logo" />
          <div className="food-service-main">
            <span />
            <span />
            <span />
          </div>
        </div>
      ))}
    </div>
  );
}

function FoodServiceCard({ service }) {
  const initials = getBrandInitials(service.name);

  return (
    <motion.article
      className="food-service-card"
      layout
      variants={cardVariants}
      exit="exit"
      whileHover={{ scale: 1.015, y: -2 }}
      whileTap={{ scale: 0.985 }}
    >
      <FoodServiceLogo initials={initials} service={service} />

      <div className="food-service-main">
        <div className="food-service-title-row">
          <div>
            <h2>{service.name}</h2>
          </div>
        </div>

        <p className="food-service-location">
          <Building2 aria-hidden="true" />
          {service.locationLabel}
        </p>

        <div className="food-service-meta-row">
          <FoodStatusChip service={service} />
          <FoodHoursChip label={service.openingHoursLabel} />
        </div>

        <div className="food-service-actions">
          {service.googleMapsUrl ? (
            <motion.a
              className="food-service-map-button primary"
              href={service.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${service.name} in Google Maps`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Navigation aria-hidden="true" />
              <span>Google Maps</span>
            </motion.a>
          ) : null}

          {service.appleMapsUrl ? (
            <motion.a
              className="food-service-map-button"
              href={service.appleMapsUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${service.name} in Apple Maps`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <MapPin aria-hidden="true" />
              <span>Apple Maps</span>
            </motion.a>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}

function FoodStatusChip({ service }) {
  if (service.review?.businessStatus === "CLOSED_PERMANENTLY") {
    return <span className="food-status-chip closed">Closed</span>;
  }

  if (service.openNow === true) {
    return <span className="food-status-chip open">Open now</span>;
  }

  if (service.openNow === false) {
    return <span className="food-status-chip closed-soft">Closed now</span>;
  }

  return null;
}
/**
 * Shows today's 3-letter day abbreviation alongside the opening hours.
 * e.g. "Mon · 7 AM - 4 PM"
 */
function FoodHoursChip({ label }) {
  const todayShort = getTodayShortDay();
  const display = label ? `${todayShort} · ${label}` : "";

  return (
    <span
      className={`food-hours-chip ${display ? "" : "muted"}`}
      title={label || "Hours not listed"}
    >
      <Clock aria-hidden="true" />
      {display || "Hours not listed"}
    </span>
  );
}

function FoodServiceLogo({ initials, service }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showLogo = service.imageUrl && !imageFailed;

  return (
    <div
      className={`food-service-logo ${service.brandTone} ${
        showLogo ? "has-image" : ""
      }`}
    >
      <span>{initials}</span>

      {showLogo ? (
        <img
          src={service.imageUrl}
          alt={`${service.name} logo`}
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : null}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the 3-letter weekday name in Brisbane time, e.g. "Mon". */
function getTodayShortDay() {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Brisbane",
    weekday: "short",
  }).format(new Date());
}

function getReviewForService(reviewLookup, service) {
  const directReview = reviewLookup?.[service.id];

  if (directReview) {
    return directReview;
  }

  const serviceName = normaliseText(service.name);
  const serviceCampus = normaliseText(service.campus);

  return Object.values(reviewLookup ?? {}).find((review) => {
    const reviewName = normaliseText(
      review.name || review.displayName || review.displayNameText || "",
    );

    const reviewAddress = normaliseText(review.formattedAddress || "");

    const nameMatches =
      reviewName.includes(serviceName) || serviceName.includes(reviewName);

    const campusMatches =
      !serviceCampus || reviewAddress.includes(serviceCampus);

    return nameMatches && campusMatches;
  });
}

function getCleanLocationLabel(service) {
  const rawLocation = String(
    service.locationLabel || service.location || service.areaLabel || "",
  ).trim();

  return rawLocation
    .replace(/^UQ St Lucia:\s*/i, "")
    .replace(/^St Lucia:\s*/i, "")
    .replace(/^UQ Gatton:\s*/i, "")
    .replace(/^Gatton:\s*/i, "")
    .replace(/^UQ Herston:\s*/i, "")
    .replace(/^Herston:\s*/i, "")
    .replace(/UQ Union ComplexUQ St Lucia:/i, "UQ Union Complex · ")
    .replace(/UQ Union Complex\s*UQ St Lucia:/i, "UQ Union Complex · ")
    .replace(/\s+/g, " ")
    .trim();
}

function getFoodServiceTabId(service) {
  if (service.category === "Retail and services") {
    return RETAIL_TAB_ID;
  }

  const haystack = `${service.name} ${service.location} ${
    service.locationLabel ?? ""
  }`.toLowerCase();

  const isCafeOrDrink = CAFE_AND_DRINK_KEYWORDS.some((keyword) => {
    return haystack.includes(keyword);
  });

  return isCafeOrDrink ? CAFE_TAB_ID : FOOD_TAB_ID;
}

function doesServiceMatchQuery(service, query) {
  return [
    service.name,
    service.location,
    service.locationLabel,
    service.areaLabel,
    service.campus,
  ]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(query));
}

function getManualOpeningHours(service) {
  const haystack = normaliseText(
    [
      service.name,
      service.locationLabel,
      service.location,
      service.areaLabel,
      service.campus,
    ]
      .filter(Boolean)
      .join(" "),
  );

  const matchedHours = MANUAL_OPENING_HOURS.find((entry) => {
    const matchAll = entry.matchAll ?? [];
    const matchAny = entry.matchAny ?? [];

    const allMatched =
      !matchAll.length ||
      matchAll.every((keyword) => haystack.includes(normaliseText(keyword)));

    const anyMatched =
      !matchAny.length ||
      matchAny.some((keyword) => haystack.includes(normaliseText(keyword)));

    return allMatched && anyMatched;
  });

  return matchedHours?.openingHours ?? [];
}

function getAppleMapsUrl(service, review) {
  const query =
    review?.formattedAddress ||
    service.map_query ||
    [service.name, service.locationLabel, "The University of Queensland"]
      .filter(Boolean)
      .join(" ");

  return `https://maps.apple.com/?q=${encodeURIComponent(query)}`;
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

function normaliseText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function getServiceStatusId(review, openNow) {
  if (review?.businessStatus === "CLOSED_PERMANENTLY") {
    return "closed";
  }

  if (openNow === true) {
    return "open";
  }

  if (openNow === false) {
    return "closed";
  }

  return "official";
}

function getServiceOpenNow(review, service, date = new Date()) {
  if (review?.businessStatus === "CLOSED_PERMANENTLY") {
    return false;
  }

  const manualOpenNow = isOpenFromOpeningHours(
    getManualOpeningHours(service),
    date,
  );

  if (manualOpenNow !== null) {
    return manualOpenNow;
  }

  if (typeof review?.openNow === "boolean") {
    return review.openNow;
  }

  return isOpenFromOpeningHours(review?.openingHours, date);
}

function getOpeningHoursLabel(review, service, date = new Date()) {
  if (review?.businessStatus === "CLOSED_PERMANENTLY") {
    return "Permanently closed";
  }

  return (
    getTodaysOpeningHours(getManualOpeningHours(service), date) ||
    getTodaysOpeningHours(review?.openingHours, date) ||
    ""
  );
}

function getTodaysOpeningHours(openingHours, date = new Date()) {
  if (!Array.isArray(openingHours) || !openingHours.length) {
    return "";
  }

  const today = getBrisbaneWeekday(date);
  const todayHours = openingHours.find((entry) => entry.startsWith(today));

  if (!todayHours) {
    return "";
  }

  return formatOpeningHours(todayHours.replace(`${today}:`, "").trim());
}

function isOpenFromOpeningHours(openingHours, date = new Date()) {
  if (!Array.isArray(openingHours) || !openingHours.length) {
    return null;
  }

  const today = getBrisbaneWeekday(date);
  const todayHours = openingHours.find((entry) => entry.startsWith(today));

  if (!todayHours) {
    return null;
  }

  const hoursText = normaliseHoursText(
    todayHours.replace(`${today}:`, "").trim(),
  );

  if (!hoursText) {
    return null;
  }

  if (/closed/i.test(hoursText)) {
    return false;
  }

  if (/24\s*hours|open\s*24/i.test(hoursText)) {
    return true;
  }

  const timeRanges = extractTimeRanges(hoursText);

  if (!timeRanges.length) {
    return null;
  }

  const currentMinutes = getCurrentMinutesInBrisbane(date);

  return timeRanges.some(({ startMinutes, endMinutes }) => {
    if (endMinutes <= startMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  });
}

function extractTimeRanges(hoursText) {
  const timeRanges = [];
  const text = normaliseHoursText(hoursText);

  const timeRangePattern =
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/gi;

  let match = timeRangePattern.exec(text);

  while (match) {
    const [
      ,
      startHour,
      startMinute = "0",
      startPeriod,
      endHour,
      endMinute = "0",
      endPeriod,
    ] = match;

    timeRanges.push({
      startMinutes: convertTimeToMinutes(startHour, startMinute, startPeriod),
      endMinutes: convertTimeToMinutes(endHour, endMinute, endPeriod),
    });

    match = timeRangePattern.exec(text);
  }

  return timeRanges;
}

function convertTimeToMinutes(hourText, minuteText, periodText) {
  let hour = Number(hourText);
  const minute = Number(minuteText || 0);
  const period = periodText.toLowerCase();

  if (period === "am") {
    hour = hour === 12 ? 0 : hour;
  }

  if (period === "pm") {
    hour = hour === 12 ? 12 : hour + 12;
  }

  return hour * 60 + minute;
}

function getCurrentMinutesInBrisbane(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Brisbane",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );

  return (hour % 24) * 60 + minute;
}

function getBrisbaneWeekday(date = new Date()) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Brisbane",
    weekday: "long",
  }).format(date);
}

function formatOpeningHours(openingHours) {
  return normaliseHoursText(openingHours)
    .replace(/\b(\d{1,2}):00\s*(AM|PM)\b/gi, "$1 $2")
    .replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase())
    .trim();
}

function normaliseHoursText(value) {
  return String(value ?? "")
    .replace(/\u202f/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*–\s*/g, " – ")
    .replace(/\s*-\s*/g, " - ")
    .trim();
}
