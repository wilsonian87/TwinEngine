/**
 * NorthStarButton - Context-Aware Reorientation Control
 *
 * Phase 10H.2: "Return home" button that respects current exploration context.
 *
 * Behavior:
 * - Global/Free exploration at L1 → Return to origin [0, 0, 0]
 * - Viewing a specific channel cluster → Return to that cluster's centroid
 * - Story mode active → Return to current beat's camera target
 * - Selected HCP at L3 → Return to parent cluster center
 */

import { useMemo } from 'react';
import { Compass, RotateCcw } from 'lucide-react';
import { useConstellationStore, ZOOM_DISTANCES } from '@/stores/constellationStore';
import { useStoryStore } from '@/stores/storyStore';
import { computeCentroid, getNodesByChannel } from '@/lib/constellation/utils';
import { cn } from '@/lib/utils';

interface NorthStarButtonProps {
  className?: string;
}

export function NorthStarButton({ className }: NorthStarButtonProps) {
  const nodes = useConstellationStore((s) => s.nodes);
  const zoomLevel = useConstellationStore((s) => s.zoomLevel);
  const focusContext = useConstellationStore((s) => s.focusContext);
  const storyModeActive = useConstellationStore((s) => s.storyModeActive);
  const requestCameraAnimation = useConstellationStore((s) => s.requestCameraAnimation);
  const clearFocusContext = useConstellationStore((s) => s.clearFocusContext);

  const beats = useStoryStore((s) => s.beats);
  const currentBeatIndex = useStoryStore((s) => s.currentBeatIndex);

  // Compute label and target based on current context
  const { label, icon: Icon, targetPosition, targetLookAt } = useMemo(() => {
    // Story mode: return to current beat's position
    if (storyModeActive) {
      const beat = beats[currentBeatIndex];
      return {
        label: 'Return to Story Beat',
        icon: RotateCcw,
        targetPosition: beat?.cameraTarget || [0, 50, 200],
        targetLookAt: beat?.cameraLookAt || [0, 0, 0],
      };
    }

    // Channel focus: return to channel centroid
    if (focusContext.type === 'channel' && focusContext.targetId) {
      const channelNodes = getNodesByChannel(nodes, focusContext.targetId);
      const centroid = channelNodes.length > 0
        ? computeCentroid(channelNodes)
        : focusContext.centroid;
      const distance = ZOOM_DISTANCES[zoomLevel];

      return {
        label: `Center on ${focusContext.targetId}`,
        icon: Compass,
        targetPosition: [centroid[0], centroid[1] + 30, centroid[2] + distance] as [number, number, number],
        targetLookAt: centroid,
      };
    }

    // HCP focus: return to parent cluster
    if (focusContext.type === 'hcp' && focusContext.targetId) {
      const centroid = focusContext.centroid;
      const distance = ZOOM_DISTANCES[zoomLevel];

      return {
        label: 'Return to Cluster',
        icon: Compass,
        targetPosition: [centroid[0], centroid[1] + 30, centroid[2] + distance] as [number, number, number],
        targetLookAt: centroid,
      };
    }

    // Default: global reset
    const distance = ZOOM_DISTANCES.ecosystem;
    return {
      label: 'Reset View',
      icon: Compass,
      targetPosition: [0, 30, distance] as [number, number, number],
      targetLookAt: [0, 0, 0] as [number, number, number],
    };
  }, [storyModeActive, beats, currentBeatIndex, focusContext, nodes, zoomLevel]);

  const handleReorient = () => {
    // Request camera animation
    useConstellationStore.getState().cameraAnimationRequest = {
      target: targetPosition as [number, number, number],
      lookAt: targetLookAt as [number, number, number],
      duration: 0.5,
    };
    // Trigger store update
    requestCameraAnimation(zoomLevel, targetLookAt as [number, number, number]);

    // Clear focus context if doing global reset
    if (focusContext.type === 'global') {
      clearFocusContext();
    }
  };

  return (
    <button
      onClick={handleReorient}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        "bg-white/90 backdrop-blur-sm shadow-lg border border-slate-200",
        "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
        "transition-colors",
        className
      )}
      title={`${label} (⌘0)`}
      aria-label={label}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">Reorient</span>
    </button>
  );
}
