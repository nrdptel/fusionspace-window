import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { SITE_URL, API_BASE_URL, REPO_URL, OPEN_METEO_URL } from "@/lib/links";

export const metadata: Metadata = {
  title: "API — Window",
  description:
    "Free, read-only JSON API: current modeled surface wind at every curated US launch field, refreshed hourly. No key, no rate limit, no cost. CORS-enabled.",
  alternates: { canonical: `${SITE_URL}/api` },
};

const ENDPOINTS: { path: string; desc: string }[] = [
  { path: "/conditions.json", desc: "The feed — current surface wind at every field, with a tone against the 20 mph line." },
  { path: "/meta.json", desc: "Lightweight metadata: schema version, generation time, site and state counts." },
  { path: "/openapi.json", desc: "OpenAPI 3.1 specification for the two endpoints above." },
];

const FIELDS: { name: string; type: string; desc: string }[] = [
  { name: "name", type: "string", desc: "Field name, e.g. \"SEARS — Samson\"." },
  { name: "state", type: "string", desc: "USPS two-letter code." },
  { name: "lat / lon", type: "number", desc: "Approximate launch-area coordinates (~1 km)." },
  { name: "windMph", type: "number", desc: "Sustained surface wind (10 m), mph — rounded to a whole number." },
  { name: "gustMph", type: "number | null", desc: "Gust, mph (rounded) — null when the model omits it." },
  { name: "dirDeg", type: "number", desc: "Direction the wind blows FROM, degrees (rounded)." },
  { name: "tempF", type: "number | null", desc: "Temperature, °F (rounded)." },
  { name: "tone", type: "\"emerald\" | \"amber\" | \"red\"", desc: "Against the 20 mph line: emerald < 15, amber 15–20, red ≥ 20 mph." },
];

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.85em] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
      {children}
    </code>
  );
}

export default function ApiPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6 md:py-10">
      <SiteHeader />

      <h1 className="mt-10 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">API</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        A <strong>free, read-only JSON API</strong> for the current <strong>modeled surface wind</strong>{" "}
        at every curated US launch field — the same data behind the &ldquo;Conditions across all
        sites&rdquo; overview. <strong>No key, no rate limit, no cost.</strong> CORS-enabled
        (<Code>Access-Control-Allow-Origin: *</Code>), refreshed hourly, served as plain static files.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <section>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Base URL</h2>
          <p className="mt-2">
            <Code>{API_BASE_URL}</Code>
          </p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Endpoint</th>
                  <th scope="col" className="px-3 py-2 font-medium">Returns</th>
                </tr>
              </thead>
              <tbody>
                {ENDPOINTS.map((e) => (
                  <tr key={e.path} className="border-t border-zinc-100 dark:border-zinc-800/70">
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-indigo-700 dark:text-indigo-300">{e.path}</td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Try it</h2>
          <pre
            tabIndex={0}
            aria-label="Example curl command"
            className="mt-2 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200"
          >
{`# the calmest field right now
curl -s ${API_BASE_URL}/conditions.json \\
  | jq '.sites | sort_by(.windMph)[0]'`}
          </pre>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Response shape</h2>
          <p className="mt-2">
            <Code>conditions.json</Code> is <Code>{"{ schemaVersion, generatedAt, model, sites[] }"}</Code>.
            Each entry in <Code>sites</Code>:
          </p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Field</th>
                  <th scope="col" className="px-3 py-2 font-medium">Type</th>
                  <th scope="col" className="px-3 py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {FIELDS.map((f) => (
                  <tr key={f.name} className="border-t border-zinc-100 dark:border-zinc-800/70">
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-zinc-800 dark:text-zinc-200">{f.name}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-zinc-500 dark:text-zinc-400">{f.type}</td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{f.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            <Code>generatedAt</Code> is <Code>null</Code>, and <Code>sites</Code> may be empty, if the
            most recent refresh couldn&apos;t reach the provider. Fields with no usable wind are omitted.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Terms &amp; honesty</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              <strong>Modeled, not observed.</strong> This is model surface wind (<Code>gfs_seamless</Code>),
              not live station readings. It leans the picture; it is not authoritative — open a
              field&apos;s full board, or confirm at the field, before you fly.
            </li>
            <li>
              <strong>Best-effort &amp; approximate.</strong> Coordinates are approximate launch-area
              points (~1 km), and the feed can be up to an hour stale (or empty on a failed refresh).
            </li>
            <li>
              <strong>Attribution.</strong> Weather data by{" "}
              <a href={OPEN_METEO_URL} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-500 dark:text-indigo-400">
                Open-Meteo
              </a>{" "}
              (CC BY 4.0). The API itself is under the repo&apos;s MIT license — fork it, deploy your own.
            </li>
          </ul>
        </section>

        <p className="pt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Source and issues on{" "}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-200">
            GitHub
          </a>
          . Prefer the picker?{" "}
          <Link href="/" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-500 dark:text-indigo-400">
            Back to Window
          </Link>
          .
        </p>
      </div>

      <Footer />
    </main>
  );
}
