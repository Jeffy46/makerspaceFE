import { useMemo, useState } from "react";

import type { AttendeePair as Pair } from "../../interfaces/EventAttendee";
import { BubbleChart } from "./BubbleChart";
import { ListView } from "./ListView";
import { NameFinder } from "./NameFinder";
import { layoutBubbles } from "./bubbleEngine";
import type { Bubble, FocusRequest, ViewMode } from "./bubbleEngine";

export type { FocusRequest, ViewMode };

/* -------------------------------------------------------------------------- */
/*  Leaderboard (bubble / list toggle)                                        */
/* -------------------------------------------------------------------------- */

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
