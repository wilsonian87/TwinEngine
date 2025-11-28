import { Save, Shield, Bell, Database, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Settings() {
  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold" data-testid="text-page-title">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure application preferences and governance rules
            </p>
          </div>
          <Button data-testid="button-save-settings">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="max-w-3xl space-y-6 p-6">
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
              <div className="flex items-center justify-between">
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
    </div>
  );
}
