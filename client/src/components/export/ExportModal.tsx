import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Loader2,
  Upload,
  Webhook,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ============================================================================
// TYPES
// ============================================================================

interface ExportField {
  key: string;
  label: string;
  sensitive: boolean;
}

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  entityType: "audience" | "hcp_list" | "nba_recommendations" | "simulation_results";
  entityId?: string;
  hcpIds?: string[];
  defaultName?: string;
}

interface ExportJob {
  id: string;
  status: string;
  resultUrl: string | null;
  errorMessage: string | null;
}

interface VeevaStatus {
  connected: boolean;
  instanceUrl?: string;
  isValid?: boolean;
}

interface WebhookDestination {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
}

// ============================================================================
// DEFAULT FIELDS
// ============================================================================

const DEFAULT_FIELDS = [
  "firstName",
  "lastName",
  "specialty",
  "tier",
  "segment",
  "overallEngagementScore",
];

const FIELD_DEFINITIONS: ExportField[] = [
  { key: "id", label: "ID", sensitive: false },
  { key: "npi", label: "NPI", sensitive: true },
  { key: "firstName", label: "First Name", sensitive: false },
  { key: "lastName", label: "Last Name", sensitive: false },
  { key: "specialty", label: "Specialty", sensitive: false },
  { key: "tier", label: "Tier", sensitive: false },
  { key: "segment", label: "Segment", sensitive: false },
  { key: "organization", label: "Organization", sensitive: false },
  { key: "city", label: "City", sensitive: false },
  { key: "state", label: "State", sensitive: false },
  { key: "overallEngagementScore", label: "Engagement Score", sensitive: false },
  { key: "channelPreference", label: "Channel Preference", sensitive: false },
  { key: "monthlyRxVolume", label: "Monthly Rx Volume", sensitive: false },
  { key: "marketSharePct", label: "Market Share %", sensitive: false },
  { key: "conversionLikelihood", label: "Conversion Likelihood", sensitive: false },
  { key: "churnRisk", label: "Churn Risk", sensitive: false },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function ExportModal({
  open,
  onClose,
  entityType,
  entityId,
  hcpIds,
  defaultName,
}: ExportModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [format, setFormat] = useState<"csv" | "xlsx" | "veeva" | "webhook">("csv");
  const [fields, setFields] = useState<string[]>(DEFAULT_FIELDS);
  const [includeNBA, setIncludeNBA] = useState(false);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string>("");

  // Query Veeva connection status
  const { data: veevaStatus } = useQuery<VeevaStatus>({
    queryKey: ["/api/integrations/veeva/status"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/veeva/status");
      if (!res.ok) return { connected: false };
      return res.json();
    },
    enabled: open,
  });

  // Query available webhooks
  const { data: webhooksData } = useQuery<{ webhooks: WebhookDestination[] }>({
    queryKey: ["/api/webhooks"],
    queryFn: async () => {
      const res = await fetch("/api/webhooks");
      if (!res.ok) return { webhooks: [] };
      return res.json();
    },
    enabled: open,
  });

  const activeWebhooks = webhooksData?.webhooks?.filter((w) => w.isActive) || [];

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setFormat("csv");
      setFields(DEFAULT_FIELDS);
      setIncludeNBA(false);
      setPendingJobId(null);
      setSelectedWebhookId("");
    }
  }, [open]);

  // Create export mutation
  const createExport = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { fields };
      if (entityId) payload.entityId = entityId;
      if (hcpIds) payload.hcpIds = hcpIds;
      if (includeNBA) {
        payload.fields = [...fields, "nbaAction", "nbaRationale", "nbaConfidence"];
        payload.includeNBA = true;
      }

      // Add destination config for webhook
      const destinationConfig: Record<string, unknown> = {};
      if (format === "webhook" && selectedWebhookId) {
        destinationConfig.webhookId = selectedWebhookId;
      }

      const res = await apiRequest("POST", "/api/exports", {
        type: entityType,
        destination: format,
        payload,
        ...(Object.keys(destinationConfig).length > 0 && { destinationConfig }),
      });
      return res.json();
    },
    onSuccess: (response: any) => {
      // Check if approval is required
      if (response.status === "pending_approval") {
        toast({
          title: "Approval Required",
          description: response.message || "Your export request has been submitted for approval.",
        });
        onClose();
        return;
      }

      // Normal export job created
      setPendingJobId(response.id);
      toast({
        title: "Export started",
        description: "Your export is being processed. It will download automatically when ready.",
      });
    },
    onError: (error) => {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to create export",
        variant: "destructive",
      });
    },
  });

  // Poll for job completion
  const { data: jobStatus } = useQuery<ExportJob>({
    queryKey: ["/api/exports", pendingJobId],
    queryFn: async () => {
      const res = await fetch(`/api/exports/${pendingJobId}`);
      return res.json();
    },
    enabled: !!pendingJobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 1000;
      if (data.status === "complete" || data.status === "failed") return false;
      return 1000;
    },
  });

  // Auto-download when complete (or show success for Veeva/Webhook)
  useEffect(() => {
    if (jobStatus?.status === "complete" && pendingJobId) {
      if (format === "veeva") {
        // Veeva push complete
        toast({
          title: "Pushed to Veeva",
          description: "NBA recommendations have been sent to Veeva CRM.",
        });
      } else if (format === "webhook") {
        // Webhook push complete
        toast({
          title: "Sent to Webhook",
          description: "Data has been sent to the configured webhook endpoint.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      } else {
        // Trigger file download
        window.location.href = `/api/exports/${pendingJobId}/download`;
        toast({
          title: "Export complete",
          description: "Your file is downloading.",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/exports"] });
      onClose();
    } else if (jobStatus?.status === "failed") {
      toast({
        title: "Export failed",
        description: jobStatus.errorMessage || "Unknown error",
        variant: "destructive",
      });
      setPendingJobId(null);
    }
  }, [jobStatus, pendingJobId, format, toast, onClose, queryClient]);

  const toggleField = (fieldKey: string) => {
    setFields((prev) =>
      prev.includes(fieldKey)
        ? prev.filter((f) => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const selectAll = () => setFields(FIELD_DEFINITIONS.map((f) => f.key));
  const selectNone = () => setFields([]);

  const sensitiveFields = fields.filter((f) =>
    FIELD_DEFINITIONS.find((def) => def.key === f)?.sensitive
  );

  const isProcessing = createExport.isPending || !!(pendingJobId && jobStatus?.status === "processing");

  const handleExport = () => {
    if (fields.length === 0) {
      toast({
        title: "No fields selected",
        description: "Please select at least one field to export.",
        variant: "destructive",
      });
      return;
    }
    if (format === "webhook" && !selectedWebhookId) {
      toast({
        title: "No webhook selected",
        description: "Please select a webhook destination.",
        variant: "destructive",
      });
      return;
    }
    createExport.mutate();
  };

  const getEntityLabel = () => {
    switch (entityType) {
      case "audience":
        return "Audience";
      case "hcp_list":
        return "HCP List";
      case "nba_recommendations":
        return "NBA Recommendations";
      case "simulation_results":
        return "Simulation Results";
      default:
        return "Data";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export {defaultName || getEntityLabel()}
          </DialogTitle>
          <DialogDescription>
            Choose format and fields for your export
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Export Destination</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as "csv" | "xlsx" | "veeva" | "webhook")}
              className="grid gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  CSV
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="xlsx" id="xlsx" />
                <Label htmlFor="xlsx" className="flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel (.xlsx)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="veeva"
                  id="veeva"
                  disabled={!veevaStatus?.connected}
                />
                <Label
                  htmlFor="veeva"
                  className={`flex items-center gap-2 cursor-pointer ${
                    !veevaStatus?.connected ? "opacity-50" : ""
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  Veeva CRM
                  {veevaStatus?.connected ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <a
                      href="/settings/integrations"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Connect <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="webhook"
                  id="webhook"
                  disabled={activeWebhooks.length === 0}
                />
                <Label
                  htmlFor="webhook"
                  className={`flex items-center gap-2 cursor-pointer ${
                    activeWebhooks.length === 0 ? "opacity-50" : ""
                  }`}
                >
                  <Webhook className="h-4 w-4" />
                  Webhook
                  {activeWebhooks.length > 0 ? (
                    <Badge variant="secondary" className="text-xs">
                      {activeWebhooks.length} configured
                    </Badge>
                  ) : (
                    <a
                      href="/settings/webhooks"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Configure <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Webhook Selector */}
          {format === "webhook" && activeWebhooks.length > 0 && (
            <div className="space-y-2">
              <Label>Select Webhook</Label>
              <Select value={selectedWebhookId} onValueChange={setSelectedWebhookId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a webhook destination..." />
                </SelectTrigger>
                <SelectContent>
                  {activeWebhooks.map((webhook) => (
                    <SelectItem key={webhook.id} value={webhook.id}>
                      <div className="flex flex-col">
                        <span>{webhook.name}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                          {webhook.url}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Field Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Include Fields</Label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={selectAll}
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={selectNone}
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
              {FIELD_DEFINITIONS.map((field) => (
                <label
                  key={field.key}
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                >
                  <Checkbox
                    checked={fields.includes(field.key)}
                    onCheckedChange={() => toggleField(field.key)}
                  />
                  <span className="text-sm">{field.label}</span>
                  {field.sensitive && (
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                  )}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {fields.length} of {FIELD_DEFINITIONS.length} fields selected
            </p>
          </div>

          {/* NBA Toggle */}
          {(entityType === "audience" || entityType === "hcp_list") && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-nba"
                checked={includeNBA}
                onCheckedChange={(checked) => setIncludeNBA(!!checked)}
              />
              <Label htmlFor="include-nba" className="cursor-pointer">
                Include NBA Recommendations
              </Label>
              <Badge variant="secondary" className="text-xs">
                +3 fields
              </Badge>
            </div>
          )}

          {/* Sensitive Data Warning */}
          {sensitiveFields.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    Sensitive data included
                  </p>
                  <p className="text-amber-600 dark:text-amber-500 mt-1">
                    This export includes sensitive fields ({sensitiveFields.join(", ")}).
                    Export will be logged for audit purposes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Processing Status */}
          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing export...</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isProcessing || fields.length === 0 || (format === "webhook" && !selectedWebhookId)}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {format === "veeva" || format === "webhook" ? "Sending..." : "Exporting..."}
              </>
            ) : format === "veeva" ? (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Push to Veeva
              </>
            ) : format === "webhook" ? (
              <>
                <Webhook className="h-4 w-4 mr-2" />
                Send to Webhook
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
