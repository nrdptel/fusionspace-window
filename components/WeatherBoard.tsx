"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BoardData } from "@/lib/weather/model";
import { loadBoard } from "@/lib/weather/net";
import { readCache, writeCache } from "@/lib/cache";
import { decodeState, encodeState, type UrlState } from "@/lib/state";
import { isStale, relativeAge, clock } from "@/lib/format";
import {
  addSaved,
  readSaved,
  readUnits,
  readWindLine,
  removeSaved,
  writeSaved,
  writeUnits,
  writeWindLine,
  type SavedField,
} from "@/lib/prefs";
import { DEFAULT_UNITS, type UnitPrefs } from "@/lib/units";
import LocationBar from "./LocationBar";
import UnitsControl from "./UnitsControl";
import Alerts from "./Alerts";
import Now from "./Now";
import DensityAltitude from "./DensityAltitude";
import StormPotential from "./StormPotential";
import CalmWindows from "./CalmWindows";
import FieldBriefing from "./FieldBriefing";
import HourlyTimeline from "./HourlyTimeline";
import WindsAloft from "./WindsAloft";
import SkyPanel from "./SkyPanel";
import Outlook from "./Outlook";
import { Panel, Pill } from "./ui";
import { StarIcon } from "./icons";

/** The hourly index for the field's current hour. */
function currentHourIndex(data: BoardData): number {
  const cur = data.forecast.current.time;
  if (!cur) return 0;
  const hourIso = cur.slice(0, 13) + ":00";
  const hours = data.forecast.hourly;
  let idx = hours.findIndex((h) => h.time === hourIso);
  if (idx < 0) idx = hours.findIndex((h) => h.time >= hourIso);
  return idx < 0 ? 0 : idx;
}

