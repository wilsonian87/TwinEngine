/**
 * Getting Started Card
 *
 * Onboarding checklist for new users to help them
 * get familiar with key platform features.
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Rocket,
  Users,
  FlaskConical,
  Bell,
  Download,
  CheckCircle2,
  Circle,
  X,
  ChevronRight,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// ============================================================================
// TYPES
// ============================================================================

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  checkEndpoint?: string;
}

interface OnboardingProgress {
  completedSteps: string[];
  dismissed: boolean;
  dismissedAt?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = "twinengine-onboarding";

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "explore-hcps",
    label: "Explore HCP Profiles",
    description: "Browse and filter healthcare professional data",
    icon: Users,
    href: "/",
  },
  {
    id: "create-audience",
    label: "Build Your First Audience",
    description: "Create a targeted HCP segment for campaigns",
    icon: Users,
    href: "/audience-builder",
  },
  {
    id: "run-simulation",
    label: "Run a Simulation",
    description: "Forecast campaign performance with predictive models",
    icon: FlaskConical,
    href: "/simulations",
  },
  {
    id: "setup-alert",
    label: "Configure an Alert",
    description: "Get notified when metrics cross thresholds",
    icon: Bell,
    href: "/alerts",
  },
  {
    id: "export-data",
    label: "Export Your Data",
    description: "Download reports or push to integrations",
    icon: Download,
    href: "/settings/webhooks",
  },
];

// ============================================================================
// HOOKS
// ============================================================================

function useOnboardingProgress() {
  const [progress, setProgress] = useState<OnboardingProgress>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load onboarding progress:", e);
    }
    return { completedSteps: [], dismissed: false };
  });

  const saveProgress = (newProgress: OnboardingProgress) => {
    setProgress(newProgress);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
    } catch (e) {
      console.error("Failed to save onboarding progress:", e);
    }
  };

  const markComplete = (stepId: string) => {
    if (!progress.completedSteps.includes(stepId)) {
      saveProgress({
        ...progress,
        completedSteps: [...progress.completedSteps, stepId],
      });
    }
  };

  const dismiss = () => {
    saveProgress({
      ...progress,
      dismissed: true,
      dismissedAt: new Date().toISOString(),
    });
  };

  const reset = () => {
    saveProgress({ completedSteps: [], dismissed: false });
  };

  return { progress, markComplete, dismiss, reset };
}

function useAutoDetectProgress() {
  // Auto-detect completed steps based on existing data
  const { data: audiences } = useQuery<{ id: string }[]>({
    queryKey: ["/api/audiences"],
    retry: false,
  });

  const { data: simulations } = useQuery<{ id: string }[]>({
    queryKey: ["/api/simulations"],
    retry: false,
  });

  const { data: alertRules } = useQuery<{ id: string }[]>({
    queryKey: ["/api/alerts/rules"],
    retry: false,
  });

  const { data: exportJobs } = useQuery<{ id: string }[]>({
    queryKey: ["/api/exports/jobs"],
    retry: false,
  });

  return {
    hasAudiences: (audiences?.length || 0) > 0,
    hasSimulations: (simulations?.length || 0) > 0,
    hasAlerts: (alertRules?.length || 0) > 0,
    hasExports: (exportJobs?.length || 0) > 0,
  };
}

// ============================================================================
// COMPONENTS
// ============================================================================

function StepItem({
  step,
  isComplete,
  onComplete,
}: {
  step: OnboardingStep;
  isComplete: boolean;
  onComplete: () => void;
}) {
  const Icon = step.icon;

  return (
    <Link href={step.href} onClick={onComplete}>
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer group",
          isComplete
            ? "bg-green-50 dark:bg-green-950/30"
            : "hover:bg-muted"
        )}
      >
        <div
          className={cn(
            "flex-shrink-0 p-2 rounded-lg",
            isComplete
              ? "bg-green-100 dark:bg-green-900/50 text-green-600"
              : "bg-primary/10 text-primary group-hover:bg-primary/20"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "font-medium text-sm",
              isComplete && "text-green-700 dark:text-green-300"
            )}
          >
            {step.label}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {step.description}
          </div>
        </div>
        {isComplete ? (
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        )}
      </div>
    </Link>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GettingStartedCard() {
  const { progress, markComplete, dismiss, reset } = useOnboardingProgress();
  const autoProgress = useAutoDetectProgress();

  // Auto-mark steps as complete based on detected data
  useEffect(() => {
    if (autoProgress.hasAudiences && !progress.completedSteps.includes("create-audience")) {
      markComplete("create-audience");
    }
    if (autoProgress.hasSimulations && !progress.completedSteps.includes("run-simulation")) {
      markComplete("run-simulation");
    }
    if (autoProgress.hasAlerts && !progress.completedSteps.includes("setup-alert")) {
      markComplete("setup-alert");
    }
    if (autoProgress.hasExports && !progress.completedSteps.includes("export-data")) {
      markComplete("export-data");
    }
  }, [autoProgress, progress.completedSteps, markComplete]);

  // Don't show if dismissed
  if (progress.dismissed) {
    return null;
  }

  const completedCount = progress.completedSteps.length;
  const totalSteps = ONBOARDING_STEPS.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);
  const allComplete = completedCount === totalSteps;

  // Show celebration state when all complete (with reset option for demos)
  if (allComplete) {
    return (
      <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
        <CardContent className="pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-green-600 dark:text-green-400">
                All set! You've explored the platform.
              </div>
              <p className="text-sm text-muted-foreground">
                You're ready to make an impact.
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary"
                onClick={reset}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset for demo
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={dismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Getting Started</CardTitle>
              <p className="text-sm text-muted-foreground">
                Complete these steps to get the most out of TwinEngine
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={reset}
              title="Reset checklist for demo"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={dismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Your progress</span>
            <span className="font-medium">
              {completedCount} of {totalSteps} complete
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Steps list */}
        <div className="space-y-1">
          {ONBOARDING_STEPS.map((step) => (
            <StepItem
              key={step.id}
              step={step}
              isComplete={progress.completedSteps.includes(step.id)}
              onComplete={() => markComplete(step.id)}
            />
          ))}
        </div>

        {/* Dismiss option */}
        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={dismiss}
          >
            I'm familiar with the platform, hide this
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact version for sidebar or smaller spaces
 */
export function GettingStartedCompact() {
  const { progress, dismiss } = useOnboardingProgress();

  if (progress.dismissed) {
    return null;
  }

  const completedCount = progress.completedSteps.length;
  const totalSteps = ONBOARDING_STEPS.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  if (completedCount === totalSteps) {
    return null;
  }

  return (
    <Link href="/dashboard">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer group">
        <div className="p-1.5 rounded-md bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">Getting Started</div>
          <div className="text-xs text-muted-foreground">
            {completedCount}/{totalSteps} steps complete
          </div>
        </div>
        <div className="w-10">
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      </div>
    </Link>
  );
}
