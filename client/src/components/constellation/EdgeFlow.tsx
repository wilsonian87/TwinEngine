/**
 * EdgeFlow - Animated Flow Particles Along Edges
 *
 * Creates the "data flow" visual effect with particles moving from
 * channel nodes (source) to HCP nodes (target).
 * Flow speed correlates with edge weight (healthier = faster).
 */

import { useRef, useMemo } from 'react';
import { Points, PointsMaterial, BufferGeometry, Float32BufferAttribute, Color } from 'three';
import { useFrame } from '@react-three/fiber';
import { useConstellationStore } from '@/stores/constellationStore';
import { useStoryStore } from '@/stores/storyStore';

// Number of particles per edge (reduced for performance)
const PARTICLES_PER_EDGE = 2;

// Status colors
const STATUS_COLORS = {
  healthy: new Color('#22c55e'),
  warning: new Color('#f59e0b'),
  critical: new Color('#ef4444'),
};

interface FlowParticle {
  edgeIndex: number;
  progress: number; // 0-1 along the edge
  speed: number;
  sourcePos: [number, number, number];
  targetPos: [number, number, number];
  color: Color;
}

export function EdgeFlow() {
  const pointsRef = useRef<Points>(null);

  const nodes = useConstellationStore((s) => s.nodes);
  const edges = useConstellationStore((s) => s.edges);
  const storyModeActive = useConstellationStore((s) => s.storyModeActive);

  const beats = useStoryStore((s) => s.beats);
  const currentBeatIndex = useStoryStore((s) => s.currentBeatIndex);
  const currentBeat = beats[currentBeatIndex];
  const channelFocus = storyModeActive ? currentBeat?.channelFocus : null;

  // Create node lookup
  const nodeMap = useMemo(() => {
    return new Map(nodes.map(n => [n.id, n]));
  }, [nodes]);

  // Initialize particles
  const particles = useMemo(() => {
    const result: FlowParticle[] = [];

    edges.forEach((edge, edgeIndex) => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) return;

      // Skip dimmed edges in story mode
      if (channelFocus && target.channel !== channelFocus) return;

      // Only animate a subset of edges for performance
      if (edgeIndex % 10 !== 0) return;

      const color = STATUS_COLORS[target.status] || STATUS_COLORS.healthy;

      for (let i = 0; i < PARTICLES_PER_EDGE; i++) {
        result.push({
          edgeIndex,
          progress: Math.random(), // Stagger start positions
          speed: 0.1 + edge.weight * 0.2, // Faster for higher weight
          sourcePos: source.position,
          targetPos: target.position,
          color,
        });
      }
    });

    return result;
  }, [edges, nodeMap, channelFocus]);

  // Create position and color buffers
  const { positions, colors } = useMemo(() => {
    const posArray = new Float32Array(particles.length * 3);
    const colorArray = new Float32Array(particles.length * 3);

    particles.forEach((p, i) => {
      // Initial position (will be updated in useFrame)
      posArray[i * 3] = 0;
      posArray[i * 3 + 1] = 0;
      posArray[i * 3 + 2] = 0;

      // Color
      colorArray[i * 3] = p.color.r;
      colorArray[i * 3 + 1] = p.color.g;
      colorArray[i * 3 + 2] = p.color.b;
    });

    return { positions: posArray, colors: colorArray };
  }, [particles]);

  // Animate particles along edges
  useFrame((state, delta) => {
    if (!pointsRef.current || particles.length === 0) return;

    const geo = pointsRef.current.geometry;
    const posAttr = geo.getAttribute('position') as Float32BufferAttribute;

    particles.forEach((particle, i) => {
      // Get current source/target positions from nodes (they may have moved)
      const source = nodeMap.get(edges[particle.edgeIndex]?.source);
      const target = nodeMap.get(edges[particle.edgeIndex]?.target);

      if (!source || !target) return;

      // Update progress
      particle.progress += delta * particle.speed;
      if (particle.progress > 1) {
        particle.progress = 0; // Loop back to start
      }

      // Interpolate position along edge
      const t = particle.progress;
      const x = source.position[0] + (target.position[0] - source.position[0]) * t;
      const y = source.position[1] + (target.position[1] - source.position[1]) * t;
      const z = source.position[2] + (target.position[2] - source.position[2]) * t;

      posAttr.setXYZ(i, x, y, z);
    });

    posAttr.needsUpdate = true;
  });

  if (particles.length === 0) return null;

  return (
    <points ref={pointsRef}>
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
      <pointsMaterial
        size={3}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
        blending={2} // AdditiveBlending
      />
    </points>
  );
}
