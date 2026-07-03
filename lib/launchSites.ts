/** A curated set of US high-power / club rocketry launch sites, grouped by state and offered as
 *  one-tap starting points in the location picker. Window is field-agnostic — any coordinates
 *  work — but most flyers launch at a handful of established club fields, so these lower the
 *  barrier for the first lookup.
 *
 *  These are APPROXIMATE launch-area coordinates (to ~1 km), not official or surveyed pad
 *  locations, and listing a site is not an endorsement or a claim about its waiver status. They
 *  were compiled from Tripoli Rocketry Association prefecture listings, NAR section pages, and
 *  each club's own site/schedule, kept to fields corroborated as active in 2023–2025. Clubs move
 *  fields and waivers change: treat these as a convenient starting pin, then fine-tune with search
 *  or coordinates for your exact pad. */

export interface LaunchSite {
  /** Display name — club/site abbreviation and the launch field's town. */
  name: string;
  /** USPS two-letter code for the state the launch field sits in. */
  state: string;
  lat: number;
  lon: number;
}

/** Full names for the two-letter codes used above, for the state picker's labels. */
export const US_STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

export const LAUNCH_SITES: LaunchSite[] = [
  // Alabama
  { name: "SEARS — Samson", state: "AL", lat: 31.13, lon: -86.07 },
  { name: "HARA — Woodville", state: "AL", lat: 34.63, lon: -86.32 },
  { name: "SoAR — Centre", state: "AL", lat: 34.16, lon: -85.73 },
  // Arkansas
  { name: "CAR — Little Rock", state: "AR", lat: 34.81, lon: -92.4 },
  // Arizona
  { name: "Tripoli Phoenix — Aguila", state: "AZ", lat: 33.82, lon: -113.14 },
  { name: "SARA — Tucson (TIMPA)", state: "AZ", lat: 32.28, lon: -111.27 },
  // California
  { name: "ROC — Lucerne Valley", state: "CA", lat: 34.5, lon: -116.96 },
  { name: "MDARS — North Edwards", state: "CA", lat: 35.1, lon: -117.8 },
  { name: "FAR — Cantil", state: "CA", lat: 35.35, lon: -117.81 },
  { name: "Tripoli San Diego — Holtville", state: "CA", lat: 32.84, lon: -115.27 },
  { name: "LUNAR — Snow Ranch", state: "CA", lat: 37.94, lon: -120.82 },
  { name: "TCC — Helm", state: "CA", lat: 36.51, lon: -120.07 },
  // Colorado
  { name: "NCR — Nunn", state: "CO", lat: 40.89, lon: -104.64 },
  { name: "NCR — Atlas Site", state: "CO", lat: 40.65, lon: -104.38 },
  { name: "Tripoli Colorado — Hartsel", state: "CO", lat: 39.01, lon: -105.7 },
  { name: "SCORE — Pueblo", state: "CO", lat: 38.16, lon: -104.81 },
  // Connecticut
  { name: "CATO — Durham", state: "CT", lat: 41.47, lon: -72.69 },
  // Florida
  { name: "SRA — Palm Bay", state: "FL", lat: 27.93, lon: -80.71 },
  { name: "Tripoli Tampa — Plant City", state: "FL", lat: 28.08, lon: -82.18 },
  { name: "FLASH — Cape Coral", state: "FL", lat: 26.63, lon: -81.98 },
  { name: "FSA — West Palm Beach", state: "FL", lat: 26.76, lon: -80.11 },
  // Georgia
  { name: "GRITS — Nashville", state: "GA", lat: 31.28, lon: -83.35 },
  { name: "SoAR — Alpharetta", state: "GA", lat: 34.1, lon: -84.3 },
  // Idaho
  { name: "Tripoli Idaho — Swan Falls", state: "ID", lat: 43.24, lon: -116.32 },
  // Illinois
  { name: "QCRS — Ohio, IL", state: "IL", lat: 41.49, lon: -89.5 },
  { name: "CIA — Rantoul", state: "IL", lat: 40.29, lon: -88.14 },
  { name: "NIRA — Glendale Heights", state: "IL", lat: 41.93, lon: -88.05 },
  // Indiana
  { name: "Indiana Rocketry — Pence", state: "IN", lat: 40.39, lon: -87.51 },
  { name: "SCAM — Milford", state: "IN", lat: 41.37, lon: -85.83 },
  // Kansas
  { name: "Kloudbusters — Argonia", state: "KS", lat: 37.17, lon: -97.74 },
  { name: "KOSMO — Ellinwood", state: "KS", lat: 38.39, lon: -98.62 },
  // Kentucky
  { name: "MC2 — Olmstead", state: "KY", lat: 36.71, lon: -87.0 },
  // Louisiana
  { name: "SOLAR — Winnsboro", state: "LA", lat: 32.21, lon: -91.85 },
  // Maine
  { name: "MMMSC — Berwick", state: "ME", lat: 43.31, lon: -70.9 },
  // Maryland
  { name: "MDRA — Higgs Farm", state: "MD", lat: 39.08, lon: -75.87 },
  { name: "MDRA — Central Sod Farm", state: "MD", lat: 39.0, lon: -76.11 },
  { name: "NARHAMS — Mt. Airy", state: "MD", lat: 39.38, lon: -77.1 },
  // Massachusetts
  { name: "CMASS — Amesbury", state: "MA", lat: 42.86, lon: -70.96 },
  // Michigan
  { name: "Michigan Team 1 — St. Charles", state: "MI", lat: 43.28, lon: -84.04 },
  { name: "Michiana Rocketry — Three Oaks", state: "MI", lat: 41.78, lon: -86.57 },
  { name: "JMRC — Grass Lake", state: "MI", lat: 42.2, lon: -83.97 },
  // Minnesota
  { name: "Tripoli MN — North Branch", state: "MN", lat: 45.56, lon: -92.93 },
  // Missouri
  { name: "Tripoli Mo-Kan — South Greenfield", state: "MO", lat: 37.29, lon: -93.85 },
  { name: "SLRA — Elsberry", state: "MO", lat: 39.16, lon: -90.76 },
  // Montana
  { name: "BSRA — Twin Bridges", state: "MT", lat: 45.55, lon: -112.51 },
  // Nebraska
  { name: "THOR — Omaha", state: "NE", lat: 41.17, lon: -96.97 },
  { name: "THOR — Concord", state: "NE", lat: 42.38, lon: -96.94 },
  // Nevada
  { name: "Black Rock Desert — Gerlach", state: "NV", lat: 40.87, lon: -119.11 },
  { name: "Tripoli Vegas — Jean", state: "NV", lat: 35.79, lon: -115.25 },
  { name: "Sierra Rocketry — Misfits Flat", state: "NV", lat: 39.35, lon: -119.39 },
  { name: "Tripoli Vegas — Delamar", state: "NV", lat: 37.32, lon: -114.95 },
  // New Mexico
  { name: "Tripoli NM — Alamogordo", state: "NM", lat: 32.93, lon: -106.01 },
  // New York
  { name: "URRG — Potter", state: "NY", lat: 42.7, lon: -77.19 },
  { name: "METRA — Pine Island", state: "NY", lat: 41.34, lon: -74.48 },
  { name: "MARS — Geneseo", state: "NY", lat: 42.8, lon: -77.85 },
  { name: "SRC — Baldwinsville", state: "NY", lat: 43.12, lon: -76.33 },
  // North Carolina
  { name: "Tripoli East NC — Bayboro", state: "NC", lat: 35.17, lon: -76.83 },
  { name: "Tripoli East NC — Butner", state: "NC", lat: 36.16, lon: -78.81 },
  { name: "ROCC — Midland", state: "NC", lat: 35.2, lon: -80.45 },
  { name: "SEVRA — Elizabeth City", state: "NC", lat: 36.43, lon: -76.47 },
  // Ohio
  { name: "Wright Stuff — Cedarville", state: "OH", lat: 39.73, lon: -83.7 },
  { name: "Tripoli Mid-Ohio — South Charleston", state: "OH", lat: 39.86, lon: -83.66 },
  { name: "NOTRA — Amherst", state: "OH", lat: 41.34, lon: -82.31 },
  { name: "WVSOAR — New Plymouth", state: "OH", lat: 39.33, lon: -82.44 },
  // Oklahoma
  { name: "Tripoli OK — Burns Flat", state: "OK", lat: 35.34, lon: -99.2 },
  { name: "Tulsa Rocketry — Leonard", state: "OK", lat: 35.93, lon: -95.79 },
  { name: "Tulsa Rocketry — Pawhuska", state: "OK", lat: 36.67, lon: -96.41 },
  // Oregon
  { name: "OROC — Brothers", state: "OR", lat: 43.8, lon: -120.65 },
  { name: "SOR — Eagle Point", state: "OR", lat: 42.42, lon: -122.77 },
  // Pennsylvania
  { name: "Tripoli Pittsburgh — Isabella", state: "PA", lat: 39.94, lon: -79.92 },
  { name: "PSC — Grove City", state: "PA", lat: 41.18, lon: -80.04 },
  { name: "SPAAR — Annville", state: "PA", lat: 40.42, lon: -76.61 },
  // South Carolina
  { name: "Rocketry SC — Dalzell", state: "SC", lat: 34.06, lon: -80.43 },
  // Tennessee
  { name: "MC2 — Columbia", state: "TN", lat: 35.67, lon: -87.09 },
  { name: "MSRS — Memphis", state: "TN", lat: 35.15, lon: -89.86 },
  // Texas
  { name: "Tripoli Houston — Hearne", state: "TX", lat: 30.87, lon: -96.62 },
  { name: "DARS — Gunter", state: "TX", lat: 33.44, lon: -96.8 },
  { name: "TNT — Seymour", state: "TX", lat: 33.5, lon: -99.34 },
  { name: "AARG — Rockdale", state: "TX", lat: 30.68, lon: -97.14 },
  { name: "AARG — Hutto", state: "TX", lat: 30.61, lon: -97.49 },
  { name: "POTROCS — Boys Ranch", state: "TX", lat: 35.53, lon: -102.25 },
  { name: "WTSV — Wall", state: "TX", lat: 31.33, lon: -100.3 },
  { name: "NHRC — Houston (JSC)", state: "TX", lat: 29.55, lon: -95.09 },
  { name: "Tripoli Houston — Alvin", state: "TX", lat: 29.27, lon: -95.14 },
  { name: "HCR — El Paso", state: "TX", lat: 31.73, lon: -106.13 },
  // Utah
  { name: "UROC — Fairfield", state: "UT", lat: 40.22, lon: -112.25 },
  // Virginia
  { name: "NOVAAR — The Plains", state: "VA", lat: 38.83, lon: -77.81 },
  { name: "BattlePark — Rapidan", state: "VA", lat: 38.4, lon: -78.06 },
  { name: "VAST — Monterey", state: "VA", lat: 38.38, lon: -79.61 },
  // Washington
  { name: "Tri-Cities Rocketeers — Pasco", state: "WA", lat: 46.4, lon: -119.02 },
  { name: "WAC — Redmond (60 Acres)", state: "WA", lat: 47.7, lon: -122.14 },
  // West Virginia
  { name: "WVROCK — Morgantown", state: "WV", lat: 39.65, lon: -80.03 },
  // Wisconsin
  { name: "WOOSH — Kansasville", state: "WI", lat: 42.64, lon: -88.13 },
  // Alaska
  { name: "Alaska NorthStars — Big Lake", state: "AK", lat: 61.53, lon: -149.92 },
  // Hawaii
  { name: "Hawaii Kai Rocketeers — Aiea", state: "HI", lat: 21.38, lon: -157.94 },
  // Iowa
  { name: "ISOAR — Indianola", state: "IA", lat: 41.36, lon: -93.52 },
  // Mississippi
  { name: "MSRA — Starkville", state: "MS", lat: 33.4, lon: -88.74 },
  // North Dakota
  { name: "NDRA — Larimore", state: "ND", lat: 47.82, lon: -97.63 },
  // New Jersey
  { name: "SOJARS — Williamstown", state: "NJ", lat: 39.71, lon: -75.05 },
  { name: "CENJARS — Wall Twp", state: "NJ", lat: 40.16, lon: -74.08 },
  // Rhode Island
  { name: "RIMRA — West Kingston", state: "RI", lat: 41.48, lon: -71.54 },
  // South Dakota
  { name: "SDRJ — Bruce", state: "SD", lat: 44.51, lon: -96.86 },
  // Vermont
  { name: "SVRS — Putney", state: "VT", lat: 42.99, lon: -72.54 },
  // Wyoming
  { name: "WHF — Buffalo", state: "WY", lat: 44.31, lon: -106.69 },
];

export interface StateSites {
  /** USPS two-letter code. */
  state: string;
  /** Full state name for display. */
  name: string;
  sites: LaunchSite[];
}

/** Group the sites by state, states sorted by full name and sites sorted by name within each —
 *  the shape the location picker's "pick a state, then a site" view iterates. */
export function sitesByState(sites: LaunchSite[] = LAUNCH_SITES): StateSites[] {
  const byState = new Map<string, LaunchSite[]>();
  for (const s of sites) {
    const list = byState.get(s.state);
    if (list) list.push(s);
    else byState.set(s.state, [s]);
  }
  return [...byState.entries()]
    .map(([state, list]) => ({
      state,
      name: US_STATE_NAMES[state] ?? state,
      sites: [...list].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
