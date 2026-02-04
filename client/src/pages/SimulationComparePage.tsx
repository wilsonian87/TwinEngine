import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import {
  ArrowLeft,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  GitCompare,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useExportPDF } from "@/hooks/use-export";
import type { SimulationResult } from "@shared/schema";

interface ComparisonScenario {
  id: string;
  name: string;
  config: {
    scenarioId: string;
  };
  results: {
    predictedRxLift: number;
    predictedEngagementRate: number;
    predictedResponseRate: number;
    predictedReach: number;
    costPerEngagement?: number;
    efficiencyScore: number;
    channelPerformance: Array<{
      channel: string;
      engagementRate: number;
      responseRate: number;
      impact: number;
    }>;
    vsBaseline: {
      rxLiftDelta: number;
      engagementDelta: number;
      responseDelta: number;
    };
  };
  createdAt: string;
}

interface ComparisonResponse {
  scenarios: ComparisonScenario[];
  deltas: {
    rxLift: { absolute: number; percent: number };
    engagement: { absolute: number; percent: number };
    response: { absolute: number; percent: number };
    reach: { absolute: number; percent: number };
    efficiency: { absolute: number; percent: number };
    costPerEngagement: { absolute: number; percent: number } | null;
  };
  comparedAt: string;
}

interface MetricRow {
  key: string;
  label: string;
  format: (val: number) => string;
  higherIsBetter: boolean;
}

const metrics: MetricRow[] = [
  {
    key: "predictedRxLift",
    label: "Projected Rx Lift",
    format: (v) => `+${v.toFixed(1)}%`,
    higherIsBetter: true,
  },
  {
    key: "predictedEngagementRate",
    label: "Signal Strength",
    format: (v) => `${v.toFixed(1)}%`,
    higherIsBetter: true,
  },
  {
    key: "predictedResponseRate",
    label: "Response Rate",
    format: (v) => `${v.toFixed(1)}%`,
    higherIsBetter: true,
  },
  {
    key: "predictedReach",
    label: "Reach (HCPs)",
    format: (v) => v.toLocaleString(),
    higherIsBetter: true,
  },
  {
    key: "efficiencyScore",
    label: "Efficiency Score",
    format: (v) => `${v.toFixed(0)}/100`,
    higherIsBetter: true,
  },
  {
    key: "costPerEngagement",
    label: "Cost per Engagement",
    format: (v) => (v ? `$${v.toFixed(2)}` : "N/A"),
    higherIsBetter: false,
  },
];

