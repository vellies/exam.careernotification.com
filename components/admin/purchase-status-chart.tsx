"use client";

import { useState } from "react";

type Segment = {
  key: string;
  label: string;
  count: number;
  color: string;
};

export function PurchaseStatusChart({ segments }: { segments: Segment[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = segments.reduce((sum, s) => sum + s.count, 0);

  if (total === 0) {
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        No purchase requests yet.
      </p>
    );
  }

  let cursor = 0;
  const positioned = segments
    .filter((s) => s.count > 0)
    .map((s) => {
      const pct = (s.count / total) * 100;
      const startPct = cursor;
      cursor += pct;
      return { ...s, pct, centerPct: startPct + pct / 2 };
    });
  const hoveredSegment = positioned.find((s) => s.key === hovered) ?? null;

  return (
    <div>
      <p className="text-3xl font-bold tracking-tight text-foreground">{total}</p>
      <p className="text-xs text-muted-foreground">purchase requests, all time</p>

      <div className="relative mt-8 w-full">
        {hoveredSegment ? (
          <div
            className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 -translate-x-1/2 rounded-md border border-border bg-popover px-2 py-1 text-xs whitespace-nowrap shadow-md"
            style={{ left: `${hoveredSegment.centerPct}%` }}
          >
            <p className="font-semibold text-foreground">
              {hoveredSegment.count} {hoveredSegment.label.toLowerCase()}
            </p>
            <p className="text-muted-foreground">
              {Math.round(hoveredSegment.pct)}% of {total}
            </p>
          </div>
        ) : null}

        <div className="flex h-7 w-full overflow-hidden rounded-md">
          {positioned.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className="h-full transition-[filter] focus-visible:outline-none"
              style={{
                width: `${s.pct}%`,
                backgroundColor: s.color,
                marginLeft: i === 0 ? 0 : 2,
                filter: hovered === s.key ? "brightness(1.08)" : undefined,
              }}
              onPointerEnter={() => setHovered(s.key)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(s.key)}
              onBlur={() => setHovered(null)}
              aria-label={`${s.label}: ${s.count} of ${total}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block size-2.5 rounded-[3px]"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-muted-foreground">
              {s.label} <span className="font-medium text-foreground">{s.count}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
