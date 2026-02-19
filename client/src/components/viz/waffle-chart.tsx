/**
 * Waffle Chart — 100-square grid replacing pie charts for channel allocation.
 *
 * Each segment fills squares proportional to its percentage value.
 * Supports staggered fill animation and hover interactions.
 * Respects prefers-reduced-motion.
 *
 * @see OMNIVOR-VIZ-ROADMAP.md VIZ-3
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface WaffleSegment {
  label: string;
  value: number;
  color: string;
}

export interface WaffleChartProps {
  data: WaffleSegment[];
  size?: number;
  animated?: boolean;
  onSegmentHover?: (segment: WaffleSegment | null) => void;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GRID = 10;
const TOTAL_SQUARES = GRID * GRID;
const GAP = 2;
const CORNER_RADIUS = 2;
const STAGGER_DELAY_MS = 5;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * WaffleChart — 10x10 SVG grid for proportional display.
 *
 * Squares fill left-to-right, top-to-bottom.
 * Hover highlights a segment group and dims others.
 */
export function WaffleChart({
  data,
  size = 200,
  animated = false,
  onSegmentHover,
  className,
}: WaffleChartProps) {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(animated ? 0 : TOTAL_SQUARES);
  const prefersReducedMotion = useRef(false);

  // Check reduced motion on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      prefersReducedMotion.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
    }
    if (!animated || prefersReducedMotion.current) {
      setVisibleCount(TOTAL_SQUARES);
    }
  }, [animated]);

  // Staggered reveal
  useEffect(() => {
    if (!animated || prefersReducedMotion.current) return;
    if (visibleCount >= TOTAL_SQUARES) return;

    const timer = setTimeout(() => {
      setVisibleCount((c) => Math.min(c + 1, TOTAL_SQUARES));
    }, STAGGER_DELAY_MS);

    return () => clearTimeout(timer);
  }, [animated, visibleCount]);

  // Map squares to segments
  const squares = useMemo(() => {
    const result: { segmentIndex: number; segment: WaffleSegment }[] = [];
    let filled = 0;

    for (let si = 0; si < data.length; si++) {
      const segment = data[si];
      // Round square count; last segment gets remainder
      const count =
        si === data.length - 1
          ? TOTAL_SQUARES - filled
          : Math.round((segment.value / 100) * TOTAL_SQUARES);

      const actualCount = Math.max(0, Math.min(count, TOTAL_SQUARES - filled));
      for (let j = 0; j < actualCount; j++) {
        result.push({ segmentIndex: si, segment });
      }
      filled += actualCount;
    }

    // Fill remaining with last segment color (edge case: rounding)
    while (result.length < TOTAL_SQUARES && data.length > 0) {
      result.push({
        segmentIndex: data.length - 1,
        segment: data[data.length - 1],
      });
    }

    return result;
  }, [data]);

  const cellSize = (size - GAP * (GRID - 1)) / GRID;

  const handleHover = (segment: WaffleSegment | null) => {
    setHoveredLabel(segment?.label ?? null);
    onSegmentHover?.(segment);
  };

  return (
    <div className={cn("inline-block", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        onMouseLeave={() => handleHover(null)}
      >
        {squares.map((sq, i) => {
          if (i >= visibleCount) return null;

          const col = i % GRID;
          const row = Math.floor(i / GRID);
          const x = col * (cellSize + GAP);
          const y = row * (cellSize + GAP);

          const isHoveredGroup =
            hoveredLabel != null && sq.segment.label === hoveredLabel;
          const isDimmed =
            hoveredLabel != null && sq.segment.label !== hoveredLabel;

          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={cellSize}
              height={cellSize}
              rx={CORNER_RADIUS}
              fill={sq.segment.color}
              opacity={isDimmed ? 0.2 : isHoveredGroup ? 1 : 0.85}
              className="transition-opacity"
              style={{ transitionDuration: "150ms" }}
              onMouseEnter={() => handleHover(sq.segment)}
            />
          );
        })}
      </svg>

      {/* Hover label */}
      {hoveredLabel != null && (
        <div className="mt-2 text-center text-xs text-[#fafafa]">
          <span className="font-medium">{hoveredLabel}</span>
          <span className="text-[#71717a] ml-1.5">
            {data.find((d) => d.label === hoveredLabel)?.value.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}
