/**
 * Node Glow Vertex Shader
 *
 * Handles instanced geometry positioning and passes data to fragment shader.
 * Supports per-instance colors via instanceColor attribute.
 */

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;
varying float vEngagement;

// Instance attributes (provided by Three.js InstancedMesh)
// instanceMatrix is built-in
// instanceColor is built-in when using setColorAt()

void main() {
  // Transform normal to view space
  vNormal = normalize(normalMatrix * normal);

  // Pass instance color to fragment
  #ifdef USE_INSTANCING_COLOR
    vColor = instanceColor;
  #else
    vColor = vec3(1.0);
  #endif

  // Calculate position with instance transform
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;

  gl_Position = projectionMatrix * mvPosition;
}
