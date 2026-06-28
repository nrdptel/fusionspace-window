import type { SVGProps } from "react";
import type { WeatherKind } from "@/lib/weather/wmo";

// Line-style, monochrome (currentColor) weather glyphs — no emoji. WMO codes map to one of
// these kinds in lib/weather/wmo.ts.
const CLOUD = "M7 18a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.5 1.5A3.5 3.5 0 0 1 17 18Z";

export default function WeatherIcon({
  kind,
  ...props
}: { kind: WeatherKind } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {kind === "sun" && (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" />
        </>
      )}
      {kind === "moon" && <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />}
      {(kind === "partly-day" || kind === "partly-night") && (
        <>
          {kind === "partly-day" ? (
            <>
              <circle cx="8" cy="8" r="2.6" />
              <path d="M8 2.5v1.6M8 11.9v1.6M3.7 3.7l1.1 1.1M11.2 11.2l1.1 1.1M2 8h1.6M2.7 12.3l1.1-1.1" />
            </>
          ) : (
            <path d="M13 5.4A4 4 0 1 1 8.6 1a3.1 3.1 0 0 0 4.4 4.4Z" />
          )}
          <path d={CLOUD} />
        </>
      )}
      {kind === "cloud" && <path d={CLOUD} />}
      {kind === "fog" && (
        <>
          <path d="M5 9.5a4.5 4.5 0 0 1 8.6-1.8A3.5 3.5 0 0 1 15 14.5H7" opacity="0.9" />
          <path d="M4 18h16M6 21h12" />
        </>
      )}
      {kind === "rain" && (
        <>
          <path d={CLOUD} />
          <path d="M8 20.5l-.8 1.5M12 20.5l-.8 1.5M16 20.5l-.8 1.5" />
        </>
      )}
      {kind === "snow" && (
        <>
          <path d={CLOUD} />
          <path d="M8 21h.01M12 21.5h.01M16 21h.01M10 22.5h.01M14 22.5h.01" />
        </>
      )}
      {kind === "thunder" && (
        <>
          <path d={CLOUD} />
          <path d="M12 19l-2 3h3l-2 3" />
        </>
      )}
    </svg>
  );
}
