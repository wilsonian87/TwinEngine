/**
 * Physics Web Worker - d3-force-3d Simulation
 *
 * Runs force simulation off the main thread for smooth 60fps rendering.
 * Sends position updates via transferable Float32Array.
 */

import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
} from 'd3-force-3d';

interface WorkerNode {
  id: string;
  index?: number;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
}

interface WorkerEdge {
  source: string | WorkerNode;
  target: string | WorkerNode;
  weight: number;
}

interface InitMessage {
  type: 'init';
  nodes: { id: string }[];
  edges: { source: string; target: string; weight: number }[];
}

interface TickMessage {
  type: 'tick';
}

interface StopMessage {
  type: 'stop';
}

interface ReheatMessage {
  type: 'reheat';
  alpha?: number;
}

type IncomingMessage = InitMessage | TickMessage | StopMessage | ReheatMessage;

// Simulation state
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let simulation: any = null;
let nodes: WorkerNode[] = [];
let isRunning = false;

/**
 * Send positions to main thread using transferable Float32Array
 * for zero-copy performance
 */
function sendPositions(): void {
  const positions = new Float32Array(nodes.length * 3);
  nodes.forEach((node, i) => {
    positions[i * 3] = node.x ?? 0;
    positions[i * 3 + 1] = node.y ?? 0;
    positions[i * 3 + 2] = node.z ?? 0;
  });
  // Transfer ownership for zero-copy
  self.postMessage({ type: 'positions', positions }, { transfer: [positions.buffer] });
}

/**
 * Initialize the force simulation
 */
function initSimulation(initNodes: { id: string }[], edges: WorkerEdge[]): void {
  // Stop any existing simulation
  if (simulation) {
    simulation.stop();
  }

  // Create node objects with initial positions
  nodes = initNodes.map((n, i) => ({
    id: n.id,
    index: i,
    // Spread initial positions in a sphere for faster convergence
    x: (Math.random() - 0.5) * 100,
    y: (Math.random() - 0.5) * 100,
    z: (Math.random() - 0.5) * 100,
  }));

  // Create simulation with 3D forces
  simulation = forceSimulation(nodes, 3)
    // Repulsion between all nodes
    .force('charge', forceManyBody()
      .strength(-30)
      .distanceMax(200)
    )
    // Attraction along edges
    .force('link', forceLink<WorkerNode, WorkerEdge>(edges)
      .id((d: WorkerNode) => d.id)
      .distance(50)
      .strength((link: WorkerEdge) => link.weight * 0.5)
    )
    // Gravity toward center
    .force('center', forceCenter(0, 0, 0))
    // Collision avoidance
    .force('collide', forceCollide()
      .radius(5)
      .strength(0.7)
    )
    // Slower decay for smoother settling
    .alphaDecay(0.02)
    .velocityDecay(0.3)
    .on('tick', () => {
      if (isRunning) {
        sendPositions();
      }
    })
    .on('end', () => {
      self.postMessage({ type: 'settled' });
      isRunning = false;
    });

  isRunning = true;
}

/**
 * Reheat the simulation (for zoom transitions or user interaction)
 */
function reheatSimulation(alpha: number = 0.3): void {
  if (simulation) {
    simulation.alpha(alpha).restart();
    isRunning = true;
  }
}

// Message handler
self.onmessage = (e: MessageEvent<IncomingMessage>) => {
  const { type } = e.data;

  switch (type) {
    case 'init': {
      const { nodes: initNodes, edges } = e.data as InitMessage;
      initSimulation(initNodes, edges);
      break;
    }

    case 'tick': {
      // Manual tick if needed
      if (simulation) {
        simulation.tick();
        sendPositions();
      }
      break;
    }

    case 'reheat': {
      const { alpha } = e.data as ReheatMessage;
      reheatSimulation(alpha);
      break;
    }

    case 'stop': {
      if (simulation) {
        simulation.stop();
        isRunning = false;
      }
      break;
    }
  }
};
