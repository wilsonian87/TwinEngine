import { useState } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Users,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

interface AlertEventCardProps {
  event: AlertEvent;
  onAcknowledge: () => void;
  isAcknowledging: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(dateStr: string): string {
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
    hour: "numeric",
    minute: "2-digit",
  });
}

function getSeverity(hcpCount: number): "low" | "medium" | "high" {
  if (hcpCount >= 50) return "high";
  if (hcpCount >= 10) return "medium";
  return "low";
}

const severityStyles = {
  low: "border-l-yellow-500 bg-yellow-500/5",
  medium: "border-l-orange-500 bg-orange-500/5",
  high: "border-l-red-500 bg-red-500/5",
};

const severityBadgeStyles = {
  low: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
  medium: "bg-orange-500/20 text-orange-600 border-orange-500/30",
  high: "bg-red-500/20 text-red-600 border-red-500/30",
};

// ============================================================================
// COMPONENT
// ============================================================================

export function AlertEventCard({
  event,
  onAcknowledge,
  isAcknowledging,
}: AlertEventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [, setLocation] = useLocation();
  const severity = getSeverity(event.hcpCount);

  const handleViewHCPs = () => {
    // Navigate to HCP explorer with filter for these HCPs
    const hcpIds = event.hcpIds.slice(0, 10).join(",");
    setLocation(`/hcp-explorer?ids=${hcpIds}`);
  };

  return (
    <Card
      className={`border-l-4 transition-all ${severityStyles[severity]} ${
        event.acknowledged ? "opacity-60" : ""
      }`}
    >
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className={`mt-0.5 p-1.5 rounded-full ${
                event.acknowledged ? "bg-muted" : "bg-red-500/20"
              }`}
            >
              <AlertTriangle
                className={`h-4 w-4 ${
                  event.acknowledged ? "text-muted-foreground" : "text-red-500"
                }`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">
                  {event.ruleName || "Alert Rule"}
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs ${severityBadgeStyles[severity]}`}
                >
                  {event.hcpCount} HCPs
                </Badge>
                {event.acknowledged && (
                  <Badge variant="secondary" className="text-xs">
                    Acknowledged
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(event.triggeredAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {event.hcpCount} affected
                </span>
              </div>

              {/* Expanded Details */}
              {expanded && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Triggered when {event.hcpCount} HCPs breached the threshold.
                  </p>

                  {Object.keys(event.metricValues).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        Sample values:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(event.metricValues)
                          .slice(0, 5)
                          .map(([hcpId, value]) => (
                            <Badge
                              key={hcpId}
                              variant="outline"
                              className="text-xs font-mono"
                            >
                              {typeof value === "number" ? value.toFixed(1) : value}
                            </Badge>
                          ))}
                        {Object.keys(event.metricValues).length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{Object.keys(event.metricValues).length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={handleViewHCPs}
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    View Affected HCPs
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {!event.acknowledged && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAcknowledge}
                disabled={isAcknowledging}
              >
                <Check className="h-4 w-4 mr-1" />
                Ack
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
