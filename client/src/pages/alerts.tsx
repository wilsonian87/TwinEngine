import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Plus,
  Trash2,
  Edit,
  ToggleLeft,
  ToggleRight,
  Check,
  CheckCheck,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Filter,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertRuleDialog } from "@/components/alerts/AlertRuleDialog";
import { AlertEventCard } from "@/components/alerts/AlertEventCard";
import { ThreatIndicator } from "@/components/viz/threat-indicator";

// ============================================================================
// TYPES
// ============================================================================

interface AlertRule {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  metric: string;
  operator: string;
  threshold: number;
  scope: Record<string, unknown> | null;
  channels: string[] | null;
  frequency: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt: string | null;
  lastEvaluatedAt: string | null;
}

interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName?: string;
  triggeredAt: string;
  hcpCount: number;
  hcpIds: string[];
  metricValues: Record<string, number>;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
}

interface RulesResponse {
  rules: AlertRule[];
  total: number;
}

interface EventsResponse {
  events: AlertEvent[];
  total: number;
}

// ============================================================================
// HELPERS
// ============================================================================

const metricLabels: Record<string, string> = {
  engagement_score: "Engagement Score",
  rx_volume: "Rx Volume",
  market_share: "Market Share",
  churn_risk: "Churn Risk",
  conversion_likelihood: "Conversion Likelihood",
  cpi: "Competitive Pressure Index",
  msi: "Message Saturation Index",
  response_rate: "Response Rate",
};

const operatorLabels: Record<string, string> = {
  ">": "greater than",
  "<": "less than",
  ">=": "at least",
  "<=": "at most",
  "=": "equals",
};

const frequencyLabels: Record<string, string> = {
  realtime: "Real-time",
  daily: "Daily",
  weekly: "Weekly",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function mapSeverity(event: AlertEvent): 1 | 2 | 3 | 4 | 5 {
  if (event.acknowledged) return 1;
  if (event.hcpCount >= 50) return 5;
  if (event.hcpCount >= 20) return 4;
  if (event.hcpCount >= 5) return 3;
  return 2;
}

function getRuleDescription(rule: AlertRule): string {
  const metric = metricLabels[rule.metric] || rule.metric;
  const op = operatorLabels[rule.operator] || rule.operator;
  return `${metric} ${op} ${rule.threshold}`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AlertsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch rules
  const {
    data: rulesData,
    isLoading: rulesLoading,
    isError: rulesError,
    refetch: refetchRules,
  } = useQuery<RulesResponse>({
    queryKey: ["/api/alerts/rules"],
  });

  // Fetch events
  const {
    data: eventsData,
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
  } = useQuery<EventsResponse>({
    queryKey: ["/api/alerts/events"],
  });

  // Fetch unacknowledged count
  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/alerts/events/count"],
  });

  // Toggle rule mutation
  const toggleRule = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await apiRequest("POST", `/api/alerts/rules/${id}/toggle`, { enabled });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/rules"] });
      toast({ title: "Rule updated" });
    },
    onError: () => {
      toast({ title: "Failed to update rule", variant: "destructive" });
    },
  });

  // Delete rule mutation
  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/alerts/rules/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/rules"] });
      toast({ title: "Rule deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete rule", variant: "destructive" });
    },
  });

  // Acknowledge event mutation
  const acknowledgeEvent = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/alerts/events/${id}/acknowledge`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/events/count"] });
    },
  });

  // Acknowledge all mutation
  const acknowledgeAll = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/alerts/events/acknowledge-all");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/events/count"] });
      toast({ title: `${data.acknowledged} alerts acknowledged` });
    },
  });

  // Manual evaluate mutation
  const evaluateAlerts = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/alerts/evaluate");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/events/count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/rules"] });
      toast({
        title: "Evaluation complete",
        description: `${data.rulesEvaluated} rules evaluated, ${data.alertsTriggered} alerts triggered`,
      });
    },
    onError: () => {
      toast({ title: "Evaluation failed", variant: "destructive" });
    },
  });

  const rules = rulesData?.rules || [];
  const events = eventsData?.events || [];
  const unacknowledgedCount = countData?.count || 0;

  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alert Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure threshold alerts and view triggered notifications
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => evaluateAlerts.mutate()}
              disabled={evaluateAlerts.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${evaluateAlerts.isPending ? "animate-spin" : ""}`} />
              Evaluate Now
            </Button>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Rule
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="events" className="space-y-6">
          <TabsList>
            <TabsTrigger value="events" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alerts
              {unacknowledgedCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {unacknowledgedCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2">
              <Filter className="h-4 w-4" />
              Rules ({rules.length})
            </TabsTrigger>
          </TabsList>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            {eventsError ? (
              <ErrorState
                title="Unable to load alerts"
                message="Failed to fetch alert events"
                type="server"
                retry={() => refetchEvents()}
              />
            ) : eventsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No alerts triggered</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create rules to start monitoring HCP metrics
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {unacknowledgedCount > 0 && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => acknowledgeAll.mutate()}
                      disabled={acknowledgeAll.isPending}
                    >
                      <CheckCheck className="h-4 w-4 mr-2" />
                      Acknowledge All ({unacknowledgedCount})
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-4 mb-4 p-3 rounded-lg border bg-card">
                  {([5, 4, 3, 2, 1] as const).map((level) => {
                    const count = events.filter((e) => mapSeverity(e) === level).length;
                    if (count === 0) return null;
                    return (
                      <div key={level} className="flex items-center gap-2">
                        <ThreatIndicator level={level} compact />
                        <span className="text-xs tabular-nums">{count}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-3">
                  {events.map((event) => (
                    <AlertEventCard
                      key={event.id}
                      event={event}
                      onAcknowledge={() => acknowledgeEvent.mutate(event.id)}
                      isAcknowledging={acknowledgeEvent.isPending}
                    />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-4">
            {rulesError ? (
              <ErrorState
                title="Unable to load rules"
                message="Failed to fetch alert rules"
                type="server"
                retry={() => refetchRules()}
              />
            ) : rulesLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : rules.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No alert rules configured</p>
                  <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Rule
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {rules.map((rule) => (
                  <Card key={rule.id} className={!rule.enabled ? "opacity-60" : ""}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base flex items-center gap-2">
                            {rule.name}
                            {!rule.enabled && (
                              <Badge variant="secondary" className="text-xs">
                                Disabled
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {getRuleDescription(rule)}
                          </CardDescription>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleRule.mutate({ id: rule.id, enabled: !rule.enabled })}
                          >
                            {rule.enabled ? (
                              <ToggleRight className="h-4 w-4 text-green-500" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingRule(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("Delete this rule?")) {
                                deleteRule.mutate(rule.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">
                          {frequencyLabels[rule.frequency] || rule.frequency}
                        </Badge>
                        {rule.channels?.map((ch) => (
                          <Badge key={ch} variant="secondary" className="text-xs">
                            {ch}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {rule.lastTriggeredAt && (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Last triggered: {formatDate(rule.lastTriggeredAt)}
                          </div>
                        )}
                        {rule.lastEvaluatedAt && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Evaluated: {formatDate(rule.lastEvaluatedAt)}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Dialog */}
      <AlertRuleDialog
        open={isCreateOpen || !!editingRule}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingRule(null);
        }}
        rule={editingRule}
      />
    </div>
  );
}
