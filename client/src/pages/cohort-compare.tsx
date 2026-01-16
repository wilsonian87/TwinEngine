import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Download,
  ArrowLeftRight,
  Users,
  TrendingUp,
  TrendingDown,
  Equal,
  Mail,
  Phone,
  Video,
  Globe,
  Calendar,
  Activity,
} from "lucide-react";
import type { SavedAudience, HCPProfile, Channel } from "@shared/schema";

/**
 * Cohort Comparison Page
 *
 * Allows side-by-side comparison of two saved audiences across multiple dimensions.
 */

// Channel icons
const channelIcons: Record<Channel, typeof Mail> = {
  email: Mail,
  rep_visit: Users,
  webinar: Video,
  conference: Calendar,
  digital_ad: Globe,
  phone: Phone,
};

// Channel labels
const channelLabels: Record<Channel, string> = {
  email: "Email",
  rep_visit: "Rep Visit",
  webinar: "Webinar",
  conference: "Conference",
  digital_ad: "Digital",
  phone: "Phone",
};

interface CohortMetrics {
  size: number;
  avgEngagement: number;
  avgMarketShare: number;
  avgConversionLikelihood: number;
  specialtyBreakdown: Record<string, number>;
  tierBreakdown: Record<string, number>;
  channelPrefBreakdown: Record<string, number>;
}

function calculateMetrics(hcps: HCPProfile[]): CohortMetrics {
  if (hcps.length === 0) {
    return {
      size: 0,
      avgEngagement: 0,
      avgMarketShare: 0,
      avgConversionLikelihood: 0,
      specialtyBreakdown: {},
      tierBreakdown: {},
      channelPrefBreakdown: {},
    };
  }

  const specialtyCount: Record<string, number> = {};
  const tierCount: Record<string, number> = {};
  const channelPrefCount: Record<string, number> = {};
  let totalEngagement = 0;
  let totalMarketShare = 0;
  let totalConversion = 0;

  for (const hcp of hcps) {
    totalEngagement += hcp.overallEngagementScore;
    totalMarketShare += hcp.marketSharePct;
    totalConversion += hcp.conversionLikelihood;

    specialtyCount[hcp.specialty] = (specialtyCount[hcp.specialty] || 0) + 1;
    tierCount[hcp.tier] = (tierCount[hcp.tier] || 0) + 1;
    channelPrefCount[hcp.channelPreference] = (channelPrefCount[hcp.channelPreference] || 0) + 1;
  }

  // Convert counts to percentages
  const toPercentages = (counts: Record<string, number>) => {
    const result: Record<string, number> = {};
    for (const [key, count] of Object.entries(counts)) {
      result[key] = Math.round((count / hcps.length) * 100);
    }
    return result;
  };

  return {
    size: hcps.length,
    avgEngagement: Math.round(totalEngagement / hcps.length),
    avgMarketShare: Math.round((totalMarketShare / hcps.length) * 10) / 10,
    avgConversionLikelihood: Math.round(totalConversion / hcps.length),
    specialtyBreakdown: toPercentages(specialtyCount),
    tierBreakdown: toPercentages(tierCount),
    channelPrefBreakdown: toPercentages(channelPrefCount),
  };
}

function calculateOverlap(ids1: string[], ids2: string[]): { overlap: number; percentage: number } {
  const set1 = new Set(ids1);
  const overlap = ids2.filter((id) => set1.has(id)).length;
  const union = new Set([...ids1, ...ids2]).size;
  return {
    overlap,
    percentage: union > 0 ? Math.round((overlap / union) * 100) : 0,
  };
}

interface CompareBarProps {
  label: string;
  valueA: number;
  valueB: number;
  maxValue?: number;
  suffix?: string;
}

function CompareBar({ label, valueA, valueB, maxValue = 100, suffix = "%" }: CompareBarProps) {
  const diff = valueA - valueB;
  const TrendIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Equal;
  const trendColor = diff > 0 ? "text-green-500" : diff < 0 ? "text-red-500" : "text-muted-foreground";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <TrendIcon className={`h-4 w-4 ${trendColor}`} />
          <span className={trendColor}>
            {diff > 0 ? "+" : ""}
            {diff}
            {suffix}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2">
          <Progress value={(valueA / maxValue) * 100} className="flex-1 h-2" />
          <span className="text-xs font-medium w-12 text-right">
            {valueA}
            {suffix}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium w-12">
            {valueB}
            {suffix}
          </span>
          <Progress value={(valueB / maxValue) * 100} className="flex-1 h-2" />
        </div>
      </div>
    </div>
  );
}

