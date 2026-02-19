/**
 * Simulation Studio Direct Mode — Figma Present Mode pattern.
 *
 * Design analogues:
 * - Figma: "Present" view — headline finding, key charts, recommendation
 * - Recent 3 as summary cards with outcome headlines
 * - No parameter controls visible — clean shareable summary
 *
 * Direct Mode shows results as decisions, not data.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import {
  FlaskConical,
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  ArrowRight,
  Clock,
  Plus,
  Minus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  staggerContainer,
  staggerChild,
  MOTION_DURATION,
  MOTION_EASING,
} from "@/lib/motion-config";
import { AINarrativeBlock } from "@/components/shared/ai-narrative-block";
import { SimulationReveal } from "@/components/viz/simulation-reveal";
import { AnimatedNumber } from "@/components/shared/animated-number";
import type { SimulationResult } from "@shared/schema";

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function generateInsight(result: SimulationResult): string {
  const lift = result.predictedRxLift;
  const engagement = result.predictedResponseRate;
  const topChannel = result.channelPerformance?.length
    ? [...result.channelPerformance].sort((a, b) => b.predictedResponse - a.predictedResponse)[0]
    : null;

  let insight = `"${result.scenarioName}" projects a ${lift > 0 ? "+" : ""}${lift.toFixed(1)}% Rx lift with ${engagement.toFixed(0)}% engagement rate.`;

  if (topChannel) {
    const channelLabel = topChannel.channel.replace("_", " ");
    insight += ` ${channelLabel} drives the highest predicted engagement at ${topChannel.predictedResponse.toFixed(0)}%.`;
  }

  if (result.vsBaseline.rxLiftDelta > 0) {
    insight += ` This outperforms baseline by ${result.vsBaseline.rxLiftDelta.toFixed(1)} points.`;
  } else if (result.vsBaseline.rxLiftDelta < 0) {
    insight += ` This underperforms baseline by ${Math.abs(result.vsBaseline.rxLiftDelta).toFixed(1)} points — consider adjusting channel mix.`;
  }

  return insight;
}

// ============================================================================
// HERO RESULT — Figma Present Mode
// ============================================================================

function PresentView({ result }: { result: SimulationResult }) {
  const insight = useMemo(() => generateInsight(result), [result]);
  const isPositive = result.vsBaseline.rxLiftDelta >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION_DURATION.data, ease: MOTION_EASING.out }}
      className="space-y-6"
    >
      {/* Headline Finding */}
      <AINarrativeBlock narrative={insight} variant="verdict" />

      {/* Simulation Reveal — confidence fan hero visualization */}
      <Card className="border border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <SimulationReveal
            baseline={result.predictedResponseRate - result.vsBaseline.engagementDelta}
            projected={result.predictedResponseRate}
            confidence={result.efficiencyScore / 100}
            delta={result.vsBaseline.rxLiftDelta}
            interventionLabel={result.scenarioName}
            metricLabel="Engagement Rate"
          />
        </CardContent>
      </Card>

      {/* Hero Metrics — 2x2 grid like Stripe */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Rx Lift
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className="text-3xl font-bold"
                style={{ color: isPositive ? "var(--catalyst-gold, #d97706)" : "var(--destructive)" }}
              >
                <AnimatedNumber
                  value={result.predictedRxLift}
                  variant="hero"
                  format={(n) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`}
                />
              </span>
              <span className={cn(
                "text-xs flex items-center gap-0.5",
                isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {isPositive ? "+" : ""}{result.vsBaseline.rxLiftDelta.toFixed(1)} vs baseline
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Engagement Rate
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className="text-3xl font-bold"
                style={{ color: "var(--process-violet, #a855f7)" }}
              >
                <AnimatedNumber
                  value={result.predictedResponseRate}
                  variant="hero"
                  format={(n) => `${n.toFixed(1)}%`}
                />
              </span>
              <span className={cn(
                "text-xs flex items-center gap-0.5",
                result.vsBaseline.engagementDelta >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}>
                {result.vsBaseline.engagementDelta >= 0 ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {result.vsBaseline.engagementDelta.toFixed(1)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Response Rate
            </p>
            <div className="mt-1">
              <span className="text-3xl font-bold">
                <AnimatedNumber
                  value={result.predictedResponseRate}
                  variant="supporting"
                  format={(n) => `${n.toFixed(1)}%`}
                />
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Predicted Reach
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold">
                <AnimatedNumber
                  value={result.predictedReach}
                  variant="supporting"
                  format={(n) => n.toLocaleString()}
                />
              </span>
              <span className="text-xs text-muted-foreground">HCPs</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Performance — horizontal bar viz */}
      {result.channelPerformance?.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
              Channel Performance
            </h3>
            <div className="space-y-3">
              {[...result.channelPerformance]
                .sort((a, b) => b.predictedResponse - a.predictedResponse)
                .map((cp) => {
                  const maxEngagement = Math.max(
                    ...result.channelPerformance.map((c) => c.predictedResponse)
                  );
                  const pct = maxEngagement > 0 ? (cp.predictedResponse / maxEngagement) * 100 : 0;
                  const channelLabel = cp.channel.replace("_", " ");

                  return (
                    <div key={cp.channel} className="flex items-center gap-3">
                      <span className="text-xs capitalize w-20 text-right text-muted-foreground">
                        {channelLabel}
                      </span>
                      <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: "linear-gradient(90deg, #a855f7 0%, #d97706 100%)" }}
                        />
                      </div>
                      <span className="text-xs tabular-nums w-12 text-right font-medium">
                        {cp.predictedResponse.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Efficiency Score */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Efficiency Score
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Overall cost-effectiveness rating
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold tabular-nums">{result.efficiencyScore}</span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// HISTORY CARD — Compact summary
// ============================================================================

function SimulationSummaryCard({
  result,
  isActive,
  onClick,
}: {
  result: SimulationResult;
  isActive: boolean;
  onClick: () => void;
}) {
  const isPositive = result.vsBaseline.rxLiftDelta >= 0;

  return (
    <motion.div variants={staggerChild}>
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          isActive && "ring-2 ring-primary border-primary/30"
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm truncate">{result.scenarioName}</h3>
            <Badge
              variant={isPositive ? "default" : "secondary"}
              className={cn(
                "text-[10px] shrink-0",
                isPositive && "bg-green-500/15 text-green-600 dark:text-green-400"
              )}
            >
              {isPositive ? "+" : ""}{result.vsBaseline.rxLiftDelta.toFixed(1)}%
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <div>
              <p className="text-[10px] text-muted-foreground">Rx Lift</p>
              <p className="text-sm font-bold tabular-nums">
                {result.predictedRxLift > 0 ? "+" : ""}{result.predictedRxLift.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Engagement</p>
              <p className="text-sm font-bold tabular-nums">{result.predictedResponseRate.toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Reach</p>
              <p className="text-sm font-bold tabular-nums">{result.predictedReach.toLocaleString()}</p>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {formatDate(result.runAt)}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SimulationsDirect() {
  const [, navigate] = useLocation();
  const searchString = useSearch();

  const { data: history = [], isLoading } = useQuery<SimulationResult[]>({
    queryKey: ["/api/simulations/history"],
  });

  // Show most recent by default, or URL-specified
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeResult = useMemo(() => {
    if (selectedId) return history.find((r) => r.id === selectedId) || null;
    return history.length > 0 ? history[0] : null;
  }, [history, selectedId]);

  const recentThree = history.slice(0, 3);

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold" data-testid="text-page-title">
              Simulation Studio
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {history.length} simulation{history.length !== 1 ? "s" : ""} run
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/simulations")}
          >
            <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
            New Simulation
          </Button>
        </div>
      </div>

      <div className="p-6 max-w-3xl mx-auto space-y-8">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FlaskConical className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No simulations yet</p>
            <p className="text-xs mt-1">Run a simulation to see results here</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate("/simulations")}
            >
              <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
              Build a Scenario
            </Button>
          </div>
        ) : (
          <>
            {/* Present View — the Figma hero */}
            {activeResult && <PresentView result={activeResult} />}

            {/* CTA */}
            {activeResult && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(`/action-queue?simulation=${activeResult.id}`)}
                >
                  <ArrowRight className="h-4 w-4 mr-1.5" />
                  Generate Actions
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/simulations")}
                >
                  <FlaskConical className="h-4 w-4 mr-1.5" />
                  Fork & Adjust
                </Button>
              </div>
            )}

            {/* Recent Simulations */}
            {recentThree.length > 1 && (
              <div>
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Recent Simulations
                </h2>
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="enter"
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                  {recentThree.map((result) => (
                    <SimulationSummaryCard
                      key={result.id}
                      result={result}
                      isActive={activeResult?.id === result.id}
                      onClick={() => setSelectedId(result.id)}
                    />
                  ))}
                </motion.div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
