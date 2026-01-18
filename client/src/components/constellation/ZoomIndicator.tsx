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

// Light theme zoom colors
const ZOOM_COLORS = {
  ecosystem: 'text-blue-700 bg-blue-50 border-blue-200',
  campaign: 'text-purple-700 bg-purple-50 border-purple-200',
  hcp: 'text-green-700 bg-green-50 border-green-200',
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
            "bg-white/90 backdrop-blur-xl border shadow-sm",
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
                ? "w-6 bg-slate-700"
                : "w-1.5 bg-slate-300"
            )}
          />
        ))}
      </div>
    </div>
  );
}
