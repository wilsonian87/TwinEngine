/**
 * Nerve Center (Dashboard) Page
 *
 * Mission control for OmniVor - personalized welcome,
 * animated metrics, pattern highlights, and quick actions.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md Phase 9E
 */

import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { RefreshCw, Download, Calendar, Users, Activity, FlaskConical, Target, Zap, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MetricCardSkeleton, ChartSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  WelcomeMessage,
  MetricCard,
  MetricsGrid,
  PatternHighlights,
  QuickActions,
  type PatternHighlight,
} from '@/components/dashboard';
import { DashboardMetricsDisplay } from '@/components/dashboard-metrics';
import type { DashboardMetrics } from '@shared/schema';

// ============================================================================
// MOCK DATA
// ============================================================================

// Mock patterns for demo (in production, fetch from API)
const mockPatterns: PatternHighlight[] = [
  {
    id: '1',
    title: 'Engagement spike in Cardiology segment',
    description: 'Email response rates increased 23% among cardiologists in the Northeast region over the past week.',
    severity: 'opportunity',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    relatedHcpCount: 142,
    category: 'engagement',
    modulePath: '/audience-builder',
  },
  {
    id: '2',
    title: 'Rep visit effectiveness declining',
    description: 'In-person visits showing 15% lower conversion compared to digital channels for Tier 2 HCPs.',
    severity: 'warning',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    relatedHcpCount: 89,
    category: 'channel',
    modulePath: '/feature-store',
  },
  {
    id: '3',
    title: 'New high-value audience identified',
    description: 'ML model identified 67 HCPs with high propensity scores who haven\'t been engaged recently.',
    severity: 'insight',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    relatedHcpCount: 67,
    category: 'audience',
    modulePath: '/audience-builder',
  },
  {
    id: '4',
    title: 'Conference attendee follow-up window',
    description: 'Optimal 48-hour follow-up window closing for 234 HCPs who attended the Virtual Summit.',
    severity: 'opportunity',
    timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000), // 1.5 days ago
    relatedHcpCount: 234,
    category: 'trend',
    modulePath: '/action-queue',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function Dashboard() {
  const [, navigate] = useLocation();

  const {
    data: metrics,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<DashboardMetrics>({
    queryKey: ['/api/dashboard/metrics'],
  });

  // Calculate derived metrics
  const signalCount = metrics ? metrics.totalHcps * 47 : 0; // Simulated signal count
  const patternCount = mockPatterns.length;

  // Handle pattern click
  const handlePatternClick = (pattern: PatternHighlight) => {
    if (pattern.modulePath) {
      navigate(pattern.modulePath);
    }
  };

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border-gray bg-background/95 backdrop-blur-sm px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1
              className="text-lg font-semibold text-signal-white"
              data-testid="text-page-title"
            >
              Nerve Center
            </h1>
            <p className="text-sm text-muted-gray">
              Strategic intelligence at a glance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select defaultValue="30d">
              <SelectTrigger
                className="w-36 border-border-gray"
                data-testid="select-time-range"
              >
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="border-border-gray"
              data-testid="button-refresh"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`}
              />
            </Button>
            <Button variant="outline" className="border-border-gray" data-testid="button-export">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-8">
        {isError ? (
          <ErrorState
            title="Unable to load Nerve Center."
            message={
              error instanceof Error
                ? error.message
                : 'Failed to load dashboard metrics.'
            }
            type="server"
            retry={() => refetch()}
            size="lg"
          />
        ) : isLoading ? (
          <DashboardSkeleton />
        ) : metrics ? (
          <>
            {/* Welcome Message */}
            <WelcomeMessage
              signalCount={signalCount}
              patternCount={patternCount}
              className="mb-8"
            />

            {/* Quick Actions */}
            <QuickActions onNavigate={navigate} className="mb-8" />

            {/* Metrics Grid */}
            <MetricsGrid columns={6} className="mb-8">
              <MetricCard
                label="Signals Processed"
                value={signalCount}
                trend={14}
                trendLabel="vs last month"
                icon={Activity}
                tooltip="Total engagement signals processed by OmniVor"
                sparklineData={[45, 52, 48, 61, 55, 67, 72]}
                delay={0}
              />
              <MetricCard
                label="Active Audiences"
                value={23}
                secondaryMetric="3 need action"
                icon={Users}
                tooltip="Saved audience segments being monitored"
                delay={0.05}
              />
              <MetricCard
                label="Scenarios Run"
                value={metrics.totalSimulations}
                secondaryMetric="2 pending"
                icon={FlaskConical}
                tooltip="Campaign simulations executed this period"
                delay={0.1}
              />
              <MetricCard
                label="Patterns Found"
                value={patternCount}
                secondaryMetric="5 new today"
                icon={Zap}
                tooltip="Insights crystallized from signal analysis"
                delay={0.15}
              />
              <MetricCard
                label="Channel Health"
                value={72}
                suffix="%"
                trend={-3}
                trendLabel="2 channels low"
                icon={Stethoscope}
                tooltip="Overall channel signal quality score"
                sparklineData={[78, 75, 72, 74, 71, 73, 72]}
                delay={0.2}
              />
              <MetricCard
                label="Actions Queued"
                value={156}
                secondaryMetric="24 high-priority"
                icon={Target}
                tooltip="Next best actions awaiting execution"
                onClick={() => navigate('/action-queue')}
                delay={0.25}
              />
            </MetricsGrid>

            {/* Two-Column Layout: Charts + Patterns */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Charts Section (2 columns) */}
              <div className="lg:col-span-2">
                <DashboardMetricsDisplay metrics={metrics} />
              </div>

              {/* Pattern Highlights (1 column) */}
              <div className="lg:col-span-1">
                <PatternHighlights
                  patterns={mockPatterns}
                  onPatternClick={handlePatternClick}
                  maxPatterns={4}
                />
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title="No intelligence data."
            description="Connect your data sources and let OmniVor start processing signals."
            icon="activity"
            action={{
              label: 'Connect Channels',
              onClick: () => navigate('/feature-store'),
            }}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Welcome skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 rounded bg-border-gray animate-shimmer bg-gradient-to-r from-border-gray via-consumption-purple/10 to-border-gray bg-[length:200%_100%]" />
        <div className="h-5 w-96 rounded bg-border-gray animate-shimmer bg-gradient-to-r from-border-gray via-consumption-purple/10 to-border-gray bg-[length:200%_100%]" />
      </div>

      {/* Quick actions skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-28 rounded-lg bg-border-gray animate-shimmer bg-gradient-to-r from-border-gray via-consumption-purple/10 to-border-gray bg-[length:200%_100%]"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>

      {/* Metrics grid skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <ChartSkeleton key={i} />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-border-gray animate-shimmer bg-gradient-to-r from-border-gray via-consumption-purple/10 to-border-gray bg-[length:200%_100%]"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
