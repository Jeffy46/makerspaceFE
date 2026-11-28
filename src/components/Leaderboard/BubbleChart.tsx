import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

import {
  COLORS,
  HIGHLIGHT,
  clamp,
  prefersReducedMotion,
  traceOrganicBubble,
  useBubblePhysics,
} from "./bubbleEngine";
import type { Bubble, FocusRequest } from "./bubbleEngine";
import {
  BUTTON_ZOOM,
  FOCUS_SCREEN_RADIUS,
  FOCUS_ZOOM_LEVEL,
  WHEEL_ZOOM_SPEED,
  useCamera,
} from "./useCamera";

/* -------------------------------------------------------------------------- */
/*  Bubble chart (canvas)                                                     */
/* -------------------------------------------------------------------------- */

const MIN_LABEL_PX = 11; // cull tiny unreadable labels early for fast canvas draws
const FONT_FAMILY = "ui-sans-serif, system-ui, sans-serif";

// Ripple on the highlighted bubble
const RIPPLE_PERIOD_MS = 1800;
const RIPPLE_COUNT = 2; // rings in flight at once
const RIPPLE_MIN_REACH_PX = 40; // how far a ripple spreads on screen, at least

interface BubbleChartProps {
  bubbles: Bubble[];
  highlightedEmail: string | null;
  focusRequest: FocusRequest | null;
  onSelectBubble?: (email: string) => void;
  onClearHighlight?: () => void;
}

type Hover = { i: number; x: number; y: number } | null;

type ControlButtonProps = {
  label: string;
  onClick: () => void;
  small?: boolean;
  children: ReactNode;
};

const ControlButton = ({
  label,
  onClick,
  small = false,
  children,
}: ControlButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`h-11 w-11 text-white transition-colors hover:bg-white/15 active:bg-white/25 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white [&:not(:first-child)]:border-t [&:not(:first-child)]:border-white/15 ${
      small ? "text-sm font-medium" : "text-xl"
    }`}
  >
    {children}
  </button>
);

