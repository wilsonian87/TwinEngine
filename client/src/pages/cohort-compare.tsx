import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  ArrowLeftRight,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  FlaskConical,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { SavedAudience } from "@shared/schema";

/** Audience with server-computed health check */
type AudienceWithHealth = SavedAudience & { validHcpCount?: number };

/** Check if an audience has stale (unresolvable) HCP IDs */
function isStaleAudience(a: AudienceWithHealth): boolean {
  return a.validHcpCount !== undefined && a.validHcpCount === 0;
}

/**
 * Enhanced Cohort Comparison Page
 *
 * Server-side analytics with CPI/MSI metrics, distribution histograms,
 * and quick presets for common comparisons.
 */

// ============================================================================
// TYPES
// ============================================================================

interface CohortMetrics {
  a: number;
  b: number;
  delta: number;
  percentDelta?: number;
  significant?: boolean;
}

interface HistogramBin {
  min: number;
  max: number;
  count: number;
}

interface CohortComparisonResponse {
  cohortA: { id: string; name: string; count: number };
  cohortB: { id: string; name: string; count: number };
  overlap: { count: number; percentage: number };
  metrics: {
    avgEngagement: CohortMetrics;
    avgCPI: CohortMetrics;
    avgMSI: CohortMetrics;
    avgChurnRisk: CohortMetrics;
    avgConversionLikelihood: CohortMetrics;
    totalRxVolume: CohortMetrics;
    avgMarketShare: CohortMetrics;
  };
  distributions: {
    tier: { a: Record<string, number>; b: Record<string, number> };
    segment: { a: Record<string, number>; b: Record<string, number> };
    specialty: { a: Record<string, number>; b: Record<string, number> };
    channelPreference: { a: Record<string, number>; b: Record<string, number> };
    engagement: { a: HistogramBin[]; b: HistogramBin[] };
  };
}

interface Preset {
  id: string;
  name: string;
  description: string;
  cohortA: { name: string; hcpIds: string[]; count: number };
  cohortB: { name: string; hcpIds: string[]; count: number };
}

// ============================================================================
// HELPERS
// ============================================================================

const metricLabels: Record<string, string> = {
  avgEngagement: "Avg Engagement Score",
  avgCPI: "Avg Competitive Pressure (CPI)",
  avgMSI: "Avg Message Saturation (MSI)",
  avgChurnRisk: "Avg Churn Risk",
  avgConversionLikelihood: "Avg Conversion Likelihood",
  totalRxVolume: "Total Rx Volume",
  avgMarketShare: "Avg Market Share",
};

function formatValue(value: number, key: string): string {
  if (key === "totalRxVolume") return value.toLocaleString();
  if (key.includes("MarketShare")) return `${value}%`;
  return value.toString();
}