function DeltaCell({
  delta,
  higherIsBetter,
}: {
  delta: number;
  higherIsBetter: boolean;
}) {
  const isPositive = delta > 0;
  const isGood = higherIsBetter ? isPositive : !isPositive;
  const isNeutral = Math.abs(delta) < 0.01;

  if (isNeutral) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-4 w-4" />
        <span>0</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1 font-medium ${
        isGood ? "text-emerald-500" : "text-red-500"
      }`}
    >
      {isPositive ? (
        <TrendingUp className="h-4 w-4" />
      ) : (
        <TrendingDown className="h-4 w-4" />
      )}
      <span>
        {isPositive ? "+" : ""}
        {delta.toFixed(1)}
      </span>
    </div>
  );
}

export default function SimulationComparePage() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(searchString);
  const initialIds = params.get("ids")?.split(",").filter(Boolean) || [];

  const [selectedA, setSelectedA] = useState<string>(initialIds[0] || "");
  const [selectedB, setSelectedB] = useState<string>(initialIds[1] || "");

  // Fetch all simulations for the selector dropdowns
  const {
    data: allSimulations = [],
    isLoading: loadingAll,
    isError: errorAll,
    refetch: refetchAll,
  } = useQuery<SimulationResult[]>({
    queryKey: ["/api/simulations/history"],
  });

  // Fetch comparison data when both scenarios are selected
  const idsToCompare = selectedA && selectedB ? `${selectedA},${selectedB}` : "";
  const {
    data: comparison,
    isLoading: loadingComparison,
    isError: errorComparison,
    refetch: refetchComparison,
  } = useQuery<ComparisonResponse>({
    queryKey: [`/api/simulations/compare?ids=${idsToCompare}`],
    enabled: !!selectedA && !!selectedB && selectedA !== selectedB,
  });

  const { exportPDF, isExporting } = useExportPDF(
    "comparison",
    undefined,
    {
      title: comparison
        ? `${comparison.scenarios[0]?.name} vs ${comparison.scenarios[1]?.name}`
        : "Scenario Comparison",
    },
    [selectedA, selectedB].filter(Boolean)
  );

  const handleCompare = () => {
    if (selectedA && selectedB && selectedA !== selectedB) {
      setLocation(`/simulations/compare?ids=${selectedA},${selectedB}`);
    }
  };

  const winnerAnalysis = useMemo(() => {
    if (!comparison) return null;

    const [a, b] = comparison.scenarios;
    const { deltas } = comparison;

    // Count wins for each scenario
    let aWins = 0;
    let bWins = 0;

    if (deltas.rxLift.absolute > 0) bWins++;
    else if (deltas.rxLift.absolute < 0) aWins++;

    if (deltas.engagement.absolute > 0) bWins++;
    else if (deltas.engagement.absolute < 0) aWins++;

    if (deltas.response.absolute > 0) bWins++;
    else if (deltas.response.absolute < 0) aWins++;

    if (deltas.reach.absolute > 0) bWins++;
    else if (deltas.reach.absolute < 0) aWins++;

    if (deltas.efficiency.absolute > 0) bWins++;
    else if (deltas.efficiency.absolute < 0) aWins++;

    // Cost per engagement - lower is better
    if (deltas.costPerEngagement) {
      if (deltas.costPerEngagement.absolute < 0) bWins++;
      else if (deltas.costPerEngagement.absolute > 0) aWins++;
    }

    if (aWins === bWins) {
      return `Both scenarios perform similarly across key metrics. Consider channel-specific performance for a tie-breaker.`;
    }

    const winner = aWins > bWins ? a : b;
    const winCount = Math.max(aWins, bWins);
    const totalMetrics = 6;

    return `"${winner.name}" outperforms on ${winCount}/${totalMetrics} metrics. It shows ${
      aWins > bWins
        ? `${Math.abs(deltas.rxLift.absolute).toFixed(1)}% higher`
        : `${Math.abs(deltas.rxLift.absolute).toFixed(1)}% higher`
    } projected Rx lift.`;
  }, [comparison]);

  if (loadingAll) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (errorAll) {
    return (
      <div className="container py-6">
        <ErrorState
          title="Unable to load simulations"
          message="Failed to fetch simulation history for comparison."
          type="server"
          retry={() => refetchAll()}
        />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/simulations")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GitCompare className="h-6 w-6" />
              Compare Scenarios
            </h1>
            <p className="text-sm text-muted-foreground">
              Side-by-side analysis of simulation results
            </p>
          </div>
        </div>
        <Button
          onClick={() => exportPDF()}
          disabled={!comparison || isExporting}
          variant="outline"
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? "Exporting..." : "Export PDF"}
        </Button>
      </div>

      {/* Scenario Selectors */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Scenario A</label>
              <Select value={selectedA} onValueChange={setSelectedA}>
                <SelectTrigger>
                  <SelectValue placeholder="Select first scenario" />
                </SelectTrigger>
                <SelectContent>
                  {allSimulations.map((sim) => (
                    <SelectItem
                      key={sim.id}
                      value={sim.id}
                      disabled={sim.id === selectedB}
                    >
                      <div className="flex items-center gap-2">
                        <FlaskConical className="h-4 w-4 text-muted-foreground" />
                        {sim.scenarioName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Scenario B</label>
              <Select value={selectedB} onValueChange={setSelectedB}>
                <SelectTrigger>
                  <SelectValue placeholder="Select second scenario" />
                </SelectTrigger>
                <SelectContent>
                  {allSimulations.map((sim) => (
                    <SelectItem
                      key={sim.id}
                      value={sim.id}
                      disabled={sim.id === selectedA}
                    >
                      <div className="flex items-center gap-2">
                        <FlaskConical className="h-4 w-4 text-muted-foreground" />
                        {sim.scenarioName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleCompare}
              disabled={!selectedA || !selectedB || selectedA === selectedB}
            >
              <GitCompare className="h-4 w-4 mr-2" />
              Compare
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {loadingComparison && (
        <Card>
          <CardContent className="py-8">
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {errorComparison && (
        <ErrorState
          title="Comparison failed"
          message="Unable to compare selected scenarios."
          type="server"
          retry={() => refetchComparison()}
        />
      )}

      {comparison && (
        <>
          {/* Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Metric Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Metric</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">
                          A
                        </Badge>
                        {comparison.scenarios[0]?.name}
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                          B
                        </Badge>
                        {comparison.scenarios[1]?.name}
                      </div>
                    </TableHead>
                    <TableHead className="w-[150px]">Difference (B - A)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((metric) => {
                    const valA =
                      comparison.scenarios[0]?.results[
                        metric.key as keyof ComparisonScenario["results"]
                      ] as number | undefined;
                    const valB =
                      comparison.scenarios[1]?.results[
                        metric.key as keyof ComparisonScenario["results"]
                      ] as number | undefined;

                    const delta =
                      valA !== undefined && valB !== undefined
                        ? valB - valA
                        : 0;

                    return (
                      <TableRow key={metric.key}>
                        <TableCell className="font-medium">
                          {metric.label}
                        </TableCell>
                        <TableCell className="font-mono">
                          {valA !== undefined ? metric.format(valA) : "N/A"}
                        </TableCell>
                        <TableCell className="font-mono">
                          {valB !== undefined ? metric.format(valB) : "N/A"}
                        </TableCell>
                        <TableCell>
                          <DeltaCell
                            delta={delta}
                            higherIsBetter={metric.higherIsBetter}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Channel Performance Comparison */}
          {comparison.scenarios[0]?.results.channelPerformance &&
            comparison.scenarios[0].results.channelPerformance.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Channel Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Channel</TableHead>
                        <TableHead>
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">
                            A
                          </Badge>{" "}
                          Impact
                        </TableHead>
                        <TableHead>
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                            B
                          </Badge>{" "}
                          Impact
                        </TableHead>
                        <TableHead>Difference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparison.scenarios[0].results.channelPerformance.map(
                        (channelA, idx) => {
                          const channelB =
                            comparison.scenarios[1]?.results.channelPerformance?.[
                              idx
                            ];
                          const delta = channelB
                            ? channelB.impact - channelA.impact
                            : 0;

                          return (
                            <TableRow key={channelA.channel}>
                              <TableCell className="font-medium capitalize">
                                {channelA.channel}
                              </TableCell>
                              <TableCell className="font-mono">
                                {channelA.impact.toFixed(1)}%
                              </TableCell>
                              <TableCell className="font-mono">
                                {channelB?.impact.toFixed(1) ?? "N/A"}%
                              </TableCell>
                              <TableCell>
                                <DeltaCell delta={delta} higherIsBetter={true} />
                              </TableCell>
                            </TableRow>
                          );
                        }
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

          {/* Winner Highlight */}
          {winnerAnalysis && (
            <div className="p-4 bg-muted rounded-lg border">
              <span className="font-medium text-foreground">Recommendation: </span>
              <span className="text-muted-foreground">{winnerAnalysis}</span>
            </div>
          )}
        </>
      )}

      {/* Empty state when no comparison */}
      {!comparison && !loadingComparison && !errorComparison && selectedA && selectedB && selectedA === selectedB && (
        <Card>
          <CardContent className="py-12 text-center">
            <GitCompare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Select two different scenarios to compare
            </p>
          </CardContent>
        </Card>
      )}

      {!comparison && !loadingComparison && !errorComparison && (!selectedA || !selectedB) && (
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Select two scenarios above to begin comparison
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
