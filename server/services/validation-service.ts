/**
 * Validation Service
 *
 * Wraps @twinengine/insightrx validation for TwinEngine content.
 * Integrates with feature flags for gradual rollout.
 */

import { createHash } from "crypto";
import { db } from "../db";
import {
  contentValidation,
  type InsertContentValidation,
  type ContentValidationDB,
  type ValidateContentRequest,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  validateFull,
  validateCompliance,
  validateQuick,
  getRulesVersion,
  type ValidationResult,
  type ValidationInput,
} from "./insightrx-stubs";
import { isFeatureEnabled } from "./feature-flags";
import {
  CircuitBreaker,
  withRetry,
  withDegradation,
  type RetryConfig,
} from "../utils/resilience";

// ============================================================================
// CIRCUIT BREAKER & RESILIENCE
// ============================================================================

const validationCircuit = new CircuitBreaker({
  name: "validation",
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
});

const retryConfig: RetryConfig = {
  maxAttempts: 2,
  baseDelay: 100,
  maxDelay: 1000,
  jitter: true,
};

// ============================================================================
// CONTENT HASH
// ============================================================================

/**
 * Generate a hash of content for cache invalidation
 */
function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

// ============================================================================
// MAIN VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate content with caching and resilience
 */
export async function validateContent(
  request: ValidateContentRequest
): Promise<ValidationResult> {
  // Check feature flag
  const validationEnabled = await isFeatureEnabled("insightrx.validation");

  if (!validationEnabled) {
    // Return a default "approved" result when validation is disabled
    return {
      status: "approved",
      score: 100,
      ruleResults: [],
      summary: "Validation is disabled",
      metadata: {
        rulesVersion: getRulesVersion(),
        validatedAt: new Date(),
        processingTimeMs: 0,
      },
    };
  }

  // Build validation input - cast flexible schema types to insightrx types
  const input: ValidationInput = {
    content: request.content,
    contentType: request.contentType,
    audienceContext: request.audienceContext as ValidationInput["audienceContext"],
    marketContext: request.marketContext as ValidationInput["marketContext"],
    channelContext: request.channelContext as ValidationInput["channelContext"],
  };

  // Execute validation with resilience patterns
  const result = await withDegradation({
    name: "content-validation",
    primary: async () => {
      return validationCircuit.execute(async () => {
        return withRetry(async () => {
          return validateFull(input);
        }, retryConfig);
      });
    },
    fallback: () => {
      // Fallback: return warning status
      console.warn("[Validation] Using fallback due to validation failure");
      return {
        status: "needs_review" as const,
        score: 50,
        ruleResults: [],
        summary: "Validation service unavailable - manual review required",
        metadata: {
          rulesVersion: getRulesVersion(),
          validatedAt: new Date(),
          processingTimeMs: 0,
        },
      };
    },
    logDegradation: true,
  });

  return result.data;
}

/**
 * Validate content and optionally block if validation fails
 */
export async function validateContentWithBlocking(
  request: ValidateContentRequest
): Promise<{
  result: ValidationResult;
  blocked: boolean;
  reason?: string;
}> {
  const result = await validateContent(request);

  // Check if blocking mode is enabled
  const blockingEnabled = await isFeatureEnabled("insightrx.validation.blocking");

  if (!blockingEnabled) {
    return { result, blocked: false };
  }

  // Block if status is rejected or has errors
  const hasErrors = result.ruleResults.some(
    (r) => !r.passed && r.severity === "error"
  );

  if (result.status === "rejected" || hasErrors) {
    return {
      result,
      blocked: true,
      reason: result.summary,
    };
  }

  return { result, blocked: false };
}

/**
 * Quick validation (fewer rules, faster)
 */
export async function validateContentQuick(
  request: ValidateContentRequest
): Promise<ValidationResult> {
  const validationEnabled = await isFeatureEnabled("insightrx.validation");

  if (!validationEnabled) {
    return {
      status: "approved",
      score: 100,
      ruleResults: [],
      summary: "Validation is disabled",
    };
  }

  const input: ValidationInput = {
    content: request.content,
    contentType: request.contentType,
    audienceContext: request.audienceContext as ValidationInput["audienceContext"],
    marketContext: request.marketContext as ValidationInput["marketContext"],
    channelContext: request.channelContext as ValidationInput["channelContext"],
  };

  return validateQuick(input);
}

/**
 * Compliance-only validation
 */
