/**
 * ZoomIndicator - Visual Zoom Level Display
 *
 * Shows the current semantic zoom level with smooth transitions
 * and visual feedback for zoom state.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Target, User } from 'lucide-react';
import { useConstellationStore, ZoomLevel } from '@/stores/constellationStore';
import { ZOOM_CONFIG } from './SemanticZoom';
import { cn } from '@/lib/utils';

const ZOOM_ICONS = {
  ecosystem: Layers,
  campaign: Target,
  hcp: User,
};

const ZOOM_COLORS = {
  ecosystem: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  campaign: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
  hcp: 'text-green-400 bg-green-500/20 border-green-500/30',
};

export function ZoomIndicator() {
  const zoomLevel = useConstellationStore((s) => s.zoomLevel);
  const config = ZOOM_CONFIG[zoomLevel];
  const Icon = ZOOM_ICONS[zoomLevel];

  return (
    <div className="absolute bottom-4 left-4 z-20">
      <AnimatePresence mode="wait">
        <motion.div
          key={zoomLevel}
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg",
            "bg-slate-900/80 backdrop-blur-xl border",
            ZOOM_COLORS[zoomLevel]
          )}
        >
          <Icon className="w-4 h-4" />
          <span className="text-sm font-medium">{config.description}</span>
        </motion.div>
      </AnimatePresence>

      {/* Zoom level dots */}
      <div className="flex items-center gap-1.5 mt-2 px-1">
        {(['ecosystem', 'campaign', 'hcp'] as ZoomLevel[]).map((level) => (
          <div
            key={level}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              level === zoomLevel
                ? "w-6 bg-white"
                : "w-1.5 bg-white/30"
            )}
          />
        ))}
      </div>
    </div>
  );
}
