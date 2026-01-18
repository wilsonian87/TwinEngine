/**
 * Phase11CameraController - Animated camera transitions for L1/L2/L3 navigation
 *
 * Phase 11E: Smooth camera animations when navigating between levels.
 * Uses spring-based easing for natural movement.
 */

import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useConstellationStore } from '@/stores/constellationStore';

// Camera configurations for each level
const CAMERA_TARGETS = {
  L1: {
    position: new Vector3(0, 80, 200),
    lookAt: new Vector3(0, 0, 0),
  },
  L2: {
    position: new Vector3(0, 40, 100),
    lookAt: new Vector3(0, 0, 0),
  },
  L3: {
    position: new Vector3(0, 30, 80),
    lookAt: new Vector3(0, 0, 0),
  },
};

const TRANSITION_DURATION = 0.8; // seconds
const EASE_FACTOR = 0.08; // Spring-like easing

export function Phase11CameraController() {
  const { camera } = useThree();
  const navigationContext = useConstellationStore((s) => s.navigationContext);

  // Track transition state
  const transitionRef = useRef({
    isTransitioning: false,
    startTime: 0,
    startPosition: new Vector3(),
    targetPosition: new Vector3(),
    startLookAt: new Vector3(),
    targetLookAt: new Vector3(),
  });

  // Current interpolated lookAt target
  const currentLookAt = useRef(new Vector3(0, 0, 0));

  // Previous level to detect changes
  const prevLevelRef = useRef(navigationContext.level);

  // Detect level changes and start transition
  useEffect(() => {
    if (prevLevelRef.current !== navigationContext.level) {
      const target = CAMERA_TARGETS[navigationContext.level];

      // Start transition
      transitionRef.current = {
        isTransitioning: true,
        startTime: performance.now(),
        startPosition: camera.position.clone(),
        targetPosition: target.position.clone(),
        startLookAt: currentLookAt.current.clone(),
        targetLookAt: target.lookAt.clone(),
      };

      prevLevelRef.current = navigationContext.level;
    }
  }, [navigationContext.level, camera]);

  // Animate camera each frame
  useFrame(() => {
    const t = transitionRef.current;

    if (t.isTransitioning) {
      const elapsed = (performance.now() - t.startTime) / 1000;
      const progress = Math.min(elapsed / TRANSITION_DURATION, 1);

      // Ease out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);

      // Interpolate position
      camera.position.lerpVectors(t.startPosition, t.targetPosition, eased);

      // Interpolate lookAt
      currentLookAt.current.lerpVectors(t.startLookAt, t.targetLookAt, eased);
      camera.lookAt(currentLookAt.current);

      // End transition
      if (progress >= 1) {
        t.isTransitioning = false;
        camera.position.copy(t.targetPosition);
        currentLookAt.current.copy(t.targetLookAt);
        camera.lookAt(currentLookAt.current);
      }
    }
  });

  return null;
}
