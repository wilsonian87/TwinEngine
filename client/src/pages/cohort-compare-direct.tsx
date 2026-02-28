/**
 * Audience Comparison Direct Mode — NerdWallet verdict + Progressive impact translation.
 *
 * Design analogues:
 * - NerdWallet: verdict banner before data, "Our Take" editorial layer, winner badges
 * - Progressive: "you could save" framing, impact translation, explainability
 * - Apple: highlight divergence, mute similarity, sticky header
 *
 * The table becomes evidence for the narrative, not the story itself.
 */

import { useState, useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftRight,
  Users,
  ChevronDown,
  ChevronRight,
  Trophy,
  FlaskConical,
  Layers,
  Zap,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MOTION_DURATION, MOTION_EASING, staggerContainer, staggerChild } from "@/lib/motion-config";
import { AINarrativeBlock } from "@/components/shared/ai-narrative-block";
import { CohortCompareViz } from "@/components/viz/cohort-compare-viz";
import { apiRequest } from "@/lib/queryClient";
import {
  useAudiencesForComparison,
  useComparisonPresets,
  useComparisonNarrative,
  findMostDivergent,
  getWinners,
  computeCohortGrade,
  METRIC_LABELS,
} from "@/hooks/use-comparison-data";
import type {
  CohortMetrics,
  CohortComparisonResponse,
  ComparisonPreset,
} from "@/hooks/use-comparison-data";
import { useQuery } from "@tanstack/react-query";

// ============================================================================
// HELPERS
// ============================================================================

function formatValue(value: number, key: string): string {
  if (key === "totalRxVolume") return value.toLocaleString();
  if (key.includes("MarketShare")) return `${value}%`;
  return value.toFixed(1);
}

