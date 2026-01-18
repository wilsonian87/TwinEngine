/**
 * ConstellationCanvas - React Three Fiber Canvas Wrapper
 *
 * Main component that:
 * - Initializes the R3F canvas
 * - Manages the physics Web Worker
 * - Coordinates all 3D components
 */

import { useRef, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Vector3 } from 'three';
import { useConstellationStore } from '@/stores/constellationStore';
import { generateMockConstellation } from '@/lib/constellation/mockData';
import { NodeInstances } from './NodeInstances';
import { ChannelNodes } from './ChannelNodes';
import { EdgeLines } from './EdgeLines';
import { EdgeFlow } from './EdgeFlow';
import { Environment } from './Environment';
import { StoryCameraController } from './StoryCameraController';
import { ZoomCameraController } from './ZoomCameraController';
import { getZoomLevelFromDistance, ZOOM_THRESHOLDS } from './SemanticZoom';

// Type-safe worker import (Vite handles the ?worker suffix)
import PhysicsWorkerUrl from '@/workers/physics.worker?worker&url';

/**
 * Inner component that handles zoom level detection
 */
function ZoomLevelController() {
  const setZoomLevel = useConstellationStore((s) => s.setZoomLevel);
  const currentZoomLevel = useConstellationStore((s) => s.zoomLevel);
  const storyModeActive = useConstellationStore((s) => s.storyModeActive);
  const origin = useRef(new Vector3(0, 0, 0));
  const lastZoomRef = useRef(currentZoomLevel);

  // Disable controls during story mode
  if (storyModeActive) {
    return null;
  }

  return (
    <OrbitControls
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={50}
      maxDistance={500}
      zoomSpeed={0.8}
      rotateSpeed={0.5}
      panSpeed={0.8}
      onChange={(e) => {
        if (!e?.target) return;
        const camera = e.target.object;
        const distance = camera.position.distanceTo(origin.current);

        // Use semantic zoom thresholds
        const newZoomLevel = getZoomLevelFromDistance(distance);

        // Only update if changed to avoid unnecessary rerenders
        if (newZoomLevel !== lastZoomRef.current) {
          lastZoomRef.current = newZoomLevel;
          setZoomLevel(newZoomLevel);
        }
      }}
    />
  );
}

/**
 * Inner scene component
 */
function ConstellationScene() {
  const setHoveredNode = useConstellationStore((s) => s.setHoveredNode);
  const setSelectedNode = useConstellationStore((s) => s.setSelectedNode);
  const storyModeActive = useConstellationStore((s) => s.storyModeActive);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 300]} fov={60} />
      <Suspense fallback={null}>
        <Environment />
        <EdgeLines />
        <EdgeFlow />
        <NodeInstances
          onHover={setHoveredNode}
          onClick={setSelectedNode}
        />
        <ChannelNodes />
      </Suspense>
      <ZoomLevelController />
      <ZoomCameraController />
      {storyModeActive && <StoryCameraController />}
    </>
  );
}

export function ConstellationCanvas() {
  const workerRef = useRef<Worker | null>(null);
  const {
    setNodes,
    setEdges,
    updatePositions,
    setPhysicsSettled,
    storyModeActive,
  } = useConstellationStore();

  // Initialize worker and mock data
  useEffect(() => {
    // Create worker
    workerRef.current = new Worker(PhysicsWorkerUrl, { type: 'module' });

    // Generate mock data
    const { nodes, edges } = generateMockConstellation(2500);
    setNodes(nodes);
    setEdges(edges);

    // Send to worker for physics simulation
    workerRef.current.postMessage({
      type: 'init',
      nodes: nodes.map(n => ({ id: n.id })),
      edges: edges.map(e => ({
        source: e.source,
        target: e.target,
        weight: e.weight,
      })),
    });

    // Listen for position updates
    workerRef.current.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'positions') {
        updatePositions(e.data.positions);
      } else if (e.data.type === 'settled') {
        setPhysicsSettled(true);
        console.log('[Constellation] Physics simulation settled');
      }
    };

    // Cleanup
    return () => {
      workerRef.current?.postMessage({ type: 'stop' });
      workerRef.current?.terminate();
    };
  }, [setNodes, setEdges, updatePositions, setPhysicsSettled]);

  return (
    <div className="w-full h-full bg-slate-100">
      <Canvas
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]} // Limit pixel ratio for performance
        camera={{ position: [0, 0, 300], fov: 60 }}
        style={{ background: '#f1f5f9' }} // slate-100 - light analytics background
      >
        <ConstellationScene />
      </Canvas>
    </div>
  );
}
