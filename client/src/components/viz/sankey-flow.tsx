/**
 * SankeyFlow -- D3 Sankey Layout for HCP Engagement Journeys
 *
 * SVG-based Sankey diagram with gradient flow paths, hover highlighting,
 * and tooltips. Uses d3-sankey for layout computation, React refs for
 * D3 bindings.
 *
 * @see sankey-utils.ts for data transformation
 */

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  sankey as d3Sankey,
  sankeyLinkHorizontal,
  sankeyJustify,
} from "d3-sankey";
import type { SankeyNode as D3SankeyNode, SankeyLink as D3SankeyLink } from "d3-sankey";
import { cn } from "@/lib/utils";
import { BRAND_CATEGORICAL_SCALE, BRAND_SEQUENTIAL_SCALE } from "@/lib/viz/color-scales";
import { CHART_THEME } from "@/lib/chart-theme";
import type { SankeyNode, SankeyLink } from "@/lib/viz/sankey-utils";

// ============================================================================
// TYPES
// ============================================================================

interface SankeyFlowProps {
  data: { nodes: SankeyNode[]; links: SankeyLink[] };
  width?: number;
  height?: number;
  className?: string;
}

/** Internal node shape after d3-sankey layout */
interface LayoutNode extends SankeyNode {
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  index?: number;
  sourceLinks?: LayoutLink[];
  targetLinks?: LayoutLink[];
}

/** Internal link shape after d3-sankey layout */
interface LayoutLink {
  source: LayoutNode;
  target: LayoutNode;
  value: number;
  width?: number;
  y0?: number;
  y1?: number;
  channel?: string;
  index?: number;
}

