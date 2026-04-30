import {
  FaBookOpen,
  FaChair,
  FaClock,
  FaDesktop,
  FaEgg,
  FaFilm,
  FaGraduationCap,
  FaLaptop,
  FaLayerGroup,
  FaMoon,
  FaPlug,
  FaPrint,
  FaQuestionCircle,
  FaSignal,
  FaStar,
  FaUniversalAccess,
  FaUtensils,
  FaUsers,
} from "react-icons/fa";

const GOOGLE_MAPS_SEARCH_URL = "https://www.google.com/maps/search/?api=1&query=";

export const AMENITY_CATEGORY_FILTERS = [
  "All",
  "Study",
  "Equipment",
  "Accessibility",
  "Bookable",
  "Comfort",
  "Specialty",
  "Support",
  "Access",
];

export const AMENITY_DETAILS = {
  "access-24": {
    category: "Access",
    description: "Available for extended or 24-hour study access where UQ allows it.",
    label: "24-hour access",
    Icon: FaClock,
  },
  "access-hours": {
    category: "Access",
    description: "Open during standard library opening hours.",
    label: "Open hours",
    Icon: FaClock,
  },
  "anatomical-models": {
    category: "Specialty",
    description: "Specialised models and resources for biology and health study.",
    label: "Anatomical models",
    Icon: FaLayerGroup,
  },
  askus: {
    category: "Support",
    description: "AskUs staff support for library, study and service questions.",
    label: "AskUs help",
    Icon: FaQuestionCircle,
  },
  "assistive-tech": {
    category: "Accessibility",
    description: "Assistive technology rooms and accessibility-focused support.",
    label: "Assistive tech",
    Icon: FaUniversalAccess,
  },
  collection: {
    category: "Study",
    description: "Library collections and subject resources.",
    label: "Collections",
    Icon: FaBookOpen,
  },
  computers: {
    category: "Equipment",
    description: "Computers are available for student study and coursework.",
    label: "Computers",
    Icon: FaDesktop,
  },
  "device-charging": {
    category: "Equipment",
    description: "Power points, charging support or recharge stations are available.",
    label: "Device charging",
    Icon: FaPlug,
  },
  "energy-pods": {
    category: "Specialty",
    description: "Rest pods for short breaks between study blocks.",
    label: "Energy pods",
    Icon: FaEgg,
  },
  "exam-booths": {
    category: "Bookable",
    description: "Bookable exam booths for focused assessment work.",
    label: "Exam booths",
    Icon: FaLayerGroup,
  },
  "group-study": {
    category: "Study",
    description: "Spaces suited to group work and collaboration.",
    label: "Group study",
    Icon: FaUsers,
  },
  kitchen: {
    category: "Comfort",
    description: "Student kitchen access such as microwave, fridge or water facilities.",
    label: "Kitchen",
    Icon: FaUtensils,
  },
  "laptop-lockers": {
    category: "Equipment",
    description: "Laptop lockers or secure device storage where available.",
    label: "Laptop lockers",
    Icon: FaLaptop,
  },
  "height-adjustable": {
    category: "Accessibility",
    description: "Height-adjustable desks support wheelchair and mobility access.",
    label: "Adjustable desks",
    Icon: FaUniversalAccess,
  },
  lockers: {
    category: "Equipment",
    description:
      "Semester lockers are available for postgraduate students and clients with disability.",
    label: "Lockers",
    Icon: FaLaptop,
  },
  "large-capacity": {
    category: "Study",
    description: "A larger study-space footprint with more seats available.",
    label: "Large capacity",
    Icon: FaChair,
  },
  "low-light": {
    category: "Accessibility",
    description: "Lower-light study zones for students who prefer calmer lighting.",
    label: "Low-light",
    Icon: FaMoon,
  },
  media: {
    category: "Specialty",
    description: "Media equipment such as LP, VHS, Blu-ray or listening/viewing tools.",
    label: "Media equipment",
    Icon: FaFilm,
  },
  monitors: {
    category: "Equipment",
    description: "Monitors, laptop docks or device charging support.",
    label: "Monitors and docks",
    Icon: FaPlug,
  },
  postgrad: {
    category: "Study",
    description: "Postgraduate-only or postgraduate-friendly study areas.",
    label: "Postgrad space",
    Icon: FaGraduationCap,
  },
  presentation: {
    category: "Bookable",
    description: "Presentation practice spaces for rehearsing talks and group work.",
    label: "Presentation room",
    Icon: FaSignal,
  },
  printing: {
    category: "Equipment",
    description: "Printing, scanning or copying support.",
    label: "Printing",
    Icon: FaPrint,
  },
  "quiet-study": {
    category: "Study",
    description: "Quieter areas for individual focus.",
    label: "Quiet study",
    Icon: FaMoon,
  },
  "soundproof-booths": {
    category: "Bookable",
    description:
      "One-person and two-person soundproof meeting booths are available for booking where offered.",
    label: "Soundproof booths",
    Icon: FaLayerGroup,
  },
  training: {
    category: "Bookable",
    description: "Training rooms or learning spaces used for library classes.",
    label: "Training rooms",
    Icon: FaBookOpen,
  },
  "virtual-help": {
    category: "Support",
    description: "Virtual help points for remote support inside the library.",
    label: "Virtual help",
    Icon: FaQuestionCircle,
  },
};

