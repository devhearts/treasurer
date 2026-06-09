"use client";

import type { MilestoneItem } from "@/lib/types";
import { formatAmountCompact } from "@/lib/data";

function progressPct(raised: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((raised / target) * 100));
}

const cardBase =
  "flex-shrink-0 w-[8.75rem] sm:w-[9.25rem] snap-start rounded-xl border px-2.5 py-2 text-left transition-colors flex flex-col justify-center min-h-[2.75rem]";

export default function MilestoneCardsRow({
  items,
  selectedId,
  onSelect,
  className = "",
}: {
  items: MilestoneItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className={className}>
      <p className="text-xs text-muted mb-1.5 font-medium">Allocate to</p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory touch-pan-x">
        <button
          type="button"
          aria-pressed={selectedId === null}
          onClick={() => onSelect(null)}
          className={`${cardBase} ${
            selectedId === null
              ? "border-accent bg-accent/10 ring-2 ring-accent/25"
              : "border-muted/30 bg-light hover:bg-muted/10"
          }`}
        >
          <span className="text-sm font-bold text-surface leading-none line-clamp-1">
            Whole event
          </span>
          <span className="text-[11px] text-muted leading-none mt-1 line-clamp-1">
            General fund
          </span>
        </button>
        {items.map((m) => {
          const pct = progressPct(m.raisedAmount, m.targetAmount);
          const active = selectedId === m.id;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={active}
              aria-label={`${m.name}, ${pct} percent, ${formatAmountCompact(m.raisedAmount)} of ${formatAmountCompact(m.targetAmount)}`}
              onClick={() => onSelect(m.id)}
              className={`${cardBase} gap-1 ${
                active
                  ? "border-accent bg-accent/10 ring-2 ring-accent/25"
                  : "border-muted/30 bg-light hover:bg-muted/10"
              }`}
            >
              {/* Line 1: name + % */}
              <div className="flex items-baseline justify-between gap-1 min-w-0 leading-none">
                <span className="text-sm font-bold text-surface line-clamp-1 min-w-0 flex-1 text-left">
                  {m.name}
                </span>
                <span
                  className="text-[11px] font-semibold tabular-nums flex-shrink-0 text-accent"
                  aria-label={`${pct} percent toward goal`}
                >
                  {pct}%
                </span>
              </div>
              {/* Line 2: bar + compact amounts */}
              <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                <div
                  className="flex-1 min-w-[1.75rem] h-1 rounded-full bg-muted/35 overflow-hidden"
                  role="presentation"
                >
                  <div
                    className="h-full rounded-full bg-accent min-w-0 transition-[width]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[11px] text-muted tabular-nums flex-shrink-0 whitespace-nowrap leading-none">
                  {formatAmountCompact(m.raisedAmount)}/{formatAmountCompact(m.targetAmount)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
