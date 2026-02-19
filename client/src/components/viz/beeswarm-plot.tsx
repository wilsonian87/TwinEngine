/**
 * BeeswarmPlot -- D3 Force Simulation with Collision Avoidance
 *
 * Each dot represents a single data point positioned on a value axis (X).
 * Y position determined by force simulation to avoid overlaps.
 * Hover reveals tooltip; click triggers callback.
 *
 * @see distribution-utils.ts
 */

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";
import { BRAND_CATEGORICAL_SCALE } from "@/lib/viz/color-scales";
import { CHART_THEME } from "@/lib/chart-theme";
import { MOTION_DURATION } from "@/lib/motion-config";

// ============================================================================
// TYPES
// ============================================================================

export interface BeeswarmDot {
  id: string;
  value: number;
  label: string;
  category?: string;
  color?: string;
}

interface BeeswarmPlotProps {
  data: BeeswarmDot[];
  width?: number;
  height?: number;
  xLabel?: string;
  onDotClick?: (id: string) => void;
  className?: string;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  value: number;
  label: string;
  category?: string;
  color: string;
  targetX: number;
}

interface TooltipState {
  x: number;
  y: number;
  label: string;
  value: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function getCategoryColor(category: string | undefined, index: number): string {
  if (!category) return BRAND_CATEGORICAL_SCALE[index % BRAND_CATEGORICAL_SCALE.length];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) | 0;
  }
  return BRAND_CATEGORICAL_SCALE[Math.abs(hash) % BRAND_CATEGORICAL_SCALE.length];
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BeeswarmPlot({
  data,
  width: propWidth,
  height: propHeight,
  xLabel,
  onDotClick,
  className,
}: BeeswarmPlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: propWidth ?? 700, height: propHeight ?? 300 });
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);

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
  const margin = { top: 20, right: 24, bottom: 40, left: 24 };
  const innerWidth = Math.max(width - margin.left - margin.right, 100);
  const innerHeight = Math.max(height - margin.top - margin.bottom, 60);
  const dotRadius = 5;

  // X scale
  const xScale = useMemo(() => {
    const extent = d3.extent(data, (d) => d.value) as [number, number];
    return d3.scaleLinear().domain(extent).range([0, innerWidth]).nice();
  }, [data, innerWidth]);

  // Run force simulation
  useEffect(() => {
    if (data.length === 0) {
      setSimNodes([]);
      return;
    }

    const reduced = prefersReducedMotion();
    const centerY = innerHeight / 2;

    const nodes: SimNode[] = data.map((d, i) => ({
      id: d.id,
      value: d.value,
      label: d.label,
      category: d.category,
      color: d.color ?? getCategoryColor(d.category, i),
      targetX: xScale(d.value),
      x: reduced ? xScale(d.value) : Math.random() * innerWidth,
      y: reduced ? centerY : Math.random() * innerHeight,
    }));

    if (reduced) {
      setSimNodes(nodes);
      return;
    }

    const simulation = d3
      .forceSimulation(nodes)
      .force("x", d3.forceX<SimNode>((d) => d.targetX).strength(0.8))
      .force("y", d3.forceY(centerY).strength(0.05))
      .force("collide", d3.forceCollide(dotRadius + 1.5).iterations(3))
      .alphaDecay(0.03)
      .on("tick", () => {
        setSimNodes([...nodes]);
      });

    // Let simulation run, then stop after stabilization
    const timer = setTimeout(() => simulation.stop(), 2000);

    return () => {
      clearTimeout(timer);
      simulation.stop();
    };
  }, [data, xScale, innerWidth, innerHeight]);

  // Tick marks
  const ticks = xScale.ticks(6);

  const handleDotEnter = useCallback(
    (node: SimNode, event: React.MouseEvent) => {
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (svgRect) {
        setTooltip({
          x: (node.x ?? 0) + margin.left,
          y: (node.y ?? 0) + margin.top - 14,
          label: node.label,
          value: node.value,
        });
      }
    },
    [margin.left, margin.top],
  );

  const handleDotLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative w-full min-h-[200px]", className)}>
      <svg ref={svgRef} width={width} height={height} className="overflow-visible">
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* X axis */}
          <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke="#27272a" strokeWidth={1} />
          {ticks.map((t) => (
            <g key={t} transform={`translate(${xScale(t)},${innerHeight})`}>
              <line y1={0} y2={6} stroke="#27272a" />
              <text
                y={20}
                textAnchor="middle"
                fill={CHART_THEME.text.axisLabel.fill}
                fontSize={CHART_THEME.text.axisLabel.fontSize}
                fontFamily={CHART_THEME.text.fontFamily}
              >
                {t}
              </text>
            </g>
          ))}

          {/* X label */}
          {xLabel && (
            <text
              x={innerWidth / 2}
              y={innerHeight + 36}
              textAnchor="middle"
              fill={CHART_THEME.text.axisLabel.fill}
              fontSize={CHART_THEME.text.axisLabel.fontSize}
              fontWeight={CHART_THEME.text.axisLabel.fontWeight}
              fontFamily={CHART_THEME.text.fontFamily}
            >
              {xLabel}
            </text>
          )}

          {/* Dots */}
          {simNodes.map((node) => (
            <circle
              key={node.id}
              cx={node.x}
              cy={node.y}
              r={dotRadius}
              fill={node.color}
              fillOpacity={0.85}
              stroke={node.color}
              strokeOpacity={0.3}
              strokeWidth={2}
              style={{ cursor: onDotClick ? "pointer" : "default", transition: "r 150ms ease-out" }}
              onMouseEnter={(e) => handleDotEnter(node, e)}
              onMouseLeave={handleDotLeave}
              onClick={() => onDotClick?.(node.id)}
            />
          ))}
        </g>

        {/* Tooltip */}
        {tooltip && (
          <g transform={`translate(${tooltip.x},${tooltip.y})`}>
            <rect
              x={-4}
              y={-24}
              width={Math.max((tooltip.label.length + String(tooltip.value).length) * 7 + 24, 80)}
              height={24}
              rx={6}
              fill="rgba(10, 10, 11, 0.95)"
              stroke="#27272a"
            />
            <text x={8} y={-8} fill="#fafafa" fontSize={12} fontFamily={CHART_THEME.text.fontFamily}>
              {tooltip.label}: {tooltip.value.toLocaleString()}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
