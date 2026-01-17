/**
 * Constellation Visualization Types
 *
 * Shared types for the 3D HCP network visualization
 */

export type NodeStatus = 'healthy' | 'warning' | 'critical';

export type ZoomLevel = 'ecosystem' | 'campaign' | 'hcp';

export type VisualState = 'healthy' | 'warning' | 'critical' | 'bypass';

export interface ConstellationNode {
  id: string;
  label: string;
  type: 'channel' | 'campaign' | 'hcp';
  status: NodeStatus;
  engagementScore: number;
  channel?: string;
  specialty?: string;
  position: [number, number, number];
}

export interface ConstellationEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export interface PhysicsWorkerNode {
  id: string;
  x?: number;
  y?: number;
  z?: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
}

export interface PhysicsWorkerEdge {
  source: string;
  target: string;
  weight: number;
}

// Worker message types
export interface WorkerInitMessage {
  type: 'init';
  nodes: PhysicsWorkerNode[];
  edges: PhysicsWorkerEdge[];
}

export interface WorkerTickMessage {
  type: 'tick';
}

export interface WorkerStopMessage {
  type: 'stop';
}

export interface WorkerReheatMessage {
  type: 'reheat';
  alpha?: number;
}

export type WorkerIncomingMessage =
  | WorkerInitMessage
  | WorkerTickMessage
  | WorkerStopMessage
  | WorkerReheatMessage;

export interface WorkerPositionsMessage {
  type: 'positions';
  positions: Float32Array;
}

export interface WorkerSettledMessage {
  type: 'settled';
}

export type WorkerOutgoingMessage =
  | WorkerPositionsMessage
  | WorkerSettledMessage;
