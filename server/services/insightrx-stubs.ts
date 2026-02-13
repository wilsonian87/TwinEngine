/**
 * InsightRx Stubs
 *
 * Placeholder implementations after removing @twinengine/insightrx.
 * Validation features are gated by feature flags and return "disabled" results.
 */

export type ValidationStatus = "approved" | "needs_review" | "rejected";
export type RuleSeverity = "error" | "warning" | "info";

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  severity: RuleSeverity;
  message: string;
}

export interface ValidationResult {
  status: ValidationStatus;
  score: number;
  ruleResults: RuleResult[];
  summary: string;
  suggestedFixes?: string[];
  metadata?: {
    rulesVersion: string;
    validatedAt: Date;
    processingTimeMs: number;
  };
}

export interface ValidationInput {
  content: string;
  contentType: string;
  audienceContext?: unknown;
  marketContext?: unknown;
  channelContext?: unknown;
}

export function getRulesVersion(): string {
  return "0.0.0-stub";
}

export function getAvailableRules(): { id: string; name: string }[] {
  return [];
}

export function validateFull(_input: ValidationInput): ValidationResult {
  return { status: "approved", score: 100, ruleResults: [], summary: "Validation module not installed" };
}

export function validateCompliance(_input: ValidationInput): ValidationResult {
  return { status: "approved", score: 100, ruleResults: [], summary: "Validation module not installed" };
}

export function validateQuick(_input: ValidationInput): ValidationResult {
  return { status: "approved", score: 100, ruleResults: [], summary: "Validation module not installed" };
}
