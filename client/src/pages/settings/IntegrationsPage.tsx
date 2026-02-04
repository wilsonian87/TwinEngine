import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  AlertCircle,
  Check,
  ExternalLink,
  Loader2,
  Plug,
  RefreshCw,
  Settings,
  Trash2,
  Unplug,
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// TYPES
// ============================================================================

interface VeevaStatus {
  connected: boolean;
  instanceUrl?: string;
  expiresAt?: number;
  isValid?: boolean;
}

interface TestResult {
  success: boolean;
  message: string;
  vaultName?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function IntegrationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);

  // Parse URL params for OAuth callback messages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");

    if (success === "veeva") {
      toast({
        title: "Veeva Connected",
        description: "Your Veeva CRM integration is now active.",
      });
      // Clean up URL
      window.history.replaceState({}, "", "/settings/integrations");
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/veeva/status"] });
    } else if (error) {
      toast({
        title: "Connection Failed",
        description: decodeURIComponent(error),
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/settings/integrations");
    }
  }, [location, toast, queryClient]);

  // Fetch Veeva connection status
  const { data: veevaStatus, isLoading: statusLoading } = useQuery<VeevaStatus>({
    queryKey: ["/api/integrations/veeva/status"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/veeva/status");
      if (!res.ok) throw new Error("Failed to fetch status");
      return res.json();
    },
  });

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/integrations/veeva/connect");
      if (!res.ok) throw new Error("Failed to initiate connection");
      return res.json();
    },
    onSuccess: (data: { authUrl: string }) => {
      // Redirect to Veeva OAuth
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Veeva",
        variant: "destructive",
      });
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/integrations/veeva/disconnect", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Veeva Disconnected",
        description: "Your Veeva CRM integration has been removed.",
      });
      setDisconnectDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/veeva/status"] });
    },
    onError: (error) => {
      toast({
        title: "Disconnect Failed",
        description: error instanceof Error ? error.message : "Failed to disconnect",
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testMutation = useMutation<TestResult>({
    mutationFn: async () => {
      const res = await fetch("/api/integrations/veeva/test", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Test failed");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Connection Verified",
          description: data.vaultName
            ? `Connected to ${data.vaultName}`
            : "Veeva connection is working.",
        });
      } else {
        toast({
          title: "Connection Issue",
          description: data.message,
          variant: "destructive",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/veeva/status"] });
    },
    onError: (error) => {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Connection test failed",
        variant: "destructive",
      });
    },
  });

  const formatExpiresAt = (expiresAt?: number) => {
    if (!expiresAt) return "Unknown";
    const date = new Date(expiresAt);
    const now = new Date();
    if (date < now) return "Expired";

    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      return `${Math.floor(hours / 24)} days`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutes`;
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Integrations
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage external system connections for data export and CRM sync
        </p>
      </div>

      {/* Veeva CRM Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                Veeva CRM
              </CardTitle>
              <CardDescription>
                Push NBA recommendations directly to Veeva CRM for field team activation
              </CardDescription>
            </div>
            {statusLoading ? (
              <Badge variant="secondary">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Loading
              </Badge>
            ) : veevaStatus?.connected ? (
              <Badge variant="default" className="bg-green-600">
                <Check className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Unplug className="h-3 w-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {veevaStatus?.connected ? (
            <>
              {/* Connection Details */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Instance URL</span>
                  <span className="font-medium truncate max-w-[250px]">
                    {veevaStatus.instanceUrl || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Token Expires</span>
                  <span className="font-medium">
                    {formatExpiresAt(veevaStatus.expiresAt)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium">
                    {veevaStatus.isValid ? (
                      <span className="text-green-600">Valid</span>
                    ) : (
                      <span className="text-amber-600">Needs Refresh</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reconnect
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDisconnectDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>

              {/* Usage Info */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Push NBA Recommendations</AlertTitle>
                <AlertDescription>
                  You can push NBA recommendations to Veeva from the Export Modal.
                  Select "Veeva CRM" as the destination when exporting.
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <>
              {/* Not Connected State */}
              <div className="text-center py-6">
                <Plug className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Connect Veeva CRM</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                  Link your Veeva CRM account to automatically push NBA recommendations
                  to field teams and track engagement outcomes.
                </p>
                <Button
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending}
                >
                  {connectMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Connect with Veeva
                </Button>
              </div>

              {/* Requirements */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Requirements</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Veeva CRM administrator credentials</li>
                  <li>• API access enabled on your Veeva instance</li>
                  <li>• NBA_Recommendation__c custom object configured</li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Other Integrations (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
            </svg>
            SFTP Export
          </CardTitle>
          <CardDescription>
            Configure SFTP server for automated file exports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="outline">Coming Soon</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            Webhook
          </CardTitle>
          <CardDescription>
            Send export data to custom webhook endpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="outline">Coming Soon</Badge>
        </CardContent>
      </Card>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Veeva CRM?</DialogTitle>
            <DialogDescription>
              This will remove the Veeva integration. You'll need to reconnect
              and re-authorize to push recommendations again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDisconnectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
