"use client";

/**
 * Renders a canvas field of dots connected to spring-based positions.
 * Pointer movement pulls nearby dots before they glide back into the grid.
 */
import { useEffect, useRef } from "react";

// tune: raise to spread the dots farther apart
const SPACING = 22;
// tune: raise to enlarge each dot
const DOT_RADIUS = 1.5;
// tune: raise to widen the magnetic field
const INFLUENCE_R = 180;
// tune: raise to quicken the return to the grid
const SPRING_K = 0.055;
// tune: raise to reduce velocity more quickly
const DAMPING = 0.11;
// tune: raise to strengthen the pointer pull
const MAG_STRENGTH = 16;
// tune: raise to quicken hover transitions
const LERP_FACTOR = 0.06;
// tune: raise to quicken pointer tracking
const MOUSE_LERP = 0.14;

type Dot = {
  restX: number;
  restY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

let MagneticDots = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const hoverStrRef = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      updateMouse(e.clientX, e.clientY);
    };

    const handleMouseLeave = () => {
      mouseRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dots: Dot[] = [];
    let animId = 0;
    let alive = true;
    let cw = 0;
    let ch = 0;
    let dpr = 1;

    let smoothMx = -99999;
    let smoothMy = -99999;

    function build() {
      if (!canvas) return;
      dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      cw = rect.width;
      ch = rect.height;
      if (!cw || !ch) return;

      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cols = Math.ceil(cw / SPACING) + 1;
      const rows = Math.ceil(ch / SPACING) + 1;
      const ox = (cw % SPACING) / 2;
      const oy = (ch % SPACING) / 2;

      const prev = new Map<string, Dot>();
      for (const d of dots) {
        prev.set(`${d.restX},${d.restY}`, d);
      }

      dots = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const rx = ox + c * SPACING;
          const ry = oy + r * SPACING;
          const key = `${rx},${ry}`;
          if (prev.has(key)) {
            dots.push(prev.get(key)!);
          } else {
            dots.push({ restX: rx, restY: ry, x: rx, y: ry, vx: 0, vy: 0 });
          }
        }
      }
    }

    function frame() {
      if (!alive || !ctx) return;

      const hasPointer = mouseRef.current !== null;
      const targetStr = hasPointer ? 1 : 0;
      hoverStrRef.current += (targetStr - hoverStrRef.current) * LERP_FACTOR;

      const hStr = hoverStrRef.current;
      const raw = mouseRef.current;
      if (raw) {
        if (smoothMx === -99999) {
          smoothMx = raw.x;
          smoothMy = raw.y;
        }
        smoothMx += (raw.x - smoothMx) * MOUSE_LERP;
        smoothMy += (raw.y - smoothMy) * MOUSE_LERP;
      } else {
        smoothMx = -99999;
        smoothMy = -99999;
      }
      const mx = smoothMx;
      const my = smoothMy;
      const r2 = INFLUENCE_R * INFLUENCE_R;

      ctx.clearRect(0, 0, cw, ch);

      const dotColor = "#001A3D";

      ctx.fillStyle = dotColor;

      for (const d of dots) {
        if (hStr > 0.001) {
          const dx = d.x - mx;
          const dy = d.y - my;
          const dist2 = dx * dx + dy * dy;

          if (dist2 < r2 && dist2 > 0.01) {
            const dist = Math.sqrt(dist2);

            const t = 1 - dist / INFLUENCE_R;
            const force = t * t * MAG_STRENGTH * hStr;

            d.vx += (-dx / dist) * force;
            d.vy += (-dy / dist) * force;
          }
        }

        d.vx += (d.restX - d.x) * SPRING_K;
        d.vy += (d.restY - d.y) * SPRING_K;

        d.vx *= 1 - DAMPING;
        d.vy *= 1 - DAMPING;

        d.x += d.vx;
        d.y += d.vy;

        ctx.beginPath();
        ctx.arc(d.x, d.y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(frame);
    }

    build();
    frame();

    const ro = new ResizeObserver(build);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    return () => {
      alive = false;
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  function updateMouse(clientX: number, clientY: number) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseRef.current = { x: clientX - rect.left, y: clientY - rect.top };
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none -z-10"
      style={{ background: "#FFFFFF" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};
export default MagneticDots;
