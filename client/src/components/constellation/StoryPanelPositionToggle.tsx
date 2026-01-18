/**
 * StoryPanelPositionToggle - Dock Position Controls
 *
 * Phase 10H.4: Toggle between bottom, top, or right sidebar positions.
 */

import { PanelBottom, PanelTop, PanelRight } from 'lucide-react';
import { useStoryStore, type PanelPosition } from '@/stores/storyStore';
import { cn } from '@/lib/utils';

const POSITIONS: {
  value: PanelPosition;
  icon: React.ElementType;
  label: string;
}[] = [
  { value: 'top', icon: PanelTop, label: 'Dock Top' },
  { value: 'bottom', icon: PanelBottom, label: 'Dock Bottom' },
  { value: 'right', icon: PanelRight, label: 'Dock Right' },
];

interface StoryPanelPositionToggleProps {
  className?: string;
}

export function StoryPanelPositionToggle({ className }: StoryPanelPositionToggleProps) {
  const panelPosition = useStoryStore((s) => s.panelPosition);
  const setPanelPosition = useStoryStore((s) => s.setPanelPosition);

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5",
        className
      )}
    >
      {POSITIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setPanelPosition(value)}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            panelPosition === value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-400 hover:text-slate-600"
          )}
          title={label}
          aria-label={label}
          aria-pressed={panelPosition === value}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}
