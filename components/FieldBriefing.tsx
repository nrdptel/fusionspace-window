"use client";

import { useEffect, useRef, useState } from "react";
import type { BoardData } from "@/lib/weather/model";
import { buildBriefing } from "@/lib/weather/briefing";
import type { UnitPrefs } from "@/lib/units";
import type { RecoveryMode } from "@/lib/prefs";

type Flash = "" | "link" | "briefing";

export default function FieldBriefing({
  board,
  units,
  windLine,
  apogee,
  descentRate,
  recoveryMode,
  mainDeploy,
  mainDescentRate,
  hourIndex,
}: {
  board: BoardData;
  units: UnitPrefs;
  windLine: number | null;
  apogee: number | null;
  descentRate: number | null;
  recoveryMode: RecoveryMode;
  mainDeploy: number | null;
  mainDescentRate: number | null;
  hourIndex: number;
}) {
  const [href, setHref] = useState("");
  const [canShare, setCanShare] = useState(false);
  const [flash, setFlash] = useState<Flash>("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read the shareable URL and share capability after mount (client-only, keeps render pure).
  useEffect(() => {
    setHref(window.location.href);
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, [board.forecast.field.lat, board.forecast.field.lon]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const briefing = buildBriefing(board, {
    units,
    hourIndex,
    windLine,
    apogee,
    descentRate,
    recoveryMode,
    mainDeploy,
    mainDescentRate,
    shareUrl: href || "https://window.fusionspace.co",
  });

  function flashFor(kind: Flash) {
    setFlash(kind);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(""), 1800);
  }

  async function copy(text: string, kind: Flash) {
    try {
      await navigator.clipboard.writeText(text);
      flashFor(kind);
    } catch {
      // Clipboard blocked (no permission / insecure context) — the preview is the fallback.
      flashFor(kind);
    }
  }

  async function share() {
    try {
      await navigator.share({ text: briefing, url: href });
    } catch {
      /* user dismissed the share sheet, or it's unavailable */
    }
  }

  return (
    <section className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Take it to the field
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">brief · link · share</span>
      </div>
      <p className="mt-1.5 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400">
        Copy the full launch briefing as plain text for your crew, or grab a link to this exact
        field, units, and fly-time.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => copy(briefing, "briefing")}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          {flash === "briefing" ? "Briefing copied ✓" : "Copy briefing"}
        </button>
        <button
          type="button"
          onClick={() => copy(href, "link")}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          {flash === "link" ? "Link copied ✓" : "Copy link"}
        </button>
        {canShare && (
          <button
            type="button"
            onClick={share}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            Share
          </button>
        )}
      </div>
      <details className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <summary className="cursor-pointer select-none text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
          Preview the text briefing
        </summary>
        <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-md border border-zinc-200 bg-white p-3 font-mono text-[11px] leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
{briefing}
        </pre>
      </details>
    </section>
  );
}