interface TooltipState {
  x: number;
  y: number;
  content: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getNodeColor(index: number): string {
  return BRAND_SEQUENTIAL_SCALE[index % BRAND_SEQUENTIAL_SCALE.length];
}

function getChannelColor(channel: string | undefined, index: number): string {
  if (!channel) return BRAND_CATEGORICAL_SCALE[index % BRAND_CATEGORICAL_SCALE.length];
  // Deterministic hash for channel string
  let hash = 0;
  for (let i = 0; i < channel.length; i++) {
    hash = (hash * 31 + channel.charCodeAt(i)) | 0;
  }
  return BRAND_CATEGORICAL_SCALE[Math.abs(hash) % BRAND_CATEGORICAL_SCALE.length];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SankeyFlow({ data, width: propWidth, height: propHeight, className }: SankeyFlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: propWidth ?? 800, height: propHeight ?? 500 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Responsive sizing via ResizeObserver
  useEffect(() => {
    if (propWidth && propHeight) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: propWidth ?? entry.contentRect.width,
          height: propHeight ?? Math.max(entry.contentRect.height, 300),
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [propWidth, propHeight]);

  const { width, height } = dimensions;
  const margin = { top: 16, right: 16, bottom: 16, left: 16 };
  const innerWidth = Math.max(width - margin.left - margin.right, 100);
  const innerHeight = Math.max(height - margin.top - margin.bottom, 100);

  // Compute layout
  const layout = useMemo(() => {
    if (data.nodes.length === 0) return null;

    // Build index map for d3-sankey (needs numeric source/target references)
    const nodeIdToIndex = new Map<string, number>();
    const nodes = data.nodes.map((n, i) => {
      nodeIdToIndex.set(n.id, i);
      return { ...n };
    });

    const links = data.links
      .filter((l) => nodeIdToIndex.has(l.source) && nodeIdToIndex.has(l.target))
      .map((l) => ({
        source: nodeIdToIndex.get(l.source)!,
        target: nodeIdToIndex.get(l.target)!,
        value: l.value,
        channel: l.channel,
      }));

    if (links.length === 0) return null;

    type NodeExtra = { id: string; label: string; count: number };
    type LinkExtra = { channel?: string };

    const generator = d3Sankey<NodeExtra, LinkExtra>()
      .nodeId((d: D3SankeyNode<NodeExtra, LinkExtra>) => (d as unknown as NodeExtra).id)
      .nodeWidth(16)
      .nodePadding(12)
      .nodeAlign(sankeyJustify)
      .extent([
        [0, 0],
        [innerWidth, innerHeight],
      ]);

    const graph = generator({
      nodes: nodes.map((n) => ({ ...n })),
      links,
    });

    return {
      nodes: graph.nodes as unknown as LayoutNode[],
      links: graph.links as unknown as LayoutLink[],
    };
  }, [data, innerWidth, innerHeight]);

  const linkPathGenerator = sankeyLinkHorizontal();

  // Hover handlers
  const handleNodeEnter = useCallback((nodeId: string) => {
    setHoveredNode(nodeId);
    setHoveredLink(null);
  }, []);

  const handleNodeLeave = useCallback(() => {
    setHoveredNode(null);
    setTooltip(null);
  }, []);

  const handleLinkEnter = useCallback(
    (link: LayoutLink, index: number, event: React.MouseEvent) => {
      setHoveredLink(index);
      setHoveredNode(null);

      const sourceLabel = link.source.label;
      const targetLabel = link.target.label;
      const channelText = link.channel ? ` via ${link.channel}` : "";
      const content = `${link.value.toLocaleString()} HCPs moved from ${sourceLabel} to ${targetLabel}${channelText}`;

      const svgRect = (event.currentTarget as SVGElement).closest("svg")?.getBoundingClientRect();
      if (svgRect) {
        setTooltip({
          x: event.clientX - svgRect.left,
          y: event.clientY - svgRect.top - 12,
          content,
        });
      }
    },
    [],
  );

  const handleLinkLeave = useCallback(() => {
    setHoveredLink(null);
    setTooltip(null);
  }, []);

  // Determine link visibility
  const isLinkHighlighted = useCallback(
    (link: LayoutLink, linkIdx: number): boolean => {
      if (hoveredLink !== null) return hoveredLink === linkIdx;
      if (hoveredNode !== null) {
        return link.source.id === hoveredNode || link.target.id === hoveredNode;
      }
      return true;
    },
    [hoveredNode, hoveredLink],
  );

  const hasHover = hoveredNode !== null || hoveredLink !== null;

  if (!layout) {
    return (
      <div ref={containerRef} className={cn("relative w-full min-h-[300px]", className)}>
        <p className="text-sm text-muted-foreground p-4">No flow data available.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative w-full min-h-[300px]", className)}>
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          {/* Gradient definitions for each link */}
          {layout.links.map((link, i) => {
            const sourceIdx = layout.nodes.indexOf(link.source);
            const targetIdx = layout.nodes.indexOf(link.target);
            return (
              <linearGradient
                key={`link-grad-${i}`}
                id={`sankey-link-grad-${i}`}
                gradientUnits="userSpaceOnUse"
                x1={link.source.x1 ?? 0}
                x2={link.target.x0 ?? 0}
              >
                <stop offset="0%" stopColor={getNodeColor(sourceIdx)} stopOpacity={0.6} />
                <stop offset="100%" stopColor={getNodeColor(targetIdx)} stopOpacity={0.6} />
              </linearGradient>
            );
          })}
          {/* Glow filter for dark mode */}
          <filter id="sankey-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Links */}
          {layout.links.map((link, i) => {
            const highlighted = isLinkHighlighted(link, i);
            const pathD = linkPathGenerator(link as Parameters<typeof linkPathGenerator>[0]);
            if (!pathD) return null;
            return (
              <path
                key={`link-${i}`}
                d={pathD}
                fill="none"
                stroke={`url(#sankey-link-grad-${i})`}
                strokeWidth={Math.max((link.width ?? 1), 1)}
                strokeOpacity={hasHover ? (highlighted ? 0.7 : 0.1) : 0.5}
                style={{
                  transition: "stroke-opacity 200ms ease-out",
                  filter: highlighted && hasHover ? "url(#sankey-glow)" : undefined,
                }}
                onMouseEnter={(e) => handleLinkEnter(link, i, e)}
                onMouseLeave={handleLinkLeave}
              />
            );
          })}

          {/* Nodes */}
          {layout.nodes.map((node, i) => {
            const x = node.x0 ?? 0;
            const y = node.y0 ?? 0;
            const w = (node.x1 ?? 0) - x;
            const h = (node.y1 ?? 0) - y;
            const isActive = hoveredNode === node.id;
            const color = getNodeColor(i);

            return (
              <g key={`node-${node.id}`}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={Math.max(h, 1)}
                  fill={color}
                  rx={2}
                  opacity={hasHover && !isActive && hoveredNode !== null ? 0.4 : 1}
                  style={{ transition: "opacity 200ms ease-out", cursor: "pointer" }}
                  onMouseEnter={() => handleNodeEnter(node.id)}
                  onMouseLeave={handleNodeLeave}
                />
                {/* Label */}
                <text
                  x={x < innerWidth / 2 ? x + w + 8 : x - 8}
                  y={y + h / 2}
                  dy="0.35em"
                  textAnchor={x < innerWidth / 2 ? "start" : "end"}
                  fill={CHART_THEME.text.fill}
                  fontSize={CHART_THEME.text.fontSize}
                  fontFamily={CHART_THEME.text.fontFamily}
                >
                  {node.label} ({node.count.toLocaleString()})
                </text>
              </g>
            );
          })}
        </g>

        {/* Tooltip */}
        {tooltip && (
          <g transform={`translate(${tooltip.x},${tooltip.y})`}>
            <rect
              x={-4}
              y={-28}
              width={tooltip.content.length * 6.5 + 24}
              height={28}
              rx={6}
              fill="rgba(10, 10, 11, 0.95)"
              stroke="#27272a"
            />
            <text
              x={8}
              y={-10}
              fill="#fafafa"
              fontSize={12}
              fontFamily={CHART_THEME.text.fontFamily}
            >
              {tooltip.content}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
