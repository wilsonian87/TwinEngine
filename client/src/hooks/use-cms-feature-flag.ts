/**
 * CMS Feature Flag Hook
 *
 * Checks feature flags managed in Directus CMS.
 * Separate from use-feature-flags.ts which uses the TwinEngine backend API.
 * Falls back to false (disabled) when Directus is unreachable.
 *
 * Usage:
 *   const { isEnabled } = useCmsFeatureFlag("enable_export_hub");
 */

import { useQuery } from "@tanstack/react-query";
import { fetchCmsFeatureFlags, type FeatureFlagItem } from "@/lib/directus";

/**
 * Hook to check all CMS-managed feature flags.
 *
 * @param targetApp App to filter flags for (default: "twinengine")
 * @returns Object with isEnabled() helper and raw flags
 */
export function useCmsFeatureFlags(targetApp = "twinengine") {
  const query = useQuery({
    queryKey: ["cms", "feature_flags", targetApp],
    queryFn: () => fetchCmsFeatureFlags(targetApp),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  const flagMap = new Map<string, boolean>();
  if (query.data) {
    for (const flag of query.data) {
      flagMap.set(flag.key, flag.enabled);
    }
  }

  return {
    /** Check if a specific flag is enabled. Returns false if unknown or Directus is down. */
    isEnabled: (key: string) => flagMap.get(key) ?? false,
    flags: query.data ?? [] as FeatureFlagItem[],
    isLoading: query.isLoading,
  };
}

/**
 * Hook to check a single CMS feature flag.
 *
 * @param flagKey The flag key to check
 * @param targetApp App to filter for (default: "twinengine")
 * @returns { isEnabled, isLoading }
 */
export function useCmsFeatureFlag(flagKey: string, targetApp = "twinengine") {
  const { isEnabled, isLoading } = useCmsFeatureFlags(targetApp);

  return {
    isEnabled: isEnabled(flagKey),
    isLoading,
  };
}
