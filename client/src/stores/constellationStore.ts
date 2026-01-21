/**
 * Constellation Store - Zustand state management for 3D visualization
 *
 * Manages: nodes, edges, interaction state, zoom levels, story mode
 * Phase 11: Added navigation context for L1/L2/L3 hierarchy
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { NavigationContext, ConstellationLevel } from '@/lib/constellation/types';
import type { CompetitiveOrbitData } from '@shared/schema';

export type NodeStatus = 'healthy' | 'warning' | 'critical';
export type ZoomLevel = 'ecosystem' | 'campaign' | 'hcp';
export type FocusContextType = 'global' | 'channel' | 'cluster' | 'hcp';

// Camera distances for each zoom level
export const ZOOM_DISTANCES: Record<ZoomLevel, number> = {
  ecosystem: 200,
  campaign: 80,
  hcp: 30,
};

export interface FocusContext {
  type: FocusContextType;
  targetId: string | null;
  centroid: [number, number, number];
}

export interface CameraAnimationRequest {
  target: [number, number, number];
  lookAt: [number, number, number];
  duration?: number;
}

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

  // Focus context for North Star reorientation
  focusContext: FocusContext;

  // Camera animation request (consumed by camera controller)
  cameraAnimationRequest: CameraAnimationRequest | null;

  // Story Mode
  storyModeActive: boolean;

  // Phase 11: Navigation context for L1/L2/L3 hierarchy
  navigationContext: NavigationContext;
  viewMode: 'legacy' | 'phase11';  // Toggle between Phase 10 and Phase 11 views

  // Phase 12A: Competitive Orbit state
  competitiveOrbitVisible: boolean;
  selectedCompetitorId: string | null;
  competitiveOrbitData: CompetitiveOrbitData | null;

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

  // Navigation controls (Phase 10H)
  setFocusContext: (context: FocusContext) => void;
  clearFocusContext: () => void;
  requestCameraAnimation: (zoomLevel?: ZoomLevel, target?: [number, number, number]) => void;
  clearCameraAnimationRequest: () => void;
  clearSelection: () => void;

  // Phase 11: Navigation actions
  navigateToL1: () => void;
  navigateToL2: (channelId: string, channelLabel: string) => void;
  navigateToL3: (channelId: string, channelLabel: string, campaignId: string, campaignName: string) => void;
  setViewMode: (mode: 'legacy' | 'phase11') => void;

  // Phase 12A: Competitive Orbit actions
  toggleCompetitiveOrbit: () => void;
  setSelectedCompetitor: (id: string | null) => void;
  setCompetitiveOrbitData: (data: CompetitiveOrbitData | null) => void;
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

const DEFAULT_FOCUS_CONTEXT: FocusContext = {
  type: 'global',
  targetId: null,
  centroid: [0, 0, 0],
};

const DEFAULT_NAVIGATION_CONTEXT: NavigationContext = {
  level: 'L1',
};

const initialState = {
  nodes: [] as ConstellationNode[],
  edges: [] as ConstellationEdge[],
  isPhysicsSettled: false,
  hoveredNodeId: null as string | null,
  selectedNodeId: null as string | null,
  zoomLevel: 'ecosystem' as ZoomLevel,
  focusContext: DEFAULT_FOCUS_CONTEXT,
  cameraAnimationRequest: null as CameraAnimationRequest | null,
  storyModeActive: false,
  // Phase 11
  navigationContext: DEFAULT_NAVIGATION_CONTEXT as NavigationContext,
  viewMode: 'phase11' as 'legacy' | 'phase11',  // Default to Phase 11 view
  // Phase 12A
  competitiveOrbitVisible: false,
  selectedCompetitorId: null as string | null,
  competitiveOrbitData: null as CompetitiveOrbitData | null,
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

      // Phase 10H Navigation Controls
      setFocusContext: (context) => set({ focusContext: context }, false, 'setFocusContext'),

      clearFocusContext: () => set({ focusContext: DEFAULT_FOCUS_CONTEXT }, false, 'clearFocusContext'),

      requestCameraAnimation: (zoomLevel, target) => {
        const { focusContext } = get();
        const level = zoomLevel || get().zoomLevel;
        const distance = ZOOM_DISTANCES[level];
        const centerTarget = target || focusContext.centroid;

        set({
          cameraAnimationRequest: {
            target: [centerTarget[0], centerTarget[1] + 30, centerTarget[2] + distance],
            lookAt: centerTarget,
            duration: 0.5,
          },
        }, false, 'requestCameraAnimation');
      },

      clearCameraAnimationRequest: () => set({ cameraAnimationRequest: null }, false, 'clearCameraAnimationRequest'),

      clearSelection: () => set({
        hoveredNodeId: null,
        selectedNodeId: null,
      }, false, 'clearSelection'),

      // Phase 11: Navigation actions
      navigateToL1: () => set({
        navigationContext: { level: 'L1' },
        zoomLevel: 'ecosystem',
        selectedNodeId: null,
        hoveredNodeId: null,
      }, false, 'navigateToL1'),

      navigateToL2: (channelId: string, channelLabel: string) => set({
        navigationContext: {
          level: 'L2',
          channelId,
          channelLabel,
        },
        zoomLevel: 'campaign',
        selectedNodeId: null,
        hoveredNodeId: null,
      }, false, 'navigateToL2'),

      navigateToL3: (channelId: string, channelLabel: string, campaignId: string, campaignName: string) => set({
        navigationContext: {
          level: 'L3',
          channelId,
          channelLabel,
          campaignId,
          campaignName,
        },
        zoomLevel: 'hcp',
        selectedNodeId: null,
        hoveredNodeId: null,
      }, false, 'navigateToL3'),

      setViewMode: (mode: 'legacy' | 'phase11') => set({
        viewMode: mode,
      }, false, 'setViewMode'),

      // Phase 12A: Competitive Orbit actions
      toggleCompetitiveOrbit: () => set(
        (s) => ({ competitiveOrbitVisible: !s.competitiveOrbitVisible }),
        false,
        'toggleCompetitiveOrbit'
      ),

      setSelectedCompetitor: (id: string | null) => set({
        selectedCompetitorId: id,
      }, false, 'setSelectedCompetitor'),

      setCompetitiveOrbitData: (data: CompetitiveOrbitData | null) => set({
        competitiveOrbitData: data,
      }, false, 'setCompetitiveOrbitData'),
    }),
    { name: 'ConstellationStore' }
  )
);
