import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Shield,
  Download,
  Search,
  Filter,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================================================
// TYPES
// ============================================================================

interface AuditLogUser {
  id: string;
  username: string;
}

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: AuditLogUser | null;
}

interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

interface FilterOptions {
  actions: string[];
  entityTypes: string[];
  users: AuditLogUser[];
}

interface AuditStats {
  total: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  byUser: Record<string, number>;
  npi: {
    totalNpiLogs: number;
    byAction: Record<string, number>;
    byUser: Record<string, number>;
  };
}

// ============================================================================
// HOOKS
// ============================================================================

function useAuditLogs(params: {
  action?: string;
  entityType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  containsNpi?: boolean;
  search?: string;
  limit: number;
  offset: number;
}) {
  const searchParams = new URLSearchParams();

  if (params.action) searchParams.set("action", params.action);
  if (params.entityType) searchParams.set("entityType", params.entityType);
  if (params.userId) searchParams.set("userId", params.userId);
  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);
  if (params.containsNpi) searchParams.set("containsNpi", "true");
  if (params.search) searchParams.set("search", params.search);
  searchParams.set("limit", params.limit.toString());
  searchParams.set("offset", params.offset.toString());

  return useQuery<AuditLogResponse>({
    queryKey: ["admin-audit-logs", params],
    queryFn: async () => {
      const response = await fetch(`/api/admin/audit-logs?${searchParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }
      return response.json();
    },
  });
}

function useFilterOptions() {
  return useQuery<FilterOptions>({
    queryKey: ["admin-audit-filters"],
    queryFn: async () => {
      const response = await fetch("/api/admin/audit-logs/filters");
      if (!response.ok) {
        throw new Error("Failed to fetch filter options");
      }
      return response.json();
    },
  });
}

function useAuditStats(startDate?: string, endDate?: string) {
  const searchParams = new URLSearchParams();
  if (startDate) searchParams.set("startDate", startDate);
  if (endDate) searchParams.set("endDate", endDate);

  return useQuery<AuditStats>({
    queryKey: ["admin-audit-stats", startDate, endDate],
    queryFn: async () => {
      const response = await fetch(`/api/admin/audit-logs/stats?${searchParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch audit stats");
      }
      return response.json();
    },
  });
}

// ============================================================================
// COMPONENTS
// ============================================================================

function ActionBadge({ action }: { action: string }) {
  const getVariant = () => {
    if (action.startsWith("auth.")) return "default";
    if (action.startsWith("export.") || action.startsWith("hcp.exported")) return "secondary";
    if (action.startsWith("approval.")) return "outline";
    if (action.startsWith("webhook.")) return "default";
    if (action.includes("error") || action.includes("failed")) return "destructive";
    return "outline";
  };

  return <Badge variant={getVariant()}>{action}</Badge>;
}

function NpiBadge({ details }: { details: Record<string, unknown> | null }) {
  if (!details?.contains_npi) return null;
  return (
    <Badge variant="destructive" className="ml-2">
      <AlertTriangle className="h-3 w-3 mr-1" />
      NPI
    </Badge>
  );
}