function impactTranslation(key: string, metric: CohortMetrics, cohortACount: number): string | null {
  const absDelta = Math.abs(metric.delta);
  if (absDelta < 1) return null;

  if (key === "avgEngagement") {
    const impactedHcps = Math.round(cohortACount * (absDelta / 100));
    return `Applied to ${cohortACount.toLocaleString()} HCPs, this gap represents ~${impactedHcps} providers in engagement difference`;
  }
  if (key === "avgConversionLikelihood") {
    return `${absDelta.toFixed(1)} point conversion gap — meaningful for high-touch pilot targeting`;
  }
  if (key === "avgChurnRisk") {
    return `${absDelta.toFixed(1)} point churn risk difference signals distinct retention needs`;
  }
  if (key === "avgCPI") {
    return `${absDelta.toFixed(1)} point competitive pressure gap — consider defensive strategy`;
  }
  return null;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function VerdictBanner({
  comparison,
  narrative,
  narrativeLoading,
  usedAI,
}: {
  comparison: CohortComparisonResponse;
  narrative?: string;
  narrativeLoading: boolean;
  usedAI?: boolean;
}) {
  const gradeA = computeCohortGrade(comparison.metrics, "a");
  const gradeB = computeCohortGrade(comparison.metrics, "b");
  const aWins = gradeA.score >= gradeB.score;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION_DURATION.data, ease: MOTION_EASING.out }}
    >
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5 space-y-4">
          {/* Grade Scoreline */}
          <div className="flex items-center justify-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold tabular-nums",
                  aWins
                    ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.35)]"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {gradeA.grade}
              </div>
              <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                {comparison.cohortA.name}
              </div>
            </div>
            <div className="text-xs text-muted-foreground font-medium">vs</div>
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold tabular-nums",
                  !aWins
                    ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.35)]"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {gradeB.grade}
              </div>
              <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                {comparison.cohortB.name}
              </div>
            </div>
          </div>

          {/* Overlap */}
          <div className="text-center text-xs text-muted-foreground">
            {comparison.overlap.count.toLocaleString()} HCPs in common ({comparison.overlap.percentage}% overlap)
          </div>

          {/* AI Verdict */}
          <AINarrativeBlock
            narrative={narrative}
            isLoading={narrativeLoading}
            usedAI={usedAI}
            variant="verdict"
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MetricRow({
  metricKey,
  metric,
  winner,
  cohortAName,
  cohortBName,
  cohortACount,
  isMostDivergent,
}: {
  metricKey: string;
  metric: CohortMetrics;
  winner: "a" | "b" | "tie";
  cohortAName: string;
  cohortBName: string;
  cohortACount: number;
  isMostDivergent: boolean;
}) {
  const impact = impactTranslation(metricKey, metric, cohortACount);

  return (
    <motion.div
      variants={staggerChild}
      className={cn(
        "rounded-lg border p-3 transition-all",
        isMostDivergent && "border-primary/30 bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {winner !== "tie" && (
            <Trophy
              className={cn(
                "h-3.5 w-3.5",
                winner === "a" ? "text-primary" : "text-muted-foreground"
              )}
            />
          )}
          <span className="text-sm font-medium">
            {METRIC_LABELS[metricKey] || metricKey}
          </span>
          {isMostDivergent && (
            <Badge variant="outline" className="text-[10px] h-4">
              Key difference
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
        <div className={cn(winner === "a" && "font-semibold text-primary")}>
          <div className="text-xs text-muted-foreground truncate">{cohortAName}</div>
          <div className="tabular-nums">{formatValue(metric.a, metricKey)}</div>
        </div>
        <div className={cn(winner === "b" && "font-semibold text-primary")}>
          <div className="text-xs text-muted-foreground truncate">{cohortBName}</div>
          <div className="tabular-nums">{formatValue(metric.b, metricKey)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Difference</div>
          <div
            className={cn(
              "tabular-nums",
              metric.delta > 0 ? "text-green-600 dark:text-green-400" : metric.delta < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
            )}
          >
            {metric.delta > 0 ? "+" : ""}
            {formatValue(metric.delta, metricKey)}
            {metric.significant && <span className="text-[10px] ml-0.5">*</span>}
          </div>
        </div>
      </div>

      {/* Impact Translation — Progressive pattern */}
      {impact && (
        <div className="mt-2 text-xs text-muted-foreground italic">
          {impact}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CohortCompareDirect() {
  const [cohortA, setCohortA] = useState<string>("");
  const [cohortB, setCohortB] = useState<string>("");
  const [activePreset, setActivePreset] = useState<ComparisonPreset | null>(null);
  const [showAllMetrics, setShowAllMetrics] = useState(false);
  const searchString = useSearch();
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const aParam = params.get("a");
    const bParam = params.get("b");
    if (aParam) setCohortA(aParam);
    if (bParam) setCohortB(bParam);
  }, [searchString]);

  const { data: audiences = [] } = useAudiencesForComparison();
  const { data: presets = [] } = useComparisonPresets();

  // Audience-based comparison
  const {
    data: comparison,
    isLoading: comparisonLoading,
    refetch: refetchComparison,
  } = useQuery<CohortComparisonResponse>({
    queryKey: ["/api/analytics/cohort-compare", cohortA, cohortB],
    queryFn: async () => {
      const res = await fetch(
        `/api/analytics/cohort-compare?cohortA=${cohortA}&cohortB=${cohortB}`
      );
      if (!res.ok) throw new Error("Failed to fetch comparison");
      return res.json();
    },
    enabled: !!cohortA && !!cohortB && !activePreset,
  });

  // Preset comparison
  const presetComparison = useMutation({
    mutationFn: async (preset: ComparisonPreset) => {
      const res = await apiRequest("POST", "/api/analytics/cohort-compare-preset", {
        cohortA: preset.cohortA,
        cohortB: preset.cohortB,
      });
      return res.json();
    },
  });

  const handleApplyPreset = (preset: ComparisonPreset) => {
    setCohortA("");
    setCohortB("");
    setActivePreset(preset);
    presetComparison.mutate(preset);
  };

  const handleSelectAudience = (type: "a" | "b", id: string) => {
    setActivePreset(null);
    if (type === "a") setCohortA(id);
    else setCohortB(id);
  };

  const comparisonData = activePreset ? presetComparison.data : comparison;
  const isLoading = activePreset ? presetComparison.isPending : comparisonLoading;
  const bothSelected = (cohortA && cohortB && cohortA !== cohortB) || activePreset;

  // AI narrative
  const { data: narrativeData, isLoading: narrativeLoading } =
    useComparisonNarrative(comparisonData);

  // Analysis helpers
  const mostDivergent = comparisonData
    ? findMostDivergent(comparisonData.metrics)
    : [];
  const winners = comparisonData ? getWinners(comparisonData.metrics) : {};

  // Show top 4 metrics by default; expand for all 7
  const metricEntries = comparisonData
    ? (Object.entries(comparisonData.metrics) as [string, CohortMetrics][])
    : [];
  const sortedMetrics = [...metricEntries].sort(
    (a, b) =>
      Math.abs(b[1].percentDelta || b[1].delta) -
      Math.abs(a[1].percentDelta || a[1].delta)
  );
  const visibleMetrics = showAllMetrics
    ? sortedMetrics
    : sortedMetrics.slice(0, 4);

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-lg font-semibold"
              data-testid="text-page-title"
            >
              Audience Comparison
            </h1>
          </div>
          {comparisonData && (
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          )}
        </div>
      </div>

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Cohort Selectors */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Cohort A
                </label>
                <Select
                  value={activePreset ? "" : cohortA}
                  onValueChange={(id) => handleSelectAudience("a", id)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select audience..." />
                  </SelectTrigger>
                  <SelectContent>
                    {audiences
                      .filter((a) => a.id !== cohortB)
                      .map((audience) => (
                        <SelectItem key={audience.id} value={audience.id}>
                          {audience.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Cohort B
                </label>
                <Select
                  value={activePreset ? "" : cohortB}
                  onValueChange={(id) => handleSelectAudience("b", id)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select audience..." />
                  </SelectTrigger>
                  <SelectContent>
                    {audiences
                      .filter((a) => a.id !== cohortA)
                      .map((audience) => (
                        <SelectItem key={audience.id} value={audience.id}>
                          {audience.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Presets */}
            {presets.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {presets.map((preset) => (
                  <Button
                    key={preset.id}
                    variant={
                      activePreset?.id === preset.id ? "default" : "outline"
                    }
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    {preset.name}
                  </Button>
                ))}
              </div>
            )}

            {/* Compare button for audience selection */}
            {!activePreset && cohortA && cohortB && cohortA !== cohortB && (
              <Button
                onClick={() => refetchComparison()}
                disabled={isLoading}
                className="w-full"
                size="sm"
              >
                {isLoading ? "Comparing..." : "Compare"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        )}

        {/* Empty State */}
        {!bothSelected && !isLoading && (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            <ArrowLeftRight className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              Select two audiences or apply a preset to compare
            </p>
            {audiences.length < 2 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => navigate("/audience-builder")}
              >
                <Users className="h-4 w-4 mr-1.5" />
                Create Audiences
              </Button>
            )}
          </div>
        )}

        {/* Results */}
        {comparisonData && !isLoading && (
          <>
            {/* Verdict Banner — NerdWallet pattern */}
            <VerdictBanner
              comparison={comparisonData}
              narrative={narrativeData?.narrative}
              narrativeLoading={narrativeLoading}
              usedAI={narrativeData?.usedAI}
            />

            {/* Radar Duel — gestalt shape comparison */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Performance Profile</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <CohortCompareViz
                  cohortA={{
                    name: comparisonData.cohortA.name,
                    metrics: Object.fromEntries(
                      Object.entries(comparisonData.metrics).map(([key, m]) => [key, (m as CohortMetrics).a])
                    ),
                  }}
                  cohortB={{
                    name: comparisonData.cohortB.name,
                    metrics: Object.fromEntries(
                      Object.entries(comparisonData.metrics).map(([key, m]) => [key, (m as CohortMetrics).b])
                    ),
                  }}
                  metricLabels={METRIC_LABELS}
                />
              </CardContent>
            </Card>

            {/* Metric Rows — sorted by divergence, impact translations */}
            <div>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Metrics Breakdown
              </h2>
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="enter"
                className="space-y-2"
              >
                {visibleMetrics.map(([key, metric]) => (
                  <MetricRow
                    key={key}
                    metricKey={key}
                    metric={metric}
                    winner={winners[key] || "tie"}
                    cohortAName={comparisonData.cohortA.name}
                    cohortBName={comparisonData.cohortB.name}
                    cohortACount={comparisonData.cohortA.count}
                    isMostDivergent={mostDivergent.includes(key)}
                  />
                ))}
              </motion.div>

              {/* Show more toggle */}
              {sortedMetrics.length > 4 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-xs"
                  onClick={() => setShowAllMetrics(!showAllMetrics)}
                >
                  {showAllMetrics ? (
                    <>Show fewer metrics</>
                  ) : (
                    <>
                      Show {sortedMetrics.length - 4} more metrics
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Post-Comparison CTAs */}
            <div>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Next Steps
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() =>
                    navigate(
                      `/simulations?audience=${comparisonData.cohortA.id}`
                    )
                  }
                >
                  <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
                  Simulate A
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() =>
                    navigate(
                      `/simulations?audience=${comparisonData.cohortB.id}`
                    )
                  }
                >
                  <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
                  Simulate B
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start col-span-2"
                  onClick={() => navigate("/audience-builder")}
                >
                  <Layers className="h-3.5 w-3.5 mr-1.5" />
                  Merge into New Audience
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
