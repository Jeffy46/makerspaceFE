import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { COLORS, prefersReducedMotion } from "./bubbleEngine";
import type { Bubble, FocusRequest } from "./bubbleEngine";

/* -------------------------------------------------------------------------- */
/*  List view (virtualized)                                                   */
/* -------------------------------------------------------------------------- */

const ROW_HEIGHT = 60;
const ROW_PITCH = ROW_HEIGHT + 8;
const OVERSCAN = 8;

export const ListView = ({
  bubbles,
  highlightedEmail,
  focusRequest,
}: {
  bubbles: Bubble[];
  highlightedEmail: string | null;
  focusRequest: FocusRequest | null;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const handledFocusRef = useRef<FocusRequest | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const [win, setWin] = useState({ top: 0, height: 800 });

  const places = useMemo(() => {
    const out: number[] = new Array(bubbles.length);
    let place = 0;
    let previous: number | null = null;
    bubbles.forEach((b, i) => {
      if (b.points !== previous) {
        place += 1;
        previous = b.points;
      }
      out[i] = place;
    });
    return out;
  }, [bubbles]);

  const measure = useCallback(() => {
    const scroller = scrollRef.current;
    const list = listRef.current;
    if (!scroller || !list) return;
    setWin({
      top: scroller.scrollTop - list.offsetTop,
      height: scroller.clientHeight,
    });
  }, []);

  useEffect(() => {
    measure();
    const scroller = scrollRef.current;
    if (!scroller) return;
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [measure]);

  useEffect(() => {
    if (!focusRequest || focusRequest.view !== "list") return;
    if (handledFocusRef.current === focusRequest) return;
    const scroller = scrollRef.current;
    const list = listRef.current;
    if (!scroller || !list) return;

    const email = focusRequest.email.toLowerCase();
    const idx = bubbles.findIndex((b) => b.email.toLowerCase() === email);
    if (idx === -1) return;
    handledFocusRef.current = focusRequest;

    const rowTop = list.offsetTop + idx * ROW_PITCH;
    const top = Math.max(
      0,
      rowTop - scroller.clientHeight / 2 + ROW_HEIGHT / 2,
    );
    const far = Math.abs(top - scroller.scrollTop) > 4000;
    scroller.scrollTo({
      top,
      behavior: far || prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [focusRequest, bubbles]);

  const start = Math.max(0, Math.floor(win.top / ROW_PITCH) - OVERSCAN);
  const end = Math.min(
    bubbles.length,
    Math.ceil((win.top + win.height) / ROW_PITCH) + OVERSCAN,
  );

  const visible: ReactNode[] = [];
  for (let i = start; i < end; i++) {
    const row = bubbles[i];
    const podium = row.rank !== null;
    const isFound = highlightedEmail?.toLowerCase() === row.email.toLowerCase();

    visible.push(
      <li
        key={row.email}
        style={{
          position: "absolute",
          top: i * ROW_PITCH,
          left: 0,
          right: 0,
          height: ROW_HEIGHT,
        }}
        className={`flex items-center gap-4 rounded-xl px-4 transition-colors ring-1 ${
          isFound
            ? "bg-white/25 ring-white shadow-lg"
            : "bg-white/5 ring-white/10"
        }`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
            podium ? "" : "bg-white/10 text-white/80"
          }`}
          style={
            podium
              ? { backgroundColor: row.color, color: COLORS.label }
              : undefined
          }
        >
          {places[i]}
        </span>
        <span className="min-w-0 flex-1 truncate text-white">{row.name}</span>
        <span className="font-semibold tabular-nums text-white">
          {row.points}
        </span>
      </li>,
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={measure}
      className="relative h-full overflow-y-auto px-4 pb-8 pt-20"
    >
      <h1 className="w-full text-center p-4 text-5xl text-white">Top Makers</h1>
      <ol
        ref={listRef}
        className="relative mx-auto max-w-5xl"
        style={{ height: bubbles.length * ROW_PITCH }}
      >
        {visible}
      </ol>
    </div>
  );
};
