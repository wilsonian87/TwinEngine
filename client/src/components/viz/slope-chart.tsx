/**
 * SlopeChart -- Connected Dot Plot for Cohort Comparison
 *
 * SVG-based slope chart comparing two audiences across multiple metrics.
 * Uses Framer Motion pathLength for animated line drawing on mount.
 *
 * @see OMNIVOR-VIZ-ROADMAP.md VIZ-2
 */

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import * as d3 from "d3";
import { cn } from "@/lib/utils";
import { BRAND_CONFIG } from "@/lib/brand-config";
import { CHART_THEME } from "@/lib/chart-theme";
import { MOTION_DURATION, MOTION_EASING } from "@/lib/motion-config";

// ============================================================================
// TYPES
// ============================================================================

export interface SlopeMetric {
  label: string;
  valueA: number;
  valueB: number;
}

interface SlopeChartProps {
  data: SlopeMetric[];
  labelA?: string;
  labelB?: string;
  width?: number;
  height?: number;
  className?: string;
}

interface TooltipState {
  x: number;
  y: number;
  metric: SlopeMetric;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TIE_THRESHOLD = 0.05; // 5% difference = tie
const PURPLE = BRAND_CONFIG.colors.consumptionPurple;
const GOLD = BRAND_CONFIG.colors.catalystGold;
const GRAY = BRAND_CONFIG.colors.dataGray;

// ============================================================================
// COMPONENT
// ============================================================================

export function SlopeChart({
  data,
  labelA = "Audience A",
  labelB = "Audience B",
  width: propWidth,
  height: propHeight,
  className,
}: SlopeChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [dimensions, setDimensions] = useState({ width: propWidth ?? 500, height: propHeight ?? 400 });
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

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
  const margin = { top: 36, right: 80, bottom: 16, left: 80 };
  const innerWidth = Math.max(width - margin.left - margin.right, 60);
  const innerHeight = Math.max(height - margin.top - margin.bottom, 60);

  // Y scale for metrics (one row per metric)
  const yScale = useMemo(() => {
    return d3
      .scalePoint<number>()
      .domain(data.map((_, i) => i))
      .range([0, innerHeight])
      .padding(0.5);
  }, [data, innerHeight]);

  // X positions for left and right columns
  const xLeft = 0;
  const xRight = innerWidth;

  // Value scales per metric (shared min/max across both values)
  const valueScales = useMemo(() => {
    return data.map((metric) => {
      const min = Math.min(metric.valueA, metric.valueB);
      const max = Math.max(metric.valueA, metric.valueB);
      const pad = (max - min) * 0.1 || 1;
      return { min: min - pad, max: max + pad };
    });
  }, [data]);

  // Determine line color based on slope direction
  const getLineColor = useCallback((metric: SlopeMetric): string => {
    const maxVal = Math.max(Math.abs(metric.valueA), Math.abs(metric.valueB), 0.001);
    const delta = Math.abs(metric.valueB - metric.valueA) / maxVal;
    if (delta < TIE_THRESHOLD) return GRAY;
    return metric.valueB > metric.valueA ? GOLD : PURPLE;
  }, []);

  const handleLineEnter = useCallback(
    (metric: SlopeMetric, y: number, event: React.MouseEvent) => {
      setTooltip({ x: innerWidth / 2 + margin.left, y: y + margin.top - 12, metric });
    },
    [innerWidth, margin.left, margin.top],
  );

  const handleLineLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative w-full min-h-[200px]", className)}>
      <svg width={width} height={height} className="overflow-visible">
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Column headers */}
          <text
            x={xLeft}
            y={-16}
            textAnchor="middle"
            fill={CHART_THEME.text.valueLabel.fill}
            fontSize={13}
            fontWeight={CHART_THEME.text.valueLabel.fontWeight}
            fontFamily={CHART_THEME.text.fontFamily}
          >
            {labelA}
          </text>
          <text
            x={xRight}
            y={-16}
            textAnchor="middle"
            fill={CHART_THEME.text.valueLabel.fill}
            fontSize={13}
            fontWeight={CHART_THEME.text.valueLabel.fontWeight}
            fontFamily={CHART_THEME.text.fontFamily}
          >
            {labelB}
          </text>

          {/* Metric rows */}
          {data.map((metric, i) => {
            const y = yScale(i) ?? 0;
            const color = getLineColor(metric);
            const delta = metric.valueB - metric.valueA;
            const pctDelta = metric.valueA !== 0
              ? ((delta / Math.abs(metric.valueA)) * 100).toFixed(1)
              : "N/A";

            return (
              <g
                key={`slope-${i}`}
                onMouseEnter={(e) => handleLineEnter(metric, y, e)}
                onMouseLeave={handleLineLeave}
                style={{ cursor: "pointer" }}
              >
                {/* Connecting line */}
                <motion.line
                  x1={xLeft}
                  y1={y}
                  x2={xRight}
                  y2={y}
                  stroke={color}
                  strokeWidth={2}
                  strokeOpacity={0.7}
                  initial={shouldReduceMotion ? false : { pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    pathLength: { duration: MOTION_DURATION.hero, ease: MOTION_EASING.out, delay: i * 0.06 },
                    opacity: { duration: MOTION_DURATION.ui, delay: i * 0.06 },
                  }}
                />

                {/* Left dot */}
                <motion.circle
                  cx={xLeft}
                  cy={y}
                  r={5}
                  fill={color}
                  initial={shouldReduceMotion ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: MOTION_DURATION.ui, delay: i * 0.06 }}
                />
                {/* Left value */}
                <text
                  x={xLeft - 12}
                  y={y}
                  dy="0.35em"
                  textAnchor="end"
                  fill={CHART_THEME.text.fill}
                  fontSize={12}
                  fontFamily={CHART_THEME.text.fontFamily}
                >
                  {metric.valueA.toLocaleString()}
                </text>

                {/* Right dot */}
                <motion.circle
                  cx={xRight}
                  cy={y}
                  r={5}
                  fill={color}
                  initial={shouldReduceMotion ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: MOTION_DURATION.ui, delay: i * 0.06 + 0.3 }}
                />
                {/* Right value */}
                <text
                  x={xRight + 12}
                  y={y}
                  dy="0.35em"
                  textAnchor="start"
                  fill={CHART_THEME.text.fill}
                  fontSize={12}
                  fontFamily={CHART_THEME.text.fontFamily}
                >
                  {metric.valueB.toLocaleString()}
                </text>

                {/* Metric label (centered) */}
                <text
                  x={innerWidth / 2}
                  y={y - 12}
                  textAnchor="middle"
                  fill={CHART_THEME.text.axisLabel.fill}
                  fontSize={11}
                  fontFamily={CHART_THEME.text.fontFamily}
                >
                  {metric.label}
                </text>
              </g>
            );
          })}
        </g>

        {/* Tooltip */}
        {tooltip && (
          <g transform={`translate(${tooltip.x},${tooltip.y})`}>
            <rect
              x={-80}
              y={-28}
              width={160}
              height={28}
              rx={6}
              fill="rgba(10, 10, 11, 0.95)"
              stroke="#27272a"
            />
            <text x={0} y={-10} textAnchor="middle" fill="#fafafa" fontSize={12} fontFamily={CHART_THEME.text.fontFamily}>
              {tooltip.metric.label}: {(tooltip.metric.valueB - tooltip.metric.valueA) >= 0 ? "+" : ""}
              {(tooltip.metric.valueB - tooltip.metric.valueA).toLocaleString()}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
