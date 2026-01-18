/**
 * NavigationBreadcrumb - Level navigation for Phase 11 hierarchy
 *
 * Shows current position in L1 > L2 > L3 hierarchy with back navigation.
 */

import { ChevronRight, Home, Layers, Users } from 'lucide-react';
import { useConstellationStore } from '@/stores/constellationStore';
import { getChannelConfig } from '@/lib/constellation/channelColors';
import { cn } from '@/lib/utils';

export function NavigationBreadcrumb() {
  const {
    navigationContext,
    navigateToL1,
    navigateToL2,
  } = useConstellationStore();

  const renderBreadcrumbItems = () => {
    const items: React.ReactNode[] = [];

    // L1 - Always shown
    items.push(
      <BreadcrumbItem
        key="l1"
        label="Ecosystem"
        icon={<Home className="w-3.5 h-3.5" />}
        onClick={navigateToL1}
        isActive={navigationContext.level === 'L1'}
        isClickable={navigationContext.level !== 'L1'}
      />
    );

    // L2 - Show if at L2 or L3
    if (navigationContext.level === 'L2' || navigationContext.level === 'L3') {
      const channelConfig = getChannelConfig(navigationContext.channelId);

      items.push(
        <ChevronRight key="sep1" className="w-4 h-4 text-slate-400 mx-1" />
      );

      items.push(
        <BreadcrumbItem
          key="l2"
          label={navigationContext.channelLabel}
          icon={<Layers className="w-3.5 h-3.5" />}
          onClick={() => navigateToL2(navigationContext.channelId, navigationContext.channelLabel)}
          isActive={navigationContext.level === 'L2'}
          isClickable={navigationContext.level === 'L3'}
          color={channelConfig.primary}
        />
      );
    }

    // L3 - Show if at L3
    if (navigationContext.level === 'L3') {
      items.push(
        <ChevronRight key="sep2" className="w-4 h-4 text-slate-400 mx-1" />
      );

      items.push(
        <BreadcrumbItem
          key="l3"
          label={navigationContext.campaignName}
          icon={<Users className="w-3.5 h-3.5" />}
          onClick={() => {}}
          isActive={true}
          isClickable={false}
        />
      );
    }

    return items;
  };

  return (
    <nav className="flex items-center bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-slate-200">
      {renderBreadcrumbItems()}
    </nav>
  );
}

interface BreadcrumbItemProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  isActive: boolean;
  isClickable: boolean;
  color?: string;
}

function BreadcrumbItem({
  label,
  icon,
  onClick,
  isActive,
  isClickable,
  color,
}: BreadcrumbItemProps) {
  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium transition-all',
        isActive
          ? 'bg-slate-100 text-slate-900'
          : isClickable
          ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer'
          : 'text-slate-400 cursor-default'
      )}
      style={color && isActive ? { color } : undefined}
    >
      {icon}
      <span className="max-w-[150px] truncate">{label}</span>
    </button>
  );
}
