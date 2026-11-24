import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";

import type { AttendeePair as Pair } from "../../interfaces/EventAttendee";

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

// Layout
const GAP = 4;
const MIN_RADIUS = 6;
const RADIUS_RANGE = 50;
const SPIRAL_SPACING = MIN_RADIUS * 2 + GAP; // distance between spiral arms
const SPIRAL_STEP = MIN_RADIUS; // arc length between candidate positions
const SPIRAL_BACKOFF = 40; // arc length to rewind before each placement
const GRID_CELL = 48; // spatial-hash cell size used while packing

// Organic shape config
const BLOB_POINTS = 20; // segments per bubble contour (smooth when zoomed in)
const BLOB_MIN_SCREEN_PX = 8; // below this radius on screen, draw fast circle

// Camera
const MIN_LABEL_PX = 11; // cull tiny unreadable labels early for fast canvas draws
const FIT_PADDING = 0.9;
const BUTTON_ZOOM = 1.4;
const WHEEL_ZOOM_SPEED = 0.0018; // exponential zoom sensitivity per deltaY pixel
const CAMERA_LERP = 0.22; // smoothing factor per 60Hz frame for zoom/pan
const PAN_FRICTION = 0.9; // velocity retention per 60Hz frame after release
const FOCUS_ZOOM_LEVEL = 3.2; // Minimum magnification when finding a person
const FOCUS_SCREEN_RADIUS = 60; // Target on-screen radius (px) of a found bubble
const MAX_ZOOM = 40;
const MIN_ZOOM_VS_FIT = 0.5;

// Physics (custom solver, all bubbles simulated)
const AIR_FRICTION = 0.015;
const RESTITUTION = 0.7;
const RESTING_SPEED = 0.25; // slower impacts don't bounce (stops jitter in piles)
const POS_CORRECTION = 0.8;
const PHYS_SUBSTEPS = 3;
const PHYS_ITERATIONS = 2;
const MAX_SPEED = 18; // per 60Hz frame; substeps keep this below a bubble's diameter
const PHYS_CELL = 32; // grid cell size for collision lookups
const MAX_GRID_DIM = 300; // cap on cells per axis if bubbles get flung far away
const CENTER_PULL_EDGE = 0.08; // inward acceleration at the cluster's outer edge
const DRAG_STIFFNESS = 0.22; // tighter coupling to cursor
const DRAG_DAMPING = 0.42;
const REST_SPEED = 0.03; // below this the world counts as calm
const REST_FRAMES = 60; // calm frames before the simulation parks itself
const MAX_FREE_FRAMES = 900; // hard stop after release, even if never fully calm

const FONT_FAMILY = "ui-sans-serif, system-ui, sans-serif";
const TAU = Math.PI * 2;

const COLORS = {
  // Field bubbles: rich purple-indigo (low points) transitioning to electric mint (high points)
  bubbleLow: "#6366F1", // Indigo / violet glow that pops on deep teal
  bubbleHigh: "#2DD4BF", // Electric aqua / mint

  // Podium tiers: high-luminance warm metals that break out of the cool palette
  podium: [
    "#FBBF24", // 1st: Luminous warm gold
    "#F1F5F9", // 2nd: Crisp bright platinum (high contrast against dark slate)
    "#FB923C", // 3rd: Vivid amber / molten copper
  ],

  // Deep obsidian slate for crisp legibility over bright fills
  label: "#081318",
} as const;

// Ring + glow used on the highlighted bubble, by podium rank (index 3 = no rank)
const HIGHLIGHT = [
  {
    rgb: "253,224,71",
    stroke: "rgba(253,224,71,0.95)",
    glow: "rgba(251,191,36,0.35)",
  },
  {
    rgb: "226,232,240",
    stroke: "rgba(226,232,240,0.95)",
    glow: "rgba(241,245,249,0.3)",
  },
  {
    rgb: "253,186,116",
    stroke: "rgba(253,186,116,0.95)",
    glow: "rgba(251,146,60,0.3)",
  },
  {
    rgb: "255,255,255",
    stroke: "rgb(255,255,255)",
    glow: "rgba(255,255,255,0.35)",
  },
] as const;

