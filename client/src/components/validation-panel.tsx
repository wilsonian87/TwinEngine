/**
 * Validation Panel Component
 *
 * A panel for validating content with real-time results.
 * Can be embedded in content editing views.
 */

import { useState } from "react";
import {
  Shield,
  Loader2,
  RefreshCw,
  History,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  useValidateContent,
  useValidateQuick,
  useValidationHistory,
  useValidationHealth,
} from "@/hooks/use-validation";
import { ValidationResult, ValidationStatusBadge, type ValidationResultData } from "./validation-result";

// ============================================================================
// TYPES
// ============================================================================

type ContentTypeValue = "campaign" | "messaging_theme" | "email" | "landing_page";

interface ValidationPanelProps {
  /** Initial content to validate */
  initialContent?: string;
  /** Content type preset */
  contentType?: ContentTypeValue;
  /** Pre-filled context */
  context?: {
    audienceContext?: {
      audience?: string;
      specialty?: string;
    };
    marketContext?: {
      therapeuticArea?: string;
      brand?: string;
    };
    channelContext?: {
      primaryChannel?: string;
    };
  };
  /** Callback when validation completes */
  onValidationComplete?: (result: ValidationResultData) => void;
  /** For viewing history of a specific content item */
  contentId?: string;
  /** Compact mode for sidebars */
  compact?: boolean;
  /** Hide the content input (for display-only mode) */
  hideInput?: boolean;
  className?: string;
}

const CONTENT_TYPES = [
  { value: "campaign", label: "Campaign" },
  { value: "messaging_theme", label: "Messaging Theme" },
  { value: "email", label: "Email" },
  { value: "landing_page", label: "Landing Page" },
] as const;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ValidationPanel({
  initialContent = "",
  contentType: initialContentType = "campaign",
  context,
  onValidationComplete,
  contentId,
  compact = false,
  hideInput = false,
  className,
}: ValidationPanelProps) {
  const [content, setContent] = useState(initialContent);
  const [contentType, setContentType] = useState(initialContentType);
  const [activeTab, setActiveTab] = useState<"validate" | "history">("validate");
  const [lastResult, setLastResult] = useState<ValidationResultData | null>(null);

  // Validation mutations
  const validateFull = useValidateContent();
  const validateQuick = useValidateQuick();

  // History query (only if contentId provided)
  const { data: history, isLoading: historyLoading } = useValidationHistory(
    contentType,
    contentId || null
  );

  // Health status
  const { data: health } = useValidationHealth();

  const handleValidate = async (quick = false) => {
    const mutation = quick ? validateQuick : validateFull;

    try {
      const result = await mutation.mutateAsync({
        content,
        contentType,
        audienceContext: context?.audienceContext,
        marketContext: context?.marketContext,
        channelContext: context?.channelContext,
      });

      setLastResult(result as ValidationResultData);
      onValidationComplete?.(result as ValidationResultData);
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  const isValidating = validateFull.isPending || validateQuick.isPending;
  const canValidate = content.trim().length >= 10;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Content Validation</CardTitle>
              {!compact && (
                <CardDescription className="text-xs">
                  Check compliance and quality
                </CardDescription>
              )}
            </div>
          </div>
          {health && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={health.status === "healthy" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {health.status === "healthy" ? (
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                  ) : (
                    <Clock className="h-3 w-3 mr-1" />
                  )}
                  {health.availableRules} rules
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Rules version: {health.rulesVersion}</p>
                <p>Circuit: {health.circuit}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {contentId ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="w-full">
              <TabsTrigger value="validate" className="flex-1">
                <Shield className="h-4 w-4 mr-1.5" />
                Validate
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1">
                <History className="h-4 w-4 mr-1.5" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="validate" className="mt-4">
              <ValidationForm
                content={content}
                setContent={setContent}
                contentType={contentType}
                setContentType={setContentType}
                onValidate={handleValidate}
                isValidating={isValidating}
                canValidate={canValidate}
                lastResult={lastResult}
                compact={compact}
                hideInput={hideInput}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <ValidationHistoryView
                history={history || []}
                isLoading={historyLoading}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <ValidationForm
            content={content}
            setContent={setContent}
            contentType={contentType}
            setContentType={setContentType}
            onValidate={handleValidate}
            isValidating={isValidating}
            canValidate={canValidate}
            lastResult={lastResult}
            compact={compact}
            hideInput={hideInput}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface ValidationFormProps {
  content: string;
  setContent: (content: string) => void;
  contentType: ContentTypeValue;
  setContentType: React.Dispatch<React.SetStateAction<ContentTypeValue>>;
  onValidate: (quick?: boolean) => void;
  isValidating: boolean;
  canValidate: boolean;
  lastResult: ValidationResultData | null;
  compact: boolean;
  hideInput: boolean;
}

function ValidationForm({
  content,
  setContent,
  contentType,
  setContentType,
  onValidate,
  isValidating,
  canValidate,
  lastResult,
  compact,
  hideInput,
}: ValidationFormProps) {
  return (
    <div className="space-y-4">
      {!hideInput && (
        <>
          {/* Content Type Selector */}
          <Select value={contentType} onValueChange={(v) => setContentType(v as ContentTypeValue)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Content type" />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Content Input */}
          <Textarea
            placeholder="Enter content to validate..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={cn("resize-none", compact ? "h-24" : "h-32")}
          />
        </>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => onValidate(false)}
          disabled={!canValidate || isValidating}
          className="flex-1"
        >
          {isValidating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-2" />
              Full Validation
            </>
          )}
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onValidate(true)}
              disabled={!canValidate || isValidating}
            >
              <Zap className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Quick validation (fewer rules)</TooltipContent>
        </Tooltip>
      </div>

      {/* Results */}
      {lastResult && (
        <div className="mt-4">
          <ValidationResult
            result={lastResult}
            showDetails={!compact}
            compact={compact}
          />
        </div>
      )}
    </div>
  );
}

interface ValidationHistoryItem {
  id: string;
  status: string;
  score: number;
  rulesVersion: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

function ValidationHistoryView({
  history,
  isLoading,
}: {
  history: ValidationHistoryItem[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No validation history</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-2">
        {history.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ValidationStatusBadge
                status={item.status as "approved" | "needs_review" | "rejected"}
                score={item.score}
              />
              <div className="text-xs text-muted-foreground">
                {new Date(item.createdAt).toLocaleDateString()}
              </div>
            </div>
            {item.reviewedBy && (
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Reviewed
              </Badge>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// ============================================================================
// INLINE VALIDATION BADGE
// ============================================================================

export function InlineValidationStatus({
  contentType,
  contentId,
}: {
  contentType: string;
  contentId: string;
}) {
  const { data: history, isLoading } = useValidationHistory(contentType, contentId);

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  const latest = history?.[0];

  if (!latest) {
    return (
      <Badge variant="outline" className="text-xs">
        Not validated
      </Badge>
    );
  }

  return (
    <ValidationStatusBadge
      status={latest.status as "approved" | "needs_review" | "rejected"}
      score={latest.score}
    />
  );
}

export default ValidationPanel;
