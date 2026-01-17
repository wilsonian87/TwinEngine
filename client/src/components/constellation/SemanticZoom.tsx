/**
 * SemanticZoom - Zoom-Level Dependent Visual Adjustments
 *
 * Manages visual density and detail based on camera distance:
 * - Ecosystem (far): Show clusters, hide individual labels
 * - Campaign (mid): Show channel labels, group indicators
 * - HCP (close): Show individual node details, names
 */

import { useEffect } from 'react';
import { useConstellationStore, ZoomLevel } from '@/stores/constellationStore';

// Configuration for each zoom level
export const ZOOM_CONFIG: Record<ZoomLevel, {
  nodeScale: number;        // Base scale multiplier for nodes
  edgeOpacity: number;      // Edge visibility
  showChannelLabels: boolean;
  showNodeLabels: boolean;
  particleDensity: number;  // For EdgeFlow
  description: string;
}> = {
  ecosystem: {
    nodeScale: 1.0,
    edgeOpacity: 0.15,
    showChannelLabels: true,
    showNodeLabels: false,
    particleDensity: 0.1,
    description: 'Ecosystem View',
  },
  campaign: {
    nodeScale: 1.2,
    edgeOpacity: 0.25,
    showChannelLabels: true,
    showNodeLabels: false,
    particleDensity: 0.3,
    description: 'Campaign View',
  },
  hcp: {
    nodeScale: 1.5,
    edgeOpacity: 0.4,
    showChannelLabels: true,
    showNodeLabels: true,
    particleDensity: 0.5,
    description: 'HCP Detail View',
  },
};

/**
 * Hook to get current zoom configuration
 */
export function useZoomConfig() {
  const zoomLevel = useConstellationStore((s) => s.zoomLevel);
  return ZOOM_CONFIG[zoomLevel];
}

/**
 * Hook to get zoom level description
 */
export function useZoomDescription() {
  const zoomLevel = useConstellationStore((s) => s.zoomLevel);
  return ZOOM_CONFIG[zoomLevel].description;
}

/**
 * Component that provides zoom-level context to children
 * Can be used to conditionally render elements
 */
interface SemanticZoomProps {
  children: React.ReactNode;
}

export function SemanticZoomProvider({ children }: SemanticZoomProps) {
  const zoomLevel = useConstellationStore((s) => s.zoomLevel);

  // Log zoom changes for debugging
  useEffect(() => {
    console.log(`[SemanticZoom] Level changed to: ${zoomLevel}`);
  }, [zoomLevel]);

  return <>{children}</>;
}

/**
 * Conditional render based on zoom level
 */
interface ZoomVisibleProps {
  at: ZoomLevel | ZoomLevel[];
  children: React.ReactNode;
}

export function ZoomVisible({ at, children }: ZoomVisibleProps) {
  const zoomLevel = useConstellationStore((s) => s.zoomLevel);
  const levels = Array.isArray(at) ? at : [at];

  if (!levels.includes(zoomLevel)) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Calculate distance thresholds for zoom transitions
 */
export const ZOOM_THRESHOLDS = {
  ecosystemToCampaign: 250, // Camera distance to transition
  campaignToHcp: 100,
};

/**
 * Determine zoom level from camera distance
 */
export function getZoomLevelFromDistance(distance: number): ZoomLevel {
  if (distance > ZOOM_THRESHOLDS.ecosystemToCampaign) {
    return 'ecosystem';
  } else if (distance > ZOOM_THRESHOLDS.campaignToHcp) {
    return 'campaign';
  } else {
    return 'hcp';
  }
}
