import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import {
  AlertCircle,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
  XCircle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ============================================================================
// TYPES
// ============================================================================

interface ApprovalRequest {
  id: string;
  policyId: string | null;
  requesterId: string;
  approverId: string | null;
  type: string;
  status: "pending" | "approved" | "rejected" | "expired" | "cancelled";
  payload: Record<string, unknown>;
  justification: string | null;
  decisionNotes: string | null;
  createdAt: string;
  decidedAt: string | null;
  expiresAt: string | null;
  requester?: { id: string; username: string };
  approver?: { id: string; username: string } | null;
  policy?: { id: string; name: string } | null;
}

interface ApprovalPolicy {
  id: string;
  name: string;
  description: string | null;
  triggerConditions: Record<string, unknown>;
  approverRoles: string[];
  autoExpireHours: number;
  enabled: boolean;
  createdAt: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ApprovalsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"pending" | "my-requests">("pending");
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: "approve" | "reject";
    requestId: string;
  } | null>(null);
  const [actionNotes, setActionNotes] = useState("");

  // Fetch pending approvals (as approver)
  const { data: pendingData, isLoading: pendingLoading } = useQuery<{
    requests: ApprovalRequest[];
    total: number;
  }>({
    queryKey: ["/api/approvals", "pending", "approver"],
    queryFn: async () => {
      const res = await fetch("/api/approvals?role=approver&status=pending");
      if (!res.ok) throw new Error("Failed to fetch approvals");
      return res.json();
    },
  });

  // Fetch user's own requests
  const { data: myRequestsData, isLoading: myRequestsLoading } = useQuery<{
    requests: ApprovalRequest[];
    total: number;
  }>({
    queryKey: ["/api/approvals", "my-requests"],
    queryFn: async () => {
      const res = await fetch("/api/approvals?role=requester");
      if (!res.ok) throw new Error("Failed to fetch requests");
      return res.json();
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await apiRequest("POST", `/api/approvals/${id}/approve`, { notes });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Request approved" });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      setActionDialog(null);
      setActionNotes("");
    },
    onError: (err) => {
      toast({
        title: "Failed to approve",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await apiRequest("POST", `/api/approvals/${id}/reject`, { notes });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Request rejected" });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      setActionDialog(null);
      setActionNotes("");
    },
    onError: (err) => {
      toast({
        title: "Failed to reject",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/approvals/${id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Request cancelled" });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
    },
    onError: (err) => {
      toast({
        title: "Failed to cancel",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const pendingRequests = pendingData?.requests || [];
  const myRequests = myRequestsData?.requests || [];

  const handleAction = () => {
    if (!actionDialog) return;

    if (actionDialog.type === "approve") {
      approveMutation.mutate({ id: actionDialog.requestId, notes: actionNotes || undefined });
    } else {
      if (!actionNotes.trim()) {
        toast({
          title: "Notes required",
          description: "Please provide a reason for rejection",
          variant: "destructive",
        });
        return;
      }
      rejectMutation.mutate({ id: actionDialog.requestId, notes: actionNotes });
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Approvals
        </h1>
        <p className="text-muted-foreground mt-1">
          Review and manage approval requests
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            Pending Approvals
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="my-requests" className="gap-2">
            <FileText className="h-4 w-4" />
            My Requests
          </TabsTrigger>
        </TabsList>

        {/* Pending Approvals Tab */}
        <TabsContent value="pending" className="mt-4">
          {pendingLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No pending approvals</h3>
                <p className="text-sm text-muted-foreground">
                  All approval requests have been processed
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <ApprovalCard
                  key={request.id}
                  request={request}
                  isApprover
                  onView={() => setSelectedRequest(request)}
                  onApprove={() => setActionDialog({ type: "approve", requestId: request.id })}
                  onReject={() => setActionDialog({ type: "reject", requestId: request.id })}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Requests Tab */}
        <TabsContent value="my-requests" className="mt-4">
          {myRequestsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : myRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No requests</h3>
                <p className="text-sm text-muted-foreground">
                  You haven't submitted any approval requests
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myRequests.map((request) => (
                <ApprovalCard
                  key={request.id}
                  request={request}
                  isApprover={false}
                  onView={() => setSelectedRequest(request)}
                  onCancel={
                    request.status === "pending"
                      ? () => cancelMutation.mutate(request.id)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.type === "approve" ? "Approve Request" : "Reject Request"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.type === "approve"
                ? "Add optional notes for the requester."
                : "Please provide a reason for rejection."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="notes">
              Notes {actionDialog?.type === "reject" && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="notes"
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder={
                actionDialog?.type === "approve"
                  ? "Optional approval notes..."
                  : "Reason for rejection..."
              }
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={actionDialog?.type === "approve" ? "default" : "destructive"}
              onClick={handleAction}
              disabled={approveMutation.isPending || rejectMutation.isPending}
            >
              {(approveMutation.isPending || rejectMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {actionDialog?.type === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Detail Sheet */}
      <RequestDetailSheet
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </div>
  );
}

// ============================================================================
// APPROVAL CARD
// ============================================================================

interface ApprovalCardProps {
  request: ApprovalRequest;
  isApprover: boolean;
  onView: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
}

function ApprovalCard({
  request,
  isApprover,
  onView,
  onApprove,
  onReject,
  onCancel,
}: ApprovalCardProps) {
  const getStatusIcon = () => {
    switch (request.status) {
      case "pending":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "expired":
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      case "cancelled":
        return <X className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    switch (request.status) {
      case "pending":
        return <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="text-green-600 border-green-300">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "expired":
        return <Badge variant="secondary">Expired</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const getTypeLabel = () => {
    switch (request.type) {
      case "export":
        return "Data Export";
      case "integration_push":
        return "Integration Push";
      default:
        return request.type;
    }
  };

  const payload = request.payload as {
    type?: string;
    destination?: string;
    payload?: { fields?: string[]; hcpIds?: string[] };
  };

  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={onView}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getStatusIcon()}
              <span className="font-medium">{getTypeLabel()}</span>
              {getStatusBadge()}
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              {request.policy && (
                <p className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Policy: {request.policy.name}
                </p>
              )}
              <p className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {isApprover ? `From: ${request.requester?.username}` : ""}
                {!isApprover && request.status !== "pending" && request.approver && (
                  <>By: {request.approver.username}</>
                )}
              </p>
              {payload.destination && (
                <p>Destination: {payload.destination}</p>
              )}
              {payload.payload?.fields && (
                <p>{payload.payload.fields.length} fields selected</p>
              )}
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>
                Created {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
              </span>
              {request.expiresAt && request.status === "pending" && (
                <span className="text-amber-600">
                  Expires {formatDistanceToNow(new Date(request.expiresAt), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {isApprover && request.status === "pending" && (
              <>
                <Button size="sm" variant="outline" onClick={onApprove}>
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={onReject}>
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
            {!isApprover && request.status === "pending" && onCancel && (
              <Button size="sm" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// REQUEST DETAIL SHEET
// ============================================================================

interface RequestDetailSheetProps {
  request: ApprovalRequest | null;
  onClose: () => void;
}

function RequestDetailSheet({ request, onClose }: RequestDetailSheetProps) {
  if (!request) return null;

  const payload = request.payload as {
    type?: string;
    destination?: string;
    payload?: { fields?: string[]; hcpIds?: string[]; entityId?: string };
    destinationConfig?: Record<string, unknown>;
  };

  return (
    <Sheet open={!!request} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Request Details</SheetTitle>
          <SheetDescription>
            Review the full details of this approval request
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-150px)] pr-4 mt-6">
          <div className="space-y-6">
            {/* Status */}
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={
                    request.status === "approved"
                      ? "default"
                      : request.status === "rejected"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </Badge>
                {request.expiresAt && request.status === "pending" && (
                  <span className="text-sm text-amber-600">
                    Expires {format(new Date(request.expiresAt), "PPp")}
                  </span>
                )}
              </div>
            </div>

            <Separator />

            {/* Policy */}
            {request.policy && (
              <div>
                <Label className="text-muted-foreground">Approval Policy</Label>
                <p className="mt-1 font-medium">{request.policy.name}</p>
              </div>
            )}

            {/* Type */}
            <div>
              <Label className="text-muted-foreground">Request Type</Label>
              <p className="mt-1">{request.type}</p>
            </div>

            {/* Requester */}
            <div>
              <Label className="text-muted-foreground">Requested By</Label>
              <p className="mt-1">{request.requester?.username || "Unknown"}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(request.createdAt), "PPpp")}
              </p>
            </div>

            {/* Justification */}
            {request.justification && (
              <div>
                <Label className="text-muted-foreground">Justification</Label>
                <p className="mt-1 text-sm bg-muted p-3 rounded-md">{request.justification}</p>
              </div>
            )}

            <Separator />

            {/* Export Details */}
            {request.type === "export" && (
              <>
                <div>
                  <Label className="text-muted-foreground">Export Type</Label>
                  <p className="mt-1">{payload.type}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Destination</Label>
                  <p className="mt-1">{payload.destination}</p>
                </div>

                {payload.payload?.fields && (
                  <div>
                    <Label className="text-muted-foreground">
                      Fields ({payload.payload.fields.length})
                    </Label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {payload.payload.fields.map((field) => (
                        <Badge key={field} variant="outline" className="text-xs">
                          {field}
                          {field === "npi" && (
                            <AlertCircle className="h-3 w-3 ml-1 text-amber-500" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {payload.payload?.hcpIds && (
                  <div>
                    <Label className="text-muted-foreground">HCP Count</Label>
                    <p className="mt-1">{payload.payload.hcpIds.length} records</p>
                  </div>
                )}
              </>
            )}

            {/* Decision */}
            {request.status !== "pending" && request.status !== "cancelled" && (
              <>
                <Separator />

                <div>
                  <Label className="text-muted-foreground">Decision</Label>
                  <div className="mt-1 flex items-center gap-2">
                    {request.status === "approved" ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : request.status === "rejected" ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium capitalize">{request.status}</span>
                  </div>
                </div>

                {request.approver && (
                  <div>
                    <Label className="text-muted-foreground">Decided By</Label>
                    <p className="mt-1">{request.approver.username}</p>
                    {request.decidedAt && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(request.decidedAt), "PPpp")}
                      </p>
                    )}
                  </div>
                )}

                {request.decisionNotes && (
                  <div>
                    <Label className="text-muted-foreground">Decision Notes</Label>
                    <p className="mt-1 text-sm bg-muted p-3 rounded-md">
                      {request.decisionNotes}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