const LIBRARY_DETAIL_FALLBACKS = {
  "architecture-and-music-library": {
    mapQuery: "Architecture and Music Library The University of Queensland",
    featureSummary: "Media gear, device docks and quiet creative study spaces.",
    amenities: [
      "media",
      "monitors",
      "virtual-help",
      "training",
      "computers",
      "printing",
      "group-study",
      "quiet-study",
    ],
    amenityNotes: {
      media:
        "Listening and viewing area with LP record turntable, DVD/VHS player, Blu-ray player and cassette deck.",
      monitors:
        "Level 3 study spots include USB-C monitor and dock support for compatible laptops and tablets.",
      "virtual-help":
        "Virtual service point available for video calls with AskUs and selected UQ support teams.",
      training:
        "Training room access is available when not being used for classes.",
      computers:
        "Library computers are available for student coursework and study.",
      printing:
        "Printing, scanning and copying are available through UQ library print services.",
      "group-study": "Collaborative study spaces are available across the library.",
      "quiet-study": "Quieter individual study areas are available for focused work.",
    },
  },
  "biological-sciences-library": {
    mapQuery: "Biological Sciences Library The University of Queensland",
    featureSummary: "Energy pods, anatomical models, kitchen and postgrad study.",
    amenities: [
      "energy-pods",
      "anatomical-models",
      "kitchen",
      "postgrad",
      "lockers",
      "virtual-help",
      "training",
      "computers",
      "printing",
    ],
    amenityNotes: {
      "energy-pods": "Level 2 energy pods are available for short rest breaks.",
      "anatomical-models":
        "Level 3 anatomical models support biology and health sciences study.",
      kitchen:
        "Level 2 kitchen includes fridge, microwave, filtered water and seating.",
      postgrad: "Level 4 postgraduate study space is available.",
      lockers:
        "Semester lockers are available on Level 4 for postgraduate students and clients with disability.",
      "virtual-help":
        "Level 1 virtual service point connects you with AskUs and selected UQ teams.",
      training:
        "Training rooms include computers, a trainer computer, projector and whiteboard when available.",
      computers:
        "Library computers are available for student coursework and study.",
      printing:
        "Printing, scanning and copying are available through UQ library print services.",
    },
  },
  "central-library": {
    mapQuery: "Central Library The University of Queensland",
    featureSummary: "Largest study hub with low-light rooms, kitchen and AskUs help.",
    amenities: [
      "assistive-tech",
      "height-adjustable",
      "low-light",
      "postgrad",
      "exam-booths",
      "soundproof-booths",
      "presentation",
      "kitchen",
      "laptop-lockers",
      "lockers",
      "askus",
      "monitors",
      "device-charging",
      "computers",
      "printing",
    ],
    amenityNotes: {
      "assistive-tech":
        "Level 1 has three assistive technology rooms with specialist software, height-adjustable desks, dimmable lights, magnification tools, webcam and document scanner.",
      "height-adjustable":
        "Assistive technology rooms include height-adjustable desks and adjustable touch screens.",
      "low-light":
        "Level 3 low-light study spaces use dim overhead lighting and individual lamps.",
      postgrad: "Level 4 postgraduate study space is available.",
      "exam-booths":
        "Ten high-walled Level 1 exam booths can be booked outside exam periods.",
      "soundproof-booths":
        "Bookable one-person and two-person meeting booths are available through UQ Book It.",
      presentation:
        "Room N206 on Level 2 is set up for presentation practice with UQ presentation equipment.",
      kitchen:
        "Level 2 kitchen includes fridge, microwave, filtered water and seating.",
      "laptop-lockers":
        "Laptop lockers let students borrow or charge a laptop at Central Library.",
      lockers:
        "Semester lockers are available on Levels 1 and 4 for postgraduate students and clients with disability.",
      askus: "AskUs desk is on Level 1 during staffed hours.",
      monitors:
        "Level 1 and Level 4 postgraduate areas include monitor and dock study spots.",
      "device-charging":
        "Recent Level 3 and Level 4 updates added long tables with lamps, power and device charging access.",
      computers:
        "Library computers are available for student coursework and study.",
      printing:
        "Printing, scanning and copying are available through UQ library print services.",
    },
  },
  "dorothy-hill-engineering-and-sciences-library": {
    mapQuery:
      "Dorothy Hill Engineering and Sciences Library The University of Queensland",
    featureSummary: "Science study base with low-light spaces, kitchen and lockers.",
    amenities: [
      "low-light",
      "kitchen",
      "laptop-lockers",
      "askus",
      "monitors",
      "device-charging",
      "large-capacity",
      "computers",
      "printing",
    ],
    amenityNotes: {
      "low-light":
        "Level 3 low-light study spaces are available for calmer focused study.",
      kitchen:
        "Level 2 student kitchen includes fridge, microwave, filtered water and seating.",
      "laptop-lockers":
        "Laptop lockers let students borrow or charge a laptop at Dorothy Hill.",
      askus: "AskUs desk is on Level 2 during staffed hours.",
      monitors:
        "Level 2 study spots include USB-C monitor and dock support for compatible devices.",
      "device-charging":
        "Study areas include power access for laptops and mobile devices.",
      "large-capacity": "A larger science and engineering study base with many study spaces.",
      computers:
        "Library computers are available for student coursework and study.",
      printing:
        "Printing, scanning and copying are available through UQ library print services.",
    },
  },
  "dutton-park-health-sciences-library": {
    mapQuery: "Dutton Park Health Sciences Library The University of Queensland",
    featureSummary: "Health study space with AskUs, lockers and training rooms.",
    amenities: [
      "askus",
      "laptop-lockers",
      "monitors",
      "training",
      "computers",
      "printing",
      "collection",
    ],
    amenityNotes: {
      askus: "AskUs service point is available during staffed hours.",
      "laptop-lockers":
        "Laptop lockers let students borrow or charge a laptop at Dutton Park.",
      monitors:
        "Level 6 study spots include USB-C monitor and dock support for compatible devices.",
      training:
        "Training rooms include computers, a trainer computer, projector and whiteboard when available.",
      computers:
        "Library computers are available for student coursework and study.",
      printing:
        "Printing, scanning and copying are available through UQ library print services.",
      collection: "General collections and high-use/requested items support health study.",
    },
  },
  "duhig-tower": {
    mapQuery: "Duhig Tower The University of Queensland",
    featureSummary: "Great Court study tower with kitchen, docks and postgrad areas.",
    amenities: [
      "kitchen",
      "postgrad",
      "lockers",
      "monitors",
      "training",
      "group-study",
      "quiet-study",
      "computers",
      "printing",
    ],
    amenityNotes: {
      kitchen:
        "Level 1 kitchen includes fridge, microwave, filtered water and seating.",
      postgrad: "Level 4 and Level 5 postgraduate study spaces are available.",
      lockers:
        "Semester lockers are available on Level 4 for postgraduate students and clients with disability.",
      monitors:
        "Level 2 and Level 4 postgraduate areas include monitor and dock study spots.",
      training:
        "Training rooms include computers, a trainer computer, projector and whiteboard when available.",
      "group-study": "Collaborative study spaces are available across the tower.",
      "quiet-study": "Higher-floor quiet study areas support individual focus.",
      computers:
        "Library computers are available for student coursework and study.",
      printing:
        "Printing, scanning and copying are available through UQ library print services.",
    },
  },
  "herston-health-sciences-library": {
    mapQuery: "Herston Health Sciences Library The University of Queensland",
    featureSummary: "Health sciences space with AskUs, lockers and training rooms.",
    amenities: [
      "askus",
      "laptop-lockers",
      "training",
      "computers",
      "printing",
      "collection",
    ],
    amenityNotes: {
      askus: "AskUs service point is available during staffed hours.",
      "laptop-lockers":
        "Laptop lockers let students borrow or charge a laptop at Herston.",
      training:
        "Training rooms include computers, a trainer computer, projector and whiteboard when available.",
      computers:
        "Library computers are available for student coursework and study.",
      printing:
        "Printing, scanning and copying are available through UQ library print services.",
      collection: "General collections and high-use/requested items support health study.",
    },
  },
  "jk-murray-library-uq-gatton": {
    mapQuery: "JK Murray Library UQ Gatton",
    featureSummary: "Gatton study hub with energy pods, kitchen and accessibility rooms.",
    amenities: [
      "assistive-tech",
      "height-adjustable",
      "energy-pods",
      "kitchen",
      "laptop-lockers",
      "lockers",
      "askus",
      "monitors",
      "training",
      "computers",
      "printing",
    ],
    amenityNotes: {
      "assistive-tech":
        "Level 1 assistive technology room includes specialist software, adjustable equipment and accessibility-focused study support.",
      "height-adjustable":
        "Assistive technology room includes adjustable equipment for accessible study.",
      "energy-pods": "Level 2 energy pods are available for short rest breaks.",
      kitchen:
        "Level 1 kitchen includes fridge, microwave, filtered water and seating.",
      "laptop-lockers":
        "Laptop lockers let students borrow or charge a laptop at JK Murray.",
      lockers:
        "Semester lockers are available on Level 1 for postgraduate students and clients with disability.",
      askus: "AskUs support is available from Level 2 during staffed hours.",
      monitors:
        "Level 2 study spots include USB-C monitor and dock support for compatible devices.",
      training:
        "Training rooms include computers, a trainer computer, projector and whiteboard when available.",
      computers:
        "Library computers are available for student coursework and study.",
      printing:
        "Printing, scanning and copying are available through UQ library print services.",
    },
  },
  "walter-harrison-law-library": {
    mapQuery: "Walter Harrison Law Library The University of Queensland",
    featureSummary: "Law study space with kitchen, docks and virtual help point.",
    amenities: [
      "kitchen",
      "monitors",
      "virtual-help",
      "training",
      "computers",
      "printing",
      "collection",
    ],
    amenityNotes: {
      kitchen:
        "Level 2 kitchen includes fridge, microwave, filtered water and seating.",
      monitors:
        "Level 2 study spots include USB-C monitor and dock support for compatible devices.",
      "virtual-help":
        "Level 2 virtual service point connects you with AskUs and selected UQ support teams.",
      training:
        "Training rooms include computers, a trainer computer, projector and whiteboard when available.",
      computers:
        "Library computers are available for student coursework and study.",
      printing:
        "Printing, scanning and copying are available through UQ library print services.",
      collection: "Law collections and study resources are available in the library.",
    },
  },
};

