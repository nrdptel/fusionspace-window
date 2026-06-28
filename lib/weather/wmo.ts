/** WMO weather interpretation codes (the `weather_code` Open-Meteo returns) mapped to a
 *  short sky label, an icon kind, and whether the code means precipitation is falling. Kept
 *  pure and tiny so the current panel, the hourly timeline, and the outlook all describe a
 *  code the same way. The icon kind is rendered as a monochrome SVG by components/WeatherIcon
 *  — no emoji. Reference: WMO code table 4677, as documented by Open-Meteo. */

/** Weather glyph kinds, rendered as monochrome SVG by components/WeatherIcon. */
export type WeatherKind =
  | "sun"
  | "moon"
  | "partly-day"
  | "partly-night"
  | "cloud"
  | "fog"
  | "rain"
  | "snow"
  | "thunder";

export interface WeatherDesc {
  label: string;
  /** Icon kind for components/WeatherIcon; the day/night variant is chosen here. */
  icon: WeatherKind;
  precip: boolean;
}

const TABLE: Record<number, { label: string; day: WeatherKind; night: WeatherKind; precip: boolean }> = {
  0: { label: "Clear", day: "sun", night: "moon", precip: false },
  1: { label: "Mainly clear", day: "sun", night: "moon", precip: false },
  2: { label: "Partly cloudy", day: "partly-day", night: "partly-night", precip: false },
  3: { label: "Overcast", day: "cloud", night: "cloud", precip: false },
  45: { label: "Fog", day: "fog", night: "fog", precip: false },
  48: { label: "Rime fog", day: "fog", night: "fog", precip: false },
  51: { label: "Light drizzle", day: "rain", night: "rain", precip: true },
  53: { label: "Drizzle", day: "rain", night: "rain", precip: true },
  55: { label: "Heavy drizzle", day: "rain", night: "rain", precip: true },
  56: { label: "Freezing drizzle", day: "rain", night: "rain", precip: true },
  57: { label: "Freezing drizzle", day: "rain", night: "rain", precip: true },
  61: { label: "Light rain", day: "rain", night: "rain", precip: true },
  63: { label: "Rain", day: "rain", night: "rain", precip: true },
  65: { label: "Heavy rain", day: "rain", night: "rain", precip: true },
  66: { label: "Freezing rain", day: "rain", night: "rain", precip: true },
  67: { label: "Freezing rain", day: "rain", night: "rain", precip: true },
  71: { label: "Light snow", day: "snow", night: "snow", precip: true },
  73: { label: "Snow", day: "snow", night: "snow", precip: true },
  75: { label: "Heavy snow", day: "snow", night: "snow", precip: true },
  77: { label: "Snow grains", day: "snow", night: "snow", precip: true },
  80: { label: "Light showers", day: "rain", night: "rain", precip: true },
  81: { label: "Showers", day: "rain", night: "rain", precip: true },
  82: { label: "Violent showers", day: "thunder", night: "thunder", precip: true },
  85: { label: "Snow showers", day: "snow", night: "snow", precip: true },
  86: { label: "Snow showers", day: "snow", night: "snow", precip: true },
  95: { label: "Thunderstorm", day: "thunder", night: "thunder", precip: true },
  96: { label: "Thunderstorm, hail", day: "thunder", night: "thunder", precip: true },
  99: { label: "Thunderstorm, hail", day: "thunder", night: "thunder", precip: true },
};

export function describeWeather(code: number, isDay = true): WeatherDesc {
  const e = TABLE[code];
  if (!e) return { label: "—", icon: "cloud", precip: false };
  return { label: e.label, icon: isDay ? e.day : e.night, precip: e.precip };
}
