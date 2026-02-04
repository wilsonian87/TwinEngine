/**
 * InsightRx Status Component
 *
 * Displays the status of InsightRx services including validation,
 * knowledge base, and system health metrics.
 */

import {
  Shield,
  BookOpen,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Loader2,
  TrendingUp,
  Clock,
  Database,
  Cpu,
  Server,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSystemHealth, useMetrics } from "@/hooks/use-observability";
import { useValidationStats, useValidationHealth } from "@/hooks/use-validation";
import { useKnowledgeStats } from "@/hooks/use-knowledge";
import { useInsightRxFlags, useAllFeatureFlags, INSIGHTRX_FLAGS } from "@/hooks/use-feature-flags";

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatusIndicator({ status }: { status: "healthy" | "degraded" | "error" | "initializing" }) {
  const config = {
    healthy: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-500" },
    degraded: { icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-500" },
    error: { icon: XCircle, color: "text-red-600", bg: "bg-red-500" },
    initializing: { icon: Clock, color: "text-blue-600", bg: "bg-blue-500" },
  };

  const { icon: Icon, color, bg } = config[status];

  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-2 w-2 rounded-full animate-pulse", bg)} />
      <Icon className={cn("h-4 w-4", color)} />
      <span className="text-sm font-medium capitalize">{status}</span>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof Activity;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {trend && (
          <TrendingUp
            className={cn(
              "h-4 w-4",
              trend === "up" && "text-green-600",
              trend === "down" && "text-red-600 rotate-180",
              trend === "neutral" && "text-muted-foreground"
            )}
          />
        )}
      </div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InsightRxStatus() {
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useSystemHealth();
  const { data: metrics, isLoading: metricsLoading } = useMetrics("json");
  const { data: validationStats, isLoading: validationStatsLoading } = useValidationStats();
  const { data: validationHealth } = useValidationHealth();
  const { data: knowledgeStats, isLoading: knowledgeStatsLoading } = useKnowledgeStats();
  const { flags, isLoading: flagsLoading } = useInsightRxFlags();
  const { flags: allFlags, isLoading: allFlagsLoading } = useAllFeatureFlags();

  const isLoading = healthLoading || metricsLoading || validationStatsLoading || knowledgeStatsLoading || flagsLoading || allFlagsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const validationEnabled = flags?.[INSIGHTRX_FLAGS.VALIDATION] ?? false;
  const knowledgeEnabled = flags?.[INSIGHTRX_FLAGS.KNOWLEDGE] ?? false;

  // Parse metrics if available
  const metricsData = metrics as Record<string, { values: Record<string, number> }> | undefined;
  const httpRequests = metricsData?.http_requests_total?.values?._default ?? 0;
  const validationRequests = metricsData?.validation_requests_total?.values?._default ?? 0;

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>InsightRx Services</CardTitle>
                <CardDescription>Content validation and knowledge base status</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchHealth()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Service Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Validation Service */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-medium">Validation</span>
                </div>
                <Badge variant={validationEnabled ? "default" : "secondary"}>
                  {validationEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              {validationEnabled && validationHealth && (
                <>
                  <StatusIndicator
                    status={validationHealth.status === "healthy" ? "healthy" : "degraded"}
                  />
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Rules Version</span>
                      <span className="font-mono">{validationHealth.rulesVersion}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Available Rules</span>
                      <span>{validationHealth.availableRules}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Circuit</span>
                      <Badge
                        variant={validationHealth.circuit === "closed" ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {validationHealth.circuit}
                      </Badge>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Knowledge Service */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span className="font-medium">Knowledge Base</span>
                </div>
                <Badge variant={knowledgeEnabled ? "default" : "secondary"}>
                  {knowledgeEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              {knowledgeEnabled && knowledgeStats && (
                <>
                  <StatusIndicator status="healthy" />
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Items</span>
                      <span>{knowledgeStats.totalItems}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">With Embeddings</span>
                      <span>{knowledgeStats.withEmbeddings}</span>
                    </div>
                  </div>
                </>
              )}
              {knowledgeEnabled && health?.services?.embedding && (
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Embedding Model</span>
                  <Badge
                    variant={health.services.embedding.status === "ready" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {health.services.embedding.status}
                  </Badge>
                </div>
              )}
            </div>

            {/* System Health */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  <span className="font-medium">System</span>
                </div>
              </div>
              {health && (
                <>
                  <StatusIndicator status={health.status} />
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Uptime</span>
                      <span>{formatUptime(health.uptime)}</span>
                    </div>
                    {health.memory && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Memory</span>
                          <span>{formatBytes(health.memory.heapUsed)}</span>
                        </div>
                        <Progress
                          value={(health.memory.heapUsed / health.memory.heapTotal) * 100}
                          className="h-1"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Validation Stats */}
          {validationStats && (
            <div>
              <h4 className="text-sm font-medium mb-3">Validation Statistics</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <MetricCard
                  title="Total"
                  value={validationStats.total}
                  icon={Shield}
                />
                <MetricCard
                  title="Approved"
                  value={validationStats.approved}
                  icon={CheckCircle2}
                />
                <MetricCard
                  title="Needs Review"
                  value={validationStats.needsReview}
                  icon={AlertTriangle}
                />
                <MetricCard
                  title="Rejected"
                  value={validationStats.rejected}
                  icon={XCircle}
                />
                <MetricCard
                  title="Avg Score"
                  value={`${validationStats.avgScore}%`}
                  icon={TrendingUp}
                />
              </div>
            </div>
          )}

          {/* Request Metrics */}
          {metricsData && (
            <div>
              <h4 className="text-sm font-medium mb-3">Request Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                  title="HTTP Requests"
                  value={httpRequests}
                  icon={Activity}
                />
                <MetricCard
                  title="Validations"
                  value={validationRequests}
                  icon={Shield}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>InsightRx feature configuration</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(INSIGHTRX_FLAGS).map(([key, flagName]) => {
              const flagDetails = allFlags?.find((f) => f.flagKey === flagName);
              const isEnabled = flags?.[flagName] ?? false;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <span className="text-sm font-medium">{flagName}</span>
                    {flagDetails?.description && (
                      <p className="text-xs text-muted-foreground">{flagDetails.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {flagDetails?.rolloutPercentage !== undefined && flagDetails.rolloutPercentage < 100 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs">
                            {flagDetails.rolloutPercentage}%
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Rollout percentage</TooltipContent>
                      </Tooltip>
                    )}
                    <Badge variant={isEnabled ? "default" : "secondary"}>
                      {isEnabled ? "On" : "Off"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default InsightRxStatus;
