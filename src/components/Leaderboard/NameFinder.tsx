import { useMemo, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import type { Bubble } from "./bubbleEngine";

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

export const NameFinder = ({ bubbles, onSelect }: NameFinderProps) => {
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
