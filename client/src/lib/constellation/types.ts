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

// ============================================================================
// PHASE 11: Three-Level Hierarchy Types
// ============================================================================

export type ConstellationLevel = 'L1' | 'L2' | 'L3';

export interface L1Context {
  level: 'L1';
}

export interface L2Context {
  level: 'L2';
  channelId: string;
  channelLabel: string;
}

export interface L3Context {
  level: 'L3';
  channelId: string;
  channelLabel: string;
  campaignId: string;
  campaignName: string;
}

export type NavigationContext = L1Context | L2Context | L3Context;

// Channel data for L1 view
export interface L1ChannelData {
  id: string;
  label: string;
  hcpReach: number;
  avgEngagement: number;
  campaignCount: number;
  color: string;
  icon: string;
}

// Campaign data for L2 view
export interface L2CampaignData {
  id: string;
  name: string;
  brand: string | null;
  therapeuticArea: string | null;
  hcpReach: number;
  primaryTheme: string | null;
  primaryThemeColor: string | null;
  secondaryTheme: string | null;
  kpis: Record<string, number>;
}

// HCP data for L3 view
export interface L3HCPData {
  id: string;
  name: string;
  specialty: string;
  specialtyAbbr: string;
  specialtyColor: string;
  engagementScore: number;
  sparkline: number[];
  rxTrend: 'up' | 'down' | 'flat';
  channelAffinity: string;
  adoptionStage: 'Aware' | 'Trial' | 'Regular';
  lastTouchDate: string;
}

// KPI configuration per channel
export interface ChannelKPIConfig {
  key: string;
  label: string;
  format: 'percent' | 'number' | 'currency' | 'decimal';
}

// Channel interconnection (HCP overlap)
export interface ChannelInterconnection {
  source: string;
  target: string;
  overlapIndex: number;
  overlapCount: number | null;
}
