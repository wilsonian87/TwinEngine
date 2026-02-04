/**
 * Validation Engine
 *
 * Core validation logic for pharmaceutical content.
 */

import type {
  ValidationInput,
  ValidationResult,
  ValidationStatus,
  RuleResult,
  ValidationRule,
} from "./types";
import { defaultRules, complianceOnlyRules, quickCheckRules } from "./rules";

const RULES_VERSION = "1.0.0";

/**
 * Calculate validation status from rule results
 */
function calculateStatus(results: RuleResult[]): ValidationStatus {
  const hasError = results.some((r) => !r.passed && r.severity === "error");
  const hasWarning = results.some((r) => !r.passed && r.severity === "warning");

  if (hasError) {
    return "rejected";
  }
  if (hasWarning) {
    return "needs_review";
  }
  return "approved";
}

/**
 * Calculate validation score (0-100)
 */
function calculateScore(results: RuleResult[]): number {
  if (results.length === 0) {
    return 100;
  }

  // Weight by severity
  const weights = {
    error: 3,
    warning: 2,
    info: 1,
  };

  const totalWeight = results.reduce((sum, r) => sum + weights[r.severity], 0);
  const passedWeight = results
    .filter((r) => r.passed)
    .reduce((sum, r) => sum + weights[r.severity], 0);

  return Math.round((passedWeight / totalWeight) * 100);
}

/**
 * Generate summary from results
 */
function generateSummary(results: RuleResult[]): string {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const errors = results.filter((r) => !r.passed && r.severity === "error").length;
  const warnings = results.filter((r) => !r.passed && r.severity === "warning").length;

  if (errors === 0 && warnings === 0) {
    return `All ${passed} validation checks passed.`;
  }

  const parts: string[] = [];
  if (errors > 0) {
    parts.push(`${errors} error${errors > 1 ? "s" : ""}`);
  }
  if (warnings > 0) {
    parts.push(`${warnings} warning${warnings > 1 ? "s" : ""}`);
  }

  return `${passed}/${results.length} checks passed. Found ${parts.join(" and ")}.`;
}

/**
 * Collect suggested fixes from failed rules
 */
function collectSuggestedFixes(results: RuleResult[]): string[] {
  return results
    .filter((r) => !r.passed && r.suggestion)
    .map((r) => r.suggestion!);
}

/**
 * Validate content using specified rules
 */
export function validateContent(
  input: ValidationInput,
  rules: ValidationRule[] = defaultRules
): ValidationResult {
  const startTime = Date.now();

  // Run all rules
  const ruleResults = rules.map((rule) => rule.validate(input));

  // Calculate overall status and score
  const status = calculateStatus(ruleResults);
  const score = calculateScore(ruleResults);
  const summary = generateSummary(ruleResults);
  const suggestedFixes = collectSuggestedFixes(ruleResults);

  return {
    status,
    score,
    ruleResults,
    summary,
    suggestedFixes: suggestedFixes.length > 0 ? suggestedFixes : undefined,
    metadata: {
      rulesVersion: RULES_VERSION,
      validatedAt: new Date(),
      processingTimeMs: Date.now() - startTime,
    },
  };
}

/**
 * Run full validation with all rules
 */
export function validateFull(input: ValidationInput): ValidationResult {
  return validateContent(input, defaultRules);
}

/**
 * Run compliance-only validation
 */
export function validateCompliance(input: ValidationInput): ValidationResult {
  return validateContent(input, complianceOnlyRules);
}

/**
 * Run quick validation (fewer rules, faster)
 */
export function validateQuick(input: ValidationInput): ValidationResult {
  return validateContent(input, quickCheckRules);
}

/**
 * Batch validate multiple content items
 */
export function validateBatch(
  inputs: ValidationInput[],
  rules: ValidationRule[] = defaultRules
): ValidationResult[] {
  return inputs.map((input) => validateContent(input, rules));
}

/**
 * Get available rule IDs
 */
export function getAvailableRules(): string[] {
  return defaultRules.map((r) => r.id);
}

/**
 * Get rules version
 */
export function getRulesVersion(): string {
  return RULES_VERSION;
}
