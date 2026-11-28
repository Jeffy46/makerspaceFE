import { useCallback, useEffect, useRef } from "react";

import { clamp, prefersReducedMotion } from "./bubbleEngine";
import type { Bubble } from "./bubbleEngine";

/* -------------------------------------------------------------------------- */
/*  Camera (pan, zoom, inertia, and smooth interpolation)                     */
/* -------------------------------------------------------------------------- */

// Camera
export const FIT_PADDING = 0.9;
export const BUTTON_ZOOM = 1.4;
export const WHEEL_ZOOM_SPEED = 0.0018; // exponential zoom sensitivity per deltaY pixel
export const CAMERA_LERP = 0.22; // smoothing factor per 60Hz frame for zoom/pan
export const PAN_FRICTION = 0.9; // velocity retention per 60Hz frame after release
export const FOCUS_ZOOM_LEVEL = 3.2; // Minimum magnification when finding a person
export const FOCUS_SCREEN_RADIUS = 60; // Target on-screen radius (px) of a found bubble
export const MAX_ZOOM = 40;
export const MIN_ZOOM_VS_FIT = 0.5;

export type View = { x: number; y: number; k: number };

export function useCamera(
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
