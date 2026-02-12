/**
 * Feature Flag Hooks
 *
 * React hooks for evaluating feature flags in client components.
 * Uses React Query for caching and automatic refetching.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
interface FeatureFlagContext {
  userId?: string;
  roles?: string[];
  attributes?: Record<string, unknown>;
}

interface FeatureFlag {
  id: string;
  flagKey: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rolloutPercentage: number;
  targetUsers: string[] | null;
  targetRoles: string[] | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Evaluate feature flags
 */
async function evaluateFlags(
  flagKeys: string[],
  context?: FeatureFlagContext
): Promise<Record<string, boolean>> {
  const response = await fetch("/api/feature-flags/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ flagKeys, context }),
  });

  if (!response.ok) {
    throw new Error("Failed to evaluate feature flags");
  }

  const data = await response.json();
  return data.flags;
}

/**
 * Check a single feature flag
 */
async function checkFlag(flagKey: string): Promise<boolean> {
  const response = await fetch(`/api/feature-flags/${encodeURIComponent(flagKey)}`, {
    credentials: "include",
  });

  if (!response.ok) {
    return false; // Default to disabled on error
  }

  const data = await response.json();
  return data.enabled;
}

/**
 * Get all feature flags (admin)
 */
async function getAllFlags(): Promise<FeatureFlag[]> {
  const response = await fetch("/api/feature-flags/admin/all", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch feature flags");
  }

  const data = await response.json();
  return data.flags;
}

/**
 * Hook to check if a single feature flag is enabled
 *
 * @param flagKey The feature flag key
 * @param options Optional query options
 * @returns { isEnabled, isLoading, error }
 */
export function useFeatureFlag(
  flagKey: string,
  options?: { enabled?: boolean }
) {
  const query = useQuery({
    queryKey: ["featureFlag", flagKey],
    queryFn: () => checkFlag(flagKey),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    enabled: options?.enabled !== false,
  });

  return {
    isEnabled: query.data ?? false,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to check multiple feature flags at once
 *
 * @param flagKeys Array of feature flag keys
 * @param context Optional evaluation context
 * @returns { flags, isLoading, error }
 */
export function useFeatureFlags(
  flagKeys: string[],
  context?: FeatureFlagContext
) {
  const query = useQuery({
    queryKey: ["featureFlags", flagKeys.sort().join(","), context],
    queryFn: () => evaluateFlags(flagKeys, context),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: flagKeys.length > 0,
  });

  return {
    flags: query.data ?? {},
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    // Helper to check a specific flag
    isEnabled: (key: string) => query.data?.[key] ?? false,
  };
}

/**
 * Hook to get all feature flags (admin)
 *
 * @returns { flags, isLoading, error }
 */
export function useAllFeatureFlags() {
  const query = useQuery({
    queryKey: ["featureFlags", "admin", "all"],
    queryFn: getAllFlags,
    staleTime: 30 * 1000, // 30 seconds for admin view
  });

  return {
    flags: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to update a feature flag (admin)
 */
export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      flagKey,
      updates,
    }: {
      flagKey: string;
      updates: Partial<FeatureFlag>;
    }) => {
      const response = await fetch(`/api/feature-flags/admin/${encodeURIComponent(flagKey)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to update feature flag");
      }

      return response.json();
    },
    onSuccess: (_, { flagKey }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["featureFlag", flagKey] });
      queryClient.invalidateQueries({ queryKey: ["featureFlags"] });
    },
  });
}

/**
 * Hook to create a new feature flag (admin)
 */
export function useCreateFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flag: {
      flagKey: string;
      name: string;
      description?: string;
      enabled?: boolean;
      rolloutPercentage?: number;
      targetUsers?: string[];
      targetRoles?: string[];
    }) => {
      const response = await fetch("/api/feature-flags/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(flag),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to create feature flag");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["featureFlags"] });
    },
  });
}

/**
 * Hook to delete a feature flag (admin)
 */
export function useDeleteFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flagKey: string) => {
      const response = await fetch(`/api/feature-flags/admin/${encodeURIComponent(flagKey)}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to delete feature flag");
      }

      return response.json();
    },
    onSuccess: (_, flagKey) => {
      queryClient.invalidateQueries({ queryKey: ["featureFlag", flagKey] });
      queryClient.invalidateQueries({ queryKey: ["featureFlags"] });
    },
  });
}

// ============ InsightRx Feature Flag Keys ============

export const INSIGHTRX_FLAGS = {
  VALIDATION: "insightrx.validation",
  VALIDATION_BLOCKING: "insightrx.validation.blocking",
  KNOWLEDGE: "insightrx.knowledge",
  KNOWLEDGE_PANELS: "insightrx.knowledge.panels",
  OMNIVOICE_CHAT: "omnivoice.chat_widget",
  PLATFORM_MODE: "omnivor.platform_mode",
} as const;

/**
 * Hook specifically for InsightRx feature flags
 */
export function useInsightRxFlags() {
  return useFeatureFlags([
    INSIGHTRX_FLAGS.VALIDATION,
    INSIGHTRX_FLAGS.VALIDATION_BLOCKING,
    INSIGHTRX_FLAGS.KNOWLEDGE,
    INSIGHTRX_FLAGS.KNOWLEDGE_PANELS,
  ]);
}
