import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
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

  const [format, setFormat] = useState<"csv" | "xlsx">("csv");
  const [fields, setFields] = useState<string[]>(DEFAULT_FIELDS);
  const [includeNBA, setIncludeNBA] = useState(false);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setFormat("csv");
      setFields(DEFAULT_FIELDS);
      setIncludeNBA(false);
      setPendingJobId(null);
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

      const res = await apiRequest("POST", "/api/exports", {
        type: entityType,
        destination: format,
        payload,
      });
      return res.json() as Promise<ExportJob>;
    },
    onSuccess: (job) => {
      setPendingJobId(job.id);
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

  // Auto-download when complete
  useEffect(() => {
    if (jobStatus?.status === "complete" && pendingJobId) {
      // Trigger download
      window.location.href = `/api/exports/${pendingJobId}/download`;
      toast({
        title: "Export complete",
        description: "Your file is downloading.",
      });
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
  }, [jobStatus, pendingJobId, toast, onClose, queryClient]);

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

  const isProcessing = createExport.isPending || (pendingJobId && jobStatus?.status === "processing");

  const handleExport = () => {
    if (fields.length === 0) {
      toast({
        title: "No fields selected",
        description: "Please select at least one field to export.",
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
            <Label>Export Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as "csv" | "xlsx")}
              className="flex gap-4"
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
            </RadioGroup>
          </div>

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
            disabled={isProcessing || fields.length === 0}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
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
