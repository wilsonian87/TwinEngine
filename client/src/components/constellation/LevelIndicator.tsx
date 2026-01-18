/**
 * LevelIndicator - Visual indicator of current navigation level
 *
 * Phase 11E: Shows L1/L2/L3 with visual hierarchy and click navigation.
 */

import { useConstellationStore } from '@/stores/constellationStore';
import { getChannelConfig } from '@/lib/constellation/channelColors';
import { cn } from '@/lib/utils';
import { Home, Layers, Users } from 'lucide-react';

export function LevelIndicator() {
  const {
    navigationContext,
    navigateToL1,
    navigateToL2,
  } = useConstellationStore();

  const levels = [
    {
      level: 'L1' as const,
      label: 'Ecosystem',
      icon: Home,
      isActive: navigationContext.level === 'L1',
      isClickable: navigationContext.level !== 'L1',
      onClick: navigateToL1,
    },
    {
      level: 'L2' as const,
      label: navigationContext.level !== 'L1' ? navigationContext.channelLabel : 'Channel',
      icon: Layers,
      isActive: navigationContext.level === 'L2',
      isClickable: navigationContext.level === 'L3',
      onClick: () => {
        if (navigationContext.level === 'L3') {
          navigateToL2(navigationContext.channelId, navigationContext.channelLabel);
        }
      },
      color: navigationContext.level !== 'L1'
        ? getChannelConfig(navigationContext.channelId).primary
        : undefined,
    },
    {
      level: 'L3' as const,
      label: navigationContext.level === 'L3' ? navigationContext.campaignName : 'Campaign',
      icon: Users,
      isActive: navigationContext.level === 'L3',
      isClickable: false,
      onClick: () => {},
    },
  ];

  return (
    <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1.5 shadow-sm border border-slate-200">
      {levels.map((item, index) => {
        const Icon = item.icon;
        const isVisible = index === 0 ||
          (index === 1 && navigationContext.level !== 'L1') ||
          (index === 2 && navigationContext.level === 'L3');

        if (!isVisible) return null;

        return (
          <div key={item.level} className="flex items-center">
            {index > 0 && isVisible && (
              <span className="mx-1 text-slate-300">/</span>
            )}
            <button
              onClick={item.isClickable ? item.onClick : undefined}
              disabled={!item.isClickable}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all',
                item.isActive
                  ? 'bg-slate-100 text-slate-900'
                  : item.isClickable
                  ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 cursor-pointer'
                  : 'text-slate-400 cursor-default'
              )}
              style={item.color && item.isActive ? { color: item.color } : undefined}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="max-w-[100px] truncate">{item.label}</span>
            </button>
          </div>
        );
      })}

      {/* Level badge */}
      <div className="ml-2 pl-2 border-l border-slate-200">
        <span className="text-[10px] font-bold text-slate-400">
          {navigationContext.level}
        </span>
      </div>
    </div>
  );
}
