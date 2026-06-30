// Shared outbound links. The site origin resolves the same way the metadata,
// robots, and sitemap do — a fork can point it at its own domain with
// NEXT_PUBLIC_SITE_URL.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://window.fusionspace.co";
export const HUB_URL = "https://fusionspace.co";
export const REPO_URL = "https://github.com/nrdptel/fusionspace-window";
export const KOFI_URL = "https://ko-fi.com/nrdptel";

// Sibling Fusion Space tools, for the footer's "more tools" cross-links — the same family
// nav the other projects carry. Window is omitted (you're already here); order is most- to
// least-related for a launch-day flyer.
export const SIBLING_TOOLS = [
  { name: "Motor Finder", href: "https://motor.fusionspace.co", blurb: "Live motor stock & pricing" },
  { name: "Charge", href: "https://charge.fusionspace.co", blurb: "Ejection-charge calculator" },
  { name: "Debrief", href: "https://debrief.fusionspace.co", blurb: "Altimeter flight-log analyzer" },
] as const;

// Data providers — credited in the footer and the explainer.
export const OPEN_METEO_URL = "https://open-meteo.com";
export const NWS_URL = "https://www.weather.gov";
