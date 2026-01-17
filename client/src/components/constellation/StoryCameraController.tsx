/**
 * StoryCameraController - Animated Camera for Story Mode
 *
 * Smoothly animates camera position and lookAt target between story beats.
 * Uses eased interpolation for cinematic transitions.
 */

import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useConstellationStore } from '@/stores/constellationStore';
import { useStoryStore } from '@/stores/storyStore';

// Easing function for smooth transitions
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Transition duration in seconds
const TRANSITION_DURATION = 2.0;

interface CameraState {
  position: Vector3;
  lookAt: Vector3;
}

export function StoryCameraController() {
  const { camera } = useThree();
  const storyModeActive = useConstellationStore((s) => s.storyModeActive);

  const beats = useStoryStore((s) => s.beats);
  const currentBeatIndex = useStoryStore((s) => s.currentBeatIndex);
  const currentBeat = beats[currentBeatIndex];

  // Animation state
  const isAnimating = useRef(false);
  const animationProgress = useRef(0);
  const startState = useRef<CameraState>({
    position: new Vector3(),
    lookAt: new Vector3(),
  });
  const targetState = useRef<CameraState>({
    position: new Vector3(),
    lookAt: new Vector3(),
  });
  const currentLookAt = useRef(new Vector3(0, 0, 0));

  // Store the free exploration camera state
  const freeExplorationState = useRef<CameraState | null>(null);

  // Handle entering/exiting story mode
  useEffect(() => {
    if (storyModeActive) {
      // Save current camera state for later restoration
      freeExplorationState.current = {
        position: camera.position.clone(),
        lookAt: currentLookAt.current.clone(),
      };

      // Start animating to first beat
      if (currentBeat) {
        startTransition(
          currentBeat.cameraTarget as [number, number, number],
          currentBeat.cameraLookAt as [number, number, number]
        );
      }
    } else {
      // Restore free exploration state
      if (freeExplorationState.current) {
        startTransition(
          freeExplorationState.current.position.toArray() as [number, number, number],
          freeExplorationState.current.lookAt.toArray() as [number, number, number]
        );
      }
    }
  }, [storyModeActive]);

  // Handle beat changes
  useEffect(() => {
    if (!storyModeActive || !currentBeat) return;

    startTransition(
      currentBeat.cameraTarget as [number, number, number],
      currentBeat.cameraLookAt as [number, number, number]
    );
  }, [currentBeatIndex, storyModeActive]);

  function startTransition(
    targetPosition: [number, number, number],
    targetLookAt: [number, number, number]
  ) {
    // Capture current state
    startState.current.position.copy(camera.position);
    startState.current.lookAt.copy(currentLookAt.current);

    // Set target state
    targetState.current.position.set(...targetPosition);
    targetState.current.lookAt.set(...targetLookAt);

    // Start animation
    isAnimating.current = true;
    animationProgress.current = 0;
  }

  // Animate camera each frame
  useFrame((_, delta) => {
    if (!isAnimating.current) return;

    // Update progress
    animationProgress.current += delta / TRANSITION_DURATION;

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

/**
 * Hook to check if camera is currently animating
 */
export function useCameraAnimating() {
  const isAnimatingRef = useRef(false);
  return isAnimatingRef.current;
}
