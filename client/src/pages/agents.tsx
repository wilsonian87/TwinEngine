import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useToast } from "@/hooks/use-toast";
import {
  Bot,
  Play,
  Square,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Bell,
  RefreshCw,
  Settings2,
  History,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Types
interface Agent {
  type: string;
  name: string;
  description: string;
  version: string;
  stored: {
    id: string;
    lastRunAt?: string;
    lastRunStatus?: string;
  } | null;
}

interface AgentRun {
  id: string;
  agentType: string;
  status: string;
  triggerType: string;
  triggeredBy: string;
  startedAt?: string;
  completedAt?: string;
  executionTimeMs?: number;
  outputs?: {
    alerts?: Array<{ id: string; severity: string; title: string; message: string }>;
    recommendations?: Array<{ id: string; type: string; description: string }>;
  };
  errorMessage?: string;
}

interface Alert {
  id: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

interface SchedulerStatus {
  isRunning: boolean;
  config: {
    enabled: boolean;
    timezone: string;
    maxConcurrentRuns: number;
  };
  jobs: Array<{
    agentType: string;
    cronExpression: string;
    lastRunAt?: string;
    isRunning: boolean;
    runCount: number;
  }>;
  activeRuns: number;
}

export default function AgentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showRunDialog, setShowRunDialog] = useState(false);

  // Fetch agents
  const { data: agents = [], isLoading: agentsLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    queryFn: async () => {
      const response = await fetch("/api/agents");
      if (!response.ok) throw new Error("Failed to fetch agents");
      return response.json();
    },
  });

  // Fetch scheduler status
  const { data: schedulerStatus } = useQuery<SchedulerStatus>({
    queryKey: ["/api/scheduler/status"],
    queryFn: async () => {
      const response = await fetch("/api/scheduler/status");
      if (!response.ok) throw new Error("Failed to fetch scheduler status");
      return response.json();
    },
    refetchInterval: 5000,
  });

  // Fetch alerts
  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    queryFn: async () => {
      const response = await fetch("/api/alerts");
      if (!response.ok) throw new Error("Failed to fetch alerts");
      return response.json();
    },
    refetchInterval: 10000,
  });

  // Fetch alert count
  const { data: alertCount } = useQuery<{ count: number }>({
    queryKey: ["/api/alerts/count"],
    queryFn: async () => {
      const response = await fetch("/api/alerts/count");
      if (!response.ok) throw new Error("Failed to fetch alert count");
      return response.json();
    },
    refetchInterval: 10000,
  });

  // Run agent mutation
  const runAgentMutation = useMutation({
    mutationFn: async (agentType: string) => {
      const response = await fetch(`/api/agents/${agentType}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: {} }),
      });
      if (!response.ok) throw new Error("Failed to run agent");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Agent Run Started",
        description: `Run ID: ${data.runId} - Status: ${data.status}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      setShowRunDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to run agent: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Start scheduler mutation
  const startSchedulerMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/scheduler/start", { method: "POST" });
      if (!response.ok) throw new Error("Failed to start scheduler");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Scheduler Started" });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduler/status"] });
    },
  });

  // Stop scheduler mutation
  const stopSchedulerMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/scheduler/stop", { method: "POST" });
      if (!response.ok) throw new Error("Failed to stop scheduler");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Scheduler Stopped" });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduler/status"] });
    },
  });

  // Acknowledge alert mutation
  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to acknowledge alert");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/count"] });
    },
  });

  // Dismiss alert mutation
  const dismissAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await fetch(`/api/alerts/${alertId}/dismiss`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to dismiss alert");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/count"] });
    },
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "warning":
        return <Badge className="bg-amber-500 hover:bg-amber-600">Warning</Badge>;
      default:
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "running":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Running</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const activeAlerts = alerts.filter((a) => a.status === "active");

  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Agent Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Manage autonomous agents and monitor their activity
            </p>
          </div>
          <div className="flex items-center gap-3">
            {alertCount && alertCount.count > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Bell className="h-3 w-3" />
                {alertCount.count} Active Alerts
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Scheduler Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Scheduler Status</CardTitle>
                <CardDescription>
                  Controls agent scheduling and execution
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {schedulerStatus?.isRunning ? (
                  <>
                    <Badge className="bg-green-500">Running</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => stopSchedulerMutation.mutate()}
                      disabled={stopSchedulerMutation.isPending}
                    >
                      <Square className="h-4 w-4 mr-1" />
                      Stop
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge variant="secondary">Stopped</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startSchedulerMutation.mutate()}
                      disabled={startSchedulerMutation.isPending}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Start
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Active Runs:</span>{" "}
                <span className="font-medium">{schedulerStatus?.activeRuns || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Max Concurrent:</span>{" "}
                <span className="font-medium">{schedulerStatus?.config.maxConcurrentRuns || 3}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Timezone:</span>{" "}
                <span className="font-medium">{schedulerStatus?.config.timezone || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Scheduled Jobs:</span>{" "}
                <span className="font-medium">{schedulerStatus?.jobs.length || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="agents" className="space-y-4">
          <TabsList>
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alerts
              {activeAlerts.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {activeAlerts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Run History
            </TabsTrigger>
          </TabsList>

          {/* Agents Tab */}
          <TabsContent value="agents" className="space-y-4">
            {agentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : agents.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No agents registered
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {agents.map((agent) => {
                  const job = schedulerStatus?.jobs.find((j) => j.agentType === agent.type);
                  return (
                    <Card key={agent.type}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <Bot className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{agent.name}</CardTitle>
                              <CardDescription className="mt-1">
                                {agent.description}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">v{agent.version}</Badge>
                            {agent.stored?.lastRunStatus && getStatusBadge(agent.stored.lastRunStatus)}
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedAgent(agent);
                                setShowRunDialog(true);
                              }}
                              disabled={runAgentMutation.isPending}
                            >
                              {runAgentMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4 mr-1" />
                              )}
                              Run Now
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Type:</span>{" "}
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                              {agent.type}
                            </code>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Schedule:</span>{" "}
                            <span className="font-medium">
                              {job ? job.cronExpression : "Not scheduled"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Last Run:</span>{" "}
                            <span className="font-medium">
                              {agent.stored?.lastRunAt
                                ? formatDistanceToNow(new Date(agent.stored.lastRunAt), { addSuffix: true })
                                : "Never"}
                            </span>
                          </div>
                        </div>
                        {job && (
                          <div className="mt-3 pt-3 border-t flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              {job.isRunning ? (
                                <>
                                  <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                                  <span className="text-blue-500">Running</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">Idle</span>
                                </>
                              )}
                            </div>
                            <div className="text-muted-foreground">
                              Total runs: {job.runCount}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active Alerts</CardTitle>
                <CardDescription>
                  Alerts generated by agent monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No alerts
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Severity</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts.map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{alert.title}</div>
                              <div className="text-sm text-muted-foreground truncate max-w-md">
                                {alert.message}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={alert.status === "active" ? "default" : "secondary"}
                            >
                              {alert.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="text-right">
                            {alert.status === "active" && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                                  disabled={acknowledgeAlertMutation.isPending}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Acknowledge
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => dismissAlertMutation.mutate(alert.id)}
                                  disabled={dismissAlertMutation.isPending}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Dismiss
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <AgentRunHistory />
          </TabsContent>
        </Tabs>
      </div>

      {/* Run Agent Dialog */}
      <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Agent</DialogTitle>
            <DialogDescription>
              This will trigger an on-demand execution of the {selectedAgent?.name} agent.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="flex items-center gap-3">
                <Bot className="h-8 w-8 text-primary" />
                <div>
                  <div className="font-medium">{selectedAgent?.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedAgent?.description}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRunDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedAgent && runAgentMutation.mutate(selectedAgent.type)}
              disabled={runAgentMutation.isPending}
            >
              {runAgentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Agent
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Agent Run History Component
function AgentRunHistory() {
  const [selectedAgentType, setSelectedAgentType] = useState<string>("");

  // Fetch agents for filter
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    queryFn: async () => {
      const response = await fetch("/api/agents");
      if (!response.ok) throw new Error("Failed to fetch agents");
      return response.json();
    },
  });

  // Fetch run history
  const { data: runs = [], isLoading } = useQuery<AgentRun[]>({
    queryKey: ["/api/agents", selectedAgentType, "history"],
    queryFn: async () => {
      const url = selectedAgentType
        ? `/api/agents/${selectedAgentType}/history`
        : "/api/agent-runs?limit=50";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch run history");
      return response.json();
    },
    enabled: !!selectedAgentType || true,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Run History</CardTitle>
            <CardDescription>
              Historical record of agent executions
            </CardDescription>
          </div>
          <select
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
            value={selectedAgentType}
            onChange={(e) => setSelectedAgentType(e.target.value)}
          >
            <option value="">All Agents</option>
            {agents.map((agent) => (
              <option key={agent.type} value={agent.type}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : runs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No runs recorded yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Results</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {run.agentType}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        run.status === "completed"
                          ? "default"
                          : run.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                      className={run.status === "completed" ? "bg-green-500" : ""}
                    >
                      {run.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                      {run.status === "failed" && <XCircle className="h-3 w-3 mr-1" />}
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {run.triggerType}
                    {run.triggeredBy && ` (${run.triggeredBy})`}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {run.executionTimeMs ? `${run.executionTimeMs}ms` : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {run.startedAt
                      ? formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs">
                      {run.outputs?.alerts && run.outputs.alerts.length > 0 && (
                        <Badge variant="outline" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {run.outputs.alerts.length} alerts
                        </Badge>
                      )}
                      {run.outputs?.recommendations && run.outputs.recommendations.length > 0 && (
                        <Badge variant="outline" className="gap-1">
                          {run.outputs.recommendations.length} insights
                        </Badge>
                      )}
                      {run.errorMessage && (
                        <Badge variant="destructive" className="gap-1">
                          Error
                        </Badge>
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
  );
}
