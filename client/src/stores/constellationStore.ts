/**
 * Constellation Store - Zustand state management for 3D visualization
 *
 * Manages: nodes, edges, interaction state, zoom levels, story mode
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type NodeStatus = 'healthy' | 'warning' | 'critical';
export type ZoomLevel = 'ecosystem' | 'campaign' | 'hcp';

export interface ConstellationNode {
  id: string;
  label: string;
  type: 'channel' | 'campaign' | 'hcp';
  status: NodeStatus;
  engagementScore: number;
  channel?: string;
  specialty?: string;
  // Position updated by physics worker
  position: [number, number, number];
}

export interface ConstellationEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

interface ConstellationState {
  // Data
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
  isPhysicsSettled: boolean;

  // Interaction
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  zoomLevel: ZoomLevel;

  // Story Mode
  storyModeActive: boolean;

  // Actions
  setNodes: (nodes: ConstellationNode[]) => void;
  setEdges: (edges: ConstellationEdge[]) => void;
  updatePositions: (positions: Float32Array) => void;
  setHoveredNode: (id: string | null) => void;
  setSelectedNode: (id: string | null) => void;
  setZoomLevel: (level: ZoomLevel) => void;
  toggleStoryMode: () => void;
  setPhysicsSettled: (settled: boolean) => void;
  reset: () => void;
}

// Selectors for common queries
export const selectHoveredNode = (state: ConstellationState) =>
  state.nodes.find(n => n.id === state.hoveredNodeId);

export const selectSelectedNode = (state: ConstellationState) =>
  state.nodes.find(n => n.id === state.selectedNodeId);

export const selectNodesByStatus = (state: ConstellationState, status: NodeStatus) =>
  state.nodes.filter(n => n.status === status);

export const selectHcpNodes = (state: ConstellationState) =>
  state.nodes.filter(n => n.type === 'hcp');

export const selectChannelNodes = (state: ConstellationState) =>
  state.nodes.filter(n => n.type === 'channel');

const initialState = {
  nodes: [],
  edges: [],
  isPhysicsSettled: false,
  hoveredNodeId: null,
  selectedNodeId: null,
  zoomLevel: 'ecosystem' as ZoomLevel,
  storyModeActive: false,
};

export const useConstellationStore = create<ConstellationState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setNodes: (nodes) => set({ nodes }, false, 'setNodes'),

      setEdges: (edges) => set({ edges }, false, 'setEdges'),

      updatePositions: (positions) => {
        const nodes = get().nodes.map((node, i) => ({
          ...node,
          position: [
            positions[i * 3],
            positions[i * 3 + 1],
            positions[i * 3 + 2],
          ] as [number, number, number],
        }));
        set({ nodes }, false, 'updatePositions');
      },

      setHoveredNode: (id) => set({ hoveredNodeId: id }, false, 'setHoveredNode'),

      setSelectedNode: (id) => set({ selectedNodeId: id }, false, 'setSelectedNode'),

      setZoomLevel: (level) => set({ zoomLevel: level }, false, 'setZoomLevel'),

      toggleStoryMode: () => set(
        (s) => ({ storyModeActive: !s.storyModeActive }),
        false,
        'toggleStoryMode'
      ),

      setPhysicsSettled: (settled) => set({ isPhysicsSettled: settled }, false, 'setPhysicsSettled'),

      reset: () => set(initialState, false, 'reset'),
    }),
    { name: 'ConstellationStore' }
  )
);
