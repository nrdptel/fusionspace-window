"use client";

import { useEffect, useRef, useState } from "react";
import { fetchGeocode, fetchWindPeek } from "@/lib/weather/net";
import type { Place } from "@/lib/weather/geocode";
import type { WindPeek } from "@/lib/weather/peek";
import type { SavedField } from "@/lib/prefs";
import { LAUNCH_SITES } from "@/lib/launchSites";
import {
  degToCompass,
  fmtWind,
  resolveUnits,
  WIND_LABEL,
  type UnitPrefs,
} from "@/lib/units";
import { windTone, windToneTextClass } from "@/lib/weather/limits";
import { PinIcon, CrosshairIcon, CloseIcon, SearchIcon } from "./icons";

const PEEK_TTL_MS = 10 * 60 * 1000;
// Module-level so the glance survives remounts and back/forward without refetching.
const peekCache = new Map<string, { peek: WindPeek | null; at: number }>();
const fieldKey = (f: { lat: number; lon: number }) => `${f.lat.toFixed(3)},${f.lon.toFixed(3)}`;

export default function LocationBar({
  onPick,
  saved,
  onRemoveSaved,
  units,
}: {
  onPick: (lat: number, lon: number, label?: string) => void;
  saved: SavedField[];
  onRemoveSaved: (f: SavedField) => void;
  units: UnitPrefs;
}) {
  const u = resolveUnits(units);
  const [peeks, setPeeks] = useState<Record<string, WindPeek | null>>({});

  // Best-effort current wind for each saved field, cached, so a multi-site club sees which is
  // flyable without opening each one. Failures are silent; the picker never waits on it.
  useEffect(() => {
    let cancelled = false;
    saved.forEach((f) => {
      const key = fieldKey(f);
      const cached = peekCache.get(key);
      if (cached && Date.now() - cached.at < PEEK_TTL_MS) {
        setPeeks((p) => (key in p ? p : { ...p, [key]: cached.peek }));
        return;
      }
      fetchWindPeek(f.lat, f.lon).then((peek) => {
        peekCache.set(key, { peek, at: Date.now() });
        if (!cancelled) setPeeks((p) => ({ ...p, [key]: peek }));
      });
    });
    return () => {
      cancelled = true;
    };
  }, [saved]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCoords, setShowCoords] = useState(false);
  const [showSites, setShowSites] = useState(false);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [locating, setLocating] = useState(false);
  const reqId = useRef(0);

  async function runSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    const id = ++reqId.current;
    setBusy(true);
    setError(null);
    setResults(null);
    try {
      const places = await fetchGeocode(q);
      if (id !== reqId.current) return;
      setResults(places);
      if (places.length === 0) setError("No matching places found.");
    } catch {
      if (id !== reqId.current) return;
      setError("Couldn't reach the place search. Try coordinates instead.");
    } finally {
      if (id === reqId.current) setBusy(false);
    }
  }

  function pickPlace(p: Place) {
    setResults(null);
    setQuery("");
    onPick(p.lat, p.lon, p.label);
  }

  function goCoords() {
    const la = Number.parseFloat(lat);
    const lo = Number.parseFloat(lon);
    if (!Number.isFinite(la) || la < -90 || la > 90 || !Number.isFinite(lo) || lo < -180 || lo > 180) {
      setError("Enter a valid latitude (−90…90) and longitude (−180…180).");
      return;
    }
    setError(null);
    onPick(la, lo);
  }

  function useMyLocation() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setError("This browser can't share your location. Search or enter coordinates instead.");
      return;
    }
    // Geolocation only works over a secure (HTTPS) connection — say so rather than appear to hang.
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setError("Location needs a secure (HTTPS) connection. Search or enter coordinates instead.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onPick(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setLocating(false);
        // Tell the cases apart — a timeout or an unavailable fix was being mislabelled as
        // "permission denied", which sends people (especially on iPhone) to the wrong setting.
        if (err.code === err.PERMISSION_DENIED) {
          setError(
            "Location is blocked. Allow it when prompted — on iPhone, also check Settings → Privacy & Security → Location Services (on, and allowed for Safari). Or search / enter coordinates.",
          );
        } else if (err.code === err.TIMEOUT) {
          setError("Locating took too long. Try again, or search / enter coordinates.");
        } else {
          setError("Couldn't get a location fix. Try again, or search / enter coordinates.");
        }
      },
      // A longer timeout than the old 10 s — an iPhone's first (cold) fix can be slow indoors.
      { enableHighAccuracy: false, timeout: 20_000, maximumAge: 600_000 },
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch();
            }}
            className="flex items-center rounded-lg border border-zinc-300 bg-white transition focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <span className="pl-3 text-zinc-400">
              <SearchIcon className="h-4 w-4" />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a place — town, field, landmark"
              aria-label="Search for a launch field by place name"
              className="w-full bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
            />
            <button
              type="submit"
              disabled={busy || query.trim().length < 2}
              className="shrink-0 rounded-md px-3 py-1 text-sm font-medium text-indigo-600 transition hover:text-indigo-500 disabled:opacity-40 dark:text-indigo-400"
            >
              {busy ? "Searching…" : "Search"}
            </button>
          </form>

          {results && results.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              {results.map((p, i) => (
                <li key={`${p.lat},${p.lon},${i}`}>
                  <button
                    type="button"
                    onClick={() => pickPlace(p)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <PinIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                    <span className="text-zinc-800 dark:text-zinc-200">{p.label}</span>
                    <span className="ml-auto font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      {p.lat.toFixed(2)}, {p.lon.toFixed(2)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <CrosshairIcon className="h-4 w-4" />
            {locating ? "Locating…" : "My location"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowSites((s) => !s);
              setShowCoords(false);
            }}
            aria-expanded={showSites}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Sites
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCoords((s) => !s);
              setShowSites(false);
            }}
            aria-expanded={showCoords}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Coordinates
          </button>
        </div>
      </div>

      {showSites && (
        <div className="mt-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Popular launch sites — one-tap starting points. Coordinates are{" "}
            <strong className="font-medium">approximate</strong>; fine-tune with search or
            coordinates for your exact pad.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {LAUNCH_SITES.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => {
                  setShowSites(false);
                  onPick(s.lat, s.lon, s.name);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-indigo-500/50 dark:hover:text-indigo-400"
              >
                <PinIcon className="h-3 w-3 shrink-0 text-zinc-400" />
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {showCoords && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            goCoords();
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <label className="text-xs text-zinc-500 dark:text-zinc-400">
            Latitude
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              inputMode="decimal"
              placeholder="34.45"
              className="mt-1 block w-32 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 font-mono text-sm tabular-nums outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="text-xs text-zinc-500 dark:text-zinc-400">
            Longitude
            <input
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              inputMode="decimal"
              placeholder="-116.95"
              className="mt-1 block w-32 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 font-mono text-sm tabular-nums outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Go
          </button>
        </form>
      )}

      {error && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400" role="status">
          {error}
        </p>
      )}

      {saved.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Saved:</span>
          {saved.map((f) => {
            const peek = peeks[fieldKey(f)];
            return (
              <span
                key={`${f.lat},${f.lon}`}
                className="group inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-50 py-0.5 pl-2.5 pr-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              >
                <button
                  type="button"
                  onClick={() => onPick(f.lat, f.lon, f.label)}
                  className="font-medium text-zinc-700 hover:text-indigo-600 dark:text-zinc-200 dark:hover:text-indigo-400"
                >
                  {f.label}
                </button>
                {peek && (
                  <span
                    className={"font-mono tabular-nums " + windToneTextClass(windTone(peek.windMph))}
                    title={`Current wind ${fmtWind(peek.windMph, u.wind)} ${WIND_LABEL[u.wind]} from ${degToCompass(peek.dirDeg)}${Number.isFinite(peek.gustMph) ? `, gust ${fmtWind(peek.gustMph, u.wind)}` : ""}`}
                  >
                    {fmtWind(peek.windMph, u.wind)} {degToCompass(peek.dirDeg)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveSaved(f)}
                  aria-label={`Remove ${f.label} from saved fields`}
                  className="rounded-full p-1 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                >
                  <CloseIcon className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
