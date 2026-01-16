/**
 * Integration Manager Component
 *
 * Phase 6: Manages enterprise integrations (Slack, Jira, etc.)
 * Allows users to configure, test, and manage integration connections.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Zap,
  Link2,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { IntegrationConfig, IntegrationType } from "@shared/schema";
import { format, formatDistanceToNow, parseISO } from "date-fns";

// Integration type info
const integrationTypeInfo: Record<
  IntegrationType,
  { label: string; icon: typeof MessageSquare; color: string; description: string }
> = {
  slack: {
    label: "Slack",
    icon: MessageSquare,
    color: "bg-[#4A154B]/10 text-[#4A154B] dark:text-[#E01E5A]",
    description: "Send alerts and NBA summaries to Slack channels",
  },
  jira: {
    label: "Jira",
    icon: Zap,
    color: "bg-[#0052CC]/10 text-[#0052CC]",
    description: "Create tickets from action items and recommendations",
  },
  teams: {
    label: "Microsoft Teams",
    icon: MessageSquare,
    color: "bg-[#6264A7]/10 text-[#6264A7]",
    description: "Send notifications to Teams channels",
  },
  box: {
    label: "Box",
    icon: ExternalLink,
    color: "bg-[#0061D5]/10 text-[#0061D5]",
    description: "Store and share generated documents",
  },
  confluence: {
    label: "Confluence",
    icon: Link2,
    color: "bg-[#172B4D]/10 text-[#172B4D] dark:text-[#2684FF]",
    description: "Publish reports and documentation",
  },
  veeva: {
    label: "Veeva CRM",
    icon: Settings,
    color: "bg-[#FF6600]/10 text-[#FF6600]",
    description: "Sync HCP data and engagement history",
  },
  email: {
    label: "Email",
    icon: MessageSquare,
    color: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    description: "Send email notifications and reports",
  },
};

// Status badge colors
const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-600 border-green-500/20",
  inactive: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  error: "bg-red-500/10 text-red-600 border-red-500/20",
  pending_auth: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

// Status icons
const statusIcons: Record<string, typeof CheckCircle> = {
  active: CheckCircle,
  inactive: Clock,
  error: AlertCircle,
  pending_auth: Clock,
};

interface IntegrationFormData {
  type: IntegrationType;
  name: string;
  description: string;
  botToken?: string;
  defaultChannel?: string;
}

export function IntegrationManager() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<IntegrationFormData>({
    type: "slack",
    name: "",
    description: "",
    botToken: "",
    defaultChannel: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch integrations
  const { data: integrations = [], isLoading } = useQuery<IntegrationConfig[]>({
    queryKey: ["/api/integrations"],
    queryFn: async () => {
      const response = await fetch("/api/integrations");
      if (!response.ok) throw new Error("Failed to fetch integrations");
      return response.json();
    },
  });

  // Create integration mutation
  const createMutation = useMutation({
    mutationFn: async (data: IntegrationFormData) => {
      const credentials = data.type === "slack" ? {
        type: "slack",
        botToken: data.botToken,
        defaultChannel: data.defaultChannel,
      } : { type: data.type };

      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: data.type,
          name: data.name,
          description: data.description,
          credentials,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create integration");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      setIsAddDialogOpen(false);
      setFormData({ type: "slack", name: "", description: "", botToken: "", defaultChannel: "" });
      toast({
        title: "Integration created",
        description: "The integration has been configured. Click Test to verify the connection.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create integration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test integration mutation
  const testMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const response = await fetch(`/api/integrations/${integrationId}/test`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Health check failed");
      }

      return response.json();
    },
    onSuccess: (data, integrationId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      if (data.healthy) {
        toast({
          title: "Connection successful",
          description: "The integration is working correctly.",
        });
      } else {
        toast({
          title: "Connection issue",
          description: data.error || "The integration test failed.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Test failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete integration mutation
  const deleteMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete integration");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      toast({
        title: "Integration deleted",
        description: "The integration has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>
                Connect TwinEngine to external services for automated workflows
              </CardDescription>
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Integration
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Integration</DialogTitle>
                <DialogDescription>
                  Connect a new external service to TwinEngine
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Integration Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: IntegrationType) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(integrationTypeInfo) as IntegrationType[]).map((type) => {
                        const info = integrationTypeInfo[type];
                        const Icon = info.icon;
                        return (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {info.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {integrationTypeInfo[formData.type].description}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder={`My ${integrationTypeInfo[formData.type].label} Integration`}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input
                    placeholder="Brief description of this integration"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {formData.type === "slack" && (
                  <>
                    <div className="space-y-2">
                      <Label>Bot Token</Label>
                      <Input
                        type="password"
                        placeholder="xoxb-..."
                        value={formData.botToken}
                        onChange={(e) => setFormData({ ...formData, botToken: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Your Slack bot token starting with xoxb-
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Default Channel (optional)</Label>
                      <Input
                        placeholder="#general or C1234567890"
                        value={formData.defaultChannel}
                        onChange={(e) => setFormData({ ...formData, defaultChannel: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => createMutation.mutate(formData)}
                  disabled={!formData.name || createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Integration"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {integrations.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Link2 className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              No integrations configured yet
            </p>
            <p className="text-xs text-muted-foreground">
              Add your first integration to enable automated exports and notifications.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Integration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Check</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {integrations.map((integration) => {
                const typeInfo = integrationTypeInfo[integration.type as IntegrationType];
                const Icon = typeInfo?.icon || Settings;
                const StatusIcon = statusIcons[integration.status] || Clock;

                return (
                  <TableRow key={integration.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-md ${typeInfo?.color || "bg-gray-100"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-medium">{integration.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {typeInfo?.label || integration.type}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[integration.status] || statusColors.inactive}
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {integration.status.replace("_", " ")}
                      </Badge>
                      {integration.lastError && (
                        <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate">
                          {integration.lastError}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {integration.lastHealthCheck ? (
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(parseISO(integration.lastHealthCheck as unknown as string), {
                            addSuffix: true,
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testMutation.mutate(integration.id)}
                          disabled={testMutation.isPending}
                        >
                          <RefreshCw
                            className={`h-4 w-4 mr-1 ${testMutation.isPending ? "animate-spin" : ""}`}
                          />
                          Test
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this integration?")) {
                              deleteMutation.mutate(integration.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