function formatDelta(delta: number, percentDelta?: number): string {
  const sign = delta > 0 ? "+" : "";
  if (percentDelta !== undefined) {
    return `${sign}${delta.toLocaleString()} (${sign}${percentDelta}%)`;
  }
  return `${sign}${delta}`;
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface DistributionChartProps {
  title: string;
  dataA: Record<string, number>;
  dataB: Record<string, number>;
  nameA: string;
  nameB: string;
}

function DistributionChart({ title, dataA, dataB, nameA, nameB }: DistributionChartProps) {
  const allKeys = Array.from(new Set([...Object.keys(dataA), ...Object.keys(dataB)])).sort();

  const chartData = allKeys.map((key) => ({
    name: key,
    [nameA]: Math.round((dataA[key] || 0) * 100),
    [nameB]: Math.round((dataB[key] || 0) * 100),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Legend />
            <Bar dataKey={nameA} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            <Bar dataKey={nameB} fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface EngagementHistogramProps {
  binsA: HistogramBin[];
  binsB: HistogramBin[];
  nameA: string;
  nameB: string;
}

function EngagementHistogram({ binsA, binsB, nameA, nameB }: EngagementHistogramProps) {
  const chartData = binsA.map((binA, i) => {
    const binB = binsB[i] || { count: 0 };
    return {
      range: `${binA.min}-${binA.max}`,
      [nameA]: binA.count,
      [nameB]: binB.count,
    };
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Engagement Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="range" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={nameA} fill="hsl(var(--primary))" />
            <Bar dataKey={nameB} fill="hsl(var(--muted-foreground))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CohortCompare() {
  const [cohortA, setCohortA] = useState<string>("");
  const [cohortB, setCohortB] = useState<string>("");
  const [activePreset, setActivePreset] = useState<Preset | null>(null);
  const searchString = useSearch();
  const [, navigate] = useLocation();

  // Read query params for pre-selection
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const aParam = params.get("a");
    const bParam = params.get("b");
    if (aParam) setCohortA(aParam);
    if (bParam) setCohortB(bParam);
  }, [searchString]);

  // Fetch saved audiences (enriched with validHcpCount from server)
  const { data: audiences = [] } = useQuery<AudienceWithHealth[]>({
    queryKey: ["/api/audiences"],
  });

  // Fetch presets
  const { data: presetsData } = useQuery<{ presets: Preset[] }>({
    queryKey: ["/api/analytics/cohort-presets"],
  });
  const presets = presetsData?.presets || [];

  // Fetch comparison data (for saved audiences)
  const {
    data: comparisonRaw,
    isLoading: comparisonLoading,
    refetch: refetchComparison,
  } = useQuery<CohortComparisonResponse & { staleAudiences?: boolean; staleCohorts?: { id: string; name: string }[] }>({
    queryKey: ["/api/analytics/cohort-compare", cohortA, cohortB],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/cohort-compare?cohortA=${cohortA}&cohortB=${cohortB}`);
      if (!res.ok) throw new Error("Failed to fetch comparison");
      return res.json();
    },
    enabled: !!cohortA && !!cohortB && !activePreset,
  });

  // Separate stale response from valid comparison
  const comparison = comparisonRaw?.staleAudiences ? undefined : comparisonRaw;
  const staleResponse = comparisonRaw?.staleAudiences ? comparisonRaw : undefined;

  // Preset comparison mutation
  const presetComparison = useMutation({
    mutationFn: async (preset: Preset) => {
      const res = await apiRequest("POST", "/api/analytics/cohort-compare-preset", {
        cohortA: preset.cohortA,
        cohortB: preset.cohortB,
      });
      return res.json();
    },
  });

  const handleApplyPreset = (preset: Preset) => {
    setCohortA("");
    setCohortB("");
    setActivePreset(preset);
    presetComparison.mutate(preset);
  };

  const handleSelectAudience = (type: "a" | "b", id: string) => {
    setActivePreset(null);
    if (type === "a") {
      setCohortA(id);
    } else {
      setCohortB(id);
    }
  };

  // Active comparison data
  const comparisonData = activePreset ? presetComparison.data : comparison;
  const isLoading = activePreset ? presetComparison.isPending : comparisonLoading;
  const bothSelected = (cohortA && cohortB && cohortA !== cohortB) || activePreset;

  // Export comparison
  const exportComparison = () => {
    if (!comparisonData) return;

    const lines = [
      "Cohort Comparison Report",
      `Generated: ${new Date().toISOString()}`,
      "",
      `Cohort A: ${comparisonData.cohortA.name} (n=${comparisonData.cohortA.count})`,
      `Cohort B: ${comparisonData.cohortB.name} (n=${comparisonData.cohortB.count})`,
      `Overlap: ${comparisonData.overlap.count} HCPs (${comparisonData.overlap.percentage}%)`,
      "",
      "=== Metrics Comparison ===",
      ...(Object.entries(comparisonData.metrics) as [string, CohortMetrics][]).map(([key, metric]) => {
        const label = metricLabels[key] || key;
        const sig = metric.significant ? " *" : "";
        return `${label}: ${metric.a} vs ${metric.b} (delta: ${formatDelta(metric.delta, metric.percentDelta)})${sig}`;
      }),
      "",
      "* Statistically significant at p < 0.05",
    ].join("\n");

    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cohort-comparison-${comparisonData.cohortA.name}-vs-${comparisonData.cohortB.name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold" data-testid="text-page-title">
              Audience Comparison
            </h1>
            <p className="text-sm text-muted-foreground">
              Side-by-side cohort analysis with statistical significance
            </p>
          </div>
          {comparisonData && (
            <Button variant="outline" size="sm" onClick={exportComparison}>
              <Download className="h-4 w-4 mr-1" />
              Export Report
            </Button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Cohort Selection */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cohort A</label>
                <Select
                  value={activePreset ? "" : cohortA}
                  onValueChange={(id) => handleSelectAudience("a", id)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an audience..." />
                  </SelectTrigger>
                  <SelectContent>
                    {audiences
                      .filter((a) => a.id !== cohortB && !isStaleAudience(a))
                      .map((audience) => (
                        <SelectItem key={audience.id} value={audience.id}>
                          <div className="flex items-center gap-2">
                            {audience.name}
                            <Badge variant="secondary" className="text-xs">
                              {audience.validHcpCount ?? audience.hcpIds.length}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cohort B</label>
                <Select
                  value={activePreset ? "" : cohortB}
                  onValueChange={(id) => handleSelectAudience("b", id)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an audience..." />
                  </SelectTrigger>
                  <SelectContent>
                    {audiences
                      .filter((a) => a.id !== cohortA && !isStaleAudience(a))
                      .map((audience) => (
                        <SelectItem key={audience.id} value={audience.id}>
                          <div className="flex items-center gap-2">
                            {audience.name}
                            <Badge variant="secondary" className="text-xs">
                              {audience.validHcpCount ?? audience.hcpIds.length}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={() => refetchComparison()}
                  disabled={!cohortA || !cohortB || cohortA === cohortB || isLoading}
                  className="w-full"
                >
                  {isLoading ? "Comparing..." : "Compare"}
                </Button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Quick Presets</p>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <Button
                    key={preset.id}
                    variant={activePreset?.id === preset.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-64" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          </div>
        )}

        {/* Stale Audience Warning — API returned staleAudiences flag */}
        {staleResponse && !isLoading && (
          <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="py-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Audience out of sync</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {staleResponse.staleCohorts?.map((c) => c.name).join(" and ")}{" "}
                  {(staleResponse.staleCohorts?.length ?? 0) > 1 ? "reference" : "references"}{" "}
                  HCP profiles that no longer exist. Re-save from the Audience Builder to refresh.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => navigate("/audience-builder")}
                >
                  <Users className="h-3 w-3 mr-1.5" />
                  Go to Audience Builder
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!bothSelected && !isLoading && (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <ArrowLeftRight className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Select two audiences or apply a preset to compare</p>
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

        {/* Comparison Results */}
        {comparisonData && !isLoading && (
          <>
            {/* Overlap Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overlap Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-md bg-primary/10 p-4 text-center">
                    <span className="block text-2xl font-bold text-primary">
                      {comparisonData.cohortA.count.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {comparisonData.cohortA.name}
                    </span>
                  </div>
                  <div className="rounded-md bg-purple-500/10 p-4 text-center">
                    <span className="block text-2xl font-bold text-purple-500">
                      {comparisonData.overlap.count.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Overlap ({comparisonData.overlap.percentage}%)
                    </span>
                  </div>
                  <div className="rounded-md bg-muted p-4 text-center">
                    <span className="block text-2xl font-bold">
                      {comparisonData.cohortB.count.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {comparisonData.cohortB.name}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metrics Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Metrics Comparison</CardTitle>
                <CardDescription className="text-xs">
                  * indicates statistical significance at p &lt; 0.05
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">
                        {comparisonData.cohortA.name}
                      </TableHead>
                      <TableHead className="text-right">
                        {comparisonData.cohortB.name}
                      </TableHead>
                      <TableHead className="text-right">Difference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(Object.entries(comparisonData.metrics) as [string, CohortMetrics][]).map(([key, metric]) => {
                      const DeltaIcon =
                        metric.delta > 0 ? TrendingUp : metric.delta < 0 ? TrendingDown : Minus;
                      const deltaColor =
                        metric.delta > 0
                          ? "text-green-600"
                          : metric.delta < 0
                          ? "text-red-600"
                          : "text-muted-foreground";

                      return (
                        <TableRow key={key}>
                          <TableCell className="font-medium">
                            {metricLabels[key] || key}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatValue(metric.a, key)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatValue(metric.b, key)}
                          </TableCell>
                          <TableCell className={`text-right ${deltaColor}`}>
                            <div className="flex items-center justify-end gap-1">
                              <DeltaIcon className="h-4 w-4" />
                              <span>{formatDelta(metric.delta, metric.percentDelta)}</span>
                              {metric.significant && (
                                <span className="text-xs">*</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Distribution Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DistributionChart
                title="Tier Distribution"
                dataA={comparisonData.distributions.tier.a}
                dataB={comparisonData.distributions.tier.b}
                nameA={comparisonData.cohortA.name}
                nameB={comparisonData.cohortB.name}
              />
              <DistributionChart
                title="Channel Preference"
                dataA={comparisonData.distributions.channelPreference.a}
                dataB={comparisonData.distributions.channelPreference.b}
                nameA={comparisonData.cohortA.name}
                nameB={comparisonData.cohortB.name}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EngagementHistogram
                binsA={comparisonData.distributions.engagement.a}
                binsB={comparisonData.distributions.engagement.b}
                nameA={comparisonData.cohortA.name}
                nameB={comparisonData.cohortB.name}
              />
              <DistributionChart
                title="Segment Distribution"
                dataA={comparisonData.distributions.segment.a}
                dataB={comparisonData.distributions.segment.b}
                nameA={comparisonData.cohortA.name}
                nameB={comparisonData.cohortB.name}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  navigate(`/simulations?audience=${comparisonData.cohortA.id}`)
                }
              >
                <FlaskConical className="h-4 w-4 mr-2" />
                Simulate {comparisonData.cohortA.name}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  navigate(`/simulations?audience=${comparisonData.cohortB.id}`)
                }
              >
                <FlaskConical className="h-4 w-4 mr-2" />
                Simulate {comparisonData.cohortB.name}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
