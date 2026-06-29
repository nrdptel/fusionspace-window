/** A small curated set of well-known US high-power / club launch sites, offered as one-tap
 *  starting points in the location picker. Window is field-agnostic — any coordinates work —
 *  but most flyers launch at a handful of established waivered sites, so these lower the barrier
 *  for the first lookup.
 *
 *  These are APPROXIMATE launch-area coordinates (to ~1 km), not official or surveyed pad
 *  locations, and listing a site is not an endorsement or a claim about its waiver status. They
 *  are a convenience: pick the nearest, then fine-tune with search or coordinates if you need the
 *  exact pad. Ordered roughly west to east. */

export interface LaunchSite {
  /** Display name — place and state, with the club/event in parentheses where it aids recognition. */
  name: string;
  lat: number;
  lon: number;
}

export const LAUNCH_SITES: LaunchSite[] = [
  { name: "Brothers, OR (OROC)", lat: 43.8, lon: -120.6 },
  { name: "Black Rock Desert, NV", lat: 40.87, lon: -119.34 },
  { name: "Mojave, CA (FAR)", lat: 35.35, lon: -117.81 },
  { name: "Lucerne Valley, CA (ROC)", lat: 34.53, lon: -116.88 },
  { name: "Hartsel, CO (NCR)", lat: 39.05, lon: -105.8 },
  { name: "Argonia, KS (Kloudbusters)", lat: 37.27, lon: -97.77 },
  { name: "Hearne, TX (DARS)", lat: 30.88, lon: -96.59 },
  { name: "North Branch, MN (TCMN)", lat: 45.51, lon: -92.98 },
  { name: "Bong Rec Area, WI (WSR)", lat: 42.66, lon: -88.13 },
  { name: "Bunnell, FL (NEFAR)", lat: 29.47, lon: -81.26 },
];
