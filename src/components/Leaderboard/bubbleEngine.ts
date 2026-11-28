import { useCallback, useEffect, useRef } from "react";

import type { AttendeePair as Pair } from "../../interfaces/EventAttendee";

/* -------------------------------------------------------------------------- */
/*  Shared Types & Utilities                                                  */
/* -------------------------------------------------------------------------- */

export type ViewMode = "bubbles" | "list";

export type FocusRequest = { email: string; nonce: number; view: ViewMode };

export const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

// Layout
export const GAP = 4;
export const MIN_RADIUS = 6;
export const RADIUS_RANGE = 50;
export const SPIRAL_SPACING = MIN_RADIUS * 2 + GAP; // distance between spiral arms
export const SPIRAL_STEP = MIN_RADIUS; // arc length between candidate positions
export const SPIRAL_BACKOFF = 40; // arc length to rewind before each placement
export const GRID_CELL = 48; // spatial-hash cell size used while packing

// Organic shape config
export const BLOB_POINTS = 20; // segments per bubble contour (smooth when zoomed in)
export const BLOB_MIN_SCREEN_PX = 8; // below this radius on screen, draw fast circle

// Physics (custom solver, all bubbles simulated)
export const AIR_FRICTION = 0.015;
export const RESTITUTION = 0.7;
export const RESTING_SPEED = 0.25; // slower impacts don't bounce (stops jitter in piles)
export const POS_CORRECTION = 0.8;
export const PHYS_SUBSTEPS = 3;
export const PHYS_ITERATIONS = 2;
export const MAX_SPEED = 18; // per 60Hz frame; substeps keep this below a bubble's diameter
export const PHYS_CELL = 32; // grid cell size for collision lookups
export const MAX_GRID_DIM = 300; // cap on cells per axis if bubbles get flung far away
export const CENTER_PULL_EDGE = 0.08; // inward acceleration at the cluster's outer edge
export const DRAG_STIFFNESS = 0.22; // tighter coupling to cursor
export const DRAG_DAMPING = 0.42;
export const REST_SPEED = 0.03; // below this the world counts as calm
export const REST_FRAMES = 60; // calm frames before the simulation parks itself
export const MAX_FREE_FRAMES = 900; // hard stop after release, even if never fully calm

const TAU = Math.PI * 2;

export const COLORS = {
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
export const HIGHLIGHT = [
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

/* -------------------------------------------------------------------------- */
/*  Colors & Shape Helpers                                                    */
/* -------------------------------------------------------------------------- */

export const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const mix = (from: string, to: string, t: number) => {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const [r, g, bl] = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${r},${g},${bl})`;
};

/** Deterministic 0..1 hash so each attendee gets a consistent organic shape. */
export const hashString = (str: string) => {
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
export function traceOrganicBubble(
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

export type Bubble = {
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

export function layoutBubbles(pairs: Pair[]): Bubble[] {
  if (pairs.length === 0) return [];
  const sorted = [...pairs].sort((a, b) => b[2] - a[2]);
  const bubbles = createBubbles(sorted);
  packBubbles(bubbles);
  return bubbles;
}

/* -------------------------------------------------------------------------- */
/*  Physics                                                                   */
/* -------------------------------------------------------------------------- */

export class BubbleSim {
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

export function useBubblePhysics(bubbles: Bubble[], requestDraw: () => void) {
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
