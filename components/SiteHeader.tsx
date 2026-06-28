import FusionSpaceBadge from "./FusionSpaceBadge";
import ThemeToggle from "./ThemeToggle";
import KofiButton from "./KofiButton";

export default function SiteHeader() {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
      <div>
        <FusionSpaceBadge className="mb-1.5" />
        <h1 className="text-2xl font-semibold tracking-tight">Window</h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
          Launch weather for high-power rocketry — surface wind against the limit, winds
          aloft, ceiling, and a multi-day outlook for any US field. It shows the data and
          the limits; the go/no-go call is yours.
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <ThemeToggle />
        <KofiButton />
      </div>
    </header>
  );
}
