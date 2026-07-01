"use client";

import { useEffect, type RefObject } from "react";

/** Keep a horizontally-scrolling timeline's selected marker in view as the fly-time changes.
 *  When the marker (given as its left/right pixel span within the scroll content) approaches or
 *  passes an edge, scroll just enough to bring it back with a little padding — so dragging the
 *  fly-time slider scrolls the chart for you. It only acts near the edges, so it never fights a
 *  manual scroll while the marker is comfortably in view, and it's a no-op when nothing overflows.
 *  Scrolling is instant (not smooth) so a continuous drag tracks tightly without animation pile-up. */
export function useScrollFollowX(
  ref: RefObject<HTMLElement | null>,
  markerLeft: number,
  markerRight: number,
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const pad = 28;
    const viewLeft = el.scrollLeft;
    const viewRight = viewLeft + el.clientWidth;
    if (markerLeft < viewLeft + pad) {
      el.scrollLeft = Math.max(0, markerLeft - pad);
    } else if (markerRight > viewRight - pad) {
      el.scrollLeft = markerRight - el.clientWidth + pad;
    }
  }, [ref, markerLeft, markerRight]);
}
