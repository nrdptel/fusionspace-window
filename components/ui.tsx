"use client";

import type { ReactNode } from "react";

export interface Option<T extends string> {
  value: T;
  label: string;
}

/** A small segmented toggle, used for unit / view switches. Mirrors the sibling tools. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  ariaLabel: string;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-zinc-300 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-900"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={
              "rounded-md font-medium transition " +
              pad +
              " " +
              (active
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** A collapsible "show your work" disclosure — the transparency pattern used throughout. */
export function Disclosure({
  summary,
  defaultOpen = false,
  children,
}: {
  summary: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group mt-3 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/50"
    >
      <summary className="cursor-pointer select-none font-medium text-zinc-700 dark:text-zinc-300">
        {summary}
      </summary>
      <div className="mt-3 space-y-4 text-zinc-600 dark:text-zinc-400">{children}</div>
    </details>
  );
}

/** A board section: a heading, an optional right-aligned control, and the body. */
export function Panel({
  id,
  title,
  aside,
  children,
}: {
  id: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {aside}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** The thin "source · valid time" line under each figure — the honesty habit, made literal. */
export function SourceLine({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{children}</p>;
}

/** A bordered card. */
export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={
        "rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40 " +
        className
      }
    >
      {children}
    </div>
  );
}

/** A small labeled read-out (value + caption), monospace value. */
export function Stat({
  label,
  value,
  unit,
  tone = "default",
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: "default" | "amber" | "red" | "emerald";
}) {
  const toneCls =
    tone === "red"
      ? "text-red-600 dark:text-red-400"
      : tone === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "emerald"
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-zinc-900 dark:text-zinc-100";
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className={"mt-0.5 font-mono text-2xl font-semibold tabular-nums " + toneCls}>
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-zinc-500 dark:text-zinc-400">{unit}</span>}
      </div>
    </div>
  );
}

/** A soft tinted pill (status / staleness / severity). */
export function Pill({
  tone = "zinc",
  children,
}: {
  tone?: "zinc" | "amber" | "red" | "emerald" | "sky" | "indigo";
  children: ReactNode;
}) {
  const map: Record<string, string> = {
    zinc: "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    amber:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    red: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    emerald:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    sky: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    indigo:
      "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  };
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium " +
        map[tone]
      }
    >
      {children}
    </span>
  );
}
