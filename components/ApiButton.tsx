/** Header link to the public conditions API docs — a small `</> API` chip that sits beside the
 *  theme toggle and Tip, mirroring the sibling tools (motor.fusionspace.co carries the same
 *  `</> API` button). It's an internal link to the /api docs page, styled to match KofiButton. */
import Link from "next/link";
import { API_DOCS_PATH } from "@/lib/links";

export default function ApiButton() {
  return (
    <Link
      href={API_DOCS_PATH}
      title="Free public JSON API — current wind at every launch site"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-indigo-500/50 dark:hover:text-indigo-400"
    >
      <span aria-hidden className="font-mono text-[11px] tracking-tight text-zinc-400 dark:text-zinc-500">
        &lt;/&gt;
      </span>
      API
    </Link>
  );
}
