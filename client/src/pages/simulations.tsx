import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import { FlaskConical, Clock, ArrowRight, AlertCircle, X, GitBranch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { SimulationBuilder } from "@/components/simulation-builder";
import { CounterfactualBacktesting } from "@/components/counterfactual-backtesting";
import { apiRequest } from "@/lib/queryClient";
import type { SimulationResult, InsertSimulationScenario, HCPProfile } from "@shared/schema";

export default function Simulations() {
  const [currentResult, setCurrentResult] = useState<SimulationResult | null>(null);
  const [seedHcp, setSeedHcp] = useState<HCPProfile | null>(null);
  const [isSeedCleared, setIsSeedCleared] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchString = useSearch();
  const [, setLocation] = useLocation();

  const { data: history = [], isLoading: historyLoading, isError: historyError, refetch: refetchHistory } = useQuery<SimulationResult[]>({
    queryKey: ["/api/simulations/history"],
  });

  const seedHcpId = new URLSearchParams(searchString).get("seedHcp");
  
  const { data: fetchedSeedHcp } = useQuery<HCPProfile>({
    queryKey: [`/api/hcps/${seedHcpId}`],
    enabled: !!seedHcpId && !isSeedCleared,
  });

  useEffect(() => {
    if (fetchedSeedHcp && !isSeedCleared) {
      setSeedHcp(fetchedSeedHcp);
    }
  }, [fetchedSeedHcp, isSeedCleared]);

  useEffect(() => {
    if (seedHcpId) {
      setIsSeedCleared(false);
    }
  }, [seedHcpId]);

  const clearSeedHcp = () => {
    setSeedHcp(null);
    setIsSeedCleared(true);
    setLocation('/simulations');
  };

  const runSimulation = useMutation({
    mutationFn: async (scenario: InsertSimulationScenario) => {
      const response = await apiRequest("POST", "/api/simulations/run", scenario);
      return response.json() as Promise<SimulationResult>;
    },
    onSuccess: (result) => {
      setCurrentResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/simulations/history"] });
      toast({
        title: "Simulation Complete",
        description: `Predicted ${result.predictedRxLift.toFixed(1)}% Rx lift with ${result.predictedEngagementRate.toFixed(1)}% engagement rate.`,
      });
    },
    onError: () => {
      toast({
        title: "Simulation Failed",
        description: "There was an error running the simulation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold" data-testid="text-page-title">Scenario Lab</h1>
            <p className="text-sm text-muted-foreground">
              Build and run what-if scenarios to optimize engagement
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            <FlaskConical className="h-3.5 w-3.5" />
            {history.length} simulations run
          </Badge>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="builder" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="builder" data-testid="tab-builder">
              Scenario Builder
            </TabsTrigger>
            <TabsTrigger value="counterfactual" data-testid="tab-counterfactual">
              <GitBranch className="h-4 w-4 mr-2" />
              What-If Analysis
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder">
            {seedHcp && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
                <Badge variant="outline" className="text-xs">Seed HCP</Badge>
                <span className="text-sm font-medium">
                  Dr. {seedHcp.firstName} {seedHcp.lastName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {seedHcp.specialty} • {seedHcp.tier}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-6 w-6"
                  onClick={clearSeedHcp}
                  data-testid="button-clear-seed"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <SimulationBuilder
              onRunSimulation={(scenario) => runSimulation.mutate(scenario)}
              isRunning={runSimulation.isPending}
              result={currentResult}
              seedHcp={seedHcp}
            />
          </TabsContent>

          <TabsContent value="counterfactual">
            <CounterfactualBacktesting />
          </TabsContent>

          <TabsContent value="history">
            {historyError ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Alert variant="destructive" className="max-w-md">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Loading History</AlertTitle>
                  <AlertDescription>
                    Failed to load simulation history. Please try again.
                  </AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => refetchHistory()}
                  data-testid="button-retry-history"
                >
                  Try Again
                </Button>
              </div>
            ) : historyLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-48" data-testid={`skeleton-simulation-${i}`} />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 rounded-full bg-muted p-6">
                  <FlaskConical className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No simulations yet</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Build your first campaign scenario to see predicted outcomes and optimize your HCP engagement strategy.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {history.map((result) => (
                  <Card key={result.id} className="hover-elevate" data-testid={`card-simulation-${result.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{result.scenarioName}</CardTitle>
                        <Badge
                          variant={result.vsBaseline.rxLiftDelta >= 0 ? "default" : "secondary"}
                        >
                          {result.vsBaseline.rxLiftDelta >= 0 ? "+" : ""}
                          {result.vsBaseline.rxLiftDelta.toFixed(1)}%
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(result.runAt)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-muted-foreground">Engagement</span>
                          <p className="font-mono font-semibold text-chart-1" data-testid={`text-sim-engagement-${result.id}`}>
                            {result.predictedEngagementRate.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Response</span>
                          <p className="font-mono font-semibold" data-testid={`text-sim-response-${result.id}`}>
                            {result.predictedResponseRate.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Rx Lift</span>
                          <p className="font-mono font-semibold text-chart-2" data-testid={`text-sim-rxlift-${result.id}`}>
                            +{result.predictedRxLift.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Reach</span>
                          <p className="font-mono font-semibold" data-testid={`text-sim-reach-${result.id}`}>
                            {result.predictedReach.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => setCurrentResult(result)}
                          data-testid={`button-view-result-${result.id}`}
                        >
                          View Details
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
