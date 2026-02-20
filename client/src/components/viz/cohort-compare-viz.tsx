/**
 * Cohort Compare Viz — Radar Duel + Metric Scoreboard
 *
 * Overlaid radar chart for gestalt shape comparison of two cohorts,
 * plus a colored metric scoreboard with background bars and winner indicators.
 *
 * @see OMNIVOR-VIZ-ROADMAP.md
 */

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface CohortData {
  name: string;
  color?: string;
  metrics: Record<string, number>;
}

export interface CohortCompareVizProps {
  cohortA: CohortData;
  cohortB: CohortData;
  metricLabels?: Record<string, string>;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_COLOR_A = "#7C3AED";
const DEFAULT_COLOR_B = "#F59E0B";
const COLOR_POSITIVE = "#10B981";
const COLOR_NEGATIVE = "#EF4444";

type SortColumn = "label" | "a" | "b" | "delta";
type SortDir = "asc" | "desc";

// ============================================================================
// HELPERS
// ============================================================================

interface MetricRow {
  key: string;
  label: string;
  a: number;
  b: number;
  delta: number;
  absDelta: number;
  winner: "a" | "b" | "tie";
}

function buildRows(
  cohortA: CohortData,
  cohortB: CohortData,
  metricLabels?: Record<string, string>,
): MetricRow[] {
  const keySet: Record<string, true> = {};
  for (const k of Object.keys(cohortA.metrics)) keySet[k] = true;
  for (const k of Object.keys(cohortB.metrics)) keySet[k] = true;
  const keys = Object.keys(keySet);

  const rows: MetricRow[] = [];
  for (const key of keys) {
    const a = cohortA.metrics[key] ?? 0;
    const b = cohortB.metrics[key] ?? 0;
    const delta = a - b;
    rows.push({
      key,
      label: metricLabels?.[key] ?? key,
      a,
      b,
      delta,
      absDelta: Math.abs(delta),
      winner: delta > 0 ? "a" : delta < 0 ? "b" : "tie",
    });
  }
  return rows;
}

function sortRows(rows: MetricRow[], col: SortColumn, dir: SortDir): MetricRow[] {
  const sorted = [...rows];
  sorted.sort((x, y) => {
    let cmp = 0;
    switch (col) {
      case "label":
        cmp = x.label.localeCompare(y.label);
        break;
      case "a":
        cmp = x.a - y.a;
        break;
      case "b":
        cmp = x.b - y.b;
        break;
      case "delta":
        cmp = x.absDelta - y.absDelta;
        break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </div>
  );
}

interface SortHeaderProps {
  label: string;
  column: SortColumn;
  active: SortColumn;
  dir: SortDir;
  onClick: (col: SortColumn) => void;
  className?: string;
}

function SortHeader({ label, column, active, dir, onClick, className }: SortHeaderProps) {
  const isActive = active === column;
  return (
    <button
      type="button"
      onClick={() => onClick(column)}
      className={cn(
        "flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors",
        className,
      )}
    >
      {label}
      {isActive && (
        <span className="text-foreground/60">{dir === "desc" ? "\u25BC" : "\u25B2"}</span>
      )}
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CohortCompareViz({
  cohortA,
  cohortB,
  metricLabels,
  className,
}: CohortCompareVizProps) {
  const colorA = cohortA.color ?? DEFAULT_COLOR_A;
  const colorB = cohortB.color ?? DEFAULT_COLOR_B;

  // Sort state — default by delta magnitude descending
  const [sortCol, setSortCol] = useState<SortColumn>("delta");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Hovered metric key (for radar highlight)
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const rawRows = useMemo(
    () => buildRows(cohortA, cohortB, metricLabels),
    [cohortA, cohortB, metricLabels],
  );

  const sortedRows = useMemo(
    () => sortRows(rawRows, sortCol, sortDir),
    [rawRows, sortCol, sortDir],
  );

  // Recharts data array
  const radarData = useMemo(() => {
    return rawRows.map((r) => ({
      metric: r.label,
      key: r.key,
      a: r.a,
      b: r.b,
    }));
  }, [rawRows]);

  const handleSort = useCallback(
    (col: SortColumn) => {
      if (col === sortCol) {
        setSortDir((d) => (d === "desc" ? "asc" : "desc"));
      } else {
        setSortCol(col);
        setSortDir("desc");
      }
    },
    [sortCol],
  );

  // Empty state
  if (rawRows.length === 0) {
    return (
      <div
        className={cn(
          "flex h-[500px] items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground",
          className,
        )}
      >
        No metrics to compare
      </div>
    );
  }

  return (
    <div
      className={cn("w-full rounded-lg border bg-card", className)}
    >
      {/* ===== RADAR CHART SECTION ===== */}
      <div className="relative mx-auto" style={{ width: 420, height: 340 }}>
        {/* Legend — top right */}
        <div className="absolute right-2 top-2 z-10 flex flex-col gap-1">
          <LegendDot color={colorA} label={cohortA.name} />
          <LegendDot color={colorB} label={cohortB.name} />
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="55%">
            <PolarGrid
              stroke="currentColor"
              strokeOpacity={0.12}
              gridType="polygon"
            />
            <PolarAngleAxis
              dataKey="metric"
              tick={({ x, y, payload }: any) => {
                const label = String(payload.value);
                const short = label.length > 16 ? label.replace(/^Avg\s+/i, "").slice(0, 14) + "…" : label;
                return (
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-muted-foreground"
                    fontSize={10}
                  >
                    {short}
                  </text>
                );
              }}
              stroke="currentColor"
              strokeOpacity={0.12}
            />
            <PolarRadiusAxis
              domain={[0, 100]}
              tick={false}
              axisLine={false}
              tickCount={5}
            />
            <Radar
              name={cohortA.name}
              dataKey="a"
              stroke={colorA}
              fill={colorA}
              strokeWidth={2.5}
              strokeOpacity={0.9}
              fillOpacity={0.2}
              animationDuration={800}
            />
            <Radar
              name={cohortB.name}
              dataKey="b"
              stroke={colorB}
              fill={colorB}
              strokeWidth={2.5}
              strokeOpacity={0.9}
              fillOpacity={0.2}
              animationDuration={800}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* ===== METRIC SCOREBOARD ===== */}
      <div className="px-4 pb-4">
        {/* Header row */}
        <div className="mb-1 grid grid-cols-[1fr_100px_100px_110px] items-center gap-2 border-b pb-2">
          <SortHeader label="Metric" column="label" active={sortCol} dir={sortDir} onClick={handleSort} />
          <SortHeader
            label={cohortA.name}
            column="a"
            active={sortCol}
            dir={sortDir}
            onClick={handleSort}
            className="justify-end"
          />
          <SortHeader
            label={cohortB.name}
            column="b"
            active={sortCol}
            dir={sortDir}
            onClick={handleSort}
            className="justify-end"
          />
          <SortHeader
            label="Delta"
            column="delta"
            active={sortCol}
            dir={sortDir}
            onClick={handleSort}
            className="justify-end"
          />
        </div>

        {/* Rows */}
        <div>
          {sortedRows.map((row, i) => {
            const winnerColor = row.winner === "a" ? colorA : row.winner === "b" ? colorB : undefined;
            const deltaColor = row.delta > 0 ? COLOR_POSITIVE : row.delta < 0 ? COLOR_NEGATIVE : undefined;
            const isHovered = hoveredKey === row.key;

            return (
              <motion.div
                key={row.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25 }}
                onMouseEnter={() => setHoveredKey(row.key)}
                onMouseLeave={() => setHoveredKey(null)}
                className={cn(
                  "grid grid-cols-[1fr_100px_100px_110px] items-center gap-2 rounded transition-colors",
                  isHovered && "bg-accent/50",
                )}
                style={{ height: 36 }}
              >
                {/* Metric label */}
                <span className="truncate text-sm text-foreground/80">{row.label}</span>

                {/* Cohort A value cell */}
                <div
                  className="relative flex items-center justify-end rounded-sm px-2"
                  style={{
                    borderLeft: row.winner === "a" ? `3px solid ${colorA}` : "3px solid transparent",
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-sm"
                    style={{
                      backgroundColor: colorA,
                      opacity: 0.15,
                      width: `${Math.min(row.a, 100)}%`,
                    }}
                  />
                  <span className="relative z-10 text-sm font-medium tabular-nums text-foreground">
                    {row.a.toFixed(0)}
                  </span>
                </div>

                {/* Cohort B value cell */}
                <div
                  className="relative flex items-center justify-end rounded-sm px-2"
                  style={{
                    borderLeft: row.winner === "b" ? `3px solid ${colorB}` : "3px solid transparent",
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-sm"
                    style={{
                      backgroundColor: colorB,
                      opacity: 0.15,
                      width: `${Math.min(row.b, 100)}%`,
                    }}
                  />
                  <span className="relative z-10 text-sm font-medium tabular-nums text-foreground">
                    {row.b.toFixed(0)}
                  </span>
                </div>

                {/* Winner + Delta */}
                <div className="flex items-center justify-end gap-1 text-sm">
                  {row.winner !== "tie" && (
                    <>
                      <span style={{ color: winnerColor }}>
                        {row.winner === "a" ? "\u25C0" : "\u25B6"}
                      </span>
                      <span
                        className="font-medium tabular-nums"
                        style={{ color: deltaColor }}
                      >
                        (+{row.absDelta.toFixed(0)})
                      </span>
                    </>
                  )}
                  {row.winner === "tie" && (
                    <span className="text-muted-foreground">--</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CohortCompareViz;
