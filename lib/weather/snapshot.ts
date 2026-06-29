/** A fly-time snapshot — the decision figures at one chosen hour, so a flyer can scrub the
 *  hourly timeline to the time they actually plan to launch and see surface wind against the
 *  limit, the density altitude, and the storm potential for that hour (the winds-aloft profile
 *  already follows the same selection). It's a thin, pure composition of the figures the board
 *  derives elsewhere — density altitude and the CAPE classifier — so it stays tested and
 *  honest, and it carries no verdict. */

import type { HourPoint } from "./model";
import { densityAltitudeFt } from "./density";
import { classifyCape, type Instability } from "./instability";
import { gustiness, type Gustiness } from "./gust";

export interface FlySnapshot {
  time: string;
  windMph: number;
  gustMph: number;
  dirDeg: number;
  tempF: number;
  /** Density altitude at this hour (ft), or NaN when an input is missing. */
  densityAltitudeFt: number;
  capeJkg: number;
  instability: Instability;
  /** Wind steadiness (gust-vs-sustained) at this hour. */
  gustiness: Gustiness;
}

export function hourSnapshot(h: HourPoint): FlySnapshot {
  return {
    time: h.time,
    windMph: h.windMph,
    gustMph: h.gustMph,
    dirDeg: h.dirDeg,
    tempF: h.tempF,
    densityAltitudeFt: densityAltitudeFt({
      tempF: h.tempF,
      rhPct: h.humidityPct,
      pressureHpa: h.surfacePressureHpa,
    }),
    capeJkg: h.capeJkg,
    instability: classifyCape(h.capeJkg),
    gustiness: gustiness(h.windMph, h.gustMph),
  };
}
