import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Mail, Phone, Video, Globe, Calendar, Users, AlertTriangle, TrendingUp, Info } from "lucide-react";
import type { Channel } from "@shared/schema";
import type { CohortChannelHealth, HealthStatus } from "../../../server/services/channel-health";

/**
 * Cohort Channel Health Aggregate View
 *
 * Displays the aggregate health distribution across channels for a cohort of HCPs.
 * Shows a bar chart per channel with status distribution and identifies systemic issues.
 */

interface CohortHealthViewProps {
  hcpIds: string[];
  audienceName?: string;
}

// Response type from API
interface CohortHealthResponse {
  totalHcps: number;
  channelHealth: CohortChannelHealth[];
}

// Channel icons
const channelIcons: Record<Channel, typeof Mail> = {
  email: Mail,
  rep_visit: Users,
  webinar: Video,
  conference: Calendar,
  digital_ad: Globe,
  phone: Phone,
};

// Channel labels
const channelLabels: Record<Channel, string> = {
  email: "Email",
  rep_visit: "Rep Visit",
  webinar: "Webinar",
  conference: "Conference",
  digital_ad: "Digital",
  phone: "Phone",
};

// Status colors for bars
const statusColors: Record<HealthStatus, string> = {
  active: "#22c55e",    // green-500
  declining: "#eab308", // yellow-500
  dark: "#6b7280",      // gray-500
  blocked: "#ef4444",   // red-500
  opportunity: "#a855f7", // purple-500
};

// Status labels
const statusLabels: Record<HealthStatus, string> = {
  active: "Active",
  declining: "Declining",
  dark: "Dark",
  blocked: "Blocked",
  opportunity: "Opportunity",
};

export function CohortHealthView({ hcpIds, audienceName }: CohortHealthViewProps) {
  // Fetch cohort health data
  const { data: cohortHealth, isLoading, error } = useQuery<CohortHealthResponse>({
    queryKey: ["/api/channel-health/cohort", hcpIds],
    queryFn: async () => {
      const response = await fetch("/api/channel-health/cohort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hcpIds }),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch cohort health");
      }
      return response.json();
    },
    enabled: hcpIds.length > 0,
  });

  // Calculate overall insights
  const insights = useMemo(() => {
    if (!cohortHealth?.channelHealth) return null;

    const channels = cohortHealth.channelHealth;

    // Find channels with most issues
    const issueChannels = channels
      .filter((c) => (c.distribution.blocked + c.distribution.declining) > 30)
      .map((c) => c.channel);

    // Find opportunity channels
    const opportunityChannels = channels
      .filter((c) => c.distribution.opportunity > 20)
      .map((c) => c.channel);

    // Find healthy channels
    const healthyChannels = channels
      .filter((c) => c.distribution.active > 50)
      .map((c) => c.channel);

    // Calculate overall health score
    const avgActiveRate = channels.reduce((sum, c) => sum + c.distribution.active, 0) / channels.length;

    return {
      issueChannels,
      opportunityChannels,
      healthyChannels,
      avgActiveRate: Math.round(avgActiveRate),
    };
  }, [cohortHealth]);

  if (hcpIds.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No HCPs selected. Select HCPs or a saved audience to view channel health.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Channel Health Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !cohortHealth) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Unable to load channel health data.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            Channel Health Overview
            {audienceName && (
              <Badge variant="outline" className="text-xs font-normal">
                {audienceName}
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-xs">
            Aggregate health across {cohortHealth.totalHcps.toLocaleString()} HCPs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {insights && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md bg-green-500/10 p-3 text-center">
                <span className="block text-2xl font-bold text-green-500">
                  {insights.avgActiveRate}%
                </span>
                <span className="text-xs text-muted-foreground">Avg Active Rate</span>
              </div>
              <div className="rounded-md bg-red-500/10 p-3 text-center">
                <span className="block text-2xl font-bold text-red-500">
                  {insights.issueChannels.length}
                </span>
                <span className="text-xs text-muted-foreground">Channels w/ Issues</span>
              </div>
              <div className="rounded-md bg-purple-500/10 p-3 text-center">
                <span className="block text-2xl font-bold text-purple-500">
                  {insights.opportunityChannels.length}
                </span>
                <span className="text-xs text-muted-foreground">Opportunities</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Channel-by-Channel Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Channel Health Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cohortHealth.channelHealth.map((channel) => {
            const Icon = channelIcons[channel.channel];
            const hasIssues = (channel.distribution.blocked + channel.distribution.declining) > 30;
            const hasOpportunity = channel.distribution.opportunity > 20;

            return (
              <div key={channel.channel} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{channelLabels[channel.channel]}</span>
                    {hasIssues && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">High issue rate detected</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {hasOpportunity && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Growth opportunity detected</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[250px]">
                      <p className="text-xs">{channel.recommendation}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Stacked bar chart */}
                <div className="flex h-6 overflow-hidden rounded-md">
                  {(["active", "opportunity", "declining", "blocked", "dark"] as HealthStatus[]).map((status) => {
                    const pct = channel.distribution[status];
                    if (pct === 0) return null;
                    return (
                      <Tooltip key={status}>
                        <TooltipTrigger asChild>
                          <div
                            className="transition-all hover:opacity-80 cursor-pointer"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: statusColors[status],
                              minWidth: pct > 0 ? "8px" : "0",
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium text-xs">{statusLabels[status]}</p>
                          <p className="text-xs text-muted-foreground">
                            {pct}% of cohort ({Math.round((pct / 100) * cohortHealth.totalHcps)} HCPs)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>

                {/* Status breakdown text */}
                <div className="flex flex-wrap gap-2 text-xs">
                  {(["active", "opportunity", "declining", "blocked", "dark"] as HealthStatus[]).map((status) => {
                    const pct = channel.distribution[status];
                    if (pct === 0) return null;
                    return (
                      <span key={status} className="flex items-center gap-1">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: statusColors[status] }}
                        />
                        <span className="text-muted-foreground">
                          {statusLabels[status]}: {pct}%
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Insights & Recommendations */}
      {insights && (insights.issueChannels.length > 0 || insights.opportunityChannels.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Key Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.issueChannels.length > 0 && (
              <div className="flex items-start gap-3 rounded-md bg-yellow-500/10 p-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Channels Need Attention</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {insights.issueChannels.map((c) => channelLabels[c]).join(", ")} showing
                    high rates of blocked or declining engagement. Consider re-engagement
                    strategies or messaging adjustments.
                  </p>
                </div>
              </div>
            )}
            {insights.opportunityChannels.length > 0 && (
              <div className="flex items-start gap-3 rounded-md bg-purple-500/10 p-3">
                <TrendingUp className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Growth Opportunities</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {insights.opportunityChannels.map((c) => channelLabels[c]).join(", ")} show
                    high affinity but low utilization. Expanding engagement on these channels
                    could yield significant results.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 text-xs">
        {(Object.entries(statusColors) as [HealthStatus, string][]).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-muted-foreground">{statusLabels[status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
