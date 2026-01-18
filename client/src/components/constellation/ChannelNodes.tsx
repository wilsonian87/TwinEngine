/**
 * ChannelNodes - Renders Channel Hub Nodes
 *
 * Channel nodes are larger (L1 level) and serve as cluster centers.
 * They have a distinctive glow and label.
 */

import { useRef, useMemo } from 'react';
import { Mesh, Color } from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useConstellationStore } from '@/stores/constellationStore';
import type { ConstellationNode } from '@/stores/constellationStore';

// More saturated colors for light background
const STATUS_COLORS = {
  healthy: '#16a34a',  // green-600
  warning: '#d97706',  // amber-600
  critical: '#dc2626', // red-600
};

interface ChannelNodeProps {
  node: ConstellationNode;
}

function ChannelNode({ node }: ChannelNodeProps) {
  const meshRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);
  const zoomLevel = useConstellationStore((s) => s.zoomLevel);

  const color = STATUS_COLORS[node.status];

  // Animate glow
  useFrame((state) => {
    if (glowRef.current) {
      const scale = 1.5 + Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
      glowRef.current.scale.setScalar(scale);
    }
  });

  // Only show labels at ecosystem and campaign zoom levels
  const showLabel = zoomLevel !== 'hcp';

  return (
    <group position={node.position}>
      {/* Core sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[8, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>

      {/* Outer glow sphere */}
      <mesh ref={glowRef} scale={1.5}>
        <sphereGeometry args={[8, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>

      {/* Label */}
      {showLabel && (
        <Html
          position={[0, 15, 0]}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: `2px solid ${color}`,
              color: color,
              boxShadow: `0 2px 8px rgba(0,0,0,0.15)`,
            }}
          >
            {node.label}
          </div>
        </Html>
      )}
    </group>
  );
}

export function ChannelNodes() {
  const nodes = useConstellationStore((s) => s.nodes);
  const channelNodes = useMemo(
    () => nodes.filter((n) => n.type === 'channel'),
    [nodes]
  );

  return (
    <group>
      {channelNodes.map((node) => (
        <ChannelNode key={node.id} node={node} />
      ))}
    </group>
  );
}
