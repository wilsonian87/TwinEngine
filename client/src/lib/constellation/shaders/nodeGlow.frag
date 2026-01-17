/**
 * Node Glow Fragment Shader
 *
 * Creates soft glow/halo effect using fresnel calculation.
 * Supports time-based pulsing for healthy nodes.
 */

uniform float time;
uniform float glowIntensity;
uniform float pulseSpeed;
uniform bool isPulsing;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;

void main() {
  // Normalize view direction
  vec3 viewDir = normalize(vViewPosition);

  // Fresnel effect: edges glow brighter
  float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.0);

  // Pulsing effect (for healthy nodes)
  float pulse = 1.0;
  if (isPulsing) {
    pulse = sin(time * pulseSpeed) * 0.15 + 0.85;
  }

  // Core color (slightly darkened)
  vec3 coreColor = vColor * 0.8;

  // Glow color (brighter, saturated)
  vec3 glowColor = vColor * 1.5;

  // Mix core and glow based on fresnel
  vec3 finalColor = mix(coreColor, glowColor, fresnel * glowIntensity * pulse);

  // Add subtle rim highlight
  float rim = pow(fresnel, 3.0) * 0.5;
  finalColor += vec3(rim);

  // Soft alpha falloff at edges for halo effect
  float alpha = 1.0 - fresnel * 0.3;

  gl_FragColor = vec4(finalColor, alpha);
}
