/**
 * Environment - Constellation 3D Environment Setup
 *
 * Light analytics theme (GA4/Tableau style) with:
 * - Subtle depth fog on light background
 * - Clean, professional lighting
 * - Accent lighting for story mode emphasis
 */

import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Fog, Color, PointLight } from 'three';
import { useConstellationStore } from '@/stores/constellationStore';
import { useStoryStore } from '@/stores/storyStore';

// Light background color (slate-100)
const BACKGROUND_COLOR = '#f1f5f9';

// Fog distances per zoom level - lighter fog for depth cues
const FOG_CONFIG = {
  ecosystem: { near: 200, far: 600 },
  campaign: { near: 120, far: 400 },
  hcp: { near: 60, far: 200 },
};

// Accent colors per visual state (more saturated for light bg)
const ACCENT_COLORS = {
  healthy: new Color('#16a34a'),  // green-600
  warning: new Color('#d97706'),  // amber-600
  critical: new Color('#dc2626'), // red-600
  bypass: new Color('#9333ea'),   // purple-600
};

export function Environment() {
  const { scene } = useThree();
  const accentLightRef = useRef<PointLight>(null);

  const zoomLevel = useConstellationStore((s) => s.zoomLevel);
  const storyModeActive = useConstellationStore((s) => s.storyModeActive);

  const beats = useStoryStore((s) => s.beats);
  const currentBeatIndex = useStoryStore((s) => s.currentBeatIndex);
  const currentBeat = beats[currentBeatIndex];

  // Initialize scene with light background
  useEffect(() => {
    scene.background = new Color(BACKGROUND_COLOR);
    scene.fog = new Fog(BACKGROUND_COLOR, FOG_CONFIG.ecosystem.near, FOG_CONFIG.ecosystem.far);

    return () => {
      scene.fog = null;
    };
  }, [scene]);

  // Update fog based on zoom level
  useEffect(() => {
    if (!scene.fog) return;

    const config = FOG_CONFIG[zoomLevel];
    const fog = scene.fog as Fog;

    fog.near = config.near;
    fog.far = config.far;
  }, [scene, zoomLevel]);

  // Animate accent light based on story state
  useFrame((state) => {
    if (!accentLightRef.current) return;

    // Subtle pulse for accent light
    const pulse = Math.sin(state.clock.elapsedTime * 1.5) * 0.05 + 0.95;
    accentLightRef.current.intensity = 0.4 * pulse;

    // Update color based on story beat
    if (storyModeActive && currentBeat) {
      const targetColor = ACCENT_COLORS[currentBeat.visualState] || ACCENT_COLORS.healthy;
      accentLightRef.current.color.lerp(targetColor, 0.05);
    } else {
      // Default indigo accent
      accentLightRef.current.color.lerp(new Color('#4f46e5'), 0.05);
    }
  });

  return (
    <>
      {/* Strong ambient light for light theme - ensures visibility */}
      <ambientLight intensity={0.8} color="#ffffff" />

      {/* Key light - main illumination from top-front */}
      <directionalLight
        position={[100, 150, 200]}
        intensity={0.6}
        color="#ffffff"
      />

      {/* Fill light - even illumination from opposite side */}
      <directionalLight
        position={[-80, -50, 100]}
        intensity={0.3}
        color="#f8fafc"
      />

      {/* Accent light - colored based on story state */}
      <pointLight
        ref={accentLightRef}
        position={[0, 0, 250]}
        intensity={0.4}
        color="#4f46e5"
        distance={500}
        decay={2}
      />
    </>
  );
}
