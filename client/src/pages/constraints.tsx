import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/ui/error-state";
import {
  AlertTriangle,
  Calendar,
  DollarSign,
  Users,
  Zap,
  Ban,
  CheckCircle,
  XCircle,
  Plus,
  RefreshCw,
  Loader2,
  MapPin,
  Clock,
  TrendingUp,
  Activity,
  Shield,
  Pencil,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

// Types
interface CapacityRecord {
  channel: string;
  dailyUsed: number;
  dailyLimit: number;
  weeklyUsed: number;
  weeklyLimit: number;
  monthlyUsed: number;
  monthlyLimit: number;
  utilizationPct: number;
  status: "healthy" | "warning" | "critical";
}

interface BudgetSummary {
  totalAllocated: number;
  totalSpent: number;
  totalCommitted: number;
  utilizationPct: number;
  byChannel: Array<{
    channel: string;
    allocated: number;
    spent: number;
    remaining: number;
  }>;
}

interface ComplianceWindowSummary {
  id: string;
  name: string;
  windowType: string;
  startDate: string;
  endDate: string;
  affectedCount: number;
}

interface ComplianceSummary {
  activeBlackouts: number;
  upcomingBlackouts: number;
  affectedHcpCount: number;
  windows: ComplianceWindowSummary[];
}

interface ContactLimitsSummary {
  hcpsAtLimit: number;
  hcpsNearLimit: number;
  avgUtilization: number;
}

interface ConstraintSummary {
  capacity: CapacityRecord[];
  budget: BudgetSummary;
  compliance: ComplianceSummary;
  contactLimits: ContactLimitsSummary;
}

interface ComplianceWindow {
  id: string;
  name: string;
  description?: string;
  channel?: string;
  windowType: string;
  startDate: string;
  endDate: string;
  recurrence?: string;
  reason?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
}

interface BudgetAllocation {
  id: string;
  campaignId?: string;
  channel?: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  allocatedAmount: number;
  spentAmount: number;
  committedAmount: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

export default function ConstraintsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [showNewWindowDialog, setShowNewWindowDialog] = useState(false);
  const [showNewBudgetDialog, setShowNewBudgetDialog] = useState(false);
  const [editingWindow, setEditingWindow] = useState<ComplianceWindow | null>(null);
  const [editingBudget, setEditingBudget] = useState<BudgetAllocation | null>(null);

  // Fetch constraint summary
  const { data: summary, isLoading: summaryLoading, isError: summaryError, error: summaryErrorObj, refetch: refetchSummary } = useQuery<ConstraintSummary>({
    queryKey: ["/api/constraints/summary"],
  });

  // Fetch compliance windows
  const { data: complianceWindows = [] } = useQuery<ComplianceWindow[]>({
    queryKey: ["/api/constraints/compliance-windows"],
    enabled: activeTab === "compliance",
  });

  // Fetch budget allocations
  const { data: budgetAllocations = [] } = useQuery<BudgetAllocation[]>({
    queryKey: ["/api/constraints/budget"],
    enabled: activeTab === "budget",
  });

  // Mutation for creating compliance window
  const createWindowMutation = useMutation({
    mutationFn: async (data: Partial<ComplianceWindow>) => {
      const res = await fetch("/api/constraints/compliance-windows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create compliance window");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/constraints/compliance-windows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/constraints/summary"] });
      setShowNewWindowDialog(false);
      toast({ title: "Compliance window created" });
    },
    onError: () => {
      toast({ title: "Failed to create compliance window", variant: "destructive" });
    },
  });

  // Mutation for creating budget allocation
  const createBudgetMutation = useMutation({
    mutationFn: async (data: Partial<BudgetAllocation>) => {
      const res = await fetch("/api/constraints/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create budget allocation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/constraints/budget"] });
      queryClient.invalidateQueries({ queryKey: ["/api/constraints/summary"] });
      setShowNewBudgetDialog(false);
      toast({ title: "Budget allocation created" });
    },
    onError: () => {
      toast({ title: "Failed to create budget allocation", variant: "destructive" });
    },
  });

  // Delete compliance window
  const deleteWindowMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/constraints/compliance-windows/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete compliance window");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/constraints/compliance-windows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/constraints/summary"] });
      toast({ title: "Compliance window deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete", variant: "destructive" });
    },
  });

  // Edit compliance window
  const editWindowMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ComplianceWindow> & { id: string }) => {
      const res = await fetch(`/api/constraints/compliance-windows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update compliance window");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/constraints/compliance-windows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/constraints/summary"] });
      setEditingWindow(null);
      toast({ title: "Compliance window updated" });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  // Delete budget allocation
  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/constraints/budget/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete budget allocation");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/constraints/budget"] });
      queryClient.invalidateQueries({ queryKey: ["/api/constraints/summary"] });
      toast({ title: "Budget allocation deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete", variant: "destructive" });
    },
  });

  // Edit budget allocation
  const editBudgetMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<BudgetAllocation> & { id: string }) => {
      const res = await fetch(`/api/constraints/budget/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update budget allocation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/constraints/budget"] });
      queryClient.invalidateQueries({ queryKey: ["/api/constraints/summary"] });
      setEditingBudget(null);
      toast({ title: "Budget allocation updated" });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600 bg-green-50";
      case "warning":
        return "text-yellow-600 bg-yellow-50";
      case "critical":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case "critical":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  if (summaryError) {
    return (
      <div className="container mx-auto py-6">
        <ErrorState
          title="Unable to load constraints."
          message={summaryErrorObj instanceof Error ? summaryErrorObj.message : "Failed to fetch constraint summary"}
          type="server"
          retry={() => refetchSummary()}
          size="lg"
        />
      </div>
    );
  }

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Constraint Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage capacity, budget, compliance, and contact constraints
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/constraints/summary"] })}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="capacity">Channel Capacity</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Windows</TabsTrigger>
          <TabsTrigger value="contacts">Contact Limits</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Capacity Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Channel Capacity</CardTitle>
                <Zap className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary?.capacity.slice(0, 3).map((cap) => (
                    <div key={cap.channel} className="flex justify-between items-center text-sm">
                      <span className="capitalize">{cap.channel.replace("_", " ")}</span>
                      <Badge className={getStatusColor(cap.status)}>
                        {cap.utilizationPct.toFixed(0)}%
                      </Badge>
                    </div>
                  ))}
                  {(summary?.capacity.length || 0) === 0 && (
                    <p className="text-sm text-muted-foreground">No capacity limits configured</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Budget Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Budget Status</CardTitle>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {summary?.budget.totalAllocated ? (
                  <>
                    <div className="text-2xl font-bold">
                      ${(summary.budget.totalAllocated - summary.budget.totalSpent - summary.budget.totalCommitted).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Available of ${summary.budget.totalAllocated.toLocaleString()}
                    </p>
                    <Progress value={summary.budget.utilizationPct} className="mt-2" />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No budget allocations configured</p>
                )}
              </CardContent>
            </Card>

            {/* Compliance Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Compliance</CardTitle>
                <Shield className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Active Blackouts</span>
                    <Badge variant={summary?.compliance.activeBlackouts ? "destructive" : "outline"}>
                      {summary?.compliance.activeBlackouts || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Upcoming</span>
                    <Badge variant="secondary">{summary?.compliance.upcomingBlackouts || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Affected HCPs</span>
                    <span className="text-sm font-medium">{summary?.compliance.affectedHcpCount || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Limits Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Contact Limits</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">HCPs at Limit</span>
                    <Badge variant={summary?.contactLimits.hcpsAtLimit ? "destructive" : "outline"}>
                      {summary?.contactLimits.hcpsAtLimit || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Near Limit</span>
                    <Badge variant="secondary">{summary?.contactLimits.hcpsNearLimit || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Utilization</span>
                    <span className="text-sm font-medium">
                      {(summary?.contactLimits.avgUtilization || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Compliance Windows */}
          {summary?.compliance.windows && summary.compliance.windows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Compliance Windows</CardTitle>
                <CardDescription>Current blackout and restriction periods</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Affected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.compliance.windows.map((window) => (
                      <TableRow key={window.id}>
                        <TableCell className="font-medium">{window.name}</TableCell>
                        <TableCell>
                          <Badge variant={window.windowType === "blackout" ? "destructive" : "secondary"}>
                            {window.windowType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(window.startDate), "MMM d")} -{" "}
                          {format(new Date(window.endDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{window.affectedCount} HCPs</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Capacity Details */}
          {summary?.capacity && summary.capacity.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Channel Capacity Status</CardTitle>
                <CardDescription>Daily, weekly, and monthly utilization by channel</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead>Daily</TableHead>
                      <TableHead>Weekly</TableHead>
                      <TableHead>Monthly</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.capacity.map((cap) => (
                      <TableRow key={cap.channel}>
                        <TableCell className="font-medium capitalize">
                          {cap.channel.replace("_", " ")}
                        </TableCell>
                        <TableCell>
                          {cap.dailyUsed}/{cap.dailyLimit || "∞"}
                        </TableCell>
                        <TableCell>
                          {cap.weeklyUsed}/{cap.weeklyLimit || "∞"}
                        </TableCell>
                        <TableCell>
                          {cap.monthlyUsed}/{cap.monthlyLimit || "∞"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(cap.status)}
                            <span className="text-sm capitalize">{cap.status}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Capacity Tab */}
        <TabsContent value="capacity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Channel Capacity Configuration</CardTitle>
              <CardDescription>
                Set and manage daily, weekly, and monthly limits for each channel
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summary?.capacity && summary.capacity.length > 0 ? (
                <div className="space-y-4">
                  {summary.capacity.map((cap) => (
                    <div key={cap.channel} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold capitalize">{cap.channel.replace("_", " ")}</h3>
                          <p className="text-sm text-muted-foreground">
                            Overall utilization: {cap.utilizationPct.toFixed(1)}%
                          </p>
                        </div>
                        {getStatusIcon(cap.status)}
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Daily</Label>
                          <Progress
                            value={cap.dailyLimit ? (cap.dailyUsed / cap.dailyLimit) * 100 : 0}
                            className="mt-1"
                          />
                          <p className="text-sm mt-1">
                            {cap.dailyUsed} / {cap.dailyLimit || "No limit"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Weekly</Label>
                          <Progress
                            value={cap.weeklyLimit ? (cap.weeklyUsed / cap.weeklyLimit) * 100 : 0}
                            className="mt-1"
                          />
                          <p className="text-sm mt-1">
                            {cap.weeklyUsed} / {cap.weeklyLimit || "No limit"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Monthly</Label>
                          <Progress
                            value={cap.monthlyLimit ? (cap.monthlyUsed / cap.monthlyLimit) * 100 : 0}
                            className="mt-1"
                          />
                          <p className="text-sm mt-1">
                            {cap.monthlyUsed} / {cap.monthlyLimit || "No limit"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No channel capacity limits configured</p>
                  <p className="text-sm">Configure capacity limits to control channel utilization</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget Tab */}
        <TabsContent value="budget" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Budget Allocations</h2>
              <p className="text-muted-foreground">Manage budget constraints by campaign and channel</p>
            </div>
            <Button onClick={() => setShowNewBudgetDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Allocation
            </Button>
          </div>

          {/* Budget Summary */}
          {summary?.budget && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Allocated</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">${summary.budget.totalAllocated.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Spent</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">${summary.budget.totalSpent.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Committed</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">${summary.budget.totalCommitted.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Available</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    ${(summary.budget.totalAllocated - summary.budget.totalSpent - summary.budget.totalCommitted).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Budget Allocations Table */}
          <Card>
            <CardContent className="pt-6">
              {budgetAllocations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Allocated</TableHead>
                      <TableHead>Spent</TableHead>
                      <TableHead>Committed</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgetAllocations.map((alloc) => {
                      const available = alloc.allocatedAmount - alloc.spentAmount - alloc.committedAmount;
                      const utilizationPct = (alloc.spentAmount + alloc.committedAmount) / alloc.allocatedAmount * 100;
                      return (
                        <TableRow key={alloc.id}>
                          <TableCell className="capitalize">{alloc.channel || "All"}</TableCell>
                          <TableCell>
                            {format(new Date(alloc.periodStart), "MMM d")} -{" "}
                            {format(new Date(alloc.periodEnd), "MMM d")}
                          </TableCell>
                          <TableCell>${alloc.allocatedAmount.toLocaleString()}</TableCell>
                          <TableCell>${alloc.spentAmount.toLocaleString()}</TableCell>
                          <TableCell>${alloc.committedAmount.toLocaleString()}</TableCell>
                          <TableCell className="text-green-600 font-medium">
                            ${available.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                utilizationPct >= 90
                                  ? "text-red-600 bg-red-50"
                                  : utilizationPct >= 70
                                  ? "text-yellow-600 bg-yellow-50"
                                  : "text-green-600 bg-green-50"
                              }
                            >
                              {utilizationPct.toFixed(0)}% used
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => setEditingBudget(alloc)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => deleteBudgetMutation.mutate(alloc.id)}
                                disabled={deleteBudgetMutation.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No budget allocations configured</p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowNewBudgetDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Budget Allocation
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Windows Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Compliance Windows</h2>
              <p className="text-muted-foreground">Manage blackout periods and restricted windows</p>
            </div>
            <Button onClick={() => setShowNewWindowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Window
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              {complianceWindows.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complianceWindows.map((window) => {
                      const now = new Date();
                      const startDate = new Date(window.startDate);
                      const endDate = new Date(window.endDate);
                      const isActive = window.isActive && startDate <= now && endDate >= now;
                      const isUpcoming = window.isActive && startDate > now;

                      return (
                        <TableRow key={window.id}>
                          <TableCell className="font-medium">{window.name}</TableCell>
                          <TableCell>
                            <Badge
                              variant={window.windowType === "blackout" ? "destructive" : "secondary"}
                            >
                              {window.windowType}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">
                            {window.channel || "All channels"}
                          </TableCell>
                          <TableCell>
                            {format(startDate, "MMM d, yyyy")} -{" "}
                            {format(endDate, "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>{window.reason || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                isActive
                                  ? "text-red-600 bg-red-50"
                                  : isUpcoming
                                  ? "text-yellow-600 bg-yellow-50"
                                  : "text-gray-600 bg-gray-50"
                              }
                            >
                              {isActive ? "Active" : isUpcoming ? "Upcoming" : "Expired"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => setEditingWindow(window)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => deleteWindowMutation.mutate(window.id)}
                                disabled={deleteWindowMutation.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No compliance windows configured</p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowNewWindowDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Compliance Window
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Limits Tab */}
        <TabsContent value="contacts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>HCP Contact Limits</CardTitle>
              <CardDescription>
                Monitor contact frequency limits and cooldown periods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">HCPs at Monthly Limit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-red-600">
                      {summary?.contactLimits.hcpsAtLimit || 0}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">HCPs Near Limit (80%+)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-yellow-600">
                      {summary?.contactLimits.hcpsNearLimit || 0}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Average Utilization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {(summary?.contactLimits.avgUtilization || 0).toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center py-4 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Contact limits are managed at the HCP level</p>
                <p className="text-sm">View individual HCP profiles to see and manage their contact limits</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Compliance Window Dialog */}
      <Dialog open={showNewWindowDialog} onOpenChange={setShowNewWindowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Compliance Window</DialogTitle>
            <DialogDescription>
              Define a blackout or restricted period for outreach
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createWindowMutation.mutate({
                name: formData.get("name") as string,
                windowType: formData.get("windowType") as string,
                channel: formData.get("channel") as string || undefined,
                startDate: formData.get("startDate") as string,
                endDate: formData.get("endDate") as string,
                reason: formData.get("reason") as string || undefined,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Q1 Holiday Blackout" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="windowType">Type</Label>
              <Select name="windowType" defaultValue="blackout">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blackout">Blackout</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
                  <SelectItem value="preferred">Preferred</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel">Channel (optional)</Label>
              <Select name="channel">
                <SelectTrigger>
                  <SelectValue placeholder="All channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All channels</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="rep_visit">Rep Visit</SelectItem>
                  <SelectItem value="webinar">Webinar</SelectItem>
                  <SelectItem value="conference">Conference</SelectItem>
                  <SelectItem value="digital_ad">Digital Ad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" name="startDate" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" name="endDate" type="date" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input id="reason" name="reason" placeholder="Holiday, Conference, etc." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewWindowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createWindowMutation.isPending}>
                {createWindowMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Window
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Budget Allocation Dialog */}
      <Dialog open={showNewBudgetDialog} onOpenChange={setShowNewBudgetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Budget Allocation</DialogTitle>
            <DialogDescription>
              Allocate budget for a specific period and channel
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createBudgetMutation.mutate({
                periodType: formData.get("periodType") as string,
                channel: formData.get("channel") as string || undefined,
                periodStart: formData.get("periodStart") as string,
                periodEnd: formData.get("periodEnd") as string,
                allocatedAmount: parseFloat(formData.get("allocatedAmount") as string),
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="periodType">Period Type</Label>
              <Select name="periodType" defaultValue="monthly">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="campaign">Campaign</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel">Channel (optional)</Label>
              <Select name="channel">
                <SelectTrigger>
                  <SelectValue placeholder="All channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All channels</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="rep_visit">Rep Visit</SelectItem>
                  <SelectItem value="webinar">Webinar</SelectItem>
                  <SelectItem value="conference">Conference</SelectItem>
                  <SelectItem value="digital_ad">Digital Ad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodStart">Period Start</Label>
                <Input id="periodStart" name="periodStart" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodEnd">Period End</Label>
                <Input id="periodEnd" name="periodEnd" type="date" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="allocatedAmount">Allocated Amount ($)</Label>
              <Input
                id="allocatedAmount"
                name="allocatedAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="10000"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewBudgetDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBudgetMutation.isPending}>
                {createBudgetMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Allocation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Edit Compliance Window Dialog */}
      <Dialog open={!!editingWindow} onOpenChange={(open) => !open && setEditingWindow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Compliance Window</DialogTitle>
            <DialogDescription>
              Modify the compliance window settings
            </DialogDescription>
          </DialogHeader>
          {editingWindow && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                editWindowMutation.mutate({
                  id: editingWindow.id,
                  name: formData.get("name") as string,
                  windowType: formData.get("windowType") as string,
                  channel: formData.get("channel") as string || undefined,
                  startDate: formData.get("startDate") as string,
                  endDate: formData.get("endDate") as string,
                  reason: formData.get("reason") as string || undefined,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" name="name" defaultValue={editingWindow.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-windowType">Type</Label>
                <Select name="windowType" defaultValue={editingWindow.windowType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blackout">Blackout</SelectItem>
                    <SelectItem value="restricted">Restricted</SelectItem>
                    <SelectItem value="preferred">Preferred</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-channel">Channel (optional)</Label>
                <Select name="channel" defaultValue={editingWindow.channel || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="All channels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All channels</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="rep_visit">Rep Visit</SelectItem>
                    <SelectItem value="webinar">Webinar</SelectItem>
                    <SelectItem value="conference">Conference</SelectItem>
                    <SelectItem value="digital_ad">Digital Ad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-startDate">Start Date</Label>
                  <Input
                    id="edit-startDate"
                    name="startDate"
                    type="date"
                    defaultValue={editingWindow.startDate.split("T")[0]}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-endDate">End Date</Label>
                  <Input
                    id="edit-endDate"
                    name="endDate"
                    type="date"
                    defaultValue={editingWindow.endDate.split("T")[0]}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reason">Reason (optional)</Label>
                <Input
                  id="edit-reason"
                  name="reason"
                  defaultValue={editingWindow.reason || ""}
                  placeholder="Holiday, Conference, etc."
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingWindow(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editWindowMutation.isPending}>
                  {editWindowMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Budget Allocation Dialog */}
      <Dialog open={!!editingBudget} onOpenChange={(open) => !open && setEditingBudget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Budget Allocation</DialogTitle>
            <DialogDescription>
              Modify the budget allocation settings
            </DialogDescription>
          </DialogHeader>
          {editingBudget && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                editBudgetMutation.mutate({
                  id: editingBudget.id,
                  periodType: formData.get("periodType") as string,
                  channel: formData.get("channel") as string || undefined,
                  periodStart: formData.get("periodStart") as string,
                  periodEnd: formData.get("periodEnd") as string,
                  allocatedAmount: parseFloat(formData.get("allocatedAmount") as string),
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="edit-periodType">Period Type</Label>
                <Select name="periodType" defaultValue={editingBudget.periodType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="campaign">Campaign</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-budget-channel">Channel (optional)</Label>
                <Select name="channel" defaultValue={editingBudget.channel || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="All channels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All channels</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="rep_visit">Rep Visit</SelectItem>
                    <SelectItem value="webinar">Webinar</SelectItem>
                    <SelectItem value="conference">Conference</SelectItem>
                    <SelectItem value="digital_ad">Digital Ad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-periodStart">Period Start</Label>
                  <Input
                    id="edit-periodStart"
                    name="periodStart"
                    type="date"
                    defaultValue={editingBudget.periodStart.split("T")[0]}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-periodEnd">Period End</Label>
                  <Input
                    id="edit-periodEnd"
                    name="periodEnd"
                    type="date"
                    defaultValue={editingBudget.periodEnd.split("T")[0]}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-allocatedAmount">Allocated Amount ($)</Label>
                <Input
                  id="edit-allocatedAmount"
                  name="allocatedAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={editingBudget.allocatedAmount}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingBudget(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editBudgetMutation.isPending}>
                  {editBudgetMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
