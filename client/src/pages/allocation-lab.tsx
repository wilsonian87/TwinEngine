import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Target,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Plus,
  RefreshCw,
  Loader2,
  Beaker,
  TrendingUp,
  DollarSign,
  Users,
  Zap,
  BarChart3,
  FileDown,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

// Types
interface OptimizationProblem {
  id: string;
  name: string;
  description: string | null;
  audienceId: string | null;
  audienceName: string | null;
  campaignId: string | null;
  campaignName: string | null;
  hcpCount: number;
  objectiveMetric: string;
  objectiveSense: string;
  budgetLimit: number | null;
  explorationBudgetPct: number | null;
  planningHorizonDays: number;
  preferredSolver: string | null;
  status: "draft" | "ready" | "solving" | "solved" | "failed" | "archived";
  createdAt: string;
  updatedAt: string;
}

interface OptimizationResult {
  id: string;
  problemId: string;
  problemName: string;
  solverType: string;
  objectiveValue: number;
  feasible: boolean;
  optimalityGap: number | null;
  totalActions: number;
  totalHcps: number;
  actionsByChannel: Record<string, number>;
  totalBudgetUsed: number | null;
  budgetUtilization: number | null;
  predictedTotalLift: number | null;
  predictedEngagementRate: number | null;
  predictedResponseRate: number | null;
  explorationActions: number | null;
  explorationBudgetUsed: number | null;
  constraintViolations: Array<{
    constraintType: string;
    severity: "warning" | "error";
    message: string;
  }>;
  solveTimeMs: number | null;
  iterations: number | null;
  solvedAt: string;
}

interface OptimizationAllocation {
  id: string;
  resultId: string;
  hcpId: string;
  hcpName: string;
  channel: string;
  actionType: string;
  plannedDate: string;
  windowStart: string | null;
  windowEnd: string | null;
  predictedLift: number;
  confidence: number;
  isExploration: boolean;
  estimatedCost: number | null;
  status: string;
  executedAt: string | null;
  actualOutcome: number | null;
  selectionReason: string | null;
  priority: number;
}

interface ExecutionPlan {
  id: string;
  resultId: string;
  name: string;
  description: string | null;
  status: "draft" | "scheduled" | "executing" | "paused" | "completed" | "cancelled";
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  totalActions: number;
  completedActions: number;
  failedActions: number;
  progressPercent: number;
  budgetAllocated: number | null;
  budgetSpent: number | null;
  actualTotalLift: number | null;
  actualEngagementRate: number | null;
  rebalanceCount: number;
  createdAt: string;
  updatedAt: string;
}

const OBJECTIVE_METRICS = [
  { value: "total_engagement_lift", label: "Total Engagement Lift" },
  { value: "roi", label: "ROI" },
  { value: "reach", label: "Reach" },
  { value: "response_rate", label: "Response Rate" },
  { value: "rx_lift", label: "Rx Lift" },
];

const SOLVER_TYPES = [
  { value: "greedy", label: "Greedy (Fast)" },
  { value: "local_search", label: "Local Search (Better)" },
  { value: "simulated_annealing", label: "Simulated Annealing (Best)" },
  { value: "genetic", label: "Genetic Algorithm" },
];

