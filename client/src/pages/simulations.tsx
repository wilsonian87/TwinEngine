import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import { FlaskConical, Clock, ArrowRight, AlertCircle, X, GitBranch, Users } from "lucide-react";
import { SignalCard, SignalCardContent, SignalCardHeader } from "@/components/ui/signal-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { SimulationBuilder } from "@/components/simulation-builder";
import { CounterfactualBacktesting } from "@/components/counterfactual-backtesting";
import { apiRequest } from "@/lib/queryClient";
import type { SimulationResult, InsertSimulationScenario, HCPProfile, SavedAudience } from "@shared/schema";

export default function Simulations() {
  const [currentResult, setCurrentResult] = useState<SimulationResult | null>(null);
  const [seedHcp, setSeedHcp] = useState<HCPProfile | null>(null);
  const [isSeedCleared, setIsSeedCleared] = useState(false);
  const [initialAudience, setInitialAudience] = useState<SavedAudience | null>(null);
  const [isAudienceCleared, setIsAudienceCleared] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchString = useSearch();
  const [, setLocation] = useLocation();

  const { data: history = [], isLoading: historyLoading, isError: historyError, refetch: refetchHistory } = useQuery<SimulationResult[]>({
    queryKey: ["/api/simulations/history"],
  });

  // Phase 13.4: Read URL params for context
  const params = new URLSearchParams(searchString);
  const seedHcpId = params.get("seedHcp");
  const audienceId = params.get("audience");

  const { data: fetchedSeedHcp } = useQuery<HCPProfile>({
    queryKey: [`/api/hcps/${seedHcpId}`],
    enabled: !!seedHcpId && !isSeedCleared,
  });

  // Phase 13.4: Fetch audience if provided in URL
  const { data: fetchedAudience } = useQuery<SavedAudience>({
    queryKey: [`/api/audiences/${audienceId}`],
    queryFn: async () => {
      const response = await fetch(`/api/audiences/${audienceId}`);
      if (!response.ok) throw new Error("Failed to fetch audience");
      return response.json();
    },
    enabled: !!audienceId && !isAudienceCleared,
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

  // Phase 13.4: Set initial audience from URL
  useEffect(() => {
    if (fetchedAudience && !isAudienceCleared) {
      setInitialAudience(fetchedAudience);
    }
  }, [fetchedAudience, isAudienceCleared]);

  useEffect(() => {
    if (audienceId) {
      setIsAudienceCleared(false);
    }
  }, [audienceId]);

  const clearSeedHcp = () => {
    setSeedHcp(null);
    setIsSeedCleared(true);
    // Clear only seedHcp param, keep audience if present
    const newParams = new URLSearchParams(searchString);
    newParams.delete("seedHcp");
    setLocation(newParams.toString() ? `/simulations?${newParams}` : '/simulations');
  };

  const clearAudience = () => {
    setInitialAudience(null);
    setIsAudienceCleared(true);
    // Clear only audience param, keep seedHcp if present
    const newParams = new URLSearchParams(searchString);
    newParams.delete("audience");
    setLocation(newParams.toString() ? `/simulations?${newParams}` : '/simulations');
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
        title: "Scenario Complete",
        description: `Predicted ${result.predictedRxLift.toFixed(1)}% Rx lift with ${result.predictedEngagementRate.toFixed(1)}% signal strength.`,
      });
    },
    onError: () => {
      toast({
        title: "Connection Interrupted",
        description: "Scenario computation failed. Retry with adjusted parameters.",
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
            <h1 className="text-lg font-semibold" data-testid="text-page-title">Simulation Studio</h1>
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
            {/* Phase 13.4: Context banners for seed HCP and audience */}
            <div className="space-y-3 mb-4">
              {seedHcp && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
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
              {initialAudience && (
                <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                    <Users className="h-3 w-3 mr-1" />
                    Audience
                  </Badge>
                  <span className="text-sm font-medium">
                    {initialAudience.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {initialAudience.hcpCount.toLocaleString()} HCPs
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-6 w-6"
                    onClick={clearAudience}
                    data-testid="button-clear-audience"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <SimulationBuilder
              onRunSimulation={(scenario) => runSimulation.mutate(scenario)}
              isRunning={runSimulation.isPending}
              result={currentResult}
              seedHcp={seedHcp}
              initialAudience={initialAudience}
              onNavigateToActions={(simulationId) => setLocation(`/action-queue?simulation=${simulationId}`)}
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
                <h3 className="text-lg font-semibold">No simulations run yet.</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Build your first scenario to predict outcomes and optimize engagement signals.
                </p>
                {/* Phase 13.5: Forward action to builder tab */}
                <Button
                  variant="default"
                  className="mt-4"
                  onClick={() => {
                    const builderTab = document.querySelector('[data-testid="tab-builder"]') as HTMLButtonElement;
                    builderTab?.click();
                  }}
                  data-testid="button-create-first-simulation"
                >
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Create Your First Simulation
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {history.map((result) => (
                  <SignalCard
                    key={result.id}
                    variant="default"
                    glowOnHover
                    liftOnHover
                    clickable
                    className="cursor-pointer"
                    onClick={() => setCurrentResult(result)}
                    data-testid={`card-simulation-${result.id}`}
                  >
                    <SignalCardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold text-foreground">{result.scenarioName}</h3>
                        <Badge
                          variant={result.vsBaseline.rxLiftDelta >= 0 ? "default" : "secondary"}
                          className={result.vsBaseline.rxLiftDelta >= 0 ? "bg-emerald-500/20 text-emerald-400 border-0" : ""}
                        >
                          {result.vsBaseline.rxLiftDelta >= 0 ? "+" : ""}
                          {result.vsBaseline.rxLiftDelta.toFixed(1)}%
                        </Badge>
                      </div>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(result.runAt)}
                      </p>
                    </SignalCardHeader>
                    <SignalCardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-gray, #52525b)" }}>Signal</span>
                          <p className="font-mono text-lg font-bold" style={{ color: "var(--process-violet, #a855f7)" }} data-testid={`text-sim-engagement-${result.id}`}>
                            {result.predictedEngagementRate.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-gray, #52525b)" }}>Response</span>
                          <p className="font-mono text-lg font-bold text-foreground" data-testid={`text-sim-response-${result.id}`}>
                            {result.predictedResponseRate.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-gray, #52525b)" }}>Rx Lift</span>
                          <p className="font-mono text-lg font-bold" style={{ color: "var(--catalyst-gold, #d97706)" }} data-testid={`text-sim-rxlift-${result.id}`}>
                            +{result.predictedRxLift.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-gray, #52525b)" }}>Reach</span>
                          <p className="font-mono text-lg font-bold text-foreground" data-testid={`text-sim-reach-${result.id}`}>
                            {result.predictedReach.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-border/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs hover:text-purple-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentResult(result);
                          }}
                          data-testid={`button-view-result-${result.id}`}
                        >
                          View Details
                          <ArrowRight className="ml-2 h-3 w-3" />
                        </Button>
                      </div>
                    </SignalCardContent>
                  </SignalCard>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
