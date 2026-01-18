/**
 * EdgeLines - BufferGeometry Edge Renderer
 *
 * Renders connections between nodes using LineSegments.
 * Features:
 * - Status-based coloring (green/amber/red)
 * - Story mode focus (dim non-focused edges)
 * - Dynamic position updates during physics
 */

import { useMemo, useRef, useEffect } from 'react';
import {
  BufferGeometry,
  Float32BufferAttribute,
  LineSegments,
  LineBasicMaterial,
  Color,
} from 'three';
import { useFrame } from '@react-three/fiber';
import { useConstellationStore } from '@/stores/constellationStore';
import { useStoryStore } from '@/stores/storyStore';

// Status colors for light background (more saturated/darker)
const STATUS_COLORS = {
  healthy: new Color('#16a34a'),  // green-600
  warning: new Color('#d97706'),  // amber-600
  critical: new Color('#dc2626'), // red-600
};

const DIM_COLOR = new Color('#cbd5e1'); // slate-300 for dimmed edges on light bg

export function EdgeLines() {
  const lineRef = useRef<LineSegments>(null);
  const materialRef = useRef<LineBasicMaterial>(null);

  const nodes = useConstellationStore((s) => s.nodes);
  const edges = useConstellationStore((s) => s.edges);
  const storyModeActive = useConstellationStore((s) => s.storyModeActive);

  const beats = useStoryStore((s) => s.beats);
  const currentBeatIndex = useStoryStore((s) => s.currentBeatIndex);
  const currentBeat = beats[currentBeatIndex];
  const channelFocus = storyModeActive ? currentBeat?.channelFocus : null;

  // Create node lookup map
  const nodeMap = useMemo(() => {
    return new Map(nodes.map(n => [n.id, n]));
  }, [nodes]);

  // Build position and color arrays
  const { positions, colors, edgeCount } = useMemo(() => {
    const posArray: number[] = [];
    const colorArray: number[] = [];
    let count = 0;

    edges.forEach(edge => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) return;

      // Position: source vertex -> target vertex
      posArray.push(...source.position);
      posArray.push(...target.position);

      // Determine if edge is in focus
      const isFocused = !channelFocus || target.channel === channelFocus;

      // Get color based on target node status
      let color: Color;
      if (!isFocused) {
        color = DIM_COLOR;
      } else {
        color = STATUS_COLORS[target.status] || STATUS_COLORS.healthy;
      }

      // Opacity based on weight and focus (higher values for light bg visibility)
      const baseOpacity = isFocused ? 0.7 : 0.25;
      const opacity = baseOpacity * (0.5 + edge.weight * 0.5); // Ensure minimum visibility

      // Apply color with opacity baked in (since we're using vertexColors)
      colorArray.push(color.r * opacity, color.g * opacity, color.b * opacity);
      colorArray.push(color.r * opacity, color.g * opacity, color.b * opacity);

      count++;
    });

    return {
      positions: new Float32Array(posArray),
      colors: new Float32Array(colorArray),
      edgeCount: count,
    };
  }, [edges, nodeMap, channelFocus]);

  // Update geometry when colors change
  useEffect(() => {
    if (!lineRef.current) return;

    const geo = lineRef.current.geometry;

    // Update or create color attribute
    const colorAttr = geo.getAttribute('color');
    if (colorAttr) {
      (colorAttr as Float32BufferAttribute).set(colors);
      colorAttr.needsUpdate = true;
    } else {
      geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
    }
  }, [colors]);

  // Update positions each frame (during physics simulation)
  useFrame(() => {
    if (!lineRef.current || edges.length === 0) return;

    const geo = lineRef.current.geometry;
    const posAttr = geo.getAttribute('position') as Float32BufferAttribute;

    if (!posAttr) return;

    let idx = 0;
    edges.forEach(edge => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (source && target) {
        posAttr.setXYZ(idx++, source.position[0], source.position[1], source.position[2]);
        posAttr.setXYZ(idx++, target.position[0], target.position[1], target.position[2]);
      }
    });

    posAttr.needsUpdate = true;
  });

  if (positions.length === 0) return null;

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        ref={materialRef}
        vertexColors
        transparent
        opacity={0.6}
        depthWrite={false}
        blending={1} // NormalBlending for light background
      />
    </lineSegments>
  );
}
