"use client";

import { useEffect, useRef } from "react";

export interface MatrixBackgroundProps {
  className?: string;
  children?: React.ReactNode;
  /** Font size in pixels (affects density). Defaults to 12 on screens under 640px wide, 16 otherwise. */
  fontSize?: number;
  /** Fall speed multiplier */
  speed?: number;
  /** Primary color (use a darker shade so it reads on white) */
  color?: string;
  /** Character set to use */
  charset?: string;
}

interface Column {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  length: number;
}

const DEFAULT_CHARSET =
  "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789";

const SMALL_SCREEN_WIDTH = 640;
const PALETTE_STEPS = 20;

export function MatrixBackground({
  className,
  children,
  fontSize,
  speed = 0.2,
  color = "#008f11",
  charset = DEFAULT_CHARSET,
}: MatrixBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Cap DPR at 2: sharp on retina phones without the cost of 3x canvases
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const chars = charset.split("");

    let width = 0;
    let height = 0;
    let fs = 16;
    let columnWidth = 16;
    let small = false;
    let columns: Column[] = [];
    let animationId = 0;

    const createColumn = (x: number): Column => ({
      x,
      y: Math.random() * -height,
      speed: (0.5 + Math.random() * 0.5) * speed,
      chars: Array.from(
        { length: 25 },
        () => chars[Math.floor(Math.random() * chars.length)],
      ),
      length: 15 + Math.floor(Math.random() * 15),
    });

    // Sizes the bitmap for the device pixel ratio and pins the CSS size
    // so the canvas never stretches or distorts.
    const sizeCanvas = (w: number, h: number) => {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    };

    const build = (w: number, h: number) => {
      width = w;
      height = h;
      small = w < SMALL_SCREEN_WIDTH;
      fs = fontSize ?? (small ? 12 : 16);
      columnWidth = fs;
      sizeCanvas(w, h);
      columns = Array.from({ length: Math.ceil(w / columnWidth) }, (_, i) =>
        createColumn(i * columnWidth),
      );
    };

    const initialRect = container.getBoundingClientRect();
    build(Math.round(initialRect.width), Math.round(initialRect.height));

    const handleResize = () => {
      const r = container.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      if (w === 0 || h === 0) return;

      if (w !== width) {
        // Width changed (rotation, window resize): rebuild everything
        build(w, h);
      } else if (h > height) {
        // Height-only growth (mobile browser toolbar collapsing): grow the
        // canvas. Never shrink, so toolbar show/hide doesn't clear the screen.
        height = h;
        sizeCanvas(width, h);
      }
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    // Parse color for variations
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: Number.parseInt(result[1], 16),
            g: Number.parseInt(result[2], 16),
            b: Number.parseInt(result[3], 16),
          }
        : { r: 0, g: 143, b: 17 };
    };

    const rgb = hexToRgb(color);

    // Precomputed fill styles avoid building thousands of strings per frame.
    // On white, the lead character is a darker shade of the color so it stands out.
    const headFill = `rgb(${Math.round(rgb.r * 0.45)}, ${Math.round(rgb.g * 0.45)}, ${Math.round(rgb.b * 0.45)})`;
    const trailPalette = Array.from(
      { length: PALETTE_STEPS + 1 },
      (_, k) =>
        `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${((k / PALETTE_STEPS) * 0.8).toFixed(3)})`,
    );

    const FRAME_60 = 1000 / 60;
    let last = performance.now();

    // Scroll reactivity: the listener only records distance, the animation loop does the rest
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let lastScrollY = window.scrollY;
    let scrollBoost = 0;

    const onScroll = () => {
      const y = window.scrollY;
      // Absolute value so iOS rubber-banding (negative deltas) also counts
      scrollBoost += Math.abs(y - lastScrollY);
      lastScrollY = y;
    };

    if (!reduceMotion) {
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    const animate = (time: number) => {
      animationId = requestAnimationFrame(animate);

      // Cap at 30fps on small screens (battery + perf), 60fps otherwise.
      // This also keeps 120Hz phones from running twice as fast.
      const interval = 1000 / (small ? 30 : 60);
      const elapsed = time - last;
      if (elapsed < interval - 1) return;
      last = time;

      // Normalized to 60fps frames so speed is frame-rate independent
      const step = Math.min(elapsed / FRAME_60, 3);

      // Convert accumulated scroll distance into a speed multiplier, then decay it
      const boost = Math.min(scrollBoost * 0.06, 6);
      scrollBoost *= Math.pow(0.9, step);

      // Fade effect (fades toward white)
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, 0.05 * step)})`;
      ctx.fillRect(0, 0, width, height);

      ctx.font = `${fs}px monospace`;

      for (const column of columns) {
        column.y += column.speed * fs * 0.5 * step * (1 + boost);

        for (let i = 0; i < column.length; i++) {
          const charY = column.y - i * fs;

          if (charY < -fs || charY > height + fs) continue;

          // Randomly change character sometimes
          if (Math.random() < 0.02 * step) {
            column.chars[i % column.chars.length] =
              chars[Math.floor(Math.random() * chars.length)];
          }

          if (i === 0) {
            ctx.fillStyle = headFill;
            // Glow is expensive, so skip it on small screens
            if (!small) {
              ctx.shadowColor = color;
              ctx.shadowBlur = 8;
            }
          } else {
            const opacity = Math.max(0, 1 - i / column.length);
            ctx.fillStyle = trailPalette[Math.round(opacity * PALETTE_STEPS)];
            ctx.shadowBlur = 0;
          }

          ctx.fillText(column.chars[i % column.chars.length], column.x, charY);
        }

        ctx.shadowBlur = 0;

        // Reset column when off screen
        if (column.y - column.length * fs > height) {
          column.y = Math.random() * -height * 0.5;
          column.speed = (0.5 + Math.random() * 0.5) * speed;
          column.length = 15 + Math.floor(Math.random() * 15);
        }
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [fontSize, speed, color, charset]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 overflow-hidden bg-white${className ? ` ${className}` : ""}`}
    >
      <canvas ref={canvasRef} className="absolute left-0 top-0" />

      {/* Scanline effect */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0.3) 2px)",
        }}
      />

      {/* Vignette (fades edges to white) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(255,255,255,0.7) 100%)",
        }}
      />

      {/* Content layer */}
      {children && (
        <div className="relative z-10 h-full w-full">{children}</div>
      )}
    </div>
  );
}

export default function MatrixBackgroundDemo() {
  return <MatrixBackground />;
}
