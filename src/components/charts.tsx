"use client";

// Small hand-rolled chart primitives — donut, pie, bar, line — built against the palette
// validated by the dataviz skill's scripts/validate_palette.js (categorical + status ramps).
// No fabricated data: every consumer passes real, already-fetched numbers.
import { useId, useState } from "react";

export interface ChartDatum {
  label: string;
  value: number;
  color: string;
}

function formatValue(value: number, valueFormatter?: (n: number) => string) {
  return valueFormatter ? valueFormatter(value) : value.toLocaleString("en-IN");
}

interface LegendProps {
  data: ChartDatum[];
  activeIndex: number | null;
  onHover: (index: number | null) => void;
  valueFormatter?: (n: number) => string;
}

function ChartLegend({ data, activeIndex, onHover, valueFormatter }: Readonly<LegendProps>) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <ul className="mt-3 flex flex-col gap-1.5">
      {data.map((d, i) => (
        <li
          key={d.label}
          onMouseEnter={() => onHover(i)}
          onMouseLeave={() => onHover(null)}
          className={`flex items-center justify-between gap-3 rounded-md px-1.5 py-1 text-xs transition-colors ${activeIndex === i ? "bg-surface-container-high" : ""}`}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="truncate text-on-surface-variant">{d.label}</span>
          </span>
          <span className="shrink-0 font-medium text-on-surface tabular-nums">
            {formatValue(d.value, valueFormatter)}
            {total > 0 && <span className="ml-1 text-on-surface-variant">({Math.round((d.value / total) * 100)}%)</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

interface DonutOrPieChartProps {
  data: ChartDatum[];
  variant?: "donut" | "pie";
  valueFormatter?: (n: number) => string;
  emptyLabel?: string;
}

// Shared arc-chart renderer for both the donut and the pie — same geometry, the donut just
// carves a hole out of the middle for a headline total.
export function DonutChart({ data, variant = "donut", valueFormatter, emptyLabel = "No data yet" }: Readonly<DonutOrPieChartProps>) {
  const gradientId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = 42;
  const cx = 50;
  const cy = 50;
  const innerRadius = variant === "donut" ? 26 : 0;
  const gapDeg = 2; // 2px-equivalent surface gap between segments, in degrees

  if (total <= 0) {
    return <div className="grid h-[180px] place-items-center text-sm text-on-surface-variant">{emptyLabel}</div>;
  }

  const segments = data
    .filter((d) => d.value > 0)
    .reduce<Array<ChartDatum & { start: number; end: number; index: number }>>((acc, d, i) => {
      const cursor = -90 + acc.reduce((sum, seg) => sum + (seg.end - seg.start + gapDeg), 0); // start at 12 o'clock
      const sweep = (d.value / total) * 360;
      acc.push({ ...d, start: cursor + gapDeg / 2, end: cursor + sweep - gapDeg / 2, index: i });
      return acc;
    }, []);

  function arcPath(startDeg: number, endDeg: number) {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const clampedEnd = Math.max(endDeg, startDeg + 0.01);
    const x1 = cx + radius * Math.cos(toRad(startDeg));
    const y1 = cy + radius * Math.sin(toRad(startDeg));
    const x2 = cx + radius * Math.cos(toRad(clampedEnd));
    const y2 = cy + radius * Math.sin(toRad(clampedEnd));
    const largeArc = clampedEnd - startDeg > 180 ? 1 : 0;
    if (innerRadius === 0) {
      return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    }
    const ix1 = cx + innerRadius * Math.cos(toRad(startDeg));
    const iy1 = cy + innerRadius * Math.sin(toRad(startDeg));
    const ix2 = cx + innerRadius * Math.cos(toRad(clampedEnd));
    const iy2 = cy + innerRadius * Math.sin(toRad(clampedEnd));
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
  }

  const active = activeIndex !== null ? segments[activeIndex] : null;

  return (
    <div>
      <div className="relative">
        <svg viewBox="0 0 100 100" className="mx-auto h-[160px] w-[160px]" role="img" aria-label={`${variant} chart of ${data.map((d) => d.label).join(", ")}`}>
          <defs>
            <clipPath id={gradientId}><circle cx={cx} cy={cy} r={radius} /></clipPath>
          </defs>
          {segments.map((seg) => (
            <path
              key={seg.label}
              d={arcPath(seg.start, seg.end)}
              fill={seg.color}
              opacity={activeIndex === null || activeIndex === seg.index ? 1 : 0.35}
              className="transition-opacity duration-150"
              onMouseEnter={() => setActiveIndex(seg.index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <title>{`${seg.label}: ${formatValue(seg.value, valueFormatter)}`}</title>
            </path>
          ))}
        </svg>
        {variant === "donut" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="font-display text-xl font-bold text-on-surface">{active ? formatValue(active.value, valueFormatter) : formatValue(total, valueFormatter)}</p>
              <p className="text-[10px] text-on-surface-variant">{active ? active.label : "Total"}</p>
            </div>
          </div>
        )}
      </div>
      <ChartLegend data={data} activeIndex={activeIndex} onHover={setActiveIndex} valueFormatter={valueFormatter} />
    </div>
  );
}

interface BarChartProps {
  data: ChartDatum[];
  valueFormatter?: (n: number) => string;
  emptyLabel?: string;
}

export function BarChart({ data, valueFormatter, emptyLabel = "No data yet" }: Readonly<BarChartProps>) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 0);

  if (max <= 0) {
    return <div className="grid h-[180px] place-items-center text-sm text-on-surface-variant">{emptyLabel}</div>;
  }

  return (
    <div>
      <div className="flex h-[160px] items-end gap-3 px-1">
        {data.map((d, i) => {
          const heightPct = Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0);
          return (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[11px] font-medium text-on-surface tabular-nums">{formatValue(d.value, valueFormatter)}</span>
              <div className="flex h-full w-full items-end">
                <div
                  role="img"
                  aria-label={`${d.label}: ${formatValue(d.value, valueFormatter)}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className="w-full rounded-t-[4px] transition-opacity duration-150"
                  style={{ height: `${heightPct}%`, backgroundColor: d.color, opacity: activeIndex === null || activeIndex === i ? 1 : 0.35, minHeight: d.value > 0 ? 4 : 0 }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-3 px-1">
        {data.map((d) => (
          <span key={d.label} className="flex-1 truncate text-center text-[10px] text-on-surface-variant">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

interface LinePoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: LinePoint[];
  color?: string;
  valueFormatter?: (n: number) => string;
  emptyLabel?: string;
}

// Single-series line — no legend needed (skill: "a single series needs no legend box, the
// title names it"). Markers only at the endpoints and the hovered point to keep a dense
// series legible.
export function LineChart({ data, color = "#2a78d6", valueFormatter, emptyLabel = "No data yet" }: Readonly<LineChartProps>) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const width = 300;
  const height = 120;
  const padX = 8;
  const padY = 14;

  if (data.length === 0) {
    return <div className="grid h-[160px] place-items-center text-sm text-on-surface-variant">{emptyLabel}</div>;
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;

  const points = data.map((d, i) => {
    const x = data.length === 1 ? width / 2 : padX + (i / (data.length - 1)) * (width - padX * 2);
    const y = height - padY - ((d.value - min) / span) * (height - padY * 2);
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const zeroY = height - padY - ((0 - min) / span) * (height - padY * 2);
  const areaPath = `${linePath} L ${points[points.length - 1]!.x.toFixed(1)} ${zeroY.toFixed(1)} L ${points[0]!.x.toFixed(1)} ${zeroY.toFixed(1)} Z`;
  const active = activeIndex !== null ? points[activeIndex] : null;

  return (
    <div>
      <div className="flex items-baseline justify-between px-1">
        <p className="font-display text-xl font-bold text-on-surface">{formatValue(active ? active.value : (points[points.length - 1]?.value ?? 0), valueFormatter)}</p>
        <p className="text-[11px] text-on-surface-variant">{active ? active.label : (points[points.length - 1]?.label ?? "")}</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-1 h-[120px] w-full" preserveAspectRatio="none" role="img" aria-label="Line chart">
        <line x1={0} y1={zeroY} x2={width} y2={zeroY} stroke="#e1e0d9" strokeWidth={1} />
        <path d={areaPath} fill={color} opacity={0.12} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => {
          const isEndpoint = i === 0 || i === points.length - 1;
          const isActive = activeIndex === i;
          if (!isEndpoint && !isActive) {
            return (
              <circle key={i} cx={p.x} cy={p.y} r={7} fill="transparent" onMouseEnter={() => setActiveIndex(i)} onMouseLeave={() => setActiveIndex(null)} />
            );
          }
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={isActive ? 4 : 3}
              fill={color}
              stroke="#fcfcfb"
              strokeWidth={1.5}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <title>{`${p.label}: ${formatValue(p.value, valueFormatter)}`}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}
