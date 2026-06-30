import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// public/_headers is the only place Cloudflare Pages learns our response-header
// policy (static export can't emit next.config headers()). These assertions lock
// the two things that matter and are easy to break by reformatting: the baseline
// security headers, and the immutable long-cache scoped to content-hashed assets.

const HEADERS = readFileSync(path.resolve(process.cwd(), "public/_headers"), "utf8");

/** Returns the directive lines (indented, "Key: value") that follow a path rule. */
function blockFor(rule: string): string[] {
  const lines = HEADERS.split("\n");
  const start = lines.findIndex((l) => l.trim() === rule);
  if (start === -1) return [];
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s+\S/.test(l)) out.push(l.trim());
    else if (l.trim() === "") break; // blank line ends the block
    else break; // a new path rule ends the block
  }
  return out;
}

describe("public/_headers", () => {
  it("applies the baseline security headers to every path", () => {
    const all = blockFor("/*");
    expect(all).toContain("X-Frame-Options: DENY");
    expect(all).toContain("X-Content-Type-Options: nosniff");
    expect(all).toContain("Referrer-Policy: strict-origin-when-cross-origin");
  });

  it("caches the content-hashed build assets immutably for a year", () => {
    const cache = blockFor("/_next/static/*").find((l) => l.startsWith("Cache-Control:"));
    expect(cache).toBeDefined();
    expect(cache).toMatch(/max-age=31536000/);
    expect(cache).toMatch(/\bimmutable\b/);
  });

  it("never freezes mutable content — the long cache is scoped to /_next/static only", () => {
    // The HTML at "/" references the hashed asset URLs; if it were cached immutably
    // a deploy would never reach returning visitors. The only year-long, immutable
    // Cache-Control in the file must be the one under /_next/static/*.
    const immutableRules = HEADERS.split(/\n(?=\S)/).filter(
      (block) => /max-age=31536000/.test(block) && /\bimmutable\b/.test(block),
    );
    expect(immutableRules).toHaveLength(1);
    expect(immutableRules[0]).toMatch(/^\/_next\/static\/\*/);
  });
});
