import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Download, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardMetricsDisplay } from "@/components/dashboard-metrics";
import type { DashboardMetrics } from "@shared/schema";

export default function Dashboard() {
  const { data: metrics, isLoading, isError, error, refetch, isRefetching } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold" data-testid="text-page-title">Nerve Center</h1>
            <p className="text-sm text-muted-foreground">
              Monitor engagement signals and simulation insights
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select defaultValue="30d">
              <SelectTrigger className="w-36" data-testid="select-time-range">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isRefetching}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" data-testid="button-export">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Alert variant="destructive" className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Dashboard</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : "Failed to load dashboard metrics. Please try again."}
              </AlertDescription>
            </Alert>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => refetch()}
              data-testid="button-retry-dashboard"
            >
              Try Again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28" data-testid={`skeleton-metric-${i}`} />
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-80" data-testid={`skeleton-chart-${i}`} />
              ))}
            </div>
          </div>
        ) : metrics ? (
          <DashboardMetricsDisplay metrics={metrics} />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <h3 className="text-lg font-semibold" data-testid="text-no-data">Unable to load metrics</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              There was an error loading dashboard data.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()} data-testid="button-retry-empty">
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
