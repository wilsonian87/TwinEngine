/**
 * Dashboard Direct Mode — Stripe hero metric + AI narrative insight.
 *
 * Design analogues:
 * - Stripe Dashboard: single hero metric, calm density, contextual time comparisons
 * - Strava/Spotify Wrapped: AI-generated narrative insight paragraph
 *
 * Shows less than it knows. One number answers "Are we winning?"
 * Supporting metrics provide context, not noise.
 */

import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Users,
  Activity,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MOTION_DURATION, MOTION_EASING, staggerContainer, staggerChild } from "@/lib/motion-config";
import { AINarrativeBlock } from "@/components/shared/ai-narrative-block";
import { EngagementGrade } from "@/components/shared/engagement-grade";
import {
  useDashboardData,
  useDashboardNarrative,
} from "@/hooks/use-dashboard-data";
import type { OperationalMetrics } from "@/hooks/use-dashboard-data";

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function HeroMetric({
  value,
  label,
  delta,
  isLoading,
}: {
  value?: number;
  label: string;
  delta?: number;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-2 py-8">
        <Skeleton className="h-16 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: MOTION_DURATION.data, ease: MOTION_EASING.out }}
      className="flex flex-col items-center gap-1 py-8"
    >
      <div className="flex items-baseline gap-3">
        <span className="text-6xl font-bold tabular-nums tracking-tight">
          {value !== undefined ? `${value}%` : "—"}
        </span>
        {value !== undefined && (
          <EngagementGrade score={value} showScore={false} size="lg" />
        )}
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
      {delta !== undefined && delta !== 0 && (
        <div
          className={cn(
            "flex items-center gap-1 text-sm font-medium mt-1",
            delta > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}
        >
          {delta > 0 ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span>{delta > 0 ? "+" : ""}{delta}% vs last period</span>
        </div>
      )}
    </motion.div>
  );
}

function SupportingMetric({
  icon: Icon,
  label,
  value,
  format = "number",
  href,
  variant = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: number;
  format?: "number" | "percent";
  href?: string;
  variant?: "default" | "warning";
}) {
  const [, navigate] = useLocation();
  const formattedValue =
    value !== undefined
      ? format === "percent"
        ? `${value}%`
        : value.toLocaleString()
      : "—";

  return (
    <motion.div variants={staggerChild}>
      <Card
        className={cn(
          "transition-all",
          href && "cursor-pointer hover:shadow-md hover:border-primary/30",
          variant === "warning" && "border-amber-300 dark:border-amber-700"
        )}
        onClick={href ? () => navigate(href) : undefined}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  {label}
                </div>
                <div className="text-xl font-semibold tabular-nums mt-0.5">
                  {formattedValue}
                </div>
              </div>
            </div>
            {href && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DrillDownCard({
  title,
  description,
  href,
  count,
}: {
  title: string;
  description: string;
  href: string;
  count?: number;
}) {
  const [, navigate] = useLocation();

  return (
    <motion.div variants={staggerChild}>
      <Card
        className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
        onClick={() => navigate(href)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium text-sm">{title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {description}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {count !== undefined && count > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary tabular-nums">
                  {count}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DashboardDirect() {
  const { data, isLoading, refetch, isRefetching } = useDashboardData();
  const { data: narrativeData, isLoading: narrativeLoading } =
    useDashboardNarrative(data?.metrics);

  const metrics: OperationalMetrics | undefined = data?.metrics;

  return (
    <div className="h-full overflow-auto">
      {/* Header — minimal, calm */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-lg font-semibold"
              data-testid="text-page-title"
            >
              Dashboard
            </h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefetching && "animate-spin")}
            />
          </Button>
        </div>
      </div>

      <div className="p-6 max-w-3xl mx-auto space-y-8">
        {/* Hero Metric — single number that answers "Are we winning?" */}
        <HeroMetric
          value={metrics?.avgEngagementScore}
          label="Portfolio Engagement Score"
          delta={metrics?.atRiskTrend ? -metrics.atRiskTrend : undefined}
          isLoading={isLoading}
        />

        {/* AI Narrative Insight — Strava/Wrapped pattern */}
        <AINarrativeBlock
          narrative={narrativeData?.narrative}
          isLoading={narrativeLoading}
          usedAI={narrativeData?.usedAI}
          variant="verdict"
        />

        {/* Supporting Metrics — calm density grid */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="enter"
          className="grid grid-cols-2 gap-3"
        >
          <SupportingMetric
            icon={Users}
            label="Total HCPs"
            value={metrics?.totalHcps}
            href="/"
          />
          <SupportingMetric
            icon={Activity}
            label="Active"
            value={
              metrics?.totalHcps
                ? Math.round(
                    (metrics.activeHcps / metrics.totalHcps) * 100
                  )
                : undefined
            }
            format="percent"
            href="/?minEngagement=50"
          />
          <SupportingMetric
            icon={AlertTriangle}
            label="At Risk"
            value={metrics?.atRiskHcps}
            variant={
              metrics?.atRiskHcps && metrics.atRiskHcps > 100
                ? "warning"
                : "default"
            }
            href="/?minChurnRisk=70"
          />
          <SupportingMetric
            icon={Target}
            label="Pending Actions"
            value={metrics?.pendingNbas}
            href="/action-queue"
          />
        </motion.div>

        {/* Contextual Drill-Downs — smart recommendations */}
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Explore
          </h2>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="enter"
            className="space-y-2"
          >
            {data?.alerts && data.alerts.critical > 0 && (
              <DrillDownCard
                title="Critical alerts need attention"
                description={`${data.alerts.critical} critical, ${data.alerts.warning} warning`}
                href="/alerts"
                count={data.alerts.critical}
              />
            )}
            {metrics?.pendingNbas && metrics.pendingNbas > 0 && (
              <DrillDownCard
                title="Review pending recommendations"
                description="NBO engine has new actions ready for triage"
                href="/action-queue"
                count={metrics.pendingNbas}
              />
            )}
            {data?.pendingApprovals && data.pendingApprovals > 0 && (
              <DrillDownCard
                title="Approvals waiting for you"
                description="Agent actions need your review"
                href="/approvals"
                count={data.pendingApprovals}
              />
            )}
            <DrillDownCard
              title="Run a new simulation"
              description="Test channel mix scenarios against your audiences"
              href="/simulations"
            />
            <DrillDownCard
              title="Compare audiences"
              description="Side-by-side cohort analysis with AI verdict"
              href="/cohort-compare"
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
