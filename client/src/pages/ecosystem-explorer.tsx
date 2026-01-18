/**
 * Ecosystem Explorer - Constellation Visualization
 *
 * Phase 10: WebGL-powered 3D constellation showing HCP engagement networks
 * with semantic zoom, diagnostic overlays, and scroll-linked storytelling.
 *
 * Phase 11: HCP-centric Solar System model with L1/L2/L3 hierarchy.
 *
 * Light analytics theme inspired by GA4/Tableau for professional readability.
 */

import { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { Compass, Play, Maximize2, Info, LayoutGrid, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useConstellationStore } from '@/stores/constellationStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePhase11Keyboard } from '@/hooks/usePhase11Keyboard';
import { usePhase11Story } from '@/hooks/usePhase11Story';

// Lazy load heavy 3D components to avoid blocking initial bundle
const ConstellationCanvas = lazy(() =>
  import('@/components/constellation/ConstellationCanvas')
    .then(m => ({ default: m.ConstellationCanvas }))
);
const Phase11Canvas = lazy(() =>
  import('@/components/constellation/Phase11Canvas')
    .then(m => ({ default: m.Phase11Canvas }))
);
const StoryNarrationHUD = lazy(() =>
  import('@/components/constellation/StoryNarrationHUD')
    .then(m => ({ default: m.StoryNarrationHUD }))
);
const HCPDetailPanel = lazy(() =>
  import('@/components/constellation/HCPDetailPanel')
    .then(m => ({ default: m.HCPDetailPanel }))
);
const ZoomIndicator = lazy(() =>
  import('@/components/constellation/ZoomIndicator')
    .then(m => ({ default: m.ZoomIndicator }))
);
const ZoomControlsOverlay = lazy(() =>
  import('@/components/constellation/ZoomControlsOverlay')
    .then(m => ({ default: m.ZoomControlsOverlay }))
);
const NorthStarButton = lazy(() =>
  import('@/components/constellation/NorthStarButton')
    .then(m => ({ default: m.NorthStarButton }))
);
const NavigationBreadcrumb = lazy(() =>
  import('@/components/constellation/NavigationBreadcrumb')
    .then(m => ({ default: m.NavigationBreadcrumb }))
);
const LevelIndicator = lazy(() =>
  import('@/components/constellation/LevelIndicator')
    .then(m => ({ default: m.LevelIndicator }))
);

export default function EcosystemExplorerPage() {
  const { storyModeActive, toggleStoryMode, viewMode, setViewMode, navigationContext } = useConstellationStore();

  // Enable keyboard shortcuts for zoom and navigation
  useKeyboardShortcuts();

  // Enable Phase 11 keyboard navigation (Esc/Backspace to go back)
  usePhase11Keyboard();

  // Phase 11 Story Mode integration (syncs story beats with level navigation)
  usePhase11Story();

  const isPhase11 = viewMode === 'phase11';

  return (
    <div className="h-full w-full bg-slate-100 relative overflow-hidden">
      {/* Header Bar - Light theme */}
      <header className="absolute top-0 left-0 right-0 z-20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
              <Compass className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Ecosystem Explorer</h1>
              <p className="text-xs text-slate-500">
                {storyModeActive ? 'Story Mode' : isPhase11 ? 'HCP-Centric View' : 'Network View'}
              </p>
            </div>

            {/* Phase 11 Navigation Breadcrumb */}
            {isPhase11 && navigationContext.level !== 'L1' && (
              <Suspense fallback={null}>
                <NavigationBreadcrumb />
              </Suspense>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(isPhase11 ? 'legacy' : 'phase11')}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 bg-white"
                >
                  {isPhase11 ? (
                    <>
                      <Network className="w-4 h-4 mr-2" />
                      Network
                    </>
                  ) : (
                    <>
                      <LayoutGrid className="w-4 h-4 mr-2" />
                      Solar
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isPhase11
                  ? 'Switch to network visualization'
                  : 'Switch to HCP-centric Solar System'
                }
              </TooltipContent>
            </Tooltip>

            {/* Story Mode Toggle - Available in both views */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={storyModeActive ? "default" : "outline"}
                  size="sm"
                  onClick={toggleStoryMode}
                  className={storyModeActive
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50 bg-white"
                  }
                >
                  {storyModeActive ? (
                    <>
                      <Maximize2 className="w-4 h-4 mr-2" />
                      Exit Story
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Story Mode
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {storyModeActive
                  ? 'Return to free exploration'
                  : isPhase11
                    ? 'Start HCP-centric narrative tour'
                    : 'Start guided narrative tour'
                }
              </TooltipContent>
            </Tooltip>

            {/* Info Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900 hover:bg-slate-200">
                  <Info className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-left">
                <p className="text-sm mb-2">
                  <strong>Mouse:</strong><br />
                  • Scroll to zoom<br />
                  • Click + drag to rotate<br />
                  • Right-click + drag to pan<br />
                  • {isPhase11 ? 'Click channels to drill down' : 'Hover nodes for details'}
                </p>
                <p className="text-sm">
                  <strong>Keyboard:</strong><br />
                  • <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">⌘+</kbd> / <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">⌘-</kbd> Zoom in/out<br />
                  • <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">⌘0</kbd> Reset view<br />
                  • <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">Esc</kbd> {isPhase11 ? 'Go back' : 'Clear selection'}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* 3D Canvas (Full Screen) - Toggle between Phase 10 and Phase 11 */}
      <Suspense fallback={<ConstellationLoadingState />}>
        {isPhase11 ? <Phase11Canvas /> : <ConstellationCanvas />}
      </Suspense>

      {/* Overlays - Only show for legacy view */}
      {!isPhase11 && (
        <Suspense fallback={null}>
          <HCPDetailPanel />
          <ZoomIndicator />
          <NorthStarButton className="absolute bottom-44 right-4 z-10" />
          <ZoomControlsOverlay />
          {storyModeActive && <StoryNarrationHUD />}
        </Suspense>
      )}

      {/* Phase 11 Overlays */}
      {isPhase11 && (
        <Suspense fallback={null}>
          {/* Level Indicator - Bottom left (hidden in story mode) */}
          {!storyModeActive && (
            <div className="absolute bottom-4 left-4 z-10">
              <LevelIndicator />
            </div>
          )}
          {/* Story Narration HUD */}
          {storyModeActive && <StoryNarrationHUD />}
        </Suspense>
      )}
    </div>
  );
}

function ConstellationLoadingState() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-slate-100">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
        <p className="text-slate-600">Initializing constellation...</p>
        <p className="text-xs text-slate-400 mt-1">Loading 2,500 HCP nodes</p>
      </motion.div>
    </div>
  );
}
