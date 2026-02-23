/**
 * CMS Content Hook
 *
 * Fetches site copy from Directus CMS with TanStack Query caching.
 * Falls back to hardcoded defaults when Directus is unreachable.
 *
 * Usage:
 *   const { t } = useContent();
 *   <h1>{t("dashboard.hero.heading", "HCP Engagement Analytics")}</h1>
 */

import { useQuery } from "@tanstack/react-query";
import { fetchSiteCopy, type SiteCopyItem } from "@/lib/directus";

/** Map of content key → value, built from Directus response */
type ContentMap = Record<string, string>;

function buildContentMap(items: SiteCopyItem[]): ContentMap {
  const map: ContentMap = {};
  for (const item of items) {
    map[item.key] = item.value;
  }
  return map;
}

/**
 * Hook to access CMS-managed content strings.
 *
 * @returns t() function that resolves a content key with fallback
 */
export function useContent() {
  const query = useQuery({
    queryKey: ["cms", "site_copy"],
    queryFn: () => fetchSiteCopy(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  const contentMap = query.data ? buildContentMap(query.data) : {};

  /**
   * Resolve a content key. Returns CMS value if available, else fallback.
   *
   * @param key Dot-notation content key (e.g. "dashboard.hero.heading")
   * @param fallback Hardcoded default string (always required — guarantees render)
   */
  function t(key: string, fallback: string): string {
    return contentMap[key] ?? fallback;
  }

  return {
    t,
    isLoading: query.isLoading,
    isFromCms: query.isSuccess && (query.data?.length ?? 0) > 0,
  };
}

/**
 * Hook to access CMS content filtered by page.
 *
 * @param page The page identifier to filter by
 */
export function usePageContent(page: string) {
  const query = useQuery({
    queryKey: ["cms", "site_copy", page],
    queryFn: () => fetchSiteCopy(page),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  const contentMap = query.data ? buildContentMap(query.data) : {};

  function t(key: string, fallback: string): string {
    return contentMap[key] ?? fallback;
  }

  return { t, isLoading: query.isLoading };
}
