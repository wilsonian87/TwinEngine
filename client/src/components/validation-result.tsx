/**
 * Validation Result Component
 *
 * Displays content validation results including status, score,
 * rule breakdown, and suggested fixes.
 */

import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Shield,
  FileText,
  Target,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface RuleResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  message: string;
  severity: "error" | "warning" | "info";
  category: string;
  suggestion?: string;
}

interface SuggestedFix {
  issue: string;
  suggestion: string;
  severity: "error" | "warning" | "info";
}

export interface ValidationResultData {
  status: "approved" | "needs_review" | "rejected";
  score: number;
  summary: string;
  ruleResults: RuleResult[];
  suggestedFixes?: SuggestedFix[];
  metadata?: {
    rulesVersion: string;
    validatedAt: string;
    processingTimeMs: number;
  };
}

interface ValidationResultProps {
  result: ValidationResultData;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const statusConfig = {
  approved: {
    icon: CheckCircle2,
    label: "Approved",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    badgeVariant: "default" as const,
  },
  needs_review: {
    icon: AlertTriangle,
    label: "Needs Review",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    badgeVariant: "secondary" as const,
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    badgeVariant: "destructive" as const,
  },
};

const severityConfig = {
  error: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  info: {
    icon: Info,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
};

const categoryIcons: Record<string, typeof Shield> = {
  compliance: Shield,
  completeness: FileText,
  consistency: Target,
  quality: MessageSquare,
};

function ScoreGauge({ score, size = "default" }: { score: number; size?: "default" | "small" }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-green-600";
    if (s >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressColor = (s: number) => {
    if (s >= 80) return "bg-green-500";
    if (s >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className={cn("flex items-center gap-3", size === "small" && "gap-2")}>
      <div className={cn("font-mono font-bold", size === "small" ? "text-lg" : "text-2xl", getScoreColor(score))}>
        {score}
      </div>
      <div className="flex-1 min-w-[60px]">
        <Progress
          value={score}
          className={cn("h-2", size === "small" && "h-1.5")}
          style={{
            ["--progress-background" as string]: getProgressColor(score),
          }}
        />
      </div>
    </div>
  );
}

function RuleResultItem({ rule }: { rule: RuleResult }) {
  const [isOpen, setIsOpen] = useState(false);
  const severity = severityConfig[rule.severity];
  const SeverityIcon = severity.icon;
  const CategoryIcon = categoryIcons[rule.category] || FileText;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
            "hover:bg-muted/50",
            !rule.passed && severity.bgColor
          )}
        >
          {rule.passed ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          ) : (
            <SeverityIcon className={cn("h-4 w-4 shrink-0", severity.color)} />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{rule.ruleName}</span>
              <Badge variant="outline" className="text-xs shrink-0">
                <CategoryIcon className="h-3 w-3 mr-1" />
                {rule.category}
              </Badge>
            </div>
          </div>
          {(rule.suggestion || !rule.passed) && (
            isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-9 pr-2 pb-2 space-y-2">
          <p className="text-sm text-muted-foreground">{rule.message}</p>
          {rule.suggestion && (
            <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-md">
              <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800">{rule.suggestion}</p>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ValidationResult({
  result,
  showDetails = true,
  compact = false,
  className,
}: ValidationResultProps) {
  const [detailsOpen, setDetailsOpen] = useState(showDetails);
  const status = statusConfig[result.status];
  const StatusIcon = status.icon;

  const passedCount = result.ruleResults.filter((r) => r.passed).length;
  const failedCount = result.ruleResults.filter((r) => !r.passed).length;
  const errorCount = result.ruleResults.filter((r) => !r.passed && r.severity === "error").length;
  const warningCount = result.ruleResults.filter((r) => !r.passed && r.severity === "warning").length;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 p-3 rounded-lg border", status.bgColor, status.borderColor, className)}>
        <StatusIcon className={cn("h-5 w-5", status.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{status.label}</span>
            <Badge variant={status.badgeVariant} className="text-xs">
              {result.score}%
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{result.summary}</p>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className={cn("pb-3", status.bgColor)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className={cn("h-6 w-6", status.color)} />
            <div>
              <CardTitle className="text-lg">{status.label}</CardTitle>
              <p className="text-sm text-muted-foreground">{result.summary}</p>
            </div>
          </div>
          <div className="text-right">
            <ScoreGauge score={result.score} />
            <p className="text-xs text-muted-foreground mt-1">
              {passedCount}/{result.ruleResults.length} checks passed
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Summary Stats */}
        <div className="flex items-center gap-4 mb-4">
          {errorCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-600">{errorCount} errors</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Must be fixed before approval</TooltipContent>
            </Tooltip>
          )}
          {warningCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-600">{warningCount} warnings</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Should be reviewed</TooltipContent>
            </Tooltip>
          )}
          {passedCount > 0 && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">{passedCount} passed</span>
            </div>
          )}
        </div>

        {/* Suggested Fixes */}
        {result.suggestedFixes && result.suggestedFixes.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Suggested Fixes</span>
            </div>
            <ul className="space-y-1">
              {result.suggestedFixes.map((fix, i) => (
                <li key={i} className="text-sm text-blue-700">
                  • {fix.suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rule Details */}
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span>Rule Details</span>
              {detailsOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-1 max-h-[300px] overflow-y-auto">
              {result.ruleResults.map((rule) => (
                <RuleResultItem key={rule.ruleId} rule={rule} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Metadata */}
        {result.metadata && (
          <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>Rules v{result.metadata.rulesVersion}</span>
            <span>{result.metadata.processingTimeMs}ms</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

export function ValidationStatusBadge({
  status,
  score,
  showScore = true,
}: {
  status: "approved" | "needs_review" | "rejected";
  score?: number;
  showScore?: boolean;
}) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Badge variant={config.badgeVariant} className="gap-1">
      <StatusIcon className="h-3 w-3" />
      {config.label}
      {showScore && score !== undefined && (
        <span className="ml-1 opacity-80">({score}%)</span>
      )}
    </Badge>
  );
}

export default ValidationResult;
