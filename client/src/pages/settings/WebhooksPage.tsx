import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Pencil,
  Play,
  Plus,
  Trash2,
  Webhook,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ============================================================================
// TYPES
// ============================================================================

interface WebhookDestination {
  id: string;
  userId: string;
  name: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  payloadTemplate: string | null;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface WebhookLog {
  id: string;
  destinationId: string;
  exportJobId: string | null;
  statusCode: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  sentAt: string;
}

interface WebhookFormData {
  name: string;
  url: string;
  method: string;
  headers: { key: string; value: string }[];
  payloadTemplate: string;
  isActive: boolean;
}

const EMPTY_FORM: WebhookFormData = {
  name: "",
  url: "",
  method: "POST",
  headers: [],
  payloadTemplate: "",
  isActive: true,
};

const DEFAULT_TEMPLATE = `{
  "source": "TwinEngine",
  "timestamp": "{{export_date}}",
  "exportId": "{{export_id}}",
  "audienceName": "{{audience_name}}",
  "hcpCount": {{hcp_ids}}.length,
  "data": {{hcps}}
}`;

// ============================================================================
// COMPONENT
// ============================================================================

export default function WebhooksPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingWebhook, setEditingWebhook] = useState<WebhookDestination | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Fetch webhooks
  const { data, isLoading } = useQuery<{ webhooks: WebhookDestination[] }>({
    queryKey: ["/api/webhooks"],
    queryFn: async () => {
      const res = await fetch("/api/webhooks");
      if (!res.ok) throw new Error("Failed to fetch webhooks");
      return res.json();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: WebhookFormData) => {
      const res = await apiRequest("POST", "/api/webhooks", {
        name: data.name,
        url: data.url,
        method: data.method,
        headers: Object.fromEntries(
          data.headers.filter((h) => h.key).map((h) => [h.key, h.value])
        ),
        payloadTemplate: data.payloadTemplate || null,
        isActive: data.isActive,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Webhook created" });
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      setIsFormOpen(false);
    },
    onError: (err) => {
      toast({
        title: "Failed to create webhook",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: WebhookFormData }) => {
      const res = await apiRequest("PUT", `/api/webhooks/${id}`, {
        name: data.name,
        url: data.url,
        method: data.method,
        headers: Object.fromEntries(
          data.headers.filter((h) => h.key).map((h) => [h.key, h.value])
        ),
        payloadTemplate: data.payloadTemplate || null,
        isActive: data.isActive,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Webhook updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      setEditingWebhook(null);
    },
    onError: (err) => {
      toast({
        title: "Failed to update webhook",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/webhooks/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Webhook deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      setDeleteConfirm(null);
    },
    onError: (err) => {
      toast({
        title: "Failed to delete webhook",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Test mutation
  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/webhooks/${id}/test`);
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Webhook test successful",
          description: `Status: ${result.statusCode}`,
        });
      } else {
        toast({
          title: "Webhook test failed",
          description: result.errorMessage || `Status: ${result.statusCode}`,
          variant: "destructive",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
    },
    onError: (err) => {
      toast({
        title: "Test failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const webhooks = data?.webhooks || [];

  const openCreateForm = () => {
    setEditingWebhook(null);
    setIsFormOpen(true);
  };

  const openEditForm = (webhook: WebhookDestination) => {
    setEditingWebhook(webhook);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Webhook className="h-6 w-6" />
            Webhooks
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure webhook destinations for automated data export
          </p>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="h-4 w-4 mr-2" />
          Add Webhook
        </Button>
      </div>

      {/* Webhooks List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : webhooks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Webhook className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No webhooks configured</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a webhook to automatically send HCP data to external systems
            </p>
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <WebhookCard
              key={webhook.id}
              webhook={webhook}
              onEdit={() => openEditForm(webhook)}
              onDelete={() => setDeleteConfirm(webhook.id)}
              onTest={() => testMutation.mutate(webhook.id)}
              isTesting={testMutation.isPending && testMutation.variables === webhook.id}
              expandedLogs={expandedLogs}
              setExpandedLogs={setExpandedLogs}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Form Dialog */}
      <WebhookFormDialog
        open={isFormOpen}
        webhook={editingWebhook}
        onClose={() => {
          setIsFormOpen(false);
          setEditingWebhook(null);
        }}
        onSubmit={(formData) => {
          if (editingWebhook) {
            updateMutation.mutate({ id: editingWebhook.id, data: formData });
          } else {
            createMutation.mutate(formData);
          }
        }}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Webhook?</DialogTitle>
            <DialogDescription>
              This will permanently delete the webhook and all its logs. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// WEBHOOK CARD
// ============================================================================

interface WebhookCardProps {
  webhook: WebhookDestination;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  isTesting: boolean;
  expandedLogs: string | null;
  setExpandedLogs: (id: string | null) => void;
}

function WebhookCard({
  webhook,
  onEdit,
  onDelete,
  onTest,
  isTesting,
  expandedLogs,
  setExpandedLogs,
}: WebhookCardProps) {
  const isExpanded = expandedLogs === webhook.id;

  // Fetch logs when expanded
  const { data: logsData } = useQuery<{ logs: WebhookLog[] }>({
    queryKey: ["/api/webhooks", webhook.id, "logs"],
    queryFn: async () => {
      const res = await fetch(`/api/webhooks/${webhook.id}/logs?limit=5`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    },
    enabled: isExpanded,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {webhook.name}
              {!webhook.isActive && (
                <Badge variant="secondary" className="text-xs">
                  Inactive
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              {webhook.method} {webhook.url}
            </CardDescription>
            {webhook.lastUsedAt && (
              <p className="text-xs text-muted-foreground">
                Last used: {formatDistanceToNow(new Date(webhook.lastUsedAt), { addSuffix: true })}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onTest}
              disabled={isTesting || !webhook.isActive}
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span className="ml-1.5">Test</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <Collapsible open={isExpanded} onOpenChange={() => setExpandedLogs(isExpanded ? null : webhook.id)}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full border-t rounded-none">
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Hide Logs
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                View Logs
              </>
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-4 border-t">
            {logsData?.logs?.length ? (
              <div className="space-y-2">
                {logsData.logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
                  >
                    <div className="flex items-center gap-2">
                      {log.statusCode && log.statusCode >= 200 && log.statusCode < 300 ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                      <span>
                        {log.statusCode ? `Status ${log.statusCode}` : "Failed"}
                      </span>
                      {log.errorMessage && (
                        <span className="text-destructive text-xs truncate max-w-[200px]">
                          {log.errorMessage}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.sentAt), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No logs yet
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ============================================================================
// WEBHOOK FORM DIALOG
// ============================================================================

interface WebhookFormDialogProps {
  open: boolean;
  webhook: WebhookDestination | null;
  onClose: () => void;
  onSubmit: (data: WebhookFormData) => void;
  isSubmitting: boolean;
}

function WebhookFormDialog({
  open,
  webhook,
  onClose,
  onSubmit,
  isSubmitting,
}: WebhookFormDialogProps) {
  const [formData, setFormData] = useState<WebhookFormData>(EMPTY_FORM);

  // Reset form when dialog opens
  useState(() => {
    if (open) {
      if (webhook) {
        setFormData({
          name: webhook.name,
          url: webhook.url,
          method: webhook.method,
          headers: Object.entries(webhook.headers || {}).map(([key, value]) => ({
            key,
            value,
          })),
          payloadTemplate: webhook.payloadTemplate || "",
          isActive: webhook.isActive,
        });
      } else {
        setFormData(EMPTY_FORM);
      }
    }
  });

  // Effect to handle form reset
  const handleOpen = () => {
    if (webhook) {
      setFormData({
        name: webhook.name,
        url: webhook.url,
        method: webhook.method,
        headers: Object.entries(webhook.headers || {}).map(([key, value]) => ({
          key,
          value,
        })),
        payloadTemplate: webhook.payloadTemplate || "",
        isActive: webhook.isActive,
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  };

  // Reset when dialog opens
  if (open && formData.name === "" && webhook) {
    handleOpen();
  }

  const addHeader = () => {
    setFormData((prev) => ({
      ...prev,
      headers: [...prev.headers, { key: "", value: "" }],
    }));
  };

  const removeHeader = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      headers: prev.headers.filter((_, i) => i !== index),
    }));
  };

  const updateHeader = (index: number, field: "key" | "value", value: string) => {
    setFormData((prev) => ({
      ...prev,
      headers: prev.headers.map((h, i) =>
        i === index ? { ...h, [field]: value } : h
      ),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {webhook ? "Edit Webhook" : "Create Webhook"}
            </DialogTitle>
            <DialogDescription>
              Configure a webhook endpoint to receive HCP export data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="My Webhook"
                required
              />
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, url: e.target.value }))
                }
                placeholder="https://api.example.com/webhook"
                required
              />
            </div>

            {/* Method */}
            <div className="space-y-2">
              <Label>Method</Label>
              <Select
                value={formData.method}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, method: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Headers */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Headers</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addHeader}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Header
                </Button>
              </div>
              {formData.headers.length > 0 ? (
                <div className="space-y-2">
                  {formData.headers.map((header, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Header name"
                        value={header.key}
                        onChange={(e) => updateHeader(index, "key", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Header value"
                        value={header.value}
                        onChange={(e) => updateHeader(index, "value", e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeHeader(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No custom headers configured
                </p>
              )}
            </div>

            {/* Payload Template */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="template">Payload Template (JSON)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      payloadTemplate: DEFAULT_TEMPLATE,
                    }))
                  }
                >
                  Use Default
                </Button>
              </div>
              <Textarea
                id="template"
                value={formData.payloadTemplate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    payloadTemplate: e.target.value,
                  }))
                }
                placeholder="Leave empty for default template"
                className="font-mono text-sm min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground">
                Available variables:{" "}
                <code className="bg-muted px-1 rounded">{"{{hcps}}"}</code>,{" "}
                <code className="bg-muted px-1 rounded">{"{{hcp_ids}}"}</code>,{" "}
                <code className="bg-muted px-1 rounded">{"{{npis}}"}</code>,{" "}
                <code className="bg-muted px-1 rounded">{"{{audience_name}}"}</code>,{" "}
                <code className="bg-muted px-1 rounded">{"{{export_date}}"}</code>,{" "}
                <code className="bg-muted px-1 rounded">{"{{export_id}}"}</code>
              </p>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">
                  Inactive webhooks won't receive export data
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {webhook ? "Save Changes" : "Create Webhook"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
