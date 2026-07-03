// Shared outbound links. The site origin resolves the same way the metadata,
// robots, and sitemap do — a fork can point it at its own domain with
// NEXT_PUBLIC_SITE_URL.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://window.fusionspace.co";
export const HUB_URL = "https://fusionspace.co";
export const REPO_URL = "https://github.com/nrdptel/fusionspace-window";
export const KOFI_URL = "https://ko-fi.com/nrdptel";

// Public conditions API — the docs page (a route on the site) and the versioned JSON base. Mirrors
// the sibling tools' pattern (motor.fusionspace.co/api → /api/v1/*.json).
export const API_DOCS_PATH = "/api";
export const API_BASE_URL = `${SITE_URL}/api/v1`;

// Sibling Fusion Space tools, linked inline in the footer the way the live siblings do
// (Charge's footer carries a Motor Finder link, no "more tools" heading). The LIVE tools only
// — Debrief is still in development, so it isn't linked from a launch-ready tool. Window is
// omitted (you're already here).
export const SIBLING_TOOLS = [
  { name: "Motor Finder", href: "https://motor.fusionspace.co", blurb: "Live motor stock & pricing" },
  { name: "Charge", href: "https://charge.fusionspace.co", blurb: "Ejection-charge calculator" },
] as const;

// Data providers — credited in the footer and the explainer.
export const OPEN_METEO_URL = "https://open-meteo.com";
export const NWS_URL = "https://www.weather.gov";
