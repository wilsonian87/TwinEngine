/**
 * HCPNucleus - Central sphere representing the HCP universe
 *
 * Phase 11: The nucleus is the center of gravity in the Solar System model.
 * Shows "many HCPs" via shader noise texture with subtle breathing animation.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// Import shader sources as raw strings
import nucleusVertexShader from '@/lib/constellation/shaders/nucleusVertex.glsl?raw';
import nucleusFragmentShader from '@/lib/constellation/shaders/nucleusFragment.glsl?raw';

interface HCPNucleusProps {
  totalHcps: number;
  avgEngagement?: number;
  size?: 'small' | 'medium' | 'large';
  label?: string;
  onClick?: () => void;
}

const SIZE_CONFIG = {
  small: { radius: 15, labelOffset: 18 },
  medium: { radius: 25, labelOffset: 28 },
  large: { radius: 35, labelOffset: 40 },
};

export function HCPNucleus({
  totalHcps,
  avgEngagement = 67,
  size = 'large',
  label,
  onClick,
}: HCPNucleusProps) {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const { radius, labelOffset } = SIZE_CONFIG[size];

  // Shader uniforms
  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      noiseScale: { value: 3.0 },
      baseColor: { value: new THREE.Color('#475569') }, // slate-600
      particleColor: { value: new THREE.Color('#94a3b8') }, // slate-400
      glowColor: { value: new THREE.Color('#6366f1') }, // indigo-500
    }),
    []
  );

  // Animate shader time uniform
  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  // Health indicator color
  const healthColor = useMemo(() => {
    if (avgEngagement >= 70) return '#22c55e'; // green-500
    if (avgEngagement >= 50) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  }, [avgEngagement]);

  return (
    <group>
      {/* Main nucleus sphere */}
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => {
          if (meshRef.current) {
            document.body.style.cursor = onClick ? 'pointer' : 'default';
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[radius, 64, 64]} />
        <shaderMaterial
          ref={shaderRef}
          uniforms={uniforms}
          vertexShader={nucleusVertexShader}
          fragmentShader={nucleusFragmentShader}
          transparent={false}
        />
      </mesh>

      {/* Outer glow ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius + 2, radius + 4, 64]} />
        <meshBasicMaterial
          color="#6366f1"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* HCP Count Label */}
      <Html
        position={[0, labelOffset, 0]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div className="flex flex-col items-center gap-1">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-slate-200">
            <div className="text-2xl font-bold text-slate-900">
              {totalHcps.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 text-center">
              {label || 'HCPs'}
            </div>
          </div>
          {/* Health indicator */}
          <div
            className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${healthColor}20`, color: healthColor }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: healthColor }}
            />
            {avgEngagement}% Avg Engagement
          </div>
        </div>
      </Html>
    </group>
  );
}
