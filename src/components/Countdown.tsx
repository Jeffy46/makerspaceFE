import { useEffect, useRef, useState, type ReactNode } from "react";

export interface CountdownValue {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Milliseconds remaining (never negative). */
  totalMs: number;
  /** True once the event time has been reached. */
  isExpired: boolean;
  /** True if event_time could not be parsed as a date. */
  isInvalid: boolean;
}

export interface CountdownProps {
  /** ISO 8601 string, e.g. "2026-12-31T23:59:59Z" (a Date is also accepted). */
  event_time: string | Date;
  /** Render prop that receives the live countdown. */
  children?: (countdown: CountdownValue) => ReactNode;
  /** Fires once when the countdown reaches zero. */
  onComplete?: () => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

function compute(target: number, now: number): CountdownValue {
  if (Number.isNaN(target)) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
      isExpired: false,
      isInvalid: true,
    };
  }
  const totalMs = Math.max(0, target - now);
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs,
    isExpired: totalMs === 0,
    isInvalid: false,
  };
}

/** Hook version, if you'd rather not use the render prop. */
export function useCountdown(
  workshop_time: string | Date,
  onComplete?: () => void,
): CountdownValue {
  const target = new Date(workshop_time).getTime();
  const [countdown, setCountdown] = useState(() => compute(target, Date.now()));

  // Keep the latest callback without restarting the timer.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let completed = false;

    const tick = () => {
      const next = compute(target, Date.now());
      setCountdown(next);

      if (next.isInvalid) return;
      if (next.isExpired) {
        if (!completed) {
          completed = true;
          onCompleteRef.current?.();
        }
        return;
      }
      // Re-align to the next whole-second boundary to avoid drift.
      timeout = setTimeout(tick, next.totalMs % 1000 || 1000);
    };

    tick();
    return () => clearTimeout(timeout);
  }, [target]);

  return countdown;
}

export default function Countdown({
  event_time,
  children,
  onComplete,
}: CountdownProps) {
  const countdown = useCountdown(event_time, onComplete);

  if (children) return <>{children(countdown)}</>;

  // Default rendering when no render prop is supplied.
  if (countdown.isInvalid) return <span role="alert">Invalid event time</span>;
  if (countdown.isExpired) return;

  const { days, hours, minutes, seconds } = countdown;
  return (
    <time role="timer" aria-live="off" dateTime={`P${days}DT${hours}H`}>
      {days}d {pad(hours)}h {pad(minutes)}m
    </time>
  );
}
