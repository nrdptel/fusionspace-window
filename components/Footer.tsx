import Link from "next/link";
import { observancesForDate } from "@/lib/observances";
import { HUB_URL, REPO_URL, OPEN_METEO_URL, NWS_URL } from "@/lib/links";
import { GitHubIcon } from "./icons";

function Dot() {
  return (
    <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">
      ·
    </span>
  );
}

export default function Footer() {
  const observances = observancesForDate();
  return (
    <footer className="mt-20 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 md:mt-28">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            <GitHubIcon className="h-4 w-4 fill-current" />
            GitHub
          </a>
          <Dot />
          <Link href="/privacy" className="hover:text-zinc-800 dark:hover:text-zinc-200">
            Privacy
          </Link>
          <Dot />
          <a
            href={OPEN_METEO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Open-Meteo
          </a>
          <Dot />
          <a
            href={NWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            NWS
          </a>
        </nav>
        <a
          href={HUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Fusion Space — free, polished tools for high-power rocketry"
          className="group inline-flex items-center gap-1.5 transition hover:opacity-80"
        >
          <span>A</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/fusion-space-wordmark.svg"
            alt="Fusion Space"
            width={1598}
            height={281}
            className="h-5 w-auto"
          />
          <span>
            project{" "}
            <span aria-hidden className="opacity-0 transition group-hover:opacity-100">
              ↗
            </span>
          </span>
        </a>
      </div>

      <p className="mt-5 max-w-3xl leading-relaxed text-zinc-500 dark:text-zinc-400">
        <strong className="font-medium text-zinc-600 dark:text-zinc-300">
          Best-effort, not authoritative — confirm conditions yourself before flying.
        </strong>{" "}
        Window is informational and gives no go/no-go verdict; the 20 mph line and every
        figure are references for your own judgment, alongside your field&apos;s rules.
        Weather data is{" "}
        <a
          href={OPEN_METEO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Open-Meteo
        </a>{" "}
        (CC&nbsp;BY&nbsp;4.0) and{" "}
        <a
          href={NWS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          NOAA / National Weather Service
        </a>
        . Personal, non-commercial project — not affiliated with any rocketry organization,
        vendor, or manufacturer. Built for the hobby rocketry community.
      </p>

      {observances.length > 0 && (
        <div className="mt-5 space-y-1">
          {observances.map((o) => (
            <p key={o.id} className="text-zinc-500 dark:text-zinc-400">
              {o.message}
              {o.href && (
                <>
                  {" "}
                  <a
                    href={o.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                  >
                    {o.hrefLabel ?? "Learn more"} →
                  </a>
                </>
              )}
            </p>
          ))}
        </div>
      )}
    </footer>
  );
}
