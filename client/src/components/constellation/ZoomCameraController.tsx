/**
 * ZoomCameraController - Animated Camera for Zoom Level Changes
 *
 * Phase 10H: Handles camera animation requests from zoom controls and keyboard shortcuts.
 * Uses eased interpolation for smooth transitions between zoom levels.
 */

import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useConstellationStore } from '@/stores/constellationStore';

// Easing function for smooth transitions
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface CameraState {
  position: Vector3;
  lookAt: Vector3;
}

export function ZoomCameraController() {
  const { camera } = useThree();
  const storyModeActive = useConstellationStore((s) => s.storyModeActive);
  const cameraAnimationRequest = useConstellationStore((s) => s.cameraAnimationRequest);
  const clearCameraAnimationRequest = useConstellationStore((s) => s.clearCameraAnimationRequest);

  // Animation state
  const isAnimating = useRef(false);
  const animationProgress = useRef(0);
  const animationDuration = useRef(0.5);
  const startState = useRef<CameraState>({
    position: new Vector3(),
    lookAt: new Vector3(),
  });
  const targetState = useRef<CameraState>({
    position: new Vector3(),
    lookAt: new Vector3(),
  });
  const currentLookAt = useRef(new Vector3(0, 0, 0));

  // Handle camera animation requests
  useEffect(() => {
    // Don't process if in story mode (story controller handles camera)
    if (storyModeActive || !cameraAnimationRequest) return;

    // Start animation
    startState.current.position.copy(camera.position);
    startState.current.lookAt.copy(currentLookAt.current);

    targetState.current.position.set(...cameraAnimationRequest.target);
    targetState.current.lookAt.set(...cameraAnimationRequest.lookAt);
    animationDuration.current = cameraAnimationRequest.duration || 0.5;

    isAnimating.current = true;
    animationProgress.current = 0;

    // Clear the request so it doesn't re-trigger
    clearCameraAnimationRequest();
  }, [cameraAnimationRequest, storyModeActive, camera, clearCameraAnimationRequest]);

  // Animate camera each frame
  useFrame((_, delta) => {
    if (!isAnimating.current || storyModeActive) return;

    // Update progress
    animationProgress.current += delta / animationDuration.current;

    if (animationProgress.current >= 1) {
      // Animation complete
      animationProgress.current = 1;
      isAnimating.current = false;
    }

    // Apply easing
    const t = easeInOutCubic(animationProgress.current);

    // Interpolate position
    camera.position.lerpVectors(
      startState.current.position,
      targetState.current.position,
      t
    );

    // Interpolate lookAt
    currentLookAt.current.lerpVectors(
      startState.current.lookAt,
      targetState.current.lookAt,
      t
    );

    // Apply lookAt
    camera.lookAt(currentLookAt.current);
  });

  return null; // This component doesn't render anything
}
