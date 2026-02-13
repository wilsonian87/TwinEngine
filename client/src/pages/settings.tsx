import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Save, Shield, Bell, Database, Users, FileText, Clock, Filter, Download, Eye, Play, Upload, Search, Activity, CheckCircle, AlertCircle, Server, KeyRound, Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
import { format, formatDistanceToNow, parseISO } from "date-fns";
import type { AuditLog, HCPProfile } from "@shared/schema";
import { InviteManager } from "@/components/invite-manager";
import { IntegrationManager } from "@/components/integration-manager";

// Determine environment from window location or env
function getEnvironment(): "development" | "staging" | "production" {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
  if (hostname === "localhost" || hostname === "127.0.0.1") return "development";
  if (hostname.includes("staging") || hostname.includes("demo")) return "staging";
  return "production";
}

const envConfig = {
  development: { label: "Development", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  staging: { label: "Staging", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  production: { label: "Production", color: "bg-green-500/10 text-green-600 border-green-500/20" },
};

const actionIcons: Record<string, typeof Eye> = {
  view: Eye,
  simulation_run: Play,
  export: Download,
  lookalike_search: Search,
  filter: Filter,
};

const actionColors: Record<string, string> = {
  view: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  simulation_run: "bg-green-500/10 text-green-600 dark:text-green-400",
  export: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  lookalike_search: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  filter: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

function AuditLogViewer() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs"],
  });

  const filteredLogs = (logs ?? []).filter((log) => {
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    if (entityFilter !== "all" && log.entityType !== entityFilter) return false;
    return true;
  });

  const uniqueActions = Array.from(new Set((logs ?? []).map((l) => l.action)));
  const uniqueEntities = Array.from(new Set((logs ?? []).map((l) => l.entityType)));

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-36" data-testid="select-action-filter">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-40" data-testid="select-entity-filter">
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {uniqueEntities.map((entity) => (
              <SelectItem key={entity} value={entity}>
                {entity.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground">
          {filteredLogs?.length || 0} entries
        </div>
      </div>

      <ScrollArea className="h-[400px] rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead className="w-32">Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="w-40 text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs?.map((log) => {
                const IconComponent = actionIcons[log.action] || FileText;
                const colorClass = actionColors[log.action] || actionColors.view;
                
                return (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    data-testid={`row-audit-log-${log.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${colorClass}`}>
                          <IconComponent className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-sm capitalize">
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm">
                          {log.entityType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                        {log.entityId && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {log.entityId.substring(0, 8)}...
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.details && typeof log.details === "object" && !Array.isArray(log.details) && (
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(log.details).slice(0, 3).map(([key, value]) => (
                            <Badge 
                              key={key} 
                              variant="secondary" 
                              className="text-xs font-normal"
                            >
                              {key}: {typeof value === "object" ? JSON.stringify(value) : String(value)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-sm">
                          {formatDistanceToNow(parseISO(log.createdAt), { addSuffix: true })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(log.createdAt), "MMM d, HH:mm")}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

function SystemStatusView() {
  const environment = getEnvironment();
  const envInfo = envConfig[environment];

  // Fetch HCPs to get data freshness
  const { data: hcps = [], isLoading: hcpsLoading } = useQuery<HCPProfile[]>({
    queryKey: ["/api/hcps"],
    queryFn: async () => {
      const response = await fetch("/api/hcps");
      if (!response.ok) throw new Error("Failed to fetch HCPs");
      return response.json();
    },
  });

  // Fetch model health
  const { data: modelHealth, isLoading: modelLoading } = useQuery({
    queryKey: ["/api/model-health"],
    queryFn: async () => {
      const response = await fetch("/api/model-health");
      if (!response.ok) throw new Error("Failed to fetch model health");
      return response.json();
    },
  });

  // Calculate data freshness
  const latestUpdate = hcps.length > 0
    ? new Date(Math.max(...hcps.map((h) => new Date(h.lastUpdated).getTime())))
    : null;

  const isLoading = hcpsLoading || modelLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Environment & Version */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            <CardTitle>Environment</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-md border p-4">
              <span className="text-sm text-muted-foreground">Environment</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={envInfo.color}>
                  {envInfo.label}
                </Badge>
              </div>
            </div>
            <div className="rounded-md border p-4">
              <span className="text-sm text-muted-foreground">Version</span>
              <p className="font-medium mt-1">1.0.0</p>
            </div>
            <div className="rounded-md border p-4">
              <span className="text-sm text-muted-foreground">Build</span>
              <p className="font-medium mt-1 font-mono text-sm">{new Date().toISOString().split("T")[0]}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Freshness */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Data Freshness</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-md border p-4">
              <span className="text-sm text-muted-foreground">HCP Profiles</span>
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">{hcps.length} records</span>
              </div>
              {latestUpdate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Updated {formatDistanceToNow(latestUpdate, { addSuffix: true })}
                </p>
              )}
            </div>
            <div className="rounded-md border p-4">
              <span className="text-sm text-muted-foreground">Model Data</span>
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">Synced</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Last sync: Today
              </p>
            </div>
            <div className="rounded-md border p-4">
              <span className="text-sm text-muted-foreground">Feature Store</span>
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">Active</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Auto-refresh enabled
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Health */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Model Health</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-md border p-4">
              <span className="text-sm text-muted-foreground">Status</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                  Healthy
                </Badge>
              </div>
            </div>
            <div className="rounded-md border p-4">
              <span className="text-sm text-muted-foreground">Total Predictions</span>
              <p className="font-medium mt-1">{modelHealth?.totalPredictions || 0}</p>
            </div>
            <div className="rounded-md border p-4">
              <span className="text-sm text-muted-foreground">Accuracy (MAE)</span>
              <p className="font-medium mt-1">
                {modelHealth?.avgEngagementMAE ? `${modelHealth.avgEngagementMAE.toFixed(1)}%` : "N/A"}
              </p>
            </div>
            <div className="rounded-md border p-4">
              <span className="text-sm text-muted-foreground">Drift Status</span>
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">No drift</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Services */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle>System Services</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "Database (PostgreSQL)", status: "operational" },
              { name: "Prediction Engine", status: "operational" },
              { name: "Channel Health Service", status: "operational" },
              { name: "NBA Engine", status: "operational" },
              { name: "NL Query Parser", status: "operational" },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm">{service.name}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-xs text-muted-foreground capitalize">{service.status}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Settings() {
  const environment = getEnvironment();
  const envInfo = envConfig[environment];

  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-semibold" data-testid="text-page-title">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Configure application preferences and governance rules
              </p>
            </div>
            <Badge variant="outline" className={`${envInfo.color} border`}>
              {envInfo.label}
            </Badge>
          </div>
          <Button data-testid="button-save-settings">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList data-testid="tabs-settings">
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Database className="mr-2 h-4 w-4" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="integrations" data-testid="tab-integrations">
              <Link2 className="mr-2 h-4 w-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="invites" data-testid="tab-invites">
              <KeyRound className="mr-2 h-4 w-4" />
              Invites
            </TabsTrigger>
            <TabsTrigger value="status" data-testid="tab-status">
              <Activity className="mr-2 h-4 w-4" />
              System Status
            </TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-audit">
              <FileText className="mr-2 h-4 w-4" />
              Audit Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">
            <div className="max-w-3xl space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle>Governance & Compliance</CardTitle>
                  </div>
                  <CardDescription>
                    Data usage policies and model behavior guardrails
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enforce Data Minimization</Label>
                      <p className="text-sm text-muted-foreground">
                        Only use features required for approved use cases
                      </p>
                    </div>
                    <Switch defaultChecked data-testid="switch-data-minimization" />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Audit Logging</Label>
                      <p className="text-sm text-muted-foreground">
                        Log all simulation runs and data access
                      </p>
                    </div>
                    <Switch defaultChecked data-testid="switch-audit-logging" />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Block Protected Attribute Inference</Label>
                      <p className="text-sm text-muted-foreground">
                        Prevent model from inferring protected characteristics
                      </p>
                    </div>
                    <Switch defaultChecked data-testid="switch-protected-attributes" />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Approved Use Cases</Label>
                    <div className="rounded-md border p-3">
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-chart-1" />
                          Channel optimization for engagement
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-chart-1" />
                          Campaign scenario simulation
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-chart-1" />
                          Lookalike audience identification
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-destructive" />
                          <span className="text-muted-foreground line-through">Pricing/reimbursement decisions</span>
                          <span className="text-xs text-destructive">(Prohibited)</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    <CardTitle>Model Configuration</CardTitle>
                  </div>
                  <CardDescription>
                    Simulation engine and prediction model settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Default Simulation Duration</Label>
                      <Select defaultValue="3">
                        <SelectTrigger data-testid="select-default-duration">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 month</SelectItem>
                          <SelectItem value="3">3 months</SelectItem>
                          <SelectItem value="6">6 months</SelectItem>
                          <SelectItem value="12">12 months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Prediction Confidence Threshold</Label>
                      <Select defaultValue="70">
                        <SelectTrigger data-testid="select-confidence-threshold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="50">50% (Low)</SelectItem>
                          <SelectItem value="70">70% (Medium)</SelectItem>
                          <SelectItem value="85">85% (High)</SelectItem>
                          <SelectItem value="95">95% (Very High)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Uplift Modeling</Label>
                      <p className="text-sm text-muted-foreground">
                        Calculate incremental impact vs. control
                      </p>
                    </div>
                    <Switch defaultChecked data-testid="switch-uplift-modeling" />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-Refresh Feature Store</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically sync data sources daily
                      </p>
                    </div>
                    <Switch defaultChecked data-testid="switch-auto-refresh" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    <CardTitle>Notifications</CardTitle>
                  </div>
                  <CardDescription>
                    Alert preferences for simulation completion and anomalies
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Simulation Complete Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify when simulations finish running
                      </p>
                    </div>
                    <Switch defaultChecked data-testid="switch-sim-alerts" />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Data Quality Warnings</Label>
                      <p className="text-sm text-muted-foreground">
                        Alert on data pipeline issues or gaps
                      </p>
                    </div>
                    <Switch defaultChecked data-testid="switch-quality-warnings" />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Model Drift Detection</Label>
                      <p className="text-sm text-muted-foreground">
                        Alert when prediction accuracy degrades
                      </p>
                    </div>
                    <Switch data-testid="switch-drift-detection" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle>Access Control</CardTitle>
                  </div>
                  <CardDescription>
                    User permissions and role-based access
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">Enterprise SSO</p>
                        <p className="text-sm text-muted-foreground">
                          Configure single sign-on integration
                        </p>
                      </div>
                      <Button variant="outline" size="sm" data-testid="button-configure-sso">
                        Configure
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="integrations">
            <IntegrationManager />
          </TabsContent>

          <TabsContent value="invites">
            <InviteManager />
          </TabsContent>

          <TabsContent value="status" className="space-y-6">
            <SystemStatusView />
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle>Audit Log</CardTitle>
                      <CardDescription>
                        Complete history of user actions and data access
                      </CardDescription>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-export-logs">
                    <Download className="mr-2 h-4 w-4" />
                    Export Logs
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <AuditLogViewer />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
