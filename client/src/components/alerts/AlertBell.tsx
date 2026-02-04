import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Bell,
  AlertTriangle,
  Check,
  CheckCheck,
  Clock,
  Users,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";

// ============================================================================
// TYPES
// ============================================================================

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

interface EventsResponse {
  events: AlertEvent[];
  total: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getSeverityColor(hcpCount: number): string {
  if (hcpCount >= 50) return "text-red-500";
  if (hcpCount >= 10) return "text-orange-500";
  return "text-yellow-500";
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AlertBell() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch unacknowledged count
  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/alerts/events/count"],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch recent events (only when popover is open)
  const { data: eventsData, isLoading } = useQuery<EventsResponse>({
    queryKey: ["/api/alerts/events", { limit: 5 }],
    enabled: open,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/events/count"] });
    },
  });

  const unacknowledgedCount = countData?.count || 0;
  const events = eventsData?.events || [];
  const unacknowledgedEvents = events.filter((e) => !e.acknowledged);

  const handleViewAll = () => {
    setOpen(false);
    setLocation("/alerts");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-alert-bell"
        >
          <Bell className="h-5 w-5" />
          {unacknowledgedCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs flex items-center justify-center"
            >
              {unacknowledgedCount > 99 ? "99+" : unacknowledgedCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unacknowledgedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => acknowledgeAll.mutate()}
              disabled={acknowledgeAll.isPending}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Events List */}
        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {events.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className={`px-4 py-3 hover:bg-muted/50 transition-colors ${
                    !event.acknowledged ? "bg-muted/30" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 p-1 rounded-full ${
                        event.acknowledged ? "bg-muted" : "bg-red-500/20"
                      }`}
                    >
                      <AlertTriangle
                        className={`h-3 w-3 ${getSeverityColor(event.hcpCount)}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {event.ruleName || "Alert Rule"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {event.hcpCount} HCPs
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(event.triggeredAt)}
                        </span>
                      </div>
                    </div>
                    {!event.acknowledged && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          acknowledgeEvent.mutate(event.id);
                        }}
                        disabled={acknowledgeEvent.isPending}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full justify-between text-sm"
            onClick={handleViewAll}
          >
            View all alerts
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