export const BubbleChart = ({
  bubbles,
  highlightedEmail,
  focusRequest,
  onSelectBubble,
  onClearHighlight,
}: BubbleChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const hoverIdxRef = useRef(-1);
  const highlightIdxRef = useRef(-1);
  const modeRef = useRef<"none" | "pan" | "drag">("none");
  const panStartRef = useRef({ x: 0, y: 0 });
  const panTrackRef = useRef({ x: 0, y: 0, t: 0, vx: 0, vy: 0 });
  const handledFocusRef = useRef<FocusRequest | null>(null);

  const [grabbing, setGrabbing] = useState(false);
  const [hover, setHover] = useState<Hover>(null);

  /* ---- draw scheduling: any number of requests per frame => one draw ---- */
  const rafRef = useRef(0);
  const drawFnRef = useRef<() => void>(() => {});
  const requestDraw = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      drawFnRef.current();
    });
  }, []);
  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    },
    [],
  );

  const {
    viewRef,
    zoomAt,
    zoomTo,
    fit,
    setViewImmediate,
    throwPan,
    cancelAnim,
  } = useCamera(bubbles, containerRef, requestDraw);

  const { startDrag, moveDrag, endDrag } = useBubblePhysics(
    bubbles,
    requestDraw,
  );

  const indexByEmail = useMemo(() => {
    const map = new Map<string, number>();
    bubbles.forEach((b, i) => map.set(b.email.toLowerCase(), i));
    return map;
  }, [bubbles]);

  /* ---- sizing ---- */
  useEffect(() => {
    const el = containerRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;

    const resize = () => {
      const { width, height } = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      sizeRef.current = { w: width, h: height, dpr };
      requestDraw();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [requestDraw]);

  /* ---- drawing: only bubbles on screen are touched ---- */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { w, h, dpr } = sizeRef.current;
    const { x, y, k } = viewRef.current;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(
      dpr * k,
      0,
      0,
      dpr * k,
      dpr * (w / 2 + x),
      dpr * (h / 2 + y),
    );

    const left = (-w / 2 - x) / k;
    const right = (w / 2 - x) / k;
    const top = (-h / 2 - y) / k;
    const bottom = (h / 2 - y) / k;
    const minVisibleR = 0.5 / k;

    const labelled: number[] = [];
    let lastColor = "";

    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      if (b.r < minVisibleR) continue;
      if (b.x + b.r < left || b.x - b.r > right) continue;
      if (b.y + b.r < top || b.y - b.r > bottom) continue;

      if (b.color !== lastColor) {
        ctx.fillStyle = b.color;
        lastColor = b.color;
      }
      ctx.beginPath();
      traceOrganicBubble(ctx, b.x, b.y, b.r, b.seed, k);
      ctx.fill();

      if (b.fontSize * k >= MIN_LABEL_PX) labelled.push(i);
    }

    // Batch text draws by font size to minimize expensive ctx.font re-parses
    if (labelled.length > 0) {
      labelled.sort((a, b) => bubbles[b].fontSize - bubbles[a].fontSize);
      ctx.fillStyle = COLORS.label;
      ctx.textAlign = "center";

      let lastFontSize = -1;
      for (const i of labelled) {
        const b = bubbles[i];
        if (b.fontSize !== lastFontSize) {
          ctx.font = `600 ${b.fontSize}px ${FONT_FAMILY}`;
          lastFontSize = b.fontSize;
        }
        ctx.fillText(b.label, b.x, b.y - 0.1 * b.fontSize);
      }

      lastFontSize = -1;
      for (const i of labelled) {
        const b = bubbles[i];
        if (b.fontSize !== lastFontSize) {
          ctx.font = `400 ${b.fontSize}px ${FONT_FAMILY}`;
          lastFontSize = b.fontSize;
        }
        ctx.fillText(b.pointsLabel, b.x, b.y + 1.1 * b.fontSize);
      }
    }

    const hoverIdx = hoverIdxRef.current;
    if (hoverIdx >= 0 && hoverIdx !== highlightIdxRef.current) {
      const b = bubbles[hoverIdx];
      ctx.lineWidth = 2 / k;
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      traceOrganicBubble(ctx, b.x, b.y, b.r, b.seed, k);
      ctx.stroke();
    }

    const found = highlightIdxRef.current;
    if (found >= 0) {
      const b = bubbles[found];
      const style = HIGHLIGHT[b.rank === null ? 3 : b.rank - 1];
      const haloR = Math.max(b.r + 2 / k, 10 / k);

      if (!prefersReducedMotion()) {
        const reach = Math.max(b.r * 1.2, RIPPLE_MIN_REACH_PX / k);
        const now = performance.now();
        ctx.lineWidth = 3 / k;
        for (let n = 0; n < RIPPLE_COUNT; n++) {
          const phase = (now / RIPPLE_PERIOD_MS + n / RIPPLE_COUNT) % 1;
          const alpha = Math.pow(1 - phase, 1.5) * 0.8;
          ctx.strokeStyle = `rgba(${style.rgb},${alpha.toFixed(3)})`;
          ctx.beginPath();
          traceOrganicBubble(ctx, b.x, b.y, haloR + phase * reach, b.seed, k);
          ctx.stroke();
        }
      }

      // Fast multi-ring glow (avoids expensive CPU/GPU ctx.shadowBlur)
      ctx.lineWidth = 10 / k;
      ctx.strokeStyle = style.glow;
      ctx.beginPath();
      traceOrganicBubble(ctx, b.x, b.y, haloR, b.seed, k);
      ctx.stroke();

      ctx.lineWidth = 3.5 / k;
      ctx.strokeStyle = style.stroke;
      ctx.beginPath();
      traceOrganicBubble(ctx, b.x, b.y, haloR, b.seed, k);
      ctx.stroke();
    }
  }, [bubbles, viewRef]);

  useEffect(() => {
    drawFnRef.current = draw;
    requestDraw();
  }, [draw, requestDraw]);

  useEffect(() => {
    highlightIdxRef.current = highlightedEmail
      ? (indexByEmail.get(highlightedEmail.toLowerCase()) ?? -1)
      : -1;
    requestDraw();
  }, [highlightedEmail, indexByEmail, requestDraw]);

  /* ---- keep redrawing so the ripple animates, only while highlighted ---- */
  useEffect(() => {
    if (!highlightedEmail || prefersReducedMotion()) return;
    let raf = 0;
    const tick = () => {
      requestDraw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [highlightedEmail, requestDraw]);

  /* ---- "find person" requests from the search bar ---- */
  useEffect(() => {
    if (!focusRequest || focusRequest.view !== "bubbles") return;
    if (handledFocusRef.current === focusRequest) return;
    const idx = indexByEmail.get(focusRequest.email.toLowerCase());
    if (idx === undefined) return;
    handledFocusRef.current = focusRequest;
    const b = bubbles[idx];
    zoomTo(b.x, b.y, Math.max(FOCUS_ZOOM_LEVEL, FOCUS_SCREEN_RADIUS / b.r));
  }, [focusRequest, bubbles, indexByEmail, zoomTo]);

  /* ---- continuous wheel / trackpad zoom toward cursor ---- */
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const ox = e.clientX - rect.left - rect.width / 2;
      const oy = e.clientY - rect.top - rect.height / 2;

      // Normalize line/page wheel modes to pixels
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= rect.height;

      // Exponential zoom scales naturally for both trackpads and mouse wheels
      const factor = Math.exp(-clamp(dy, -250, 250) * WHEEL_ZOOM_SPEED);
      zoomAt(factor, ox, oy);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  /* ---- pointer handling: hit-test, pan with inertia, drag ---- */
  const toWorld = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const { x, y, k } = viewRef.current;
    return {
      x: (clientX - rect.left - rect.width / 2 - x) / k,
      y: (clientY - rect.top - rect.height / 2 - y) / k,
    };
  };

  const hitTest = (wx: number, wy: number) => {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      const dx = wx - b.x;
      const dy = wy - b.y;
      const d = dx * dx + dy * dy;
      if (d <= b.r * b.r && d < bestD) {
        best = i;
        bestD = d;
      }
    }
    return best;
  };

  const setHoverIdx = (idx: number, clientX: number, clientY: number) => {
    if (idx === hoverIdxRef.current) return;
    hoverIdxRef.current = idx;
    requestDraw();
    if (idx < 0) {
      setHover(null);
      return;
    }
    const rect = containerRef.current!.getBoundingClientRect();
    setHover({ i: idx, x: clientX - rect.left, y: clientY - rect.top });
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    cancelAnim();
    e.currentTarget.setPointerCapture(e.pointerId);
    const world = toWorld(e.clientX, e.clientY);
    const hit = hitTest(world.x, world.y);

    if (hit >= 0) {
      onSelectBubble?.(bubbles[hit].email);
      modeRef.current = "drag";
      setHoverIdx(-1, e.clientX, e.clientY);
      startDrag(hit, world);
    } else {
      onClearHighlight?.();
      modeRef.current = "pan";
      panStartRef.current = {
        x: e.clientX - viewRef.current.x,
        y: e.clientY - viewRef.current.y,
      };
      panTrackRef.current = {
        x: e.clientX,
        y: e.clientY,
        t: performance.now(),
        vx: 0,
        vy: 0,
      };
    }
    setGrabbing(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const mode = modeRef.current;
    if (mode === "drag") {
      moveDrag(toWorld(e.clientX, e.clientY));
    } else if (mode === "pan") {
      const start = panStartRef.current;
      const now = performance.now();
      const track = panTrackRef.current;
      const dt = now - track.t;

      if (dt > 0) {
        // Exponential moving average of pointer velocity (px per 16.67ms frame)
        const instVx = ((e.clientX - track.x) / dt) * 16.667;
        const instVy = ((e.clientY - track.y) / dt) * 16.667;
        track.vx = track.vx * 0.5 + instVx * 0.5;
        track.vy = track.vy * 0.5 + instVy * 0.5;
        track.x = e.clientX;
        track.y = e.clientY;
        track.t = now;
      }

      setViewImmediate(
        e.clientX - start.x,
        e.clientY - start.y,
        viewRef.current.k,
      );
    } else if (e.pointerType === "mouse") {
      const world = toWorld(e.clientX, e.clientY);
      setHoverIdx(hitTest(world.x, world.y), e.clientX, e.clientY);
    }
  };

  const onPointerEnd = () => {
    if (modeRef.current === "drag") {
      endDrag();
    } else if (modeRef.current === "pan") {
      const track = panTrackRef.current;
      // Only throw if pointer was moving recently (< 60ms ago)
      if (performance.now() - track.t < 60) {
        throwPan(clamp(track.vx, -60, 60), clamp(track.vy, -60, 60));
      }
    }
    modeRef.current = "none";
    setGrabbing(false);
  };

  const hovered = hover ? bubbles[hover.i] : null;

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Leaderboard bubble chart. Larger bubbles have more points. Use the list view for an accessible ranking."
        className={`block h-full w-full touch-none select-none ${
          grabbing ? "cursor-grabbing" : "cursor-grab"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={(e) => {
          if (modeRef.current === "none") setHoverIdx(-1, e.clientX, e.clientY);
        }}
      />

      {hovered && hover && modeRef.current === "none" && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-slate-900/90 px-3 py-1.5 text-xs text-white shadow-xl ring-1 ring-white/15"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          {hovered.name}: {hovered.points} points
        </div>
      )}

      <div
        role="group"
        aria-label="Zoom controls"
        className="absolute bottom-4 right-4 flex flex-col overflow-hidden rounded-xl bg-black/30 ring-1 ring-white/15 backdrop-blur-sm"
      >
        <ControlButton label="Zoom in" onClick={() => zoomAt(BUTTON_ZOOM)}>
          +
        </ControlButton>
        <ControlButton label="Zoom out" onClick={() => zoomAt(1 / BUTTON_ZOOM)}>
          &minus;
        </ControlButton>
        <ControlButton
          label="Fit all bubbles in view"
          onClick={() => fit(true)}
          small
        >
          Fit
        </ControlButton>
      </div>
    </div>
  );
};
