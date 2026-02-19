/**
 * Inline Sparkline — Tiny SVG sparkline for table cells.
 *
 * Renders a minimal polyline with optional end-dot indicator.
 * Designed to fit in a 64x16px cell without axes or labels.
 *
 * @see OMNIVOR-VIZ-ROADMAP.md VIZ-3
 */

import { cn } from "@/lib/utils";

interface InlineSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showEndDot?: boolean;
  className?: string;
}

/**
 * InlineSparkline — Pure SVG sparkline with smooth curve interpolation.
 *
 * End dot: gold (#d97706) if trending up, red (#ef4444) if trending down.
 */
export function InlineSparkline({
  data,
  width = 64,
  height = 16,
  color = "#a855f7",
  showEndDot = true,
  className,
}: InlineSparklineProps) {
  if (!data.length || data.length < 2) {
    return <svg width={width} height={height} className={className} />;
  }

  const padding = showEndDot ? 3 : 1;
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Map data to SVG coordinates
  const points = data.map((v, i) => ({
    x: padding + (i / (data.length - 1)) * drawWidth,
    y: padding + drawHeight - ((v - min) / range) * drawHeight,
  }));

  // Build smooth path using cardinal spline approximation
  const pathD = buildSmoothPath(points);

  const lastPoint = points[points.length - 1];
  const secondLast = points[points.length - 2];
  const trendingUp = lastPoint.y < secondLast.y; // SVG y is inverted

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showEndDot && (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={2}
          fill={trendingUp ? "#d97706" : "#ef4444"}
        />
      )}
    </svg>
  );
}

// ============================================================================
// INTERNAL: Smooth path builder (Catmull-Rom → Cubic Bezier)
// ============================================================================

interface Point {
  x: number;
  y: number;
}

function buildSmoothPath(points: Point[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
  }

  let d = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Catmull-Rom to cubic bezier control points (tension = 0.5)
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return d;
}