// Ripple on the highlighted bubble
const RIPPLE_PERIOD_MS = 1800;
const RIPPLE_COUNT = 2; // rings in flight at once
const RIPPLE_MIN_REACH_PX = 40; // how far a ripple spreads on screen, at least

/* -------------------------------------------------------------------------- */
/*  Colors & Shape Helpers                                                    */
/* -------------------------------------------------------------------------- */

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const mix = (from: string, to: string, t: number) => {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const [r, g, bl] = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${r},${g},${bl})`;
};

/** Deterministic 0..1 hash so each attendee gets a consistent organic shape. */
const hashString = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
};

/**
 * Traces a slightly irregular organic closed contour around (x, y) with mean
 * radius `r`. Falls back to a standard arc when tiny on screen for speed.
 */
function traceOrganicBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  seed: number,
  k: number,
) {
  if (r * k < BLOB_MIN_SCREEN_PX) {
    ctx.arc(x, y, r, 0, TAU);
    return;
  }

  const phase1 = seed * TAU;
  const phase2 = seed * TAU * 2.7;
  const amp1 = 0.045;
  const amp2 = 0.03;

  for (let i = 0; i <= BLOB_POINTS; i++) {
    const angle = (i / BLOB_POINTS) * TAU;
    const wobble =
      1 +
      amp1 * Math.sin(angle * 2 + phase1) +
      amp2 * Math.cos(angle * 3 + phase2);
    const rr = r * wobble;
    const px = x + Math.cos(angle) * rr;
    const py = y + Math.sin(angle) * rr;

    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/* -------------------------------------------------------------------------- */
/*  Layout                                                                    */
/* -------------------------------------------------------------------------- */

type Bubble = {
  email: string;
  name: string;
  nameLower: string;
  label: string;
  points: number;
  pointsLabel: string;
  rank: number | null;
  color: string;
  r: number;
  seed: number;
  fontSize: number;
  x: number; // mutated in place by physics
  y: number;
};

const radiusFor = (points: number, max: number) =>
  MIN_RADIUS + Math.sqrt(points / max) * RADIUS_RANGE;

const shortName = (name: string) => name.split(" ").slice(0, 2).join(" ");

const podiumScores = (pairs: Pair[]) =>
  [...new Set(pairs.map(([, , points]) => points))]
    .filter((points) => points > 0)
    .sort((a, b) => b - a)
    .slice(0, COLORS.podium.length);

function createBubbles(sorted: Pair[]): Bubble[] {
  const max = sorted[0]?.[2] || 1;
  const tiers = podiumScores(sorted);

  return sorted.map(([email, name, points]) => {
    const r = radiusFor(points, max);
    const tier = tiers.indexOf(points);

    return {
      email,
      name,
      nameLower: name.toLowerCase(),
      label: shortName(name),
      points,
      pointsLabel: String(points),
      rank: tier === -1 ? null : tier + 1,
      color:
        tier === -1
          ? mix(COLORS.bubbleLow, COLORS.bubbleHigh, Math.sqrt(points / max))
          : COLORS.podium[tier],
      r,
      seed: hashString(email),
      // Quantize fontSize to 0.25px increments so ctx.font batches cleanly
      fontSize: Math.round(r * 0.2 * 4) / 4,
      x: 0,
      y: 0,
    };
  });
}

/**
 * Greedy circle packing. Bubbles are placed biggest-first along one outward
 * spiral; each takes the first spot that doesn't overlap anything already
 * placed. A spatial hash keeps each overlap check to a handful of neighbours,
 * so the whole layout is roughly O(n) instead of the old O(n² × iterations).
 */
function packBubbles(bubbles: Bubble[]) {
  const grid = new Map<number, number[]>();
  const cellKey = (cx: number, cy: number) => (cx + 4096) * 8192 + (cy + 4096);
  const cellOf = (v: number) => Math.floor(v / GRID_CELL);

  const collides = (x: number, y: number, r: number) => {
    const x0 = cellOf(x - r);
    const x1 = cellOf(x + r);
    const y0 = cellOf(y - r);
    const y1 = cellOf(y + r);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const cell = grid.get(cellKey(cx, cy));
        if (!cell) continue;
        for (const j of cell) {
          const o = bubbles[j];
          const min = r + o.r + GAP;
          const dx = x - o.x;
          const dy = y - o.y;
          if (dx * dx + dy * dy < min * min) return true;
        }
      }
    }
    return false;
  };

  const insert = (index: number) => {
    const b = bubbles[index];
    const pad = b.r + GAP;
    const x0 = cellOf(b.x - pad);
    const x1 = cellOf(b.x + pad);
    const y0 = cellOf(b.y - pad);
    const y1 = cellOf(b.y + pad);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const key = cellKey(cx, cy);
        const cell = grid.get(key);
        if (cell) cell.push(index);
        else grid.set(key, [index]);
      }
    }
  };

  const a = SPIRAL_SPACING / TAU; // r = a * theta
  let theta = 0;

  for (let i = 0; i < bubbles.length; i++) {
    const b = bubbles[i];

    if (i === 0) {
      b.x = 0;
      b.y = 0;
      insert(0);
      continue;
    }

    // Rewind a little so gaps left behind the cursor can still be filled.
    const radiusNow = a * theta;
    theta = Math.max(0, theta - SPIRAL_BACKOFF / Math.max(radiusNow, 20));

    for (;;) {
      const radius = a * theta;
      const x = Math.cos(theta) * radius;
      const y = Math.sin(theta) * radius;
      if (!collides(x, y, b.r)) {
        b.x = x;
        b.y = y;
        break;
      }
      theta += SPIRAL_STEP / Math.hypot(radius, a);
    }
    insert(i);
  }
}

function layoutBubbles(pairs: Pair[]): Bubble[] {
  if (pairs.length === 0) return [];
  const sorted = [...pairs].sort((a, b) => b[2] - a[2]);
  const bubbles = createBubbles(sorted);
  packBubbles(bubbles);
  return bubbles;
}

/* -------------------------------------------------------------------------- */
/*  Camera (pan, zoom, inertia, and smooth interpolation)                     */
/* -------------------------------------------------------------------------- */

type View = { x: number; y: number; k: number };

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useCamera(
  bubbles: Bubble[],
  containerRef: { readonly current: HTMLDivElement | null },
  requestDraw: () => void,
) {
  const viewRef = useRef<View>({ x: 0, y: 0, k: 1 });
  const targetRef = useRef<View>({ x: 0, y: 0, k: 1 });
  const velRef = useRef({ vx: 0, vy: 0 });
  const limitsRef = useRef({ min: 0.01, max: MAX_ZOOM });
  const animRef = useRef(0);

  const cancelAnim = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    animRef.current = 0;
    velRef.current = { vx: 0, vy: 0 };
    targetRef.current = { ...viewRef.current };
  }, []);

  /** Immediately snap both current and target camera views (used during active drag). */
  const setViewImmediate = useCallback(
    (x: number, y: number, k: number) => {
      cancelAnim();
      viewRef.current = { x, y, k };
      targetRef.current = { x, y, k };
      requestDraw();
    },
    [cancelAnim, requestDraw],
  );

  /** Start or continue the camera spring/inertia loop toward targetRef. */
  const wakeCamera = useCallback(() => {
    if (animRef.current) return;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min((now - lastTime) / 16.667, 2.5);
      lastTime = now;

      const cur = viewRef.current;
      const tgt = targetRef.current;
      const vel = velRef.current;

      // Apply pan inertia to target
      if (Math.abs(vel.vx) > 0.05 || Math.abs(vel.vy) > 0.05) {
        tgt.x += vel.vx * dt;
        tgt.y += vel.vy * dt;
        const decay = Math.pow(PAN_FRICTION, dt);
        vel.vx *= decay;
        vel.vy *= decay;
      } else {
        vel.vx = 0;
        vel.vy = 0;
      }

      // Frame-rate independent exponential smoothing toward target
      const alpha = prefersReducedMotion()
        ? 1
        : 1 - Math.pow(1 - CAMERA_LERP, dt);

      cur.x += (tgt.x - cur.x) * alpha;
      cur.y += (tgt.y - cur.y) * alpha;
      cur.k += (tgt.k - cur.k) * alpha;

      const settled =
        Math.abs(tgt.x - cur.x) < 0.05 &&
        Math.abs(tgt.y - cur.y) < 0.05 &&
        Math.abs(tgt.k - cur.k) < 1e-4 &&
        vel.vx === 0 &&
        vel.vy === 0;

      if (settled) {
        cur.x = tgt.x;
        cur.y = tgt.y;
        cur.k = tgt.k;
        animRef.current = 0;
      } else {
        animRef.current = requestAnimationFrame(step);
      }

      requestDraw();
    };

    animRef.current = requestAnimationFrame(step);
  }, [requestDraw]);

  /** Apply pan momentum when pointer is released. */
  const throwPan = useCallback(
    (vx: number, vy: number) => {
      velRef.current = { vx, vy };
      targetRef.current = { ...viewRef.current };
      wakeCamera();
    },
    [wakeCamera],
  );

  /** Smoothly zoom by `factor` around (ox, oy) relative to canvas center. */
  const zoomAt = useCallback(
    (factor: number, ox = 0, oy = 0) => {
      velRef.current = { vx: 0, vy: 0 };
      const { x, y, k } = targetRef.current;
      const nextK = clamp(
        k * factor,
        limitsRef.current.min,
        limitsRef.current.max,
      );
      const f = nextK / k;
      targetRef.current = {
        x: ox - (ox - x) * f,
        y: oy - (oy - y) * f,
        k: nextK,
      };
      wakeCamera();
    },
    [wakeCamera],
  );

  /** Smoothly zoom into and centre a world coordinate. */
  const zoomTo = useCallback(
    (worldX: number, worldY: number, targetK: number) => {
      velRef.current = { vx: 0, vy: 0 };
      const endK = clamp(targetK, limitsRef.current.min, limitsRef.current.max);
      targetRef.current = {
        x: -worldX * endK,
        y: -worldY * endK,
        k: endK,
      };
      wakeCamera();
    },
    [wakeCamera],
  );

  const fit = useCallback(
    (animate = true) => {
      const el = containerRef.current;
      if (!el || bubbles.length === 0) return;
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const b of bubbles) {
        if (b.x - b.r < minX) minX = b.x - b.r;
        if (b.x + b.r > maxX) maxX = b.x + b.r;
        if (b.y - b.r < minY) minY = b.y - b.r;
        if (b.y + b.r > maxY) maxY = b.y + b.r;
      }

      const k =
        Math.min(width / (maxX - minX), height / (maxY - minY)) * FIT_PADDING;
      limitsRef.current = { min: k * MIN_ZOOM_VS_FIT, max: MAX_ZOOM };
      const cx = -((minX + maxX) / 2) * k;
      const cy = -((minY + maxY) / 2) * k;

      if (animate) {
        velRef.current = { vx: 0, vy: 0 };
        targetRef.current = { x: cx, y: cy, k };
        wakeCamera();
      } else {
        setViewImmediate(cx, cy, k);
      }
    },
    [bubbles, containerRef, wakeCamera, setViewImmediate],
  );

  useEffect(() => {
    fit(false);
  }, [fit]);

  useEffect(() => cancelAnim, [cancelAnim]);

  return {
    viewRef,
    zoomAt,
    zoomTo,
    fit,
    setViewImmediate,
    throwPan,
    cancelAnim,
  };
}

/* -------------------------------------------------------------------------- */
/*  Physics                                                                   */
/* -------------------------------------------------------------------------- */

class BubbleSim {
  private readonly n: number;
  private readonly x: Float64Array;
  private readonly y: Float64Array;
  private readonly vx: Float64Array;
  private readonly vy: Float64Array;
  private readonly r: Float64Array;
  private readonly invM: Float64Array;
  private readonly cx0: Int32Array;
  private readonly cx1: Int32Array;
  private readonly cy0: Int32Array;
  private readonly cy1: Int32Array;
  private cellStart = new Int32Array(1);
  private cursor = new Int32Array(1);
  private items = new Int32Array(1);
  private gw = 1;
  private gh = 1;
  private readonly pullK: number;

  private dragged = -1;
  private grabX = 0;
  private grabY = 0;
  private targetX = 0;
  private targetY = 0;
  private calmFrames = 0;
  private freeFrames = 0;

  constructor(bubbles: Bubble[]) {
    const n = bubbles.length;
    this.n = n;
    this.x = new Float64Array(n);
    this.y = new Float64Array(n);
    this.vx = new Float64Array(n);
    this.vy = new Float64Array(n);
    this.r = new Float64Array(n);
    this.invM = new Float64Array(n);
    this.cx0 = new Int32Array(n);
    this.cx1 = new Int32Array(n);
    this.cy0 = new Int32Array(n);
    this.cy1 = new Int32Array(n);

    let reach = 1;
    for (let i = 0; i < n; i++) {
      const b = bubbles[i];
      this.x[i] = b.x;
      this.y[i] = b.y;
      this.r[i] = b.r;
      this.invM[i] = (MIN_RADIUS * MIN_RADIUS) / (b.r * b.r);
      reach = Math.max(reach, Math.hypot(b.x, b.y) + b.r);
    }
    this.pullK = CENTER_PULL_EDGE / reach;
  }

  grab(index: number, wx: number, wy: number) {
    this.dragged = index;
    this.grabX = wx - this.x[index];
    this.grabY = wy - this.y[index];
    this.targetX = wx;
    this.targetY = wy;
    this.calmFrames = 0;
    this.freeFrames = 0;
  }

  dragTo(wx: number, wy: number) {
    this.targetX = wx;
    this.targetY = wy;
  }

  release() {
    this.dragged = -1;
    this.calmFrames = 0;
    this.freeFrames = 0;
  }

  writeBack(bubbles: Bubble[]) {
    for (let i = 0; i < this.n; i++) {
      bubbles[i].x = this.x[i];
      bubbles[i].y = this.y[i];
    }
  }

  /**
   * Advance one frame using normalized delta-time (`dtScale = 1.0` at 60fps).
   * Returns false once the world has come to rest.
   */
  step(dtScale: number): boolean {
    const subDt = dtScale / PHYS_SUBSTEPS;
    for (let s = 0; s < PHYS_SUBSTEPS; s++) {
      this.integrate(subDt);
      this.buildGrid();
      for (let it = 0; it < PHYS_ITERATIONS; it++) this.solve();
    }

    if (this.dragged >= 0) {
      this.calmFrames = 0;
      this.freeFrames = 0;
      return true;
    }

    let maxSq = 0;
    for (let i = 0; i < this.n; i++) {
      const sq = this.vx[i] * this.vx[i] + this.vy[i] * this.vy[i];
      if (sq > maxSq) maxSq = sq;
    }
    this.calmFrames = maxSq < REST_SPEED * REST_SPEED ? this.calmFrames + 1 : 0;
    this.freeFrames += dtScale;
    return this.calmFrames < REST_FRAMES && this.freeFrames < MAX_FREE_FRAMES;
  }

  private integrate(dt: number) {
    const { n, x, y, vx, vy, pullK } = this;
    const damp = Math.pow(1 - AIR_FRICTION, dt);
    const maxSq = MAX_SPEED * MAX_SPEED;

    for (let i = 0; i < n; i++) {
      let ax = -x[i] * pullK;
      let ay = -y[i] * pullK;

      if (i === this.dragged) {
        ax +=
          (this.targetX - (x[i] + this.grabX)) * DRAG_STIFFNESS -
          vx[i] * DRAG_DAMPING;
        ay +=
          (this.targetY - (y[i] + this.grabY)) * DRAG_STIFFNESS -
          vy[i] * DRAG_DAMPING;
      }

      let nvx = vx[i] * damp + ax * dt;
      let nvy = vy[i] * damp + ay * dt;
      const sq = nvx * nvx + nvy * nvy;
      if (sq > maxSq) {
        const f = MAX_SPEED / Math.sqrt(sq);
        nvx *= f;
        nvy *= f;
      }
      vx[i] = nvx;
      vy[i] = nvy;
      x[i] += nvx * dt;
      y[i] += nvy * dt;
    }
  }

  private buildGrid() {
    const { n, x, y, r, cx0, cx1, cy0, cy1 } = this;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      if (x[i] - r[i] < minX) minX = x[i] - r[i];
      if (x[i] + r[i] > maxX) maxX = x[i] + r[i];
      if (y[i] - r[i] < minY) minY = y[i] - r[i];
      if (y[i] + r[i] > maxY) maxY = y[i] + r[i];
    }

    const extent = Math.max(maxX - minX, maxY - minY, 1);
    const cell = Math.max(PHYS_CELL, extent / MAX_GRID_DIM);
    const inv = 1 / cell;
    const gw = Math.floor((maxX - minX) * inv) + 1;
    const gh = Math.floor((maxY - minY) * inv) + 1;
    const cells = gw * gh;

    if (this.cellStart.length < cells + 1) {
      this.cellStart = new Int32Array(cells + 1);
      this.cursor = new Int32Array(cells + 1);
    }
    const cellStart = this.cellStart;
    cellStart.fill(0, 0, cells + 1);

    let total = 0;
    for (let i = 0; i < n; i++) {
      const a0 = Math.floor((x[i] - r[i] - minX) * inv);
      const a1 = Math.min(gw - 1, Math.floor((x[i] + r[i] - minX) * inv));
      const b0 = Math.floor((y[i] - r[i] - minY) * inv);
      const b1 = Math.min(gh - 1, Math.floor((y[i] + r[i] - minY) * inv));
      cx0[i] = a0;
      cx1[i] = a1;
      cy0[i] = b0;
      cy1[i] = b1;
      for (let cy = b0; cy <= b1; cy++) {
        for (let cx = a0; cx <= a1; cx++) {
          cellStart[cy * gw + cx + 1]++;
          total++;
        }
      }
    }

    for (let c = 0; c < cells; c++) cellStart[c + 1] += cellStart[c];

    if (this.items.length < total) {
      this.items = new Int32Array(Math.ceil(total * 1.5));
    }
    const items = this.items;
    const cursor = this.cursor;
    cursor.set(cellStart.subarray(0, cells));

    for (let i = 0; i < n; i++) {
      for (let cy = cy0[i]; cy <= cy1[i]; cy++) {
        for (let cx = cx0[i]; cx <= cx1[i]; cx++) {
          items[cursor[cy * gw + cx]++] = i;
        }
      }
    }

    this.gw = gw;
    this.gh = gh;
  }

  private solve() {
    const { x, y, vx, vy, r, invM, items, cellStart, gw, gh, cx0, cy0 } = this;

    for (let cy = 0; cy < gh; cy++) {
      for (let cx = 0; cx < gw; cx++) {
        const c = cy * gw + cx;
        const start = cellStart[c];
        const end = cellStart[c + 1];
        if (end - start < 2) continue;

        for (let a = start; a < end; a++) {
          const i = items[a];
          for (let b = a + 1; b < end; b++) {
            const j = items[b];

            if (cx !== Math.max(cx0[i], cx0[j])) continue;
            if (cy !== Math.max(cy0[i], cy0[j])) continue;

            let dx = x[j] - x[i];
            let dy = y[j] - y[i];
            const min = r[i] + r[j];
            const d2 = dx * dx + dy * dy;
            if (d2 >= min * min) continue;

            let d = Math.sqrt(d2);
            if (d < 1e-6) {
              dx = 1;
              dy = 0;
              d = 0;
            } else {
              dx /= d;
              dy /= d;
            }
            const overlap = min - d;
            const wi = invM[i];
            const wj = invM[j];
            const ws = wi + wj;

            const corr = (overlap * POS_CORRECTION) / ws;
            x[i] -= dx * corr * wi;
            y[i] -= dy * corr * wi;
            x[j] += dx * corr * wj;
            y[j] += dy * corr * wj;

            const rvn = (vx[j] - vx[i]) * dx + (vy[j] - vy[i]) * dy;
            if (rvn < 0) {
              const e = rvn < -RESTING_SPEED ? RESTITUTION : 0;
              const imp = (-(1 + e) * rvn) / ws;
              vx[i] -= dx * imp * wi;
              vy[i] -= dy * imp * wi;
              vx[j] += dx * imp * wj;
              vy[j] += dy * imp * wj;
            }
          }
        }
      }
    }
  }
}

function useBubblePhysics(bubbles: Bubble[], requestDraw: () => void) {
  const simRef = useRef<BubbleSim | null>(null);
  const wakeRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (bubbles.length === 0) return;
    const sim = new BubbleSim(bubbles);
    simRef.current = sim;

    let raf = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      raf = 0;
      // Normalize elapsed time to a 60fps baseline (clamped to 2 frames max)
      const dtScale = clamp((now - lastTime) / 16.667, 0.1, 2.0);
      lastTime = now;

      const keepGoing = sim.step(dtScale);
      sim.writeBack(bubbles);
      requestDraw();
      if (keepGoing) raf = requestAnimationFrame(loop);
    };

    const wake = () => {
      if (!raf) {
        lastTime = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };

    wakeRef.current = wake;
    wake();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      simRef.current = null;
      wakeRef.current = () => {};
    };
  }, [bubbles, requestDraw]);

  const startDrag = useCallback(
    (index: number, point: { x: number; y: number }) => {
      simRef.current?.grab(index, point.x, point.y);
      wakeRef.current();
    },
    [],
  );

  const moveDrag = useCallback((point: { x: number; y: number }) => {
    simRef.current?.dragTo(point.x, point.y);
    wakeRef.current();
  }, []);

  const endDrag = useCallback(() => {
    simRef.current?.release();
    wakeRef.current();
  }, []);

  return { startDrag, moveDrag, endDrag };
}

/* -------------------------------------------------------------------------- */
/*  Bubble chart (canvas)                                                     */
/* -------------------------------------------------------------------------- */

export type FocusRequest = { email: string; nonce: number; view: ViewMode };

interface BubbleChartProps {
  bubbles: Bubble[];
  highlightedEmail: string | null;
  focusRequest: FocusRequest | null;
  onSelectBubble?: (email: string) => void;
  onClearHighlight?: () => void;
}

type Hover = { i: number; x: number; y: number } | null;

const BubbleChart = ({
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

/* -------------------------------------------------------------------------- */
/*  List view (virtualized)                                                   */
/* -------------------------------------------------------------------------- */

const ROW_HEIGHT = 60;
const ROW_PITCH = ROW_HEIGHT + 8;
const OVERSCAN = 8;

const ListView = ({
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

/* -------------------------------------------------------------------------- */
/*  Find / Search Bar                                                         */
/* -------------------------------------------------------------------------- */

const iconProps = {
  viewBox: "0 0 24 24",
  width: 18,
  height: 18,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  "aria-hidden": true,
};

const SearchIcon = () => (
  <svg {...iconProps} className="text-white/60">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const MAX_SUGGESTIONS = 6;

interface NameFinderProps {
  bubbles: Bubble[];
  onSelect: (bubble: Bubble) => void;
}

const NameFinder = ({ bubbles, onSelect }: NameFinderProps) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const trimmed = query.trim().toLowerCase();

  const matchingAttendees = useMemo(() => {
    if (!trimmed) return [];
    const parts = trimmed.split(/\s+/);
    const out: Bubble[] = [];
    for (const b of bubbles) {
      if (parts.every((part) => b.nameLower.includes(part))) {
        out.push(b);
        if (out.length >= MAX_SUGGESTIONS) break;
      }
    }
    return out;
  }, [bubbles, trimmed]);

  const handleSelect = (b: Bubble) => {
    onSelect(b);
    setQuery(b.name);
    setIsOpen(false);
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (matchingAttendees.length > 0) {
        handleSelect(matchingAttendees[0]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="absolute left-4 top-4 z-20 w-64 sm:w-80">
      <div className="relative flex items-center">
        <span className="pointer-events-none absolute left-3 flex items-center">
          <SearchIcon />
        </span>
        <input
          type="text"
          aria-label="search by name"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Find first & last name..."
          className="h-11 w-full rounded-xl bg-black/40 pl-5 pr-9 text-sm text-white placeholder-white/50 backdrop-blur-md ring-1 ring-white/15 outline-none transition-all focus:bg-black/60 focus:ring-2 focus:ring-white/40"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-3 text-xs text-white/50 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && matchingAttendees.length > 0 && (
        <ul className="mt-1.5 max-h-56 overflow-auto rounded-xl bg-slate-900/90 p-1 shadow-2xl backdrop-blur-md ring-1 ring-white/15">
          {matchingAttendees.map((b) => (
            <li key={b.email}>
              <button
                type="button"
                onClick={() => handleSelect(b)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/15"
              >
                <span className="truncate">{b.name}</span>
                <span className="ml-2 font-mono text-xs text-white/60">
                  {b.points} pts
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Leaderboard (bubble / list toggle)                                        */
/* -------------------------------------------------------------------------- */

type ViewMode = "bubbles" | "list";

export const Leaderboard = ({ pairs }: { pairs: Pair[] }) => {
  const bubbles = useMemo(() => layoutBubbles(pairs), [pairs]);
  const [view, setView] = useState<ViewMode>("bubbles");
  const [highlightedEmail, setHighlightedEmail] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);

  const handleSelectAttendee = (b: Bubble) => {
    setHighlightedEmail(b.email);
    setFocusRequest({ email: b.email, view, nonce: Date.now() });
  };

  return (
    <div className="relative h-full w-full">
      <NameFinder bubbles={bubbles} onSelect={handleSelectAttendee} />

      {view === "bubbles" ? (
        <BubbleChart
          bubbles={bubbles}
          highlightedEmail={highlightedEmail}
          focusRequest={focusRequest}
          onSelectBubble={setHighlightedEmail}
          onClearHighlight={() => setHighlightedEmail(null)}
        />
      ) : (
        <ListView
          bubbles={bubbles}
          highlightedEmail={highlightedEmail}
          focusRequest={focusRequest}
        />
      )}
      <ViewToggle
        view={view}
        onToggle={() => setView((v) => (v === "bubbles" ? "list" : "bubbles"))}
      />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

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

const ListIcon = () => (
  <svg {...iconProps}>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);

const BubblesIcon = () => (
  <svg {...iconProps}>
    <circle cx="9" cy="14" r="5" />
    <circle cx="17" cy="7" r="3" />
  </svg>
);

const ViewToggle = ({
  view,
  onToggle,
}: {
  view: ViewMode;
  onToggle: () => void;
}) => {
  const toList = view === "bubbles";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={toList ? "Switch to list view" : "Switch to bubble view"}
      className="absolute right-4 top-4 z-10 flex h-11 items-center gap-2 rounded-xl bg-black/30 px-4 text-sm font-medium text-white ring-1 ring-white/15 backdrop-blur-sm transition-colors hover:bg-white/15 active:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      {toList ? <ListIcon /> : <BubblesIcon />}
      {toList ? "List" : "Bubbles"}
    </button>
  );
};

export default Leaderboard;
