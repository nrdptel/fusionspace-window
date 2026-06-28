"use client";

import type { WxAlert } from "@/lib/weather/model";
import { severityTone } from "@/lib/weather/alerts";
import { AlertTriangleIcon } from "./icons";

export default function Alerts({ alerts }: { alerts: WxAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <section id="alerts" className="mt-8 scroll-mt-4 space-y-3">
      {alerts.map((a) => {
        const tone = severityTone(a.severity);
        const cls =
          tone === "red"
            ? "border-red-500/40 bg-red-500/10"
            : "border-amber-500/40 bg-amber-500/10";
        const text = tone === "red" ? "text-red-800 dark:text-red-200" : "text-amber-900 dark:text-amber-200";
        return (
          <div key={a.id} className={`rounded-xl border p-4 ${cls}`}>
            <div className="flex items-start gap-3">
              <AlertTriangleIcon className={`mt-0.5 h-4 w-4 shrink-0 ${text}`} />
              <div className="min-w-0">
                <h3 className={`font-semibold ${text}`}>
                  {a.event}
                  <span className="ml-2 text-xs font-normal">{a.severity}</span>
                </h3>
                <p className={`mt-1 text-sm ${text}`}>{a.headline}</p>
                {a.description && (
                  <details className="mt-2">
                    <summary className={`cursor-pointer select-none text-xs font-medium ${text} opacity-80`}>
                      Details
                    </summary>
                    <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                      {a.description}
                    </p>
                  </details>
                )}
                <p className="mt-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                  {a.senderName} · National Weather Service
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
