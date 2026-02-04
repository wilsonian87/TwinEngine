import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, EMPTY_STATE_COPY } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Download,
  Mail,
  Phone,
  Video,
  Globe,
  Calendar,
  Users,
  AlertCircle,
  TrendingUp,
  Clock,
  ChevronDown,
  RefreshCw,
  MessageSquare,
  Check,
  X,
  Ticket,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ContextualActionBar } from "@/components/ui/contextual-action-bar";
import type { Channel } from "@shared/schema";
import type { NextBestAction } from "../../../server/services/nba-engine";

/**
 * Action Queue Component
 *
 * Displays a prioritized table of Next Best Actions (NBAs) for a cohort of HCPs.
 * Supports filtering by urgency, action type, and channel.
 * Allows selecting rows and exporting to CSV.
 */

interface ActionQueueProps {
  hcpIds: string[];
  audienceName?: string;
  /** Phase 13.4: Callback when HCP name is clicked for profile preview */
  onHcpClick?: (hcpId: string) => void;
}

// Response type from API
interface NBAResponse {
  nbas: NextBestAction[];
  summary: {
    totalActions: number;
    byUrgency: Record<string, number>;
    byActionType: Record<string, number>;
    byChannel: Record<string, number>;
    avgConfidence: number;
  };
  totalProcessed: number;
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

// Action type labels
const actionTypeLabels: Record<string, string> = {
  reach_out: "Reach Out",
  follow_up: "Follow Up",
  re_engage: "Re-engage",
  expand: "Expand",
  maintain: "Maintain",
  reduce_frequency: "Reduce Freq",
};

// Urgency badge colors
const urgencyColors: Record<string, string> = {
  high: "bg-red-500/10 text-red-500 border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-green-500/10 text-green-500 border-green-500/20",
};

// Health status colors
const healthStatusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-500",
  declining: "bg-yellow-500/10 text-yellow-500",
  dark: "bg-gray-500/10 text-gray-500",
  blocked: "bg-red-500/10 text-red-500",
  opportunity: "bg-purple-500/10 text-purple-500",
};

// Slack status response type
interface SlackStatusResponse {
  configured: boolean;
  status: string;
  integrationId?: string;
}

// Jira status response type
interface JiraStatusResponse {
  configured: boolean;
  status: string;
  integrationId?: string;
  defaultProject?: string;
}

