import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  FlaskConical, 
  TrendingUp, 
  TrendingDown,
  ArrowRight,
  Plus,
  Trash2,
  BarChart3,
  Users,
  Target,
  Lightbulb,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw
} from "lucide-react";
import type { 
  CounterfactualScenario, 
  HCPProfile,
  CreateCounterfactualRequest,
  CounterfactualVariable 
} from "@shared/schema";

const variableTypes = [
  { value: "channel_mix", label: "Channel Mix", description: "Adjust channel allocation percentages" },
  { value: "content_type", label: "Content Type", description: "Change content strategy" },
  { value: "call_to_action", label: "Call to Action", description: "Modify CTA messaging" },
  { value: "frequency", label: "Frequency", description: "Adjust contact frequency" },
  { value: "timing", label: "Timing", description: "Change timing of outreach" },
  { value: "messaging", label: "Messaging", description: "Alter messaging approach" },
] as const;

const contentTypes = [
  { value: "clinical_data", label: "Clinical Data & Evidence" },
  { value: "educational", label: "Educational Content" },
  { value: "patient_outcomes", label: "Patient Outcomes" },
  { value: "promotional", label: "Promotional Material" },
];

interface CounterfactualVariableInput {
  id: string;
  variableType: string;
  variableName: string;
  originalValue: string | number | Record<string, number>;
  counterfactualValue: string | number | Record<string, number>;
}

