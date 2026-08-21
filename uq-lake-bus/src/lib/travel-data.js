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
  station("helensvale-tram", "Helensvale", -27.925577, 153.339336, { minutesToHelensvale: 0 }),
  station("parkwood", "Parkwood", -27.951664, 153.34698, { minutesToHelensvale: 6 }),
  station("parkwood-east", "Parkwood East", -27.963012, 153.364505, { minutesToHelensvale: 9 }),
  station("university-hospital", "Gold Coast University Hospital", -27.960724, 153.380523, { minutesToHelensvale: 11 }),
  station("griffith-university", "Griffith University", -27.963341, 153.384705, {
    minutesToHelensvale: 13,
    stopName: "Griffith University station (Southport)",
  }),
  station("queen-street", "Queen Street", -27.97019, 153.394502, {
    minutesToHelensvale: 17,
    stopName: "Queen Street station (Southport)",
  }),
  station("nerang-street", "Nerang Street", -27.970663, 153.408511, { minutesToHelensvale: 19 }),
  station("southport", "Southport", -27.967768, 153.413681, { minutesToHelensvale: 20 }),
  station("southport-south", "Southport South", -27.97254, 153.415539, { minutesToHelensvale: 22 }),
  station("broadwater-parklands", "Broadwater Parklands", -27.973506, 153.418786, { minutesToHelensvale: 24 }),
  station("main-beach", "Main Beach", -27.982052, 153.423472, { minutesToHelensvale: 27 }),
  station("surfers-paradise-north", "Surfers Paradise North", -27.992586, 153.42924, { minutesToHelensvale: 30 }),
  station("cypress-avenue", "Cypress Avenue", -27.996592, 153.429131, { minutesToHelensvale: 32 }),
  station("cavill-avenue", "Cavill Avenue", -28.001676, 153.428404, { minutesToHelensvale: 34 }),
  station("surfers-paradise", "Surfers Paradise", -28.006163, 153.429076, { minutesToHelensvale: 36 }),
  station("northcliffe", "Northcliffe", -28.009959, 153.429479, { minutesToHelensvale: 38 }),
  station("florida-gardens", "Florida Gardens", -28.017289, 153.429269, { minutesToHelensvale: 40 }),
  station("broadbeach-north", "Broadbeach North", -28.028814, 153.429852, { minutesToHelensvale: 43 }),
  station("broadbeach-south", "Broadbeach South", -28.035854, 153.43116, { minutesToHelensvale: 45 }),
  station("mermaid-beach", "Mermaid Beach", -28.041897, 153.434171, { minutesToHelensvale: 48 }),
  station("mermaid-beach-south", "Mermaid Beach South", -28.050534, 153.436288, { minutesToHelensvale: 51 }),
  station("nobby-beach", "Nobby Beach", -28.059365, 153.437891, { minutesToHelensvale: 54 }),
  station("miami-north", "Miami North", -28.065009, 153.438686, { minutesToHelensvale: 56 }),
  station("miami", "Miami", -28.068908, 153.441896, { minutesToHelensvale: 58 }),
  station("christine-avenue", "Christine Avenue", -28.075633, 153.445151, { minutesToHelensvale: 60 }),
  station("second-avenue", "Second Avenue", -28.08408, 153.448319, { minutesToHelensvale: 62 }),
  station("burleigh-heads", "Burleigh Heads", -28.089683, 153.452934, { minutesToHelensvale: 64 }),
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
