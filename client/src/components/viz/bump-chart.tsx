/**
 * BumpChart -- Rank-Based Competitive Position Chart
 *
 * Shows rank shifts over time for multiple competitors. Y-axis is inverted
 * (rank 1 at top). Highlighted brand line rendered with thicker stroke.
 *
 * @see ranking-utils.ts for data conversion
 */

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";
import { BRAND_CATEGORICAL_SCALE } from "@/lib/viz/color-scales";
import { CHART_THEME } from "@/lib/chart-theme";
import type { BumpSeries } from "@/lib/viz/ranking-utils";

// ============================================================================
// TYPES
// ============================================================================

interface BumpChartProps {
  data: BumpSeries[];
  highlightLabel?: string;
  width?: number;
  height?: number;
  className?: string;
}

interface TooltipState {
  x: number;
  y: number;
  label: string;
  period: string;
  rank: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BumpChart({
  data,
  highlightLabel,
  width: propWidth,
  height: propHeight,
  className,
}: BumpChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: propWidth ?? 700, height: propHeight ?? 400 });
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  // Responsive sizing
  useEffect(() => {
    if (propWidth && propHeight) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: propWidth ?? entry.contentRect.width,
          height: propHeight ?? Math.max(entry.contentRect.height, 200),
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [propWidth, propHeight]);

  const { width, height } = dimensions;
  const margin = { top: 28, right: 100, bottom: 32, left: 40 };
  const innerWidth = Math.max(width - margin.left - margin.right, 100);
  const innerHeight = Math.max(height - margin.top - margin.bottom, 60);

  // Periods and rank extent
  const periods = useMemo(() => {
    if (data.length === 0) return [];
    return data[0].values.map((v) => v.period);
  }, [data]);

  const maxRank = useMemo(() => {
    return Math.max(...data.flatMap((s) => s.values.map((v) => v.rank)), data.length);
  }, [data]);

  // Scales
  const xScale = useMemo(() => {
    return d3.scalePoint<string>().domain(periods).range([0, innerWidth]).padding(0.1);
  }, [periods, innerWidth]);

  const yScale = useMemo(() => {
    return d3.scaleLinear().domain([1, maxRank]).range([0, innerHeight]);
  }, [maxRank, innerHeight]);

  // Line generator
  const lineGenerator = useMemo(() => {
    return d3
      .line<{ period: string; rank: number }>()
      .x((d) => xScale(d.period) ?? 0)
      .y((d) => yScale(d.rank))
      .curve(d3.curveMonotoneX);
  }, [xScale, yScale]);

  const hasHover = hoveredLabel !== null;

  const handleDotEnter = useCallback(
    (label: string, period: string, rank: number, event: React.MouseEvent) => {
      setHoveredLabel(label);
      const x = (xScale(period) ?? 0) + margin.left;
      const y = yScale(rank) + margin.top;
      setTooltip({ x, y: y - 14, label, period, rank });
    },
    [xScale, yScale, margin.left, margin.top],
  );

  const handleDotLeave = useCallback(() => {
    setHoveredLabel(null);
    setTooltip(null);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative w-full min-h-[200px]", className)}>
      <svg width={width} height={height} className="overflow-visible">
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Grid lines */}
          {Array.from({ length: maxRank }, (_, i) => i + 1).map((rank) => (
            <line
              key={`grid-${rank}`}
              x1={0}
              y1={yScale(rank)}
              x2={innerWidth}
              y2={yScale(rank)}
              stroke="#27272a"
              strokeDasharray="3 3"
              strokeOpacity={0.3}
            />
          ))}

          {/* Y axis labels (rank numbers) */}
          {Array.from({ length: maxRank }, (_, i) => i + 1).map((rank) => (
            <text
              key={`rank-${rank}`}
              x={-12}
              y={yScale(rank)}
              dy="0.35em"
              textAnchor="end"
              fill={CHART_THEME.text.axisLabel.fill}
              fontSize={CHART_THEME.text.axisLabel.fontSize}
              fontFamily={CHART_THEME.text.fontFamily}
            >
              #{rank}
            </text>
          ))}

          {/* X axis labels (periods) */}
          {periods.map((period) => (
            <text
              key={`period-${period}`}
              x={xScale(period) ?? 0}
              y={innerHeight + 20}
              textAnchor="middle"
              fill={CHART_THEME.text.axisLabel.fill}
              fontSize={CHART_THEME.text.axisLabel.fontSize}
              fontFamily={CHART_THEME.text.fontFamily}
            >
              {period}
            </text>
          ))}

          {/* Lines */}
          {data.map((series, i) => {
            const isHighlight = series.label === highlightLabel;
            const color = BRAND_CATEGORICAL_SCALE[i % BRAND_CATEGORICAL_SCALE.length];
            const isHovered = hoveredLabel === series.label;
            const lineOpacity = hasHover ? (isHovered ? 1 : 0.15) : isHighlight ? 1 : 0.7;
            const sw = isHighlight ? 4 : isHovered ? 3 : 1.5;
            const pathD = lineGenerator(series.values);

            return (
              <g key={`line-${series.label}`}>
                <path
                  d={pathD ?? undefined}
                  fill="none"
                  stroke={color}
                  strokeWidth={sw}
                  strokeOpacity={lineOpacity}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  style={{ transition: "stroke-opacity 200ms ease-out, stroke-width 200ms ease-out" }}
                />
                {/* Dots at each intersection */}
                {series.values.map((v) => (
                  <circle
                    key={`dot-${series.label}-${v.period}`}
                    cx={xScale(v.period) ?? 0}
                    cy={yScale(v.rank)}
                    r={isHighlight ? 5 : 3.5}
                    fill={color}
                    fillOpacity={lineOpacity}
                    stroke="#0a0a0b"
                    strokeWidth={1.5}
                    style={{ cursor: "pointer", transition: "fill-opacity 200ms ease-out" }}
                    onMouseEnter={(e) => handleDotEnter(series.label, v.period, v.rank, e)}
                    onMouseLeave={handleDotLeave}
                  />
                ))}
                {/* End label */}
                {series.values.length > 0 && (
                  <text
                    x={innerWidth + 8}
                    y={yScale(series.values[series.values.length - 1].rank)}
                    dy="0.35em"
                    fill={color}
                    fontSize={isHighlight ? 12 : 11}
                    fontWeight={isHighlight ? 600 : 400}
                    fontFamily={CHART_THEME.text.fontFamily}
                    opacity={hasHover ? (isHovered ? 1 : 0.3) : 1}
                    style={{ transition: "opacity 200ms ease-out" }}
                  >
                    {series.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Tooltip */}
        {tooltip && (
          <g transform={`translate(${tooltip.x},${tooltip.y})`}>
            <rect
              x={-60}
              y={-28}
              width={120}
              height={28}
              rx={6}
              fill="rgba(10, 10, 11, 0.95)"
              stroke="#27272a"
            />
            <text x={0} y={-10} textAnchor="middle" fill="#fafafa" fontSize={12} fontFamily={CHART_THEME.text.fontFamily}>
              {tooltip.label} - #{tooltip.rank} ({tooltip.period})
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