export function ActionQueue({ hcpIds, audienceName, onHcpClick }: ActionQueueProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [actionTypeFilter, setActionTypeFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const { toast } = useToast();

  // Fetch NBAs for the cohort
  const {
    data: nbaData,
    isLoading,
    error,
    refetch,
  } = useQuery<NBAResponse>({
    queryKey: ["/api/nba/generate", hcpIds],
    queryFn: async () => {
      const response = await fetch("/api/nba/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hcpIds, prioritize: true }),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch NBAs");
      }
      return response.json();
    },
    enabled: hcpIds.length > 0,
  });

  // Check Slack integration status
  const { data: slackStatus } = useQuery<SlackStatusResponse>({
    queryKey: ["/api/integrations/slack/status"],
    queryFn: async () => {
      const response = await fetch("/api/integrations/slack/status");
      if (!response.ok) return { configured: false, status: "not_configured" };
      return response.json();
    },
  });

  // Check Jira integration status
  const { data: jiraStatus } = useQuery<JiraStatusResponse>({
    queryKey: ["/api/integrations/jira/status"],
    queryFn: async () => {
      const response = await fetch("/api/integrations/jira/status");
      if (!response.ok) return { configured: false, status: "not_configured" };
      return response.json();
    },
  });

  // Send to Slack mutation
  const sendToSlackMutation = useMutation({
    mutationFn: async ({ nbas, onlySelected }: { nbas: NextBestAction[]; onlySelected: boolean }) => {
      if (!slackStatus?.integrationId) {
        throw new Error("Slack is not configured");
      }

      const dataToSend = onlySelected
        ? nbas.filter((nba) => selectedIds.has(nba.hcpId))
        : nbas;

      if (dataToSend.length === 0) {
        throw new Error("No actions to send");
      }

      // Format the message with blocks
      const blocks = formatNBAsForSlack(dataToSend, audienceName);

      const response = await fetch("/api/integrations/slack/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integrationId: slackStatus.integrationId,
          message: {
            text: `Action Queue: ${dataToSend.length} NBA recommendations${audienceName ? ` for ${audienceName}` : ""}`,
            blocks,
          },
          sourceType: "nba",
          sourceId: `action-queue-${Date.now()}`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send to Slack");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sent to Slack",
        description: `Action queue exported successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send to Slack",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create Jira ticket mutation
  const createJiraTicketMutation = useMutation({
    mutationFn: async ({ nba }: { nba: NextBestAction }) => {
      if (!jiraStatus?.integrationId) {
        throw new Error("Jira is not configured");
      }

      const projectKey = jiraStatus.defaultProject || "TWIN";

      const response = await fetch("/api/integrations/jira/create-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integrationId: jiraStatus.integrationId,
          projectKey,
          templateType: "nba_action",
          nba: {
            hcpId: nba.hcpId,
            hcpName: nba.hcpName,
            recommendedChannel: nba.recommendedChannel,
            actionType: nba.actionType,
            urgency: nba.urgency,
            confidence: nba.confidence,
            reasoning: nba.reasoning,
            suggestedTiming: nba.suggestedTiming,
            metrics: nba.metrics,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create Jira ticket");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Jira Ticket Created",
        description: data.issueKey ? `Ticket ${data.issueKey} created successfully` : "Ticket created in dev mode",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create Jira ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create Jira tickets for multiple NBAs
  const createJiraTicketsMutation = useMutation({
    mutationFn: async ({ nbas, onlySelected }: { nbas: NextBestAction[]; onlySelected: boolean }) => {
      if (!jiraStatus?.integrationId) {
        throw new Error("Jira is not configured");
      }

      const dataToSend = onlySelected
        ? nbas.filter((nba) => selectedIds.has(nba.hcpId))
        : nbas;

      if (dataToSend.length === 0) {
        throw new Error("No actions to export");
      }

      const projectKey = jiraStatus.defaultProject || "TWIN";
      const results = [];

      for (const nba of dataToSend) {
        const response = await fetch("/api/integrations/jira/create-ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            integrationId: jiraStatus.integrationId,
            projectKey,
            templateType: "nba_action",
            nba: {
              hcpId: nba.hcpId,
              hcpName: nba.hcpName,
              recommendedChannel: nba.recommendedChannel,
              actionType: nba.actionType,
              urgency: nba.urgency,
              confidence: nba.confidence,
              reasoning: nba.reasoning,
              suggestedTiming: nba.suggestedTiming,
              metrics: nba.metrics,
            },
          }),
        });

        if (response.ok) {
          results.push(await response.json());
        }
      }

      return { created: results.length, total: dataToSend.length };
    },
    onSuccess: (data) => {
      toast({
        title: "Jira Tickets Created",
        description: `Created ${data.created} of ${data.total} tickets`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create Jira tickets",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Format NBAs as Slack blocks
  const formatNBAsForSlack = (nbas: NextBestAction[], audience?: string) => {
    const blocks: any[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `:clipboard: Action Queue${audience ? ` - ${audience}` : ""}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${nbas.length} recommendations* exported from TwinEngine:`,
        },
      },
      {
        type: "divider",
      },
    ];

    // Add up to 10 NBAs
    const displayNbas = nbas.slice(0, 10);
    for (const nba of displayNbas) {
      const urgencyEmoji = nba.urgency === "high" ? ":red_circle:" : nba.urgency === "medium" ? ":large_yellow_circle:" : ":large_green_circle:";
      blocks.push({
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*${nba.hcpName}*\n${channelLabels[nba.recommendedChannel]} | ${actionTypeLabels[nba.actionType]}`,
          },
          {
            type: "mrkdwn",
            text: `${urgencyEmoji} ${nba.urgency} | ${nba.confidence}% confidence`,
          },
        ],
      });
    }

    if (nbas.length > 10) {
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `_...and ${nbas.length - 10} more recommendations_`,
          },
        ],
      });
    }

    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Exported from TwinEngine | ${new Date().toLocaleString()}`,
        },
      ],
    });

    return blocks;
  };

  // Apply filters to NBAs
  const filteredNbas = useMemo(() => {
    if (!nbaData?.nbas) return [];

    return nbaData.nbas.filter((nba) => {
      if (urgencyFilter !== "all" && nba.urgency !== urgencyFilter) return false;
      if (actionTypeFilter !== "all" && nba.actionType !== actionTypeFilter) return false;
      if (channelFilter !== "all" && nba.recommendedChannel !== channelFilter) return false;
      return true;
    });
  }, [nbaData, urgencyFilter, actionTypeFilter, channelFilter]);

  // Toggle selection
  const toggleSelection = (hcpId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(hcpId)) {
        next.delete(hcpId);
      } else {
        next.add(hcpId);
      }
      return next;
    });
  };

  // Toggle all selection
  const toggleAll = () => {
    if (selectedIds.size === filteredNbas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNbas.map((nba) => nba.hcpId)));
    }
  };

  // Export to CSV
  const exportToCSV = (onlySelected: boolean = false) => {
    const dataToExport = onlySelected
      ? filteredNbas.filter((nba) => selectedIds.has(nba.hcpId))
      : filteredNbas;

    if (dataToExport.length === 0) return;

    const headers = [
      "HCP ID",
      "HCP Name",
      "Recommended Channel",
      "Action Type",
      "Urgency",
      "Confidence",
      "Channel Health",
      "Suggested Timing",
      "Reasoning",
      "Channel Score",
      "Response Rate",
      "Last Contact (Days)",
    ];

    const rows = dataToExport.map((nba) => [
      nba.hcpId,
      nba.hcpName,
      channelLabels[nba.recommendedChannel] || nba.recommendedChannel,
      actionTypeLabels[nba.actionType] || nba.actionType,
      nba.urgency,
      nba.confidence.toString(),
      nba.channelHealth,
      nba.suggestedTiming,
      `"${nba.reasoning.replace(/"/g, '""')}"`,
      nba.metrics.channelScore.toString(),
      nba.metrics.responseRate.toString(),
      nba.metrics.lastContactDays?.toString() || "N/A",
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `action-queue-${audienceName || "export"}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (hcpIds.length === 0) {
    return (
      <Card>
        <CardContent className="py-4">
          <EmptyState
            title={EMPTY_STATE_COPY.actionQueue.title}
            description={EMPTY_STATE_COPY.actionQueue.description}
            icon={EMPTY_STATE_COPY.actionQueue.icon}
            size="sm"
            showAnimation={false}
          />
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Action Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !nbaData) {
    return (
      <Card>
        <CardContent className="py-4">
          <ErrorState
            title="Unable to load action queue."
            message="Failed to fetch recommendations. Please try again."
            type="server"
            size="sm"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Action Queue
                {audienceName && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {audienceName}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                {nbaData.totalProcessed} HCPs analyzed, {filteredNbas.length} actions shown
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Export
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportToCSV(false)}>
                    <Download className="h-4 w-4 mr-2" />
                    Export All to CSV ({filteredNbas.length})
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => exportToCSV(true)}
                    disabled={selectedIds.size === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Selected to CSV ({selectedIds.size})
                  </DropdownMenuItem>
                  {slackStatus?.configured && (
                    <>
                      <DropdownMenuItem
                        onClick={() => sendToSlackMutation.mutate({ nbas: filteredNbas, onlySelected: false })}
                        disabled={sendToSlackMutation.isPending}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Send All to Slack ({filteredNbas.length})
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => sendToSlackMutation.mutate({ nbas: filteredNbas, onlySelected: true })}
                        disabled={selectedIds.size === 0 || sendToSlackMutation.isPending}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Send Selected to Slack ({selectedIds.size})
                      </DropdownMenuItem>
                    </>
                  )}
                  {jiraStatus?.configured && (
                    <>
                      <DropdownMenuItem
                        onClick={() => createJiraTicketsMutation.mutate({ nbas: filteredNbas, onlySelected: false })}
                        disabled={createJiraTicketsMutation.isPending}
                      >
                        <Ticket className="h-4 w-4 mr-2" />
                        Create Jira Tickets - All ({filteredNbas.length})
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => createJiraTicketsMutation.mutate({ nbas: filteredNbas, onlySelected: true })}
                        disabled={selectedIds.size === 0 || createJiraTicketsMutation.isPending}
                      >
                        <Ticket className="h-4 w-4 mr-2" />
                        Create Jira Tickets - Selected ({selectedIds.size})
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-md bg-red-500/10 p-3 text-center">
              <span className="block text-2xl font-bold text-red-500">
                {nbaData.summary.byUrgency.high || 0}
              </span>
              <span className="text-xs text-muted-foreground">High Urgency</span>
            </div>
            <div className="rounded-md bg-yellow-500/10 p-3 text-center">
              <span className="block text-2xl font-bold text-yellow-500">
                {nbaData.summary.byUrgency.medium || 0}
              </span>
              <span className="text-xs text-muted-foreground">Medium Urgency</span>
            </div>
            <div className="rounded-md bg-green-500/10 p-3 text-center">
              <span className="block text-2xl font-bold text-green-500">
                {nbaData.summary.byUrgency.low || 0}
              </span>
              <span className="text-xs text-muted-foreground">Low Urgency</span>
            </div>
            <div className="rounded-md bg-blue-500/10 p-3 text-center">
              <span className="block text-2xl font-bold text-blue-500">
                {nbaData.summary.avgConfidence}%
              </span>
              <span className="text-xs text-muted-foreground">Avg Confidence</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgency</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Action Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="reach_out">Reach Out</SelectItem>
            <SelectItem value="follow_up">Follow Up</SelectItem>
            <SelectItem value="re_engage">Re-engage</SelectItem>
            <SelectItem value="expand">Expand</SelectItem>
            <SelectItem value="maintain">Maintain</SelectItem>
            <SelectItem value="reduce_frequency">Reduce Freq</SelectItem>
          </SelectContent>
        </Select>

        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="rep_visit">Rep Visit</SelectItem>
            <SelectItem value="webinar">Webinar</SelectItem>
            <SelectItem value="conference">Conference</SelectItem>
            <SelectItem value="digital_ad">Digital</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
          </SelectContent>
        </Select>

        {selectedIds.size > 0 && (
          <Badge variant="secondary" className="ml-2">
            {selectedIds.size} selected
          </Badge>
        )}
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={filteredNbas.length > 0 && selectedIds.size === filteredNbas.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>HCP</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Health</TableHead>
              <TableHead className="w-[300px]">Reasoning</TableHead>
              <TableHead>Timing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredNbas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No actions match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredNbas.map((nba) => {
                const ChannelIcon = channelIcons[nba.recommendedChannel] || Mail;
                return (
                  <TableRow
                    key={nba.hcpId}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    data-state={selectedIds.has(nba.hcpId) ? "selected" : undefined}
                    onClick={() => onHcpClick?.(nba.hcpId)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(nba.hcpId)}
                        onCheckedChange={() => toggleSelection(nba.hcpId)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        {/* Phase 13.4: Clickable HCP name for profile preview */}
                        {onHcpClick ? (
                          <button
                            onClick={() => onHcpClick(nba.hcpId)}
                            className="font-medium text-primary hover:underline text-left"
                            data-testid={`hcp-link-${nba.hcpId}`}
                          >
                            {nba.hcpName}
                          </button>
                        ) : (
                          <span className="font-medium">{nba.hcpName}</span>
                        )}
                        <span className="block text-xs text-muted-foreground">{nba.hcpId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ChannelIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{channelLabels[nba.recommendedChannel]}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {actionTypeLabels[nba.actionType]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${urgencyColors[nba.urgency]} text-xs border`}>
                        {nba.urgency.charAt(0).toUpperCase() + nba.urgency.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{nba.confidence}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${healthStatusColors[nba.channelHealth]} text-xs`}>
                        {nba.channelHealth}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm text-muted-foreground line-clamp-2 cursor-help">
                            {nba.reasoning}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[350px]">
                          <p className="text-xs">{nba.reasoning}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                            <Clock className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">
                              {nba.suggestedTiming.split(" - ")[0]}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{nba.suggestedTiming}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Phase 13.4: Contextual action bar for bulk operations */}
      <ContextualActionBar
        selectionCount={selectedIds.size}
        selectionLabel="action"
        actions={[
          {
            label: "Export CSV",
            onClick: () => exportToCSV(true),
            variant: "secondary",
            icon: <Download className="h-4 w-4" />,
          },
          ...(slackStatus?.configured
            ? [
                {
                  label: "Send to Slack",
                  onClick: () =>
                    sendToSlackMutation.mutate({ nbas: filteredNbas, onlySelected: true }),
                  variant: "secondary" as const,
                  icon: <MessageSquare className="h-4 w-4" />,
                },
              ]
            : []),
          ...(jiraStatus?.configured
            ? [
                {
                  label: "Create Jira Tickets",
                  onClick: () =>
                    createJiraTicketsMutation.mutate({ nbas: filteredNbas, onlySelected: true }),
                  variant: "primary" as const,
                  icon: <Ticket className="h-4 w-4" />,
                },
              ]
            : []),
        ]}
        onClear={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
