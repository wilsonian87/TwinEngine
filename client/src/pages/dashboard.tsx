/**
 * Operational Dashboard
 *
 * Mission control for TwinEngine - system health, key metrics,
 * alerts, pending actions, and quick navigation.
 */

import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  Bell,
  Download,
  FlaskConical,
  RefreshCw,
  Target,
  FileText,
  Shield,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================================================
// TYPES
// ============================================================================

interface SystemHealth {
  healthy: boolean;
  status: "operational" | "degraded" | "down";
  dataLastUpdated: string;
  checks: {
    database: boolean;
    hcpData: boolean;
    exports: boolean;
  };
}

interface OperationalMetrics {
  totalHcps: number;
  activeHcps: number;
  atRiskHcps: number;
  atRiskTrend: number;
  pendingNbas: number;
  avgEngagementScore: number;
  totalSimulations: number;
}

interface AlertSummary {
  critical: number;
  warning: number;
  info: number;
  total: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  entityId?: string;
}

interface DashboardData {
  health: SystemHealth;
  metrics: OperationalMetrics;
  alerts: AlertSummary;
  recentActivity: RecentActivity[];
  pendingApprovals: number;
}

// ============================================================================
// HOOKS
// ============================================================================

function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    refetchInterval: 60000, // Refresh every minute
  });
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SystemHealthBar({
  health,
  isLoading,
}: {
  health?: SystemHealth;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <Skeleton className="h-12 w-full rounded-lg" />;
  }

  if (!health) return null;

  const isHealthy = health.healthy;
  const dataAge = health.dataLastUpdated
    ? formatDistanceToNow(new Date(health.dataLastUpdated), { addSuffix: true })
    : "unknown";

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 rounded-lg",
        isHealthy
          ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
          : "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
      )}
    >
      <div className="flex items-center gap-2">
        {isHealthy ? (
          <CheckCircle className="h-5 w-5" />
        ) : (
          <AlertCircle className="h-5 w-5" />
        )}
        <span className="font-medium">
          {isHealthy
            ? "All Systems Operational"
            : `System ${health.status === "degraded" ? "Degraded" : "Issues Detected"}`}
        </span>
      </div>
      <div className="text-sm opacity-80">Data freshness: {dataAge}</div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  format = "number",
  subtext,
  trend,
  variant = "default",
  icon: Icon,
  onClick,
}: {
  label: string;
  value?: number;
  format?: "number" | "percent";
  subtext?: string;
  trend?: number;
  variant?: "default" | "warning" | "danger";
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
  const formattedValue =
    value !== undefined
      ? format === "percent"
        ? `${value}%`
        : value.toLocaleString()
      : "-";

  return (
    <Card
      className={cn(
        "transition-all",
        variant === "warning" && "border-amber-300 dark:border-amber-700",
        variant === "danger" && "border-red-300 dark:border-red-700",
        onClick && "cursor-pointer hover:shadow-md"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="text-sm text-muted-foreground uppercase tracking-wide">
            {label}
          </div>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="text-3xl font-bold mt-1">{formattedValue}</div>
        {subtext && (
          <div className="text-sm text-muted-foreground">{subtext}</div>
        )}
        {trend !== undefined && trend !== 0 && (
          <div
            className={cn(
              "text-sm flex items-center gap-1 mt-1",
              trend > 0 ? "text-red-600" : "text-green-600"
            )}
          >
            {trend > 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {Math.abs(trend)}% vs last week
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlertBadge({
  severity,
  count,
}: {
  severity: "critical" | "warning" | "info";
  count: number;
}) {
  if (count === 0) return null;

  const config = {
    critical: {
      bg: "bg-red-100 dark:bg-red-950",
      text: "text-red-800 dark:text-red-200",
      icon: AlertCircle,
    },
    warning: {
      bg: "bg-amber-100 dark:bg-amber-950",
      text: "text-amber-800 dark:text-amber-200",
      icon: AlertTriangle,
    },
    info: {
      bg: "bg-blue-100 dark:bg-blue-950",
      text: "text-blue-800 dark:text-blue-200",
      icon: Bell,
    },
  };

  const { bg, text, icon: AlertIcon } = config[severity];

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        bg,
        text
      )}
    >
      <AlertIcon className="h-4 w-4" />
      <span className="font-medium">{count}</span>
      <span className="text-sm capitalize">{severity}</span>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    export: Download,
    simulation: FlaskConical,
    audience: Users,
    approval: Shield,
    hcp_view: Users,
    settings: FileText,
  };

  const Icon = iconMap[type] || Activity;
  return <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
}

function QuickActionCard({
  icon: Icon,
  label,
  to,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  to: string;
  badge?: number;
}) {
  return (
    <Link href={to}>
      <Card className="p-4 hover:shadow-md transition-all cursor-pointer group">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{label}</div>
          </div>
          {badge !== undefined && badge > 0 && (
            <Badge variant="secondary">{badge}</Badge>
          )}
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Card>
    </Link>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { data, isLoading, isError, refetch, isRefetching } = useDashboard();

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold" data-testid="text-page-title">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Operational overview and quick actions
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {isError ? (
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Unable to load dashboard</h3>
            <p className="text-muted-foreground mb-4">
              There was an error loading the dashboard data.
            </p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </Card>
        ) : (
          <>
            {/* System Health Bar */}
            <SystemHealthBar health={data?.health} isLoading={isLoading} />

            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-4">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </Card>
                ))
              ) : (
                <>
                  <MetricCard
                    label="Total HCPs"
                    value={data?.metrics.totalHcps}
                    icon={Users}
                    onClick={() => navigate("/")}
                  />
                  <MetricCard
                    label="Active (Engagement > 50)"
                    value={data?.metrics.activeHcps}
                    subtext={
                      data?.metrics.totalHcps
                        ? `${Math.round((data.metrics.activeHcps / data.metrics.totalHcps) * 100)}%`
                        : undefined
                    }
                    icon={Activity}
                    onClick={() => navigate("/?minEngagement=50")}
                  />
                  <MetricCard
                    label="At Risk (Churn > 70)"
                    value={data?.metrics.atRiskHcps}
                    trend={data?.metrics.atRiskTrend}
                    variant={
                      data?.metrics.atRiskHcps && data.metrics.atRiskHcps > 100
                        ? "warning"
                        : "default"
                    }
                    icon={AlertTriangle}
                    onClick={() => navigate("/?minChurnRisk=70")}
                  />
                  <MetricCard
                    label="Pending NBAs"
                    value={data?.metrics.pendingNbas}
                    icon={Target}
                    onClick={() => navigate("/next-best-orbit")}
                  />
                </>
              )}
            </div>

            {/* Alerts Summary */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Alert Summary</CardTitle>
                  <Link
                    href="/alerts"
                    className="text-sm text-primary hover:underline"
                  >
                    View All
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex gap-4">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                  </div>
                ) : (
                  <div className="flex gap-4 flex-wrap">
                    <AlertBadge
                      severity="critical"
                      count={data?.alerts.critical || 0}
                    />
                    <AlertBadge
                      severity="warning"
                      count={data?.alerts.warning || 0}
                    />
                    <AlertBadge severity="info" count={data?.alerts.info || 0} />
                    {data?.alerts.total === 0 && (
                      <div className="text-muted-foreground flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        No active alerts
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Your Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="h-4 w-4 rounded" />
                          <Skeleton className="h-4 flex-1" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      ))}
                    </div>
                  ) : data?.recentActivity.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No recent activity</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data?.recentActivity.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-center gap-3 text-sm"
                        >
                          <ActivityIcon type={activity.type} />
                          <span className="flex-1 truncate">
                            {activity.description}
                          </span>
                          <span className="text-muted-foreground text-xs whitespace-nowrap">
                            {formatDistanceToNow(new Date(activity.timestamp), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pending Approvals */}
              {!isLoading && data?.pendingApprovals && data.pendingApprovals > 0 ? (
                <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-600" />
                      Pending Approvals ({data.pendingApprovals})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      You have requests waiting for your review
                    </p>
                    <Button asChild>
                      <Link href="/approvals">Review Now</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Avg Engagement Score
                        </span>
                        <span className="text-lg font-semibold">
                          {isLoading ? (
                            <Skeleton className="h-6 w-12" />
                          ) : (
                            `${data?.metrics.avgEngagementScore || 0}%`
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Total Simulations
                        </span>
                        <span className="text-lg font-semibold">
                          {isLoading ? (
                            <Skeleton className="h-6 w-12" />
                          ) : (
                            data?.metrics.totalSimulations?.toLocaleString() || 0
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickActionCard
                  icon={Users}
                  label="Build Audience"
                  to="/audience-builder"
                />
                <QuickActionCard
                  icon={FlaskConical}
                  label="Run Simulation"
                  to="/simulations"
                />
                <QuickActionCard
                  icon={Bell}
                  label="View Alerts"
                  to="/alerts"
                  badge={data?.alerts.total}
                />
                <QuickActionCard
                  icon={Download}
                  label="Export Data"
                  to="/settings/webhooks"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
