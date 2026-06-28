/** NWS active-alerts parsing. `/alerts/active?point=lat,lon` returns a GeoJSON feature
 *  collection; this normalises it to the small shape the alert panel renders, sorted
 *  most-severe first. Pure. An empty array means "checked, nothing active" — distinct
 *  from a null returned by the network layer when NWS itself is unreachable. */

import type { WxAlert } from "./model";

interface RawAlertProps {
  event?: string;
  severity?: string;
  urgency?: string;
  headline?: string;
  description?: string;
  onset?: string | null;
  effective?: string | null;
  ends?: string | null;
  expires?: string | null;
  senderName?: string;
}

const SEVERITY_RANK: Record<string, number> = {
  Extreme: 4,
  Severe: 3,
  Moderate: 2,
  Minor: 1,
  Unknown: 0,
};

export function parseAlerts(raw: unknown): WxAlert[] {
  const features = (raw as { features?: unknown[] })?.features ?? [];
  const out: WxAlert[] = [];
  for (const f of features) {
    const ff = f as { id?: string; properties?: RawAlertProps };
    const p = ff.properties;
    if (!p || !p.event) continue;
    out.push({
      id: ff.id ?? p.event,
      event: p.event,
      severity: p.severity ?? "Unknown",
      urgency: p.urgency ?? "Unknown",
      headline: p.headline ?? p.event,
      description: p.description ?? "",
      onset: p.onset ?? p.effective ?? null,
      ends: p.ends ?? p.expires ?? null,
      senderName: p.senderName ?? "National Weather Service",
    });
  }
  out.sort((a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0));
  return out;
}

/** Tailwind tone for an alert severity — amber for most, red for the worst. */
export function severityTone(severity: string): "red" | "amber" {
  return severity === "Extreme" || severity === "Severe" ? "red" : "amber";
}
