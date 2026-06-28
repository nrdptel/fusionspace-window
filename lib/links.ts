// Shared outbound links. The site origin resolves the same way the metadata,
// robots, and sitemap do — a fork can point it at its own domain with
// NEXT_PUBLIC_SITE_URL.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://window.fusionspace.co";
export const HUB_URL = "https://fusionspace.co";
export const REPO_URL = "https://github.com/nrdptel/fusionspace-window";
export const KOFI_URL = "https://ko-fi.com/nrdptel";

// Data providers — credited in the footer and the explainer.
export const OPEN_METEO_URL = "https://open-meteo.com";
export const NWS_URL = "https://www.weather.gov";
