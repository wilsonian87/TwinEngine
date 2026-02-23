/**
 * CMS Announcements Hook
 *
 * Fetches active announcements from Directus CMS.
 * Returns empty array when Directus is unreachable (no broken UI).
 */

import { useQuery } from "@tanstack/react-query";
import { fetchAnnouncements, type AnnouncementItem } from "@/lib/directus";

/**
 * Hook to fetch active announcements for the current app.
 *
 * @param targetApp App to filter announcements for (default: "twinengine")
 */
export function useAnnouncements(targetApp = "twinengine") {
  const query = useQuery({
    queryKey: ["cms", "announcements", targetApp],
    queryFn: () => fetchAnnouncements(targetApp),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  const now = new Date();
  const active = (query.data ?? []).filter((a) => {
    if (!a.active) return false;
    if (a.start_date && new Date(a.start_date) > now) return false;
    if (a.end_date && new Date(a.end_date) < now) return false;
    return true;
  });

  return {
    announcements: active,
    isLoading: query.isLoading,
    hasAnnouncements: active.length > 0,
  };
}
