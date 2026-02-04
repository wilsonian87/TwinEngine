import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Mail,
  Phone,
  Video,
  Globe,
  Users,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Channel } from "@shared/schema";

// ============================================================================
// TYPES
// ============================================================================

interface Activity {
  id: string;
  timestamp: string;
  channel: Channel;
  actionType: string;
  outcome: string | null;
  metadata: {
    subject?: string;
    callToAction?: string;
    predictedImpact?: string;
  };
}

interface ActivitiesResponse {
  activities: Activity[];
  total: number;
  hcpId: string;
  filters: {
    channel?: string;
    from?: string;
    to?: string;
    limit: number;
  };
}

interface ActivityTimelineProps {
  hcpId: string;
}

// ============================================================================
// CHANNEL CONFIG
// ============================================================================

const channelIcons: Record<Channel, typeof Mail> = {
  email: Mail,
  phone: Phone,
  webinar: Video,
  digital_ad: Globe,
  rep_visit: Users,
  conference: Calendar,
};

const channelColors: Record<Channel, string> = {
  email: "bg-blue-500",
  phone: "bg-teal-500",
  webinar: "bg-purple-500",
  digital_ad: "bg-orange-500",
  rep_visit: "bg-green-500",
  conference: "bg-pink-500",
};

const channelLabels: Record<Channel, string> = {
  email: "Email",
  phone: "Phone",
  webinar: "Webinar",
  digital_ad: "Digital",
  rep_visit: "Rep Visit",
  conference: "Conference",
};

const actionTypeLabels: Record<string, string> = {
  email_open: "Opened",
  email_click: "Clicked",
  email_send: "Sent",
  rep_visit: "Visited",
  webinar_attend: "Attended",
  webinar_register: "Registered",
  digital_impression: "Viewed",
  digital_click: "Clicked",
  phone_call: "Called",
  conference_attend: "Attended",
  sent: "Sent",
  opened: "Opened",
  clicked: "Clicked",
  attended: "Attended",
  completed: "Completed",
  scheduled: "Scheduled",
};

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function groupActivitiesByDate(activities: Activity[]): Record<string, Activity[]> {
  const groups: Record<string, Activity[]> = {};

  for (const activity of activities) {
    const dateKey = new Date(activity.timestamp).toISOString().split("T")[0];
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(activity);
  }

  // Sort groups by date descending
  return Object.fromEntries(
    Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ActivityItem({ activity }: { activity: Activity }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = channelIcons[activity.channel] || Mail;
  const color = channelColors[activity.channel] || "bg-gray-500";
  const actionLabel = actionTypeLabels[activity.actionType] || activity.actionType;

  return (
    <div className="relative pl-6 pb-4">
      {/* Timeline dot */}
      <div
        className={`absolute -left-2 top-1 flex h-4 w-4 items-center justify-center rounded-full ${color}`}
      >
        <Icon className="h-2.5 w-2.5 text-white" />
      </div>

      {/* Activity card */}
      <div
        className="rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm capitalize">{actionLabel}</span>
              <Badge variant="outline" className="text-xs">
                {channelLabels[activity.channel]}
              </Badge>
            </div>
            {activity.metadata?.subject && (
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {activity.metadata.subject}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">
              {formatTime(activity.timestamp)}
            </span>
            {(activity.metadata?.predictedImpact || activity.outcome) && (
              expanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )
            )}
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-2">
            {activity.outcome && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Outcome</span>
                <span className="font-medium">{activity.outcome}</span>
              </div>
            )}
            {activity.metadata?.predictedImpact && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Predicted Impact</span>
                <span className="font-mono text-purple-500">
                  {activity.metadata.predictedImpact}
                </span>
              </div>
            )}
            {activity.metadata?.callToAction && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Call to Action</span>
                <span className="text-xs">{activity.metadata.callToAction}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, groupIdx) => (
        <div key={groupIdx}>
          <Skeleton className="h-4 w-24 mb-3" />
          <div className="relative border-l-2 border-muted ml-2 space-y-4 pl-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="relative">
                <Skeleton className="absolute -left-6 top-1 h-4 w-4 rounded-full" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const channelFilters: Array<{ value: string | null; label: string }> = [
  { value: null, label: "All" },
  { value: "email", label: "Email" },
  { value: "rep_visit", label: "Rep Visit" },
  { value: "webinar", label: "Webinar" },
  { value: "digital_ad", label: "Digital" },
  { value: "phone", label: "Phone" },
];

export function ActivityTimeline({ hcpId }: ActivityTimelineProps) {
  const [channelFilter, setChannelFilter] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<ActivitiesResponse>({
    queryKey: [
      `/api/hcps/${hcpId}/activities`,
      channelFilter ? `?channel=${channelFilter}` : "",
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (channelFilter) params.set("channel", channelFilter);
      params.set("limit", "100");
      const response = await fetch(`/api/hcps/${hcpId}/activities?${params}`);
      if (!response.ok) throw new Error("Failed to fetch activities");
      return response.json();
    },
    enabled: !!hcpId,
  });

  const groupedActivities = useMemo(() => {
    if (!data?.activities) return {};
    return groupActivitiesByDate(data.activities);
  }, [data?.activities]);

  const hasActivities = Object.keys(groupedActivities).length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-chart-1" />
            Activity Timeline
          </CardTitle>
          {data?.total !== undefined && (
            <Badge variant="secondary" className="text-xs">
              {data.total} events
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {channelFilters.map((filter) => (
            <Button
              key={filter.value ?? "all"}
              variant={channelFilter === filter.value ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setChannelFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Timeline Content */}
        {isLoading ? (
          <TimelineSkeleton />
        ) : isError ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Failed to load activities
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : !hasActivities ? (
          <div className="py-8 text-center">
            <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {channelFilter
                ? `No ${channelLabels[channelFilter as Channel]} activities recorded`
                : "No activities recorded for this HCP"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedActivities).map(([date, activities]) => (
              <div key={date}>
                <div className="mb-3 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {formatDate(date)}
                  </span>
                </div>
                <div className="relative border-l-2 border-muted ml-2 space-y-2">
                  {activities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ActivityTimeline;
