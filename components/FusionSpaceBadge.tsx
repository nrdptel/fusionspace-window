import { HUB_URL } from "@/lib/links";

/** Parent-brand eyebrow. Window is one of several FusionSpace tools; this small
 * linked lockup sits above the product name to place it under the FusionSpace
 * brand and let people discover the other tools at fusionspace.co. Uses the Rev C
 * horizontal lockup at 24 px tall, the brand's minimum mark height (142×24, as
 * fusionspace.co's header). Below 32 px the brand calls for the one-color Void
 * lockup on light backgrounds (the thin gradient details go faint), so light shows
 * Void and dark shows the gradient. Mirrors the sibling tools' badge. */
export default function FusionSpaceBadge({ className = "" }: { className?: string }) {
  return (
    <a
      href={HUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="FusionSpace — free, polished tools for high-power rocketry"
      className={`group inline-flex w-fit items-center gap-1 transition hover:opacity-80 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/fusion-space-horizontal-void.svg"
        alt="FusionSpace"
        width={142}
        height={24}
        className="h-6 w-auto dark:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/fusion-space-wordmark.svg"
        alt="FusionSpace"
        width={142}
        height={24}
        className="hidden h-6 w-auto dark:block"
      />
      <span
        aria-hidden
        className="text-xs text-zinc-400 opacity-0 transition group-hover:opacity-100 dark:text-zinc-500"
      >
        ↗
      </span>
    </a>
  );
}
