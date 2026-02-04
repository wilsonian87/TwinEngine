import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ============================================================================
// TYPES
// ============================================================================

interface AlertRule {
  id: string;
  name: string;
  description: string | null;
  metric: string;
  operator: string;
  threshold: number;
  scope: Record<string, unknown> | null;
  channels: string[] | null;
  frequency: string;
  enabled: boolean;
}

interface AlertRuleDialogProps {
  open: boolean;
  onClose: () => void;
  rule: AlertRule | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const metrics = [
  { value: "engagement_score", label: "Engagement Score", hint: "0-100" },
  { value: "rx_volume", label: "Rx Volume", hint: "Monthly prescriptions" },
  { value: "market_share", label: "Market Share", hint: "Percentage" },
  { value: "churn_risk", label: "Churn Risk", hint: "0-100" },
  { value: "conversion_likelihood", label: "Conversion Likelihood", hint: "0-100" },
  { value: "cpi", label: "Competitive Pressure Index", hint: "0-100" },
  { value: "msi", label: "Message Saturation Index", hint: "0-100" },
  { value: "response_rate", label: "Response Rate", hint: "Percentage" },
];

const operators = [
  { value: ">", label: "Greater than (>)" },
  { value: "<", label: "Less than (<)" },
  { value: ">=", label: "At least (>=)" },
  { value: "<=", label: "At most (<=)" },
  { value: "=", label: "Equals (=)" },
];

const frequencies = [
  { value: "realtime", label: "Real-time (every 15 min)" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const channelOptions = [
  { value: "in_app", label: "In-App Notification" },
  { value: "email", label: "Email" },
  { value: "slack", label: "Slack" },
];

const tierOptions = ["Tier 1", "Tier 2", "Tier 3"];
const segmentOptions = [
  "High Prescriber",
  "Growth Potential",
  "New Target",
  "Engaged Digital",
  "Traditional Preference",
  "Academic Leader",
];

// ============================================================================
// COMPONENT
// ============================================================================

export function AlertRuleDialog({ open, onClose, rule }: AlertRuleDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!rule;

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metric, setMetric] = useState("engagement_score");
  const [operator, setOperator] = useState(">");
  const [threshold, setThreshold] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [channels, setChannels] = useState<string[]>(["in_app"]);
  const [scopeTiers, setScopeTiers] = useState<string[]>([]);
  const [scopeSegments, setScopeSegments] = useState<string[]>([]);

  // Reset form when rule changes
  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setDescription(rule.description || "");
      setMetric(rule.metric);
      setOperator(rule.operator);
      setThreshold(String(rule.threshold));
      setFrequency(rule.frequency);
      setChannels(rule.channels || ["in_app"]);
      const scope = rule.scope as { tiers?: string[]; segments?: string[] } | null;
      setScopeTiers(scope?.tiers || []);
      setScopeSegments(scope?.segments || []);
    } else {
      setName("");
      setDescription("");
      setMetric("engagement_score");
      setOperator(">");
      setThreshold("");
      setFrequency("daily");
      setChannels(["in_app"]);
      setScopeTiers([]);
      setScopeSegments([]);
    }
  }, [rule, open]);

  // Create mutation
  const createRule = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/alerts/rules", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/rules"] });
      toast({ title: "Rule created successfully" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to create rule", variant: "destructive" });
    },
  });

  // Update mutation
  const updateRule = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("PUT", `/api/alerts/rules/${rule!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/rules"] });
      toast({ title: "Rule updated successfully" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to update rule", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!threshold || isNaN(parseFloat(threshold))) {
      toast({ title: "Valid threshold is required", variant: "destructive" });
      return;
    }

    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      metric,
      operator,
      threshold: parseFloat(threshold),
      frequency,
      channels,
      scope: {
        tiers: scopeTiers.length > 0 ? scopeTiers : undefined,
        segments: scopeSegments.length > 0 ? scopeSegments : undefined,
      },
    };

    if (isEditing) {
      updateRule.mutate(data);
    } else {
      createRule.mutate(data);
    }
  };

  const toggleChannel = (channel: string) => {
    setChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  };

  const toggleTier = (tier: string) => {
    setScopeTiers((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier]
    );
  };

  const toggleSegment = (segment: string) => {
    setScopeSegments((prev) =>
      prev.includes(segment)
        ? prev.filter((s) => s !== segment)
        : [...prev, segment]
    );
  };

  const isPending = createRule.isPending || updateRule.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Alert Rule" : "Create Alert Rule"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Rule Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., High Churn Risk Alert"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when this alert should trigger"
              rows={2}
            />
          </div>

          {/* Condition */}
          <div className="space-y-2">
            <Label>Condition</Label>
            <div className="flex gap-2">
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {metrics.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={operator} onValueChange={setOperator}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="Value"
                className="w-24"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.find((m) => m.value === metric)?.hint}
            </p>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label>Evaluation Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencies.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notification Channels */}
          <div className="space-y-2">
            <Label>Notification Channels</Label>
            <div className="flex flex-wrap gap-4">
              {channelOptions.map((ch) => (
                <div key={ch.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`channel-${ch.value}`}
                    checked={channels.includes(ch.value)}
                    onCheckedChange={() => toggleChannel(ch.value)}
                  />
                  <Label htmlFor={`channel-${ch.value}`} className="text-sm font-normal">
                    {ch.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Scope - Tiers */}
          <div className="space-y-2">
            <Label>Scope: Tiers (optional)</Label>
            <div className="flex flex-wrap gap-4">
              {tierOptions.map((tier) => (
                <div key={tier} className="flex items-center gap-2">
                  <Checkbox
                    id={`tier-${tier}`}
                    checked={scopeTiers.includes(tier)}
                    onCheckedChange={() => toggleTier(tier)}
                  />
                  <Label htmlFor={`tier-${tier}`} className="text-sm font-normal">
                    {tier}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to apply to all tiers
            </p>
          </div>

          {/* Scope - Segments */}
          <div className="space-y-2">
            <Label>Scope: Segments (optional)</Label>
            <div className="flex flex-wrap gap-3">
              {segmentOptions.map((segment) => (
                <div key={segment} className="flex items-center gap-2">
                  <Checkbox
                    id={`segment-${segment}`}
                    checked={scopeSegments.includes(segment)}
                    onCheckedChange={() => toggleSegment(segment)}
                  />
                  <Label htmlFor={`segment-${segment}`} className="text-sm font-normal">
                    {segment}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to apply to all segments
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : isEditing ? "Update Rule" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