export async function validateContentCompliance(
  request: ValidateContentRequest
): Promise<ValidationResult> {
  const validationEnabled = await isFeatureEnabled("insightrx.validation");

  if (!validationEnabled) {
    return {
      status: "approved",
      score: 100,
      ruleResults: [],
      summary: "Validation is disabled",
    };
  }

  const input: ValidationInput = {
    content: request.content,
    contentType: request.contentType,
    audienceContext: request.audienceContext as ValidationInput["audienceContext"],
    marketContext: request.marketContext as ValidationInput["marketContext"],
    channelContext: request.channelContext as ValidationInput["channelContext"],
  };

  return validateCompliance(input);
}

// ============================================================================
// VALIDATION STORAGE
// ============================================================================

/**
 * Save validation result to database
 */
export async function saveValidationResult(
  contentId: string,
  contentType: string,
  content: string,
  result: ValidationResult
): Promise<ContentValidationDB> {
  const contentHash = hashContent(content);

  // Check if we have an existing validation for this content
  const [existing] = await db
    .select()
    .from(contentValidation)
    .where(
      and(
        eq(contentValidation.contentId, contentId),
        eq(contentValidation.contentType, contentType)
      )
    )
    .limit(1);

  const validationData: InsertContentValidation = {
    contentId,
    contentType,
    contentHash,
    validationStatus: result.status,
    complianceScore: result.score,
    validationResults: result,
    rulesVersion: result.metadata?.rulesVersion ?? getRulesVersion(),
  };

  if (existing) {
    // Update existing
    const [updated] = await db
      .update(contentValidation)
      .set(validationData)
      .where(eq(contentValidation.id, existing.id))
      .returning();
    return updated;
  } else {
    // Insert new
    const [inserted] = await db
      .insert(contentValidation)
      .values(validationData)
      .returning();
    return inserted;
  }
}

/**
 * Get validation result from cache
 */
export async function getValidationResult(
  contentId: string,
  contentType: string,
  currentContent?: string
): Promise<ContentValidationDB | null> {
  const [result] = await db
    .select()
    .from(contentValidation)
    .where(
      and(
        eq(contentValidation.contentId, contentId),
        eq(contentValidation.contentType, contentType)
      )
    )
    .limit(1);

  if (!result) {
    return null;
  }

  // If current content provided, check if cache is still valid
  if (currentContent) {
    const currentHash = hashContent(currentContent);
    if (result.contentHash !== currentHash) {
      // Cache invalidated - content changed
      return null;
    }
  }

  return result;
}

/**
 * Get validation history for a content item
 */
export async function getValidationHistory(
  contentId: string,
  contentType: string
): Promise<ContentValidationDB[]> {
  return db
    .select()
    .from(contentValidation)
    .where(
      and(
        eq(contentValidation.contentId, contentId),
        eq(contentValidation.contentType, contentType)
      )
    )
    .orderBy(desc(contentValidation.createdAt));
}

/**
 * Mark validation as reviewed
 */
export async function markValidationReviewed(
  validationId: string,
  reviewedBy: string,
  notes?: string
): Promise<ContentValidationDB | null> {
  const [updated] = await db
    .update(contentValidation)
    .set({
      reviewedBy,
      reviewedAt: new Date(),
      reviewNotes: notes,
    })
    .where(eq(contentValidation.id, validationId))
    .returning();

  return updated || null;
}

// ============================================================================
// VALIDATION STATS
// ============================================================================

/**
 * Get validation statistics
 */
export async function getValidationStats(): Promise<{
  total: number;
  approved: number;
  needsReview: number;
  rejected: number;
  avgScore: number;
}> {
  const all = await db.select().from(contentValidation);

  const stats = {
    total: all.length,
    approved: 0,
    needsReview: 0,
    rejected: 0,
    totalScore: 0,
  };

  for (const item of all) {
    switch (item.validationStatus) {
      case "approved":
        stats.approved++;
        break;
      case "needs_review":
        stats.needsReview++;
        break;
      case "rejected":
        stats.rejected++;
        break;
    }
    if (item.complianceScore !== null) {
      stats.totalScore += item.complianceScore;
    }
  }

  return {
    total: stats.total,
    approved: stats.approved,
    needsReview: stats.needsReview,
    rejected: stats.rejected,
    avgScore: stats.total > 0 ? Math.round(stats.totalScore / stats.total) : 0,
  };
}

/**
 * Get circuit breaker status
 */
export function getValidationCircuitStatus(): {
  state: string;
  stats: {
    failureCount: number;
    lastFailureTime: number;
    successCount: number;
  };
} {
  return {
    state: validationCircuit.getState(),
    stats: validationCircuit.getStats(),
  };
}
