"use client";

import { useRef, useState } from "react";

type Point = { date: string; count: number };

const WIDTH = 640;
const HEIGHT = 200;
const PAD_LEFT = 32;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;
const PLOT_W = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM;

function niceMax(max: number) {
  if (max <= 0) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const norm = max / step;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return niceNorm * step;
}

function formatDay(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function SignupsChart({ data }: { data: Point[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const max = niceMax(Math.max(...data.map((d) => d.count), 0));
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];

  const xFor = (i: number) =>
    data.length > 1 ? PAD_LEFT + (i / (data.length - 1)) * PLOT_W : PAD_LEFT + PLOT_W / 2;
  const yFor = (v: number) => PAD_TOP + PLOT_H - (v / max) * PLOT_H;

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(d.count)}`)
    .join(" ");
  const areaPath = `${linePath} L${xFor(data.length - 1)},${PAD_TOP + PLOT_H} L${xFor(0)},${PAD_TOP + PLOT_H} Z`;

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < data.length; i++) {
      const dist = Math.abs(xFor(i) - relX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    }
    setHoverIndex(nearest);
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div>
      <p className="text-3xl font-bold tracking-tight text-foreground">{total}</p>
      <p className="text-xs text-muted-foreground">new students in the last {data.length} days</p>

      <div className="relative mt-3">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full touch-none"
          role="img"
          aria-label={`New student signups over the last ${data.length} days, totaling ${total}`}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={yFor(t)}
                y2={yFor(t)}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 6}
                y={yFor(t)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[9px]"
              >
                {Math.round(t)}
              </text>
            </g>
          ))}

          {data.map((d, i) =>
            i % Math.ceil(data.length / 6) === 0 ? (
              <text
                key={d.date}
                x={xFor(i)}
                y={HEIGHT - 8}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px]"
              >
                {formatDay(d.date)}
              </text>
            ) : null,
          )}

          <path d={areaPath} fill="#2563eb" opacity={0.1} stroke="none" />
          <path d={linePath} fill="none" stroke="#2563eb" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {data.length > 0 ? (
            <circle
              cx={xFor(data.length - 1)}
              cy={yFor(data[data.length - 1].count)}
              r={4}
              fill="#2563eb"
              stroke="var(--card)"
              strokeWidth={2}
            />
          ) : null}

          {hoverIndex !== null ? (
            <g>
              <line
                x1={xFor(hoverIndex)}
                x2={xFor(hoverIndex)}
                y1={PAD_TOP}
                y2={PAD_TOP + PLOT_H}
                className="stroke-border"
                strokeWidth={1}
              />
              <circle
                cx={xFor(hoverIndex)}
                cy={yFor(data[hoverIndex].count)}
                r={4}
                fill="#2563eb"
                stroke="var(--card)"
                strokeWidth={2}
              />
            </g>
          ) : null}
        </svg>

        {hovered ? (
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border border-border bg-popover px-2 py-1 text-xs shadow-md"
            style={{
              left: `${(xFor(hoverIndex!) / WIDTH) * 100}%`,
            }}
          >
            <p className="font-semibold text-foreground">{hovered.count} signup{hovered.count === 1 ? "" : "s"}</p>
            <p className="text-muted-foreground">{formatDay(hovered.date)}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
