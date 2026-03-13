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
  AlertTriangle,
  Target,
  Users,
  Activity,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MOTION_DURATION, MOTION_EASING, staggerContainer, staggerChild } from "@/lib/motion-config";
import { AINarrativeBlock } from "@/components/shared/ai-narrative-block";
import { EngagementGrade } from "@/components/shared/engagement-grade";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { MetricDelta } from "@/components/shared/metric-delta";
import { SimulationReveal } from "@/components/viz/simulation-reveal";
import { HCPProfileCard } from "@/components/viz/hcp-profile-card";
import type { HCPDossier } from "@/components/viz/hcp-profile-card";
import {
  useDashboardData,
  useDashboardNarrative,
} from "@/hooks/use-dashboard-data";
import type { OperationalMetrics } from "@/hooks/use-dashboard-data";

// ============================================================================
// MOCK DATA — Priority HCPs for Dashboard preview
// ============================================================================

const PRIORITY_HCPS: HCPDossier[] = [
  {
    name: "Dr. Sarah Chen",
    specialty: "Pulmonology",
    engagementScore: 92,
    tier: "gold",
    adoptionStage: "advocate",
    riskLevel: "low",
    channelPreference: "peer",
    radarAxes: {
      engagement: 0.92,
      recency: 0.88,
      channelDiversity: 0.75,
      contentAffinity: 0.83,
      peerInfluence: 0.91,
      adoptionProgress: 0.95,
    },
  },
  {
    name: "Dr. James Rivera",
    specialty: "Oncology",
    engagementScore: 78,
    tier: "silver",
    adoptionStage: "growing",
    riskLevel: "medium",
    channelPreference: "email",
    radarAxes: {
      engagement: 0.78,
      recency: 0.65,
      channelDiversity: 0.52,
      contentAffinity: 0.88,
      peerInfluence: 0.43,
      adoptionProgress: 0.61,
    },
  },
  {
    name: "Dr. Priya Kapoor",
    specialty: "Cardiology",
    engagementScore: 65,
    tier: "bronze",
    adoptionStage: "early",
    riskLevel: "high",
    channelPreference: "rep",
    radarAxes: {
      engagement: 0.65,
      recency: 0.38,
      channelDiversity: 0.42,
      contentAffinity: 0.71,
      peerInfluence: 0.55,
      adoptionProgress: 0.3,
    },
  },
];

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
        {value !== undefined ? (
          <AnimatedNumber
            value={value}
            variant="hero"
            format={(n) => `${Math.round(n)}%`}
            className="text-6xl font-bold tracking-tight"
          />
        ) : (
          <span className="text-6xl font-bold tabular-nums tracking-tight">—</span>
        )}
        {value !== undefined && (
          <EngagementGrade score={value} showScore={false} size="lg" />
        )}
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
      {delta !== undefined && delta !== 0 && (
        <div className="mt-1">
          <MetricDelta
            value={delta}
            format={(n) => `${n > 0 ? "+" : ""}${n}% vs last period`}
          />
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
  const formatFn =
    format === "percent"
      ? (n: number) => `${Math.round(n)}%`
      : (n: number) => Math.round(n).toLocaleString();

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
                <div className="text-xl font-semibold mt-0.5">
                  {value !== undefined ? (
                    <AnimatedNumber
                      value={value}
                      variant="supporting"
                      format={formatFn}
                    />
                  ) : (
                    "—"
                  )}
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
  const [, navigate] = useLocation();
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

        {/* What-If Preview — SimulationReveal */}
        {metrics?.avgEngagementScore && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: MOTION_DURATION.data, ease: MOTION_EASING.out, delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    What-If Preview
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => navigate("/simulations")}
                  >
                    Run full simulation
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <SimulationReveal
                  baseline={metrics.avgEngagementScore}
                  projected={Number((metrics.avgEngagementScore * 1.12).toFixed(2))}
                  confidence={0.85}
                  delta={12.0}
                  interventionLabel="Shift 15% email budget → peer-to-peer"
                  metricLabel="Engagement Score"
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Priority HCPs — dossier cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Priority HCPs
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => navigate("/")}
            >
              View all
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {PRIORITY_HCPS.map((hcp) => (
              <HCPProfileCard
                key={hcp.name}
                hcp={hcp}
                onClick={() => navigate("/")}
              />
            ))}
          </div>
        </div>

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
            {(metrics?.pendingNbas ?? 0) > 0 && (
              <DrillDownCard
                title="Review pending recommendations"
                description="NBO engine has new actions ready for triage"
                href="/action-queue"
                count={metrics?.pendingNbas}
              />
            )}
            {(data?.pendingApprovals ?? 0) > 0 && (
              <DrillDownCard
                title="Approvals waiting for you"
                description="Agent actions need your review"
                href="/approvals"
                count={data?.pendingApprovals}
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
