/**
 * HCPProfileDrawer Component
 *
 * Phase 13.1: Slide-in drawer that shows HCP profile details
 * when clicking on an HCP name anywhere in the platform.
 *
 * Features:
 * - Quick stats (engagement, Rx trend, last touch)
 * - Channel health mini-radial
 * - Recent touches timeline
 * - Navigation CTAs
 *
 * @example
 * <HCPProfileDrawer
 *   hcpId={selectedHcpId}
 *   isOpen={!!selectedHcpId}
 *   onClose={() => setSelectedHcpId(null)}
 *   onAction={(action) => handleAction(action)}
 * />
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  User,
  MapPin,
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Mail,
  Phone,
  Video,
  Users,
  Calendar,
  Globe,
  ExternalLink,
  UserPlus,
  Network,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HCPProfile, Channel } from '@shared/schema';

// ============================================================================
// TYPES
// ============================================================================

export type HCPDrawerAction = 'view' | 'ecosystem' | 'audience';

export interface HCPProfileDrawerProps {
  /** HCP ID to display */
  hcpId: string | null;
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback when drawer closes */
  onClose: () => void;
  /** Callback when action button is clicked */
  onAction?: (action: HCPDrawerAction, hcpId: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const channelIcons: Record<Channel, typeof Mail> = {
  email: Mail,
  rep_visit: Users,
  webinar: Video,
  conference: Calendar,
  digital_ad: Globe,
  phone: Phone,
};

const channelLabels: Record<Channel, string> = {
  email: 'Email',
  rep_visit: 'Rep Visit',
  webinar: 'Webinar',
  conference: 'Conference',
  digital_ad: 'Digital',
  phone: 'Phone',
};

const tierStyles: Record<string, { bg: string; text: string; border: string }> = {
  'Tier 1': {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-700',
  },
  'Tier 2': {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-700',
  },
  'Tier 3': {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-600',
  },
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatCard({
  label,
  value,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  icon?: typeof TrendingUp;
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up'
      ? 'text-green-600 dark:text-green-400'
      : trend === 'down'
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-foreground';

  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
        {trend && <TrendIcon className={cn('h-3 w-3', trendColor)} />}
      </div>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <span className="text-lg font-semibold">{value}</span>
      </div>
    </div>
  );
}

function ChannelHealthBar({ channel, score }: { channel: Channel; score: number }) {
  const Icon = channelIcons[channel];
  const label = channelLabels[channel];

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-20">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex-1">
        <Progress value={score} className="h-2" />
      </div>
      <span className="text-xs font-medium w-8 text-right">{score}%</span>
    </div>
  );
}

function TouchTimelineItem({
  channel,
  date,
  description,
}: {
  channel: Channel;
  date: string;
  description?: string;
}) {
  const Icon = channelIcons[channel];
  const label = channelLabels[channel];

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{date}</p>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
    </div>
  );
}

// ============================================================================
// LOADING STATE
// ============================================================================