export default function WeatherBoard() {
  const [mounted, setMounted] = useState(false);
  const [field, setField] = useState<UrlState | null>(null);
  const [units, setUnits] = useState<UnitPrefs>(DEFAULT_UNITS);
  const [windLine, setWindLine] = useState<number | null>(null);
  const [saved, setSaved] = useState<SavedField[]>([]);

  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedHour, setSelectedHour] = useState(0);
  const [now, setNow] = useState(0);
  const [offline, setOffline] = useState(false);
  const reqRef = useRef(0);

  // A ticking clock (read in render to keep "as of …" labels current) and the live
  // online/offline flag — both kept in state so render stays pure.
  useEffect(() => {
    setNow(Date.now());
    setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    const t = setInterval(() => setNow(Date.now()), 30_000);
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      clearInterval(t);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  // Read URL + prefs once on mount, and follow back/forward navigation.
  useEffect(() => {
    setMounted(true);
    setField(decodeState(window.location.search));
    setUnits(readUnits());
    setWindLine(readWindLine());
    setSaved(readSaved());
    const onPop = () => setField(decodeState(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const load = useCallback(async (f: UrlState) => {
    if (f.lat == null || f.lon == null) return;
    const id = ++reqRef.current;
    const cached = readCache(f.lat, f.lon);
    if (cached) {
      setData(cached);
      setStale(isStale(cached.fetchedAt, Date.now()));
      setError(null);
    }
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    const fresh = cached && !isStale(cached.fetchedAt, Date.now());

    if (offline) {
      if (cached) setStale(true);
      else setError("offline");
      return;
    }
    if (fresh) return; // cache is within the freshness window — no refetch

    setLoading(true);
    try {
      const board = await loadBoard(f.lat, f.lon, f.label);
      if (id !== reqRef.current) return;
      writeCache(f.lat, f.lon, board);
      setData(board);
      setStale(false);
      setError(null);
    } catch {
      if (id !== reqRef.current) return;
      // Keep last-known data if we have it; only surface a hard error when we don't.
      if (cached) setStale(true);
      else setError("fetch");
    } finally {
      if (id === reqRef.current) setLoading(false);
    }
  }, []);

  // (Re)load whenever the selected field changes.
  useEffect(() => {
    if (!mounted) return;
    if (!field || field.lat == null || field.lon == null) {
      setData(null);
      setError(null);
      return;
    }
    void load(field);
  }, [mounted, field, load]);

  // When fresh data lands, point the selection at the current hour.
  useEffect(() => {
    if (data) setSelectedHour(currentHourIndex(data));
  }, [data?.forecast.field.lat, data?.forecast.field.lon, data?.forecast.current.time]); // eslint-disable-line react-hooks/exhaustive-deps

  // Retry when connectivity returns.
  useEffect(() => {
    const onOnline = () => {
      if (field && (stale || error)) void load(field);
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [field, stale, error, load]);

  const pick = useCallback((lat: number, lon: number, label?: string) => {
    const next: UrlState = { lat, lon, label };
    const qs = encodeState(next);
    window.history.pushState(null, "", qs ? `?${qs}` : window.location.pathname);
    setField(next);
  }, []);

  const updateUnits = (u: UnitPrefs) => {
    setUnits(u);
    writeUnits(u);
  };
  const updateWindLine = (v: number | null) => {
    setWindLine(v);
    writeWindLine(v);
  };
  const toggleSave = () => {
    if (!data) return;
    const f = data.forecast.field;
    const sf: SavedField = { lat: f.lat, lon: f.lon, label: f.label ?? `${f.lat.toFixed(2)}, ${f.lon.toFixed(2)}` };
    const exists = saved.some((s) => s.lat.toFixed(3) === f.lat.toFixed(3) && s.lon.toFixed(3) === f.lon.toFixed(3));
    const next = exists ? removeSaved(saved, sf) : addSaved(saved, sf);
    setSaved(next);
    writeSaved(next);
  };
  const removeSavedField = (f: SavedField) => {
    const next = removeSaved(saved, f);
    setSaved(next);
    writeSaved(next);
  };

  // Render a stable shell on the server / before mount.
  if (!mounted) {
    return <div className="mt-8 h-32 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40" />;
  }

  const f = data?.forecast.field;
  const todayIso = data?.forecast.current.time ?? "";
  const isSaved = f
    ? saved.some((s) => s.lat.toFixed(3) === f.lat.toFixed(3) && s.lon.toFixed(3) === f.lon.toFixed(3))
    : false;

  return (
    <div id="location" className="scroll-mt-4">
      <LocationBar onPick={pick} saved={saved} onRemoveSaved={removeSavedField} />

      {!field?.lat && (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/30">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Pick a launch field above — search a place, use your location, or enter
            coordinates. The weather loads live, and the field rides in the URL so the view
            is a shareable link.
          </p>
          <button
            type="button"
            onClick={() => pick(34.45, -116.95, "Lucerne Valley, CA")}
            className="mt-3 text-sm font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-500 dark:text-indigo-400"
          >
            Try an example — Lucerne Valley, CA
          </button>
        </div>
      )}

      {field?.lat != null && error === "fetch" && !data && (
        <Notice tone="red">
          Open-Meteo couldn&apos;t be reached, and there&apos;s no saved data for this field
          yet. It&apos;s the one source Window can&apos;t do without — try again in a moment.
          <RetryButton onClick={() => field && load(field)} />
        </Notice>
      )}
      {field?.lat != null && error === "offline" && !data && (
        <Notice tone="amber">
          You&apos;re offline and this field hasn&apos;t been loaded before, so there&apos;s
          no last-known data to show. Reconnect to load it.
        </Notice>
      )}

      {loading && !data && (
        <div className="mt-8 space-y-3">
          <div className="h-40 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40" />
          <div className="h-32 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40" />
        </div>
      )}

      {data && f && (
        <>
          {/* Field header */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {f.label ?? `${f.lat.toFixed(3)}, ${f.lon.toFixed(3)}`}
              </h2>
              <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                {f.lat.toFixed(3)}, {f.lon.toFixed(3)} · ground {Math.round(f.elevationFt).toLocaleString("en-US")} ft · {f.timezone}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {loading && <Pill tone="sky">Updating…</Pill>}
              <button
                type="button"
                onClick={toggleSave}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <StarIcon filled={isSaved} className={`h-3.5 w-3.5 ${isSaved ? "text-amber-500" : ""}`} />
                {isSaved ? "Saved" : "Save field"}
              </button>
            </div>
          </div>

          {stale && (
            <Notice tone="amber">
              Showing last-known data from {clock(data.forecast.current.time)} ·{" "}
              {relativeAge(data.fetchedAt, now || data.fetchedAt)}. {offline ? "You're offline." : "The latest fetch didn't go through."}
              <RetryButton onClick={() => field && load(field)} />
            </Notice>
          )}

          <FieldBriefing board={data} units={units} windLine={windLine} hourIndex={currentHourIndex(data)} />

          {/* Units / personal line */}
          <div className="mt-4">
            <UnitsControl units={units} onUnits={updateUnits} windLine={windLine} onWindLine={updateWindLine} />
          </div>

          {data.alerts && data.alerts.length > 0 && <Alerts alerts={data.alerts} />}

          <Panel id="now" title="Right now">
            <Now current={data.forecast.current} field={f} units={units} windLine={windLine} model={data.forecast.model} />
            <DensityAltitude current={data.forecast.current} field={f} units={units} model={data.forecast.model} />
          </Panel>

          <Panel id="storms" title="Storm potential">
            <StormPotential
              current={data.forecast.current}
              hourly={data.forecast.hourly}
              fromIndex={currentHourIndex(data)}
              todayIso={todayIso}
              model={data.forecast.model}
            />
          </Panel>

          <Panel id="hourly" title="Today & tomorrow">
            <CalmWindows
              hourly={data.forecast.hourly}
              fromIndex={currentHourIndex(data)}
              selectedIndex={selectedHour}
              onSelect={setSelectedHour}
              units={units}
              windLine={windLine}
              todayIso={todayIso}
            />
            <HourlyTimeline
              hourly={data.forecast.hourly}
              startIndex={currentHourIndex(data)}
              selectedIndex={selectedHour}
              onSelect={setSelectedHour}
              units={units}
              windLine={windLine}
              todayIso={todayIso}
              model={data.forecast.model}
            />
          </Panel>

          <Panel id="aloft" title="Winds aloft">
            <WindsAloft
              profile={data.forecast.aloftHourly[selectedHour] ?? data.forecast.aloftHourly[currentHourIndex(data)] ?? { time: todayIso, levels: [] }}
              surfaceWindMph={data.forecast.hourly[selectedHour]?.windMph ?? data.forecast.current.windMph}
              surfaceDirDeg={data.forecast.hourly[selectedHour]?.dirDeg ?? data.forecast.current.dirDeg}
              field={f}
              units={units}
              model={data.forecast.model}
            />
          </Panel>

          <Panel id="sky" title="Sky & ceiling">
            <SkyPanel sky={data.sky} daily={data.forecast.daily} units={units} todayIso={todayIso} now={now || data.fetchedAt} />
          </Panel>

          <Panel id="outlook" title="The next several days">
            <Outlook daily={data.forecast.daily} units={units} todayIso={todayIso} model={data.forecast.model} />
          </Panel>
        </>
      )}
    </div>
  );
}

function Notice({ tone, children }: { tone: "amber" | "red"; children: React.ReactNode }) {
  const cls = tone === "red" ? "border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200" : "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200";
  return (
    <div role="status" className={`mt-6 flex flex-wrap items-center gap-2 rounded-xl border p-4 text-sm ${cls}`}>
      {children}
    </div>
  );
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-1 rounded-md border border-current/30 px-2 py-0.5 text-xs font-medium underline-offset-2 hover:underline"
    >
      Retry
    </button>
  );
}