export function CounterfactualBacktesting() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [analysisType, setAnalysisType] = useState<"aggregate" | "individual" | "both">("both");
  const [variables, setVariables] = useState<CounterfactualVariableInput[]>([]);
  const [selectedHcpIds, setSelectedHcpIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("create");

  const { data: hcps = [], isLoading: loadingHcps } = useQuery<HCPProfile[]>({
    queryKey: ["/api/hcps"],
  });

  const { data: scenarios = [], isLoading: loadingScenarios } = useQuery<CounterfactualScenario[]>({
    queryKey: ["/api/counterfactuals"],
  });

  const createMutation = useMutation({
    mutationFn: async (request: CreateCounterfactualRequest) => {
      const response = await apiRequest("POST", "/api/counterfactuals", request);
      return response.json() as Promise<CounterfactualScenario>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/counterfactuals"] });
      toast({
        title: "Analysis Complete",
        description: `Counterfactual scenario "${result.name}" created successfully`,
      });
      setActiveTab("results");
      setName("");
      setDescription("");
      setVariables([]);
      setSelectedHcpIds([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to run counterfactual analysis",
        variant: "destructive",
      });
    },
  });

  const addVariable = () => {
    const newId = `var-${Date.now()}`;
    setVariables([
      ...variables,
      {
        id: newId,
        variableType: "channel_mix",
        variableName: "",
        originalValue: "",
        counterfactualValue: "",
      },
    ]);
  };

  const removeVariable = (id: string) => {
    setVariables(variables.filter((v) => v.id !== id));
  };

  const updateVariable = (id: string, updates: Partial<CounterfactualVariableInput>) => {
    setVariables(variables.map((v) => (v.id === id ? { ...v, ...updates } : v)));
  };

  const coerceValue = (value: string | number | Record<string, number>, variableType: string): string | number | Record<string, number> => {
    if (variableType === "frequency" || variableType === "timing" || variableType === "budget") {
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    }
    return value;
  };

  const runAnalysis = () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a scenario name",
        variant: "destructive",
      });
      return;
    }

    if (variables.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one variable to change",
        variant: "destructive",
      });
      return;
    }

    const validVariables = variables.filter(v => 
      v.originalValue !== "" && v.counterfactualValue !== ""
    );

    if (validVariables.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in values for at least one variable",
        variant: "destructive",
      });
      return;
    }

    const changedVariables: CounterfactualVariable[] = validVariables.map((v) => ({
      variableName: v.variableName || v.variableType,
      originalValue: coerceValue(v.originalValue, v.variableType),
      counterfactualValue: coerceValue(v.counterfactualValue, v.variableType),
      variableType: v.variableType as CounterfactualVariable["variableType"],
    }));

    createMutation.mutate({
      name,
      description: description || undefined,
      targetHcpIds: selectedHcpIds,
      changedVariables,
      analysisType,
    });
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatDelta = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${(value * 100).toFixed(1)}%`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "running":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6" data-testid="counterfactual-backtesting">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <FlaskConical className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Counterfactual Backtesting</h2>
          <p className="text-muted-foreground">Analyze "what-if" scenarios for past campaign decisions</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="create" data-testid="tab-create">
            <Plus className="h-4 w-4 mr-2" />
            New Analysis
          </TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-results">
            <BarChart3 className="h-4 w-4 mr-2" />
            Results ({scenarios.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card data-testid="card-scenario-config">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Scenario Configuration
                </CardTitle>
                <CardDescription>
                  Define what you want to test and how
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="scenario-name">Scenario Name</Label>
                  <Input
                    id="scenario-name"
                    placeholder="e.g., Increased email frequency test"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="input-scenario-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scenario-description">Description (Optional)</Label>
                  <Textarea
                    id="scenario-description"
                    placeholder="Describe what you're testing and why"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="resize-none h-20"
                    data-testid="input-scenario-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Analysis Type</Label>
                  <Select value={analysisType} onValueChange={(v: typeof analysisType) => setAnalysisType(v)}>
                    <SelectTrigger data-testid="select-analysis-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aggregate">Aggregate Only</SelectItem>
                      <SelectItem value="individual">Individual HCP</SelectItem>
                      <SelectItem value="both">Both (Recommended)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    "Both" provides overall impact plus per-HCP breakdown
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-target-audience">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Target Audience
                </CardTitle>
                <CardDescription>
                  Select HCPs to include in the analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHcps ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    Loading HCPs...
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {selectedHcpIds.length === 0
                          ? "All HCPs will be included"
                          : `${selectedHcpIds.length} HCPs selected`}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedHcpIds([])}
                        disabled={selectedHcpIds.length === 0}
                      >
                        Clear
                      </Button>
                    </div>
                    <ScrollArea className="h-48 border rounded-md p-2">
                      <div className="space-y-1">
                        {hcps.slice(0, 30).map((hcp) => (
                          <div
                            key={hcp.id}
                            className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                              selectedHcpIds.includes(hcp.id)
                                ? "bg-primary/10 text-primary"
                                : "hover-elevate"
                            }`}
                            onClick={() => {
                              if (selectedHcpIds.includes(hcp.id)) {
                                setSelectedHcpIds(selectedHcpIds.filter((id) => id !== hcp.id));
                              } else {
                                setSelectedHcpIds([...selectedHcpIds, hcp.id]);
                              }
                            }}
                            data-testid={`hcp-select-${hcp.id}`}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                Dr. {hcp.firstName} {hcp.lastName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {hcp.specialty} | {hcp.tier}
                              </span>
                            </div>
                            {selectedHcpIds.includes(hcp.id) && (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-variables">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Changed Variables
                  </CardTitle>
                  <CardDescription>
                    Define what parameters you would have changed
                  </CardDescription>
                </div>
                <Button onClick={addVariable} variant="outline" size="sm" data-testid="button-add-variable">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variable
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {variables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FlaskConical className="h-12 w-12 mb-3 opacity-50" />
                  <p>No variables configured yet</p>
                  <p className="text-sm">Add variables to define your counterfactual scenario</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {variables.map((variable, index) => (
                    <Card key={variable.id} className="border-dashed" data-testid={`variable-card-${index}`}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-4">
                          <Badge variant="secondary">Variable {index + 1}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeVariable(variable.id)}
                            className="h-8 w-8"
                            data-testid={`button-remove-variable-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Variable Type</Label>
                            <Select
                              value={variable.variableType}
                              onValueChange={(v) => updateVariable(variable.id, { variableType: v })}
                            >
                              <SelectTrigger data-testid={`select-variable-type-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {variableTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Original Value</Label>
                            {variable.variableType === "content_type" ? (
                              <Select
                                value={String(variable.originalValue)}
                                onValueChange={(v) => updateVariable(variable.id, { originalValue: v })}
                              >
                                <SelectTrigger data-testid={`select-original-value-${index}`}>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  {contentTypes.map((ct) => (
                                    <SelectItem key={ct.value} value={ct.value}>
                                      {ct.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : variable.variableType === "frequency" ? (
                              <Input
                                type="number"
                                placeholder="e.g., 2"
                                value={String(variable.originalValue)}
                                onChange={(e) => updateVariable(variable.id, { originalValue: Number(e.target.value) })}
                                data-testid={`input-original-value-${index}`}
                              />
                            ) : (
                              <Input
                                placeholder="Original value"
                                value={String(variable.originalValue)}
                                onChange={(e) => updateVariable(variable.id, { originalValue: e.target.value })}
                                data-testid={`input-original-value-${index}`}
                              />
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <ArrowRight className="h-3 w-3 text-primary" />
                              Counterfactual Value
                            </Label>
                            {variable.variableType === "content_type" ? (
                              <Select
                                value={String(variable.counterfactualValue)}
                                onValueChange={(v) => updateVariable(variable.id, { counterfactualValue: v })}
                              >
                                <SelectTrigger data-testid={`select-counterfactual-value-${index}`}>
                                  <SelectValue placeholder="What if..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {contentTypes.map((ct) => (
                                    <SelectItem key={ct.value} value={ct.value}>
                                      {ct.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : variable.variableType === "frequency" ? (
                              <Input
                                type="number"
                                placeholder="e.g., 4"
                                value={String(variable.counterfactualValue)}
                                onChange={(e) => updateVariable(variable.id, { counterfactualValue: Number(e.target.value) })}
                                data-testid={`input-counterfactual-value-${index}`}
                              />
                            ) : (
                              <Input
                                placeholder="What if this was..."
                                value={String(variable.counterfactualValue)}
                                onChange={(e) => updateVariable(variable.id, { counterfactualValue: e.target.value })}
                                data-testid={`input-counterfactual-value-${index}`}
                              />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={runAnalysis}
              disabled={createMutation.isPending || !name.trim() || variables.length === 0}
              className="gap-2"
              data-testid="button-run-analysis"
            >
              {createMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Running Analysis...
                </>
              ) : (
                <>
                  <FlaskConical className="h-4 w-4" />
                  Run Counterfactual Analysis
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="results" className="mt-6 space-y-6">
          {loadingScenarios ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Loading results...
              </CardContent>
            </Card>
          ) : scenarios.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No counterfactual analyses yet</p>
                <p className="text-sm mt-1">Create your first scenario to see results here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {scenarios.map((scenario) => (
                <Card key={scenario.id} data-testid={`result-card-${scenario.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(scenario.status)}
                        <div>
                          <CardTitle className="text-lg">{scenario.name}</CardTitle>
                          <CardDescription>
                            {scenario.description || `${scenario.targetHcpIds.length} HCPs analyzed`}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {scenario.analysisType}
                        </Badge>
                        <Badge variant="secondary">
                          {new Date(scenario.createdAt).toLocaleDateString()}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          Changed Variables
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              The parameters that were modified in this scenario
                            </TooltipContent>
                          </Tooltip>
                        </h4>
                        <div className="space-y-2">
                          {scenario.changedVariables.map((v, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded-md p-2">
                              <Badge variant="outline" className="capitalize">
                                {v.variableType.replace("_", " ")}
                              </Badge>
                              <span className="text-muted-foreground">{String(v.originalValue)}</span>
                              <ArrowRight className="h-3 w-3 text-primary" />
                              <span className="font-medium">{String(v.counterfactualValue)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold">Outcome Comparison</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase">Baseline</p>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Engagement Rate</span>
                                <span className="font-mono">{formatPercent(scenario.baselineOutcome.engagementRate)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Response Rate</span>
                                <span className="font-mono">{formatPercent(scenario.baselineOutcome.responseRate)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Conversion Rate</span>
                                <span className="font-mono">{formatPercent(scenario.baselineOutcome.conversionRate)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase">Counterfactual</p>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Engagement Rate</span>
                                <span className="font-mono text-primary">
                                  {formatPercent(scenario.counterfactualOutcome.engagementRate)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Response Rate</span>
                                <span className="font-mono text-primary">
                                  {formatPercent(scenario.counterfactualOutcome.responseRate)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Conversion Rate</span>
                                <span className="font-mono text-primary">
                                  {formatPercent(scenario.counterfactualOutcome.conversionRate)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {scenario.upliftDelta && (
                          <>
                            <Separator />
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold flex items-center gap-2">
                                Uplift Impact
                                {scenario.confidenceInterval && (
                                  <span className="text-xs font-normal text-muted-foreground">
                                    [{(scenario.confidenceInterval.lower * 100).toFixed(0)}%, {(scenario.confidenceInterval.upper * 100).toFixed(0)}%] CI
                                  </span>
                                )}
                              </h4>
                              <div className="grid grid-cols-4 gap-3">
                                <div className="text-center p-2 rounded-md bg-muted/50">
                                  <div className={`text-lg font-bold flex items-center justify-center gap-1 ${scenario.upliftDelta.engagementDelta >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {scenario.upliftDelta.engagementDelta >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                    {formatDelta(scenario.upliftDelta.engagementDelta)}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">Engagement</p>
                                </div>
                                <div className="text-center p-2 rounded-md bg-muted/50">
                                  <div className={`text-lg font-bold flex items-center justify-center gap-1 ${scenario.upliftDelta.responseDelta >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {scenario.upliftDelta.responseDelta >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                    {formatDelta(scenario.upliftDelta.responseDelta)}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">Response</p>
                                </div>
                                <div className="text-center p-2 rounded-md bg-muted/50">
                                  <div className={`text-lg font-bold flex items-center justify-center gap-1 ${scenario.upliftDelta.conversionDelta >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {scenario.upliftDelta.conversionDelta >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                    {formatDelta(scenario.upliftDelta.conversionDelta)}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">Conversion</p>
                                </div>
                                <div className="text-center p-2 rounded-md bg-muted/50">
                                  <div className={`text-lg font-bold flex items-center justify-center gap-1 ${scenario.upliftDelta.rxLiftDelta >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {scenario.upliftDelta.rxLiftDelta >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                    {formatDelta(scenario.upliftDelta.rxLiftDelta)}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">Rx Lift</p>
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {scenario.hcpLevelResults && scenario.hcpLevelResults.length > 0 && (
                          <>
                            <Separator />
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold">Per-HCP Impact (Top 5)</h4>
                              <ScrollArea className="h-32">
                                <div className="space-y-1">
                                  {scenario.hcpLevelResults.slice(0, 5).map((result) => {
                                    const hcp = hcps.find((h) => h.id === result.hcpId);
                                    return (
                                      <div key={result.hcpId} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                                        <span className="truncate">
                                          {hcp ? `Dr. ${hcp.firstName} ${hcp.lastName}` : result.hcpId.slice(0, 8)}
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-muted-foreground">{result.baselineScore.toFixed(0)}</span>
                                          <ArrowRight className="h-3 w-3" />
                                          <span className={`font-mono ${result.delta >= 0 ? "text-green-600" : "text-red-600"}`}>
                                            {result.counterfactualScore.toFixed(0)} ({result.delta >= 0 ? "+" : ""}{result.delta.toFixed(1)})
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </ScrollArea>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
