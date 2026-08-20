export const GOLD_COAST_RAIL_STATIONS = [
  station("boggo-road", "Boggo Road", -27.4932, 153.0281),
  station("south-bank", "South Bank", -27.4813, 153.0234),
  station("south-brisbane", "South Brisbane", -27.475, 153.0186),
  station("roma-street", "Roma Street", -27.4663, 153.018),
  station("central", "Central", -27.466076, 153.02632),
  station("fortitude-valley", "Fortitude Valley", -27.4565, 153.0347),
  station("bowen-hills", "Bowen Hills", -27.4459, 153.0384),
  station("altandi", "Altandi", -27.5769, 153.073),
  station("loganlea", "Loganlea", -27.6398, 153.1071),
  station("beenleigh", "Beenleigh", -27.7178, 153.2023),
  station("ormau", "Ormeau", -27.7911, 153.2513),
  station("pimpama", "Pimpama", -27.819, 153.2914),
  station("coomera", "Coomera", -27.8522, 153.3162),
];

export const GOLD_COAST_TRAM_STATIONS = [
  station("helensvale-tram", "Helensvale", -27.9258, 153.3353, { minutesToHelensvale: 0 }),
  station("university-hospital", "Gold Coast University Hospital", -27.9604, 153.3809, { minutesToHelensvale: 11 }),
  station("southport", "Southport", -27.9689, 153.413, { minutesToHelensvale: 20 }),
  station("broadwater-parklands", "Broadwater Parklands", -27.9787, 153.4235, { minutesToHelensvale: 24 }),
  station("main-beach", "Main Beach", -27.9808, 153.4267, { minutesToHelensvale: 27 }),
  station("surfers-paradise-north", "Surfers Paradise North", -27.9942, 153.4285, { minutesToHelensvale: 30 }),
  station("cypress-avenue", "Cypress Avenue", -27.9987, 153.4278, { minutesToHelensvale: 32 }),
  station("cavill-avenue", "Cavill Avenue", -28.0025, 153.4282, { minutesToHelensvale: 34 }),
  station("surfers-paradise", "Surfers Paradise", -28.0057, 153.429, { minutesToHelensvale: 36 }),
  station("broadbeach-south", "Broadbeach South", -28.0362, 153.4309, { minutesToHelensvale: 44 }),
  station("burleigh-heads", "Burleigh Heads", -28.0871, 153.4502, { minutesToHelensvale: 58 }),
];

export const AIRPORT_RAIL_STATIONS = [
  station("boggo-road", "Boggo Road", -27.4932, 153.0281),
  station("south-bank", "South Bank", -27.4813, 153.0234),
  station("south-brisbane", "South Brisbane", -27.475, 153.0186),
  station("roma-street", "Roma Street", -27.4663, 153.018),
  station("central", "Central", -27.466076, 153.02632),
  station("fortitude-valley", "Fortitude Valley", -27.4565, 153.0347),
  station("bowen-hills", "Bowen Hills", -27.4459, 153.0384),
  station("albion", "Albion", -27.4309, 153.042),
  station("wooloowin", "Wooloowin", -27.422, 153.045),
  station("eagle-junction", "Eagle Junction", -27.4061, 153.0489),
];

function station(id, label, latitude, longitude, extra = {}) {
  return {
    id,
    label,
    latitude,
    longitude,
    stopName: `${label} station`,
    ...extra,
  };
}
