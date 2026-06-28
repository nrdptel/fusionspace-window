/** WMO weather interpretation codes (the `weather_code` Open-Meteo returns) mapped to a
 *  short sky label, a glyph, and whether the code means precipitation is falling. Kept
 *  pure and tiny so the current panel, the hourly timeline, and the outlook all describe
 *  a code the same way. Reference: WMO code table 4677, as documented by Open-Meteo. */

export interface WeatherDesc {
  label: string;
  /** A simple emoji glyph; the day/night variant is chosen for clear/partly-cloudy. */
  glyph: string;
  precip: boolean;
}

const TABLE: Record<number, { label: string; day: string; night: string; precip: boolean }> = {
  0: { label: "Clear", day: "☀️", night: "🌙", precip: false },
  1: { label: "Mainly clear", day: "🌤️", night: "🌙", precip: false },
  2: { label: "Partly cloudy", day: "⛅", night: "☁️", precip: false },
  3: { label: "Overcast", day: "☁️", night: "☁️", precip: false },
  45: { label: "Fog", day: "🌫️", night: "🌫️", precip: false },
  48: { label: "Rime fog", day: "🌫️", night: "🌫️", precip: false },
  51: { label: "Light drizzle", day: "🌦️", night: "🌧️", precip: true },
  53: { label: "Drizzle", day: "🌦️", night: "🌧️", precip: true },
  55: { label: "Heavy drizzle", day: "🌧️", night: "🌧️", precip: true },
  56: { label: "Freezing drizzle", day: "🌧️", night: "🌧️", precip: true },
  57: { label: "Freezing drizzle", day: "🌧️", night: "🌧️", precip: true },
  61: { label: "Light rain", day: "🌦️", night: "🌧️", precip: true },
  63: { label: "Rain", day: "🌧️", night: "🌧️", precip: true },
  65: { label: "Heavy rain", day: "🌧️", night: "🌧️", precip: true },
  66: { label: "Freezing rain", day: "🌧️", night: "🌧️", precip: true },
  67: { label: "Freezing rain", day: "🌧️", night: "🌧️", precip: true },
  71: { label: "Light snow", day: "🌨️", night: "🌨️", precip: true },
  73: { label: "Snow", day: "🌨️", night: "🌨️", precip: true },
  75: { label: "Heavy snow", day: "❄️", night: "❄️", precip: true },
  77: { label: "Snow grains", day: "🌨️", night: "🌨️", precip: true },
  80: { label: "Light showers", day: "🌦️", night: "🌧️", precip: true },
  81: { label: "Showers", day: "🌧️", night: "🌧️", precip: true },
  82: { label: "Violent showers", day: "⛈️", night: "⛈️", precip: true },
  85: { label: "Snow showers", day: "🌨️", night: "🌨️", precip: true },
  86: { label: "Snow showers", day: "❄️", night: "❄️", precip: true },
  95: { label: "Thunderstorm", day: "⛈️", night: "⛈️", precip: true },
  96: { label: "Thunderstorm, hail", day: "⛈️", night: "⛈️", precip: true },
  99: { label: "Thunderstorm, hail", day: "⛈️", night: "⛈️", precip: true },
};

export function describeWeather(code: number, isDay = true): WeatherDesc {
  const e = TABLE[code];
  if (!e) return { label: "—", glyph: "•", precip: false };
  return { label: e.label, glyph: isDay ? e.day : e.night, precip: e.precip };
}
