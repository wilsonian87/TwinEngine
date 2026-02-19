/**
 * Dense Table — Bloomberg-style data-dense table with visual encoding.
 *
 * Supports heatmap-shaded numeric cells, inline sparklines, badge columns,
 * sortable headers, and keyboard navigation. Designed for high-density
 * analytical views.
 *
 * @see OMNIVOR-VIZ-ROADMAP.md VIZ-3
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { getCellBackground } from "@/lib/viz/color-scales";
import { InlineSparkline } from "./inline-sparkline";

// ============================================================================
// TYPES
// ============================================================================

export interface DenseTableColumn<T> {
  key: keyof T & string;
  label: string;
  type: "text" | "number" | "percent" | "sparkline" | "badge";
  width?: string;
  sortable?: boolean;
  heatmap?: boolean;
  format?: (value: unknown) => string;
}

export interface DenseTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: DenseTableColumn<T>[];
  compact?: boolean;
  onRowClick?: (row: T) => void;
  className?: string;
}

type SortDirection = "asc" | "desc";

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * DenseTable — Generic data-dense table with visual encoding.
 *
 * - Heatmap-shaded numeric cells via getCellBackground
 * - Sparkline columns render InlineSparkline
 * - Badge columns render styled inline badges
 * - Sortable headers with gold accent on active column
 * - Keyboard navigation: Arrow Up/Down + Enter
 */
export function DenseTable<T extends Record<string, unknown>>({
  data,
  columns,
  compact = false,
  onRowClick,
  className,
}: DenseTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [focusedRow, setFocusedRow] = useState<number>(-1);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  // Compute min/max per heatmap column
  const heatmapRanges = useMemo(() => {
    const ranges: Record<string, { min: number; max: number }> = {};
    for (const col of columns) {
      if (col.heatmap && (col.type === "number" || col.type === "percent")) {
        let min = Infinity;
        let max = -Infinity;
        for (const row of data) {
          const v = Number(row[col.key]) || 0;
          if (v < min) min = v;
          if (v > max) max = v;
        }
        ranges[col.key] = {
          min: min === Infinity ? 0 : min,
          max: max === -Infinity ? 0 : max,
        };
      }
    }
    return ranges;
  }, [data, columns]);

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const sa = String(av);
      const sb = String(bv);
      return sortDir === "asc"
        ? sa.localeCompare(sb)
        : sb.localeCompare(sa);
    });
    return copy;
  }, [data, sortKey, sortDir]);

  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTableSectionElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedRow((r) => Math.min(r + 1, sortedData.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedRow((r) => Math.max(r - 1, 0));
      } else if (e.key === "Enter" && focusedRow >= 0 && onRowClick) {
        e.preventDefault();
        onRowClick(sortedData[focusedRow]);
      }
    },
    [focusedRow, sortedData, onRowClick],
  );

  // Scroll focused row into view
  useEffect(() => {
    if (focusedRow >= 0 && tbodyRef.current) {
      const rows = tbodyRef.current.querySelectorAll("tr");
      rows[focusedRow]?.scrollIntoView({ block: "nearest" });
    }
  }, [focusedRow]);

  const rowHeight = compact ? "h-6" : "h-10";
  const cellPadding = compact ? "px-2 py-0.5" : "px-3 py-2";

  return (
    <div className={cn("overflow-auto rounded-md border border-[#27272a]", className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[#27272a] bg-[#0a0a0b]/60">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "text-left font-medium text-[#71717a] select-none",
                  cellPadding,
                  compact ? "text-xs" : "text-xs",
                  col.sortable && "cursor-pointer hover:text-[#fafafa] transition-colors",
                )}
                style={col.width ? { width: col.width } : undefined}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span className="text-[#d97706]">
                      {sortDir === "asc" ? "\u2191" : "\u2193"}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          ref={tbodyRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="outline-none"
        >
          {sortedData.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={cn(
                rowHeight,
                "border-b border-[#27272a]/50 transition-colors",
                onRowClick && "cursor-pointer",
                focusedRow === rowIndex
                  ? "bg-[#6b21a8]/15 outline outline-1 outline-[#a855f7]/40"
                  : "hover:bg-[#fafafa]/[0.03]",
              )}
              onClick={() => {
                setFocusedRow(rowIndex);
                onRowClick?.(row);
              }}
            >
              {columns.map((col) => {
                const value = row[col.key];
                const cellStyle =
                  col.heatmap && heatmapRanges[col.key] != null
                    ? {
                        backgroundColor: getCellBackground(
                          Number(value) || 0,
                          heatmapRanges[col.key].min,
                          heatmapRanges[col.key].max,
                        ),
                      }
                    : undefined;

                return (
                  <td
                    key={col.key}
                    className={cn(
                      cellPadding,
                      "text-[#fafafa]",
                      col.type === "number" && "tabular-nums text-right",
                      col.type === "percent" && "tabular-nums text-right",
                    )}
                    style={cellStyle}
                  >
                    {renderCell(col, value)}
                  </td>
                );
              })}
            </tr>
          ))}
          {sortedData.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="py-8 text-center text-[#71717a] text-sm"
              >
                No signals yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// CELL RENDERERS
// ============================================================================

function renderCell<T>(col: DenseTableColumn<T>, value: unknown): React.ReactNode {
  switch (col.type) {
    case "sparkline": {
      const arr = Array.isArray(value) ? (value as number[]) : [];
      return <InlineSparkline data={arr} />;
    }
    case "badge":
      return (
        <span className="inline-flex items-center rounded-full bg-[#6b21a8]/20 px-2 py-0.5 text-xs font-medium text-[#a855f7]">
          {col.format ? col.format(value) : String(value ?? "")}
        </span>
      );
    case "percent":
      return col.format
        ? col.format(value)
        : `${Number(value ?? 0).toFixed(1)}%`;
    case "number":
      return col.format
        ? col.format(value)
        : Number(value ?? 0).toLocaleString();
    case "text":
    default:
      return col.format ? col.format(value) : String(value ?? "");
  }
}
