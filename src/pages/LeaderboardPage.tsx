import { useEffect, useState } from "react";

import { Leaderboard } from "../components";
import type {
  AttendeePair,
  AttendeeStats,
  EventAttendee,
} from "../interfaces/EventAttendee";

const SKY =
  "[background-image:radial-gradient(1px_1px_at_20px_30px,#fff,transparent),radial-gradient(1px_1px_at_140px_90px,rgba(255,255,255,0.8),transparent),radial-gradient(1.5px_1.5px_at_80px_170px,#fff,transparent),radial-gradient(1px_1px_at_210px_140px,rgba(255,255,255,0.7),transparent),radial-gradient(1px_1px_at_260px_40px,#fff,transparent),radial-gradient(circle_at_50%_45%,#21404B_0%,#0E1B22_100%)] " +
  "[background-size:280px_220px,280px_220px,280px_220px,280px_220px,280px_220px,100%_100%]";

// Bigger stars on a larger tile, pulsing slowly
const TWINKLE =
  "pointer-events-none absolute inset-0 animate-pulse motion-reduce:animate-none [animation-duration:5s] " +
  "[background-image:radial-gradient(2px_2px_at_50px_60px,#fff,transparent),radial-gradient(1.5px_1.5px_at_310px_200px,#fde68a,transparent),radial-gradient(2px_2px_at_190px_310px,#fff,transparent),radial-gradient(1.5px_1.5px_at_400px_120px,#bfdbfe,transparent),radial-gradient(2px_2px_at_120px_400px,#fff,transparent)] " +
  "[background-size:470px_430px]";
/** Group attendees by email into [email, displayName, count], highest count first. */
const getAttendeePairs = (attendees: EventAttendee[]): AttendeePair[] => {
  const byEmail = new Map<string, AttendeeStats>();

  for (const attendee of attendees) {
    if (!attendee.email) continue;

    const email = attendee.email.trim().toLowerCase();
    const fullName = [attendee.first_name, attendee.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    const existing = byEmail.get(email);
    if (!existing) {
      byEmail.set(email, { displayName: fullName || email, count: 1 });
      continue;
    }

    existing.count += 1;
    // Upgrade a bare email to a real name if a later row has one
    if (existing.displayName === email && fullName) {
      existing.displayName = fullName;
    }
  }

  return Array.from(
    byEmail,
    ([email, { displayName, count }]) =>
      [email, displayName, count] as AttendeePair,
  ).sort((a, b) => b[2] - a[2]);
};
const useAttendeePairs = () => {
  const [pairs, setPairs] = useState<AttendeePair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/attendees`,
        );
        if (!response.ok) throw new Error("Network response was not ok");
        const attendees = (await response.json()) as EventAttendee[];
        setPairs(getAttendeePairs(attendees));
      } catch (err: unknown) {
        console.error("Error occurred:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return { pairs, setPairs, loading };
};

type DebugWindow = Window & {
  setScore?: (target: number | string, score: number) => void;
};

const LeaderboardPage = () => {
  const { pairs, setPairs, loading } = useAttendeePairs();

  // Dev-only console helper: setScore(0, 50) or setScore("jane", 50)
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const debugWindow = window as DebugWindow;

    debugWindow.setScore = (target, score) => {
      setPairs((prev) =>
        prev.map((pair, i) => {
          const isMatch =
            typeof target === "number"
              ? i === target
              : pair[1].toLowerCase().includes(target.toLowerCase());
          return isMatch ? [pair[0], pair[1], score] : pair;
        }),
      );
    };

    return () => {
      delete debugWindow.setScore;
    };
  }, [setPairs]);

  return (
    <main
      aria-busy={loading}
      className={`relative h-[95dvh] min-h-80 w-full overflow-hidden ${SKY}`}
    >
      <div aria-hidden className={TWINKLE} />
      {!loading &&
        (pairs.length > 0 ? (
          <Leaderboard pairs={pairs} />
        ) : (
          <p className="p-6 text-white/70">No attendees found.</p>
        ))}
    </main>
  );
};

export default LeaderboardPage;
