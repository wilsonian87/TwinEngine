/**
 * Engagement Heatmap — HCP x Channel x Time heatmap matrix.
 *
 * SVG grid of colored rectangles with cross-hair hover effect.
 * Rows sorted by total value (hottest at top). Color intensity
 * from BRAND_SEQUENTIAL_SCALE via getColorForValue.
 *
 * @see OMNIVOR-VIZ-ROADMAP.md VIZ-3
 */

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getColorForValue } from "@/lib/viz/color-scales";
import {
  aggregateToMatrix,
  sortRowsByTotal,
  type HeatmapCell,
} from "@/lib/viz/heatmap-utils";

// ============================================================================
// TYPES
// ============================================================================

export type { HeatmapCell };

export interface EngagementHeatmapProps {
  data: HeatmapCell[];
  rowLabel?: string;
  colLabel?: string;
  valueLabel?: string;
  width?: number;
  height?: number;
  className?: string;
}

interface HoverState {
  row: number;
  col: number;
  value: number;
  rowName: string;
  colName: string;
  x: number;
  y: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LABEL_WIDTH = 100;
const HEADER_HEIGHT = 60;
const CELL_GAP = 2;
const MIN_CELL_SIZE = 20;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * EngagementHeatmap — SVG heatmap with cross-hair hover and tooltip.
 */
export function EngagementHeatmap({
  data,
  rowLabel,
  colLabel,
  valueLabel = "Value",
  width: propWidth,
  height: propHeight,
  className,
}: EngagementHeatmapProps) {
  const [hover, setHover] = useState<HoverState | null>(null);

  // Build sorted matrix
  const { rows, cols, matrix, min, max } = useMemo(() => {
    const raw = aggregateToMatrix(data);
    const sorted = sortRowsByTotal(raw.matrix, raw.rows);
    return {
      rows: sorted.rows,
      cols: raw.cols,
      matrix: sorted.matrix,
      min: raw.min,
      max: raw.max,
    };
  }, [data]);

  // Compute layout
  const numRows = rows.length;
  const numCols = cols.length;

  const gridWidth = propWidth
    ? propWidth - LABEL_WIDTH
    : Math.max(numCols * (MIN_CELL_SIZE + CELL_GAP), 200);
  const gridHeight = propHeight
    ? propHeight - HEADER_HEIGHT
    : Math.max(numRows * (MIN_CELL_SIZE + CELL_GAP), 100);

  const cellW = numCols > 0 ? (gridWidth - CELL_GAP * (numCols - 1)) / numCols : MIN_CELL_SIZE;
  const cellH = numRows > 0 ? (gridHeight - CELL_GAP * (numRows - 1)) / numRows : MIN_CELL_SIZE;

  const totalWidth = LABEL_WIDTH + gridWidth;
  const totalHeight = HEADER_HEIGHT + gridHeight;

  const handleCellEnter = useCallback(
    (ri: number, ci: number, x: number, y: number) => {
      setHover({
        row: ri,
        col: ci,
        value: matrix[ri]?.[ci] ?? 0,
        rowName: rows[ri],
        colName: cols[ci],
        x,
        y,
      });
    },
    [matrix, rows, cols],
  );

  const handleMouseLeave = useCallback(() => setHover(null), []);

  if (numRows === 0 || numCols === 0) {
    return (
      <div className={cn("flex items-center justify-center text-[#71717a] text-sm py-8", className)}>
        No signals yet.
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <svg
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        onMouseLeave={handleMouseLeave}
      >
        {/* Column axis label */}
        {colLabel && (
          <text
            x={LABEL_WIDTH + gridWidth / 2}
            y={12}
            textAnchor="middle"
            fill="#71717a"
            fontSize={11}
            fontWeight={500}
          >
            {colLabel}
          </text>
        )}

        {/* Column headers */}
        {cols.map((col, ci) => {
          const x = LABEL_WIDTH + ci * (cellW + CELL_GAP) + cellW / 2;
          return (
            <text
              key={ci}
              x={x}
              y={HEADER_HEIGHT - 8}
              textAnchor="middle"
              fill={hover && hover.col === ci ? "#fafafa" : "#71717a"}
              fontSize={10}
              fontWeight={hover && hover.col === ci ? 600 : 400}
              className="transition-colors"
            >
              {col.length > 10 ? col.slice(0, 9) + "\u2026" : col}
            </text>
          );
        })}

        {/* Row axis label */}
        {rowLabel && (
          <text
            x={10}
            y={HEADER_HEIGHT + gridHeight / 2}
            textAnchor="middle"
            fill="#71717a"
            fontSize={11}
            fontWeight={500}
            transform={`rotate(-90, 10, ${HEADER_HEIGHT + gridHeight / 2})`}
          >
            {rowLabel}
          </text>
        )}

        {/* Row headers */}
        {rows.map((row, ri) => {
          const y = HEADER_HEIGHT + ri * (cellH + CELL_GAP) + cellH / 2;
          return (
            <text
              key={ri}
              x={LABEL_WIDTH - 8}
              y={y}
              textAnchor="end"
              dominantBaseline="central"
              fill={hover && hover.row === ri ? "#fafafa" : "#71717a"}
              fontSize={10}
              fontWeight={hover && hover.row === ri ? 600 : 400}
              className="transition-colors"
            >
              {row.length > 12 ? row.slice(0, 11) + "\u2026" : row}
            </text>
          );
        })}

        {/* Grid cells */}
        {matrix.map((rowData, ri) =>
          rowData.map((value, ci) => {
            const x = LABEL_WIDTH + ci * (cellW + CELL_GAP);
            const y = HEADER_HEIGHT + ri * (cellH + CELL_GAP);
            const isHoveredRow = hover?.row === ri;
            const isHoveredCol = hover?.col === ci;
            const isHoveredCell = isHoveredRow && isHoveredCol;
            const isDimmed = hover != null && !isHoveredRow && !isHoveredCol;

            return (
              <rect
                key={`${ri}-${ci}`}
                x={x}
                y={y}
                width={cellW}
                height={cellH}
                rx={2}
                fill={getColorForValue(value, min, max)}
                opacity={isDimmed ? 0.25 : isHoveredCell ? 1 : 0.85}
                stroke={isHoveredCell ? "#fafafa" : "none"}
                strokeWidth={isHoveredCell ? 1.5 : 0}
                className="transition-opacity cursor-crosshair"
                style={{ transitionDuration: "150ms" }}
                onMouseEnter={() => handleCellEnter(ri, ci, x + cellW / 2, y)}
              />
            );
          }),
        )}
      </svg>

      {/* Tooltip */}
      {hover && (
        <div
          className="pointer-events-none absolute z-50 rounded-lg border border-[#27272a] bg-[rgba(10,10,11,0.95)] px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
          style={{
            left: Math.min(hover.x + 12, totalWidth - 140),
            top: Math.max(hover.y - 40, 0),
          }}
        >
          <div className="text-[#fafafa] font-medium mb-1">
            {hover.rowName} / {hover.colName}
          </div>
          <div className="text-[#71717a]">
            {valueLabel}: <span className="text-[#fafafa] tabular-nums font-medium">{hover.value.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
