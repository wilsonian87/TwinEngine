// Nucleus Vertex Shader
// Passes UV coordinates and position for fragment shader noise generation

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

uniform float time;

void main() {
  vUv = uv;
  vPosition = position;
  vNormal = normalize(normalMatrix * normal);

  // Subtle breathing animation
  float breathe = sin(time * 0.5) * 0.02 + 1.0;
  vec3 animatedPosition = position * breathe;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(animatedPosition, 1.0);
}