function DrawerSkeleton() {
  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>

      {/* Channel health */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface HCPActivity {
  id: string;
  timestamp: string;
  channel: Channel;
  actionType: string;
  outcome: string;
  metadata: { subject?: string; callToAction?: string; predictedImpact?: string };
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function HCPProfileDrawer({ hcpId, isOpen, onClose, onAction }: HCPProfileDrawerProps) {
  // Fetch HCP data when drawer opens
  const {
    data: hcp,
    isLoading,
    error,
  } = useQuery<HCPProfile>({
    queryKey: ['hcp', hcpId],
    queryFn: async () => {
      const res = await fetch(`/api/hcps/${hcpId}`);
      if (!res.ok) throw new Error('Failed to fetch HCP');
      return res.json();
    },
    enabled: !!hcpId && isOpen,
  });

  // Fetch recent touches from real stimuli data
  const { data: activitiesData } = useQuery<{ activities: HCPActivity[]; total: number }>({
    queryKey: ['hcp-activities', hcpId],
    queryFn: async () => {
      const res = await fetch(`/api/hcps/${hcpId}/activities?limit=5`);
      if (!res.ok) throw new Error('Failed to fetch activities');
      return res.json();
    },
    enabled: !!hcpId && isOpen,
  });

  const handleAction = (action: HCPDrawerAction) => {
    if (hcpId && onAction) {
      onAction(action, hcpId);
    }
  };

  const tierStyle = hcp?.tier ? tierStyles[hcp.tier] || tierStyles['Tier 3'] : tierStyles['Tier 3'];

  // Calculate engagement trend based on score
  const engagementTrend: 'up' | 'down' | 'stable' =
    hcp?.overallEngagementScore && hcp.overallEngagementScore >= 70
      ? 'up'
      : hcp?.overallEngagementScore && hcp.overallEngagementScore < 40
        ? 'down'
        : 'stable';

  // Calculate Rx trend based on churnRisk
  const rxTrendValue = hcp?.churnRisk ? (100 - hcp.churnRisk > 60 ? '+12%' : hcp.churnRisk > 60 ? '-5%' : '+2%') : '+2%';
  const rxTrend: 'up' | 'down' | 'stable' = hcp?.churnRisk ? (hcp.churnRisk < 40 ? 'up' : hcp.churnRisk > 60 ? 'down' : 'stable') : 'stable';

  // Build channel affinities from channelEngagements
  const channelAffinities: Partial<Record<Channel, number>> = hcp?.channelEngagements
    ? hcp.channelEngagements.reduce((acc, ce) => {
        acc[ce.channel] = ce.score;
        return acc;
      }, {} as Partial<Record<Channel, number>>)
    : {};

  // Recent touches from real stimuli data
  const recentTouches = (activitiesData?.activities || []).map((a) => ({
    channel: a.channel,
    date: formatRelativeDate(a.timestamp),
    description: a.metadata?.subject || a.actionType.replace(/_/g, ' '),
  }));

  // Last touch relative date for stat card
  const lastTouchLabel = recentTouches.length > 0 ? recentTouches[0].date : 'None';

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {isLoading ? (
          <DrawerSkeleton />
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Failed to load HCP profile</p>
            <Button variant="outline" className="mt-4" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : hcp ? (
          <>
            <SheetHeader className="pb-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-lg">
                    Dr. {hcp.firstName} {hcp.lastName}
                  </SheetTitle>
                  <SheetDescription className="flex items-center gap-2 mt-1">
                    <span>{hcp.specialty}</span>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', tierStyle.bg, tierStyle.text, tierStyle.border)}
                    >
                      {hcp.tier}
                    </Badge>
                  </SheetDescription>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                <MapPin className="h-4 w-4" />
                <span>
                  {hcp.city}, {hcp.state}
                </span>
              </div>

              {/* Organization */}
              {hcp.organization && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{hcp.organization}</span>
                </div>
              )}
            </SheetHeader>

            <Separator className="my-4" />

            {/* Quick Stats */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Quick Stats
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  label="Engagement"
                  value={`${hcp.overallEngagementScore}%`}
                  trend={engagementTrend}
                />
                <StatCard
                  label="Rx Trend"
                  value={rxTrendValue}
                  trend={rxTrend}
                />
                <StatCard label="Last Touch" value={lastTouchLabel} icon={Clock} />
              </div>
            </div>

            <Separator className="my-4" />

            {/* Channel Health */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Channel Health
              </h4>
              <div className="space-y-2">
                {Object.keys(channelAffinities).length > 0
                  ? Object.entries(channelAffinities).map(([channel, score]) => (
                      <ChannelHealthBar key={channel} channel={channel as Channel} score={score} />
                    ))
                  : <p className="text-sm text-muted-foreground">No channel data available</p>
                }
              </div>
            </div>

            <Separator className="my-4" />

            {/* Recent Touches */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Recent Touches
              </h4>
              <div className="space-y-4">
                {recentTouches.length > 0 ? (
                  recentTouches.map((touch, i) => (
                    <TouchTimelineItem key={i} {...touch} />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activity recorded</p>
                )}
              </div>
            </div>

            <Separator className="my-4" />

            {/* Action CTAs */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleAction('view')}
              >
                <ExternalLink className="h-4 w-4" />
                View Full Profile
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleAction('ecosystem')}
              >
                <Network className="h-4 w-4" />
                View in Ecosystem
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleAction('audience')}
              >
                <UserPlus className="h-4 w-4" />
                Add to Audience
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default HCPProfileDrawer;
