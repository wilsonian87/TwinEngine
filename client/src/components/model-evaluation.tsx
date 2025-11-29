import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Play,
  RefreshCw,
  Info,
  ChevronRight,
  Zap,
  LineChart,
} from "lucide-react";
import type { ModelHealthSummary, ModelEvaluation, StimuliEvent } from "@shared/schema";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

export function ModelEvaluationDashboard() {
  const { toast } = useToast();
  const [selectedPredictionType, setSelectedPredictionType] = useState<string>("stimuli_impact");

  const { data: healthSummary, isLoading: loadingHealth } = useQuery<ModelHealthSummary>({
    queryKey: ["/api/model-health"],
  });

  const { data: evaluations = [], isLoading: loadingEvaluations } = useQuery<ModelEvaluation[]>({
    queryKey: ["/api/model-evaluation"],
  });

  const { data: stimuliEvents = [], isLoading: loadingEvents } = useQuery<StimuliEvent[]>({
    queryKey: ["/api/stimuli"],
  });

  const runEvaluationMutation = useMutation({
    mutationFn: async (predictionType: string) => {
      const response = await apiRequest("POST", "/api/model-evaluation", { predictionType });
      return response.json() as Promise<ModelEvaluation>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/model-evaluation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/model-health"] });
      toast({
        title: "Evaluation Complete",
        description: "Model evaluation has been completed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to run model evaluation",
        variant: "destructive",
      });
    },
  });

  const pendingOutcomes = stimuliEvents.filter(e => e.status === "predicted");

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 85) return "text-green-600 dark:text-green-400";
    if (accuracy >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-yellow-600" />;
    }
  };

  const evaluationChartData = evaluations.slice(0, 10).reverse().map(e => ({
    date: new Date(e.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    mae: e.meanAbsoluteError || 0,
    rmse: e.rootMeanSquaredError || 0,
    ciCoverage: e.ciCoverageRate || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Model Evaluation
          </h2>
          <p className="text-muted-foreground">
            Track prediction accuracy and model performance over time
          </p>
        </div>
        <Button
          onClick={() => runEvaluationMutation.mutate(selectedPredictionType)}
          disabled={runEvaluationMutation.isPending}
          className="gap-2"
          data-testid="button-run-evaluation"
        >
          {runEvaluationMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run Evaluation
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1" data-testid="card-overall-accuracy">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overall Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHealth ? (
              <div className="h-16 animate-pulse bg-muted rounded" />
            ) : (
              <div className="space-y-2">
                <div className={`text-4xl font-bold ${getAccuracyColor(healthSummary?.overallAccuracy || 0)}`} data-testid="text-overall-accuracy">
                  {healthSummary?.overallAccuracy?.toFixed(1) || "--"}%
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {getTrendIcon(healthSummary?.accuracyTrend || "stable")}
                  <span className="capitalize" data-testid="text-accuracy-trend">{healthSummary?.accuracyTrend || "stable"}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1" data-testid="card-mae">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              MAE
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>
                  Mean Absolute Error - average prediction error
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHealth ? (
              <div className="h-16 animate-pulse bg-muted rounded" />
            ) : (
              <div className="space-y-2">
                <div className="text-4xl font-bold" data-testid="text-mae">
                  {healthSummary?.latestMae?.toFixed(2) || "--"}
                </div>
                <div className="text-sm text-muted-foreground">
                  points deviation
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1" data-testid="card-ci-coverage">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              CI Coverage
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>
                  Percentage of actual outcomes within confidence intervals
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHealth ? (
              <div className="h-16 animate-pulse bg-muted rounded" />
            ) : (
              <div className="space-y-2">
                <div className="text-4xl font-bold" data-testid="text-ci-coverage">
                  {healthSummary?.ciCoverageRate?.toFixed(1) || "--"}%
                </div>
                <Progress 
                  value={healthSummary?.ciCoverageRate || 0} 
                  className="h-2"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1" data-testid="card-pending-outcomes">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEvents ? (
              <div className="h-16 animate-pulse bg-muted rounded" />
            ) : (
              <div className="space-y-2">
                <div className="text-4xl font-bold" data-testid="text-pending-count">
                  {pendingOutcomes.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  predictions awaiting feedback
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" data-testid="card-accuracy-trend">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChart className="h-4 w-4" />
              Accuracy Trend
            </CardTitle>
            <CardDescription>
              Model performance over recent evaluations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingEvaluations ? (
              <div className="h-64 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : evaluationChartData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">No evaluations yet</p>
                <p className="text-xs mt-1">Run an evaluation to see accuracy trends</p>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={evaluationChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="mae" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="MAE"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rmse" 
                      stroke="hsl(var(--destructive))" 
                      strokeWidth={2}
                      name="RMSE"
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1" data-testid="card-recommended-actions">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              Recommended Actions
            </CardTitle>
            <CardDescription>
              Actions to improve model accuracy
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHealth ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse bg-muted rounded" />
                ))}
              </div>
            ) : healthSummary?.recommendedActions && healthSummary.recommendedActions.length > 0 ? (
              <ScrollArea className="h-64">
                <div className="space-y-3" data-testid="actions-list">
                  {healthSummary.recommendedActions.map((action, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border bg-card"
                      data-testid={`action-item-${i}`}
                    >
                      <div className="flex items-start gap-2">
                        <Badge
                          variant={
                            action.priority === "high"
                              ? "destructive"
                              : action.priority === "medium"
                              ? "default"
                              : "secondary"
                          }
                          className="capitalize shrink-0"
                          data-testid={`action-priority-${i}`}
                        >
                          {action.priority}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" data-testid={`action-text-${i}`}>{action.action}</p>
                          <p className="text-xs text-muted-foreground mt-1" data-testid={`action-impact-${i}`}>
                            {action.impact}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mb-2 text-green-600 opacity-50" />
                <p className="text-sm">No actions needed</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="card-prediction-breakdown">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              Prediction Type Accuracy
            </CardTitle>
            <CardDescription>
              Performance by prediction category
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHealth ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 animate-pulse bg-muted rounded" />
                ))}
              </div>
            ) : healthSummary?.predictionTypeBreakdown ? (
              <div className="space-y-4" data-testid="prediction-breakdown-list">
                {healthSummary.predictionTypeBreakdown.map((item, i) => (
                  <div key={item.type} className="space-y-2" data-testid={`prediction-type-${item.type}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {item.type.replace("_", " ")}
                      </span>
                      <span className={`text-sm font-mono ${getAccuracyColor(item.accuracy)}`} data-testid={`prediction-accuracy-${item.type}`}>
                        {item.accuracy.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={item.accuracy} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {item.sampleSize} predictions
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-recent-evaluations">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Recent Evaluations
            </CardTitle>
            <CardDescription>
              Historical model evaluation results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingEvaluations ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse bg-muted rounded" />
                ))}
              </div>
            ) : evaluations.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground" data-testid="evaluations-empty">
                <BarChart3 className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No evaluations yet</p>
                <p className="text-xs mt-1">Run your first evaluation above</p>
              </div>
            ) : (
              <ScrollArea className="h-48">
                <div className="space-y-3" data-testid="evaluations-list">
                  {evaluations.slice(0, 10).map((evaluation) => (
                    <div
                      key={evaluation.id}
                      className="p-3 rounded-lg border bg-card"
                      data-testid={`evaluation-item-${evaluation.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {evaluation.predictionType.replace("_", " ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(evaluation.evaluatedAt).toLocaleDateString()} at{" "}
                            {new Date(evaluation.evaluatedAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs" data-testid={`evaluation-mae-${evaluation.id}`}>
                              MAE: {evaluation.meanAbsoluteError?.toFixed(2) || "--"}
                            </Badge>
                            <Badge variant="outline" className="text-xs" data-testid={`evaluation-samples-${evaluation.id}`}>
                              n={evaluation.totalPredictions}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <RecordOutcomeSection events={pendingOutcomes} />
    </div>
  );
}

function RecordOutcomeSection({ events }: { events: StimuliEvent[] }) {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [actualDelta, setActualDelta] = useState("");

  const recordMutation = useMutation({
    mutationFn: async ({ eventId, delta }: { eventId: string; delta: number }) => {
      const response = await apiRequest("POST", `/api/stimuli/${eventId}/outcome`, {
        actualEngagementDelta: delta,
      });
      return response.json() as Promise<StimuliEvent>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stimuli"] });
      queryClient.invalidateQueries({ queryKey: ["/api/model-health"] });
      setSelectedEventId("");
      setActualDelta("");
      toast({
        title: "Outcome Recorded",
        description: "Actual outcome has been recorded for closed-loop learning",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record outcome",
        variant: "destructive",
      });
    },
  });

  const handleRecord = () => {
    if (!selectedEventId || !actualDelta) {
      toast({
        title: "Missing Information",
        description: "Please select an event and enter the actual outcome",
        variant: "destructive",
      });
      return;
    }
    recordMutation.mutate({ eventId: selectedEventId, delta: parseFloat(actualDelta) });
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <Card data-testid="card-record-outcome">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Record Actual Outcomes
        </CardTitle>
        <CardDescription>
          Provide actual engagement changes to train and improve prediction models
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="no-pending-outcomes">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600 opacity-50" />
            <p className="text-sm">All predictions have recorded outcomes</p>
            <p className="text-xs mt-1">Create new predictions to record more outcomes</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <Label>Select Pending Prediction</Label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger data-testid="select-prediction">
                    <SelectValue placeholder="Choose a prediction to update..." />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id} data-testid={`option-prediction-${event.id}`}>
                        {event.stimulusType.replace("_", " ")} via {event.channel} - Predicted: +{event.predictedEngagementDelta?.toFixed(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Actual Engagement Change</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 5.2"
                  value={actualDelta}
                  onChange={(e) => setActualDelta(e.target.value)}
                  data-testid="input-actual-delta"
                />
              </div>
            </div>

            {selectedEvent && (
              <div className="p-4 rounded-lg border bg-muted/50" data-testid="selected-prediction-details">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium capitalize">
                      {selectedEvent.stimulusType.replace("_", " ")} via {selectedEvent.channel}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      HCP ID: {selectedEvent.hcpId}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Predicted</p>
                        <p className="font-mono text-primary" data-testid="text-predicted-delta">
                          +{selectedEvent.predictedEngagementDelta?.toFixed(2)}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Actual</p>
                        <p className="font-mono" data-testid="text-actual-delta-preview">
                          {actualDelta ? `+${parseFloat(actualDelta).toFixed(2)}` : "--"}
                        </p>
                      </div>
                      {actualDelta && selectedEvent.predictedEngagementDelta && (
                        <div>
                          <p className="text-xs text-muted-foreground">Error</p>
                          <p className={`font-mono ${Math.abs(parseFloat(actualDelta) - selectedEvent.predictedEngagementDelta) < 2 ? 'text-green-600' : 'text-yellow-600'}`} data-testid="text-error">
                            {Math.abs(parseFloat(actualDelta) - selectedEvent.predictedEngagementDelta).toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleRecord}
                disabled={!selectedEventId || !actualDelta || recordMutation.isPending}
                className="gap-2"
                data-testid="button-record-outcome"
              >
                {recordMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Record Outcome
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
