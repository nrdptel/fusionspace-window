import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { SITE_URL, REPO_URL, OPEN_METEO_URL, NWS_URL } from "@/lib/links";

const GITHUB_ISSUES = `${REPO_URL}/issues`;

const TITLE = "Privacy — Window";
const DESCRIPTION =
  "What Window collects (nothing), the only third parties it talks to (the weather providers), and how geolocation and your saved fields work.";

// Own the social card: without an openGraph/twitter block this page inherits the layout's
// homepage card, so a shared /privacy link would preview as the board and point og:url at the root.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/privacy` },
  openGraph: {
    type: "website",
    siteName: "Window",
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/privacy`,
    images: [{ url: "/og/default.png", width: 1200, height: 630, alt: "Window — HPR launch weather" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og/default.png"],
  },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6 md:py-10">
      <SiteHeader />

      <h1 className="mt-10 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Privacy
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Window is a personal, non-commercial project. It has no accounts, no analytics, and no
        tracking of any kind. It does fetch live weather, so — unlike a pure calculator — it
        does talk to a couple of outside services. This page says exactly which, and why.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">What we collect</h2>
          <p className="mt-2">
            Nothing. There is no account, no sign-up, no email, and no analytics. Window is a
            static site with no backend of its own — there is no server here to send anything to.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            The only third parties: the weather providers
          </h2>
          <p className="mt-2">
            To show a forecast, your browser fetches it directly from the weather providers for
            the field you choose:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <a href={OPEN_METEO_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100">
                Open-Meteo
              </a>{" "}
              — the forecast, hourly timeline, winds aloft, and outlook.
            </li>
            <li>
              <a href={NWS_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100">
                NOAA / National Weather Service
              </a>{" "}
              — active alerts and the nearest station&apos;s observed ceiling.
            </li>
          </ul>
          <p className="mt-2">
            Those requests go from your browser straight to the providers and carry the field&apos;s
            coordinates (that&apos;s how they know where to forecast). They&apos;re subject to those
            providers&apos; own policies. Window adds no identifiers and routes nothing through a
            server of its own.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Geolocation</h2>
          <p className="mt-2">
            If you tap &ldquo;My location,&rdquo; the browser asks your permission and hands Window
            your coordinates. They&apos;re used only to set the field locally — to round into the
            URL and to fetch that field&apos;s forecast. They are never sent anywhere except to the
            weather providers above, as the location of the forecast request.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            What lives on your device
          </h2>
          <p className="mt-2">A few things are saved locally so the tool is pleasant to use, and they never leave your browser:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Your theme, units, and personal wind line</strong> — small local-storage values.</li>
            <li><strong>Saved fields</strong> — the launch fields you star, kept locally.</li>
            <li>
              <strong>Last-known weather</strong> — the most recent forecast per field, cached so the
              board still shows something when you&apos;re offline (with an &ldquo;as of&rdquo; flag).
            </li>
          </ul>
          <p className="mt-2">Clearing your browser data removes all of it.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Hosting</h2>
          <p className="mt-2">
            The site itself is served as static files by{" "}
            <a href="https://pages.cloudflare.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100">
              Cloudflare Pages
            </a>
            . Like any web host, Cloudflare may keep standard, short-lived request logs (such as IP
            addresses) for delivering and protecting the site. That&apos;s infrastructure-level and
            applies to fetching the page — it never includes a forecast, which your browser fetches
            directly from the providers.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">What we don&apos;t do</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>No tracking pixels, advertising, or third-party analytics.</li>
            <li>No cookies beyond the local preferences described above.</li>
            <li>No selling, renting, or sharing of anything — there is nothing to share.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Contact</h2>
          <p className="mt-2">
            Questions? Open a{" "}
            <a href={GITHUB_ISSUES} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100">
              GitHub issue
            </a>
            .
          </p>
        </section>
      </div>

      <p className="mt-10 border-t border-zinc-200 pt-5 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <Link href="/" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
          ← Back to Window
        </Link>
      </p>

      <Footer />
    </main>
  );
}
