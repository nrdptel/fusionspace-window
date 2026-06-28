"use client";

import { useRef, useState } from "react";
import { fetchGeocode } from "@/lib/weather/net";
import type { Place } from "@/lib/weather/geocode";
import type { SavedField } from "@/lib/prefs";
import { PinIcon, CrosshairIcon, SearchIcon } from "./icons";

export default function LocationBar({
  onPick,
  saved,
  onRemoveSaved,
}: {
  onPick: (lat: number, lon: number, label?: string) => void;
  saved: SavedField[];
  onRemoveSaved: (f: SavedField) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCoords, setShowCoords] = useState(false);
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
    if (!("geolocation" in navigator)) {
      setError("This browser can't share your location. Search or enter coordinates instead.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onPick(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocating(false);
        setError("Location permission was denied. Search or enter coordinates instead.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
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
            onClick={() => setShowCoords((s) => !s)}
            aria-expanded={showCoords}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Coordinates
          </button>
        </div>
      </div>

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
          {saved.map((f) => (
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
              <button
                type="button"
                onClick={() => onRemoveSaved(f)}
                aria-label={`Remove ${f.label} from saved fields`}
                className="rounded-full px-1 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
