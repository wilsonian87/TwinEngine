/**
 * Theme Saturation Alert Component
 *
 * Phase 12B.3: Inline warnings for NBA recommendations based on message saturation.
 * Shows contextual alerts when themes are saturated or approaching fatigue.
 */

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Ban,
  Lightbulb,
  TrendingDown,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SaturationRiskLevel } from "@shared/schema";

// ============================================================================
// TYPES
// ============================================================================

export type SaturationWarningType =
  | "do_not_push"
  | "shift_to_alternative"
  | "approaching_saturation"
  | "safe_to_reinforce"
  | "underexposed";

export interface SaturationWarning {
  type: SaturationWarningType;
  severity: "critical" | "warning" | "info";
  themeId: string;
  themeName: string;
  currentMsi: number;
  message: string;
  recommendedAction: string;
  alternativeThemes?: {
    id: string;
    name: string;
    msi: number;
    category: string;
  }[];
}

export interface ThemeSaturationAlertProps {
  warning: SaturationWarning;
  compact?: boolean;
  showAlternatives?: boolean;
  onThemeSelect?: (themeId: string) => void;
  className?: string;
}

export interface SaturationBadgeProps {
  msi: number;
  riskLevel: SaturationRiskLevel;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export interface SaturationIndicatorProps {
  warnings: SaturationWarning[];
  compact?: boolean;
  className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getWarningIcon(type: SaturationWarningType) {
  switch (type) {
    case "do_not_push":
      return Ban;
    case "shift_to_alternative":
      return AlertTriangle;
    case "approaching_saturation":
      return TrendingDown;
    case "safe_to_reinforce":
      return CheckCircle;
    case "underexposed":
      return Sparkles;
    default:
      return Info;
  }
}

function getWarningColors(type: SaturationWarningType) {
  switch (type) {
    case "do_not_push":
      return {
        bg: "bg-red-500/10 dark:bg-red-500/20",
        border: "border-red-500/30",
        text: "text-red-600 dark:text-red-400",
        icon: "text-red-500",
      };
    case "shift_to_alternative":
      return {
        bg: "bg-amber-500/10 dark:bg-amber-500/20",
        border: "border-amber-500/30",
        text: "text-amber-600 dark:text-amber-400",
        icon: "text-amber-500",
      };
    case "approaching_saturation":
      return {
        bg: "bg-orange-500/10 dark:bg-orange-500/20",
        border: "border-orange-500/30",
        text: "text-orange-600 dark:text-orange-400",
        icon: "text-orange-500",
      };
    case "safe_to_reinforce":
      return {
        bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
        border: "border-emerald-500/30",
        text: "text-emerald-600 dark:text-emerald-400",
        icon: "text-emerald-500",
      };
    case "underexposed":
      return {
        bg: "bg-sky-500/10 dark:bg-sky-500/20",
        border: "border-sky-500/30",
        text: "text-sky-600 dark:text-sky-400",
        icon: "text-sky-500",
      };
    default:
      return {
        bg: "bg-slate-500/10",
        border: "border-slate-500/30",
        text: "text-slate-600 dark:text-slate-400",
        icon: "text-slate-500",
      };
  }
}

function getMsiBadgeColor(msi: number): string {
  if (msi >= 80) return "bg-red-500 text-white";
  if (msi >= 65) return "bg-amber-500 text-white";
  if (msi >= 50) return "bg-orange-500 text-white";
  if (msi >= 26) return "bg-emerald-500 text-white";
  return "bg-sky-500 text-white";
}

function getRiskLevelColor(riskLevel: SaturationRiskLevel): string {
  switch (riskLevel) {
    case "critical":
      return "bg-red-500/20 text-red-500 border-red-500/30";
    case "high":
      return "bg-amber-500/20 text-amber-500 border-amber-500/30";
    case "medium":
      return "bg-emerald-500/20 text-emerald-500 border-emerald-500/30";
    case "low":
      return "bg-sky-500/20 text-sky-500 border-sky-500/30";
    default:
      return "bg-slate-500/20 text-slate-500 border-slate-500/30";
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * MSI Badge - Shows saturation level as a compact badge
 */
export const SaturationBadge = memo(function SaturationBadge({
  msi,
  riskLevel,
  showValue = true,
  size = "md",
  className,
}: SaturationBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-2.5 py-1",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "font-mono font-medium",
            getRiskLevelColor(riskLevel),
            sizeClasses[size],
            className
          )}
        >
          {showValue ? `MSI ${Math.round(msi)}` : riskLevel.toUpperCase()}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs">
          <p className="font-medium">Message Saturation Index: {Math.round(msi)}</p>
          <p className="text-muted-foreground">Risk Level: {riskLevel}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

/**
 * Theme Saturation Alert - Full alert component with details
 */
export const ThemeSaturationAlert = memo(function ThemeSaturationAlert({
  warning,
  compact = false,
  showAlternatives = true,
  onThemeSelect,
  className,
}: ThemeSaturationAlertProps) {
  const Icon = getWarningIcon(warning.type);
  const colors = getWarningColors(warning.type);

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border",
              colors.bg,
              colors.border,
              className
            )}
          >
            <Icon className={cn("w-3.5 h-3.5", colors.icon)} />
            <span className={cn("text-xs font-medium", colors.text)}>
              MSI {Math.round(warning.currentMsi)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-medium text-sm">{warning.themeName}</p>
          <p className="text-xs text-muted-foreground mt-1">{warning.message}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "rounded-lg border p-3",
        colors.bg,
        colors.border,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-1.5 rounded-md", colors.bg)}>
          <Icon className={cn("w-4 h-4", colors.icon)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className={cn("text-sm font-medium", colors.text)}>
              {warning.themeName}
            </h4>
            <Badge
              variant="outline"
              className={cn("text-xs font-mono", getMsiBadgeColor(warning.currentMsi))}
            >
              MSI {Math.round(warning.currentMsi)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{warning.message}</p>
          <p className="text-xs mt-2">
            <span className="font-medium">Recommended:</span>{" "}
            {warning.recommendedAction}
          </p>

          {/* Alternative themes */}
          {showAlternatives &&
            warning.alternativeThemes &&
            warning.alternativeThemes.length > 0 && (
              <div className="mt-3 pt-2 border-t border-current/10">
                <p className="text-xs font-medium flex items-center gap-1 mb-2">
                  <Lightbulb className="w-3 h-3" />
                  Alternative themes:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {warning.alternativeThemes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => onThemeSelect?.(theme.id)}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded text-xs",
                        "bg-background/50 hover:bg-background border border-current/20",
                        "transition-colors cursor-pointer",
                        onThemeSelect ? "hover:border-current/40" : "cursor-default"
                      )}
                    >
                      <span>{theme.name}</span>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        {Math.round(theme.msi)}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>
    </motion.div>
  );
});

/**
 * Saturation Indicator - Compact summary of multiple warnings
 */
export const SaturationIndicator = memo(function SaturationIndicator({
  warnings,
  compact = true,
  className,
}: SaturationIndicatorProps) {
  if (warnings.length === 0) return null;

  const criticalCount = warnings.filter((w) => w.severity === "critical").length;
  const warningCount = warnings.filter((w) => w.severity === "warning").length;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1",
              className
            )}
          >
            {criticalCount > 0 && (
              <Badge
                variant="outline"
                className="text-xs bg-red-500/20 text-red-500 border-red-500/30"
              >
                <Ban className="w-3 h-3 mr-1" />
                {criticalCount}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge
                variant="outline"
                className="text-xs bg-amber-500/20 text-amber-500 border-amber-500/30"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                {warningCount}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <p className="font-medium text-sm mb-2">Saturation Warnings</p>
          <ul className="space-y-1">
            {warnings.slice(0, 5).map((w) => (
              <li key={w.themeId} className="text-xs flex items-center gap-2">
                {React.createElement(getWarningIcon(w.type), {
                  className: cn("w-3 h-3", getWarningColors(w.type).icon),
                })}
                <span>{w.themeName}</span>
                <span className="text-muted-foreground">
                  (MSI {Math.round(w.currentMsi)})
                </span>
              </li>
            ))}
            {warnings.length > 5 && (
              <li className="text-xs text-muted-foreground">
                +{warnings.length - 5} more
              </li>
            )}
          </ul>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <AnimatePresence>
        {warnings.map((warning) => (
          <ThemeSaturationAlert
            key={warning.themeId}
            warning={warning}
            compact={false}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});

/**
 * Inline Saturation Warning - Minimal inline indicator
 */
export const InlineSaturationWarning = memo(function InlineSaturationWarning({
  type,
  msi,
  themeName,
  className,
}: {
  type: SaturationWarningType;
  msi: number;
  themeName: string;
  className?: string;
}) {
  const Icon = getWarningIcon(type);
  const colors = getWarningColors(type);

  if (type === "safe_to_reinforce" || type === "underexposed") {
    return null; // Don't show for safe/opportunity themes
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs",
            colors.text,
            className
          )}
        >
          <Icon className="w-3 h-3" />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          <span className="font-medium">{themeName}:</span> MSI {Math.round(msi)}
        </p>
        <p className="text-xs text-muted-foreground">
          {type === "do_not_push"
            ? "Do not use this theme"
            : type === "shift_to_alternative"
            ? "Consider alternatives"
            : "Monitor closely"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
});

// Need to import React for createElement in SaturationIndicator
import React from "react";

export default ThemeSaturationAlert;
