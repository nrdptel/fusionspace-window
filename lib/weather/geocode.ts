/** Open-Meteo Geocoding response → place results for the search box. Pure. */

export interface Place {
  name: string;
  lat: number;
  lon: number;
  admin1?: string;
  country?: string;
  countryCode?: string;
  /** Compact display label, e.g. "Lucerne Valley, California". */
  label: string;
}

interface RawResult {
  name?: string;
  latitude?: number;
  longitude?: number;
  admin1?: string;
  country?: string;
  country_code?: string;
}

export function parseGeocode(raw: unknown): Place[] {
  const results = (raw as { results?: RawResult[] })?.results ?? [];
  const out: Place[] = [];
  for (const r of results) {
    if (
      !r.name ||
      typeof r.latitude !== "number" ||
      typeof r.longitude !== "number"
    )
      continue;
    out.push({
      name: r.name,
      lat: r.latitude,
      lon: r.longitude,
      admin1: r.admin1,
      country: r.country,
      countryCode: r.country_code,
      label: placeLabel(r.name, r.admin1, r.country, r.country_code),
    });
  }
  return out;
}

/** "Name, State" for US places; appends the country for everything else. */
export function placeLabel(
  name: string,
  admin1?: string,
  country?: string,
  countryCode?: string,
): string {
  const parts = [name];
  if (admin1 && admin1 !== name) parts.push(admin1);
  if (country && countryCode !== "US") parts.push(country);
  return parts.join(", ");
}
