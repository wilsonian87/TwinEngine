/**
 * NodeInstances - InstancedMesh Node Renderer
 *
 * Efficiently renders 2,500+ nodes as a single GPU call using InstancedMesh.
 * Status-based coloring: green (healthy), amber (warning), red (critical)
 * Features: hover highlight, pulse animation, shiver effect for critical nodes
 */

import { useRef, useMemo, useEffect, useCallback } from 'react';
import { InstancedMesh, Object3D, Color } from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useConstellationStore } from '@/stores/constellationStore';
import { useStoryStore } from '@/stores/storyStore';

// Saturated colors for light background (GA4/Tableau style)
const STATUS_COLORS = {
  healthy: new Color('#15803d'),  // green-700 - rich green
  warning: new Color('#b45309'),  // amber-700 - deep amber
  critical: new Color('#b91c1c'), // red-700 - strong red
};

const HIGHLIGHT_COLOR = new Color('#1e1b4b'); // indigo-950 for contrast on light bg
const DIM_FACTOR = 0.3; // Higher opacity for non-focus nodes (still visible on light bg)

const tempObject = new Object3D();
const tempColor = new Color();

interface NodeInstancesProps {
  onHover?: (nodeId: string | null) => void;
  onClick?: (nodeId: string) => void;
}

export function NodeInstances({ onHover, onClick }: NodeInstancesProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const nodes = useConstellationStore((s) => s.nodes);
  const hoveredNodeId = useConstellationStore((s) => s.hoveredNodeId);
  const storyModeActive = useConstellationStore((s) => s.storyModeActive);

  // Story mode focus
  const beats = useStoryStore((s) => s.beats);
  const currentBeatIndex = useStoryStore((s) => s.currentBeatIndex);
  const currentBeat = beats[currentBeatIndex];
  const channelFocus = storyModeActive ? currentBeat?.channelFocus : null;
  const visualState = storyModeActive ? currentBeat?.visualState : null;

  // Filter to HCP nodes only (channels rendered separately)
  const hcpNodes = useMemo(() => nodes.filter(n => n.type === 'hcp'), [nodes]);

  // Create index lookup for hovered node
  const hoveredIndex = useMemo(() => {
    if (!hoveredNodeId) return -1;
    return hcpNodes.findIndex(n => n.id === hoveredNodeId);
  }, [hcpNodes, hoveredNodeId]);

  // Update instance matrices and colors when nodes change
  useEffect(() => {
    if (!meshRef.current || hcpNodes.length === 0) return;

    hcpNodes.forEach((node, i) => {
      // Position
      tempObject.position.set(...node.position);
      // Base scale based on engagement score (0.8 to 1.5)
      const baseScale = 0.8 + node.engagementScore * 0.7;
      tempObject.scale.setScalar(baseScale);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);

      // Color based on status
      tempColor.copy(STATUS_COLORS[node.status]);

      // Story mode visual state emphasis
      if (storyModeActive && visualState) {
        const isFocusedChannel = !channelFocus || node.channel === channelFocus;

        if (!isFocusedChannel) {
          // Dim non-focused channels
          tempColor.multiplyScalar(DIM_FACTOR);
        } else if (visualState === 'critical' && node.status === 'critical') {
          // Emphasize critical nodes during critical beat
          tempColor.multiplyScalar(1.3);
        } else if (visualState === 'warning' && node.status === 'warning') {
          // Emphasize warning nodes during warning beat
          tempColor.multiplyScalar(1.2);
        } else if (visualState === 'bypass') {
          // During bypass beat, highlight healthy nodes as the solution
          if (node.status === 'healthy') {
            tempColor.multiplyScalar(1.3);
          } else if (node.status === 'critical') {
            // Show critical nodes transitioning (slightly dimmed)
            tempColor.multiplyScalar(0.7);
          }
        }
      } else if (channelFocus && node.channel !== channelFocus) {
        // Simple channel focus dimming
        tempColor.multiplyScalar(DIM_FACTOR);
      }

      meshRef.current!.setColorAt(i, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [hcpNodes, channelFocus, visualState, storyModeActive]);

  // Per-frame animation: hover highlight, pulse, shiver
  useFrame((state) => {
    if (!meshRef.current || hcpNodes.length === 0) return;

    const time = state.clock.elapsedTime;
    let matrixNeedsUpdate = false;
    let colorNeedsUpdate = false;

    // Intensify effects during critical visual state
    const isCriticalBeat = visualState === 'critical';
    const isBypassBeat = visualState === 'bypass';

    hcpNodes.forEach((node, i) => {
      const isHovered = i === hoveredIndex;
      const isFocused = !channelFocus || node.channel === channelFocus;

      // Calculate scale
      let scale = 0.8 + node.engagementScore * 0.7;

      // Hover: scale up
      if (isHovered) {
        scale *= 1.5;
      }

      // Healthy nodes: gentle pulse (stronger during bypass beat)
      if (node.status === 'healthy' && isFocused) {
        const pulseIntensity = isBypassBeat ? 0.15 : 0.1;
        const pulseSpeed = isBypassBeat ? 3 : 2;
        const pulse = Math.sin(time * pulseSpeed + i * 0.1) * pulseIntensity + 1;
        scale *= pulse;
      }

      // Critical nodes: shiver effect (intensified during critical beat)
      if (node.status === 'critical') {
        const shiverIntensity = isCriticalBeat ? 1.0 : 0.5;
        const shiverSpeed = isCriticalBeat ? 25 : 20;
        const shiver = Math.sin(time * shiverSpeed + i) * shiverIntensity;
        tempObject.position.set(
          node.position[0] + shiver,
          node.position[1] + shiver * 0.5,
          node.position[2]
        );
        matrixNeedsUpdate = true;
      } else {
        tempObject.position.set(...node.position);
      }

      tempObject.scale.setScalar(scale);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
      matrixNeedsUpdate = true;

      // Hover: brighten color
      if (isHovered) {
        tempColor.copy(STATUS_COLORS[node.status]).lerp(HIGHLIGHT_COLOR, 0.3);
        meshRef.current!.setColorAt(i, tempColor);
        colorNeedsUpdate = true;
      }
    });

    if (matrixNeedsUpdate) {
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
    if (colorNeedsUpdate && meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  // Debounced hover handler to prevent jitter
  const lastHoverTime = useRef(0);
  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const now = Date.now();
    // Debounce: only update every 16ms (60fps)
    if (now - lastHoverTime.current < 16) return;
    lastHoverTime.current = now;

    if (e.instanceId !== undefined) {
      const node = hcpNodes[e.instanceId];
      if (node && onHover) {
        onHover(node.id);
      }
    }
  }, [hcpNodes, onHover]);

  const handlePointerOut = useCallback(() => {
    if (onHover) {
      onHover(null);
    }
  }, [onHover]);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) {
      const node = hcpNodes[e.instanceId];
      if (node && onClick) {
        onClick(node.id);
      }
    }
  }, [hcpNodes, onClick]);

  if (hcpNodes.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, hcpNodes.length]}
      frustumCulled={false}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <sphereGeometry args={[2, 16, 16]} />
      <meshBasicMaterial vertexColors toneMapped={false} />
    </instancedMesh>
  );
}
