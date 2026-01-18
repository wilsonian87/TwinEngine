/**
 * ZoomControlsOverlay - Floating +/- buttons for discrete zoom level navigation
 *
 * Phase 10H.1: Provides non-mouse zoom controls for accessibility
 *
 * Zoom Levels:
 * - ecosystem (L1): z ≈ 200, broadest view
 * - campaign (L2): z ≈ 80, cluster view
 * - hcp (L3): z ≈ 30, individual detail
 */

import { Plus, Minus } from 'lucide-react';
import { useConstellationStore, type ZoomLevel } from '@/stores/constellationStore';
import { cn } from '@/lib/utils';

interface ZoomControlsOverlayProps {
  className?: string;
}

// Zoom level order for navigation
const ZOOM_ORDER: ZoomLevel[] = ['ecosystem', 'campaign', 'hcp'];

export function ZoomControlsOverlay({ className }: ZoomControlsOverlayProps) {
  const zoomLevel = useConstellationStore((s) => s.zoomLevel);
  const setZoomLevel = useConstellationStore((s) => s.setZoomLevel);
  const requestCameraAnimation = useConstellationStore((s) => s.requestCameraAnimation);

  const currentIndex = ZOOM_ORDER.indexOf(zoomLevel);
  const canZoomIn = currentIndex < ZOOM_ORDER.length - 1;
  const canZoomOut = currentIndex > 0;

  const handleZoomIn = () => {
    if (canZoomIn) {
      const nextLevel = ZOOM_ORDER[currentIndex + 1];
      setZoomLevel(nextLevel);
      // Request camera animation to appropriate distance
      requestCameraAnimation?.(nextLevel);
    }
  };

  const handleZoomOut = () => {
    if (canZoomOut) {
      const nextLevel = ZOOM_ORDER[currentIndex - 1];
      setZoomLevel(nextLevel);
      requestCameraAnimation?.(nextLevel);
    }
  };

  return (
    <div
      className={cn(
        "absolute bottom-24 right-4 flex flex-col gap-1",
        "bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200",
        "p-1",
        className
      )}
    >
      <button
        onClick={handleZoomIn}
        disabled={!canZoomIn}
        className={cn(
          "w-9 h-9 flex items-center justify-center rounded-md transition-colors",
          "hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed",
          "text-slate-600 hover:text-slate-900"
        )}
        title="Zoom In (⌘+)"
        aria-label="Zoom in to next detail level"
      >
        <Plus className="w-5 h-5" />
      </button>

      <div className="h-px bg-slate-200" />

      <button
        onClick={handleZoomOut}
        disabled={!canZoomOut}
        className={cn(
          "w-9 h-9 flex items-center justify-center rounded-md transition-colors",
          "hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed",
          "text-slate-600 hover:text-slate-900"
        )}
        title="Zoom Out (⌘-)"
        aria-label="Zoom out to broader view"
      >
        <Minus className="w-5 h-5" />
      </button>
    </div>
  );
}
