/**
 * GlowMaterial - Custom ShaderMaterial with Fresnel Glow Effect
 *
 * Creates the characteristic "neural synapse" aesthetic with:
 * - Soft halo around nodes
 * - Pulsing animation for healthy nodes
 * - Edge glow using fresnel effect
 */

import { useRef, useMemo } from 'react';
import { ShaderMaterial, Color } from 'three';
import { useFrame } from '@react-three/fiber';

// Import shaders as raw strings (Vite handles this with ?raw suffix)
const vertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;

void main() {
  vNormal = normalize(normalMatrix * normal);

  #ifdef USE_INSTANCING_COLOR
    vColor = instanceColor;
  #else
    vColor = vec3(1.0);
  #endif

  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;

  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform float time;
uniform float glowIntensity;
uniform float pulseSpeed;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.0);

  // Pulsing effect
  float pulse = sin(time * pulseSpeed) * 0.15 + 0.85;

  // Core and glow colors
  vec3 coreColor = vColor * 0.8;
  vec3 glowColor = vColor * 1.5;

  // Mix based on fresnel
  vec3 finalColor = mix(coreColor, glowColor, fresnel * glowIntensity * pulse);

  // Rim highlight
  float rim = pow(fresnel, 3.0) * 0.5;
  finalColor += vec3(rim);

  // Alpha falloff
  float alpha = 1.0 - fresnel * 0.3;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

interface GlowMaterialProps {
  glowIntensity?: number;
  pulseSpeed?: number;
}

export function GlowMaterial({
  glowIntensity = 0.8,
  pulseSpeed = 2.0,
}: GlowMaterialProps) {
  const materialRef = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      glowIntensity: { value: glowIntensity },
      pulseSpeed: { value: pulseSpeed },
    }),
    [glowIntensity, pulseSpeed]
  );

  // Update time uniform each frame
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <shaderMaterial
      ref={materialRef}
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      uniforms={uniforms}
      transparent
      vertexColors
    />
  );
}

/**
 * Helper to create standalone glow material instance
 */
export function createGlowMaterial(options: GlowMaterialProps = {}): ShaderMaterial {
  const { glowIntensity = 0.8, pulseSpeed = 2.0 } = options;

  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      time: { value: 0 },
      glowIntensity: { value: glowIntensity },
      pulseSpeed: { value: pulseSpeed },
    },
    transparent: true,
    vertexColors: true,
  });
}
