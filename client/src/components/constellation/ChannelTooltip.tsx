/**
 * ChannelTooltip - Hover tooltip for channel planets in L1 view
 *
 * Phase 11: Shows channel metrics on hover - reach, engagement, health status.
 */

import { useMemo } from 'react';
import {
  Mail,
  Users,
  Building2,
  Video,
  Megaphone,
  Globe,
} from 'lucide-react';
import { getChannelConfig, getEngagementHealth } from '@/lib/constellation/channelColors';

const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Mail,
  Users,
  Building2,
  Video,
  Megaphone,
  Globe,
};

interface ChannelTooltipProps {
  channelId: string;
  label: string;
  hcpReach: number;
  avgEngagement: number;
  campaignCount: number;
  position: { x: number; y: number };
}

export function ChannelTooltip({
  channelId,
  label,
  hcpReach,
  avgEngagement,
  campaignCount,
  position,
}: ChannelTooltipProps) {
  const config = getChannelConfig(channelId);
  const health = getEngagementHealth(avgEngagement);

  const IconComponent = CHANNEL_ICONS[config.iconName] || Globe;

  const healthBadge = useMemo(() => {
    switch (health) {
      case 'healthy':
        return {
          label: 'Healthy',
          color: '#22c55e',
          bg: '#22c55e20',
        };
      case 'warning':
        return {
          label: 'Warning',
          color: '#f59e0b',
          bg: '#f59e0b20',
        };
      case 'critical':
        return {
          label: 'Critical',
          color: '#ef4444',
          bg: '#ef444420',
        };
    }
  }, [health]);

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: position.x + 15,
        top: position.y - 10,
        transform: 'translateY(-50%)',
      }}
    >
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-4 min-w-[220px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${config.primary}20` }}
          >
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-slate-900">{label}</div>
            <div
              className="text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1"
              style={{ backgroundColor: healthBadge.bg, color: healthBadge.color }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: healthBadge.color }}
              />
              {healthBadge.label}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">HCP Reach</span>
            <span className="font-medium text-slate-900">
              {hcpReach.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Avg Engagement</span>
            <span
              className="font-medium"
              style={{ color: healthBadge.color }}
            >
              {avgEngagement}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Active Campaigns</span>
            <span className="font-medium text-slate-900">{campaignCount}</span>
          </div>
        </div>

        {/* CTA hint */}
        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-1">
          <span>Click to explore campaigns</span>
          <span>→</span>
        </div>
      </div>
    </div>
  );
}
