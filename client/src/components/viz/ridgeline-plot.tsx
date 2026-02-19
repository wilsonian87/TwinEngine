/**
 * RidgelinePlot -- D3 KDE + Stacked Area Curves
 *
 * Displays overlapping distribution curves for multiple groups,
 * stacked vertically. Uses kernel density estimation for smooth curves.
 *
 * @see distribution-utils.ts for KDE implementation
 */

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";
import { BRAND_SEQUENTIAL_SCALE } from "@/lib/viz/color-scales";
import { CHART_THEME } from "@/lib/chart-theme";
import { kernelDensityEstimation } from "@/lib/viz/distribution-utils";

// ============================================================================
// TYPES
// ============================================================================

export interface RidgelineGroup {
  label: string;
  values: number[];
}

interface RidgelinePlotProps {
  data: RidgelineGroup[];
  width?: number;
  height?: number;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RidgelinePlot({
  data,
  width: propWidth,
  height: propHeight,
  className,
}: RidgelinePlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: propWidth ?? 700, height: propHeight ?? 400 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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
  const margin = { top: 20, right: 24, bottom: 32, left: 100 };
  const innerWidth = Math.max(width - margin.left - margin.right, 100);
  const innerHeight = Math.max(height - margin.top - margin.bottom, 60);

  // Compute KDE for each group and shared scales
  const { curves, xScale, overlapHeight } = useMemo(() => {
    if (data.length === 0) return { curves: [], xScale: d3.scaleLinear(), overlapHeight: 0 };

    // Global x domain across all groups
    const allValues = data.flatMap((g) => g.values);
    const xMin = Math.min(...allValues);
    const xMax = Math.max(...allValues);

    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerWidth]).nice();

    // KDE for each group
    const kdes = data.map((g) => kernelDensityEstimation(g.values));

    // Max density for y scaling within each ridge
    const maxDensity = Math.max(...kdes.flatMap((kde) => kde.map(([, d]) => d)), 0.001);

    // Height per ridge, with overlap
    const ridgeSpacing = innerHeight / data.length;
    const overlapHeight = ridgeSpacing * 1.8; // Allow 80% overlap

    const curves = kdes.map((kde, i) => {
      const yScale = d3.scaleLinear().domain([0, maxDensity]).range([0, overlapHeight]);

      const points = kde.map(([x, density]): [number, number] => [
        xScale(x),
        yScale(density),
      ]);

      return {
        label: data[i].label,
        points,
        baseY: i * ridgeSpacing,
        color: BRAND_SEQUENTIAL_SCALE[
          Math.min(2 + Math.floor(i * 3 / Math.max(data.length, 1)), BRAND_SEQUENTIAL_SCALE.length - 1)
        ],
      };
    });

    return { curves, xScale, overlapHeight };
  }, [data, innerWidth, innerHeight]);

  // Area generator
  const areaPath = useCallback(
    (points: [number, number][], baseY: number): string => {
      if (points.length === 0) return "";

      const area = d3
        .area<[number, number]>()
        .x((d) => d[0])
        .y0(baseY)
        .y1((d) => baseY - d[1])
        .curve(d3.curveBasis);

      return area(points) ?? "";
    },
    [],
  );

  const linePath = useCallback(
    (points: [number, number][], baseY: number): string => {
      if (points.length === 0) return "";

      const line = d3
        .line<[number, number]>()
        .x((d) => d[0])
        .y((d) => baseY - d[1])
        .curve(d3.curveBasis);

      return line(points) ?? "";
    },
    [],
  );

  const hasHover = hoveredIndex !== null;
  const ticks = xScale.ticks(6);

  return (
    <div ref={containerRef} className={cn("relative w-full min-h-[200px]", className)}>
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          {curves.map((curve, i) => (
            <linearGradient key={`ridge-grad-${i}`} id={`ridge-grad-${i}`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#6b21a8" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#a855f7" stopOpacity={0.4} />
            </linearGradient>
          ))}
        </defs>

        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* X axis */}
          <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke="#27272a" strokeWidth={1} />
          {ticks.map((t) => (
            <g key={t} transform={`translate(${xScale(t)},${innerHeight})`}>
              <line y1={0} y2={5} stroke="#27272a" />
              <text
                y={18}
                textAnchor="middle"
                fill={CHART_THEME.text.axisLabel.fill}
                fontSize={CHART_THEME.text.axisLabel.fontSize}
                fontFamily={CHART_THEME.text.fontFamily}
              >
                {t}
              </text>
            </g>
          ))}

          {/* Ridges (render bottom-to-top so later groups overlay earlier) */}
          {curves.map((curve, i) => {
            const highlighted = !hasHover || hoveredIndex === i;
            return (
              <g
                key={`ridge-${i}`}
                style={{ transition: "opacity 200ms ease-out" }}
                opacity={highlighted ? 1 : 0.2}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Fill */}
                <path
                  d={areaPath(curve.points, curve.baseY)}
                  fill={`url(#ridge-grad-${i})`}
                  style={{ cursor: "pointer" }}
                />
                {/* Stroke */}
                <path
                  d={linePath(curve.points, curve.baseY)}
                  fill="none"
                  stroke={curve.color}
                  strokeWidth={1.5}
                  style={{ cursor: "pointer" }}
                />
                {/* Label */}
                <text
                  x={-8}
                  y={curve.baseY}
                  textAnchor="end"
                  dy="0.35em"
                  fill={CHART_THEME.text.fill}
                  fontSize={CHART_THEME.text.fontSize}
                  fontFamily={CHART_THEME.text.fontFamily}
                >
                  {curve.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
