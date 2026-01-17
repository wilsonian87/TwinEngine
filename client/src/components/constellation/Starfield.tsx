/**
 * Starfield - Ambient Background Particles
 *
 * Creates a subtle starfield effect in the background to give
 * depth and "space" feel to the constellation visualization.
 */

import { useRef, useMemo } from 'react';
import { Points, PointsMaterial, BufferGeometry, Float32BufferAttribute } from 'three';
import { useFrame } from '@react-three/fiber';

interface StarfieldProps {
  count?: number;
  radius?: number;
  size?: number;
  opacity?: number;
}

export function Starfield({
  count = 2000,
  radius = 500,
  size = 1,
  opacity = 0.4,
}: StarfieldProps) {
  const pointsRef = useRef<Points>(null);

  // Generate random star positions in a sphere
  const { positions, sizes } = useMemo(() => {
    const posArray = new Float32Array(count * 3);
    const sizeArray = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribute in a hollow sphere (between 0.7 and 1.0 of radius)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (0.7 + Math.random() * 0.3);

      posArray[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      posArray[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      posArray[i * 3 + 2] = r * Math.cos(phi);

      // Vary star sizes
      sizeArray[i] = size * (0.5 + Math.random() * 0.5);
    }

    return { positions: posArray, sizes: sizeArray };
  }, [count, radius, size]);

  // Subtle rotation for parallax effect
  useFrame((state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.01;
      pointsRef.current.rotation.x += delta * 0.005;
    }
  });

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
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#6366f1"
        size={size}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