interface BreakdownCompareProps {
  title: string;
  dataA: Record<string, number>;
  dataB: Record<string, number>;
}

function BreakdownCompare({ title, dataA, dataB }: BreakdownCompareProps) {
  // Get all keys from both datasets
  const allKeys = Array.from(new Set([...Object.keys(dataA), ...Object.keys(dataB)])).sort();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {allKeys.map((key) => (
          <CompareBar
            key={key}
            label={key}
            valueA={dataA[key] || 0}
            valueB={dataB[key] || 0}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export default function CohortCompare() {
  const [cohortA, setCohortA] = useState<string>("");
  const [cohortB, setCohortB] = useState<string>("");

  // Fetch saved audiences
  const { data: audiences = [] } = useQuery<SavedAudience[]>({
    queryKey: ["/api/audiences"],
    queryFn: async () => {
      const response = await fetch("/api/audiences");
      if (!response.ok) throw new Error("Failed to fetch audiences");
      return response.json();
    },
  });

  // Fetch all HCPs
  const { data: allHcps = [] } = useQuery<HCPProfile[]>({
    queryKey: ["/api/hcps"],
    queryFn: async () => {
      const response = await fetch("/api/hcps");
      if (!response.ok) throw new Error("Failed to fetch HCPs");
      return response.json();
    },
  });

  // Get selected audiences
  const audienceA = audiences.find((a) => a.id === cohortA);
  const audienceB = audiences.find((a) => a.id === cohortB);

  // Filter HCPs for each cohort
  const hcpsA = useMemo(() => {
    if (!audienceA) return [];
    return allHcps.filter((hcp) => audienceA.hcpIds.includes(hcp.id));
  }, [audienceA, allHcps]);

  const hcpsB = useMemo(() => {
    if (!audienceB) return [];
    return allHcps.filter((hcp) => audienceB.hcpIds.includes(hcp.id));
  }, [audienceB, allHcps]);

  // Calculate metrics
  const metricsA = useMemo(() => calculateMetrics(hcpsA), [hcpsA]);
  const metricsB = useMemo(() => calculateMetrics(hcpsB), [hcpsB]);

  // Calculate overlap
  const overlap = useMemo(() => {
    if (!audienceA || !audienceB) return { overlap: 0, percentage: 0 };
    return calculateOverlap(audienceA.hcpIds, audienceB.hcpIds);
  }, [audienceA, audienceB]);

  // Key insights
  const insights = useMemo(() => {
    const result: string[] = [];
    if (!audienceA || !audienceB) return result;

    const engagementDiff = metricsA.avgEngagement - metricsB.avgEngagement;
    if (Math.abs(engagementDiff) > 10) {
      result.push(
        engagementDiff > 0
          ? `${audienceA.name} has ${engagementDiff}% higher avg engagement`
          : `${audienceB.name} has ${Math.abs(engagementDiff)}% higher avg engagement`
      );
    }

    const conversionDiff = metricsA.avgConversionLikelihood - metricsB.avgConversionLikelihood;
    if (Math.abs(conversionDiff) > 5) {
      result.push(
        conversionDiff > 0
          ? `${audienceA.name} has ${conversionDiff}% higher conversion likelihood`
          : `${audienceB.name} has ${Math.abs(conversionDiff)}% higher conversion likelihood`
      );
    }

    // Find biggest channel preference differences
    const allChannels = Array.from(new Set([
      ...Object.keys(metricsA.channelPrefBreakdown),
      ...Object.keys(metricsB.channelPrefBreakdown),
    ]));
    for (const channel of allChannels) {
      const diff = (metricsA.channelPrefBreakdown[channel] || 0) - (metricsB.channelPrefBreakdown[channel] || 0);
      if (Math.abs(diff) > 15) {
        const label = channelLabels[channel as Channel] || channel;
        result.push(
          diff > 0
            ? `${audienceA.name} has ${diff}% more ${label}-preferred HCPs`
            : `${audienceB.name} has ${Math.abs(diff)}% more ${label}-preferred HCPs`
        );
      }
    }

    return result;
  }, [audienceA, audienceB, metricsA, metricsB]);

  // Export comparison summary
  const exportComparison = () => {
    if (!audienceA || !audienceB) return;

    const summary = [
      "Cohort Comparison Summary",
      `Generated: ${new Date().toISOString()}`,
      "",
      `Cohort A: ${audienceA.name} (${metricsA.size} HCPs)`,
      `Cohort B: ${audienceB.name} (${metricsB.size} HCPs)`,
      `Overlap: ${overlap.overlap} HCPs (${overlap.percentage}%)`,
      "",
      "=== Key Metrics ===",
      `Avg Engagement: ${metricsA.avgEngagement}% vs ${metricsB.avgEngagement}%`,
      `Avg Market Share: ${metricsA.avgMarketShare}% vs ${metricsB.avgMarketShare}%`,
      `Avg Conversion Likelihood: ${metricsA.avgConversionLikelihood}% vs ${metricsB.avgConversionLikelihood}%`,
      "",
      "=== Key Insights ===",
      ...insights,
    ].join("\n");

    const blob = new Blob([summary], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cohort-comparison-${audienceA.name}-vs-${audienceB.name}-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const bothSelected = cohortA && cohortB && cohortA !== cohortB;

  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold" data-testid="text-page-title">
              Cohort Comparison
            </h1>
            <p className="text-sm text-muted-foreground">
              Compare two saved audiences side-by-side
            </p>
          </div>
          {bothSelected && (
            <Button variant="outline" size="sm" onClick={exportComparison}>
              <Download className="h-4 w-4 mr-1" />
              Export Summary
            </Button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Cohort Selectors */}
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cohort A
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={cohortA} onValueChange={setCohortA}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an audience..." />
                </SelectTrigger>
                <SelectContent>
                  {audiences
                    .filter((a) => a.id !== cohortB)
                    .map((audience) => (
                      <SelectItem key={audience.id} value={audience.id}>
                        <div className="flex items-center gap-2">
                          {audience.name}
                          <Badge variant="secondary" className="text-xs">
                            {audience.hcpIds.length}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {audienceA && (
                <p className="mt-2 text-xs text-muted-foreground">{audienceA.description}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cohort B
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={cohortB} onValueChange={setCohortB}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an audience..." />
                </SelectTrigger>
                <SelectContent>
                  {audiences
                    .filter((a) => a.id !== cohortA)
                    .map((audience) => (
                      <SelectItem key={audience.id} value={audience.id}>
                        <div className="flex items-center gap-2">
                          {audience.name}
                          <Badge variant="secondary" className="text-xs">
                            {audience.hcpIds.length}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {audienceB && (
                <p className="mt-2 text-xs text-muted-foreground">{audienceB.description}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {!bothSelected ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <ArrowLeftRight className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Select two different audiences to compare</p>
          </div>
        ) : (
          <>
            {/* Overlap Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overlap Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-md bg-blue-500/10 p-4 text-center">
                    <span className="block text-2xl font-bold text-blue-500">
                      {metricsA.size}
                    </span>
                    <span className="text-xs text-muted-foreground">{audienceA?.name}</span>
                  </div>
                  <div className="rounded-md bg-purple-500/10 p-4 text-center">
                    <span className="block text-2xl font-bold text-purple-500">
                      {overlap.overlap}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Overlap ({overlap.percentage}%)
                    </span>
                  </div>
                  <div className="rounded-md bg-green-500/10 p-4 text-center">
                    <span className="block text-2xl font-bold text-green-500">
                      {metricsB.size}
                    </span>
                    <span className="text-xs text-muted-foreground">{audienceB?.name}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Insights */}
            {insights.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Key Divergences</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Activity className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Summary Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <div className="grid grid-cols-2 gap-4">
                  <CardTitle className="text-sm font-medium text-center">
                    {audienceA?.name}
                  </CardTitle>
                  <CardTitle className="text-sm font-medium text-center">
                    {audienceB?.name}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CompareBar
                  label="Avg Engagement Score"
                  valueA={metricsA.avgEngagement}
                  valueB={metricsB.avgEngagement}
                />
                <CompareBar
                  label="Avg Market Share"
                  valueA={metricsA.avgMarketShare}
                  valueB={metricsB.avgMarketShare}
                  maxValue={50}
                />
                <CompareBar
                  label="Avg Conversion Likelihood"
                  valueA={metricsA.avgConversionLikelihood}
                  valueB={metricsB.avgConversionLikelihood}
                />
              </CardContent>
            </Card>

            {/* Breakdown Comparisons */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <BreakdownCompare
                title="Tier Distribution"
                dataA={metricsA.tierBreakdown}
                dataB={metricsB.tierBreakdown}
              />
              <BreakdownCompare
                title="Specialty Distribution"
                dataA={metricsA.specialtyBreakdown}
                dataB={metricsB.specialtyBreakdown}
              />
              <BreakdownCompare
                title="Channel Preferences"
                dataA={metricsA.channelPrefBreakdown}
                dataB={metricsB.channelPrefBreakdown}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
