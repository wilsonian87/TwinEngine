/**
 * ChannelEdgesL1 - Interconnection edges between channels in L1 view
 *
 * Phase 11: Edges represent HCP overlap between channels.
 * Edge weight (thickness/opacity) indicates overlap strength.
 */

import { useMemo, useState } from 'react';
import { Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { ChannelInterconnection } from '@/lib/constellation/types';

interface ChannelEdgesL1Props {
  interconnections: ChannelInterconnection[];
  channelPositions: Record<string, [number, number, number]>;
  hoveredChannel: string | null;
  onEdgeHover?: (edge: ChannelInterconnection | null, position: { x: number; y: number } | null) => void;
}

export function ChannelEdgesL1({
  interconnections,
  channelPositions,
  hoveredChannel,
  onEdgeHover,
}: ChannelEdgesL1Props) {
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  const edges = useMemo(() => {
    return interconnections
      .filter(
        (edge) =>
          channelPositions[edge.source] && channelPositions[edge.target]
      )
      .map((edge) => {
        const startPos = channelPositions[edge.source];
        const endPos = channelPositions[edge.target];

        // Edge styling based on overlap strength
        const opacity = 0.15 + edge.overlapIndex * 0.5;
        const lineWidth = 1 + edge.overlapIndex * 3;

        // Highlight if either connected channel is hovered
        const isHighlighted =
          hoveredChannel === edge.source || hoveredChannel === edge.target;

        return {
          ...edge,
          key: `${edge.source}-${edge.target}`,
          startPos,
          endPos,
          opacity: isHighlighted ? Math.min(opacity + 0.3, 1) : opacity,
          lineWidth: isHighlighted ? lineWidth + 1 : lineWidth,
          color: isHighlighted ? '#6366f1' : '#94a3b8', // indigo-500 : slate-400
        };
      });
  }, [interconnections, channelPositions, hoveredChannel]);

  return (
    <group>
      {edges.map((edge) => (
        <group key={edge.key}>
          <Line
            points={[edge.startPos, edge.endPos]}
            color={edge.color}
            lineWidth={edge.lineWidth}
            transparent
            opacity={edge.opacity}
            dashed
            dashScale={50}
            dashSize={3}
            gapSize={2}
          />

          {/* Invisible hitbox for hover detection */}
          <Line
            points={[edge.startPos, edge.endPos]}
            color="transparent"
            lineWidth={10}
            transparent
            opacity={0}
            onPointerOver={(e) => {
              setHoveredEdge(edge.key);
              if (onEdgeHover) {
                onEdgeHover(edge, { x: e.clientX, y: e.clientY });
              }
            }}
            onPointerOut={() => {
              setHoveredEdge(null);
              if (onEdgeHover) {
                onEdgeHover(null, null);
              }
            }}
          />

          {/* Midpoint label for hovered edge */}
          {hoveredEdge === edge.key && (
            <Html
              position={[
                (edge.startPos[0] + edge.endPos[0]) / 2,
                (edge.startPos[1] + edge.endPos[1]) / 2 + 5,
                (edge.startPos[2] + edge.endPos[2]) / 2,
              ]}
              center
              style={{ pointerEvents: 'none' }}
            >
              <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-lg border border-slate-200 text-xs whitespace-nowrap">
                <div className="font-medium text-slate-900">
                  {Math.round(edge.overlapIndex * 100)}% HCP Overlap
                </div>
                {edge.overlapCount && (
                  <div className="text-slate-500">
                    {edge.overlapCount.toLocaleString()} shared HCPs
                  </div>
                )}
              </div>
            </Html>
          )}
        </group>
      ))}
    </group>
  );
}
