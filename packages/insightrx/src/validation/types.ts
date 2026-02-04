/**
 * Validation Types
 *
 * Types for content validation results and rules.
 */

import type { AudienceContext, MarketContext, ChannelContext } from "../domain/types";

// ============================================================================
// VALIDATION STATUS
// ============================================================================

export const validationStatuses = ["approved", "needs_review", "rejected", "pending"] as const;
export type ValidationStatus = (typeof validationStatuses)[number];

// ============================================================================
// RULE TYPES
// ============================================================================

export const ruleCategories = ["compliance", "completeness", "consistency", "quality"] as const;
export type RuleCategory = (typeof ruleCategories)[number];

export const ruleSeverities = ["error", "warning", "info"] as const;
export type RuleSeverity = (typeof ruleSeverities)[number];

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  passed: boolean;
  severity: RuleSeverity;
  message: string;
  location?: {
    start: number;
    end: number;
  };
  suggestion?: string;
}

export interface ValidationResult {
  status: ValidationStatus;
  score: number; // 0-100
  ruleResults: RuleResult[];
  summary: string;
  suggestedFixes?: string[];
  metadata?: {
    rulesVersion: string;
    validatedAt: Date;
    processingTimeMs: number;
  };
}

// ============================================================================
// VALIDATION INPUT TYPES
// ============================================================================

/**
 * Flexible context type for validation input.
 * Allows partial context where not all fields are required.
 */
export type PartialAudienceContext = Partial<AudienceContext>;
export type PartialMarketContext = Partial<MarketContext>;
export type PartialChannelContext = Partial<ChannelContext>;

export interface ValidationInput {
  content: string;
  contentType: "campaign" | "messaging_theme" | "email" | "landing_page" | "detail_piece" | string;
  audienceContext?: PartialAudienceContext;
  marketContext?: PartialMarketContext;
  channelContext?: PartialChannelContext;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// RULE DEFINITION TYPES
// ============================================================================

export interface ValidationRule {
  id: string;
  name: string;
  category: RuleCategory;
  severity: RuleSeverity;
  description: string;
  validate: (input: ValidationInput) => RuleResult;
}

export interface RuleSet {
  id: string;
  name: string;
  version: string;
  rules: ValidationRule[];
}

// ============================================================================
// CONTENT STRUCTURE TYPES
// ============================================================================

export interface ContentStructureRequirements {
  minLength?: number;
  maxLength?: number;
  requiredSections?: string[];
  prohibitedPatterns?: RegExp[];
  requiredPatterns?: RegExp[];
}

// ============================================================================
// COMPLIANCE CHECK TYPES
// ============================================================================

export interface ComplianceCheck {
  id: string;
  name: string;
  regulation: string;
  authority: string;
  regions: string[];
  checkFn: (input: ValidationInput) => boolean;
  failureMessage: string;
}
