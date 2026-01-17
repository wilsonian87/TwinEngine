/**
 * Environment - Constellation 3D Environment Setup
 *
 * Sets up fog, lighting, and background for cinematic effect.
 * Features:
 * - Dynamic fog that adjusts with zoom level
 * - Accent lighting based on story mode state
 * - Starfield background for depth
 */

import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Fog, Color, PointLight } from 'three';
import { useConstellationStore } from '@/stores/constellationStore';
import { useStoryStore } from '@/stores/storyStore';
import { Starfield } from './Starfield';

// Fog distances per zoom level
const FOG_CONFIG = {
  ecosystem: { near: 150, far: 500 },
  campaign: { near: 80, far: 300 },
  hcp: { near: 30, far: 150 },
};

// Accent colors per visual state
const ACCENT_COLORS = {
  healthy: new Color('#22c55e'),
  warning: new Color('#f59e0b'),
  critical: new Color('#ef4444'),
  bypass: new Color('#a855f7'),
};

export function Environment() {
  const { scene } = useThree();
  const accentLightRef = useRef<PointLight>(null);

  const zoomLevel = useConstellationStore((s) => s.zoomLevel);
  const storyModeActive = useConstellationStore((s) => s.storyModeActive);

  const beats = useStoryStore((s) => s.beats);
  const currentBeatIndex = useStoryStore((s) => s.currentBeatIndex);
  const currentBeat = beats[currentBeatIndex];

  // Initialize scene
  useEffect(() => {
    scene.background = new Color('#0a0a0f');
    scene.fog = new Fog('#0a0a0f', FOG_CONFIG.ecosystem.near, FOG_CONFIG.ecosystem.far);

    return () => {
      scene.fog = null;
    };
  }, [scene]);

  // Update fog based on zoom level
  useEffect(() => {
    if (!scene.fog) return;

    const config = FOG_CONFIG[zoomLevel];
    const fog = scene.fog as Fog;

    // Smooth transition would require animation, for now instant update
    fog.near = config.near;
    fog.far = config.far;
  }, [scene, zoomLevel]);

  // Animate accent light based on story state
  useFrame((state) => {
    if (!accentLightRef.current) return;

    // Pulse the accent light
    const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1 + 0.9;
    accentLightRef.current.intensity = 0.3 * pulse;

    // Update color based on story beat
    if (storyModeActive && currentBeat) {
      const targetColor = ACCENT_COLORS[currentBeat.visualState] || ACCENT_COLORS.healthy;
      accentLightRef.current.color.lerp(targetColor, 0.05);
    } else {
      // Default purple accent
      accentLightRef.current.color.lerp(new Color('#6b21a8'), 0.05);
    }
  });

  return (
    <>
      {/* Starfield background */}
      <Starfield count={1500} radius={600} size={1.2} opacity={0.3} />

      {/* Soft ambient light - base illumination */}
      <ambientLight intensity={0.25} color="#e2e8f0" />

      {/* Key light - main illumination from top-front */}
      <pointLight
        position={[100, 150, 200]}
        intensity={0.4}
        color="#ffffff"
        distance={600}
        decay={2}
      />

      {/* Fill light - soften shadows from bottom */}
      <pointLight
        position={[-80, -100, 100]}
        intensity={0.15}
        color="#94a3b8"
        distance={400}
        decay={2}
      />

      {/* Accent light - colored based on story state */}
      <pointLight
        ref={accentLightRef}
        position={[0, 0, 300]}
        intensity={0.3}
        color="#6b21a8"
        distance={500}
        decay={2}
      />

      {/* Rim light - edge definition from back */}
      <pointLight
        position={[0, 50, -200]}
        intensity={0.2}
        color="#3b82f6"
        distance={400}
        decay={2}
      />
    </>
  );
}