export function getAmenityItems(library) {
  if (!library) {
    return [];
  }

  const fallback = LIBRARY_DETAIL_FALLBACKS[library.id];
  const accessAmenity =
    library.accessLabel === "24 hours" ? "access-24" : "access-hours";
  const sourceAmenities = library.amenities?.length
    ? library.amenities
    : fallback?.amenities ?? [];
  const amenityIds = [accessAmenity, ...sourceAmenities];

  return Array.from(new Set(amenityIds))
    .map((id) => {
      const detail = AMENITY_DETAILS[id];

      if (!detail) {
        return null;
      }

      return {
        id,
        ...detail,
        description: fallback?.amenityNotes?.[id] ?? detail.description,
      };
    })
    .filter(Boolean);
}

export function getFeaturedAmenitySummary(libraries) {
  const allAmenityItems = libraries.flatMap((library) => getAmenityItems(library));
  const countByCategory = allAmenityItems.reduce((counts, amenity) => {
    counts.set(amenity.category, (counts.get(amenity.category) ?? 0) + 1);
    return counts;
  }, new Map());

  return [
    {
      count: countByCategory.get("Equipment") ?? 0,
      label: "Equipment",
      category: "Equipment",
      Icon: FaDesktop,
    },
    {
      count: countByCategory.get("Study") ?? 0,
      label: "Study zones",
      category: "Study",
      Icon: FaChair,
    },
    {
      count: countByCategory.get("Accessibility") ?? 0,
      label: "Accessibility",
      category: "Accessibility",
      Icon: FaUniversalAccess,
    },
    {
      count: countByCategory.get("Specialty") ?? 0,
      label: "Resources",
      category: "Specialty",
      Icon: FaStar,
    },
  ];
}

export function getFeatureSummary(library) {
  return (
    library?.featureSummary ??
    LIBRARY_DETAIL_FALLBACKS[library?.id]?.featureSummary ??
    "Live occupancy and study features for this library."
  );
}

export function getLibraryMapUrl(library) {
  if (library?.mapUrl) {
    return library.mapUrl;
  }

  const query = LIBRARY_DETAIL_FALLBACKS[library?.id]?.mapQuery;

  if (!query) {
    return "";
  }

  return `${GOOGLE_MAPS_SEARCH_URL}${encodeURIComponent(query)}`;
}