export default function AllocationLabPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("problems");
  const [showNewProblemDialog, setShowNewProblemDialog] = useState(false);
  const [showNewPlanDialog, setShowNewPlanDialog] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<OptimizationProblem | null>(null);
  const [selectedResult, setSelectedResult] = useState<OptimizationResult | null>(null);

  // Form state
  const [newProblemName, setNewProblemName] = useState("");
  const [newProblemDescription, setNewProblemDescription] = useState("");
  const [newProblemObjective, setNewProblemObjective] = useState("total_engagement_lift");
  const [newProblemBudget, setNewProblemBudget] = useState("");
  const [newProblemHorizon, setNewProblemHorizon] = useState("30");
  const [newProblemSolver, setNewProblemSolver] = useState("greedy");
  const [newProblemExploration, setNewProblemExploration] = useState("10");

  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanDescription, setNewPlanDescription] = useState("");

  // Fetch problems
  const { data: problems = [], isLoading: problemsLoading } = useQuery<OptimizationProblem[]>({
    queryKey: ["/api/optimization/problems"],
  });

  // Fetch execution plans
  const { data: plans = [], isLoading: plansLoading } = useQuery<ExecutionPlan[]>({
    queryKey: ["/api/execution-plans"],
  });

  // Fetch allocations for selected result
  const { data: allocations = [] } = useQuery<OptimizationAllocation[]>({
    queryKey: ["/api/optimization/results", selectedResult?.id, "allocations"],
    queryFn: async () => {
      if (!selectedResult) return [];
      const res = await fetch(`/api/optimization/results/${selectedResult.id}/allocations?limit=100`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch allocations");
      return res.json();
    },
    enabled: !!selectedResult,
  });

  // Create problem mutation
  const createProblemMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/optimization/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProblemName,
          description: newProblemDescription || undefined,
          objectiveMetric: newProblemObjective,
          budgetLimit: newProblemBudget ? parseFloat(newProblemBudget) : undefined,
          planningHorizonDays: parseInt(newProblemHorizon, 10),
          preferredSolver: newProblemSolver,
          explorationBudgetPct: parseFloat(newProblemExploration),
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create problem");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/optimization/problems"] });
      setShowNewProblemDialog(false);
      resetProblemForm();
      toast({ title: "Optimization problem created" });
    },
    onError: () => {
      toast({ title: "Failed to create problem", variant: "destructive" });
    },
  });

  // Solve problem mutation
  const solveProblemMutation = useMutation({
    mutationFn: async (problemId: string) => {
      const res = await fetch(`/api/optimization/problems/${problemId}/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to solve problem");
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/optimization/problems"] });
      setSelectedResult(result);
      toast({ title: "Optimization complete", description: `Found ${result.totalActions} optimal allocations` });
    },
    onError: () => {
      toast({ title: "Optimization failed", variant: "destructive" });
    },
  });

  // Create execution plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async () => {
      if (!selectedResult) throw new Error("No result selected");
      const res = await fetch("/api/execution-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultId: selectedResult.id,
          name: newPlanName,
          description: newPlanDescription || undefined,
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create execution plan");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/execution-plans"] });
      setShowNewPlanDialog(false);
      setNewPlanName("");
      setNewPlanDescription("");
      toast({ title: "Execution plan created" });
    },
    onError: () => {
      toast({ title: "Failed to create execution plan", variant: "destructive" });
    },
  });

  // Execute plan mutation
  const executePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch(`/api/execution-plans/${planId}/execute`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to execute plan");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/execution-plans"] });
      toast({ title: "Plan execution started" });
    },
    onError: () => {
      toast({ title: "Failed to execute plan", variant: "destructive" });
    },
  });

  // Pause plan mutation
  const pausePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch(`/api/execution-plans/${planId}/pause`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to pause plan");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/execution-plans"] });
      toast({ title: "Plan paused" });
    },
    onError: () => {
      toast({ title: "Failed to pause plan", variant: "destructive" });
    },
  });

  // Book resources mutation
  const bookResourcesMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch(`/api/execution-plans/${planId}/book`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to book resources");
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/execution-plans"] });
      toast({
        title: "Resources booked",
        description: `Booked ${result.bookedCount} actions, ${result.failedCount} failed`,
      });
    },
    onError: () => {
      toast({ title: "Failed to book resources", variant: "destructive" });
    },
  });

  const resetProblemForm = () => {
    setNewProblemName("");
    setNewProblemDescription("");
    setNewProblemObjective("total_engagement_lift");
    setNewProblemBudget("");
    setNewProblemHorizon("30");
    setNewProblemSolver("greedy");
    setNewProblemExploration("10");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      draft: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
      ready: { variant: "outline", icon: <Target className="h-3 w-3" /> },
      solving: { variant: "default", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
      solved: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      failed: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
      scheduled: { variant: "outline", icon: <Clock className="h-3 w-3" /> },
      executing: { variant: "default", icon: <Play className="h-3 w-3" /> },
      paused: { variant: "secondary", icon: <Pause className="h-3 w-3" /> },
      completed: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      cancelled: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
    };
    const config = variants[status] || { variant: "secondary", icon: null };
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {status}
      </Badge>
    );
  };

  const formatNumber = (n: number | null | undefined) => {
    if (n == null) return "-";
    return n.toLocaleString();
  };

  const formatPercent = (n: number | null | undefined) => {
    if (n == null) return "-";
    return `${(n * 100).toFixed(1)}%`;
  };

  const formatCurrency = (n: number | null | undefined) => {
    if (n == null) return "-";
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <ScrollArea className="h-full">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Beaker className="h-8 w-8" />
              Allocation Lab
            </h1>
            <p className="text-muted-foreground">
              Optimize HCP engagement portfolios with constraint-aware allocation
            </p>
          </div>
          <Button onClick={() => setShowNewProblemDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Problem
          </Button>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="problems">Optimization Problems</TabsTrigger>
            <TabsTrigger value="results">Results & Allocations</TabsTrigger>
            <TabsTrigger value="execution">Execution Plans</TabsTrigger>
          </TabsList>

          {/* Problems Tab */}
          <TabsContent value="problems" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Optimization Problems</CardTitle>
                <CardDescription>
                  Define objectives and constraints for portfolio optimization
                </CardDescription>
              </CardHeader>
              <CardContent>
                {problemsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : problems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No optimization problems yet. Create one to get started.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Objective</TableHead>
                        <TableHead>Budget</TableHead>
                        <TableHead>Horizon</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {problems.map((problem) => (
                        <TableRow key={problem.id}>
                          <TableCell className="font-medium">{problem.name}</TableCell>
                          <TableCell>{problem.objectiveMetric.replace(/_/g, " ")}</TableCell>
                          <TableCell>{formatCurrency(problem.budgetLimit)}</TableCell>
                          <TableCell>{problem.planningHorizonDays} days</TableCell>
                          <TableCell>{getStatusBadge(problem.status)}</TableCell>
                          <TableCell>{formatDistanceToNow(new Date(problem.createdAt), { addSuffix: true })}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {problem.status === "draft" && (
                                <Button
                                  size="sm"
                                  onClick={() => solveProblemMutation.mutate(problem.id)}
                                  disabled={solveProblemMutation.isPending}
                                >
                                  {solveProblemMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              {problem.status === "solved" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedProblem(problem);
                                    // Fetch result for this problem
                                  }}
                                >
                                  <BarChart3 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-4">
            {selectedResult ? (
              <>
                {/* Result Summary */}
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatNumber(selectedResult.totalActions)}</div>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(selectedResult.totalHcps)} HCPs
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Predicted Lift
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold flex items-center gap-1">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        {formatPercent(selectedResult.predictedTotalLift)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Objective: {selectedResult.objectiveValue.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Budget Used
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(selectedResult.totalBudgetUsed)}</div>
                      <p className="text-xs text-muted-foreground">
                        {formatPercent(selectedResult.budgetUtilization)} utilization
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Exploration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatNumber(selectedResult.explorationActions)}</div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(selectedResult.explorationBudgetUsed)} allocated
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Channel Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Channel Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-6 gap-4">
                      {Object.entries(selectedResult.actionsByChannel).map(([channel, count]) => (
                        <div key={channel} className="text-center">
                          <div className="text-lg font-bold">{count}</div>
                          <div className="text-xs text-muted-foreground">{channel}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Allocations Table */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Allocations</CardTitle>
                      <CardDescription>Individual HCP-channel assignments</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowNewPlanDialog(true)}>
                        <Zap className="h-4 w-4 mr-2" />
                        Create Execution Plan
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileDown className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>HCP</TableHead>
                          <TableHead>Channel</TableHead>
                          <TableHead>Predicted Lift</TableHead>
                          <TableHead>Confidence</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allocations.map((alloc) => (
                          <TableRow key={alloc.id}>
                            <TableCell className="font-medium">{alloc.hcpName}</TableCell>
                            <TableCell>{alloc.channel}</TableCell>
                            <TableCell>{formatPercent(alloc.predictedLift)}</TableCell>
                            <TableCell>{formatPercent(alloc.confidence)}</TableCell>
                            <TableCell>{formatCurrency(alloc.estimatedCost)}</TableCell>
                            <TableCell>
                              {alloc.isExploration ? (
                                <Badge variant="outline">Explore</Badge>
                              ) : (
                                <Badge>Exploit</Badge>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(alloc.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Constraint Violations */}
                {selectedResult.constraintViolations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Constraint Violations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedResult.constraintViolations.map((violation, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted">
                            <Badge variant={violation.severity === "error" ? "destructive" : "outline"}>
                              {violation.severity}
                            </Badge>
                            <span className="text-sm">{violation.message}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Solve an optimization problem to view results and allocations
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Execution Tab */}
          <TabsContent value="execution" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Execution Plans</CardTitle>
                <CardDescription>
                  Manage and monitor optimization plan execution
                </CardDescription>
              </CardHeader>
              <CardContent>
                {plansLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : plans.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No execution plans yet. Create one from an optimization result.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Budget</TableHead>
                        <TableHead>Rebalances</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell className="font-medium">{plan.name}</TableCell>
                          <TableCell>{getStatusBadge(plan.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={plan.progressPercent} className="w-20" />
                              <span className="text-sm text-muted-foreground">
                                {plan.completedActions}/{plan.totalActions}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{formatCurrency(plan.budgetSpent)} spent</div>
                              <div className="text-muted-foreground">
                                of {formatCurrency(plan.budgetAllocated)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{plan.rebalanceCount}</TableCell>
                          <TableCell>{formatDistanceToNow(new Date(plan.createdAt), { addSuffix: true })}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {plan.status === "draft" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => bookResourcesMutation.mutate(plan.id)}
                                  disabled={bookResourcesMutation.isPending}
                                >
                                  Book
                                </Button>
                              )}
                              {plan.status === "scheduled" && (
                                <Button
                                  size="sm"
                                  onClick={() => executePlanMutation.mutate(plan.id)}
                                  disabled={executePlanMutation.isPending}
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                              {plan.status === "executing" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => pausePlanMutation.mutate(plan.id)}
                                  disabled={pausePlanMutation.isPending}
                                >
                                  <Pause className="h-4 w-4" />
                                </Button>
                              )}
                              {plan.status === "paused" && (
                                <Button
                                  size="sm"
                                  onClick={() => executePlanMutation.mutate(plan.id)}
                                  disabled={executePlanMutation.isPending}
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* New Problem Dialog */}
        <Dialog open={showNewProblemDialog} onOpenChange={setShowNewProblemDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Optimization Problem</DialogTitle>
              <DialogDescription>
                Define objectives and constraints for portfolio optimization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="problem-name">Name</Label>
                <Input
                  id="problem-name"
                  value={newProblemName}
                  onChange={(e) => setNewProblemName(e.target.value)}
                  placeholder="Q1 2025 Engagement Optimization"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="problem-description">Description</Label>
                <Input
                  id="problem-description"
                  value={newProblemDescription}
                  onChange={(e) => setNewProblemDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div className="space-y-2">
                <Label>Objective Metric</Label>
                <Select value={newProblemObjective} onValueChange={setNewProblemObjective}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OBJECTIVE_METRICS.map((metric) => (
                      <SelectItem key={metric.value} value={metric.value}>
                        {metric.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="problem-budget">Budget Limit ($)</Label>
                  <Input
                    id="problem-budget"
                    type="number"
                    value={newProblemBudget}
                    onChange={(e) => setNewProblemBudget(e.target.value)}
                    placeholder="10000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="problem-horizon">Horizon (days)</Label>
                  <Input
                    id="problem-horizon"
                    type="number"
                    value={newProblemHorizon}
                    onChange={(e) => setNewProblemHorizon(e.target.value)}
                    placeholder="30"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Solver</Label>
                  <Select value={newProblemSolver} onValueChange={setNewProblemSolver}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOLVER_TYPES.map((solver) => (
                        <SelectItem key={solver.value} value={solver.value}>
                          {solver.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="problem-exploration">Exploration %</Label>
                  <Input
                    id="problem-exploration"
                    type="number"
                    value={newProblemExploration}
                    onChange={(e) => setNewProblemExploration(e.target.value)}
                    placeholder="10"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewProblemDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createProblemMutation.mutate()}
                disabled={!newProblemName || createProblemMutation.isPending}
              >
                {createProblemMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Create Problem
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Execution Plan Dialog */}
        <Dialog open={showNewPlanDialog} onOpenChange={setShowNewPlanDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Execution Plan</DialogTitle>
              <DialogDescription>
                Create a plan to execute the optimization allocations
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plan-name">Name</Label>
                <Input
                  id="plan-name"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="Q1 Execution Plan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-description">Description</Label>
                <Input
                  id="plan-description"
                  value={newPlanDescription}
                  onChange={(e) => setNewPlanDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewPlanDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createPlanMutation.mutate()}
                disabled={!newPlanName || createPlanMutation.isPending}
              >
                {createPlanMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Create Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}
