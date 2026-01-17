/**
 * Ecosystem Explorer - Constellation Visualization
 *
 * Phase 10: WebGL-powered 3D constellation showing HCP engagement networks
 * with semantic zoom, diagnostic overlays, and scroll-linked storytelling.
 */

import { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { Compass, Play, Maximize2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useConstellationStore } from '@/stores/constellationStore';

// Lazy load heavy 3D components to avoid blocking initial bundle
const ConstellationCanvas = lazy(() =>
  import('@/components/constellation/ConstellationCanvas')
    .then(m => ({ default: m.ConstellationCanvas }))
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

export default function EcosystemExplorerPage() {
  const { storyModeActive, toggleStoryMode } = useConstellationStore();

  return (
    <div className="h-full w-full bg-slate-950 relative overflow-hidden">
      {/* Header Bar */}
      <header className="absolute top-0 left-0 right-0 z-20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
              <Compass className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Ecosystem Explorer</h1>
              <p className="text-xs text-slate-400">
                {storyModeActive ? 'Story Mode' : 'Free Exploration'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Story Mode Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={storyModeActive ? "default" : "outline"}
                  size="sm"
                  onClick={toggleStoryMode}
                  className={storyModeActive
                    ? "bg-purple-600 hover:bg-purple-700"
                    : "border-slate-700 text-slate-300 hover:bg-slate-800"
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
                  : 'Start guided narrative tour'
                }
              </TooltipContent>
            </Tooltip>

            {/* Info Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <Info className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  <strong>Controls:</strong><br />
                  • Scroll to zoom<br />
                  • Click + drag to rotate<br />
                  • Right-click + drag to pan<br />
                  • Hover nodes for details
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* 3D Canvas (Full Screen) */}
      <Suspense fallback={<ConstellationLoadingState />}>
        <ConstellationCanvas />
      </Suspense>

      {/* Overlays */}
      <Suspense fallback={null}>
        <HCPDetailPanel />
        <ZoomIndicator />
        {storyModeActive && <StoryNarrationHUD />}
      </Suspense>
    </div>
  );
}

function ConstellationLoadingState() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-slate-950">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
        <p className="text-slate-400">Initializing constellation...</p>
        <p className="text-xs text-slate-500 mt-1">Loading 2,500 HCP nodes</p>
      </motion.div>
    </div>
  );
}