function AuditLogDetailSheet({
  log,
  open,
  onClose,
}: {
  log: AuditLog | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!log) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Audit Log Details
          </SheetTitle>
          <SheetDescription>
            Log ID: {log.id}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Action & Entity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Action</Label>
              <div className="mt-1">
                <ActionBadge action={log.action} />
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Entity Type</Label>
              <p className="text-sm mt-1">{log.entityType}</p>
            </div>
          </div>

          {/* Entity ID */}
          {log.entityId && (
            <div>
              <Label className="text-muted-foreground text-xs">Entity ID</Label>
              <p className="text-sm font-mono mt-1">{log.entityId}</p>
            </div>
          )}

          {/* Timestamp */}
          <div>
            <Label className="text-muted-foreground text-xs">Timestamp</Label>
            <p className="text-sm mt-1">
              {format(new Date(log.createdAt), "PPpp")}
            </p>
          </div>

          {/* User */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">User</Label>
              <p className="text-sm mt-1">
                {log.user ? log.user.username : log.userId || "System"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">IP Address</Label>
              <p className="text-sm font-mono mt-1">{log.ipAddress || "N/A"}</p>
            </div>
          </div>

          {/* User Agent */}
          {log.userAgent && (
            <div>
              <Label className="text-muted-foreground text-xs">User Agent</Label>
              <p className="text-sm font-mono mt-1 break-all">{log.userAgent}</p>
            </div>
          )}

          {/* NPI Warning */}
          {Boolean(log.details?.contains_npi) && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Contains NPI Data</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                This action involved National Provider Identifier (NPI) data.
              </p>
            </div>
          )}

          {/* Details JSON */}
          {log.details && Object.keys(log.details).length > 0 && (
            <div>
              <Label className="text-muted-foreground text-xs">Details</Label>
              <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatsCards({ stats, isLoading }: { stats?: AuditStats; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Unique Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Object.keys(stats.byAction).length}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Active Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Object.keys(stats.byUser).length}
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-destructive flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            NPI Access Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {stats.npi.totalNpiLogs.toLocaleString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AuditLogPage() {
  // Filter state
  const [action, setAction] = useState<string>("");
  const [entityType, setEntityType] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [containsNpi, setContainsNpi] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Detail sheet
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Filter panel
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Queries
  const { data: filterOptions, isLoading: filterOptionsLoading } = useFilterOptions();
  const { data: stats, isLoading: statsLoading } = useAuditStats(startDate, endDate);
  const {
    data: logsData,
    isLoading: logsLoading,
    refetch,
  } = useAuditLogs({
    action: action || undefined,
    entityType: entityType || undefined,
    userId: userId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    containsNpi: containsNpi || undefined,
    search: search || undefined,
    limit: pageSize,
    offset: page * pageSize,
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (entityType) params.set("entityType", entityType);
    if (userId) params.set("userId", userId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (containsNpi) params.set("containsNpi", "true");
    if (search) params.set("search", search);

    window.open(`/api/admin/audit-logs/export?${params}`, "_blank");
  };

  const clearFilters = () => {
    setAction("");
    setEntityType("");
    setUserId("");
    setStartDate("");
    setEndDate("");
    setContainsNpi(false);
    setSearch("");
    setSearchInput("");
    setPage(0);
  };

  const totalPages = logsData ? Math.ceil(logsData.total / pageSize) : 0;

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and export system audit trail for compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} isLoading={statsLoading} />

      {/* Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </CardTitle>
                <Button variant="ghost" size="sm">
                  {filtersOpen ? "Hide" : "Show"}
                </Button>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div className="lg:col-span-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      id="search"
                      placeholder="Search actions, entities, or details..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <Button onClick={handleSearch}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Action */}
                <div>
                  <Label htmlFor="action">Action</Label>
                  <Select value={action} onValueChange={(v) => { setAction(v); setPage(0); }}>
                    <SelectTrigger id="action" className="mt-1.5">
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All actions</SelectItem>
                      {filterOptions?.actions.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Entity Type */}
                <div>
                  <Label htmlFor="entityType">Entity Type</Label>
                  <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(0); }}>
                    <SelectTrigger id="entityType" className="mt-1.5">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All types</SelectItem>
                      {filterOptions?.entityTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* User */}
                <div>
                  <Label htmlFor="user">User</Label>
                  <Select value={userId} onValueChange={(v) => { setUserId(v); setPage(0); }}>
                    <SelectTrigger id="user" className="mt-1.5">
                      <SelectValue placeholder="All users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All users</SelectItem>
                      {filterOptions?.users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date */}
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                    className="mt-1.5"
                  />
                </div>

                {/* End Date */}
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                    className="mt-1.5"
                  />
                </div>

                {/* Contains NPI */}
                <div className="flex items-end pb-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="containsNpi"
                      checked={containsNpi}
                      onCheckedChange={(checked) => {
                        setContainsNpi(checked === true);
                        setPage(0);
                      }}
                    />
                    <Label
                      htmlFor="containsNpi"
                      className="text-sm font-normal cursor-pointer flex items-center gap-1"
                    >
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Contains NPI only
                    </Label>
                  </div>
                </div>
              </div>

              {/* Clear filters */}
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear filters
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Results */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                {logsLoading ? (
                  <Skeleton className="h-5 w-32" />
                ) : (
                  `${logsData?.total.toLocaleString() || 0} logs found`
                )}
              </CardTitle>
              {logsData && logsData.total > 0 && (
                <CardDescription>
                  Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, logsData.total)}
                </CardDescription>
              )}
            </div>
            {/* Pagination */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="w-[120px]">IP Address</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsLoading ? (
                [...Array(10)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : logsData?.logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No audit logs found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                logsData?.logs.map((log) => (
                  <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono text-xs">
                      {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={log.action} />
                      <NpiBadge details={log.details} />
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{log.entityType}</span>
                      {log.entityId && (
                        <span className="ml-1 font-mono text-xs">
                          #{log.entityId.substring(0, 8)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.user?.username || log.userId?.substring(0, 8) || "System"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.ipAddress || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <AuditLogDetailSheet
        log={selectedLog}
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}
