/**
 * Validation Hooks
 *
 * React hooks for content validation operations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  details?: Record<string, unknown>;
}

interface SuggestedFix {
  issue: string;
  suggestion: string;
  severity: "error" | "warning" | "info";
}

interface ValidationResult {
  status: "approved" | "needs_review" | "rejected";
  score: number;
  summary: string;
  ruleResults: RuleResult[];
  suggestedFixes?: SuggestedFix[];
  blocked?: boolean;
  blockReason?: string;
  metadata?: {
    rulesVersion: string;
    validatedAt: string;
    processingTimeMs: number;
  };
}

interface ValidationRequest {
  content: string;
  contentType: string;
  audienceContext?: {
    audience?: string;
    specialty?: string;
    experienceLevel?: string;
  };
  marketContext?: {
    therapeuticArea?: string;
    brand?: string;
    competitors?: string[];
    marketStage?: string;
  };
  channelContext?: {
    primaryChannel?: string;
    format?: string;
    deliveryMode?: string;
  };
}

interface SavedValidation {
  id: string;
  contentId: string;
  contentType: string;
  status: string;
  score: number;
  results: ValidationResult;
  rulesVersion: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

interface ValidationHistory {
  id: string;
  status: string;
  score: number;
  rulesVersion: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface ValidationStats {
  total: number;
  approved: number;
  needsReview: number;
  rejected: number;
  avgScore: number;
}

interface ValidationHealth {
  status: string;
  circuit: string;
  circuitStats: {
    failureCount: number;
    lastFailureTime: number;
    successCount: number;
  };
  rulesVersion: string;
  availableRules: number;
}

interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: "error" | "warning" | "info";
  contentTypes: string[];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function validateContent(request: ValidationRequest): Promise<ValidationResult> {
  const response = await fetch("/api/validation/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to validate content");
  }

  return response.json();
}

async function validateContentBlocking(
  request: ValidationRequest
): Promise<ValidationResult> {
  const response = await fetch("/api/validation/validate-blocking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to validate content");
  }

  return response.json();
}

async function validateContentQuick(request: ValidationRequest): Promise<ValidationResult> {
  const response = await fetch("/api/validation/quick", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to validate content");
  }

  return response.json();
}

async function saveValidation(
  request: ValidationRequest & { contentId: string }
): Promise<SavedValidation> {
  const response = await fetch("/api/validation/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to save validation");
  }

  return response.json();
}

async function getValidationResult(
  contentType: string,
  contentId: string
): Promise<SavedValidation> {
  const response = await fetch(`/api/validation/result/${contentType}/${contentId}`, {
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("No validation result found");
    }
    throw new Error("Failed to get validation result");
  }

  return response.json();
}

async function getValidationHistory(
  contentType: string,
  contentId: string
): Promise<ValidationHistory[]> {
  const response = await fetch(`/api/validation/history/${contentType}/${contentId}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get validation history");
  }

  const data = await response.json();
  return data.history;
}

async function markAsReviewed(
  id: string,
  notes?: string
): Promise<{ id: string; reviewedBy: string; reviewedAt: string; reviewNotes?: string }> {
  const response = await fetch(`/api/validation/${id}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ notes }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to mark as reviewed");
  }

  return response.json();
}

async function getValidationStats(): Promise<ValidationStats> {
  const response = await fetch("/api/validation/stats", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get validation stats");
  }

  return response.json();
}

async function getValidationHealth(): Promise<ValidationHealth> {
  const response = await fetch("/api/validation/health", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get validation health");
  }

  return response.json();
}

async function getValidationRules(): Promise<{
  version: string;
  rules: ValidationRule[];
  count: number;
}> {
  const response = await fetch("/api/validation/rules", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get validation rules");
  }

  return response.json();
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for validating content
 */
export function useValidateContent() {
  return useMutation({
    mutationFn: validateContent,
  });
}

/**
 * Hook for validating content with blocking check
 */
export function useValidateContentBlocking() {
  return useMutation({
    mutationFn: validateContentBlocking,
  });
}

/**
 * Hook for quick validation
 */
export function useValidateQuick() {
  return useMutation({
    mutationFn: validateContentQuick,
  });
}

/**
 * Hook for saving validation result
 */
export function useSaveValidation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveValidation,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["validation", variables.contentType, variables.contentId],
      });
    },
  });
}

/**
 * Hook for getting a cached validation result
 */
export function useValidationResult(contentType: string | null, contentId: string | null) {
  return useQuery({
    queryKey: ["validation", "result", contentType, contentId],
    queryFn: () => getValidationResult(contentType!, contentId!),
    enabled: !!contentType && !!contentId,
    retry: false,
  });
}

/**
 * Hook for getting validation history
 */
export function useValidationHistory(contentType: string | null, contentId: string | null) {
  return useQuery({
    queryKey: ["validation", "history", contentType, contentId],
    queryFn: () => getValidationHistory(contentType!, contentId!),
    enabled: !!contentType && !!contentId,
  });
}

/**
 * Hook for marking validation as reviewed
 */
export function useMarkAsReviewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => markAsReviewed(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["validation"] });
    },
  });
}

/**
 * Hook for validation statistics
 */
export function useValidationStats() {
  return useQuery({
    queryKey: ["validation", "stats"],
    queryFn: getValidationStats,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook for validation service health
 */
export function useValidationHealth() {
  return useQuery({
    queryKey: ["validation", "health"],
    queryFn: getValidationHealth,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

/**
 * Hook for available validation rules
 */
export function useValidationRules() {
  return useQuery({
    queryKey: ["validation", "rules"],
    queryFn: getValidationRules,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const VALIDATION_STATUS = {
  APPROVED: "approved",
  NEEDS_REVIEW: "needs_review",
  REJECTED: "rejected",
} as const;

export const SEVERITY_LEVELS = {
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
} as const;

export const VALIDATION_CATEGORIES = [
  { value: "compliance", label: "Compliance" },
  { value: "content", label: "Content Quality" },
  { value: "structure", label: "Structure" },
  { value: "tone", label: "Tone" },
] as const;
